/**
 * ============================================================================
 * TẦNG NGHIỆP VỤ (BUS): CHỐNG TRÙNG SHA-256, KIỂM DUYỆT 8 TIÊU CHÍ, XỬ LÝ BÁO CÁO
 * VI PHẠM & QUẢN LÝ MÔN HỌC (UC08–UC10) — theo hợp đồng Bang_API_UC08_10.docx
 * ============================================================================
 */

const crypto = require('crypto');
const repo = require('../repositories/documentCourseRepository');
const { uploadPdfBufferToCloudinary } = require('./cloudinaryService');

const MAX_PDF_BYTES = 26214400; // 25 MB
const APPROVE_REWARD_POINTS = 20;
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

const MODERATION_CRITERIA = [
  'readable',
  'academic',
  'courseMatch',
  'metadataComplete',
  'notDuplicate',
  'safeContent',
  'copyrightOk',
  'privacyOk'
];
const DOCUMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN', 'DELETED'];
const REPORT_STATUSES = ['PENDING', 'RESOLVED_HIDDEN', 'RESOLVED_DELETED', 'DISMISSED'];
const KNOWLEDGE_BLOCKS = ['DAI_CUONG', 'CO_SO_NGANH', 'CHUYEN_NGANH', 'NGHIEP_VU_SU_PHAM'];

class ApiError extends Error {
  constructor(statusCode, code, message, extra = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.extra = extra;
  }
}

// --------------------------- KIỂM TRA ĐẦU VÀO ---------------------------

function parseId(raw) {
  const text = String(raw);
  const id = Number(text);
  if (!/^[1-9]\d{0,9}$/.test(text) || id > 2147483647) {
    throw new ApiError(400, 'INVALID_ID', 'Mã định danh không hợp lệ.');
  }
  return id;
}

function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new ApiError(400, 'INVALID_QUERY', 'Tham số phân trang không hợp lệ (page ≥ 1, limit từ 1 đến 50).');
  }
  return { page, limit, offset: (page - 1) * limit };
}

function parseEnumQuery(value, allowed, fallback) {
  if (value === undefined) return fallback;
  if (!allowed.includes(value)) {
    throw new ApiError(400, 'INVALID_QUERY', 'Giá trị bộ lọc không hợp lệ.');
  }
  return value;
}

function assertBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, 'INVALID_BODY', 'Dữ liệu gửi lên không hợp lệ.');
  }
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

// --------------------------- UC08: CHỐNG TRÙNG SHA-256 ---------------------------

function assertReadablePdf(buffer) {
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new ApiError(415, 'INVALID_PDF', 'Tệp không phải PDF hợp lệ: chữ ký đầu tệp không khớp %PDF-.');
  }
  const tail = buffer.subarray(Math.max(0, buffer.length - 4096)).toString('latin1');
  if (!tail.includes('%%EOF') || !tail.includes('startxref')) {
    throw new ApiError(400, 'PDF_CORRUPT', 'Tệp PDF bị hỏng hoặc không đầy đủ, vui lòng kiểm tra lại.');
  }
}

/**
 * Băm từ bytes gốc ở server, không nhận hash do client gửi.
 * Bản trùng không lộ id, người đăng hay URL: tài liệu gốc có thể đang PENDING/REJECTED.
 */
async function checkDuplicateHash(file) {
  if (!file || !file.buffer || file.buffer.length === 0) {
    throw new ApiError(400, 'FILE_REQUIRED', 'Vui lòng chọn một tệp PDF để kiểm tra.');
  }
  if (file.buffer.length > MAX_PDF_BYTES) {
    throw new ApiError(413, 'FILE_TOO_LARGE', 'Tệp vượt quá giới hạn 25 MB.');
  }
  assertReadablePdf(file.buffer);

  const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
  if (await repo.hashExists(fileHash)) {
    throw new ApiError(409, 'DUPLICATE_FILE', 'Tài liệu này đã tồn tại trên hệ thống, không thể đóng góp lại.', {
      fileHash
    });
  }
  return { duplicate: false, fileHash };
}

// --------------------------- UC09: TÀI LIỆU & KIỂM DUYỆT ---------------------------

/** Các điều kiện máy kiểm được: admin không thể đánh dấu đạt thay cho hệ thống. */
function computeAutoChecks(doc) {
  const fileHash = String(doc.file_hash || '');
  return {
    formatOk: String(doc.file_name || '').toLowerCase().endsWith('.pdf'),
    sizeOk: Number(doc.file_size_bytes) > 0 && Number(doc.file_size_bytes) <= MAX_PDF_BYTES,
    notDuplicate: /^[0-9a-f]{64}$/i.test(fileHash),
    metadataComplete:
      cleanText(doc.title).length >= 10 &&
      cleanText(doc.description).length >= 10 &&
      Boolean(doc.course_id && doc.doc_type && doc.academic_year)
  };
}

function toDocumentDto(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    docType: row.doc_type,
    academicYear: row.academic_year,
    lecturerName: row.lecturer_name,
    fileName: row.file_name,
    fileSizeBytes: Number(row.file_size_bytes),
    pageCount: row.page_count,
    fileHash: row.file_hash,
    status: row.status,
    rejectReason: row.reject_reason,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseName: row.course_name,
    uploaderId: row.uploader_id,
    uploaderName: row.uploader_name,
    reviewedBy: row.reviewed_by,
    reviewedAt: toIso(row.reviewed_at),
    createdAt: toIso(row.created_at),
    autoChecks: computeAutoChecks(row)
  };
}

async function listAdminDocuments(query) {
  const status = parseEnumQuery(query.status, DOCUMENT_STATUSES, 'PENDING');
  const { page, limit, offset } = parsePagination(query);
  const { rows, total } = await repo.listDocuments({ status, limit, offset });
  return { data: rows.map(toDocumentDto), pagination: { page, limit, total } };
}

async function getAdminDocument(rawId) {
  const row = await repo.findDocumentById(parseId(rawId));
  if (!row) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Không tìm thấy tài liệu.');
  return { ...toDocumentDto(row), fileUrl: row.file_url, previewUrl: row.preview_url };
}

/**
 * API công khai chỉ trả APPROVED. Tài liệu khác trả 404 giống như không tồn tại,
 * trừ Admin và chủ tài liệu, để không lộ PENDING/REJECTED/HIDDEN/DELETED qua URL.
 */
async function getVisibleDocument(rawId, viewer) {
  const row = await repo.findDocumentById(parseId(rawId));
  const canViewPrivate = viewer && (viewer.role === 'ADMIN' || (row && viewer.id === row.uploader_id));
  if (!row || (row.status !== 'APPROVED' && !canViewPrivate)) {
    throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Không tìm thấy tài liệu.');
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    docType: row.doc_type,
    academicYear: row.academic_year,
    lecturerName: row.lecturer_name,
    pageCount: row.page_count,
    status: row.status,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseName: row.course_name,
    uploaderName: row.uploader_name,
    previewUrl: row.preview_url,
    fileUrl: viewer ? row.file_url : null
  };
}

function parseModerationInput(body) {
  assertBody(body);
  const { decision } = body;
  if (decision !== 'APPROVE' && decision !== 'REJECT') {
    throw new ApiError(400, 'INVALID_DECISION', 'Quyết định kiểm duyệt phải là APPROVE hoặc REJECT.');
  }
  const note = cleanText(body.note).slice(0, 1000) || null;

  if (decision === 'REJECT') {
    const reason = cleanText(body.reason);
    if (reason.length < 10 || reason.length > 2000) {
      throw new ApiError(422, 'MISSING_REJECT_REASON', 'Bắt buộc nhập lý do từ chối cụ thể (từ 10 đến 2000 ký tự).');
    }
    return { decision, reason, note, criteria: null };
  }

  const criteria = body.criteria && typeof body.criteria === 'object' ? body.criteria : {};
  const unmet = MODERATION_CRITERIA.filter((key) => criteria[key] !== true);
  if (unmet.length > 0) {
    throw new ApiError(422, 'CRITERIA_NOT_MET', 'Cần đạt đủ 8 tiêu chí trước khi phê duyệt.', { unmet });
  }
  return { decision, reason: null, note, criteria };
}

async function moderateDocument(rawId, body, admin, ipAddress) {
  const id = parseId(rawId);
  const input = parseModerationInput(body);

  return repo.withTransaction(async (db) => {
    const doc = await repo.lockDocument(db, id);
    if (!doc) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Không tìm thấy tài liệu.');
    // Khóa dòng ở trên khiến Admin thứ hai chờ rồi rơi vào nhánh này: chỉ một người thành công.
    if (doc.status !== 'PENDING') {
      throw new ApiError(409, 'DOCUMENT_NOT_PENDING', 'Tài liệu này đã được Admin khác xử lý.', {
        currentStatus: doc.status
      });
    }

    const isApprove = input.decision === 'APPROVE';
    if (isApprove) {
      const auto = computeAutoChecks(doc);
      const failed = Object.keys(auto).filter((key) => !auto[key]);
      if (failed.length > 0) {
        throw new ApiError(422, 'CRITERIA_NOT_MET', 'Tài liệu chưa đạt kiểm tra tự động của hệ thống.', {
          unmet: failed
        });
      }
    }

    const newStatus = isApprove ? 'APPROVED' : 'REJECTED';
    const updated = await repo.updateDocumentReview(db, {
      id,
      status: newStatus,
      reviewerId: admin.id,
      rejectReason: input.reason
    });

    await repo.insertModerationLog(db, {
      documentId: id,
      actorId: admin.id,
      oldStatus: doc.status,
      newStatus,
      reviewNote: input.reason || input.note
    });
    await repo.insertAdminLog(db, {
      adminId: admin.id,
      actionType: isApprove ? 'APPROVE_DOC' : 'REJECT_DOC',
      entityType: 'DOCUMENT',
      entityId: id,
      details: {
        old_status: doc.status,
        new_status: newStatus,
        criteria: input.criteria,
        reason: input.reason,
        reward_points: isApprove ? APPROVE_REWARD_POINTS : 0
      },
      ipAddress
    });

    if (isApprove) await repo.addContributionScore(db, doc.uploader_id, APPROVE_REWARD_POINTS);

    await repo.insertNotification(db, {
      userId: doc.uploader_id,
      documentId: id,
      type: isApprove ? 'DOC_APPROVED' : 'DOC_REJECTED',
      title: isApprove ? 'Tài liệu đã được phê duyệt' : 'Tài liệu cần chỉnh sửa',
      message: isApprove
        ? `Tài liệu "${doc.title}" đã được xuất bản, bạn nhận +${APPROVE_REWARD_POINTS} điểm đóng góp.`
        : `Tài liệu "${doc.title}" bị từ chối. Lý do: ${input.reason}`
    });

    return {
      id: updated.id,
      status: updated.status,
      reviewedBy: updated.reviewed_by,
      reviewedAt: toIso(updated.reviewed_at),
      rejectReason: updated.reject_reason,
      contributionScoreDelta: isApprove ? APPROVE_REWARD_POINTS : 0
    };
  });
}

// --------------------------- UC09: BÁO CÁO VI PHẠM ---------------------------

const REPORT_ACTIONS = {
  DISMISS: { reportStatus: 'DISMISSED', documentStatus: null, allowedFrom: null },
  HIDE: { reportStatus: 'RESOLVED_HIDDEN', documentStatus: 'HIDDEN', allowedFrom: ['APPROVED'] },
  DELETE: { reportStatus: 'RESOLVED_DELETED', documentStatus: 'DELETED', allowedFrom: ['APPROVED', 'HIDDEN'] }
};

async function listAdminReports(query) {
  const status = parseEnumQuery(query.status, REPORT_STATUSES, 'PENDING');
  const { page, limit, offset } = parsePagination(query);
  const { rows, total } = await repo.listReports({ status, limit, offset });
  return {
    data: rows.map((row) => ({
      id: row.id,
      documentId: row.document_id,
      documentTitle: row.document_title,
      documentStatus: row.document_status,
      courseCode: row.course_code,
      uploaderName: row.uploader_name,
      reporterName: row.reporter_name,
      reasonCategory: row.reason_category,
      description: row.description,
      status: row.status,
      adminNote: row.admin_note,
      createdAt: toIso(row.created_at),
      resolvedAt: toIso(row.resolved_at)
    })),
    pagination: { page, limit, total }
  };
}

function buildReportNotifications(action, report, doc) {
  const notifications = [
    {
      userId: report.reporter_id,
      documentId: doc.id,
      type: 'REPORT_RESOLVED',
      title: 'Báo cáo của bạn đã được xử lý',
      message:
        action === 'DISMISS'
          ? `Báo cáo về "${doc.title}" đã được xem xét và không ghi nhận vi phạm.`
          : `Báo cáo về "${doc.title}" đã được ghi nhận, tài liệu đã bị gỡ khỏi kho công khai.`
    }
  ];
  if (action === 'HIDE') {
    notifications.push({
      userId: doc.uploader_id,
      documentId: doc.id,
      type: 'DOC_HIDDEN',
      title: 'Tài liệu của bạn đã bị tạm ẩn',
      message: `Tài liệu "${doc.title}" bị tạm ẩn sau khi xử lý báo cáo vi phạm.`
    });
  }
  if (action === 'DELETE') {
    notifications.push({
      userId: doc.uploader_id,
      documentId: doc.id,
      type: 'SYSTEM',
      title: 'Tài liệu của bạn đã bị gỡ',
      message: `Tài liệu "${doc.title}" đã bị gỡ khỏi hệ thống sau khi xử lý báo cáo vi phạm.`
    });
  }
  return notifications;
}

async function resolveAdminReport(rawId, body, admin, ipAddress) {
  const id = parseId(rawId);
  assertBody(body);
  const { action } = body;
  const rule = Object.prototype.hasOwnProperty.call(REPORT_ACTIONS, action) ? REPORT_ACTIONS[action] : null;
  if (!rule) {
    throw new ApiError(400, 'INVALID_ACTION', 'Hành động xử lý phải là DISMISS, HIDE hoặc DELETE.');
  }
  const adminNote = cleanText(body.adminNote);
  if (adminNote.length === 0 || adminNote.length > 1000) {
    throw new ApiError(422, 'MISSING_ADMIN_NOTE', 'Bắt buộc nhập ghi chú xử lý (tối đa 1000 ký tự).');
  }

  return repo.withTransaction(async (db) => {
    const report = await repo.lockReport(db, id);
    if (!report) throw new ApiError(404, 'REPORT_NOT_FOUND', 'Không tìm thấy báo cáo.');
    if (report.status !== 'PENDING') {
      throw new ApiError(409, 'REPORT_ALREADY_RESOLVED', 'Báo cáo này đã được xử lý trước đó.');
    }

    const doc = await repo.lockDocument(db, report.document_id);
    if (rule.documentStatus) {
      if (!rule.allowedFrom.includes(doc.status)) {
        throw new ApiError(409, 'INVALID_DOCUMENT_STATE', 'Trạng thái hiện tại của tài liệu không cho phép thao tác này.', {
          currentStatus: doc.status
        });
      }
      await repo.setDocumentStatus(db, doc.id, rule.documentStatus);
      await repo.hideDocumentComments(db, doc.id);
      await repo.insertModerationLog(db, {
        documentId: doc.id,
        actorId: admin.id,
        oldStatus: doc.status,
        newStatus: rule.documentStatus,
        reviewNote: adminNote
      });
    }

    const resolved = await repo.resolveReport(db, {
      id,
      status: rule.reportStatus,
      resolvedBy: admin.id,
      adminNote
    });
    await repo.insertAdminLog(db, {
      adminId: admin.id,
      actionType: 'RESOLVE_REPORT',
      entityType: 'REPORT',
      entityId: id,
      details: { action, document_id: doc.id, old_status: doc.status, new_status: rule.documentStatus || doc.status },
      ipAddress
    });
    for (const notification of buildReportNotifications(action, report, doc)) {
      await repo.insertNotification(db, notification);
    }

    return {
      id: resolved.id,
      status: resolved.status,
      documentId: resolved.document_id,
      documentStatus: rule.documentStatus || doc.status,
      resolvedBy: resolved.resolved_by,
      resolvedAt: toIso(resolved.resolved_at)
    };
  });
}

// --------------------------- UC10: MÔN HỌC ---------------------------

function toCourseDto(row) {
  return {
    id: row.id,
    courseCode: row.course_code,
    courseName: row.course_name,
    knowledgeBlock: row.knowledge_block,
    credits: row.credits,
    semester: row.semester,
    summary: row.summary,
    isActive: row.is_active,
    documentCount: row.document_count,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

/** Chỉ nhận các trường đã biết; id, createdAt... bị bỏ qua. */
function parseCourseFields(body) {
  const changes = {};
  const errors = {};

  if (body.courseCode !== undefined) {
    const code = cleanText(body.courseCode).toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(code)) errors.courseCode = 'Mã học phần gồm 3–20 ký tự chữ hoặc số, không dấu.';
    changes.courseCode = code;
  }
  if (body.courseName !== undefined) {
    const name = cleanText(body.courseName);
    if (name.length < 2 || name.length > 150) errors.courseName = 'Tên học phần cần từ 2 đến 150 ký tự.';
    changes.courseName = name;
  }
  if (body.knowledgeBlock !== undefined) {
    if (!KNOWLEDGE_BLOCKS.includes(body.knowledgeBlock)) errors.knowledgeBlock = 'Khối kiến thức không hợp lệ.';
    changes.knowledgeBlock = body.knowledgeBlock;
  }
  if (body.credits !== undefined) {
    if (!Number.isInteger(body.credits) || body.credits < 1 || body.credits > 10) {
      errors.credits = 'Số tín chỉ phải từ 1 đến 10.';
    }
    changes.credits = body.credits;
  }
  if (body.semester !== undefined) {
    if (!Number.isInteger(body.semester) || body.semester < 1 || body.semester > 8) {
      errors.semester = 'Học kỳ phải từ 1 đến 8.';
    }
    changes.semester = body.semester;
  }
  if (body.summary !== undefined) {
    const summary = body.summary === null ? '' : cleanText(body.summary);
    if (summary.length > 500) errors.summary = 'Mô tả tối đa 500 ký tự.';
    changes.summary = summary || null;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') errors.isActive = 'Trạng thái không hợp lệ.';
    changes.isActive = body.isActive;
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Thông tin học phần chưa hợp lệ.', { fields: errors });
  }
  return changes;
}

function translateCourseWriteError(err) {
  if (err.code === PG_UNIQUE_VIOLATION) {
    return new ApiError(409, 'COURSE_CODE_EXISTS', 'Mã học phần đã tồn tại trong danh mục.');
  }
  return err;
}

async function listAdminCourses(query) {
  const { page, limit, offset } = parsePagination(query);
  const knowledgeBlock = parseEnumQuery(query.knowledgeBlock, KNOWLEDGE_BLOCKS, undefined);
  let semester;
  if (query.semester !== undefined) {
    semester = Number(query.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
      throw new ApiError(400, 'INVALID_QUERY', 'Học kỳ phải từ 1 đến 8.');
    }
  }
  const activeText = parseEnumQuery(query.isActive, ['true', 'false'], undefined);
  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 100) : '';

  const { rows, total, stats } = await repo.listCourses({
    q,
    knowledgeBlock,
    semester,
    isActive: activeText === undefined ? undefined : activeText === 'true',
    limit,
    offset
  });
  return {
    data: rows.map(toCourseDto),
    pagination: { page, limit, total },
    stats: {
      totalCourses: stats.total_courses,
      activeCourses: stats.active_courses,
      totalDocuments: stats.total_documents
    }
  };
}

async function getAdminCourse(rawId) {
  const row = await repo.findCourseById(parseId(rawId));
  if (!row) throw new ApiError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy học phần.');
  return toCourseDto(row);
}

async function createCourse(body, admin, ipAddress) {
  assertBody(body);
  const changes = parseCourseFields(body);
  const required = ['courseCode', 'courseName', 'knowledgeBlock', 'credits', 'semester'];
  const missing = required.filter((field) => changes[field] === undefined);
  if (missing.length > 0) {
    const fields = Object.fromEntries(missing.map((field) => [field, 'Trường này là bắt buộc.']));
    throw new ApiError(422, 'VALIDATION_ERROR', 'Thông tin học phần chưa đầy đủ.', { fields });
  }

  try {
    return await repo.withTransaction(async (db) => {
      const id = await repo.insertCourse(db, changes);
      await repo.insertAdminLog(db, {
        adminId: admin.id,
        actionType: 'CREATE_COURSE',
        entityType: 'COURSE',
        entityId: id,
        details: { course_code: changes.courseCode },
        ipAddress
      });
      return toCourseDto(await repo.findCourseById(id, db));
    });
  } catch (err) {
    throw translateCourseWriteError(err);
  }
}

async function updateCourse(rawId, body, admin, ipAddress) {
  const id = parseId(rawId);
  assertBody(body);
  const changes = parseCourseFields(body);
  if (Object.keys(changes).length === 0) {
    throw new ApiError(400, 'EMPTY_UPDATE', 'Cần ít nhất một trường để cập nhật.');
  }

  try {
    return await repo.withTransaction(async (db) => {
      const updated = await repo.updateCourse(db, id, changes);
      if (!updated) throw new ApiError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy học phần.');
      await repo.insertAdminLog(db, {
        adminId: admin.id,
        actionType: 'UPDATE_COURSE',
        entityType: 'COURSE',
        entityId: id,
        details: { changes },
        ipAddress
      });
      return toCourseDto(await repo.findCourseById(id, db));
    });
  } catch (err) {
    throw translateCourseWriteError(err);
  }
}

/**
 * Xóa cứng chỉ khi không còn Document ở bất kỳ trạng thái nào; FK RESTRICT chặn thêm trường hợp cạnh tranh.
 * Đặc tả ADMIN_LOGS chưa có DELETE_COURSE nên ghi UPDATE_COURSE kèm operation (mục 5 Bảng API).
 */
async function deleteCourse(rawId, admin, ipAddress) {
  const id = parseId(rawId);
  const buildInUseError = (documentCount) =>
    new ApiError(409, 'COURSE_IN_USE', 'Không thể xóa học phần đang có tài liệu. Hãy tạm ẩn học phần thay vì xóa.', {
      documentCount
    });

  try {
    await repo.withTransaction(async (db) => {
      const course = await repo.lockCourse(db, id);
      if (!course) throw new ApiError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy học phần.');
      const documentCount = await repo.countDocumentsOfCourse(db, id);
      if (documentCount > 0) throw buildInUseError(documentCount);

      await repo.deleteCourse(db, id);
      await repo.insertAdminLog(db, {
        adminId: admin.id,
        actionType: 'UPDATE_COURSE',
        entityType: 'COURSE',
        entityId: id,
        details: { operation: 'DELETE_COURSE', course_code: course.course_code, course_name: course.course_name },
        ipAddress
      });
    });
  } catch (err) {
    if (err.code === PG_FOREIGN_KEY_VIOLATION) throw buildInUseError(undefined);
    throw err;
  }
}

const DOC_TYPE_MAP = {
  GIAO_TRINH: 'GIAO_TRINH',
  SLIDE_BAI_GIANG: 'SLIDE_BAI_GIANG',
  DE_THI_DAP_AN: 'DE_THI_DAP_AN',
  KHBD_5512: 'KHBD_5512',
  DO_AN_MAU: 'DO_AN_MAU',
  TAI_LIEU_THAM_KHAO: 'TAI_LIEU_THAM_KHAO',
  'KHBD Công văn 5512': 'KHBD_5512',
  'KHBD 5512': 'KHBD_5512',
  'Slide bài giảng': 'SLIDE_BAI_GIANG',
  'Đề thi & Đáp án': 'DE_THI_DAP_AN',
  'Đề thi & đáp án': 'DE_THI_DAP_AN',
  'Giáo trình': 'GIAO_TRINH',
  'Đề cương & Bài tập': 'GIAO_TRINH',
  'Đồ án mẫu': 'DO_AN_MAU',
  'Tài liệu tham khảo': 'TAI_LIEU_THAM_KHAO',
  'Tài liệu học tập': 'TAI_LIEU_THAM_KHAO'
};

function normalizeDocType(input) {
  if (!input) return 'TAI_LIEU_THAM_KHAO';
  const trimmed = String(input).trim();
  if (DOC_TYPE_MAP[trimmed]) return DOC_TYPE_MAP[trimmed];
  const upper = trimmed.toUpperCase().replace(/[\s-]+/g, '_');
  if (DOC_TYPE_MAP[upper]) return DOC_TYPE_MAP[upper];
  if (upper.includes('5512') || upper.includes('KHBD') || upper.includes('GIAO_AN')) return 'KHBD_5512';
  if (upper.includes('SLIDE') || upper.includes('BAI_GIANG')) return 'SLIDE_BAI_GIANG';
  if (upper.includes('THI') || upper.includes('DAP_AN')) return 'DE_THI_DAP_AN';
  if (upper.includes('DO_AN')) return 'DO_AN_MAU';
  if (upper.includes('GIAO_TRINH')) return 'GIAO_TRINH';
  return 'TAI_LIEU_THAM_KHAO';
}

async function uploadDocument(file, body, user) {
  if (!user || !user.id) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Bạn cần đăng nhập để tải học liệu lên hệ thống.');
  }

  if (!file || !file.buffer) {
    throw new ApiError(400, 'FILE_REQUIRED', 'Vui lòng chọn tệp PDF để tải lên.');
  }

  const { title, courseCode, courseId, docType, description } = body || {};

  if (!title || String(title).trim().length < 10) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Tiêu đề học liệu phải từ 10 ký tự trở lên.');
  }
  if (!description || String(description).trim().length < 15) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Mô tả học liệu phải từ 15 ký tự trở lên.');
  }

  // Xác định môn học
  let resolvedCourseId = null;
  if (courseId && !Number.isNaN(Number(courseId))) {
    const course = await repo.findCourseById(Number(courseId));
    if (course) resolvedCourseId = course.id;
  } else if (courseCode) {
    const course = await repo.findCourseByCode(String(courseCode).trim());
    if (course) resolvedCourseId = course.id;
  }

  if (!resolvedCourseId) {
    const allCourses = await repo.listCourses({ limit: 1 });
    resolvedCourseId = allCourses.rows?.[0]?.id || 1;
  }

  // Băm SHA-256 đối chiếu trước khi tốn băng thông Cloudinary
  const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
  if (await repo.hashExists(fileHash)) {
    throw new ApiError(409, 'DUPLICATE_FILE', 'Tệp tin này trùng mã băm SHA-256 với tài liệu đã có trong kho học liệu.');
  }

  // Tải file lên Cloudinary thật (p47plumd)
  const uploadResult = await uploadPdfBufferToCloudinary(file.buffer, file.originalname);
  if (!uploadResult.ok) {
    throw new ApiError(uploadResult.statusCode || 502, 'CLOUDINARY_UPLOAD_FAILED', uploadResult.message);
  }

  const newDoc = await repo.insertDocument({
    courseId: resolvedCourseId,
    uploaderId: user.id,
    title: String(title).trim(),
    description: String(description).trim(),
    docType: normalizeDocType(docType),
    fileName: file.originalname || 'document.pdf',
    fileUrl: uploadResult.secureUrl,
    previewUrl: uploadResult.secureUrl,
    fileSizeBytes: uploadResult.bytes,
    pageCount: uploadResult.pages,
    fileHash
  });

  return newDoc;
}

module.exports = {
  ApiError,
  MAX_PDF_BYTES,
  checkDuplicateHash,
  uploadDocument,
  listAdminDocuments,
  getAdminDocument,
  getVisibleDocument,
  moderateDocument,
  listAdminReports,
  resolveAdminReport,
  listAdminCourses,
  getAdminCourse,
  createCourse,
  updateCourse,
  deleteCourse
};
