/**
 * ============================================================================
 * TẦNG SERVICE: NGHIỆP VỤ CHO THÔNG BÁO (UC03) VÀ BÁO CÁO VI PHẠM (UC04)
 * ============================================================================
 */

const repo = require('../repositories/notificationReportRepository');
const realtime = require('./realtimeHub');
const { ADMIN_NEW_DOCUMENT_TITLE } = require('../utils/notificationTitles');

class ApiError extends Error {
  constructor(statusCode, code, message, extra = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.extra = extra;
  }
}

/**
 * Định dạng thời gian thân thiện (Relative time tiếng Việt)
 */
function formatRelativeTime(date) {
  if (!date) return '';
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay === 1) return 'Hôm qua';
  if (diffDay < 7) return `${diffDay} ngày trước`;

  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const REASON_MAPPING = {
  'Trùng lặp': 'NOI_DUNG_RAC',
  'Sai môn': 'SAI_MON_HOC',
  'Bản quyền': 'VI_PHAM_BAN_QUYEN',
  'Nội dung xấu': 'NOI_DUNG_RAC',
  SAI_KIEN_THUC: 'SAI_KIEN_THUC',
  KHONG_CHUAN_5512: 'KHONG_CHUAN_5512',
  LOI_HIEN_THI_MO: 'LOI_HIEN_THI_MO',
  SAI_MON_HOC: 'SAI_MON_HOC',
  VI_PHAM_BAN_QUYEN: 'VI_PHAM_BAN_QUYEN',
  NOI_DUNG_RAC: 'NOI_DUNG_RAC'
};

/**
 * Lấy danh sách thông báo và số lượng chưa đọc (UC03)
 */
async function getNotifications(userId, query = {}) {
  const limit = Math.min(Math.max(1, Number(query.limit) || 20), 100);
  const unreadOnly = String(query.unreadOnly) === 'true';

  const [rows, unreadCount] = await Promise.all([
    repo.getNotificationsByUser(userId, { limit, unreadOnly }),
    repo.countUnreadNotifications(userId)
  ]);

  const items = rows.map((row) => ({
    id: row.id,
    type:
      row.type === 'DOC_APPROVED'
        ? 'DOCUMENT_APPROVED'
        : row.type === 'DOC_REJECTED'
          ? 'DOCUMENT_REJECTED'
          : row.type,
    rawType: row.type,
    title: row.title,
    message: row.message,
    documentId: row.related_document_id,
    // Tài liệu chờ duyệt chưa có trong Kho công khai nên mở thẳng màn hình Kiểm duyệt
    targetScreen: row.type === 'SYSTEM' && row.title === ADMIN_NEW_DOCUMENT_TITLE ? 'admin-moderation' : null,
    isRead: row.is_read,
    createdAt: formatRelativeTime(row.created_at),
    rawCreatedAt: row.created_at
  }));

  return { items, unreadCount };
}

/**
 * Đánh dấu thông báo là đã đọc (UC03)
 */
async function markNotificationsRead(userId, body = {}) {
  const { ids, markAll } = body;
  const updated = await repo.markNotificationsAsRead(userId, { ids, markAll: Boolean(markAll) });
  const unreadCount = await repo.countUnreadNotifications(userId);

  return { updated, unreadCount };
}

/**
 * Gửi báo cáo tài liệu vi phạm (UC04)
 */
async function submitReport(userId, body = {}) {
  const { documentId, reason, description } = body;

  const docIdNum = Number(documentId);
  if (!Number.isInteger(docIdNum) || docIdNum <= 0) {
    throw new ApiError(400, 'INVALID_DOCUMENT_ID', 'Mã tài liệu không hợp lệ.');
  }

  if (!reason || typeof reason !== 'string') {
    throw new ApiError(400, 'MISSING_REASON', 'Yêu cầu chọn nhóm lý do vi phạm.');
  }

  const cleanDesc = (description || '').trim();
  if (!cleanDesc) {
    throw new ApiError(400, 'MISSING_DESCRIPTION', 'Yêu cầu nhập mô tả cụ thể về vi phạm.');
  }
  if (cleanDesc.length < 10) {
    throw new ApiError(400, 'DESCRIPTION_TOO_SHORT', 'Mô tả vi phạm quá ngắn! Vui lòng nhập tối thiểu 10 ký tự.');
  }

  // 1. Kiểm tra tài liệu tồn tại
  const doc = await repo.findDocumentById(docIdNum);
  if (!doc) {
    throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Học liệu không tồn tại hoặc không còn khả dụng.');
  }

  // 2. Chống báo cáo trùng lặp đang PENDING (HTTP 409 Conflict - TC4 & Activity Diagram UC04 bước 4-5)
  const existingPending = await repo.findPendingReport(userId, docIdNum);
  if (existingPending) {
    throw new ApiError(
      409,
      'REPORT_ALREADY_EXISTS',
      'Bạn đã báo cáo tài liệu này, vui lòng chờ xử lý.'
    );
  }

  // 3. Chuẩn hóa nhóm lý do sang Check Constraint của CSDL
  const reasonCategory = REASON_MAPPING[reason.trim()] || 'NOI_DUNG_RAC';

  // 4. Lưu bản ghi báo cáo
  const newReport = await repo.createReport({
    reporterId: userId,
    documentId: docIdNum,
    reasonCategory,
    description: cleanDesc
  });

  realtime.publishToAdmins('moderation', { reportId: newReport.id });

  return {
    id: newReport.id,
    documentId: newReport.document_id,
    status: newReport.status
  };
}

/**
 * Giả lập thông báo duyệt/từ chối tài liệu cho mục đích kiểm thử (TC3)
 */
async function simulateModeration(userId, body = {}) {
  const { action = 'APPROVED', documentTitle = 'Tài liệu học tập', documentId = 11, reason } = body;
  const isApproved = String(action).toUpperCase() === 'APPROVED';

  const type = isApproved ? 'DOC_APPROVED' : 'DOC_REJECTED';
  const title = isApproved ? 'Tài liệu đã được duyệt' : 'Tài liệu bị từ chối';
  const message = isApproved
    ? `"${documentTitle}" đã hiển thị cho mọi người.`
    : `"${documentTitle}". Lý do: ${reason || 'Nội dung trùng lặp với tài liệu đã có.'}`;

  const row = await repo.insertNotification({
    userId,
    relatedDocumentId: Number(documentId) || null,
    type,
    title,
    message
  });

  return {
    id: row.id,
    type: isApproved ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
    rawType: type,
    title: row.title,
    message: row.message,
    documentId: row.related_document_id,
    isRead: false,
    createdAt: 'Vừa xong'
  };
}

module.exports = {
  ApiError,
  getNotifications,
  markNotificationsRead,
  submitReport,
  simulateModeration
};
