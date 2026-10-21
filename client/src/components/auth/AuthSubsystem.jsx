import { useState, useEffect } from 'react'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
  XCircle,
  Keyboard,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  ShieldAlert,
  KeyRound
} from 'lucide-react'
import BrandLogo from '../common/BrandLogo'
import { AuthGuard, getApiBaseUrl } from '../../utils/authGuard'

const GOOGLE_CLIENT_ID =
  '40346986466-pte53inbij06j41bi570qth6cm1dkdvo.apps.googleusercontent.com'

export default function AuthSubsystem({
  initialTab = 'login',
  onLoginSuccess,
  logoVariant = 'loops-weave'
}) {
  const initialUrlParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialResetToken = initialUrlParams?.get('reset_token') || ''
  const initialResetEmail = initialUrlParams?.get('email') || ''
  const initialEmergency = initialUrlParams?.get('emergency') === '1'

  // Navigation views: 'auth' (tabs: login/register) | 'forgot' | 'reset' | 'verify_email'
  const [currentView, setCurrentView] = useState(initialResetToken ? 'reset' : 'auth')
  const [activeTab, setActiveTab] = useState(initialTab) // 'login' | 'register'
  const [activeToast, setActiveToast] = useState(null)

  // Directional navigation states for smooth view transitions
  const [slideDirection, setSlideDirection] = useState('forward') // 'forward' | 'backward'
  const [isExiting, setIsExiting] = useState(false)

  const navigateToView = (nextView, direction = 'forward', callback) => {
    if (isExiting) return
    setIsExiting(true)
    setSlideDirection(direction)
    setTimeout(() => {
      setCurrentView(nextView)
      if (callback) callback()
      setIsExiting(false)
    }, 150)
  }

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginShowPass, setLoginShowPass] = useState(false)
  const [loginCapsLock, setLoginCapsLock] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)

  // Register form state (tối giản chuẩn Vectoria: Họ tên, Email, Mật khẩu)
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPass, setRegPass] = useState('')
  const [regPassConfirm, setRegPassConfirm] = useState('')
  const [regShowPass, setRegShowPass] = useState(false)
  const [regShowConfirm, setRegShowConfirm] = useState(false)
  const [regCapsLock, setRegCapsLock] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [regLoading, setRegLoading] = useState(false)
  const [isPassFocused, setIsPassFocused] = useState(false)

  // Forgot / Reset password state
  const [forgotEmail, setForgotEmail] = useState(initialResetEmail)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [resetToken, setResetToken] = useState(initialResetToken)
  const [sandboxResetCode, setSandboxResetCode] = useState('')
  const [isEmergencyReset, setIsEmergencyReset] = useState(initialEmergency)
  const [resetPass, setResetPass] = useState('')
  const [resetConfirmPass, setResetConfirmPass] = useState('')
  const [resetShowPass, setResetShowPass] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // OTP Email Verification state
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [sandboxOtp, setSandboxOtp] = useState('')
  const [otpCooldown, setOtpCooldown] = useState(60)
  const [otpLoading, setOtpLoading] = useState(false)

  // Toast notification
  const triggerToast = (message, isSuccess = true, title = 'Thông báo') => {
    setActiveToast({ message, isSuccess, title })
    setTimeout(() => {
      setActiveToast(null)
    }, 4500)
  }

  // Email format validation
  const isEmailValid = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  const showRegEmailError = regEmail.length > 0 && !isEmailValid(regEmail)
  const showRegEmailSuccess = regEmail.length > 0 && isEmailValid(regEmail)

  // Password criteria (Login/Register)
  const ruleLengthOk = regPass.length >= 8
  const ruleLetterOk = /[a-zA-Z]/.test(regPass)
  const ruleNumberOk = /[0-9]/.test(regPass)
  const passedRuleCount =
    (ruleLengthOk ? 1 : 0) + (ruleLetterOk ? 1 : 0) + (ruleNumberOk ? 1 : 0)

  // Password progress metrics
  let progressWidth = '0%'
  let progressColor = '#94a3b8'
  if (regPass.length > 0) {
    if (passedRuleCount === 1) {
      progressWidth = '33%'
      progressColor = '#ef4444'
    } else if (passedRuleCount === 2) {
      progressWidth = '66%'
      progressColor = '#f59e0b'
    } else if (passedRuleCount === 3) {
      progressWidth = '100%'
      progressColor = '#22c55e'
    }
  }

  const confirmMismatch = regPassConfirm.length > 0 && regPassConfirm !== regPass
  const confirmMatch = regPassConfirm.length > 0 && regPassConfirm === regPass

  // Tự động phát hiện ?verify_token=... từ liên kết trong Email (Chuẩn Vectoria)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const urlVerifyToken = params.get('verify_token')
    const urlResetToken = params.get('reset_token')

    if (urlResetToken) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (urlVerifyToken) {
      window.history.replaceState({}, document.title, window.location.pathname)
      fetch(`${getApiBaseUrl()}/api/auth/verify?token=${encodeURIComponent(urlVerifyToken)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === 'success') {
            triggerToast(data.message, true, 'Kích hoạt hoàn tất')
            if (data.token && data.user) {
              AuthGuard.saveAuthSession(data.token, data.user, true)
              setTimeout(() => onLoginSuccess && onLoginSuccess(data.user), 800)
            }
          } else {
            triggerToast(
              data.message || 'Liên kết kích hoạt không hợp lệ hoặc đã hết hạn.',
              false,
              'Lỗi xác thực'
            )
          }
        })
        .catch(() => {
          triggerToast('Không thể kết nối máy chủ xác thực.', false, 'Lỗi kết nối')
        })
    }
  }, [onLoginSuccess])

  // Handle OTP countdown
  useEffect(() => {
    let timer = null
    if (currentView === 'verify_email' && otpCooldown > 0) {
      timer = setInterval(() => {
        setOtpCooldown((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [currentView, otpCooldown])

  // 1. Login Submit Handler (Kết nối thật tới Supabase qua /api/auth/login)
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    const cleanEmail = loginEmail.trim().toLowerCase()
    if (!cleanEmail) {
      triggerToast('Vui lòng nhập email đăng nhập.', false, 'Lỗi đăng nhập')
      return
    }
    if (!isEmailValid(cleanEmail)) {
      triggerToast('Email không đúng định dạng.', false, 'Lỗi đăng nhập')
      return
    }
    if (!loginPass) {
      triggerToast('Vui lòng nhập mật khẩu.', false, 'Lỗi đăng nhập')
      return
    }

    setLoginLoading(true)
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: loginPass,
          rememberMe
        })
      })
      const data = await res.json()
      setLoginLoading(false)

      if (data.status === 'pending_verification') {
        setRegEmail(cleanEmail)
        if (data.dev_otp) setSandboxOtp(data.dev_otp)
        setOtp(['', '', '', '', '', ''])
        setOtpCooldown(60)
        triggerToast(data.message, false, 'Chưa kích hoạt tài khoản')
        navigateToView('verify_email', 'forward')
        return
      }

      if (!res.ok || data.status !== 'success') {
        triggerToast(
          data.message || 'Địa chỉ email hoặc mật khẩu không chính xác.',
          false,
          'Đăng nhập thất bại'
        )
        return
      }

      const authenticatedUser = data.user
      AuthGuard.saveAuthSession(data.token, authenticatedUser, rememberMe)

      if (data.device_security?.isNewDeviceAlert) {
        triggerToast(
          `Đăng nhập thành công! Phát hiện thiết bị mới (${data.device_security.deviceInfo}) — Đã gửi cảnh báo bảo mật tới email.`,
          true,
          'Cảnh báo thiết bị mới'
        )
      } else {
        triggerToast(
          data.message || `Chào mừng trở lại, ${authenticatedUser.fullName}!`,
          true,
          'Đăng nhập thành công'
        )
      }

      setTimeout(() => onLoginSuccess && onLoginSuccess(authenticatedUser), 500)
    } catch {
      setLoginLoading(false)
      triggerToast('Không thể kết nối đến máy chủ xác thực.', false, 'Lỗi kết nối')
    }
  }

  // 2. Register Submit Handler (Kết nối thật tới bảng public.users & public.account_activation)
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    if (!regName.trim()) {
      triggerToast('Vui lòng nhập họ và tên của bạn.', false, 'Lỗi đăng ký')
      return
    }
    if (!isEmailValid(regEmail)) {
      triggerToast('Địa chỉ email không đúng định dạng.', false, 'Lỗi đăng ký')
      return
    }
    if (passedRuleCount < 3) {
      triggerToast(
        'Mật khẩu chưa đủ an toàn. Vui lòng thỏa mãn cả 3 tiêu chuẩn.',
        false,
        'Mật khẩu chưa đạt'
      )
      return
    }
    if (regPass !== regPassConfirm) {
      triggerToast('Mật khẩu xác nhận không trùng khớp.', false, 'Lỗi mật khẩu')
      return
    }
    if (!agreeTerms) {
      triggerToast(
        'Vui lòng đồng ý với Điều khoản và Chính sách của 5share.',
        false,
        'Yêu cầu chấp thuận'
      )
      return
    }

    setRegLoading(true)
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPass
        })
      })
      const data = await res.json()
      setRegLoading(false)

      if (!res.ok || data.status !== 'success') {
        triggerToast(
          data.message || 'Không thể khởi tạo tài khoản.',
          false,
          'Đăng ký thất bại'
        )
        return
      }

      if (data.dev_otp) {
        setSandboxOtp(data.dev_otp)
      } else {
        setSandboxOtp('')
      }
      setOtp(['', '', '', '', '', ''])
      setOtpCooldown(60)
      triggerToast(data.message, true, 'Tạo tài khoản thành công')
      navigateToView('verify_email', 'forward')
    } catch {
      setRegLoading(false)
      triggerToast('Không thể kết nối đến máy chủ xác thực.', false, 'Lỗi kết nối')
    }
  }

  // 3. Google OAuth 2.0 Login Handler (Hỗ trợ Google Identity Services GSI thật chuẩn Vectoria)
  const completeGoogleBackendLogin = async (payload) => {
    setLoginLoading(true)
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      setLoginLoading(false)

      if (!res.ok || data.status !== 'success') {
        triggerToast(data.message || 'Xác thực Google thất bại.', false, 'Lỗi Google OAuth')
        return
      }

      AuthGuard.saveAuthSession(data.token, data.user, true)
      triggerToast(data.message, true, 'Đăng nhập Google')
      setTimeout(() => onLoginSuccess && onLoginSuccess(data.user), 500)
    } catch {
      setLoginLoading(false)
      triggerToast('Không thể kết nối qua Google.', false, 'Lỗi kết nối')
    }
  }

  const handleGoogleLogin = () => {
    if (
      typeof window !== 'undefined' &&
      window.google?.accounts?.oauth2?.initTokenClient
    ) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile',
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              triggerToast('Đang xác thực tài khoản với Google...', true, 'Đang kết nối')
              completeGoogleBackendLogin({ access_token: tokenResponse.access_token })
            }
          },
          error_callback: (err) => {
            if (err?.type === 'popup_closed') {
              triggerToast('Đã đóng cửa sổ đăng nhập Google.', false, 'Đã hủy')
            } else {
              triggerToast(
                'Cổng hiện tại chưa được thêm vào Authorized JavaScript origins trên Google Cloud (hãy mở cổng 5500 hoặc thêm localhost:5173).',
                false,
                'Lỗi ủy quyền Google'
              )
            }
          }
        })
        tokenClient.requestAccessToken()
        return
      } catch {
        triggerToast('Không thể khởi tạo cửa sổ Google OAuth.', false, 'Lỗi Google OAuth')
        return
      }
    }

    triggerToast('Thư viện Google đang tải, vui lòng thử lại sau giây lát.', false, 'Đang tải')
  }

  // 4. Forgot Password Handler (Ghi vào bảng public.password_reset trên Supabase)
  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    const cleanEmail = forgotEmail.trim().toLowerCase()
    if (!isEmailValid(cleanEmail)) {
      triggerToast('Vui lòng nhập địa chỉ email hợp lệ.', false, 'Lỗi email')
      return
    }

    setForgotLoading(true)
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      })
      const data = await res.json()
      setForgotLoading(false)

      if (!res.ok || data.status !== 'success') {
        triggerToast(
          data.message || 'Không tìm thấy tài khoản với email này.',
          false,
          'Lỗi khôi phục'
        )
        return
      }

      if (data.dev_reset_code) {
        setSandboxResetCode(data.dev_reset_code)
        setResetToken(data.dev_reset_code)
      } else {
        setSandboxResetCode('')
      }
      setForgotSent(true)
      triggerToast(data.message, true, 'Đã gửi email khôi phục')
    } catch {
      setForgotLoading(false)
      triggerToast('Không thể kết nối đến máy chủ.', false, 'Lỗi kết nối')
    }
  }

  // 5. Reset Password Handler (Cập nhật password_hash & tăng token_version + 1 trên Supabase)
  const handleResetSubmit = async (e) => {
    e.preventDefault()
    if (!resetToken.trim()) {
      triggerToast('Vui lòng nhập mã khôi phục 6 số từ email.', false, 'Thiếu mã khôi phục')
      return
    }
    if (resetPass.length < 8 || !/[A-Za-z]/.test(resetPass) || !/[0-9]/.test(resetPass)) {
      triggerToast(
        'Mật khẩu mới cần tối thiểu 8 ký tự, gồm ít nhất 1 chữ cái và 1 chữ số.',
        false,
        'Mật khẩu chưa đạt'
      )
      return
    }
    if (resetPass !== resetConfirmPass) {
      triggerToast('Mật khẩu xác nhận không khớp.', false, 'Lỗi mật khẩu')
      return
    }

    setResetLoading(true)
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase() || undefined,
          token: resetToken.trim(),
          newPassword: resetPass
        })
      })
      const data = await res.json()
      setResetLoading(false)

      if (!res.ok || data.status !== 'success') {
        triggerToast(
          data.message || 'Mã khôi phục không hợp lệ hoặc đã hết hạn.',
          false,
          'Lỗi đặt lại mật khẩu'
        )
        return
      }

      // Xóa phiên cũ trên máy nếu đang mở
      AuthGuard.clearAuthSession()
      setIsEmergencyReset(false)
      if (forgotEmail) setLoginEmail(forgotEmail)
      setLoginPass('')
      triggerToast(data.message, true, 'Đổi mật khẩu thành công')
      navigateToView('auth', 'backward', () => setActiveTab('login'))
    } catch {
      setResetLoading(false)
      triggerToast('Không thể kết nối đến máy chủ.', false, 'Lỗi kết nối')
    }
  }

  // 6. OTP Input & Paste Handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const pasted = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6)
    if (pasted.length > 0) {
      e.preventDefault()
      const nextOtp = ['', '', '', '', '', '']
      for (let i = 0; i < 6; i++) {
        nextOtp[i] = pasted[i] || ''
      }
      setOtp(nextOtp)
    }
  }

  const handleFillSandboxOtp = () => {
    if (!sandboxOtp) return
    const digits = String(sandboxOtp).slice(0, 6).split('')
    setOtp([
      digits[0] || '',
      digits[1] || '',
      digits[2] || '',
      digits[3] || '',
      digits[4] || '',
      digits[5] || ''
    ])
  }

  // 7. OTP Verification Submit Handler (Xác thực thật với bảng public.account_activation)
  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    const enteredOtp = otp.join('')
    if (enteredOtp.length < 6) {
      triggerToast('Vui lòng nhập đủ 6 chữ số mã xác thực.', false, 'Mã không hợp lệ')
      return
    }

    setOtpLoading(true)
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail || loginEmail,
          otpCode: enteredOtp
        })
      })
      const data = await res.json()
      setOtpLoading(false)

      if (!res.ok || data.status !== 'success') {
        triggerToast(
          data.message || 'Mã xác thực OTP không chính xác hoặc đã hết hạn.',
          false,
          'Lỗi kích hoạt'
        )
        return
      }

      AuthGuard.saveAuthSession(data.token, data.user, true)
      triggerToast(data.message, true, 'Kích hoạt hoàn tất')
      setTimeout(() => onLoginSuccess && onLoginSuccess(data.user), 600)
    } catch {
      setOtpLoading(false)
      triggerToast('Không thể kết nối đến máy chủ xác thực.', false, 'Lỗi kết nối')
    }
  }

  // 8. Resend Activation OTP Handler
  const handleResendOtp = async () => {
    if (otpCooldown > 0) return
    setOtpCooldown(60)
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/resend-activation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail || loginEmail })
      })
      const data = await res.json()
      if (data.dev_otp) setSandboxOtp(data.dev_otp)
      triggerToast(
        data.message || 'Đã gửi lại mã xác thực mới vào email.',
        true,
        'Đã cấp mã mới'
      )
    } catch {
      triggerToast('Đã gửi lại mã xác thực vào email.', true, 'Đã gửi lại mã')
    }
  }

  return (
    <>
      {/* Toast Notification */}
      <div id="static-toast" className={activeToast ? 'show' : ''}>
        {activeToast?.isSuccess ? (
          <CheckCircle2 size={22} color="#22c55e" style={{ flexShrink: 0 }} />
        ) : (
          <XCircle size={22} color="#ef4444" style={{ flexShrink: 0 }} />
        )}
        <div className="toast-body">
          <h4>{activeToast?.title || 'Thông báo'}</h4>
          <p>{activeToast?.message || ''}</p>
        </div>
      </div>

      {/* CENTERED MINIMALIST PRECISION SAAS CARD */}
      <div className="auth-card-centered">
        {/* Brand badge anchored at top */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <BrandLogo variant={logoVariant} size={44} />
        </div>

        {/* Dynamic Directional Stage Wrapper */}
        <div
          className={`view-stage-wrapper ${
            isExiting
              ? slideDirection === 'forward'
                ? 'exit-forward'
                : 'exit-backward'
              : slideDirection === 'forward'
              ? 'enter-forward'
              : 'enter-backward'
          }`}
        >
          {/* Header Title & Subtitle */}
          <div
            className="auth-header-centered"
            style={{ marginBottom: currentView === 'auth' ? 18 : 22 }}
          >
            <h2 className="form-title">
              {currentView === 'auth'
                ? activeTab === 'login'
                  ? 'Đăng nhập tài khoản'
                  : 'Tạo tài khoản mới'
                : currentView === 'forgot'
                ? 'Khôi phục mật khẩu'
                : currentView === 'reset'
                ? isEmergencyReset
                  ? 'Khóa phiên & Đổi mật khẩu khẩn cấp'
                  : 'Đặt lại mật khẩu'
                : 'Xác thực tài khoản'}
            </h2>
            <p className="form-subtitle">
              {currentView === 'auth'
                ? activeTab === 'login'
                  ? 'Truy cập kho học liệu số ngành Sư phạm Tin học 5share'
                  : 'Khởi tạo định danh sinh viên và đồng bộ tủ học liệu cá nhân'
                : currentView === 'forgot'
                ? 'Nhập email tài khoản để nhận mã khôi phục bảo mật (15 phút)'
                : currentView === 'reset'
                ? 'Thiết lập mật khẩu mới và thu hồi toàn bộ các phiên đăng nhập cũ'
                : `Nhập mã 6 chữ số gửi tới ${regEmail || loginEmail || 'email của bạn'}`}
            </p>
          </div>

          {currentView === 'auth' && (
            <>
              {/* Segmented Tab Control with Mechanical Glider Animation */}
              <div className="segmented-tab-nav">
                <div
                  className={`segmented-tab-glider ${
                    activeTab === 'register' ? 'to-right' : ''
                  }`}
                />
                <button
                  type="button"
                  className={`segmented-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
                  onClick={() => setActiveTab('login')}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  className={`segmented-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                  onClick={() => setActiveTab('register')}
                >
                  Đăng ký
                </button>
              </div>

              {/* SLIDING CAROUSEL VIEWPORT (Chuyển cảnh ngang 2 làn không gián đoạn layout) */}
              <div className="auth-carousel-viewport">
                <div
                  className={`auth-carousel-track ${
                    activeTab === 'register' ? 'is-register' : ''
                  }`}
                >
                  {/* -------------------------------------------------------------
                      SLIDE 1: FORM ĐĂNG NHẬP
                      ------------------------------------------------------------- */}
                  <div
                    className={`auth-carousel-slide ${
                      activeTab === 'login' ? 'active' : ''
                    }`}
                  >
                    <form onSubmit={handleLoginSubmit}>
                      {/* Email Field */}
                      <div className="form-field">
                        <label htmlFor="login-email">Email đăng nhập</label>
                        <div className="input-box">
                          <input
                            id="login-email"
                            type="email"
                            placeholder="name@example.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                            disabled={loginLoading}
                            autoComplete="email"
                          />
                          <Mail size={16} className="field-icon" />
                        </div>
                      </div>

                      {/* Password Field */}
                      <div className="form-field">
                        <label htmlFor="login-pass">Mật khẩu</label>
                        <div className="input-box">
                          <input
                            id="login-pass"
                            type={loginShowPass ? 'text' : 'password'}
                            className="has-toggle"
                            placeholder="Ví dụ: 5Share@2026"
                            value={loginPass}
                            onChange={(e) => setLoginPass(e.target.value)}
                            onKeyUp={(e) => {
                              if (e.getModifierState && e.getModifierState('CapsLock')) {
                                setLoginCapsLock(true)
                              } else {
                                setLoginCapsLock(false)
                              }
                            }}
                            required
                            disabled={loginLoading}
                            autoComplete="current-password"
                          />
                          <Lock size={16} className="field-icon" />
                          <span
                            className={`caps-badge ${loginCapsLock ? 'show' : ''}`}
                            title="Caps Lock đang bật"
                          >
                            <Keyboard size={15} />
                          </span>
                          <button
                            type="button"
                            className="btn-toggle-eye"
                            onClick={() => setLoginShowPass(!loginShowPass)}
                            tabIndex={-1}
                            aria-label={loginShowPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          >
                            {loginShowPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Options Row */}
                      <div className="options-row">
                        <label className="checkbox-control">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            disabled={loginLoading}
                          />
                          <span>Ghi nhớ đăng nhập</span>
                        </label>
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => {
                            if (loginEmail) setForgotEmail(loginEmail)
                            navigateToView('forgot', 'forward', () => setForgotSent(false))
                          }}
                        >
                          Quên mật khẩu?
                        </button>
                      </div>

                      {/* Primary Action Button */}
                      <button
                        type="submit"
                        className="btn-primary-action"
                        disabled={loginLoading}
                      >
                        {loginLoading ? (
                          <>
                            <Loader2 size={16} className="spin-loader" />
                            <span>Đang xác thực...</span>
                          </>
                        ) : (
                          <>
                            <span>Đăng nhập</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>

                      {/* Divider & Google OAuth Button AT BOTTOM */}
                      <div className="action-divider">HOẶC TIẾP TỤC VỚI</div>

                      <button
                        type="button"
                        className="btn-google-sso"
                        onClick={handleGoogleLogin}
                        disabled={loginLoading}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                          />
                        </svg>
                        <span>Tiếp tục với Google</span>
                      </button>
                    </form>
                  </div>

                  {/* -------------------------------------------------------------
                      SLIDE 2: FORM ĐĂNG KÝ (ĐỒNG BỘ BẢNG PUBLIC.USERS SUPABASE)
                      ------------------------------------------------------------- */}
                  <div
                    className={`auth-carousel-slide ${
                      activeTab === 'register' ? 'active' : ''
                    }`}
                  >
                    <form onSubmit={handleRegisterSubmit}>
                      {/* Full Name */}
                      <div className="form-field">
                        <label htmlFor="reg-name">Họ và tên</label>
                        <div className="input-box">
                          <input
                            id="reg-name"
                            type="text"
                            placeholder="Nguyễn Trần Đăng Khoa"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            required
                            disabled={regLoading}
                            autoComplete="name"
                          />
                          <User size={16} className="field-icon" />
                        </div>
                      </div>

                      {/* Email Field */}
                      <div className="form-field">
                        <label htmlFor="reg-email">Email tài khoản</label>
                        <div
                          className={`input-box ${
                            showRegEmailError ? 'error' : ''
                          } ${showRegEmailSuccess ? 'success' : ''}`}
                        >
                          <input
                            id="reg-email"
                            type="email"
                            placeholder="name@example.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            required
                            disabled={regLoading}
                            autoComplete="email"
                          />
                          <Mail size={16} className="field-icon" />
                        </div>
                        <div className={`feedback-msg ${showRegEmailError ? 'show' : ''}`}>
                          Email không đúng định dạng.
                        </div>
                      </div>

                      {/* Compact 2-Column Grid: Mật khẩu & Xác nhận mật khẩu song song */}
                      <div className="form-row-grid">
                        {/* Password Field */}
                        <div className="form-field">
                          <label htmlFor="reg-pass">Mật khẩu</label>
                          <div className="input-box">
                            <input
                              id="reg-pass"
                              type={regShowPass ? 'text' : 'password'}
                              className="has-toggle"
                              placeholder="Mật khẩu"
                              value={regPass}
                              onChange={(e) => setRegPass(e.target.value)}
                              onFocus={() => setIsPassFocused(true)}
                              onBlur={() => {
                                if (!regPass) setIsPassFocused(false)
                              }}
                              onKeyUp={(e) => {
                                if (e.getModifierState && e.getModifierState('CapsLock')) {
                                  setRegCapsLock(true)
                                } else {
                                  setRegCapsLock(false)
                                }
                              }}
                              required
                              disabled={regLoading}
                              autoComplete="new-password"
                            />
                            <Lock size={15} className="field-icon" />
                            <span
                              className={`caps-badge ${regCapsLock ? 'show' : ''}`}
                              title="Caps Lock bật"
                            >
                              <Keyboard size={14} />
                            </span>
                            <button
                              type="button"
                              className="btn-toggle-eye"
                              onClick={() => setRegShowPass(!regShowPass)}
                              tabIndex={-1}
                              aria-label={regShowPass ? 'Ẩn' : 'Hiện'}
                            >
                              {regShowPass ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div className="form-field">
                          <label htmlFor="reg-confirm">Xác nhận</label>
                          <div
                            className={`input-box ${confirmMismatch ? 'error' : ''} ${
                              confirmMatch ? 'success' : ''
                            }`}
                          >
                            <input
                              id="reg-confirm"
                              type={regShowConfirm ? 'text' : 'password'}
                              className="has-toggle"
                              placeholder="Nhập lại"
                              value={regPassConfirm}
                              onChange={(e) => setRegPassConfirm(e.target.value)}
                              required
                              disabled={regLoading}
                              autoComplete="new-password"
                            />
                            <Lock size={15} className="field-icon" />
                            <button
                              type="button"
                              className="btn-toggle-eye"
                              onClick={() => setRegShowConfirm(!regShowConfirm)}
                              tabIndex={-1}
                              aria-label={regShowConfirm ? 'Ẩn' : 'Hiện'}
                            >
                              {regShowConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Validation Feedback Row */}
                      {(isPassFocused || regPass.length > 0) && (
                        <div>
                          <div
                            className="pwd-progress-track"
                            style={{ marginBottom: 6, height: 3 }}
                          >
                            <div
                              className="pwd-progress-bar"
                              style={{
                                width: progressWidth,
                                backgroundColor: progressColor
                              }}
                            />
                          </div>

                          <div className="pwd-pills-row">
                            <span
                              className={`pwd-pill ${
                                regPass.length === 0
                                  ? 'pending'
                                  : ruleLengthOk
                                  ? 'valid'
                                  : 'invalid'
                              }`}
                            >
                              {regPass.length === 0 ? (
                                <span className="pill-dot" />
                              ) : ruleLengthOk ? (
                                <Check size={11} strokeWidth={3} />
                              ) : (
                                <XCircle size={11} />
                              )}
                              <span>8+ ký tự</span>
                            </span>

                            <span
                              className={`pwd-pill ${
                                regPass.length === 0
                                  ? 'pending'
                                  : ruleLetterOk
                                  ? 'valid'
                                  : 'invalid'
                              }`}
                            >
                              {regPass.length === 0 ? (
                                <span className="pill-dot" />
                              ) : ruleLetterOk ? (
                                <Check size={11} strokeWidth={3} />
                              ) : (
                                <XCircle size={11} />
                              )}
                              <span>1 chữ cái</span>
                            </span>

                            <span
                              className={`pwd-pill ${
                                regPass.length === 0
                                  ? 'pending'
                                  : ruleNumberOk
                                  ? 'valid'
                                  : 'invalid'
                              }`}
                            >
                              {regPass.length === 0 ? (
                                <span className="pill-dot" />
                              ) : ruleNumberOk ? (
                                <Check size={11} strokeWidth={3} />
                              ) : (
                                <XCircle size={11} />
                              )}
                              <span>1 chữ số</span>
                            </span>
                          </div>
                        </div>
                      )}

                      {confirmMismatch && (
                        <div
                          className="feedback-msg show"
                          style={{ marginTop: -4, marginBottom: 8 }}
                        >
                          Mật khẩu xác nhận không trùng khớp.
                        </div>
                      )}

                      {/* Terms Checkbox */}
                      <div style={{ margin: '8px 0 14px' }}>
                        <label
                          className="checkbox-control"
                          style={{ alignItems: 'flex-start' }}
                        >
                          <input
                            type="checkbox"
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                            disabled={regLoading}
                            required
                            style={{ marginTop: 2 }}
                          />
                          <span style={{ fontSize: '12px', lineHeight: 1.45 }}>
                            Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật học thuật của 5share.
                          </span>
                        </label>
                      </div>

                      {/* Primary Action Button */}
                      <button
                        type="submit"
                        className="btn-primary-action"
                        disabled={regLoading}
                      >
                        {regLoading ? (
                          <>
                            <Loader2 size={16} className="spin-loader" />
                            <span>Đang khởi tạo tài khoản...</span>
                          </>
                        ) : (
                          <>
                            <span>Tạo tài khoản</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>

                      {/* Divider & Google OAuth Button AT BOTTOM */}
                      <div className="action-divider">HOẶC TIẾP TỤC VỚI</div>

                      <button
                        type="button"
                        className="btn-google-sso"
                        onClick={handleGoogleLogin}
                        disabled={regLoading}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                          />
                        </svg>
                        <span>Tiếp tục với Google</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {currentView === 'forgot' && (
            <div>
              {forgotSent ? (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      backgroundColor: '#dcfce7',
                      color: '#16a34a',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '14px'
                    }}
                  >
                    <CheckCircle2 size={30} />
                  </div>
                  <h4
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--slate-12)',
                      margin: '0 0 6px 0'
                    }}
                  >
                    Đã khởi tạo yêu cầu khôi phục
                  </h4>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--slate-11)',
                      lineHeight: 1.5,
                      marginBottom: '16px'
                    }}
                  >
                    Mã khôi phục bảo mật của <strong>{forgotEmail}</strong> đã được ghi nhận vào bảng{' '}
                    <code>password_reset</code> (hiệu lực 15 phút).
                  </p>

                  {sandboxResetCode && (
                    <div
                      style={{
                        backgroundColor: 'var(--slate-2, #f9f9fb)',
                        border: '1px dashed var(--blue-9, #0090ff)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginBottom: '18px',
                        fontSize: '12.5px',
                        color: 'var(--slate-12)'
                      }}
                    >
                      Mã khôi phục từ Supabase: <strong style={{ color: '#0077e6', letterSpacing: '1px' }}>{sandboxResetCode}</strong>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-primary-action"
                    onClick={() => {
                      navigateToView('reset', 'forward')
                    }}
                    style={{ marginBottom: '12px' }}
                  >
                    <span>Tiếp tục đặt lại mật khẩu</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    type="button"
                    className="btn-link"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      navigateToView('auth', 'backward', () => setActiveTab('login'))
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Quay lại đăng nhập</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit}>
                  <div className="form-field">
                    <label htmlFor="forgot-email">Email tài khoản</label>
                    <div className="input-box">
                      <input
                        id="forgot-email"
                        type="email"
                        placeholder="name@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        disabled={forgotLoading}
                      />
                      <Mail size={16} className="field-icon" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary-action"
                    disabled={forgotLoading}
                    style={{ marginTop: 12 }}
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 size={16} className="spin-loader" />
                        <span>Đang khởi tạo mã...</span>
                      </>
                    ) : (
                      <>
                        <span>Gửi yêu cầu khôi phục</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <button
                      type="button"
                      className="btn-link"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => {
                        navigateToView('auth', 'backward', () => setActiveTab('login'))
                      }}
                    >
                      <ArrowLeft size={14} />
                      <span>Quay lại đăng nhập</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* VIEW: RESET PASSWORD */}
          {currentView === 'reset' && (
            <form onSubmit={handleResetSubmit}>
              {isEmergencyReset && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginBottom: '14px',
                    fontSize: '12px',
                    color: '#991b1b',
                    lineHeight: 1.45
                  }}
                >
                  <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    Chế độ khóa khẩn cấp đã thu hồi toàn bộ phiên đăng nhập trên mọi thiết bị. Vui lòng đặt mật khẩu mới.
                  </span>
                </div>
              )}

              <div className="form-field">
                <label htmlFor="reset-token">Mã khôi phục bảo mật</label>
                <div className="input-box">
                  <input
                    id="reset-token"
                    type="text"
                    placeholder="Nhập mã 6 số hoặc token từ email"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                    disabled={resetLoading}
                  />
                  <KeyRound size={16} className="field-icon" />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="reset-pass">Mật khẩu mới</label>
                <div className="input-box">
                  <input
                    id="reset-pass"
                    type={resetShowPass ? 'text' : 'password'}
                    className="has-toggle"
                    placeholder="Tối thiểu 8 ký tự, 1 chữ & 1 số"
                    value={resetPass}
                    onChange={(e) => setResetPass(e.target.value)}
                    required
                    disabled={resetLoading}
                  />
                  <Lock size={16} className="field-icon" />
                  <button
                    type="button"
                    className="btn-toggle-eye"
                    onClick={() => setResetShowPass(!resetShowPass)}
                    tabIndex={-1}
                    aria-label={resetShowPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {resetShowPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="reset-confirm">Xác nhận mật khẩu mới</label>
                <div className="input-box">
                  <input
                    id="reset-confirm"
                    type={resetShowPass ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    value={resetConfirmPass}
                    onChange={(e) => setResetConfirmPass(e.target.value)}
                    required
                    disabled={resetLoading}
                  />
                  <Lock size={16} className="field-icon" />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary-action"
                disabled={resetLoading}
                style={{ marginTop: 12 }}
              >
                {resetLoading ? (
                  <>
                    <Loader2 size={16} className="spin-loader" />
                    <span>Đang cập nhật & thu hồi phiên cũ...</span>
                  </>
                ) : (
                  <span>Cập nhật mật khẩu mới</span>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    navigateToView('auth', 'backward', () => setActiveTab('login'))
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Quay lại đăng nhập</span>
                </button>
              </div>
            </form>
          )}

          {/* VIEW: VERIFY EMAIL OTP */}
          {currentView === 'verify_email' && (
            <form onSubmit={handleOtpSubmit}>
              {sandboxOtp && (
                <div
                  style={{
                    backgroundColor: 'var(--slate-2, #f9f9fb)',
                    border: '1px dashed var(--blue-9, #0090ff)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    marginBottom: '10px',
                    fontSize: '12px',
                    color: 'var(--slate-12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <span>
                    Mã OTP từ Supabase: <strong style={{ color: '#0077e6', letterSpacing: '1px' }}>{sandboxOtp}</strong>
                  </span>
                  <button
                    type="button"
                    className="btn-link"
                    style={{ fontSize: '12px' }}
                    onClick={handleFillSandboxOtp}
                  >
                    Điền nhanh
                  </button>
                </div>
              )}

              <div className="otp-container" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="otp-cell"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    disabled={otpLoading}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="btn-primary-action"
                disabled={otpLoading}
                style={{ marginTop: 14 }}
              >
                {otpLoading ? (
                  <>
                    <Loader2 size={16} className="spin-loader" />
                    <span>Đang xác thực mã...</span>
                  </>
                ) : (
                  <span>Kích hoạt tài khoản</span>
                )}
              </button>

              <div
                style={{
                  textAlign: 'center',
                  marginTop: '20px',
                  fontSize: '13px',
                  color: 'var(--slate-11)'
                }}
              >
                <span>Chưa nhận được mã? </span>
                <button
                  type="button"
                  className="btn-link"
                  disabled={otpCooldown > 0}
                  onClick={handleResendOtp}
                >
                  {otpCooldown > 0 ? `Gửi lại sau ${otpCooldown}s` : 'Gửi lại mã ngay'}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn-link"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    navigateToView('auth', 'backward', () => setActiveTab('login'))
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Quay lại đăng nhập</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
