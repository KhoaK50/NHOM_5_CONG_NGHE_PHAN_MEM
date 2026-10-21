/**
 * ============================================================================
 * UC01: ĐĂNG NHẬP HỆ THỐNG (EMAIL + MẬT KHẨU / GOOGLE OAUTH 2.0)
 * Thành viên phụ trách: Nguyễn Trần Đăng Khoa (50.01.103.033 - Nhóm trưởng)
 * Màn hình Figma tương ứng: SCR_01_Auth_Login
 * ============================================================================
 */
import AuthSubsystem from './AuthSubsystem'

export default function LoginForm({ onLoginSuccess, logoVariant = 'loops-weave' }) {
  return (
    <AuthSubsystem
      initialTab="login"
      logoVariant={logoVariant}
      onLoginSuccess={onLoginSuccess}
    />
  )
}
