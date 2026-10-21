/**
 * ============================================================================
 * UC02: ĐĂNG KÝ TÀI KHOẢN SINH VIÊN MỚI
 * Thành viên phụ trách: Lê Nguyễn Thùy Trâm (50.01.103.076)
 * Màn hình Figma tương ứng: SCR_02_Auth_Register
 * ============================================================================
 */
import AuthSubsystem from './AuthSubsystem'

export default function RegisterForm({ onLoginSuccess, logoVariant = 'loops-weave' }) {
  return (
    <AuthSubsystem
      initialTab="register"
      logoVariant={logoVariant}
      onLoginSuccess={onLoginSuccess}
    />
  )
}
