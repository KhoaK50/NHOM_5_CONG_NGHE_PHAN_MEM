import { useState, useRef, useEffect } from 'react'
import {
  LogOut,
  Bell,
  User,
  CheckCircle2,
  ArrowLeft,
  FolderKanban,
  Bookmark,
  Plus,
  Menu,
  X,
  Trash2,
  Repeat2,
  Sun,
  Moon,
  House,
  BookOpen,
  Upload,
  ShieldCheck
} from 'lucide-react'
import BrandLogo from './BrandLogo'
import NotificationList from '../notifications/NotificationList'
import { AuthGuard } from '../../utils/authGuard'
import { useTheme } from '../../utils/theme'

// Mục điều hướng theo vai trò, bám sát nghiệp vụ 5Share
const NAV_ITEMS = {
  landing: { label: 'Trang chủ', icon: House, views: ['landing'] },
  discovery: { label: 'Kho học liệu', icon: BookOpen, views: ['discovery', 'detail'] },
  upload: { label: 'Đóng góp', icon: Upload, views: ['upload'] },
  admin: {
    label: 'Quản trị',
    icon: ShieldCheck,
    views: ['admin', 'admin-dashboard', 'admin-moderation', 'admin-courses', 'admin-users']
  }
}

const NAV_BY_ROLE = {
  GUEST: ['landing', 'discovery', 'upload'],
  USER: ['landing', 'discovery', 'upload'],
  ADMIN: ['landing', 'discovery', 'upload', 'admin']
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

function Avatar({ url, initials, size = 32 }) {
  return (
    <span
      className="nav-avatar"
      style={{
        width: size,
        height: size,
        backgroundImage: url ? `url(${url})` : 'none'
      }}
    >
      {!url && initials}
    </span>
  )
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
  logoVariant = 'loops-weave'
}) {
  const isGuest = actorRole === 'GUEST' || !userSession
  const isAdmin = !isGuest && actorRole === 'ADMIN' && userSession?.role === 'ADMIN'
  const roleKey = isGuest ? 'GUEST' : isAdmin ? 'ADMIN' : 'USER'

  const [isAvatarOpen, setIsAvatarOpen] = useState(false)
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [savedAccounts, setSavedAccounts] = useState(() => AuthGuard.getSavedAccounts())

  const { theme, setTheme } = useTheme()

  const avatarRef = useRef(null)
  const notifRef = useRef(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const refreshSavedAccounts = () => {
    setSavedAccounts(AuthGuard.getSavedAccounts())
  }

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

  // Menu điện thoại: khóa cuộn trang, đóng bằng Esc và khi chuyển sang màn hình rộng
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false)
    }
    const desktop = window.matchMedia('(min-width: 769px)')
    const onResize = () => {
      if (desktop.matches) setIsMobileMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    desktop.addEventListener('change', onResize)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      desktop.removeEventListener('change', onResize)
    }
  }, [isMobileMenuOpen])

  const handleTabClick = (viewId) => {
    if (onNavigate) onNavigate(viewId)
    setIsMobileMenuOpen(false)
    setIsAvatarOpen(false)
  }

  const handleSelectSavedAccount = (acc) => {
    if (onSwitchSavedAccount) {
      onSwitchSavedAccount(acc)
    }
    setIsAccountPickerOpen(false)
    setIsAvatarOpen(false)
  }

  const handleRemoveSavedAccount = (e, email) => {
    e.stopPropagation()
    setSavedAccounts(AuthGuard.removeSavedAccount(email))
  }

  const handleOpenAuth = (tab) => {
    setIsAvatarOpen(false)
    setIsAccountPickerOpen(false)
    setIsMobileMenuOpen(false)
    if (onOpenAuth) onOpenAuth(tab)
  }

  const displayName =
    userSession?.fullName || userSession?.display_name || userSession?.name || 'Thành viên 5share'
  const avatarUrl = userSession?.avatar_url || userSession?.avatarUrl || null
  const avatarInitials = userSession?.avatarInitials || getInitial(displayName)
  const roleLabel = userSession?.isRootAdmin ? 'Quản trị viên gốc' : isAdmin ? 'Quản trị viên' : 'Sinh viên'

  const accountPicker = (
    <div className="vec-switch-account-panel">
      <div className="vec-switch-account-header">
        <button
          type="button"
          className="nav-menu-back"
          onClick={() => (isGuest ? setIsAvatarOpen(false) : setIsAccountPickerOpen(false))}
          aria-label="Quay lại"
        >
          <ArrowLeft size={16} />
        </button>
        <strong>Chuyển tài khoản</strong>
      </div>

      <div className="vec-switch-account-list">
        {savedAccounts.length === 0 ? (
          <p className="nav-menu-empty">Chưa có tài khoản nào được lưu trên trình duyệt này.</p>
        ) : (
          savedAccounts.map((acc) => {
            const isCurrent =
              !isGuest &&
              String(acc.email || '').toLowerCase() === String(userSession?.email || '').toLowerCase()
            const itemName = acc.fullName || acc.email
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
                <Avatar url={acc.avatar_url} initials={acc.avatarInitials || getInitial(itemName)} />
                <div className="nav-account-text">
                  <strong>{itemName}</strong>
                  <span>{acc.email}</span>
                </div>
                {isCurrent ? (
                  <CheckCircle2 size={16} className="nav-account-check" />
                ) : (
                  <button
                    type="button"
                    className="nav-menu-back"
                    onClick={(e) => handleRemoveSavedAccount(e, acc.email)}
                    title="Xóa tài khoản khỏi thiết bị này"
                    aria-label={`Xóa ${acc.email} khỏi thiết bị này`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      <button type="button" className="vec-dropdown-item nav-menu-add" onClick={() => handleOpenAuth('login')}>
        <Plus size={15} />
        <span>Đăng nhập tài khoản khác</span>
      </button>
    </div>
  )

  return (
    <header className="vec-topbar" id="appHeader" role="banner">
      <div className="vec-topbar-left">
        <div
          className="vec-brand-group"
          onClick={() => handleTabClick('landing')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTabClick('landing')
          }}
          title="5Share - Nền tảng quản lý và chia sẻ tài liệu học tập dành cho ngành Sư phạm Tin học"
        >
          <BrandLogo variant={logoVariant} size={30} showWordmark={true} />
        </div>

        <nav
          id="main-navigation"
          className={`vec-nav-links ${isMobileMenuOpen ? 'show-mobile' : ''}`}
          aria-label="Điều hướng chính"
        >
          {NAV_BY_ROLE[roleKey].map((id) => {
            const Icon = NAV_ITEMS[id].icon
            const isActive = NAV_ITEMS[id].views.includes(activeView)
            return (
              <button
                key={id}
                type="button"
                className={`vec-nav-link ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleTabClick(id)}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{NAV_ITEMS[id].label}</span>
              </button>
            )
          })}

          <div className="vec-nav-menu-footer">
            <div className="vec-nav-menu-theme">
              <span>Giao diện</span>
              <div className="theme-switch" role="group" aria-label="Chọn giao diện">
                <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
                  <Sun size={16} aria-hidden="true" />
                  <span>Sáng</span>
                </button>
                <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
                  <Moon size={16} aria-hidden="true" />
                  <span>Tối</span>
                </button>
              </div>
            </div>
            {isGuest && (
              <button type="button" className="btn-solid-primary" onClick={() => handleOpenAuth('register')}>
                Đăng ký tài khoản
              </button>
            )}
          </div>
        </nav>
      </div>

      <div className="vec-topbar-right">
        <button
          type="button"
          className="vec-icon-btn nav-theme-btn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {isGuest ? (
          <>
            {savedAccounts.length > 0 && (
              <div className="vec-dropdown-container right-align" ref={avatarRef}>
                <button
                  type="button"
                  className="vec-icon-btn"
                  title="Tài khoản đã lưu trên thiết bị"
                  aria-label="Tài khoản đã lưu trên thiết bị"
                  onClick={() => {
                    refreshSavedAccounts()
                    setIsAvatarOpen((prev) => !prev)
                  }}
                >
                  <Repeat2 size={18} />
                </button>
                {isAvatarOpen && (
                  <div className="vec-avatar-popover" id="menuTopAvatar">
                    {accountPicker}
                  </div>
                )}
              </div>
            )}
            <button type="button" className="btn-ghost nav-auth-link" onClick={() => handleOpenAuth('login')}>
              Đăng nhập
            </button>
            <button type="button" className="btn-solid-primary nav-register-btn" onClick={() => handleOpenAuth('register')}>
              Đăng ký
            </button>
          </>
        ) : (
          <>
            <div className="vec-dropdown-container right-align" ref={notifRef}>
              <button
                type="button"
                className="vec-icon-btn"
                id="notificationBellBtn"
                title="Thông báo"
                onClick={() => setIsNotifOpen((prev) => !prev)}
                aria-label="Xem thông báo"
                aria-expanded={isNotifOpen}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="vec-unread-badge" id="unreadBadge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="vec-dropdown-menu vec-notification-menu">
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

            <div className="vec-dropdown-container right-align" ref={avatarRef}>
              <button
                type="button"
                className="nav-avatar-btn"
                id="btnTopAvatar"
                onClick={() => {
                  refreshSavedAccounts()
                  setIsAvatarOpen((prev) => !prev)
                  setIsAccountPickerOpen(false)
                }}
                title={`Tài khoản: ${displayName}`}
                aria-label="Mở menu tài khoản"
              >
                <Avatar url={avatarUrl} initials={avatarInitials} />
              </button>

              {isAvatarOpen && (
                <div className="vec-avatar-popover" id="menuTopAvatar">
                  {isAccountPickerOpen ? (
                    accountPicker
                  ) : (
                    <div className="nav-menu">
                      <div className="nav-menu-head">
                        <strong>{displayName}</strong>
                        <span>{userSession?.email}</span>
                        <span>{roleLabel}</span>
                      </div>

                      <div className="vec-dropdown-divider" />

                      <button type="button" className="vec-dropdown-item" onClick={() => handleTabClick('profile')}>
                        <User size={15} />
                        <span>Hồ sơ cá nhân</span>
                      </button>

                      <button type="button" className="vec-dropdown-item" onClick={() => handleTabClick('my-docs')}>
                        <FolderKanban size={15} />
                        <span>Tài liệu của tôi</span>
                      </button>

                      {!isAdmin && (
                        <button type="button" className="vec-dropdown-item" onClick={() => handleTabClick('bookmarks')}>
                          <Bookmark size={15} />
                          <span>Tài liệu đã lưu</span>
                        </button>
                      )}

                      <div className="vec-dropdown-divider" />

                      <button
                        type="button"
                        className="vec-dropdown-item"
                        onClick={() => {
                          refreshSavedAccounts()
                          setIsAccountPickerOpen(true)
                        }}
                      >
                        <Repeat2 size={15} />
                        <span>Chuyển tài khoản</span>
                      </button>

                      <button
                        type="button"
                        className="vec-dropdown-item nav-menu-danger"
                        onClick={() => {
                          setIsAvatarOpen(false)
                          if (onLogout) onLogout()
                        }}
                      >
                        <LogOut size={15} />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <button
          type="button"
          className="vec-icon-btn vec-mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label={isMobileMenuOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="main-navigation"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  )
}
