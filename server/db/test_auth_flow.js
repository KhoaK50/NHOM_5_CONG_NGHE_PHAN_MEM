/**
 * ============================================================================
 * KIỂM THỬ TÍCH HỢP PHÂN HỆ XÁC THỰC & AN NINH THIẾT BỊ TRÊN SUPABASE
 * Kiểm chứng toàn bộ 4 bảng: users, account_activation, login_history, password_reset
 * ============================================================================
 */

const assert = require('assert');
const authService = require('../services/authService');
const { query, pool } = require('./pool');

async function runAuthIntegrationTest() {
  const testEmail = `test_auth_${Date.now()}@hcmue.edu.vn`;
  console.log('🧪 Bắt đầu kiểm thử tích hợp Phân hệ Auth chuẩn Vectoria trên Supabase...');

  try {
    // 1. Đăng ký tài khoản mới -> lưu vào users (pending) + account_activation
    const reg = await authService.registerUser({
      fullName: 'Sinh Viên Kiểm Thử 5Share',
      email: testEmail,
      password: 'Password123',
      studentCode: '5001104888',
      cohort: 'K50'
    });
    assert.strictEqual(reg.statusCode, 201, 'Register phải trả về HTTP 201');
    assert.strictEqual(reg.body.status, 'success');
    assert.ok(reg.body.dev_otp, 'Phải sinh mã OTP 6 chữ số');
    console.log(`  ✅ [1/7] Đăng ký thành công (${testEmail}) — OTP: ${reg.body.dev_otp}`);

    // 2. Thử đăng nhập khi chưa kích hoạt -> trả về 403 pending_verification
    const earlyLogin = await authService.loginUser({
      email: testEmail,
      password: 'Password123'
    });
    assert.strictEqual(earlyLogin.statusCode, 403);
    assert.strictEqual(earlyLogin.body.status, 'pending_verification');
    console.log('  ✅ [2/7] Chặn đăng nhập khi tài khoản đang ở trạng thái pending (403)');

    // 3. Kích hoạt tài khoản bằng mã OTP vừa cấp -> users.status = 'active', account_activation.is_used = TRUE
    const verified = await authService.verifyAccount({
      email: testEmail,
      otpCode: earlyLogin.body.dev_otp || reg.body.dev_otp,
      ipAddress: '14.161.22.101',
      deviceInfo: 'Windows 10/11 (Chrome)'
    });
    assert.strictEqual(verified.statusCode, 200);
    assert.strictEqual(verified.body.status, 'success');
    console.log('  ✅ [3/7] Kích hoạt tài khoản bằng OTP thành công (users.status = active)');

    // 4. Đăng nhập trên thiết bị đầu tiên -> isTrusted = true, isNewDeviceAlert = false
    const loginTrusted = await authService.loginUser({
      email: testEmail,
      password: 'Password123',
      ipAddress: '14.161.22.101',
      deviceInfo: 'Windows 10/11 (Chrome)'
    });
    assert.strictEqual(loginTrusted.statusCode, 200);
    assert.strictEqual(loginTrusted.body.device_security.isTrusted, true);
    assert.strictEqual(loginTrusted.body.device_security.isNewDeviceAlert, false);
    console.log('  ✅ [4/7] Đăng nhập trên thiết bị quen -> is_trusted = TRUE');

    // 5. Đăng nhập trên thiết bị lạ -> isTrusted = false, isNewDeviceAlert = true (gửi Email cảnh báo!)
    const loginNewDevice = await authService.loginUser({
      email: testEmail,
      password: 'Password123',
      ipAddress: '113.161.99.77',
      deviceInfo: 'macOS (Safari)'
    });
    assert.strictEqual(loginNewDevice.statusCode, 200);
    assert.strictEqual(loginNewDevice.body.device_security.isTrusted, false);
    assert.strictEqual(loginNewDevice.body.device_security.isNewDeviceAlert, true);
    console.log('  ✅ [5/7] Phát hiện thiết bị lạ (macOS Safari) -> is_trusted = FALSE & gửi cảnh báo');

    // 6. Quên mật khẩu & Đặt lại mật khẩu -> tăng token_version từ 1 lên 2
    const forgot = await authService.requestPasswordReset({ email: testEmail });
    assert.strictEqual(forgot.statusCode, 200);
    const reset = await authService.resetPassword({
      email: testEmail,
      token: forgot.body.dev_reset_code,
      newPassword: 'NewSecurePassword999'
    });
    assert.strictEqual(reset.statusCode, 200);
    assert.strictEqual(Number(reset.body.token_version), 2);
    console.log('  ✅ [6/7] Đặt lại mật khẩu thành công -> tăng token_version = 2');

    // 7. Kiểm tra JWT cũ trước khi đổi mật khẩu -> bị thu hồi lập tức (401 session_revoked)
    const oldSessionCheck = await authService.verifySessionAndGetProfile(
      `Bearer ${loginTrusted.body.token}`
    );
    assert.strictEqual(oldSessionCheck.statusCode, 401);
    assert.strictEqual(oldSessionCheck.body.status, 'session_revoked');
    console.log('  ✅ [7/7] Thu hồi toàn bộ JWT cũ ngay lập tức (401 session_revoked)');

    console.log('\n🎉 TẤT CẢ 7 KỊCH BẢN XÁC THỰC & BẢO MẬT TRÊN SUPABASE ĐỀU PASS 100%!');
  } finally {
    // Dọn dẹp tài khoản kiểm thử để giữ sạch dữ liệu trên TablePlus
    await query('DELETE FROM public.users WHERE email LIKE $1', ['test_auth_%']);
    await query('DELETE FROM public.users WHERE email LIKE $1', ['test_vectoria_auth_%']);
    await pool.end();
  }
}

runAuthIntegrationTest().catch((err) => {
  console.error('❌ Lỗi kiểm thử Auth:', err);
  process.exit(1);
});
