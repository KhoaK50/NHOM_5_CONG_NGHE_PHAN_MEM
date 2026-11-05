/**
 * ============================================================================
 * TẦNG DATA ACCESS (DAO): TÀI LIỆU, MÔN HỌC, BÁO CÁO VI PHẠM & NHẬT KÝ KIỂM DUYỆT
 * Bảng: documents, courses, document_reports, moderation_logs, admin_logs,
 *       notifications, document_comments, users.contribution_score
 * Mọi truy vấn dùng tham số hóa; hàm ghi nhận `db` để chạy chung transaction.
 * ============================================================================
 */

const { query, getClient } = require('../db/pool');

const poolDb = { query };

async function withTransaction(work) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// --------------------------- UC08: CHỐNG TRÙNG SHA-256 ---------------------------

async function hashExists(fileHash) {
  const res = await query('SELECT id FROM public.documents WHERE file_hash = $1 LIMIT 1', [fileHash]);
  return res.rows.length > 0;
}

// --------------------------- UC09: TÀI LIỆU & KIỂM DUYỆT ---------------------------

const DOCUMENT_COLUMNS = `
  d.id, d.course_id, d.uploader_id, d.title, d.description, d.doc_type, d.academic_year,
  d.lecturer_name, d.file_name, d.file_url, d.preview_url, d.file_size_bytes, d.page_count,
  d.file_hash, d.status, d.reject_reason, d.reviewed_by, d.reviewed_at, d.created_at,
  c.course_code, c.course_name, u.full_name AS uploader_name`;

const DOCUMENT_JOINS = `
  FROM public.documents d
  JOIN public.courses c ON c.id = d.course_id
  JOIN public.users u ON u.id = d.uploader_id`;

async function listDocuments({ status, limit, offset }) {
  // Hàng đợi PENDING theo FIFO: tài liệu gửi sớm nhất được xử lý trước.
  const order = status === 'PENDING' ? 'd.created_at ASC, d.id ASC' : 'd.created_at DESC, d.id DESC';
  const [rows, total] = await Promise.all([
    query(
      `SELECT ${DOCUMENT_COLUMNS} ${DOCUMENT_JOINS}
       WHERE d.status = $1
       ORDER BY ${order}
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    ),
    query('SELECT COUNT(*)::int AS total FROM public.documents WHERE status = $1', [status])
  ]);
  return { rows: rows.rows, total: total.rows[0].total };
}

async function findDocumentById(id, db = poolDb) {
  const res = await db.query(`SELECT ${DOCUMENT_COLUMNS} ${DOCUMENT_JOINS} WHERE d.id = $1`, [id]);
  return res.rows[0] || null;
}

async function lockDocument(db, id) {
  const res = await db.query(
    `SELECT id, title, description, doc_type, academic_year, course_id, uploader_id, file_name,
            file_size_bytes, file_hash, status
     FROM public.documents WHERE id = $1 FOR UPDATE`,
    [id]
  );
  return res.rows[0] || null;
}

async function updateDocumentReview(db, { id, status, reviewerId, rejectReason }) {
  const res = await db.query(
    `UPDATE public.documents
     SET status = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP,
         reject_reason = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, status, reviewed_by, reviewed_at, reject_reason`,
    [id, status, reviewerId, rejectReason]
  );
  return res.rows[0];
}

async function setDocumentStatus(db, id, status) {
  await db.query(
    'UPDATE public.documents SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id, status]
  );
}

async function hideDocumentComments(db, documentId) {
  await db.query('UPDATE public.document_comments SET is_hidden = TRUE WHERE document_id = $1', [documentId]);
}

async function addContributionScore(db, userId, delta) {
  await db.query(
    'UPDATE public.users SET contribution_score = contribution_score + $2 WHERE id = $1',
    [userId, delta]
  );
}

async function insertModerationLog(db, { documentId, actorId, oldStatus, newStatus, reviewNote }) {
  await db.query(
    `INSERT INTO public.moderation_logs (document_id, actor_id, old_status, new_status, review_note)
     VALUES ($1, $2, $3, $4, $5)`,
    [documentId, actorId, oldStatus, newStatus, reviewNote]
  );
}

async function insertAdminLog(db, { adminId, actionType, entityType, entityId, details, ipAddress }) {
  await db.query(
    `INSERT INTO public.admin_logs (admin_id, action_type, entity_type, entity_id, action_details, ip_address)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [adminId, actionType, entityType, String(entityId), JSON.stringify(details), ipAddress]
  );
}

async function insertNotification(db, { userId, documentId, type, title, message }) {
  await db.query(
    `INSERT INTO public.notifications (user_id, related_document_id, type, title, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, documentId, type, title, message]
  );
}

// --------------------------- UC09: BÁO CÁO VI PHẠM ---------------------------

async function listReports({ status, limit, offset }) {
  const [rows, total] = await Promise.all([
    query(
      `SELECT r.id, r.document_id, r.reason_category, r.description, r.status, r.admin_note,
              r.created_at, r.resolved_at, reporter.full_name AS reporter_name,
              d.title AS document_title, d.status AS document_status,
              c.course_code, uploader.full_name AS uploader_name
       FROM public.document_reports r
       JOIN public.users reporter ON reporter.id = r.reporter_id
       JOIN public.documents d ON d.id = r.document_id
       JOIN public.courses c ON c.id = d.course_id
       JOIN public.users uploader ON uploader.id = d.uploader_id
       WHERE r.status = $1
       ORDER BY r.created_at ASC, r.id ASC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    ),
    query('SELECT COUNT(*)::int AS total FROM public.document_reports WHERE status = $1', [status])
  ]);
  return { rows: rows.rows, total: total.rows[0].total };
}

async function lockReport(db, id) {
  const res = await db.query(
    'SELECT id, reporter_id, document_id, status FROM public.document_reports WHERE id = $1 FOR UPDATE',
    [id]
  );
  return res.rows[0] || null;
}

async function resolveReport(db, { id, status, resolvedBy, adminNote }) {
  const res = await db.query(
    `UPDATE public.document_reports
     SET status = $2, resolved_by = $3, admin_note = $4, resolved_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, status, document_id, resolved_by, resolved_at`,
    [id, status, resolvedBy, adminNote]
  );
  return res.rows[0];
}

// --------------------------- UC10: MÔN HỌC ---------------------------

const COURSE_COLUMNS = `
  c.id, c.course_code, c.course_name, c.knowledge_block, c.credits, c.semester, c.summary,
  c.is_active, c.created_at, c.updated_at,
  (SELECT COUNT(*)::int FROM public.documents d WHERE d.course_id = c.id) AS document_count`;

async function listCourses({ q, knowledgeBlock, semester, isActive, limit, offset }) {
  const params = [];
  const where = [];
  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
    where.push(`(c.course_code ILIKE $${params.length} OR c.course_name ILIKE $${params.length})`);
  }
  if (knowledgeBlock) {
    params.push(knowledgeBlock);
    where.push(`c.knowledge_block = $${params.length}`);
  }
  if (semester) {
    params.push(semester);
    where.push(`c.semester = $${params.length}`);
  }
  if (isActive !== undefined) {
    params.push(isActive);
    where.push(`c.is_active = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows, total, stats] = await Promise.all([
    query(
      `SELECT ${COURSE_COLUMNS} FROM public.courses c ${whereSql}
       ORDER BY c.course_code ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    query(`SELECT COUNT(*)::int AS total FROM public.courses c ${whereSql}`, params),
    query(
      `SELECT (SELECT COUNT(*)::int FROM public.courses) AS total_courses,
              (SELECT COUNT(*)::int FROM public.courses WHERE is_active) AS active_courses,
              (SELECT COUNT(*)::int FROM public.documents) AS total_documents`
    )
  ]);
  return { rows: rows.rows, total: total.rows[0].total, stats: stats.rows[0] };
}

async function findCourseById(id, db = poolDb) {
  const res = await db.query(`SELECT ${COURSE_COLUMNS} FROM public.courses c WHERE c.id = $1`, [id]);
  return res.rows[0] || null;
}

async function insertCourse(db, course) {
  const res = await db.query(
    `INSERT INTO public.courses (course_code, course_name, knowledge_block, credits, semester, summary, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      course.courseCode,
      course.courseName,
      course.knowledgeBlock,
      course.credits,
      course.semester,
      course.summary ?? null,
      course.isActive ?? true
    ]
  );
  return res.rows[0].id;
}

const COURSE_FIELD_TO_COLUMN = {
  courseCode: 'course_code',
  courseName: 'course_name',
  knowledgeBlock: 'knowledge_block',
  credits: 'credits',
  semester: 'semester',
  summary: 'summary',
  isActive: 'is_active'
};

async function updateCourse(db, id, changes) {
  const fields = Object.keys(changes);
  // Tên cột lấy từ bảng ánh xạ cố định, giá trị vẫn đi qua tham số.
  const assignments = fields.map((field, i) => `${COURSE_FIELD_TO_COLUMN[field]} = $${i + 2}`);
  const res = await db.query(
    `UPDATE public.courses SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 RETURNING id`,
    [id, ...fields.map((field) => changes[field])]
  );
  return res.rows[0] || null;
}

async function lockCourse(db, id) {
  const res = await db.query('SELECT id, course_code, course_name FROM public.courses WHERE id = $1 FOR UPDATE', [id]);
  return res.rows[0] || null;
}

async function countDocumentsOfCourse(db, courseId) {
  const res = await db.query('SELECT COUNT(*)::int AS total FROM public.documents WHERE course_id = $1', [courseId]);
  return res.rows[0].total;
}

async function deleteCourse(db, id) {
  await db.query('DELETE FROM public.courses WHERE id = $1', [id]);
}

async function findCourseByCode(courseCode) {
  const res = await query(
    `SELECT id, course_code as "courseCode", course_name as "courseName", is_active as "isActive"
     FROM public.courses
     WHERE UPPER(course_code) = UPPER($1)
     LIMIT 1`,
    [courseCode]
  );
  return res.rows[0] || null;
}

/** Gửi một thông báo tới mọi Quản trị viên đang hoạt động, trả về danh sách người nhận. */
async function insertAdminNotifications({ documentId, type, title, message, excludeUserId }) {
  const res = await query(
    `INSERT INTO public.notifications (user_id, related_document_id, type, title, message)
     SELECT id, $1, $2, $3, $4 FROM public.users
     WHERE role = 'ADMIN' AND status = 'active' AND id <> $5
     RETURNING user_id`,
    [documentId, type, title, message, excludeUserId]
  );
  return res.rows.map((row) => row.user_id);
}

async function insertDocument({
  courseId,
  uploaderId,
  title,
  description,
  docType,
  fileName,
  fileUrl,
  previewUrl,
  fileSizeBytes,
  pageCount,
  fileHash
}) {
  const res = await query(
    `INSERT INTO public.documents (
       course_id, uploader_id, title, description, doc_type,
       file_name, file_url, preview_url, file_size_bytes,
       page_count, file_hash, status, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', NOW(), NOW())
     RETURNING id, title, status, doc_type as "docType", file_name as "fileName", file_url as "fileUrl", preview_url as "previewUrl", file_size_bytes as "fileSizeBytes", page_count as "pageCount", file_hash as "fileHash", created_at as "createdAt"`,
    [
      courseId,
      uploaderId,
      title,
      description,
      docType,
      fileName,
      fileUrl,
      previewUrl,
      fileSizeBytes,
      pageCount,
      fileHash
    ]
  );
  return res.rows[0];
}

module.exports = {
  withTransaction,
  hashExists,
  listDocuments,
  findDocumentById,
  insertDocument,
  findCourseByCode,
  lockDocument,
  updateDocumentReview,
  setDocumentStatus,
  hideDocumentComments,
  addContributionScore,
  insertModerationLog,
  insertAdminLog,
  insertNotification,
  insertAdminNotifications,
  listReports,
  lockReport,
  resolveReport,
  listCourses,
  findCourseById,
  insertCourse,
  updateCourse,
  lockCourse,
  countDocumentsOfCourse,
  deleteCourse
};
