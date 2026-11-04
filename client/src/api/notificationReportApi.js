/**
 * ============================================================================
 * API SERVICE: CỤM UC02 (ĐĂNG KÝ), UC03 (THÔNG BÁO), UC04 (BÁO CÁO VI PHẠM)
 * Thành viên phụ trách: Lê Nguyễn Thùy Trâm (50.01.103.088)
 * Tích hợp chuẩn RESTful API với Backend Express + Supabase PostgreSQL
 * Lỗi mạng được báo đúng cho người dùng, không dùng dữ liệu mẫu thay thế
 * ============================================================================
 */

import { getApiBaseUrl } from '../utils/authGuard';

const API_BASE_URL = `${getApiBaseUrl()}/api`;

/**
 * Lấy AccessToken từ phiên làm việc thực tế của 5Share
 */
export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('5share_auth_token') ||
    sessionStorage.getItem('5share_auth_token') ||
    localStorage.getItem('5share_access_token') ||
    null
  );
}

// Event Emitter để thông báo thời gian thực khi có chuông mới (UC03)
const NOTIFICATION_LISTENERS = new Set();

export function subscribeNotifications(callback) {
  NOTIFICATION_LISTENERS.add(callback);
  return () => NOTIFICATION_LISTENERS.delete(callback);
}

export function emitNotificationUpdate(data) {
  NOTIFICATION_LISTENERS.forEach((cb) => {
    try {
      cb(data);
    } catch (e) {
      console.error(e);
    }
  });
}

async function request(path, { method = 'GET', body, errorMessage }) {
  const token = getAccessToken();
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    const err = new Error('Không kết nối được máy chủ. Vui lòng kiểm tra mạng rồi thử lại.');
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || errorMessage);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }
  return data;
}

// ============================================================================
// ĐỐI TƯỢNG API CLIENT THỰC THI CHUẨN CONTRACT
// ============================================================================
export const api = {
  /**
   * 2.1 POST /api/auth/register – Đăng ký tài khoản Sinh viên (UC02)
   */
  register({ fullName, email, password, cohort = 'K50' }) {
    return request('/auth/register', {
      method: 'POST',
      body: { fullName, email, password, cohort },
      errorMessage: 'Lỗi đăng ký tài khoản',
    });
  },

  /**
   * 2.2 GET /api/notifications – Lấy danh sách thông báo của người dùng (UC03)
   */
  getNotifications({ limit = 20, unreadOnly = false } = {}) {
    const query = new URLSearchParams();
    if (limit) query.set('limit', String(limit));
    if (unreadOnly) query.set('unreadOnly', 'true');
    return request(`/notifications?${query.toString()}`, {
      errorMessage: 'Lỗi tải danh sách thông báo',
    });
  },

  /**
   * 2.3 PATCH /api/notifications – Đánh dấu thông báo đã đọc (UC03)
   */
  async markNotificationsRead({ ids, markAll } = {}) {
    const data = await request('/notifications', {
      method: 'PATCH',
      body: { ids, markAll },
      errorMessage: 'Lỗi cập nhật thông báo',
    });
    emitNotificationUpdate({ unreadCount: data.data?.unreadCount ?? 0 });
    return data;
  },

  /**
   * 2.4 POST /api/reports – Gửi báo cáo tài liệu vi phạm (UC04)
   */
  submitReport({ documentId, reason, description }) {
    return request('/reports', {
      method: 'POST',
      body: { documentId: Number(documentId), reason, description },
      errorMessage: 'Lỗi gửi báo cáo',
    });
  },

  /**
   * Giả lập bắn thông báo duyệt/từ chối từ UC08, UC09 (TC3), chỉ dùng cho khung kiểm thử
   */
  async simulateModerationNotification(action, { documentTitle, documentId = 11, reason } = {}) {
    const data = await request('/notifications/simulate-moderation', {
      method: 'POST',
      body: { action, documentTitle, documentId, reason },
      errorMessage: 'Lỗi bắn thông báo',
    });
    const notifListRes = await this.getNotifications({ limit: 20 });
    if (notifListRes?.data) {
      emitNotificationUpdate(notifListRes.data);
    }
    return data.data;
  },
};
