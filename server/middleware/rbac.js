/**
 * ============================================================================
 * RBAC MIDDLEWARE: XÁC THỰC BEARER JWT & PHÂN QUYỀN CHO CỤM UC08–UC10
 * Quyền lấy từ USERS trong CSDL, không tin role do client gửi.
 * ============================================================================
 */

const authService = require('../services/authService');

function resolveAuthCode(auth) {
  if (auth.statusCode === 403) return 'ACCOUNT_INACTIVE';
  return auth.body?.status === 'session_revoked' ? 'SESSION_REVOKED' : 'UNAUTHORIZED';
}

function requireRoles(...roles) {
  return async (req, res, next) => {
    const auth = await authService.authenticateRequest(req.headers.authorization);
    if (!auth.ok) {
      return res.status(auth.statusCode).json({
        success: false,
        code: resolveAuthCode(auth),
        message: auth.body?.message || 'Phiên đăng nhập không hợp lệ.'
      });
    }
    if (!roles.includes(auth.user.role)) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ROLE',
        message: 'Tài khoản của bạn không có quyền thực hiện thao tác này.'
      });
    }
    req.user = auth.user;
    return next();
  };
}

/**
 * Cho phép Khách đi tiếp; token sai hoặc hết hạn cũng được xem như Khách.
 */
async function attachOptionalUser(req, res, next) {
  if (req.headers.authorization) {
    const auth = await authService.authenticateRequest(req.headers.authorization);
    if (auth.ok) req.user = auth.user;
  }
  return next();
}

module.exports = {
  requireAdmin: requireRoles('ADMIN'),
  requireMember: requireRoles('STUDENT', 'ADMIN'),
  attachOptionalUser
};
