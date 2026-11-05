/**
 * ============================================================================
 * RBAC MIDDLEWARE: XÁC THỰC BEARER JWT & PHÂN QUYỀN CHO CỤM UC08–UC10
 * Quyền lấy từ USERS trong CSDL, không tin role do client gửi.
 * Hỗ trợ nhận diện Bearer JWT từ Authorization Header và Query Param (?token=)
 * ============================================================================
 */

const authService = require('../services/authService');

function extractAuthHeader(req) {
  if (req.headers && req.headers.authorization) {
    return req.headers.authorization;
  }
  const queryToken = req.query?.token || req.query?.accessToken;
  if (queryToken && typeof queryToken === 'string') {
    return `Bearer ${queryToken.trim()}`;
  }
  return null;
}

function resolveAuthCode(auth) {
  if (auth.statusCode === 403) return 'ACCOUNT_INACTIVE';
  return auth.body?.status === 'session_revoked' ? 'SESSION_REVOKED' : 'UNAUTHORIZED';
}

function requireRoles(...roles) {
  return async (req, res, next) => {
    const authHeader = extractAuthHeader(req);
    const auth = await authService.authenticateRequest(authHeader);
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
  const authHeader = extractAuthHeader(req);
  if (authHeader) {
    const auth = await authService.authenticateRequest(authHeader);
    if (auth.ok) req.user = auth.user;
  }
  return next();
}

module.exports = {
  requireAdmin: requireRoles('ADMIN'),
  requireMember: requireRoles('STUDENT', 'ADMIN'),
  attachOptionalUser
};
