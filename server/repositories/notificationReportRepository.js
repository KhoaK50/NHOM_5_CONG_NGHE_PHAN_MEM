/**
 * ============================================================================
 * TẦNG REPOSITORY: TRUY VẤN CSDL CHO THÔNG BÁO (UC03) VÀ BÁO CÁO VI PHẠM (UC04)
 * ============================================================================
 */

const { query } = require('../db/pool');

/**
 * Lấy danh sách thông báo của người dùng
 */
async function getNotificationsByUser(userId, { limit = 20, unreadOnly = false } = {}) {
  const sql = `
    SELECT id, user_id, related_document_id, type, title, message, is_read, created_at
    FROM public.notifications
    WHERE user_id = $1
      AND ($2::boolean = false OR is_read = false)
    ORDER BY created_at DESC, id DESC
    LIMIT $3
  `;
  const result = await query(sql, [userId, Boolean(unreadOnly), Number(limit) || 20]);
  return result.rows;
}

/**
 * Đếm số lượng thông báo chưa đọc của người dùng
 */
async function countUnreadNotifications(userId) {
  const sql = `
    SELECT COUNT(*)::int AS count
    FROM public.notifications
    WHERE user_id = $1 AND is_read = false
  `;
  const result = await query(sql, [userId]);
  return result.rows[0]?.count || 0;
}

/**
 * Đánh dấu thông báo là đã đọc
 */
async function markNotificationsAsRead(userId, { ids = [], markAll = false } = {}) {
  if (markAll) {
    const sql = `
      UPDATE public.notifications
      SET is_read = true
      WHERE user_id = $1 AND is_read = false
      RETURNING id
    `;
    const result = await query(sql, [userId]);
    return result.rowCount || 0;
  }

  if (Array.isArray(ids) && ids.length > 0) {
    const validIds = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (validIds.length === 0) return 0;

    const sql = `
      UPDATE public.notifications
      SET is_read = true
      WHERE user_id = $1 AND id = ANY($2::int[]) AND is_read = false
      RETURNING id
    `;
    const result = await query(sql, [userId, validIds]);
    return result.rowCount || 0;
  }

  return 0;
}

/**
 * Thêm thông báo mới vào CSDL
 */
async function insertNotification({ userId, relatedDocumentId = null, type, title, message }) {
  const sql = `
    INSERT INTO public.notifications (user_id, related_document_id, type, title, message, is_read)
    VALUES ($1, $2, $3, $4, $5, false)
    RETURNING id, user_id, related_document_id, type, title, message, is_read, created_at
  `;
  const result = await query(sql, [userId, relatedDocumentId, type, title, message]);
  return result.rows[0];
}

/**
 * Tìm tài liệu theo ID
 */
async function findDocumentById(documentId) {
  const sql = `
    SELECT id, title, status, uploader_id
    FROM public.documents
    WHERE id = $1
  `;
  const result = await query(sql, [documentId]);
  return result.rows[0] || null;
}

/**
 * Kiểm tra xem người dùng đã có báo cáo PENDING cho tài liệu này chưa (Chống trùng - TC4)
 */
async function findPendingReport(reporterId, documentId) {
  const sql = `
    SELECT id, reporter_id, document_id, status, created_at
    FROM public.document_reports
    WHERE reporter_id = $1 AND document_id = $2 AND status = 'PENDING'
    LIMIT 1
  `;
  const result = await query(sql, [reporterId, documentId]);
  return result.rows[0] || null;
}

/**
 * Thêm báo cáo vi phạm mới vào CSDL
 */
async function createReport({ reporterId, documentId, reasonCategory, description }) {
  const sql = `
    INSERT INTO public.document_reports (reporter_id, document_id, reason_category, description, status)
    VALUES ($1, $2, $3, $4, 'PENDING')
    RETURNING id, document_id, reporter_id, reason_category, description, status, created_at
  `;
  const result = await query(sql, [reporterId, documentId, reasonCategory, description]);
  return result.rows[0];
}

module.exports = {
  getNotificationsByUser,
  countUnreadNotifications,
  markNotificationsAsRead,
  insertNotification,
  findDocumentById,
  findPendingReport,
  createReport
};
