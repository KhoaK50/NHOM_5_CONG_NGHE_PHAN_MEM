/**
 * ============================================================================
 * TẦNG CONTROLLER: TIẾP NHẬN HTTP REQUEST & ĐIỀU PHỐI PHÂN HỆ XÁC THỰC (FR-01)
 * ============================================================================
 */

const authService = require('../services/authService');
const { getClientIp, parseUserAgent } = require('../utils/security');
const { buildDeviceConfirmationHtmlPage } = require('../services/emailService');

function resolveUrls(req) {
  const host = req.get('host') || 'localhost:5000';
  const isProdHost = host.includes('onrender.com') || host.includes('vectoria.io.vn');
  const proto = isProdHost ? 'https' : req.protocol || 'http';
  const backendUrl = process.env.BACKEND_URL || `${proto}://${host}`;
  const frontendUrl =
    process.env.FRONTEND_URL ||
    req.headers.origin ||
    (isProdHost ? 'https://5share.vectoria.io.vn' : 'http://localhost:5173');
  return { backendUrl, frontendUrl };
}

async function handleRegister(req, res) {
  try {
    const { fullName, display_name, email, password, studentCode, cohort } = req.body || {};
    const ipAddress = getClientIp(req);
    const deviceInfo = parseUserAgent(req.headers['user-agent']);

    const result = await authService.registerUser({
      fullName: fullName || display_name,
      email,
      password,
      studentCode,
      cohort,
      ipAddress,
      deviceInfo
    });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleRegister]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi khởi tạo tài khoản. Vui lòng thử lại sau.'
    });
  }
}

async function handleLogin(req, res) {
  try {
    const { email, password, rememberMe } = req.body || {};
    const ipAddress = getClientIp(req);
    const deviceInfo = parseUserAgent(req.headers['user-agent']);
    const { backendUrl, frontendUrl } = resolveUrls(req);

    const result = await authService.loginUser({
      email,
      password,
      rememberMe: rememberMe !== false,
      ipAddress,
      deviceInfo,
      backendUrl,
      frontendUrl
    });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleLogin]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi kết nối cơ sở dữ liệu khi đăng nhập.'
    });
  }
}

async function handleGoogleLogin(req, res) {
  try {
    const { access_token, accessToken, credential } = req.body || {};
    const ipAddress = getClientIp(req);
    const deviceInfo = parseUserAgent(req.headers['user-agent']);
    const { backendUrl, frontendUrl } = resolveUrls(req);

    const result = await authService.googleLogin({
      accessToken: access_token || accessToken,
      credential,
      ipAddress,
      deviceInfo,
      backendUrl,
      frontendUrl
    });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleGoogleLogin]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi xác thực Google OAuth 2.0.'
    });
  }
}

async function handleForgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    const { frontendUrl } = resolveUrls(req);
    const result = await authService.requestPasswordReset({ email, frontendUrl });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleForgotPassword]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống khi tạo yêu cầu khôi phục mật khẩu.'
    });
  }
}

async function handleResetPassword(req, res) {
  try {
    const { token, resetCode, email, newPassword, new_password } = req.body || {};
    const result = await authService.resetPassword({
      token: token || resetCode,
      email,
      newPassword: newPassword || new_password
    });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleResetPassword]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Không thể đặt lại mật khẩu lúc này.'
    });
  }
}

async function handleConfirmDevice(req, res) {
  try {
    const token = req.query?.token;
    const { frontendUrl } = resolveUrls(req);
    const outcome = await authService.confirmTrustedDevice(token);
    const html = buildDeviceConfirmationHtmlPage({
      ...outcome,
      frontendUrl
    });
    return res.status(outcome.success ? 200 : 400).send(html);
  } catch (err) {
    console.error('[AuthController.handleConfirmDevice]', err);
    return res.status(500).send('Lỗi máy chủ khi xác nhận thiết bị.');
  }
}

async function handleSecureAccount(req, res) {
  try {
    const token = req.query?.token;
    const { frontendUrl } = resolveUrls(req);
    const { redirectUrl } = await authService.triggerEmergencyAccountLockdown(
      token,
      frontendUrl
    );
    return res.redirect(302, redirectUrl);
  } catch (err) {
    const { frontendUrl } = resolveUrls(req);
    const html = buildDeviceConfirmationHtmlPage({
      success: false,
      title: 'Liên kết khẩn cấp đã hết hạn',
      message:
        'Đường dẫn khóa phiên khẩn cấp không hợp lệ hoặc đã quá hạn. Vui lòng truy cập trang Đăng nhập và chọn Quên mật khẩu.',
      frontendUrl
    });
    return res.status(400).send(html);
  }
}

async function handleGetMe(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const result = await authService.verifySessionAndGetProfile(authHeader);
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleGetMe]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Không thể kiểm tra phiên đăng nhập.'
    });
  }
}

async function handleUpdateProfile(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const { fullName, display_name, cohort, studentCode, studentId, avatarUrl } = req.body || {};
    const result = await authService.updateUserProfile(authHeader, {
      fullName: fullName !== undefined ? fullName : display_name,
      cohort,
      studentCode: studentCode !== undefined ? studentCode : studentId,
      avatarUrl
    });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleUpdateProfile]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Không thể cập nhật hồ sơ cá nhân lúc này.'
    });
  }
}

async function handleUploadAvatar(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const result = await authService.uploadUserAvatar(authHeader, req.file);
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleUploadAvatar]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Không thể tải ảnh đại diện lên lúc này.'
    });
  }
}

async function handleChangePassword(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const { oldPassword, old_password, newPassword, new_password } = req.body || {};
    const result = await authService.changeUserPassword(authHeader, {
      oldPassword: oldPassword || old_password,
      newPassword: newPassword || new_password
    });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleChangePassword]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Không thể đổi mật khẩu lúc này.'
    });
  }
}

async function handleListUsers(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const result = await authService.listUsersForAdmin(authHeader);
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleListUsers]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Không thể tải danh sách người dùng.'
    });
  }
}

async function handleUpdateUserRole(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const userId = req.params.id;
    const { role } = req.body || {};
    const result = await authService.updateUserRoleByAdmin(authHeader, { userId, role });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleUpdateUserRole]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Không thể cập nhật quyền người dùng.'
    });
  }
}

async function handleUpdateUserStatus(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const userId = req.params.id;
    const { status } = req.body || {};
    const result = await authService.updateUserStatusByAdmin(authHeader, { userId, status });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleUpdateUserStatus]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Không thể cập nhật trạng thái tài khoản.'
    });
  }
}

module.exports = {
  handleRegister,
  handleLogin,
  handleGoogleLogin,
  handleForgotPassword,
  handleResetPassword,
  handleConfirmDevice,
  handleSecureAccount,
  handleGetMe,
  handleUpdateProfile,
  handleUploadAvatar,
  handleChangePassword,
  handleListUsers,
  handleUpdateUserRole,
  handleUpdateUserStatus
};
