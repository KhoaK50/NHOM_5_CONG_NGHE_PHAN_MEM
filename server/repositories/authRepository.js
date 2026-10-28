/**
 * ============================================================================
 * TẦNG DATA ACCESS (REPOSITORY): TRUY VẤN 4 BẢNG XÁC THỰC & BẢO MẬT
 * Bảng: public.users, public.account_activation, public.login_history, public.password_reset
 * ============================================================================
 */

const { query } = require('../db/pool');

const ROOT_ADMIN_EMAILS = new Set([
  'sc3.nguyentrandangkhoa@gmail.com'
]);

function isRootAdminEmail(email) {
  return ROOT_ADMIN_EMAILS.has(String(email || '').trim().toLowerCase());
}

function resolveInitialRole(email) {
  return isRootAdminEmail(email) ? 'ADMIN' : 'STUDENT';
}

/**
 * Tìm người dùng theo Google ID
 */
async function findUserByGoogleId(googleId) {
  if (!googleId) return null;
  const res = await query(
    `SELECT id, student_code, full_name, email, password_hash, auth_provider, google_id,
            role, cohort, status, avatar_url, token_version, created_at, updated_at
     FROM public.users
     WHERE google_id = $1
     LIMIT 1`,
    [String(googleId).trim()]
  );
  return res.rows[0] || null;
}

/**
 * Tìm người dùng theo địa chỉ Email (không phân biệt hoa thường)
 */
async function findUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const res = await query(
    `SELECT id, student_code, full_name, email, password_hash, auth_provider, google_id,
            role, cohort, status, avatar_url, token_version, created_at, updated_at
     FROM public.users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [normalized]
  );
  return res.rows[0] || null;
}

/**
 * Tìm người dùng theo ID
 */
async function findUserById(userId) {
  const res = await query(
    `SELECT id, student_code, full_name, email, password_hash, auth_provider, google_id,
            role, cohort, status, avatar_url, token_version, created_at, updated_at
     FROM public.users
     WHERE id = $1
     LIMIT 1`,
    [Number(userId)]
  );
  return res.rows[0] || null;
}

/**
 * Tìm người dùng theo mã số sinh viên (student_code)
 */
async function findUserByStudentCode(studentCode) {
  if (!studentCode) return null;
  const cleaned = String(studentCode).replace(/\./g, '').trim();
  if (!cleaned) return null;
  const res = await query(
    `SELECT id, student_code, email FROM public.users WHERE student_code = $1 LIMIT 1`,
    [cleaned]
  );
  return res.rows[0] || null;
}

/**
 * Khởi tạo tài khoản người dùng mới hoặc ghi đè tài khoản pending chưa kích hoạt
 */
async function createOrUpdatePendingUser({
  studentCode,
  fullName,
  email,
  passwordHash,
  cohort = 'K50',
  authProvider = 'local',
  googleId = null,
  status = 'pending',
  avatarUrl = '/avatars/default.png'
}) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const cleanedCode = studentCode ? String(studentCode).replace(/\./g, '').trim() : null;

  const existing = await findUserByEmail(normalizedEmail);
  if (existing && existing.status === 'pending') {
    const updated = await query(
      `UPDATE public.users
       SET full_name = $1,
           password_hash = $2,
           student_code = COALESCE($3, student_code),
           cohort = COALESCE($4, cohort),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, student_code, full_name, email, auth_provider, role, cohort, status, avatar_url, token_version, created_at`,
      [fullName.trim(), passwordHash, cleanedCode, cohort || 'K50', existing.id]
    );
    return updated.rows[0];
  }

  const initialRole = resolveInitialRole(normalizedEmail);
  const inserted = await query(
    `INSERT INTO public.users
       (student_code, full_name, email, password_hash, auth_provider, google_id, role, cohort, status, avatar_url, token_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)
     RETURNING id, student_code, full_name, email, auth_provider, role, cohort, status, avatar_url, token_version, created_at`,
    [
      cleanedCode,
      fullName.trim(),
      normalizedEmail,
      passwordHash,
      authProvider,
      googleId,
      initialRole,
      cohort || 'K50',
      status,
      avatarUrl
    ]
  );
  return inserted.rows[0];
}

/**
 * Lưu hoặc làm mới token kích hoạt trong bảng public.account_activation (hạn 24 giờ)
 */
async function upsertAccountActivation(userId, activationToken) {
  const res = await query(
    `INSERT INTO public.account_activation (user_id, activation_token, created_at, expires_at, is_used)
     VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '24 hours', FALSE)
     ON CONFLICT (user_id) DO UPDATE
     SET activation_token = EXCLUDED.activation_token,
         created_at = CURRENT_TIMESTAMP,
         expires_at = CURRENT_TIMESTAMP + INTERVAL '24 hours',
         is_used = FALSE
     RETURNING user_id, activation_token, created_at, expires_at, is_used`,
    [Number(userId), activationToken]
  );
  return res.rows[0];
}

/**
 * Tra cứu bản ghi kích hoạt theo token đầy đủ hoặc theo(email + mã OTP 6 số)
 */
async function findActivationRecord({ token, email, otpCode }) {
  if (token) {
    const res = await query(
      `SELECT aa.user_id, aa.activation_token, aa.created_at, aa.expires_at, aa.is_used,
              (aa.expires_at < CURRENT_TIMESTAMP) AS is_expired,
              u.full_name, u.email, u.role, u.cohort, u.student_code, u.status, u.avatar_url, u.token_version
       FROM public.account_activation aa
       JOIN public.users u ON u.id = aa.user_id
       WHERE aa.activation_token = $1
       LIMIT 1`,
      [String(token).trim()]
    );
    return res.rows[0] || null;
  }

  if (email && otpCode) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const cleanedOtp = String(otpCode).trim();
    const res = await query(
      `SELECT aa.user_id, aa.activation_token, aa.created_at, aa.expires_at, aa.is_used,
              (aa.expires_at < CURRENT_TIMESTAMP) AS is_expired,
              u.full_name, u.email, u.role, u.cohort, u.student_code, u.status, u.avatar_url, u.token_version
       FROM public.account_activation aa
       JOIN public.users u ON u.id = aa.user_id
       WHERE LOWER(u.email) = $1
         AND (aa.activation_token = $2 OR aa.activation_token LIKE $3)
       LIMIT 1`,
      [normalizedEmail, cleanedOtp, `act_${cleanedOtp}_%`]
    );
    return res.rows[0] || null;
  }

  return null;
}

/**
 * Đánh dấu kích hoạt tài khoản thành công (users.status = 'active', account_activation.is_used = TRUE)
 */
async function markAccountActivated(userId) {
  await query(
    `UPDATE public.account_activation
     SET is_used = TRUE
     WHERE user_id = $1`,
    [Number(userId)]
  );
  const res = await query(
    `UPDATE public.users
     SET status = 'active', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, student_code, full_name, email, role, cohort, status, avatar_url, token_version`,
    [Number(userId)]
  );
  return res.rows[0];
}

/**
 * Kiểm tra lịch sử thiết bị tin cậy và ghi nhận lượt đăng nhập vào public.login_history
 * Đồng bộ với process_device_login() trong Vectoria user.py
 */
async function recordDeviceLogin({ userId, ipAddress, deviceInfo }) {
  // 1. Lấy tất cả các thiết bị đã được tin cậy của người dùng này
  const trustedRes = await query(
    `SELECT device_info
     FROM public.login_history
     WHERE user_id = $1 AND is_trusted = TRUE`,
    [Number(userId)]
  );
  const trustedDevices = new Set(trustedRes.rows.map((r) => r.device_info));

  let isTrusted = false;
  let isNewDeviceAlert = false;

  if (trustedDevices.size === 0) {
    // Lần đăng nhập đầu tiên của tài khoản -> tự động đánh dấu tin cậy
    isTrusted = true;
  } else if (trustedDevices.has(deviceInfo)) {
    // Thiết bị đã nằm trong danh sách tin cậy
    isTrusted = true;
  } else {
    // Thiết bị mới lạ chưa từng được xác nhận!
    isTrusted = false;
    isNewDeviceAlert = true;
  }

  await query(
    `INSERT INTO public.login_history (user_id, login_at, is_trusted, ip_address, device_info)
     VALUES ($1, CURRENT_TIMESTAMP, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [Number(userId), isTrusted, ipAddress, deviceInfo]
  );

  return { isTrusted, isNewDeviceAlert };
}

/**
 * Xác nhận thiết bị lạ thành thiết bị tin cậy (is_trusted = TRUE)
 */
async function markDeviceTrusted(userId, deviceInfo) {
  await query(
    `UPDATE public.login_history
     SET is_trusted = TRUE
     WHERE user_id = $1 AND device_info = $2`,
    [Number(userId), deviceInfo]
  );
}

/**
 * Lấy danh sách lịch sử đăng nhập gần nhất của người dùng
 */
async function getRecentLoginHistory(userId, limit = 10) {
  const res = await query(
    `SELECT login_at, is_trusted, ip_address, device_info
     FROM public.login_history
     WHERE user_id = $1
     ORDER BY login_at DESC
     LIMIT $2`,
    [Number(userId), limit]
  );
  return res.rows;
}

/**
 * Tạo yêu cầu khôi phục mật khẩu mới trong bảng public.password_reset (hạn 15 phút)
 */
async function createPasswordResetToken(userId, resetToken) {
  // Vô hiệu hóa các token cũ chưa dùng của user này
  await query(
    `UPDATE public.password_reset
     SET is_used = TRUE
     WHERE user_id = $1 AND is_used = FALSE`,
    [Number(userId)]
  );

  const res = await query(
    `INSERT INTO public.password_reset (user_id, token, created_at, expires_at, is_used)
     VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '15 minutes', FALSE)
     RETURNING user_id, token, created_at, expires_at, is_used`,
    [Number(userId), resetToken]
  );
  return res.rows[0];
}

/**
 * Tra cứu yêu cầu đặt lại mật khẩu theo token đầy đủ hoặc theo mã OTP 6 số
 */
async function findPasswordResetRecord({ token, email }) {
  const cleaned = String(token || '').trim();
  if (!cleaned) return null;

  if (email) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const res = await query(
      `SELECT pr.user_id, pr.token, pr.created_at, pr.expires_at, pr.is_used,
              (pr.expires_at < CURRENT_TIMESTAMP) AS is_expired,
              u.email, u.full_name, u.token_version
       FROM public.password_reset pr
       JOIN public.users u ON u.id = pr.user_id
       WHERE LOWER(u.email) = $1
         AND (pr.token = $2 OR pr.token LIKE $3)
       ORDER BY pr.created_at DESC
       LIMIT 1`,
      [normalizedEmail, cleaned, `rst_${cleaned}_%`]
    );
    return res.rows[0] || null;
  }

  const res = await query(
    `SELECT pr.user_id, pr.token, pr.created_at, pr.expires_at, pr.is_used,
            (pr.expires_at < CURRENT_TIMESTAMP) AS is_expired,
            u.email, u.full_name, u.token_version
     FROM public.password_reset pr
     JOIN public.users u ON u.id = pr.user_id
     WHERE pr.token = $1 OR pr.token LIKE $2
     ORDER BY pr.created_at DESC
     LIMIT 1`,
    [cleaned, `rst_${cleaned}_%`]
  );
  return res.rows[0] || null;
}

/**
 * Cập nhật mật khẩu mới, đánh dấu token khôi phục đã dùng và tăng token_version + 1
 * (Thu hồi lập tức toàn bộ các JWT cũ đang hoạt động trên mọi thiết bị)
 */
async function updatePasswordAndRevokeSessions(userId, newPasswordHash, usedToken = null) {
  if (usedToken) {
    await query(
      `UPDATE public.password_reset
       SET is_used = TRUE
       WHERE user_id = $1 AND token = $2`,
      [Number(userId), usedToken]
    );
  } else {
    await query(
      `UPDATE public.password_reset
       SET is_used = TRUE
       WHERE user_id = $1 AND is_used = FALSE`,
      [Number(userId)]
    );
  }

  const res = await query(
    `UPDATE public.users
     SET password_hash = $1,
         token_version = COALESCE(token_version, 1) + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, student_code, full_name, email, role, cohort, status, avatar_url, token_version`,
    [newPasswordHash, Number(userId)]
  );
  return res.rows[0];
}

/**
 * Khóa phiên khẩn cấp (Tăng token_version + 1 ngay lập tức khi người dùng bấm nút từ Email cảnh báo)
 */
async function incrementUserTokenVersion(userId) {
  const res = await query(
    `UPDATE public.users
     SET token_version = COALESCE(token_version, 1) + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, email, full_name, token_version`,
    [Number(userId)]
  );
  return res.rows[0] || null;
}

/**
 * Liên kết hoặc cập nhật thông tin đăng nhập Google OAuth 2.0
 */
async function linkOrCreateGoogleUser({ email, fullName, googleId, avatarUrl }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const existingByEmail = await findUserByEmail(normalizedEmail);
  const existingByGoogle = googleId ? await findUserByGoogleId(googleId) : null;
  const existing = existingByEmail || existingByGoogle;
  const shouldBeAdmin = isRootAdminEmail(normalizedEmail);

  if (existing) {
    const resolvedName = fullName ? String(fullName).trim() : existing.full_name;
    const updated = await query(
      `UPDATE public.users
       SET email = $1,
           full_name = COALESCE($2, full_name),
           google_id = COALESCE($3, google_id),
           avatar_url = CASE
             WHEN avatar_url IS NULL OR avatar_url = '/avatars/default.png' THEN COALESCE($4, avatar_url)
             ELSE avatar_url
           END,
           role = CASE WHEN $5 = TRUE THEN 'ADMIN' ELSE role END,
           status = CASE WHEN status = 'pending' THEN 'active' ELSE status END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING id, student_code, full_name, email, auth_provider, google_id, role, cohort, status, avatar_url, token_version`,
      [normalizedEmail, resolvedName, googleId, avatarUrl, shouldBeAdmin, existing.id]
    );
    return { user: updated.rows[0], isNewUser: false };
  }

  const dummyHash = `google_oauth2_unusable_${googleId}`;
  const initialRole = resolveInitialRole(normalizedEmail);
  const inserted = await query(
    `INSERT INTO public.users
       (student_code, full_name, email, password_hash, auth_provider, google_id, role, cohort, status, avatar_url, token_version)
     VALUES (NULL, $1, $2, $3, 'google', $4, $5, 'K50', 'active', $6, 1)
     RETURNING id, student_code, full_name, email, auth_provider, google_id, role, cohort, status, avatar_url, token_version`,
    [
      fullName || normalizedEmail.split('@')[0],
      normalizedEmail,
      dummyHash,
      googleId,
      initialRole,
      avatarUrl || '/avatars/default.png'
    ]
  );
  return { user: inserted.rows[0], isNewUser: true };
}

/**
 * Cập nhật thông tin hồ sơ cá nhân của người dùng (UC03 / FR-02)
 */
async function updateUserProfileInfo(userId, { fullName, cohort, studentCode, avatarUrl }) {
  const cleanedCode = studentCode ? String(studentCode).replace(/\./g, '').trim() : null;
  const res = await query(
    `UPDATE public.users
     SET full_name = COALESCE($1, full_name),
         cohort = COALESCE($2, cohort),
         student_code = COALESCE($3, student_code),
         avatar_url = COALESCE($4, avatar_url),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING id, student_code, full_name, email, auth_provider, role, cohort, status, avatar_url, token_version, created_at`,
    [
      fullName ? String(fullName).trim() : null,
      cohort ? String(cohort).trim() : null,
      cleanedCode || null,
      avatarUrl ? String(avatarUrl).trim() : null,
      Number(userId)
    ]
  );
  return res.rows[0] || null;
}

/**
 * Lấy danh sách toàn bộ người dùng từ Supabase phục vụ Quản trị viên (UC10)
 */
async function listAllUsers() {
  const res = await query(
    `SELECT id, student_code, full_name, email, auth_provider, role, cohort, status, avatar_url, created_at
     FROM public.users
     ORDER BY CASE WHEN role = 'ADMIN' THEN 0 ELSE 1 END, id ASC`
  );
  return res.rows;
}

/**
 * Thăng chức Admin hoặc Hạ xuống Sinh viên (chỉ dành cho Admin, bảo vệ Root Admin)
 */
async function updateUserRole(userId, nextRole) {
  const target = await findUserById(userId);
  if (!target) return null;
  if (isRootAdminEmail(target.email) && nextRole !== 'ADMIN') {
    throw new Error('ROOT_ADMIN_PROTECTED');
  }
  const canonical = nextRole === 'ADMIN' ? 'ADMIN' : 'STUDENT';
  const res = await query(
    `UPDATE public.users
     SET role = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, student_code, full_name, email, role, cohort, status, avatar_url, created_at`,
    [canonical, Number(userId)]
  );
  return res.rows[0] || null;
}

/**
 * Khóa / Mở khóa tài khoản người dùng trên Supabase (UC10, bảo vệ Root Admin)
 */
async function updateUserStatus(userId, nextStatus) {
  const target = await findUserById(userId);
  if (!target) return null;
  if (isRootAdminEmail(target.email) && nextStatus === 'locked') {
    throw new Error('ROOT_ADMIN_PROTECTED');
  }
  const canonical = nextStatus === 'locked' ? 'locked' : 'active';
  const res = await query(
    `UPDATE public.users
     SET status = $1,
         token_version = CASE WHEN $1 = 'locked' THEN COALESCE(token_version, 1) + 1 ELSE token_version END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING id, student_code, full_name, email, role, cohort, status, avatar_url, created_at`,
    [canonical, Number(userId)]
  );
  return res.rows[0] || null;
}

module.exports = {
  isRootAdminEmail,
  findUserByEmail,
  findUserById,
  findUserByGoogleId,
  findUserByStudentCode,
  createOrUpdatePendingUser,
  upsertAccountActivation,
  findActivationRecord,
  markAccountActivated,
  recordDeviceLogin,
  markDeviceTrusted,
  getRecentLoginHistory,
  createPasswordResetToken,
  findPasswordResetRecord,
  updatePasswordAndRevokeSessions,
  incrementUserTokenVersion,
  linkOrCreateGoogleUser,
  updateUserProfileInfo,
  listAllUsers,
  updateUserRole,
  updateUserStatus
};
