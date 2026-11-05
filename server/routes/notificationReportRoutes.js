/**
 * ============================================================================
 * TẦNG ROUTES: ĐỊNH TUYẾN RESTFUL API CHO THÔNG BÁO (UC03) & BÁO CÁO (UC04)
 * ============================================================================
 */

const express = require('express');
const rateLimit = require('express-rate-limit').default;
const controller = require('../controllers/notificationReportController');
const { ApiError } = require('../services/notificationReportService');
const { attachOptionalUser } = require('../middleware/rbac');

const router = express.Router();

const streamLimit = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });

// UC03: Nhận thông báo ngay, không cần tải lại trang
router.get('/notifications/stream', streamLimit, attachOptionalUser, controller.handleNotificationStream);

// UC03: Xem danh sách thông báo & đánh dấu đã đọc
router.get('/notifications', controller.handleGetNotifications);
router.patch('/notifications', controller.handleMarkNotificationsRead);

// UC04: Gửi báo cáo tài liệu vi phạm
router.post('/reports', controller.handleSubmitReport);

// Xử lý lỗi chuẩn hóa
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...err.extra
    });
  }
  console.error('[NotificationReport API]', err);
  return res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Lỗi hệ thống, thao tác chưa được thực hiện. Vui lòng thử lại sau.'
  });
});

module.exports = router;
