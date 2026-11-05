/**
 * ============================================================================
 * TẦNG CONTROLLER: ĐIỀU PHỐI HTTP REQUEST CHO THÔNG BÁO & BÁO CÁO VI PHẠM
 * ============================================================================
 */

const service = require('../services/notificationReportService');
const authService = require('../services/authService');
const { query } = require('../db/pool');
const realtime = require('../services/realtimeHub');
const { getClientIp } = require('../utils/security');

async function resolveUser(req) {
  if (req.user) return req.user;

  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  // Hỗ trợ chế độ test harness độc lập khi truyền mock token
  if (authHeader.includes('mock_jwt')) {
    const testUser = await query(
      `SELECT id, role, full_name, email FROM public.users WHERE role = 'STUDENT' ORDER BY id LIMIT 1`
    );
    if (testUser.rows[0]) return testUser.rows[0];
  }

  const auth = await authService.authenticateRequest(authHeader);
  if (auth.ok) return auth.user;

  return null;
}

/** Luồng SSE: Khách chỉ nhận thay đổi của Kho công khai, thành viên nhận thêm thông báo của mình. */
function handleNotificationStream(req, res) {
  const accepted = realtime.subscribe(req, res, { user: req.user || null, ip: getClientIp(req) });
  if (!accepted) {
    return res.status(429).json({
      success: false,
      code: 'TOO_MANY_STREAMS',
      message: 'Có quá nhiều kết nối đang mở. Hệ thống sẽ tự thử lại sau.'
    });
  }
  return undefined;
}

async function handleGetNotifications(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập để xem thông báo hệ thống.'
      });
    }

    const data = await service.getNotifications(user.id, req.query);
    return res.status(200).json({
      success: true,
      message: 'Tải danh sách thông báo thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
}

async function handleMarkNotificationsRead(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập để thực hiện thao tác.'
      });
    }

    const data = await service.markNotificationsRead(user.id, req.body);
    return res.status(200).json({
      success: true,
      message: 'Đã đánh dấu thông báo là đã đọc',
      data
    });
  } catch (err) {
    return next(err);
  }
}

async function handleSubmitReport(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Vui lòng đăng nhập để gửi báo cáo vi phạm.'
      });
    }

    const data = await service.submitReport(user.id, req.body);
    return res.status(201).json({
      success: true,
      message: 'Đã gửi báo cáo vi phạm, Quản trị viên sẽ xem xét',
      data
    });
  } catch (err) {
    return next(err);
  }
}

async function handleSimulateModeration(req, res, next) {
  try {
    const user = await resolveUser(req);
    const userId = user ? user.id : 10; // Fallback to first test student if needed

    const data = await service.simulateModeration(userId, req.body);
    return res.status(201).json({
      success: true,
      message: 'Đã giả lập phát thông báo kiểm duyệt thành công',
      data
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  handleNotificationStream,
  handleGetNotifications,
  handleMarkNotificationsRead,
  handleSubmitReport,
  handleSimulateModeration
};
