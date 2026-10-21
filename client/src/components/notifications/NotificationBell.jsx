/**
 * ============================================================================
 * UC03: BIỂU TƯỢNG CHUÔNG THÔNG BÁO & UNREAD BADGE
 * Thành viên phụ trách: Lê Nguyễn Thùy Trâm (50.01.103.076)
 * Màn hình Figma tương ứng: SCR_03_Notification_Dropdown
 * ============================================================================
 */
import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import NotificationList from './NotificationList'

export default function NotificationBell({
  notifications = [],
  onMarkOneRead,
  onMarkAllRead,
  onSelectNotification
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const unreadCount = notifications.filter((n) => !n.isRead).length

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Chuông thông báo hệ thống"
        style={{
          position: 'relative',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '999px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: '10.5px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg-surface)'
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationList
          notifications={notifications}
          onMarkOneRead={onMarkOneRead}
          onMarkAllRead={onMarkAllRead}
          onSelectNotification={(item) => {
            setOpen(false)
            if (onSelectNotification) onSelectNotification(item)
          }}
        />
      )}
    </div>
  )
}
