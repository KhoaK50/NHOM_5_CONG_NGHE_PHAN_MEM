/**
 * ============================================================================
 * TẦNG ROUTES: ĐỊNH TUYẾN RESTFUL API PHÂN HỆ XÁC THỰC & HỒ SƠ (UC01, UC02)
 * Hỗ trợ chuẩn `/api/auth/*` và `/api/*`
 * ============================================================================
 */

const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit').default;
const authController = require('../controllers/authController');
const { MAX_AVATAR_BYTES } = require('../services/cloudinaryService');
const { getClientIp } = require('../utils/security');

const router = express.Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 }
});

function acceptSingleAvatar(req, res, next) {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        status: 'error',
        message: 'Kích thước ảnh vượt quá giới hạn 5 MB. Vui lòng chọn ảnh nhẹ hơn.'
      });
    }
    return res.status(400).json({
      status: 'error',
      message: 'Vui lòng chọn đúng 1 tệp ảnh hợp lệ (.JPG, .PNG hoặc .WEBP).'
    });
  });
}

const emailOf = (req) => String(req.body?.email || '').trim().toLowerCase();

function buildAuthLimiter({ limit, minutes, key, onlyFailed = false }) {
  return rateLimit({
    windowMs: minutes * 60 * 1000,
    limit,
    keyGenerator: key,
    skipSuccessfulRequests: onlyFailed,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: false,
    handler: (req, res) =>
      res.status(429).json({
        status: 'error',
        code: 'RATE_LIMITED',
        message: 'Bạn thử quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.'
      })
  });
}

// Tính theo cặp email + IP để kẻ khác không khóa được tài khoản của người dùng từ nơi khác
const loginPerAccount = buildAuthLimiter({ limit: 10, minutes: 15, onlyFailed: true, key: (req) => `${emailOf(req)}|${getClientIp(req)}` });
const loginPerIp = buildAuthLimiter({ limit: 100, minutes: 15, onlyFailed: true, key: (req) => getClientIp(req) });
const registerLimit = buildAuthLimiter({ limit: 30, minutes: 60, key: (req) => getClientIp(req) });
const passwordResetLimit = buildAuthLimiter({ limit: 5, minutes: 15, key: (req) => `${emailOf(req)}|${getClientIp(req)}` });

// 1. Đăng ký tài khoản mới (UC02) — kích hoạt 'active' và cấp JWT ngay
router.post('/register', registerLimit, authController.handleRegister);

// 2. Đăng nhập & Nhận diện thiết bị (UC01)
router.post('/login', loginPerIp, loginPerAccount, authController.handleLogin);

// 3. Đăng nhập Google OAuth 2.0 (GSI)
router.post('/google', authController.handleGoogleLogin);
router.post('/google-login', authController.handleGoogleLogin);

// 4. Quên mật khẩu & Đặt lại mật khẩu (tăng token_version + 1)
router.post('/forgot-password', passwordResetLimit, authController.handleForgotPassword);
router.post('/reset-password', passwordResetLimit, authController.handleResetPassword);

// 5. Xác nhận thiết bị tin cậy & Khóa phiên khẩn cấp từ Email cảnh báo
router.get('/confirm-device', authController.handleConfirmDevice);
router.get('/secure-account', authController.handleSecureAccount);

// 6. Kiểm tra phiên đăng nhập hiện tại & cập nhật hồ sơ cá nhân (UC01)
router.get('/me', authController.handleGetMe);
router.put('/profile', authController.handleUpdateProfile);
router.patch('/profile', authController.handleUpdateProfile);
router.post('/avatar', acceptSingleAvatar, authController.handleUploadAvatar);
router.post('/profile/avatar', acceptSingleAvatar, authController.handleUploadAvatar);
router.post('/change-password', authController.handleChangePassword);

// 7. Quản trị người dùng: Danh sách, Thăng/Hạ quyền Admin, Khóa/Mở khóa (UC01)
router.get('/users', authController.handleListUsers);
router.patch('/users/:id/role', authController.handleUpdateUserRole);
router.patch('/users/:id/status', authController.handleUpdateUserStatus);

module.exports = router;
