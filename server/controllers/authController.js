/**
 * ============================================================================
 * TẦNG CONTROLLER: TIẾP NHẬN HTTP REQUEST & ĐIỀU PHỐI PHÂN HỆ XÁC THỰC (FR-01)
 * ============================================================================
 */

const authService = require('../services/authService');
const { getClientIp, parseUserAgent } = require('../utils/security');
const { buildDeviceConfirmationHtmlPage } = require('../services/emailService');

function resolveUrls(req) {
  const backendUrl =
    process.env.BACKEND_URL || `${req.protocol}://${req.get('host') || 'localhost:5000'}`;
  const frontendUrl =
    process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
  return { backendUrl, frontendUrl };
}

async function handleRegister(req, res) {
  try {
    const { fullName, display_name, email, password, studentCode, cohort } = req.body || {};
    const { frontendUrl } = resolveUrls(req);

    const result = await authService.registerUser({
      fullName: fullName || display_name,
      email,
      password,
      studentCode,
      cohort,
      frontendUrl
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

async function handleVerify(req, res) {
  try {
    const token = req.query?.token || req.body?.token;
    const email = req.body?.email || req.query?.email;
    const otpCode = req.body?.otpCode || req.body?.otp || req.query?.otp;
    const ipAddress = getClientIp(req);
    const deviceInfo = parseUserAgent(req.headers['user-agent']);

    const result = await authService.verifyAccount({
      token,
      email,
      otpCode,
      ipAddress,
      deviceInfo
    });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleVerify]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi máy chủ khi xác thực tài khoản.'
    });
  }
}

async function handleResendActivation(req, res) {
  try {
    const { email } = req.body || {};
    const { frontendUrl } = resolveUrls(req);
    const result = await authService.resendActivation({ email, frontendUrl });
    return res.status(result.statusCode).json(result.body);
  } catch (err) {
    console.error('[AuthController.handleResendActivation]', err);
    return res.status(500).json({
      status: 'error',
      message: 'Không thể gửi lại mã kích hoạt lúc này.'
    });
  }
}

async function handleLogin(req, res) {
  try {
    const { email, password, rememberMe } = req.body || {};
    const ipAddress = req.body?.customDeviceIp || getClientIp(req);
    const deviceInfo =
      req.body?.customDeviceName || parseUserAgent(req.headers['user-agent']);
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
    const { access_token, accessToken, credential, fallbackProfile } = req.body || {};
    const ipAddress = getClientIp(req);
    const deviceInfo = parseUserAgent(req.headers['user-agent']);
    const { backendUrl, frontendUrl } = resolveUrls(req);

    const result = await authService.googleLogin({
      accessToken: access_token || accessToken,
      credential,
      fallbackProfile,
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

async function handleListUsers(req, res) {
  try {
    const result = await authService.listUsersForAdmin();
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
    const userId = req.params.id;
    const { role } = req.body || {};
    const result = await authService.updateUserRoleByAdmin({ userId, role });
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
    const userId = req.params.id;
    const { status } = req.body || {};
    const result = await authService.updateUserStatusByAdmin({ userId, status });
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
  handleVerify,
  handleResendActivation,
  handleLogin,
  handleGoogleLogin,
  handleForgotPassword,
  handleResetPassword,
  handleConfirmDevice,
  handleSecureAccount,
  handleGetMe,
  handleListUsers,
  handleUpdateUserRole,
  handleUpdateUserStatus
};
