/**
 * API Service cho Cụm UC02, UC03, UC04 (5Share)
 * Khớp 100% với Bảng hợp đồng Endpoint RESTful API (Task 5S-024 | Trâm - 50.01.103.088)
 * 
 * 1. POST /api/auth/register (UC02)
 * 2. GET  /api/notifications (UC03)
 * 3. PATCH /api/notifications (UC03)
 * 4. POST /api/reports (UC04)
 */

// Cấu hình URL cơ sở, có thể ghi đè qua biến môi trường VITE_API_BASE_URL
const API_BASE_URL = typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL
  ? process.env.VITE_API_BASE_URL
  : '/api';

// Lấy AccessToken từ localStorage
export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('5share_access_token') || 'mock_jwt_student_token';
}

// Lưu AccessToken và User
export function setAuthSession(token, user) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('5share_access_token', token);
  if (user) localStorage.setItem('5share_current_user', JSON.stringify(user));
}

// Event Emitter để thông báo thời gian thực khi có chuông mới (UC03)
const NOTIFICATION_LISTENERS = new Set();

export function subscribeNotifications(callback) {
  NOTIFICATION_LISTENERS.add(callback);
  return () => NOTIFICATION_LISTENERS.delete(callback);
}

export function emitNotificationUpdate(data) {
  NOTIFICATION_LISTENERS.forEach((cb) => {
    try { cb(data); } catch (e) { console.error(e); }
  });
}

// ============================================================================
// DỮ LIỆU MOCK PHỤC VỤ TEST / STANDALONE (Tự động lưu LocalStorage)
// ============================================================================
const STORAGE_KEYS = {
  USERS: '5share_users',
  NOTIFS: '5share_notifications',
  REPORTS: '5share_reports',
};

const DEFAULT_USERS = [
  { id: 1, fullName: 'Quản trị viên 5Share', email: 'admin@5share.edu.vn', role: 'ADMIN', status: 'active' },
  { id: 2, fullName: 'Lê Nguyễn Thùy Trâm', email: 'tram.lnt@student.hcmue.edu.vn', role: 'STUDENT', status: 'active' },
  { id: 3, fullName: 'Nguyễn Văn Sinh Viên', email: 'sinhvien@student.hcmue.edu.vn', role: 'STUDENT', status: 'active' },
];

const DEFAULT_NOTIFS = [
  {
    id: 15,
    type: 'DOCUMENT_REJECTED',
    title: 'Tài liệu bị từ chối',
    message: 'Giáo trình Cấu trúc dữ liệu – Chương 3. Lý do: nội dung trùng lặp với tài liệu đã có.',
    documentId: 7,
    isRead: false,
    createdAt: '10 phút trước',
  },
  {
    id: 14,
    type: 'DOCUMENT_APPROVED',
    title: 'Tài liệu đã được duyệt',
    message: 'Đề cương ôn tập Lập trình hướng đối tượng đã hiển thị cho mọi người.',
    documentId: 6,
    isRead: false,
    createdAt: '2 giờ trước',
  },
  {
    id: 12,
    type: 'DOCUMENT_APPROVED',
    title: 'Tài liệu đã được duyệt',
    message: 'Bài tập Cơ sở dữ liệu – Tuần 5 đã hiển thị cho mọi người.',
    documentId: 4,
    isRead: true,
    createdAt: 'Hôm qua',
  },
];

const DEFAULT_REPORTS = [
  {
    id: 10,
    documentId: 99, // Đã báo cáo tài liệu 99
    reporterId: 2,
    reason: 'Trùng lặp',
    description: 'Tài liệu trùng lặp hoàn toàn với sách cũ',
    status: 'PENDING',
    createdAt: '2026-11-01T08:00:00Z',
  },
];

function getLocal(key, defaultVal) {
  if (typeof window === 'undefined') return defaultVal;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function setLocal(key, val) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
}

// ============================================================================
// ĐỐI TƯỢNG API CLIENT THỰC HIỆN ĐÚNG CONTRACT
// ============================================================================
export const api = {
  /**
   * 2.1 POST /api/auth/register – Đăng ký tài khoản Sinh viên (UC02)
   * Quyền: Guest | Body: { fullName, email, password, cohort? }
   */
  async register({ fullName, email, password, cohort = 'K50' }) {
    // Thử gọi endpoint thực tế nếu có server chạy
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, cohort }),
      });
      const data = await res.json();
      if (!res.ok) {
        const error = new Error(data.message || 'Lỗi đăng ký tài khoản');
        error.code = data.code || 'VALIDATION_ERROR';
        error.status = res.status;
        throw error;
      }
      return data;
    } catch (networkOrMockErr) {
      // Nếu không có backend server, chạy Mock Engine theo chuẩn 100% Contract
      if (networkOrMockErr.status) throw networkOrMockErr; // Lỗi từ server trả về

      await new Promise((r) => setTimeout(r, 300));
      const cleanEmail = (email || '').trim().toLowerCase();
      const users = getLocal(STORAGE_KEYS.USERS, DEFAULT_USERS);

      // Kiểm tra trùng email (HTTP 409 Conflict)
      if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        const err = new Error('Email này đã được đăng ký');
        err.status = 409;
        err.code = 'EMAIL_ALREADY_EXISTS';
        throw err;
      }

      // Tạo user mới
      const newUser = {
        id: users.length + 1,
        fullName: fullName.trim(),
        email: cleanEmail,
        cohort: cohort || 'K50',
        role: 'STUDENT',
        status: 'active',
      };
      setLocal(STORAGE_KEYS.USERS, [...users, newUser]);
      setAuthSession(`jwt_mock_token_user_${newUser.id}`, newUser);

      return {
        success: true,
        message: 'Đăng ký tài khoản thành công',
        data: newUser,
      };
    }
  },

  /**
   * 2.2 GET /api/notifications – Lấy danh sách thông báo (UC03)
   * Quyền: STUDENT, ADMIN | Query: limit=20, unreadOnly=false
   */
  async getNotifications({ limit = 20, unreadOnly = false } = {}) {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/notifications?limit=${limit}&unreadOnly=${unreadOnly}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.message || 'Không thể lấy thông báo');
        err.status = res.status;
        err.code = data.code;
        throw err;
      }
      return data;
    } catch (networkOrMockErr) {
      if (networkOrMockErr.status) throw networkOrMockErr;

      await new Promise((r) => setTimeout(r, 200));
      const notifs = getLocal(STORAGE_KEYS.NOTIFS, DEFAULT_NOTIFS);
      const filtered = unreadOnly ? notifs.filter((n) => !n.isRead) : notifs;
      const unreadCount = notifs.filter((n) => !n.isRead).length;

      return {
        success: true,
        message: 'Truy vấn thông báo thành công',
        data: {
          unreadCount,
          items: filtered.slice(0, limit),
        },
      };
    }
  },

  /**
   * 2.3 PATCH /api/notifications – Đánh dấu thông báo đã đọc (UC03)
   * Quyền: STUDENT, ADMIN | Body: { ids: [15] } hoặc { markAll: true }
   */
  async markNotificationsRead({ ids, markAll } = {}) {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids, markAll }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.message || 'Lỗi cập nhật thông báo');
        err.status = res.status;
        err.code = data.code;
        throw err;
      }
      return data;
    } catch (networkOrMockErr) {
      if (networkOrMockErr.status) throw networkOrMockErr;

      await new Promise((r) => setTimeout(r, 150));
      const notifs = getLocal(STORAGE_KEYS.NOTIFS, DEFAULT_NOTIFS);
      let updatedCount = 0;

      const next = notifs.map((n) => {
        if (markAll) {
          if (!n.isRead) updatedCount++;
          return { ...n, isRead: true };
        }
        if (Array.isArray(ids) && ids.includes(n.id)) {
          if (!n.isRead) updatedCount++;
          return { ...n, isRead: true };
        }
        return n;
      });

      setLocal(STORAGE_KEYS.NOTIFS, next);
      const unreadCount = next.filter((n) => !n.isRead).length;
      emitNotificationUpdate({ items: next, unreadCount });

      return {
        success: true,
        message: 'Đã đánh dấu thông báo là đã đọc',
        data: {
          updated: updatedCount,
          unreadCount,
        },
      };
    }
  },

  /**
   * 2.4 POST /api/reports – Gửi báo cáo tài liệu vi phạm (UC04)
   * Quyền: STUDENT | Body: { documentId, reason, description }
   */
  async submitReport({ documentId, reason, description }) {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId, reason, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.message || 'Lỗi gửi báo cáo');
        err.status = res.status;
        err.code = data.code;
        throw err;
      }
      return data;
    } catch (networkOrMockErr) {
      if (networkOrMockErr.status) throw networkOrMockErr;

      await new Promise((r) => setTimeout(r, 250));
      const reports = getLocal(STORAGE_KEYS.REPORTS, DEFAULT_REPORTS);

      // Chặn tài liệu không hợp lệ (404)
      if (documentId === 404 || documentId === '404') {
        const err = new Error('Học liệu không tồn tại hoặc không còn khả dụng');
        err.status = 404;
        err.code = 'DOCUMENT_NOT_FOUND';
        throw err;
      }

      // Kiểm tra trùng lặp báo cáo đang PENDING (HTTP 409 Conflict)
      const isDuplicate = reports.some(
        (rep) => Number(rep.documentId) === Number(documentId) && rep.status === 'PENDING'
      );

      if (isDuplicate) {
        const err = new Error('Bạn đã báo cáo tài liệu này, vui lòng chờ xử lý');
        err.status = 409;
        err.code = 'REPORT_ALREADY_EXISTS';
        throw err;
      }

      const newReport = {
        id: reports.length + 1,
        documentId: Number(documentId),
        reason,
        description: (description || '').trim(),
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      setLocal(STORAGE_KEYS.REPORTS, [...reports, newReport]);

      return {
        success: true,
        message: 'Đã gửi báo cáo vi phạm, Quản trị viên sẽ xem xét',
        data: {
          id: newReport.id,
          documentId: newReport.documentId,
          status: 'PENDING',
        },
      };
    }
  },

  /**
   * Giả lập bắn thông báo duyệt/từ chối từ UC08, UC09 (Test Case 3)
   */
  async simulateModerationNotification(action, { documentTitle, documentId = 7, reason }) {
    const notifs = getLocal(STORAGE_KEYS.NOTIFS, DEFAULT_NOTIFS);
    const isApproved = action === 'APPROVED';
    const newNotif = {
      id: Date.now(),
      type: isApproved ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
      title: isApproved ? 'Tài liệu đã được duyệt' : 'Tài liệu bị từ chối',
      message: isApproved
        ? `${documentTitle || 'Tài liệu'} đã hiển thị cho mọi người.`
        : `${documentTitle || 'Tài liệu'}. Lý do: ${reason || 'nội dung trùng lặp với tài liệu đã có.'}`,
      documentId,
      isRead: false,
      createdAt: 'Vừa xong',
    };
    const updated = [newNotif, ...notifs];
    setLocal(STORAGE_KEYS.NOTIFS, updated);
    const unreadCount = updated.filter((n) => !n.isRead).length;
    emitNotificationUpdate({ items: updated, unreadCount });
    return newNotif;
  },
};
