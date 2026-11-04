import { useState } from 'react'
import { ArrowLeft, CheckCheck, CheckCircle2, AlertTriangle, AlertCircle, MessageSquare, BellOff } from 'lucide-react'

function getTone(type = '') {
  type = String(type || '')
  if (['APPROVED', 'DOC_APPROVED', 'DOCUMENT_APPROVED'].includes(type)) return 'approved'
  if (['REJECTED', 'DOC_REJECTED', 'DOCUMENT_REJECTED'].includes(type)) return 'action'
  if (type.includes('REPORT')) return 'report'
  return 'general'
}

const TONE_ICON = { approved: CheckCircle2, action: AlertTriangle, report: AlertCircle, general: MessageSquare }

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || ''
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Ho_Chi_Minh'
  }).formatToParts(date)
  const get = (type) => parts.find((part) => part.type === type)?.value
  return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}`
}

export default function NotificationList({ notifications = [], onMarkOneRead, onMarkAllRead, onSelectNotification }) {
  const unreadCount = notifications.filter((notification) => !notification.isRead).length
  const [selectedId, setSelectedId] = useState(null)
  const selected = notifications.find((notification) => notification.id === selectedId)
  const selectedTone = getTone(selected?.type)
  const SelectedIcon = TONE_ICON[selectedTone]

  return (
    <div className="notification-popover" role="region" aria-label="Danh sách thông báo hệ thống">
      <div className="notification-head">
        <div>
          {selected && <button type="button" className="notification-back" onClick={() => setSelectedId(null)} aria-label="Quay lại danh sách"><ArrowLeft size={16} /></button>}
          <strong>{selected ? 'Chi tiết thông báo' : 'Thông báo'}</strong>
          {!selected && <span>{unreadCount} chưa đọc</span>}
        </div>
        {!selected && unreadCount > 0 && <button type="button" onClick={onMarkAllRead}><CheckCheck size={15} /> Đã đọc tất cả</button>}
      </div>
      {selected ? (
        <div className={`notification-detail notification-${selectedTone}`}>
          <span className="notification-icon"><SelectedIcon size={19} /></span>
          <h3>{selected.title}</h3>
          <time dateTime={selected.rawCreatedAt || undefined}>{formatDate(selected.rawCreatedAt || selected.createdAt)}</time>
          <p>{selected.message}</p>
          {(selected.documentId || selected.targetDocId || selected.targetScreen) && <button type="button" className="btn-solid-primary" onClick={() => onSelectNotification?.(selected)}>Xem nội dung liên quan</button>}
        </div>
      ) : notifications.length === 0 ? (
        <div className="notification-empty"><BellOff size={24} /><strong>Chưa có thông báo</strong><p>Kết quả kiểm duyệt và báo cáo sẽ xuất hiện tại đây.</p></div>
      ) : (
        <div className="notification-list">
          {notifications.map((item) => {
            const tone = getTone(item.type)
            const Icon = TONE_ICON[tone]
            return (
              <button
                key={item.id}
                type="button"
                className={`notification-item notification-${tone} ${item.isRead ? 'is-read' : 'is-unread'}`}
                onClick={() => {
                  if (!item.isRead) onMarkOneRead?.(item.id)
                  setSelectedId(item.id)
                }}
                aria-label={`${item.isRead ? '' : 'Chưa đọc. '}${item.title}. ${item.message || ''}`}
              >
                <span className="notification-icon"><Icon size={18} /></span>
                <span className="notification-copy">
                  <span className="notification-title">{item.title}</span>
                  <span className="notification-message">{item.message}</span>
                  <time dateTime={item.rawCreatedAt || undefined}>{formatDate(item.rawCreatedAt || item.createdAt)}</time>
                </span>
                {!item.isRead && <span className="notification-unread-dot" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
