/**
 * ============================================================================
 * TẦNG BUSINESS LOGIC (SERVICE): XÁC THỰC, PHÂN QUYỀN JWT & AN NINH THIẾT BỊ
 * Đồng bộ 100% quy trình bảo mật của Vectoria (user.py)
 * ============================================================================
 */

const authRepo = require('../repositories/authRepository');
const {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt,
  generateActivationBundle,
  generatePasswordResetToken
} = require('../utils/security');
const {
  buildActivationEmail,
  buildPasswordResetEmail,
  buildSecurityAlertEmail,
  buildWelcomeEmail,
  sendEnterpriseEmail
} = require('./emailService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function computeInitials(fullName) {
  const parts = String(fullName || 'SV')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'SV';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatUserProfile(userRow, extra = {}) {
  const canonicalRole = userRow.role === 'ADMIN' ? 'ADMIN' : 'USER';
  return {
    id: userRow.id,
    email: userRow.email,
    fullName: userRow.full_name,
    display_name: userRow.full_name,
    role: canonicalRole,
    dbRole: userRow.role,
    isRootAdmin: authRepo.isRootAdminEmail(userRow.email),
    authProvider: userRow.auth_provider || 'local',
    cohort: userRow.cohort || 'K50',
    studentId: userRow.student_code || '',
    studentCode: userRow.student_code || null,
    status: userRow.status || 'active',
    isActive: userRow.status === 'active',
    avatar_url: userRow.avatar_url || null,
    avatarUrl: userRow.avatar_url || null,
    avatarInitials: computeInitials(userRow.full_name),
    token_version: userRow.token_version || 1,
    points: userRow.role === 'ADMIN' ? 500 : 140,
    ...extra
  };
}

function validatePasswordRules(password) {
  const val = String(password || '');
  if (val.length < 8) {
    return 'Mật khẩu phải có tối thiểu 8 ký tự.';
  }
  if (!/[A-Za-z]/.test(val)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ cái (a-z, A-Z).';
  }
  if (!/[0-9]/.test(val)) {
    return 'Mật khẩu phải chứa ít nhất 1 chữ số (0-9).';
  }
  return null;
}

/**
 * Xử lý nhận diện thiết bị khi đăng nhập & gửi Email cảnh báo nếu phát hiện thiết bị lạ
 * Đồng bộ với hàm process_device_login() trong Vectoria user.py
 */
async function processDeviceLogin({
  user,
  ipAddress,
  deviceInfo,
  backendUrl,
  frontendUrl
}) {
  const { isTrusted, isNewDeviceAlert } = await authRepo.recordDeviceLogin({
    userId: user.id,
    ipAddress,
    deviceInfo
  });

  if (isNewDeviceAlert) {
    // 1. Tạo token xác nhận thiết bị tin cậy (hiệu lực 24h)
    const confirmToken = signJwt(
      {
        user_id: user.id,
        device_info: deviceInfo,
        action: 'confirm_device'
      },
      24 * 3600
    );

    // 2. Tạo token khóa khẩn cấp & thu hồi phiên (hiệu lực 24h)
    const emergencyToken = signJwt(
      {
        user_id: user.id,
        email: user.email,
        action: 'emergency_reset'
      },
      24 * 3600
    );

    const confirmUrl = `${backendUrl}/api/auth/confirm-device?token=${encodeURIComponent(confirmToken)}`;
    const emergencyUrl = `${backendUrl}/api/auth/secure-account?token=${encodeURIComponent(emergencyToken)}`;

    const nowVn = new Date(Date.now() + 7 * 3600 * 1000);
    const timeStr = nowVn.toISOString().replace('T', ' ').slice(0, 19);

    const emailPayload = buildSecurityAlertEmail({
      fullName: user.full_name,
      timeStr,
      ipAddress,
      deviceInfo,
      confirmUrl,
      emergencyUrl
    });

    await sendEnterpriseEmail({
      toEmail: user.email,
      subject: emailPayload.subject,
      html: emailPayload.html
    });

    return {
      isTrusted: false,
      isNewDeviceAlert: true,
      deviceInfo,
      ipAddress,
      confirmUrl,
      emergencyUrl
    };
  }

  return {
    isTrusted,
    isNewDeviceAlert: false,
    deviceInfo,
    ipAddress
  };
}

/**
 * 1. Đăng ký tài khoản mới (UC01)
 */
async function registerUser({
  fullName,
  email,
  password,
  studentCode,
  cohort = 'K50',
  frontendUrl = 'http://localhost:5173'
}) {
  const cleanedName = String(fullName || '').trim();
  const cleanedEmail = String(email || '').trim().toLowerCase();

  if (!cleanedName || cleanedName.length < 2) {
    return { statusCode: 400, body: { status: 'error', message: 'Vui lòng nhập họ và tên hợp lệ.' } };
  }
  if (!EMAIL_REGEX.test(cleanedEmail)) {
    return { statusCode: 400, body: { status: 'error', message: 'Định dạng địa chỉ email không hợp lệ.' } };
  }

  const pwdError = validatePasswordRules(password);
  if (pwdError) {
    return { statusCode: 400, body: { status: 'error', message: pwdError } };
  }

  const existingUser = await authRepo.findUserByEmail(cleanedEmail);
  if (existingUser && existingUser.status !== 'pending') {
    return {
      statusCode: 409,
      body: {
        status: 'error',
        message: 'Địa chỉ email này đã được đăng ký trên hệ thống. Vui lòng chuyển sang Đăng nhập.'
      }
    };
  }

  if (studentCode) {
    const existingCode = await authRepo.findUserByStudentCode(studentCode);
    if (
      existingCode &&
      (!existingUser || existingCode.id !== existingUser.id)
    ) {
      return {
        statusCode: 409,
        body: {
          status: 'error',
          message: 'Mã số sinh viên này đã được liên kết với một tài khoản khác.'
        }
      };
    }
  }

  const passwordHash = hashPassword(password);
  const newUser = await authRepo.createOrUpdatePendingUser({
    studentCode,
    fullName: cleanedName,
    email: cleanedEmail,
    passwordHash,
    cohort: cohort || 'K50',
    status: 'pending'
  });

  const { otpCode, activationToken } = generateActivationBundle();
  await authRepo.upsertAccountActivation(newUser.id, activationToken);

  const verificationUrl = `${frontendUrl}/?verify_token=${encodeURIComponent(activationToken)}`;
  const emailContent = buildActivationEmail({
    fullName: cleanedName,
    otpCode,
    verificationUrl
  });

  const mailResult = await sendEnterpriseEmail({
    toEmail: cleanedEmail,
    subject: emailContent.subject,
    html: emailContent.html
  });

  return {
    statusCode: 201,
    body: {
      status: 'success',
      message: mailResult.delivered
        ? 'Đăng ký thành công! Vui lòng kiểm tra hộp thư điện tử để lấy mã OTP hoặc nhấn liên kết kích hoạt.'
        : `Đăng ký thành công! Đã tạo mã xác thực OTP cho ${cleanedEmail}.`,
      email: cleanedEmail,
      user_id: newUser.id,
      email_delivery: mailResult.mode,
      dev_otp: mailResult.delivered ? undefined : otpCode,
      dev_verification_url: mailResult.delivered ? undefined : verificationUrl
    }
  };
}

/**
 * 2. Kích hoạt tài khoản qua Token URL hoặc Mã OTP 6 số (UC01)
 */
async function verifyAccount({ token, email, otpCode, ipAddress, deviceInfo }) {
  const record = await authRepo.findActivationRecord({ token, email, otpCode });
  if (!record) {
    return {
      statusCode: 400,
      body: {
        status: 'error',
        message: 'Mã xác thực OTP hoặc đường dẫn kích hoạt không chính xác.'
      }
    };
  }

  if (record.is_used && record.status === 'active') {
    const jwtToken = signJwt({
      sub: record.user_id,
      email: record.email,
      name: record.full_name,
      role: record.role,
      token_version: record.token_version || 1
    });
    return {
      statusCode: 200,
      body: {
        status: 'success',
        message: 'Tài khoản này đã được kích hoạt trước đó. Bạn có thể đăng nhập ngay.',
        token: jwtToken,
        user: formatUserProfile({
          id: record.user_id,
          email: record.email,
          full_name: record.full_name,
          role: record.role,
          cohort: record.cohort,
          student_code: record.student_code,
          status: 'active',
          avatar_url: record.avatar_url,
          token_version: record.token_version
        })
      }
    };
  }

  if (record.is_expired) {
    return {
      statusCode: 400,
      body: {
        status: 'error',
        message: 'Mã kích hoạt đã hết hạn (quá 24 giờ). Vui lòng yêu cầu gửi lại mã mới.'
      }
    };
  }

  const activatedUser = await authRepo.markAccountActivated(record.user_id);

  if (ipAddress && deviceInfo) {
    await authRepo.recordDeviceLogin({
      userId: activatedUser.id,
      ipAddress,
      deviceInfo
    });
  }

  const jwtToken = signJwt({
    sub: activatedUser.id,
    email: activatedUser.email,
    name: activatedUser.full_name,
    role: activatedUser.role,
    token_version: activatedUser.token_version || 1
  });

  return {
    statusCode: 200,
    body: {
      status: 'success',
      message: 'Xác thực email thành công! Tài khoản học thuật 5Share của bạn đã được kích hoạt.',
      token: jwtToken,
      display_name: activatedUser.full_name,
      email: activatedUser.email,
      avatar_url: activatedUser.avatar_url,
      user: formatUserProfile(activatedUser)
    }
  };
}

/**
 * 3. Gửi lại mã OTP kích hoạt tài khoản
 */
async function resendActivation({ email, frontendUrl = 'http://localhost:5173' }) {
  const cleanedEmail = String(email || '').trim().toLowerCase();
  const user = await authRepo.findUserByEmail(cleanedEmail);
  if (!user) {
    return {
      statusCode: 404,
      body: { status: 'error', message: 'Không tìm thấy tài khoản với địa chỉ email này.' }
    };
  }
  if (user.status === 'active') {
    return {
      statusCode: 400,
      body: { status: 'error', message: 'Tài khoản này đã được kích hoạt rồi.' }
    };
  }

  const { otpCode, activationToken } = generateActivationBundle();
  await authRepo.upsertAccountActivation(user.id, activationToken);

  const verificationUrl = `${frontendUrl}/?verify_token=${encodeURIComponent(activationToken)}`;
  const emailContent = buildActivationEmail({
    fullName: user.full_name,
    otpCode,
    verificationUrl
  });

  const mailResult = await sendEnterpriseEmail({
    toEmail: cleanedEmail,
    subject: emailContent.subject,
    html: emailContent.html
  });

  return {
    statusCode: 200,
    body: {
      status: 'success',
      message: 'Đã cấp phát lại mã xác thực OTP mới (hiệu lực 24 giờ).',
      dev_otp: mailResult.delivered ? undefined : otpCode,
      dev_verification_url: mailResult.delivered ? undefined : verificationUrl
    }
  };
}

/**
 * 4. Đăng nhập tài khoản (UC02) kèm nhận diện thiết bị lạ (login_history)
 */
async function loginUser({
  email,
  password,
  rememberMe = true,
  ipAddress = '127.0.0.1',
  deviceInfo = 'Windows 10/11 (Chrome)',
  backendUrl = 'http://localhost:5000',
  frontendUrl = 'http://localhost:5173'
}) {
  const cleanedEmail = String(email || '').trim().toLowerCase();
  if (!cleanedEmail || !password) {
    return {
      statusCode: 400,
      body: { status: 'error', message: 'Vui lòng nhập đầy đủ địa chỉ email và mật khẩu.' }
    };
  }

  const user = await authRepo.findUserByEmail(cleanedEmail);
  if (!user) {
    return {
      statusCode: 401,
      body: { status: 'error', message: 'Địa chỉ email hoặc mật khẩu không chính xác.' }
    };
  }

  if (user.auth_provider === 'google' && String(user.password_hash).startsWith('google_oauth2_unusable')) {
    return {
      statusCode: 400,
      body: {
        status: 'error',
        message: 'Tài khoản này được khởi tạo bằng Google. Vui lòng nhấn nút "Tiếp tục với Google" bên dưới.'
      }
    };
  }

  const isPasswordValid = verifyPassword(password, user.password_hash);
  if (!isPasswordValid) {
    return {
      statusCode: 401,
      body: { status: 'error', message: 'Địa chỉ email hoặc mật khẩu không chính xác.' }
    };
  }

  if (user.status === 'locked' || user.status === 'banned') {
    return {
      statusCode: 403,
      body: {
        status: 'error',
        message: 'Tài khoản đã bị tạm khóa do vi phạm chuẩn mực học thuật. Vui lòng liên hệ Ban Quản trị Khoa CNTT.'
      }
    };
  }

  if (user.status === 'pending') {
    const { otpCode, activationToken } = generateActivationBundle();
    await authRepo.upsertAccountActivation(user.id, activationToken);
    const verificationUrl = `${frontendUrl}/?verify_token=${encodeURIComponent(activationToken)}`;
    const emailContent = buildActivationEmail({
      fullName: user.full_name,
      otpCode,
      verificationUrl
    });
    const mailResult = await sendEnterpriseEmail({
      toEmail: user.email,
      subject: emailContent.subject,
      html: emailContent.html
    });

    return {
      statusCode: 403,
      body: {
        status: 'pending_verification',
        message: 'Tài khoản của bạn chưa được kích hoạt. Hệ thống vừa gửi mã OTP xác thực mới tới email của bạn.',
        email: user.email,
        dev_otp: mailResult.delivered ? undefined : otpCode
      }
    };
  }

  // Ghi nhận lịch sử thiết bị vào bảng public.login_history & kiểm tra thiết bị lạ
  const deviceSecurity = await processDeviceLogin({
    user,
    ipAddress,
    deviceInfo,
    backendUrl,
    frontendUrl
  });

  const expiresInSeconds = rememberMe ? 30 * 24 * 3600 : 24 * 3600;
  const jwtToken = signJwt(
    {
      sub: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      token_version: user.token_version || 1
    },
    expiresInSeconds
  );

  return {
    statusCode: 200,
    body: {
      status: 'success',
      message: `Chào mừng trở lại, ${user.full_name}!`,
      token: jwtToken,
      display_name: user.full_name,
      email: user.email,
      avatar_url: user.avatar_url,
      user: formatUserProfile(user),
      device_security: deviceSecurity
    }
  };
}

/**
 * 5. Đăng nhập qua Google OAuth 2.0 (GSI Access Token / ID Token)
 * Đồng bộ với /api/google-login trong Vectoria user.py
 */
async function googleLogin({
  accessToken,
  credential,
  ipAddress = '127.0.0.1',
  deviceInfo = 'Windows 10/11 (Chrome)',
  backendUrl = 'http://localhost:5000',
  frontendUrl = 'http://localhost:5173'
}) {
  let googleEmail = null;
  let googleName = null;
  let googleSub = null;
  let googlePicture = null;

  if (accessToken) {
    const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!resp.ok) {
      return {
        statusCode: 401,
        body: { status: 'error', message: 'Token xác thực Google không hợp lệ hoặc đã hết hạn.' }
      };
    }
    const info = await resp.json();
    googleEmail = info.email;
    googleName = info.name;
    googleSub = info.sub;
    googlePicture = info.picture;
  } else if (credential) {
    const resp = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!resp.ok) {
      return {
        statusCode: 401,
        body: { status: 'error', message: 'ID Token Google không hợp lệ.' }
      };
    }
    const info = await resp.json();
    googleEmail = info.email;
    googleName = info.name;
    googleSub = info.sub;
    googlePicture = info.picture;
  } else {
    return {
      statusCode: 400,
      body: { status: 'error', message: 'Thiếu thông tin xác thực hợp lệ từ Google OAuth 2.0.' }
    };
  }

  const { user, isNewUser } = await authRepo.linkOrCreateGoogleUser({
    email: googleEmail,
    fullName: googleName,
    googleId: googleSub,
    avatarUrl: googlePicture
  });

  if (user.status === 'locked' || user.status === 'banned') {
    return {
      statusCode: 403,
      body: {
        status: 'error',
        message: 'Tài khoản liên kết với địa chỉ email này đang bị tạm khóa.'
      }
    };
  }

  // Nếu là tài khoản Google đăng nhập lần đầu tiên -> gửi thư Chào mừng chính thức qua Resend!
  if (isNewUser) {
    const welcomeMail = buildWelcomeEmail({
      fullName: user.full_name,
      email: user.email,
      deviceInfo
    });
    await sendEnterpriseEmail({
      toEmail: user.email,
      subject: welcomeMail.subject,
      html: welcomeMail.html
    });
  }

  const deviceSecurity = await processDeviceLogin({
    user,
    ipAddress,
    deviceInfo,
    backendUrl,
    frontendUrl
  });

  const jwtToken = signJwt(
    {
      sub: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      token_version: user.token_version || 1
    },
    30 * 24 * 3600
  );

  return {
    statusCode: 200,
    body: {
      status: 'success',
      message: `Đăng nhập Google thành công! Chào mừng ${user.full_name}.`,
      token: jwtToken,
      display_name: user.full_name,
      email: user.email,
      avatar_url: user.avatar_url,
      user: formatUserProfile(user),
      device_security: deviceSecurity
    }
  };
}

/**
 * 6. Yêu cầu khôi phục mật khẩu (Forgot Password) -> Ghi vào bảng public.password_reset
 */
async function requestPasswordReset({ email, frontendUrl = 'http://localhost:5173' }) {
  const cleanedEmail = String(email || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanedEmail)) {
    return {
      statusCode: 400,
      body: { status: 'error', message: 'Vui lòng nhập địa chỉ email hợp lệ.' }
    };
  }

  const user = await authRepo.findUserByEmail(cleanedEmail);
  if (!user) {
    return {
      statusCode: 404,
      body: {
        status: 'error',
        message: 'Không tìm thấy tài khoản nào được đăng ký với địa chỉ email này.'
      }
    };
  }

  const { otpCode, resetToken } = generatePasswordResetToken();
  await authRepo.createPasswordResetToken(user.id, resetToken);

  const resetUrl = `${frontendUrl}/?reset_token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(cleanedEmail)}`;
  const emailContent = buildPasswordResetEmail({
    fullName: user.full_name,
    otpCode,
    resetUrl
  });

  const mailResult = await sendEnterpriseEmail({
    toEmail: cleanedEmail,
    subject: emailContent.subject,
    html: emailContent.html
  });

  return {
    statusCode: 200,
    body: {
      status: 'success',
      message: mailResult.delivered
        ? 'Đã gửi hướng dẫn và mã khôi phục mật khẩu tới hộp thư của bạn (hiệu lực 15 phút).'
        : `Đã khởi tạo yêu cầu đặt lại mật khẩu cho ${cleanedEmail} (hiệu lực 15 phút).`,
      email: cleanedEmail,
      dev_reset_code: mailResult.delivered ? undefined : otpCode,
      dev_reset_token: mailResult.delivered ? undefined : resetToken,
      dev_reset_url: mailResult.delivered ? undefined : resetUrl
    }
  };
}

/**
 * 7. Đặt lại mật khẩu mới (Reset Password) -> Tăng token_version + 1 để thu hồi mọi JWT cũ
 */
async function resetPassword({ token, email, newPassword }) {
  if (!token) {
    return {
      statusCode: 400,
      body: { status: 'error', message: 'Vui lòng nhập mã khôi phục hoặc sử dụng đường dẫn từ email.' }
    };
  }

  const pwdError = validatePasswordRules(newPassword);
  if (pwdError) {
    return { statusCode: 400, body: { status: 'error', message: pwdError } };
  }

  const record = await authRepo.findPasswordResetRecord({ token, email });
  if (!record) {
    return {
      statusCode: 400,
      body: { status: 'error', message: 'Mã khôi phục mật khẩu không chính xác.' }
    };
  }

  if (record.is_used) {
    return {
      statusCode: 400,
      body: { status: 'error', message: 'Mã khôi phục này đã được sử dụng trước đó.' }
    };
  }

  if (record.is_expired) {
    return {
      statusCode: 400,
      body: { status: 'error', message: 'Mã khôi phục đã hết hạn (quá 15 phút). Vui lòng gửi lại yêu cầu mới.' }
    };
  }

  const newHash = hashPassword(newPassword);
  const updatedUser = await authRepo.updatePasswordAndRevokeSessions(
    record.user_id,
    newHash,
    record.token
  );

  return {
    statusCode: 200,
    body: {
      status: 'success',
      message:
        'Đặt lại mật khẩu thành công! Toàn bộ các phiên đăng nhập cũ trên thiết bị khác đã được thu hồi.',
      email: updatedUser.email,
      token_version: updatedUser.token_version
    }
  };
}

/**
 * 8. Xác nhận thiết bị tin cậy từ liên kết trong Email cảnh báo (GET /api/auth/confirm-device)
 */
async function confirmTrustedDevice(token) {
  try {
    const payload = verifyJwt(token);
    if (payload.action !== 'confirm_device' || !payload.user_id || !payload.device_info) {
      return {
        success: false,
        title: 'Liên kết xác nhận không hợp lệ',
        message: 'Yêu cầu xác nhận thiết bị không đúng định dạng hoặc đã bị thay đổi.'
      };
    }

    await authRepo.markDeviceTrusted(payload.user_id, payload.device_info);
    return {
      success: true,
      title: 'Đã xác nhận thiết bị tin cậy',
      message:
        'Thiết bị này đã được ghi nhận vào danh sách an toàn của bạn. Hệ thống sẽ không gửi cảnh báo cho các lần đăng nhập tiếp theo từ thiết bị này.',
      deviceInfo: payload.device_info
    };
  } catch (err) {
    return {
      success: false,
      title: 'Liên kết đã hết hạn',
      message: 'Đường dẫn xác nhận thiết bị đã quá hạn 24 giờ hoặc không hợp lệ.'
    };
  }
}

/**
 * 9. Khóa phiên khẩn cấp từ Email cảnh báo (GET /api/auth/secure-account)
 * Tăng token_version lên +1 để đá văng mọi phiên đăng nhập trái phép và cấp token đổi mật khẩu ngay
 */
async function triggerEmergencyAccountLockdown(token, frontendUrl = 'http://localhost:5173') {
  const payload = verifyJwt(token);
  if (payload.action !== 'emergency_reset' || !payload.user_id) {
    throw new Error('Token khẩn cấp không hợp lệ');
  }

  // 1. Tăng token_version + 1 để vô hiệu hóa toàn bộ JWT đang mở của kẻ xâm nhập
  const user = await authRepo.incrementUserTokenVersion(payload.user_id);
  if (!user) {
    throw new Error('Không tìm thấy tài khoản');
  }

  // 2. Tạo ngay một token đặt lại mật khẩu khẩn cấp
  const { resetToken } = generatePasswordResetToken();
  await authRepo.createPasswordResetToken(user.id, resetToken);

  return {
    redirectUrl: `${frontendUrl}/?reset_token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(user.email)}&emergency=1`
  };
}

/**
 * Hàm phụ trợ: Xác thực Bearer JWT & đối chiếu token_version với CSDL
 */
async function authenticateRequest(authHeader) {
  if (!authHeader || !String(authHeader).startsWith('Bearer ')) {
    return {
      ok: false,
      statusCode: 401,
      body: { status: 'error', message: 'Thiếu token xác thực phiên đăng nhập.' }
    };
  }

  const rawToken = String(authHeader).slice(7).trim();
  let payload;
  try {
    payload = verifyJwt(rawToken);
  } catch (err) {
    return {
      ok: false,
      statusCode: 401,
      body: { status: 'error', message: err.message || 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' }
    };
  }

  const user = await authRepo.findUserById(payload.sub);
  if (!user) {
    return {
      ok: false,
      statusCode: 401,
      body: { status: 'error', message: 'Tài khoản không tồn tại trên hệ thống.' }
    };
  }

  if (user.status !== 'active') {
    return {
      ok: false,
      statusCode: 403,
      body: { status: 'error', message: 'Tài khoản hiện đang bị khóa hoặc chưa kích hoạt.' }
    };
  }

  if (
    payload.token_version !== undefined &&
    Number(payload.token_version) !== Number(user.token_version || 1)
  ) {
    return {
      ok: false,
      statusCode: 401,
      body: {
        status: 'session_revoked',
        message: 'Phiên đăng nhập đã bị thu hồi do thay đổi mật khẩu hoặc kích hoạt bảo mật khẩn cấp.'
      }
    };
  }

  return { ok: true, user, payload };
}

/**
 * Hàm phụ trợ: Kiểm tra quyền Quản trị viên (ADMIN) từ Bearer JWT
 */
async function requireAdminRequest(authHeader) {
  const auth = await authenticateRequest(authHeader);
  if (!auth.ok) return auth;

  if (auth.user.role !== 'ADMIN') {
    return {
      ok: false,
      statusCode: 403,
      body: {
        status: 'error',
        message: 'Truy cập bị từ chối: Yêu cầu quyền Quản trị viên hệ thống (ADMIN).'
      }
    };
  }

  return auth;
}

/**
 * 10. Kiểm tra phiên đăng nhập hiện tại (GET /api/auth/me) — đối chiếu token_version
 */
async function verifySessionAndGetProfile(authHeader) {
  const auth = await authenticateRequest(authHeader);
  if (!auth.ok) {
    return { statusCode: auth.statusCode, body: auth.body };
  }

  const loginHistory = await authRepo.getRecentLoginHistory(auth.user.id, 5);

  return {
    statusCode: 200,
    body: {
      status: 'success',
      user: formatUserProfile(auth.user, { loginHistory })
    }
  };
}

/**
 * 11. Cập nhật thông tin hồ sơ cá nhân (PUT /api/auth/profile - UC03)
 */
async function updateUserProfile(authHeader, { fullName, cohort, studentCode, avatarUrl }) {
  const auth = await authenticateRequest(authHeader);
  if (!auth.ok) {
    return { statusCode: auth.statusCode, body: auth.body };
  }

  const cleanedName = fullName !== undefined ? String(fullName || '').trim() : auth.user.full_name;
  if (!cleanedName || cleanedName.length < 2) {
    return {
      statusCode: 400,
      body: { status: 'error', message: 'Họ và tên phải có tối thiểu 2 ký tự.' }
    };
  }

  const cleanedStudentCode =
    studentCode !== undefined
      ? String(studentCode || '').trim() || null
      : auth.user.student_code;

  if (cleanedStudentCode && cleanedStudentCode !== auth.user.student_code) {
    const existingCode = await authRepo.findUserByStudentCode(cleanedStudentCode);
    if (existingCode && Number(existingCode.id) !== Number(auth.user.id)) {
      return {
        statusCode: 409,
        body: {
          status: 'error',
          message: 'Mã số sinh viên này đã được liên kết với một tài khoản khác.'
        }
      };
    }
  }

  const updated = await authRepo.updateUserProfileInfo(auth.user.id, {
    fullName: cleanedName,
    cohort: cohort || auth.user.cohort || 'K50',
    studentCode: cleanedStudentCode,
    avatarUrl: avatarUrl !== undefined ? avatarUrl : auth.user.avatar_url
  });

  const loginHistory = await authRepo.getRecentLoginHistory(updated.id, 5);

  return {
    statusCode: 200,
    body: {
      status: 'success',
      message: 'Đã cập nhật thông tin hồ sơ cá nhân thành công.',
      user: formatUserProfile(updated, { loginHistory })
    }
  };
}

/**
 * 12. Đổi mật khẩu khi đang đăng nhập (POST /api/auth/change-password - UC03)
 * Tăng token_version + 1 để thu hồi các phiên trên thiết bị khác và cấp JWT mới cho phiên hiện tại
 */
async function changeUserPassword(authHeader, { oldPassword, newPassword }) {
  const auth = await authenticateRequest(authHeader);
  if (!auth.ok) {
    return { statusCode: auth.statusCode, body: auth.body };
  }

  const isGoogleOnlyPassword = String(auth.user.password_hash || '').startsWith(
    'google_oauth2_unusable'
  );

  if (!isGoogleOnlyPassword) {
    if (!oldPassword) {
      return {
        statusCode: 400,
        body: { status: 'error', message: 'Vui lòng nhập mật khẩu hiện tại.' }
      };
    }
    const isOldValid = verifyPassword(oldPassword, auth.user.password_hash);
    if (!isOldValid) {
      return {
        statusCode: 400,
        body: { status: 'error', message: 'Mật khẩu hiện tại không chính xác.' }
      };
    }
  }

  const pwdError = validatePasswordRules(newPassword);
  if (pwdError) {
    return { statusCode: 400, body: { status: 'error', message: pwdError } };
  }

  const newHash = hashPassword(newPassword);
  const updatedUser = await authRepo.updatePasswordAndRevokeSessions(
    auth.user.id,
    newHash,
    null
  );

  const freshToken = signJwt(
    {
      sub: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.full_name,
      role: updatedUser.role,
      token_version: updatedUser.token_version || 1
    },
    30 * 24 * 3600
  );

  return {
    statusCode: 200,
    body: {
      status: 'success',
      message:
        'Đổi mật khẩu thành công! Các phiên đăng nhập cũ trên thiết bị khác đã được thu hồi.',
      token: freshToken,
      user: formatUserProfile(updatedUser)
    }
  };
}

/**
 * 13. Lấy danh sách toàn bộ tài khoản từ Supabase (phục vụ Quản trị người dùng UC10)
 * Yêu cầu bắt buộc JWT của Quản trị viên (ADMIN)
 */
async function listUsersForAdmin(authHeader) {
  const adminCheck = await requireAdminRequest(authHeader);
  if (!adminCheck.ok) {
    return { statusCode: adminCheck.statusCode, body: adminCheck.body };
  }

  const rows = await authRepo.listAllUsers();
  return {
    statusCode: 200,
    body: {
      status: 'success',
      users: rows.map((r) => formatUserProfile(r, { createdAt: r.created_at }))
    }
  };
}

/**
 * 14. Thăng chức Quản trị viên (ADMIN) hoặc Hạ xuống Sinh viên (STUDENT)
 * Yêu cầu bắt buộc JWT của Quản trị viên (ADMIN) & Bảo vệ Root Admin
 */
async function updateUserRoleByAdmin(authHeader, { userId, role }) {
  const adminCheck = await requireAdminRequest(authHeader);
  if (!adminCheck.ok) {
    return { statusCode: adminCheck.statusCode, body: adminCheck.body };
  }

  try {
    const updated = await authRepo.updateUserRole(userId, role);
    if (!updated) {
      return {
        statusCode: 404,
        body: { status: 'error', message: 'Không tìm thấy người dùng.' }
      };
    }
    return {
      statusCode: 200,
      body: {
        status: 'success',
        message: `Đã cập nhật vai trò của "${updated.full_name}" thành ${updated.role === 'ADMIN' ? 'Quản trị viên' : 'Sinh viên'}.`,
        user: formatUserProfile(updated, { createdAt: updated.created_at })
      }
    };
  } catch (err) {
    if (err.code === 'ROOT_ADMIN_PROTECTED' || err.message === 'ROOT_ADMIN_PROTECTED') {
      return {
        statusCode: 403,
        body: {
          status: 'error',
          message: 'Không thể hạ quyền tài khoản Quản trị viên gốc của hệ thống.'
        }
      };
    }
    throw err;
  }
}

/**
 * 15. Khóa / Mở khóa tài khoản người dùng trên Supabase
 * Yêu cầu bắt buộc JWT của Quản trị viên (ADMIN) & Bảo vệ Root Admin
 */
async function updateUserStatusByAdmin(authHeader, { userId, status }) {
  const adminCheck = await requireAdminRequest(authHeader);
  if (!adminCheck.ok) {
    return { statusCode: adminCheck.statusCode, body: adminCheck.body };
  }

  try {
    const updated = await authRepo.updateUserStatus(userId, status);
    if (!updated) {
      return {
        statusCode: 404,
        body: { status: 'error', message: 'Không tìm thấy người dùng.' }
      };
    }
    return {
      statusCode: 200,
      body: {
        status: 'success',
        message: `Đã cập nhật trạng thái tài khoản "${updated.full_name}".`,
        user: formatUserProfile(updated, { createdAt: updated.created_at })
      }
    };
  } catch (err) {
    if (err.code === 'ROOT_ADMIN_PROTECTED' || err.message === 'ROOT_ADMIN_PROTECTED') {
      return {
        statusCode: 403,
        body: {
          status: 'error',
          message: 'Không thể khóa tài khoản Quản trị viên gốc của hệ thống.'
        }
      };
    }
    throw err;
  }
}

module.exports = {
  authenticateRequest,
  requireAdminRequest,
  registerUser,
  verifyAccount,
  resendActivation,
  loginUser,
  googleLogin,
  requestPasswordReset,
  resetPassword,
  confirmTrustedDevice,
  triggerEmergencyAccountLockdown,
  verifySessionAndGetProfile,
  updateUserProfile,
  changeUserPassword,
  listUsersForAdmin,
  updateUserRoleByAdmin,
  updateUserStatusByAdmin
};
