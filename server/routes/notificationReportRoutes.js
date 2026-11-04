/**
 * ============================================================================
 * TẦNG ROUTES: ĐỊNH TUYẾN RESTFUL API CHO THÔNG BÁO (UC03) & BÁO CÁO (UC04)
 * ============================================================================
 */

const express = require('express');
const controller = require('../controllers/notificationReportController');
const { ApiError } = require('../services/notificationReportService');

const router = express.Router();

// UC03: Xem danh sách thông báo & đánh dấu đã đọc
router.get('/notifications', controller.handleGetNotifications);
router.patch('/notifications', controller.handleMarkNotificationsRead);

// UC04: Gửi báo cáo tài liệu vi phạm
router.post('/reports', controller.handleSubmitReport);

// Test helper: Giả lập phát thông báo kiểm duyệt (TC3)
router.post('/notifications/simulate-moderation', controller.handleSimulateModeration);

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
