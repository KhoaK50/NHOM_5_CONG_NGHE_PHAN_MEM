/**
 * ============================================================================
 * UC03: DANH SÁCH THÔNG BÁO HỆ THỐNG (DROPDOWN POPOVER)
 * Thành viên phụ trách: Lê Nguyễn Thùy Trâm (50.01.103.076)
 * Màn hình Figma tương ứng: SCR_03_Notification_Dropdown
 * ============================================================================
 */
import { CheckCheck, CheckCircle2, XCircle, MessageSquare, BellOff } from 'lucide-react'

export default function NotificationList({
  notifications = [],
  onMarkOneRead,
  onMarkAllRead,
  onSelectNotification
}) {
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const renderIcon = (type) => {
    if (type === 'APPROVED') return <CheckCircle2 size={16} style={{ color: 'var(--green-7)', flexShrink: 0 }} />
    if (type === 'REJECTED') return <XCircle size={16} style={{ color: 'var(--red-6)', flexShrink: 0 }} />
    return <MessageSquare size={16} style={{ color: 'var(--primary-base)', flexShrink: 0 }} />
  }

  return (
    <div className="notification-popover" role="region" aria-label="Danh sách thông báo hệ thống">
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-muted)'
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>
            Thông báo hệ thống
          </span>
          <span
            style={{
              marginLeft: '8px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: unreadCount > 0 ? 'var(--red-6)' : 'var(--text-tertiary)'
            }}
          >
            ({unreadCount} chưa đọc)
          </span>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-base)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: 0
            }}
          >
            <CheckCheck size={14} />
            <span>Đánh dấu đã đọc tất cả</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        /* Ngoại lệ E1 (UC03): Chưa có thông báo nào */
        <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <BellOff size={24} style={{ marginBottom: '6px', opacity: 0.6 }} />
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
            Bạn chưa có thông báo mới nào
          </p>
        </div>
      ) : (
        <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (onMarkOneRead) onMarkOneRead(item.id)
                if (onSelectNotification) onSelectNotification(item)
              }}
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: item.isRead ? 'var(--bg-surface)' : 'var(--blue-1)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                transition: 'background-color 0.15s ease'
              }}
            >
              <div style={{ marginTop: '2px' }}>{renderIcon(item.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.title}
                  </span>
                  {!item.isRead && (
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--red-6)',
                        flexShrink: 0,
                        marginTop: '4px'
                      }}
                    />
                  )}
                </div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {item.message}
                </p>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {item.createdAt}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
