const { query, getClient } = require('../db/pool');

async function getDashboard(user) {
  const isAdmin = user.role === 'ADMIN';
  const where = isAdmin ? '' : 'WHERE uploader_id = $1';
  const params = isAdmin ? [] : [user.id];
  const [documents, users, reports, downloads, byDay, topCourses, pending, moderation, topDocuments] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'APPROVED')::int AS approved,
      COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected,
      COALESCE(SUM(total_downloads), 0)::int AS total_downloads
      FROM public.documents ${where}`, params),
    isAdmin ? query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE role = 'STUDENT')::int AS students,
      COUNT(*) FILTER (WHERE role = 'ADMIN')::int AS admins
      FROM public.users`) : Promise.resolve({ rows: [{ total: 0, active: 0, students: 0, admins: 0 }] }),
    isAdmin ? query("SELECT COUNT(*)::int AS total FROM public.document_reports WHERE status = 'PENDING'") : Promise.resolve({ rows: [{ total: 0 }] }),
    query(`SELECT COUNT(*)::int AS total FROM public.document_access_logs
      WHERE action_type = 'DOWNLOAD_FILE' AND accessed_at >= date_trunc('week', CURRENT_TIMESTAMP)
      ${isAdmin ? '' : 'AND document_id IN (SELECT id FROM public.documents WHERE uploader_id = $1)'}`, params),
    query(`SELECT d::date AS day,
      COUNT(l.id) FILTER (WHERE l.action_type = 'DOWNLOAD_FILE')::int AS downloads,
      COUNT(l.id) FILTER (WHERE l.action_type IN ('PREVIEW_3_PAGES', 'VIEW_FULL_PDF'))::int AS views
      FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, interval '1 day') AS d
      LEFT JOIN public.document_access_logs l ON l.accessed_at::date = d::date
      ${isAdmin ? '' : 'AND l.document_id IN (SELECT id FROM public.documents WHERE uploader_id = $1)'}
      GROUP BY d ORDER BY d`, params),
    isAdmin ? query(`SELECT c.course_code, c.course_name, c.credits, COUNT(d.id)::int AS document_count,
      COALESCE(SUM(d.total_downloads), 0)::int AS downloads
      FROM public.courses c LEFT JOIN public.documents d ON d.course_id = c.id AND d.status = 'APPROVED'
      GROUP BY c.id ORDER BY downloads DESC, document_count DESC LIMIT 5`) : Promise.resolve({ rows: [] }),
    isAdmin ? query(`SELECT d.id, d.title, d.created_at, u.full_name AS uploader_name, c.course_code, c.course_name
      FROM public.documents d JOIN public.users u ON u.id = d.uploader_id
      JOIN public.courses c ON c.id = d.course_id WHERE d.status = 'PENDING'
      ORDER BY d.created_at ASC LIMIT 5`) : Promise.resolve({ rows: [] }),
    isAdmin ? query(`SELECT d.title, ml.new_status, ml.review_note, ml.action_at, u.full_name AS actor_name
      FROM public.moderation_logs ml JOIN public.documents d ON d.id = ml.document_id
      JOIN public.users u ON u.id = ml.actor_id ORDER BY ml.action_at DESC LIMIT 5`) : Promise.resolve({ rows: [] }),
    isAdmin ? query(`SELECT d.id, d.title, d.description, d.doc_type, d.file_name, d.preview_url, d.file_size_bytes,
      d.page_count, d.file_hash, d.status, d.total_views, d.total_downloads, d.rating_avg,
      d.course_id, c.course_code, c.course_name, u.full_name AS uploader_name,
      (SELECT COUNT(*)::int FROM public.ratings r WHERE r.document_id = d.id) AS rating_count
      FROM public.documents d JOIN public.courses c ON c.id = d.course_id
      JOIN public.users u ON u.id = d.uploader_id
      WHERE d.status = 'APPROVED' ORDER BY d.total_downloads DESC, d.created_at DESC LIMIT 4`) : Promise.resolve({ rows: [] })
  ]);
  const d = documents.rows[0];
  const u = users.rows[0];
  return {
    totalDocuments: d.total,
    totalUploads: d.total,
    pending: d.pending,
    approved: d.approved,
    rejected: d.rejected,
    totalDownloads: d.total_downloads,
    downloadsThisWeek: Number(downloads.rows[0].total),
    totalUsers: u.total,
    activeUsers: u.active,
    students: u.students,
    admins: u.admins,
    pendingReports: Number(reports.rows[0].total),
    downloadsByDay: byDay.rows.map((row) => ({ date: row.day, downloads: row.downloads, views: row.views })),
    topCourses: topCourses.rows.map((row) => ({ code: row.course_code, name: row.course_name, credits: row.credits, documents: row.document_count, downloads: row.downloads })),
    pendingQueue: pending.rows.map((row) => ({ id: row.id, title: row.title, uploaderName: row.uploader_name, courseCode: row.course_code, courseName: row.course_name, createdAt: row.created_at })),
    recentActivities: moderation.rows.map((row) => ({ text: `${row.actor_name} ${row.new_status === 'APPROVED' ? 'đã duyệt' : row.new_status === 'REJECTED' ? 'đã từ chối' : 'đã cập nhật'} “${row.title}”`, time: row.action_at })),
    topDocuments: topDocuments.rows.map((row) => ({ id: row.id, title: row.title, description: row.description, docType: row.doc_type, fileName: row.file_name, previewUrl: row.preview_url, fileSizeBytes: Number(row.file_size_bytes), fileSizeMb: Number(row.file_size_bytes) / 1048576, pageCount: row.page_count, fileHash: row.file_hash?.trim(), status: row.status, viewCount: row.total_views, downloadCount: row.total_downloads, ratingAvg: Number(row.rating_avg), ratingCount: Number(row.rating_count), courseId: row.course_id, courseCode: row.course_code, courseName: row.course_name, uploaderName: row.uploader_name, format: 'PDF', comments: [] }))
  };
}

async function listMyUploads(userId, { status, limit, offset }) {
  const params = [userId];
  const filter = status ? 'AND d.status = $2' : '';
  if (status) params.push(status);
  const limitPos = params.length + 1;
  const offsetPos = params.length + 2;
  params.push(limit, offset);
  const [items, count] = await Promise.all([
    query(`SELECT d.id, d.title, d.description, d.doc_type, d.file_name, d.preview_url, d.file_size_bytes,
      d.page_count, d.file_hash, d.status, d.reject_reason, d.total_views, d.total_downloads,
      d.rating_avg, d.created_at, d.reviewed_at, d.course_id, c.course_code, c.course_name,
      (SELECT ml.review_note FROM public.moderation_logs ml WHERE ml.document_id = d.id ORDER BY ml.action_at DESC LIMIT 1) AS review_note
      FROM public.documents d JOIN public.courses c ON c.id = d.course_id
      WHERE d.uploader_id = $1 ${filter}
      ORDER BY d.created_at DESC LIMIT $${limitPos} OFFSET $${offsetPos}`, params),
    query(`SELECT COUNT(*)::int AS total FROM public.documents d WHERE d.uploader_id = $1 ${filter}`, params.slice(0, status ? 2 : 1))
  ]);
  return { rows: items.rows, total: count.rows[0].total };
}

async function listPublicDocuments({ limit, offset, search }) {
  const params = [];
  let searchSql = '';
  if (search) {
    params.push(`%${search}%`);
    searchSql = `AND (d.title ILIKE $1 OR c.course_name ILIKE $1 OR c.course_code ILIKE $1)`;
  }
  params.push(limit, offset);
  const lim = params.length - 1;
  const off = params.length;
  const rows = await query(`SELECT d.id, d.title, d.description, d.doc_type, d.file_name, d.preview_url,
    d.file_size_bytes, d.page_count, d.file_hash, d.status, d.reject_reason,
    d.total_views, d.total_downloads, d.rating_avg, d.created_at,
    d.course_id, c.course_code, c.course_name, u.full_name AS uploader_name,
    (SELECT COUNT(*)::int FROM public.ratings r WHERE r.document_id = d.id) AS rating_count
    FROM public.documents d JOIN public.courses c ON c.id = d.course_id
    JOIN public.users u ON u.id = d.uploader_id
    WHERE d.status = 'APPROVED' ${searchSql}
    ORDER BY d.created_at DESC LIMIT $${lim} OFFSET $${off}`, params);
  return rows.rows;
}

async function listBookmarks(userId) {
  const result = await query(`SELECT d.id, d.title, d.description, d.doc_type, d.file_name, d.preview_url,
    d.file_hash, d.created_at, d.file_size_bytes, d.page_count, d.rating_avg, d.total_downloads, d.total_views,
    d.course_id, c.course_code, c.course_name, u.full_name AS uploader_name, b.note, b.is_pinned, b.saved_at,
    (SELECT COUNT(*)::int FROM public.ratings r WHERE r.document_id = d.id) AS rating_count
    FROM public.bookmarks b JOIN public.documents d ON d.id = b.document_id
    JOIN public.courses c ON c.id = d.course_id
    JOIN public.users u ON u.id = d.uploader_id
    WHERE b.user_id = $1 AND d.status = 'APPROVED' ORDER BY b.saved_at DESC`, [userId]);
  return result.rows;
}

async function upsertBookmark(userId, documentId, note, isPinned) {
  const result = await query(`INSERT INTO public.bookmarks (user_id, document_id, note, is_pinned)
    SELECT $1, d.id, $3, $4 FROM public.documents d WHERE d.id = $2 AND d.status = 'APPROVED'
    ON CONFLICT (user_id, document_id) DO UPDATE SET note = EXCLUDED.note, is_pinned = EXCLUDED.is_pinned
    RETURNING user_id, document_id, note, is_pinned, saved_at`, [userId, documentId, note, isPinned]);
  return result.rows[0] || null;
}

async function deleteBookmark(userId, documentId) {
  const result = await query('DELETE FROM public.bookmarks WHERE user_id = $1 AND document_id = $2 RETURNING document_id', [userId, documentId]);
  return result.rowCount > 0;
}

async function getComments(documentId, userId, { limit, offset }) {
  const [summary, comments, count, ownRating] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total, COALESCE(AVG(score), 0)::numeric(3,1) AS average,
      COUNT(*) FILTER (WHERE score = 5)::int AS five, COUNT(*) FILTER (WHERE score = 4)::int AS four,
      COUNT(*) FILTER (WHERE score = 3)::int AS three, COUNT(*) FILTER (WHERE score = 2)::int AS two,
      COUNT(*) FILTER (WHERE score = 1)::int AS one FROM public.ratings WHERE document_id = $1`, [documentId]),
    query(`SELECT c.id, c.user_id, u.full_name, c.content, c.parent_comment_id, c.upvote_count, c.created_at
      FROM public.document_comments c JOIN public.users u ON u.id = c.user_id
      WHERE c.document_id = $1 AND c.is_hidden = FALSE
      ORDER BY c.created_at DESC LIMIT $2 OFFSET $3`, [documentId, limit, offset]),
    query('SELECT COUNT(*)::int AS total FROM public.document_comments WHERE document_id = $1 AND is_hidden = FALSE', [documentId]),
    userId ? query('SELECT score FROM public.ratings WHERE document_id = $1 AND user_id = $2', [documentId, userId]) : Promise.resolve({ rows: [] })
  ]);
  return { summary: summary.rows[0], comments: comments.rows, totalComments: count.rows[0].total, myRating: ownRating.rows[0]?.score ?? null };
}

async function saveRating(userId, documentId, score) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO public.ratings (user_id, document_id, score)
      SELECT $1, id, $3 FROM public.documents WHERE id = $2 AND status = 'APPROVED'
      ON CONFLICT (user_id, document_id) DO UPDATE SET score = EXCLUDED.score, rated_at = CURRENT_TIMESTAMP`, [userId, documentId, score]);
    const result = await client.query(`UPDATE public.documents SET rating_avg = COALESCE(
      (SELECT AVG(score) FROM public.ratings WHERE document_id = $1), 0) WHERE id = $1 AND status = 'APPROVED'
      RETURNING rating_avg`, [documentId]);
    if (!result.rowCount) throw Object.assign(new Error('DOCUMENT_NOT_FOUND'), { code: 'DOCUMENT_NOT_FOUND' });
    await client.query('COMMIT');
    return Number(result.rows[0].rating_avg);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function addComment(userId, documentId, content, parentCommentId) {
  const result = await query(`INSERT INTO public.document_comments (user_id, document_id, content, parent_comment_id)
    SELECT $1, d.id, $3, $4 FROM public.documents d
    WHERE d.id = $2 AND d.status = 'APPROVED'
      AND ($4::int IS NULL OR EXISTS (SELECT 1 FROM public.document_comments p WHERE p.id = $4 AND p.document_id = d.id AND p.is_hidden = FALSE))
    RETURNING id, user_id, document_id, content, parent_comment_id, upvote_count, created_at`, [userId, documentId, content, parentCommentId]);
  return result.rows[0] || null;
}

async function hideComment(user, documentId, commentId) {
  const result = await query(`WITH RECURSIVE target_comments(id) AS (
      SELECT id FROM public.document_comments
      WHERE id = $1 AND document_id = $2 AND (user_id = $3 OR $4 = 'ADMIN')
      UNION ALL
      SELECT child.id FROM public.document_comments child
      JOIN target_comments parent ON child.parent_comment_id = parent.id
    )
    UPDATE public.document_comments SET is_hidden = TRUE
    WHERE id IN (SELECT id FROM target_comments) RETURNING id`, [commentId, documentId, user.id, user.role]);
  if (result.rowCount) return 'deleted';
  const exists = await query('SELECT 1 FROM public.document_comments WHERE id = $1 AND document_id = $2', [commentId, documentId]);
  return exists.rowCount ? 'forbidden' : 'missing';
}

async function findDownloadable(documentId) {
  const result = await query(`SELECT id, title, file_name, file_url FROM public.documents WHERE id = $1 AND status = 'APPROVED'`, [documentId]);
  return result.rows[0] || null;
}

async function recordDownload(documentId, userId, ipAddress) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE public.documents SET total_downloads = total_downloads + 1 WHERE id = $1 AND status = \'APPROVED\'', [documentId]);
    await client.query(`INSERT INTO public.document_access_logs (document_id, user_id, action_type, ip_address)
      VALUES ($1, $2, 'DOWNLOAD_FILE', $3)`, [documentId, userId, ipAddress]);
    await client.query(`INSERT INTO public.user_document_history (user_id, document_id, download_count_by_user, visited_at)
      VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, document_id) DO UPDATE SET download_count_by_user = user_document_history.download_count_by_user + 1,
      visited_at = CURRENT_TIMESTAMP`, [userId, documentId]);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function recordView(documentId, userId, ipAddress, actionType) {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const updated = await client.query("UPDATE public.documents SET total_views = total_views + 1 WHERE id = $1 AND status = 'APPROVED' RETURNING id", [documentId]);
    if (!updated.rowCount) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query('INSERT INTO public.document_access_logs (document_id, user_id, action_type, ip_address) VALUES ($1, $2, $3, $4)', [documentId, userId, actionType, ipAddress]);
    if (userId) {
      await client.query(`INSERT INTO public.user_document_history (user_id, document_id, visited_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, document_id) DO UPDATE SET visited_at = CURRENT_TIMESTAMP`, [userId, documentId]);
    }
    await client.query('COMMIT');
    return true;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

async function findApprovedDocument(documentId) {
  const result = await query("SELECT id FROM public.documents WHERE id = $1 AND status = 'APPROVED'", [documentId]);
  return result.rowCount > 0;
}

module.exports = { getDashboard, listMyUploads, listPublicDocuments, listBookmarks, upsertBookmark, deleteBookmark, getComments, saveRating, addComment, hideComment, findDownloadable, recordDownload, recordView, findApprovedDocument };
