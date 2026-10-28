import { useState, useRef, useEffect } from 'react'
import {
  Compass,
  Upload,
  Coins,
  LogOut,
  Bell,
  User,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  FolderKanban,
  Bookmark,
  Award,
  Plus,
  MessageSquare,
  Menu,
  X,
  Trash2
} from 'lucide-react'
import BrandLogo from './BrandLogo'
import NotificationList from '../notifications/NotificationList'
import { AuthGuard } from '../../utils/authGuard'

// Bảng màu Radix 12 tông của Vectoria cho avatar chữ cái đầu
const RADIX_AVATAR_PALETTE = [
  '#e54666', '#d6409f', '#8e4ec6', '#6e56cf',
  '#3e63dd', '#0090ff', '#00a2c7', '#12a594',
  '#30a46c', '#978365', '#f76b15', '#e5484d'
]

function getAvatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return RADIX_AVATAR_PALETTE[Math.abs(hash) % RADIX_AVATAR_PALETTE.length]
}

function getInitial(name = '') {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  const parts = trimmed.split(' ')
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return trimmed.charAt(0).toUpperCase()
}

export default function Navbar({
  actorRole = 'GUEST', // 'GUEST' | 'USER' | 'ADMIN'
  userSession,
  activeView = 'landing',
  onNavigate,
  onSwitchSavedAccount,
  onOpenAuth,
  onLogout,
  notifications = [],
  onMarkOneRead,
  onMarkAllRead,
  onSelectNotification,
  pendingCount = 0,
  logoVariant = 'loops-weave'
}) {
  const isGuest = actorRole === 'GUEST' || !userSession
  const isAdmin = !isGuest && actorRole === 'ADMIN' && userSession?.role === 'ADMIN'

  // Popovers state
  const [isAvatarOpen, setIsAvatarOpen] = useState(false)
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState(() => AuthGuard.getSavedAccounts())

  const avatarRef = useRef(null)
  const notifRef = useRef(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const refreshSavedAccounts = () => {
    setSavedAccounts(AuthGuard.getSavedAccounts())
  }

  // Click outside to close popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setIsAvatarOpen(false)
        setIsAccountPickerOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Đóng avatar dropdown khi chuyển tab
  const handleTabClick = (viewId) => {
    if (isGuest && ['upload', 'my-docs', 'bookmarks', 'profile'].includes(viewId)) {
      if (onOpenAuth) onOpenAuth('login')
      return
    }
    if (onNavigate) onNavigate(viewId)
    setIsMobileMenuOpen(false)
    setIsAvatarOpen(false)
  }

  // Chuyển sang một tài khoản đã đăng nhập hợp lệ trên trình duyệt
  const handleSelectSavedAccount = (acc) => {
    if (onSwitchSavedAccount) {
      onSwitchSavedAccount(acc)
    }
    setIsAccountPickerOpen(false)
    setIsAvatarOpen(false)
  }

  const handleRemoveSavedAccount = (e, email) => {
    e.stopPropagation()
    const nextList = AuthGuard.removeSavedAccount(email)
    setSavedAccounts(nextList)
  }

  const displayName = isGuest
    ? 'Khách vãng lai'
    : userSession?.fullName || userSession?.display_name || userSession?.name || 'Thành viên 5share'
  const displayEmail = isGuest ? 'Chưa đăng nhập' : userSession?.email || ''
  const displayPoints = userSession?.points ?? (isAdmin ? 500 : isGuest ? 0 : 140)
  const avatarUrl = userSession?.avatar_url || userSession?.avatarUrl || null
  const avatarBgColor = getAvatarColor(displayName)
  const avatarInitials = userSession?.avatarInitials || getInitial(displayName)

  return (
    <header className="vec-topbar" id="appHeader" role="banner">
      {/* 1. LEFT: Brand Logo & Navigation Links */}
      <div className="vec-topbar-left">
        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          className="vec-icon-btn vec-mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="Mở menu điều hướng di động"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Brand Logo Link */}
        <div
          className="vec-brand-group"
          onClick={() => handleTabClick('landing')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTabClick('landing')
          }}
          title="5share — Nền tảng Chia sẻ Tài liệu Học tập Sư phạm Tin học"
        >
          <BrandLogo variant={logoVariant} size={36} showWordmark={true} />
        </div>

        {/* Navigation Items with 2px bottom active indicator */}
        <nav
          className={`vec-nav-links ${isMobileMenuOpen ? 'show-mobile' : ''}`}
          aria-label="Điều hướng chính hệ thống"
        >
          {/* Tab 1: Trang chủ */}
          <button
            type="button"
            className={`vec-nav-link ${activeView === 'landing' ? 'active' : ''}`}
            onClick={() => handleTabClick('landing')}
          >
            <span>Trang chủ</span>
          </button>

          {/* Tab 2: Kho học liệu (UC05) */}
          <button
            type="button"
            className={`vec-nav-link ${activeView === 'discovery' || activeView === 'detail' ? 'active' : ''}`}
            onClick={() => handleTabClick('discovery')}
          >
            <Compass size={15} />
            <span>Kho học liệu</span>
          </button>

          {/* Tab 3: Treo thưởng (Study Bounty Board & Leaderboard FR-12) */}
          <button
            type="button"
            className={`vec-nav-link ${activeView === 'bounty' ? 'active' : ''}`}
            onClick={() => handleTabClick('bounty')}
          >
            <Award size={15} />
            <span>Treo thưởng</span>
          </button>

          {/* Tab 4: Đóng góp (Upload Workspace UC07) */}
          <button
            type="button"
            className={`vec-nav-link ${activeView === 'upload' ? 'active' : ''}`}
            onClick={() => handleTabClick('upload')}
          >
            <Upload size={15} />
            <span>Đóng góp</span>
          </button>

          {/* Tab 5: Góp ý hệ thống (UC04 / FR-11) */}
          <button
            type="button"
            className="vec-nav-link"
            onClick={() => {
              setIsMobileMenuOpen(false)
              if (onNavigate) onNavigate('feedback')
            }}
          >
            <MessageSquare size={14} />
            <span>Góp ý</span>
          </button>
        </nav>
      </div>

      {/* 2. RIGHT: Notification Center & Topbar Avatar Popover */}
      <div className="vec-topbar-right">
        {/* Notification Bell Icon Button with Unread Badge */}
        {!isGuest && (
          <div className="vec-dropdown-container right-align" ref={notifRef}>
            <button
              type="button"
              className="vec-icon-btn"
              id="notificationBellBtn"
              title="Thông báo hệ thống"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              aria-label="Xem danh sách thông báo"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="vec-unread-badge" id="unreadBadge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="vec-dropdown-menu" style={{ width: '340px', minWidth: '340px', padding: 0 }}>
                <NotificationList
                  notifications={notifications}
                  onMarkOneRead={onMarkOneRead}
                  onMarkAllRead={onMarkAllRead}
                  onSelectNotification={(item) => {
                    setIsNotifOpen(false)
                    if (onSelectNotification) onSelectNotification(item)
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* 38px Circular Avatar Button (#btnTopAvatar) & Popover Menu (#menuTopAvatar) */}
        <div className="vec-dropdown-container right-align" ref={avatarRef}>
          <div
            className="vec-topbar-avatar-btn"
            id="btnTopAvatar"
            onClick={() => {
              refreshSavedAccounts()
              setIsAvatarOpen((prev) => !prev)
              setIsAccountPickerOpen(false)
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                refreshSavedAccounts()
                setIsAvatarOpen((prev) => !prev)
                setIsAccountPickerOpen(false)
              }
            }}
            title={isGuest ? 'Đăng nhập vào 5share' : `Tài khoản: ${displayName}`}
            style={{
              backgroundColor: isGuest ? 'var(--slate-2, #f9f9fb)' : avatarUrl ? 'transparent' : avatarBgColor,
              color: isGuest ? 'var(--slate-11, #687076)' : '#ffffff',
              backgroundImage: !isGuest && avatarUrl ? `url(${avatarUrl})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              fontWeight: 700,
              fontSize: '14px'
            }}
          >
            {isGuest ? <User size={18} /> : !avatarUrl && avatarInitials}
          </div>

          {/* 260px Profile Popover (#menuTopAvatar) */}
          {isAvatarOpen && (
            <div className="vec-avatar-popover" id="menuTopAvatar">
              {/* VIEW A: GUEST POPOVER */}
              {isGuest && !isAccountPickerOpen ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: 'var(--slate-3, #f0f0f3)',
                      border: '1px solid var(--slate-8, #c1c8cd)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      color: 'var(--slate-11, #687076)',
                      margin: '0 auto 12px'
                    }}
                  >
                    <User size={24} />
                  </div>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 700, color: 'var(--slate-12, #11181c)' }}>
                    Chưa đăng nhập
                  </h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: 'var(--slate-11, #687076)', lineHeight: 1.45 }}>
                    Đăng nhập bằng tài khoản học thuật để đọc toàn văn PDF, tải tệp tin gốc và tích lũy điểm thưởng.
                  </p>

                  <button
                    type="button"
                    className="btn-solid-primary"
                    style={{
                      width: '100%',
                      height: '36px',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      marginBottom: '8px',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setIsAvatarOpen(false)
                      if (onOpenAuth) onOpenAuth('login')
                    }}
                  >
                    Đăng nhập ngay
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    style={{
                      width: '100%',
                      height: '32px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: 'var(--primary-base, #0090ff)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setIsAvatarOpen(false)
                      if (onOpenAuth) onOpenAuth('register')
                    }}
                  >
                    Tạo tài khoản mới
                  </button>

                  {savedAccounts.length > 0 && (
                    <>
                      <div className="vec-dropdown-divider" style={{ margin: '12px 0' }} />
                      <button
                        type="button"
                        onClick={() => setIsAccountPickerOpen(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--slate-11, #687076)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          width: '100%',
                          padding: '4px'
                        }}
                      >
                        <User size={13} />
                        <span>Tài khoản đã lưu trên thiết bị ({savedAccounts.length})</span>
                      </button>
                    </>
                  )}
                </div>
              ) : isAccountPickerOpen ? (
                /* VIEW B: INLINE SLIDE-IN SAVED ACCOUNT SWITCHER PANEL */
                <div className="vec-switch-account-panel">
                  <div className="vec-switch-account-header">
                    <button
                      type="button"
                      onClick={() => setIsAccountPickerOpen(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--slate-11)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Quay lại menu chính"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--slate-12)' }}>
                      Chuyển đổi tài khoản
                    </span>
                  </div>

                  <div className="vec-switch-account-list">
                    {savedAccounts.length === 0 ? (
                      <div
                        style={{
                          padding: '18px 14px',
                          textAlign: 'center',
                          fontSize: '12.5px',
                          color: 'var(--slate-11)'
                        }}
                      >
                        Chưa có tài khoản nào khác được lưu trên trình duyệt này.
                      </div>
                    ) : (
                      savedAccounts.map((acc) => {
                        const isCurrent =
                          !isGuest &&
                          String(acc.email || '').toLowerCase() ===
                            String(userSession?.email || '').toLowerCase()
                        const itemName = acc.fullName || acc.email
                        const itemBg = getAvatarColor(itemName)
                        const itemInitial = acc.avatarInitials || getInitial(itemName)

                        return (
                          <div
                            key={acc.email}
                            className={`vec-switch-account-item ${isCurrent ? 'active' : ''}`}
                            onClick={() => !isCurrent && handleSelectSavedAccount(acc)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !isCurrent) handleSelectSavedAccount(acc)
                            }}
                          >
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                backgroundColor: acc.avatar_url ? 'transparent' : itemBg,
                                color: '#ffffff',
                                backgroundImage: acc.avatar_url ? `url(${acc.avatar_url})` : 'none',
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '12.5px',
                                flexShrink: 0
                              }}
                            >
                              {!acc.avatar_url && itemInitial}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: '13px',
                                  color: 'var(--slate-12)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {itemName}
                              </div>
                              <div
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--slate-11)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {acc.email}
                              </div>
                            </div>

                            {isCurrent ? (
                              <CheckCircle2
                                size={16}
                                style={{ color: 'var(--primary-base, #0090ff)', flexShrink: 0 }}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleRemoveSavedAccount(e, acc.email)}
                                title="Xóa tài khoản khỏi thiết bị này"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--slate-10, #889096)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div
                    style={{
                      padding: '10px 14px',
                      borderTop: '1px solid var(--slate-6, #e6e8eb)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      color: 'var(--primary-base, #0090ff)',
                      fontWeight: 600,
                      fontSize: '12.5px'
                    }}
                    onClick={() => {
                      setIsAvatarOpen(false)
                      setIsAccountPickerOpen(false)
                      if (onOpenAuth) onOpenAuth('login')
                    }}
                  >
                    <Plus size={14} />
                    <span>Đăng nhập tài khoản khác</span>
                  </div>
                </div>
              ) : (
                /* VIEW C: LOGGED IN USER PROFILE MENU */
                <div style={{ padding: '16px 0 8px 0' }}>
                  {/* 64px Circular Avatar Header */}
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: avatarUrl ? 'transparent' : avatarBgColor,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: 700,
                        margin: '0 auto 10px',
                        backgroundImage: avatarUrl ? `url(${avatarUrl})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      {!avatarUrl && avatarInitials}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--slate-12)', marginBottom: '2px' }}>
                      {displayName}
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--slate-11)',
                        marginBottom: '8px',
                        padding: '0 12px',
                        wordBreak: 'break-all'
                      }}
                    >
                      {displayEmail}
                    </div>

                    {/* Huy hiệu Vai trò & Điểm thưởng */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0 12px'
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: isAdmin ? 'var(--blue-2, #e6f4fe)' : 'var(--slate-3, #f0f0f3)',
                          color: isAdmin ? 'var(--blue-11, #0d74ce)' : 'var(--slate-11, #687076)',
                          border: `1px solid ${isAdmin ? 'var(--blue-5, #b7d9f8)' : 'var(--slate-6, #e6e8eb)'}`,
                          padding: '2px 9px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        {isAdmin && <ShieldCheck size={12} />}
                        <span>
                          {userSession?.isRootAdmin
                            ? 'Quản trị viên gốc'
                            : isAdmin
                            ? 'Quản trị viên'
                            : 'Sinh viên'}
                        </span>
                      </span>

                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          backgroundColor: 'var(--amber-1, #fefdfb)',
                          color: 'var(--amber-11, #ab6400)',
                          border: '1px solid var(--amber-3, #fff7c2)',
                          padding: '2px 9px',
                          borderRadius: '999px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        <Coins size={12} />
                        <span>{displayPoints} điểm</span>
                      </span>
                    </div>
                  </div>

                  <div className="vec-dropdown-divider" />

                  {/* Menu Items */}
                  <button
                    type="button"
                    className="vec-dropdown-item"
                    onClick={() => handleTabClick('profile')}
                  >
                    <User size={15} style={{ color: 'var(--slate-11)' }} />
                    <span>Hồ sơ cá nhân</span>
                  </button>

                  <button
                    type="button"
                    className="vec-dropdown-item"
                    onClick={() => handleTabClick('my-docs')}
                  >
                    <FolderKanban size={15} style={{ color: 'var(--slate-11)' }} />
                    <span>Kho tài liệu cá nhân</span>
                  </button>

                  <button
                    type="button"
                    className="vec-dropdown-item"
                    onClick={() => handleTabClick('bookmarks')}
                  >
                    <Bookmark size={15} style={{ color: 'var(--slate-11)' }} />
                    <span>Tài liệu đã lưu</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      className="vec-dropdown-item"
                      onClick={() => handleTabClick('admin-moderation')}
                    >
                      <ShieldCheck size={15} style={{ color: 'var(--primary-base)' }} />
                      <span style={{ fontWeight: 600 }}>Không gian Quản trị</span>
                      {pendingCount > 0 && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            backgroundColor: 'var(--red-9, #e5484d)',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '999px'
                          }}
                        >
                          {pendingCount}
                        </span>
                      )}
                    </button>
                  )}

                  <div className="vec-dropdown-divider" />

                  {/* Chuyển tài khoản đã lưu trên thiết bị */}
                  <button
                    type="button"
                    className="vec-dropdown-item"
                    onClick={() => {
                      refreshSavedAccounts()
                      setIsAccountPickerOpen(true)
                    }}
                  >
                    <ArrowLeft size={15} style={{ transform: 'rotate(180deg)', color: 'var(--slate-11)' }} />
                    <span>Chuyển đổi tài khoản</span>
                  </button>

                  {/* Đăng xuất */}
                  <button
                    type="button"
                    className="vec-dropdown-item"
                    style={{ color: 'var(--danger-base, #e5484d)' }}
                    onClick={() => {
                      setIsAvatarOpen(false)
                      if (onLogout) onLogout()
                    }}
                  >
                    <LogOut size={15} style={{ color: 'var(--danger-base, #e5484d)' }} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
