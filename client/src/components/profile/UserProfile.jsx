import { useState } from 'react'
import {
  User,
  KeyRound,
  FileText,
  Bookmark,
  History,
  Coins,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Save,
  Check,
  AlertTriangle,
  FolderOpen,
  ArrowUpRight
} from 'lucide-react'
import MyDocuments from './MyDocuments'
import SavedBookmarks from './SavedBookmarks'

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

export default function UserProfile({
  currentUser,
  initialTab = 'info',
  documents = [],
  bookmarkedIds = [],
  downloadHistory = [],
  onUpdateProfile,
  onChangePassword,
  onSelectDoc,
  onToggleBookmark,
  onOpenUpload,
  onNavigateDiscovery
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
  const [infoError, setInfoError] = useState('')
  const [infoSuccess, setInfoSuccess] = useState('')
  const [infoSubmitting, setInfoSubmitting] = useState(false)

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

  // Metrics
  const myUploadedDocs = documents.filter(
    (d) =>
      d.uploaderId === currentUser?.id ||
      (d.uploaderName && currentUser?.fullName && d.uploaderName.includes(currentUser.fullName))
  )
  const approvedCount = myUploadedDocs.filter((d) => d.status === 'APPROVED').length
  const pendingCount = myUploadedDocs.filter((d) => d.status === 'PENDING').length
  const bookmarksCount = bookmarkedIds.length

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

  const selectedPresetObj = AVATAR_PRESETS.find((p) => p.id === avatarPreset) || AVATAR_PRESETS[0]
  const avatarInitials = currentUser?.avatarInitials || (fullName ? fullName.split(' ').slice(-1)[0]?.slice(0, 2).toUpperCase() : 'TV')

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Profile Header Card */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}
        aria-label="Thông tin tổng quan sinh viên"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
          {/* Circular Avatar */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: customAvatarUrl ? 'none' : selectedPresetObj.gradient,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '24px',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0, 144, 255, 0.25)',
              overflow: 'hidden',
              border: '2px solid #ffffff'
            }}
          >
            {customAvatarUrl ? (
              <img
                src={customAvatarUrl}
                alt={fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            ) : (
              <span>{avatarInitials}</span>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {fullName}
              </h1>
              <span className="status-badge blue" style={{ fontWeight: 700 }}>
                {cohort} Sư phạm Tin học
              </span>
              <span className="status-badge green" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} />
                <span>HCMUE Verified</span>
              </span>
            </div>

            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span>{currentUser?.email || 'Chưa cập nhật email'}</span>
              <span>•</span>
              <span>MSSV: <strong>{studentId || 'Chưa cập nhật'}</strong></span>
              <span>•</span>
              <span style={{ color: 'var(--text-tertiary)' }}>Khoa Công nghệ Thông tin</span>
            </div>
          </div>
        </div>

        {/* Points Balance Pill */}
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            backgroundColor: 'var(--amber-1, #fff9ed)',
            border: '1.5px solid var(--amber-3, #ffe3a2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'var(--amber-2)',
              color: 'var(--amber-9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Coins size={20} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--amber-11)', fontWeight: 600 }}>
              Ví điểm cống hiến
            </span>
            <strong style={{ fontSize: '18px', color: 'var(--amber-12)', fontWeight: 800 }}>
              {currentUser?.points ?? 140} điểm
            </strong>
          </div>
        </div>
      </section>

      {/* Metric Counter Chips */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px'
        }}
      >
        <div
          onClick={() => setActiveTab('my-docs')}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '14px 18px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'border-color 0.2s ease'
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
            Tài liệu đã đăng
          </span>
          <strong style={{ fontSize: '20px', color: 'var(--text-primary)' }}>{myUploadedDocs.length}</strong>
        </div>

        <div
          onClick={() => setActiveTab('my-docs')}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '14px 18px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
            Đã phê duyệt (+20đ/bản)
          </span>
          <strong style={{ fontSize: '20px', color: 'var(--green-7)' }}>{approvedCount}</strong>
        </div>

        <div
          onClick={() => setActiveTab('my-docs')}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '14px 18px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
            Đang chờ thẩm định
          </span>
          <strong style={{ fontSize: '20px', color: 'var(--amber-7)' }}>{pendingCount}</strong>
        </div>

        <div
          onClick={() => setActiveTab('bookmarks')}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '14px 18px',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
            Tủ tài liệu đã lưu
          </span>
          <strong style={{ fontSize: '20px', color: 'var(--primary-base)' }}>{bookmarksCount}</strong>
        </div>
      </div>

      {/* 2. Tab Bar Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          borderBottom: '2px solid var(--slate-3)',
          paddingBottom: '2px',
          overflowX: 'auto'
        }}
        role="tablist"
        aria-label="Các phân hệ hồ sơ sinh viên"
      >
        {[
          { id: 'info', label: 'Thông tin cá nhân', icon: User },
          { id: 'password', label: 'Bảo mật & Mật khẩu', icon: KeyRound },
          { id: 'my-docs', label: `Tài liệu của tôi (${myUploadedDocs.length})`, icon: FileText },
          { id: 'bookmarks', label: `Tủ đã lưu (${bookmarksCount})`, icon: Bookmark },
          { id: 'history', label: 'Lịch sử tải xuống', icon: History }
        ].map((tab) => {
          const TabIcon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '9px 16px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                color: isActive ? 'var(--primary-base)' : 'var(--text-secondary)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                borderBottom: isActive ? '2px solid var(--primary-base)' : '2px solid transparent',
                marginBottom: '-4px',
                whiteSpace: 'nowrap'
              }}
            >
              <TabIcon size={14} />
              <span>{tab.label}</span>
            </button>
          )
        })}
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
              Thông tin Cá nhân & Khóa học HCMUE
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Quản lý danh tính sinh viên, thông tin khóa học và giao diện đại diện trên hệ thống 5share.
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
                  Email tài khoản (Xác thực HCMUE):
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
                  Khóa học (Hợp lệ K48 – K52):
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

            {/* Avatar Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Ảnh đại diện hiển thị:
              </label>
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
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
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

              <div style={{ marginTop: '10px' }}>
                <input
                  type="url"
                  placeholder="Hoặc nhập đường dẫn ảnh đại diện tùy chỉnh (URL)..."
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

            {/* Read-only department */}
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-muted)',
                fontSize: '12.5px',
                color: 'var(--text-secondary)'
              }}
            >
              <strong>Đơn vị đào tạo:</strong> Ngành Sư phạm Tin học — Khoa Công nghệ Thông tin, Trường Đại học Sư phạm TP.HCM.
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
                disabled={infoSubmitting}
                className="btn-solid-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  opacity: infoSubmitting ? 0.6 : 1
                }}
              >
                <Save size={15} />
                <span>{infoSubmitting ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}</span>
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
              Đảm bảo mật khẩu đáp ứng 6 tiêu chuẩn an toàn học thuật để bảo vệ tài khoản và điểm thưởng.
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
                  placeholder="Nhập mật khẩu hiện tại (Ví dụ: Student123@)"
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
                  padding: '10px 24px',
                  opacity: !isPwdFormValid || pwdSubmitting ? 0.5 : 1
                }}
              >
                <KeyRound size={15} />
                <span>{pwdSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu mới'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Tab 3: My Documents */}
      {activeTab === 'my-docs' && (
        <MyDocuments
          documents={documents}
          currentUser={currentUser}
          onSelectDoc={onSelectDoc}
          onOpenUpload={onOpenUpload}
        />
      )}

      {/* Tab 4: Bookmarks */}
      {activeTab === 'bookmarks' && (
        <SavedBookmarks
          documents={documents}
          bookmarkedIds={bookmarkedIds}
          onSelectDoc={onSelectDoc}
          onToggleBookmark={onToggleBookmark}
          onNavigateDiscovery={onNavigateDiscovery}
        />
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
