import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

const TONES = {
  success: { Icon: CheckCircle2, title: 'Thành công' },
  warning: { Icon: AlertTriangle, title: 'Cần chú ý' },
  error: { Icon: XCircle, title: 'Có lỗi xảy ra' },
  info: { Icon: Info, title: 'Thông tin' }
}

function Toast({ toast, onClose }) {
  const [expanded, setExpanded] = useState(false)
  const { Icon, title } = TONES[toast.tone] || TONES.info

  return (
    <div
      className={`toast toast-${toast.tone} ${expanded ? 'is-expanded' : ''}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
    >
      <Icon size={20} aria-hidden="true" />
      <button
        type="button"
        className="toast-body"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="toast-title">{title}</span>
        <span className="toast-message">{toast.text}</span>
      </button>
      <button type="button" className="toast-close" aria-label="Đóng thông báo" onClick={() => onClose(toast.id)}>
        <X size={16} />
      </button>
    </div>
  )
}

export default function ToastStack({ toasts = [], onClose }) {
  if (toasts.length === 0) return null
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}
