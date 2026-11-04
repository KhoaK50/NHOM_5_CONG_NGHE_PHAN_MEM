import { useState, useRef } from 'react'
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Save,
  Check,
  AlertTriangle,
  FolderOpen,
  ArrowUpRight,
  Upload,
  Loader2,
  Trash2
} from 'lucide-react'
import { AuthGuard, getApiBaseUrl } from '../../utils/authGuard'

const COHORT_OPTIONS = [
  { code: 'K48', label: 'K48 (Niên khóa 2022 - 2026)' },
  { code: 'K49', label: 'K49 (Niên khóa 2023 - 2027)' },
  { code: 'K50', label: 'K50 (Niên khóa 2024 - 2028)' },
  { code: 'K51', label: 'K51 (Niên khóa 2025 - 2029)' },
  { code: 'K52', label: 'K52 (Niên khóa 2026 - 2030)' }
]

const AVATAR_PRESETS = [
  { id: 'grad-blue', gradient: 'linear-gradient(135deg, #0588f0 0%, #0090ff 100%)', label: 'Xanh dương' },
  { id: 'grad-indigo', gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', label: 'Chàm tím' },
  { id: 'grad-green', gradient: 'linear-gradient(135deg, #16a34a 0%, #30a46c 100%)', label: 'Xanh lục' },
  { id: 'grad-amber', gradient: 'linear-gradient(135deg, #d97706 0%, #ffb224 100%)', label: 'Hổ phách' },
  { id: 'grad-teal', gradient: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)', label: 'Xanh ngọc' },
  { id: 'grad-rose', gradient: 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)', label: 'Đỏ hồng' }
]

const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5MB

export default function UserProfile({
  currentUser,
  initialTab = 'info',
  documents = [],
  downloadHistory = [],
  onUpdateProfile,
  onAvatarUploaded,
  onChangePassword,
  onSelectDoc
}) {
  const [activeTab, setActiveTab] = useState(initialTab)

  // Tab Info Form State
  const [fullName, setFullName] = useState(currentUser?.fullName || currentUser?.display_name || '')
  const [cohort, setCohort] = useState(currentUser?.cohort || 'K50')
  const [studentId, setStudentId] = useState(
    currentUser?.studentId || currentUser?.studentCode || ''
  )
  const [avatarPreset, setAvatarPreset] = useState('grad-blue')
  const [customAvatarUrl, setCustomAvatarUrl] = useState(
    currentUser?.avatarUrl || currentUser?.avatar_url || ''
  )
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [infoError, setInfoError] = useState('')
  const [infoSuccess, setInfoSuccess] = useState('')
  const [infoSubmitting, setInfoSubmitting] = useState(false)
  const avatarFileInputRef = useRef(null)

  // Tab Password Form State
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [pwdSubmitting, setPwdSubmitting] = useState(false)



  // Password Checklist validation
  const pwdChecklist = [
    { id: 'len', label: 'Tối thiểu 8 ký tự', met: newPassword.length >= 8 },
    { id: 'upper', label: 'Chứa ít nhất 1 chữ cái in hoa (A-Z)', met: /[A-Z]/.test(newPassword) },
    { id: 'num', label: 'Chứa ít nhất 1 chữ số (0-9)', met: /[0-9]/.test(newPassword) },
    { id: 'special', label: 'Chứa ít nhất 1 ký tự đặc biệt (!@#$%...)', met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
    { id: 'diff', label: 'Khác với mật khẩu hiện tại', met: newPassword !== oldPassword && newPassword !== '' },
    { id: 'match', label: 'Xác nhận mật khẩu khớp hoàn toàn', met: confirmPassword === newPassword && newPassword !== '' }
  ]
  const isPwdFormValid = pwdChecklist.every((c) => c.met) && oldPassword.length > 0

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setInfoError('')
    setInfoSuccess('')

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setInfoError('Định dạng ảnh không hợp lệ. Chỉ chấp nhận tệp .JPG, .PNG hoặc .WEBP.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setInfoError('Kích thước ảnh vượt quá giới hạn tối đa 5MB.')
      return
    }

    const token = AuthGuard.getAuthToken()
    if (!token) {
      setInfoError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tải ảnh đại diện.')
      return
    }

    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const res = await fetch(`${getApiBaseUrl()}/api/auth/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Không thể tải ảnh đại diện lên.')
      }

      const uploadedUrl = data.avatarUrl || data.user?.avatar_url || data.user?.avatarUrl || ''
      setCustomAvatarUrl(uploadedUrl)

      if (data.user) {
        AuthGuard.updateSavedUserProfile(data.user, token)
        if (onAvatarUploaded) {
          onAvatarUploaded(data.user, uploadedUrl)
        }
      }

      setInfoSuccess(
        data.message || 'Đã cập nhật ảnh đại diện.'
      )
      setTimeout(() => setInfoSuccess(''), 4500)
    } catch (err) {
      setInfoError(err.message || 'Không thể tải ảnh đại diện lên máy chủ lúc này.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSaveInfo = async (e) => {
    e.preventDefault()
    setInfoError('')
    setInfoSuccess('')

    const trimmedName = fullName.trim()
    if (trimmedName.length < 2) {
      setInfoError('Họ và tên bắt buộc tối thiểu 2 ký tự.')
      return
    }

    const cohortRegex = /^K(4[8-9]|5[0-2])$/
    if (!cohortRegex.test(cohort)) {
      setInfoError('Khóa học không hợp lệ. Phải nằm trong phạm vi từ K48 đến K52.')
      return
    }

    setInfoSubmitting(true)
    try {
      if (onUpdateProfile) {
        await onUpdateProfile({
          fullName: trimmedName,
          cohort,
          studentId: studentId.trim(),
          avatarUrl: customAvatarUrl.trim() || null,
          avatarPreset
        })
      }
      setInfoSuccess('Đã cập nhật thông tin hồ sơ cá nhân thành công.')
      setTimeout(() => setInfoSuccess(''), 4000)
    } catch (err) {
      setInfoError(err.message || 'Không thể cập nhật thông tin hồ sơ lúc này.')
    } finally {
      setInfoSubmitting(false)
    }
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    setPwdError('')
    setPwdSuccess('')

    if (!isPwdFormValid) {
      setPwdError('Vui lòng đáp ứng đầy đủ 6 tiêu chuẩn an toàn mật khẩu.')
      return
    }

    setPwdSubmitting(true)
    try {
      if (onChangePassword) {
        await onChangePassword({ oldPassword, newPassword, confirmPassword })
      }
      setPwdSuccess('Đã đổi mật khẩu tài khoản thành công.')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPwdSuccess(''), 4000)
    } catch (err) {
      setPwdError(err.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu cũ.')
    } finally {
      setPwdSubmitting(false)
    }
  }



  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <input
        ref={avatarFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleAvatarFileSelect}
        style={{ display: 'none' }}
      />

      <header>
        <h1 className="page-title">Hồ sơ cá nhân</h1>
        <p className="page-sub">
          {currentUser?.email || 'Chưa cập nhật email'}
        </p>
      </header>

      <div className="underline-tabs" role="tablist" aria-label="Các mục hồ sơ">
        {[
          { id: 'info', label: 'Thông tin cá nhân' },
          { id: 'password', label: 'Bảo mật' },
          { id: 'history', label: 'Lịch sử tải xuống' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`underline-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Tab Panels */}
      {/* Tab 1: Personal Info */}
      {activeTab === 'info' && (
        <section
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            boxShadow: 'var(--shadow-card)'
          }}
          aria-label="Biểu mẫu cập nhật thông tin cá nhân"
        >
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Thông tin cá nhân
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Cập nhật họ tên, mã số sinh viên, khóa học và ảnh đại diện.
            </p>
          </div>

          <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label
                  htmlFor="profile-fullname"
                  style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}
                >
                  Họ và tên:
                </label>
                <input
                  id="profile-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}
                >
                  Email:
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={currentUser?.email || ''}
                  readOnly
                  disabled
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-muted)',
                    color: 'var(--text-secondary)',
                    cursor: 'not-allowed'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label
                  htmlFor="profile-studentid"
                  style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}
                >
                  Mã số sinh viên (MSSV):
                </label>
                <input
                  id="profile-studentid"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Ví dụ: 50.01.103.089"
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="profile-cohort"
                  style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}
                >
                  Khóa học:
                </label>
                <select
                  id="profile-cohort"
                  value={cohort}
                  onChange={(e) => setCohort(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {COHORT_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Avatar Selector + Cloudinary Upload */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Ảnh đại diện
              </label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {AVATAR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setAvatarPreset(p.id)
                        setCustomAvatarUrl('')
                      }}
                      title={p.label}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: p.gradient,
                        border: avatarPreset === p.id && !customAvatarUrl ? '3px solid var(--primary-base)' : '2px solid #ffffff',
                        boxShadow: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}
                    >
                      {avatarPreset === p.id && !customAvatarUrl && <Check size={16} />}
                    </button>
                  ))}
                </div>

                {/* Upload image from device button */}
                <button
                  type="button"
                  disabled={avatarUploading}
                  onClick={() => avatarFileInputRef.current?.click()}
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    border: '1.5px dashed var(--primary-base)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--primary-base)',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: avatarUploading ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px'
                  }}
                >
                  {avatarUploading ? (
                    <>
                      <Loader2 size={15} className="spin-loader" />
                      <span>Đang tải ảnh lên...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={15} />
                      <span>Tải ảnh từ thiết bị</span>
                    </>
                  )}
                </button>

                {customAvatarUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomAvatarUrl('')}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-muted)',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Dùng màu mặc định</span>
                  </button>
                )}
              </div>

              <div style={{ marginTop: '10px' }}>
                <input
                  type="url"
                  placeholder="Hoặc dán đường dẫn ảnh (https://...)"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12.5px'
                  }}
                />
              </div>
            </div>

            {infoError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--red-1)',
                  color: 'var(--red-6)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertTriangle size={15} />
                <span>{infoError}</span>
              </div>
            )}

            {infoSuccess && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--green-1)',
                  color: 'var(--green-7)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={15} />
                <span>{infoSuccess}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="submit"
                disabled={infoSubmitting || avatarUploading}
                className="btn-solid-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px'
                }}
              >
                <Save size={15} />
                <span>{infoSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Tab 2: Password & Security */}
      {activeTab === 'password' && (
        <section
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            boxShadow: 'var(--shadow-card)'
          }}
          aria-label="Biểu mẫu đổi mật khẩu tài khoản"
        >
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Bảo mật Tài khoản & Đổi Mật khẩu
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Đảm bảo mật khẩu đáp ứng 6 tiêu chuẩn an toàn học thuật để bảo vệ an toàn tài khoản học thuật.
            </p>
          </div>

          <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Old Password */}
            <div>
              <label
                htmlFor="old-pwd"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}
              >
                Mật khẩu hiện tại:
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="old-pwd"
                  type={showOldPass ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Nhập mật khẩu hiện tại..."
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 38px 0 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-tertiary)',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {showOldPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password & Confirm Password */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div>
                <label
                  htmlFor="new-pwd"
                  style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}
                >
                  Mật khẩu mới:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-pwd"
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự, có in hoa, số & ký tự đặc biệt"
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 38px 0 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-pwd"
                  style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}
                >
                  Xác nhận mật khẩu mới:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="confirm-pwd"
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 38px 0 12px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* 6-Point Security Checklist */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-muted)',
                border: '1px solid var(--border-subtle)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '8px'
              }}
            >
              {pwdChecklist.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontSize: '12px',
                    color: c.met ? 'var(--green-7)' : 'var(--text-tertiary)'
                  }}
                >
                  {c.met ? <CheckCircle2 size={14} style={{ color: 'var(--green-7)' }} /> : <XCircle size={14} />}
                  <span style={{ fontWeight: c.met ? 600 : 400 }}>{c.label}</span>
                </div>
              ))}
            </div>

            {pwdError && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--red-1)',
                  color: 'var(--red-6)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertTriangle size={15} />
                <span>{pwdError}</span>
              </div>
            )}

            {pwdSuccess && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--green-1)',
                  color: 'var(--green-7)',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={15} />
                <span>{pwdSuccess}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="submit"
                className="btn-solid-primary"
                disabled={!isPwdFormValid || pwdSubmitting}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px'
                }}
              >
                <KeyRound size={15} />
                <span>{pwdSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Tab 5: Download History */}
      {activeTab === 'history' && (
        <section
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px 28px',
            boxShadow: 'var(--shadow-card)'
          }}
          aria-label="Lịch sử tải xuống tài liệu"
        >
          <div style={{ marginBottom: '18px' }}>
            <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Lịch sử Tải xuống Học liệu
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Danh sách các tài liệu bạn đã tải về máy tính để phục vụ học tập và nghiên cứu.
            </p>
          </div>

          {downloadHistory.length === 0 ? (
            <div className="empty-state-box">
              <FolderOpen size={36} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
              <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700 }}>Chưa có lượt tải nào</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Các tài liệu bạn tải về sẽ được lưu vết tại đây để tiện tra cứu lại.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid var(--border-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: 'var(--text-tertiary)' }}>Tên tài liệu</th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-tertiary)' }}>Học phần</th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-tertiary)' }}>Định dạng</th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-tertiary)' }}>Dung lượng</th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-tertiary)' }}>Thời gian tải</th>
                    <th style={{ padding: '10px 12px', color: 'var(--text-tertiary)', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {downloadHistory.map((item) => {
                    const fmt = (item.format || 'pdf').toUpperCase()
                    const badgeClass = fmt === 'PDF' ? 'red' : fmt === 'DOCX' ? 'blue' : 'amber'
                    const matchedDoc = documents.find((d) => d.id === item.docId)

                    return (
                      <tr key={item.id || item.docId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '340px' }}>
                          {item.title}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className="status-badge blue">{item.courseCode}</span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className={`status-badge ${badgeClass}`}>{fmt}</span>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                          {item.fileSizeMb} MB
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-tertiary)' }}>
                          {item.downloadedAt}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {matchedDoc && onSelectDoc && (
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => onSelectDoc(matchedDoc)}
                              style={{ padding: '4px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <span>Đọc lại</span>
                              <ArrowUpRight size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
