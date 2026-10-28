/**
 * ============================================================================
 * AUTH GUARD — QUẢN LÝ PHIÊN ĐĂNG NHẬP, JWT EXPIRY & ĐA TÀI KHOẢN THỰC TẾ
 * Đồng bộ 100% kiến trúc bảo mật chuẩn Production của 5Share
 * ============================================================================
 */

const TOKEN_KEY = '5share_auth_token';
const USER_KEY = '5share_user';
const SAVED_ACCOUNTS_KEY = '5share_saved_accounts';

export function getApiBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (
    typeof window !== 'undefined' &&
    window.location?.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'https://fiveshare-api.onrender.com';
  }
  return 'http://localhost:5000';
}

/**
 * Giải mã payload của JWT trên trình duyệt (an toàn với UTF-8 / Base64URL)
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Kiểm tra JWT đã hết hạn hay chưa
 */
export function isJwtExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

/**
 * Lấy danh sách các tài khoản đã từng đăng nhập hợp lệ trên trình duyệt này
 */
export function getSavedAccounts() {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((acc) => acc && acc.email && acc.token && !isJwtExpired(acc.token));
  } catch {
    return [];
  }
}

/**
 * Xóa một tài khoản khỏi danh sách chuyển đổi nhanh trên trình duyệt
 */
export function removeSavedAccount(email) {
  try {
    if (!email) return [];
    const current = getSavedAccounts();
    const next = current.filter(
      (acc) => String(acc.email).toLowerCase() !== String(email).toLowerCase()
    );
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

/**
 * Lưu Token & Hồ sơ người dùng theo lựa chọn "Ghi nhớ đăng nhập":
 * - remember = true  -> lưu vào localStorage (duy trì sau khi đóng trình duyệt)
 * - remember = false -> lưu vào sessionStorage (tự xóa khi đóng trình duyệt)
 */
export function saveAuthSession(token, userProfile, remember = true) {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);

    const targetStorage = remember ? localStorage : sessionStorage;
    if (token) {
      targetStorage.setItem(TOKEN_KEY, token);
    }
    if (userProfile) {
      targetStorage.setItem(USER_KEY, JSON.stringify(userProfile));
    }

    // Lưu vào danh sách tài khoản đã đăng nhập hợp lệ trên trình duyệt
    if (userProfile && userProfile.email && token) {
      const accounts = getSavedAccounts();
      const existingIdx = accounts.findIndex(
        (acc) => acc.email?.toLowerCase() === userProfile.email.toLowerCase()
      );
      const entry = {
        id: userProfile.id,
        email: userProfile.email,
        fullName: userProfile.fullName || userProfile.display_name,
        role: userProfile.role === 'ADMIN' ? 'ADMIN' : 'USER',
        isRootAdmin: Boolean(userProfile.isRootAdmin),
        cohort: userProfile.cohort || 'K50',
        studentId: userProfile.studentId || userProfile.studentCode || '',
        avatar_url: userProfile.avatar_url || userProfile.avatarUrl || null,
        avatarInitials: userProfile.avatarInitials || 'SV',
        token,
        lastLogin: new Date().toISOString()
      };
      if (existingIdx > -1) {
        accounts[existingIdx] = entry;
      } else {
        accounts.unshift(entry);
      }
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts.slice(0, 5)));
    }
  } catch {
    // Bỏ qua nếu môi trường chặn Web Storage
  }
}

/**
 * Cập nhật hồ sơ người dùng (và token mới nếu có) trong phiên hiện tại
 */
export function updateSavedUserProfile(userProfile, newToken = null) {
  try {
    const isLocal = Boolean(localStorage.getItem(TOKEN_KEY) || localStorage.getItem(USER_KEY));
    const currentToken = newToken || getAuthToken();
    saveAuthSession(currentToken, userProfile, isLocal);
  } catch {
    // ignore
  }
}

/**
 * Lấy JWT hiện tại và tự động thu hồi nếu đã quá hạn `exp`
 */
export function getAuthToken() {
  try {
    const token =
      localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
    if (!token) return null;
    if (isJwtExpired(token)) {
      clearAuthSession();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

/**
 * Lấy thông tin người dùng hiện tại từ localStorage hoặc sessionStorage
 */
export function getSavedUserProfile() {
  try {
    const raw =
      localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || null;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Xóa toàn bộ phiên đăng nhập hiện hành trên cả localStorage và sessionStorage
 */
export function clearAuthSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export const AuthGuard = {
  getApiBaseUrl,
  saveAuthSession,
  updateSavedUserProfile,
  getAuthToken,
  getSavedUserProfile,
  getSavedAccounts,
  removeSavedAccount,
  clearAuthSession,
  decodeJwtPayload,
  isJwtExpired
};

export default AuthGuard;
