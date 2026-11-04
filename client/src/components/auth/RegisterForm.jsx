/**
 * ============================================================================
 * UC02: ĐĂNG KÝ TÀI KHOẢN SINH VIÊN MỚI
 * Thành viên phụ trách: Lê Nguyễn Thùy Trâm (50.01.103.088)
 * Tương thích cả giao diện toàn trang AuthSubsystem và cửa sổ nổi RegisterModal
 * ============================================================================
 */
import AuthSubsystem from './AuthSubsystem'
import RegisterModal from './RegisterModal'

export default function RegisterForm(props) {
  if (props.open !== undefined || props.onClose) {
    return <RegisterModal {...props} />
  }
  return (
    <AuthSubsystem
      initialTab="register"
      logoVariant={props.logoVariant || 'loops-weave'}
      onLoginSuccess={props.onLoginSuccess}
    />
  )
}

export { RegisterModal }
