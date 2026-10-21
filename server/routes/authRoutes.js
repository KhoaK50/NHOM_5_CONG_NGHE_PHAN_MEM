/**
 * ============================================================================
 * TẦNG ROUTES: ĐỊNH TUYẾN RESTFUL API PHÂN HỆ XÁC THỰC & BẢO MẬT (FR-01)
 * Hỗ trợ chuẩn `/api/auth/*` và tương thích ngược với `/api/*` của Vectoria
 * ============================================================================
 */

const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// 1. Đăng ký tài khoản mới (UC01)
router.post('/register', authController.handleRegister);

// 2. Xác thực & kích hoạt tài khoản qua Link Email (GET) hoặc Mã OTP 6 số (POST)
router.get('/verify', authController.handleVerify);
router.post('/verify', authController.handleVerify);
router.post('/verify-otp', authController.handleVerify);

// 3. Gửi lại mã kích hoạt OTP
router.post('/resend-activation', authController.handleResendActivation);

// 4. Đăng nhập & Nhận diện thiết bị (UC02)
router.post('/login', authController.handleLogin);

// 5. Đăng nhập Google OAuth 2.0 (GSI)
router.post('/google', authController.handleGoogleLogin);
router.post('/google-login', authController.handleGoogleLogin);

// 6. Quên mật khẩu & Đặt lại mật khẩu (tăng token_version + 1)
router.post('/forgot-password', authController.handleForgotPassword);
router.post('/reset-password', authController.handleResetPassword);

// 7. Xác nhận thiết bị tin cậy & Khóa phiên khẩn cấp từ Email cảnh báo
router.get('/confirm-device', authController.handleConfirmDevice);
router.get('/secure-account', authController.handleSecureAccount);

// 8. Kiểm tra phiên đăng nhập hiện tại & đối chiếu token_version
router.get('/me', authController.handleGetMe);

// 9. Quản trị người dùng: Danh sách, Thăng/Hạ quyền Admin, Khóa/Mở khóa (UC10)
router.get('/users', authController.handleListUsers);
router.patch('/users/:id/role', authController.handleUpdateUserRole);
router.patch('/users/:id/status', authController.handleUpdateUserStatus);

module.exports = router;
