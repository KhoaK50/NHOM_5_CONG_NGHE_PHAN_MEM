import RequiredMark from '../common/RequiredMark'
import { useEffect, useState } from 'react'
import { AlertTriangle, EyeOff, ShieldCheck, Trash2, X } from 'lucide-react'

const ACTION_COPY = {
  DISMISS: {
    badge: 'Bỏ qua báo cáo',
    badgeClass: 'slate',
    icon: ShieldCheck,
    title: 'Xác nhận bỏ qua báo cáo?',
    confirm: 'Xác nhận bỏ qua',
    confirmBg: 'var(--primary-base)',
    confirmColor: 'var(--text-on-brand)',
    consequences: ['Tài liệu vẫn hiển thị như hiện tại.', 'Người báo cáo nhận được thông báo kết quả xem xét.']
  },
  HIDE: {
    badge: 'Tạm ẩn tài liệu',
    badgeClass: 'amber',
    icon: EyeOff,
    title: 'Xác nhận tạm ẩn tài liệu?',
    confirm: 'Xác nhận tạm ẩn',
    confirmBg: 'var(--amber-9)',
    confirmColor: 'var(--text-on-amber)',
    consequences: [
      'Tài liệu bị gỡ khỏi kho công khai và không tải được.',
      'Bình luận của tài liệu bị ẩn; bookmark vẫn được giữ để truy vết.',
      'Tác giả và người báo cáo nhận được thông báo.'
    ]
  },
  DELETE: {
    badge: 'Xóa tài liệu',
    badgeClass: 'red',
    icon: Trash2,
    title: 'Xác nhận xóa tài liệu?',
    confirm: 'Xác nhận xóa',
    confirmBg: 'var(--red-9)',
    confirmColor: 'var(--text-on-brand)',
    consequences: [
      'Tài liệu chuyển sang trạng thái đã xóa và không còn truy cập được.',
      'Bình luận bị ẩn; mã băm và nhật ký vẫn được giữ, nên tệp này không thể đóng góp lại.',
      'Tác giả và người báo cáo nhận được thông báo.'
    ]
  }
}

export default function ResolveReportModal({ report, action, submitting = false, serverError = '', onClose, onConfirm }) {
  const [note, setNote] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const copy = ACTION_COPY[action]

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  if (!report || !copy) return null

  const BadgeIcon = copy.icon
  const shownError = errorMsg || serverError

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!note.trim()) {
      setErrorMsg('Bắt buộc nhập ghi chú xử lý để lưu nhật ký.')
      return
    }
    setErrorMsg('')
    onConfirm(note.trim())
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={copy.title}>
      <div className="modal-panel" style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span className={`status-badge ${copy.badgeClass}`}>
            <BadgeIcon size={13} />
            <span>{copy.badge}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{copy.title}</h3>
        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{report.documentTitle}</p>

        <div
          style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--amber-2)',
            border: '1px solid var(--amber-6)',
            color: 'var(--amber-12)',
            fontSize: '12px',
            lineHeight: 1.45,
            marginBottom: '14px'
          }}
        >
          <strong style={{ display: 'block', marginBottom: '4px' }}>Sau khi xác nhận:</strong>
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            {copy.consequences.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="resolve-note-textarea" style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
            Ghi chú xử lý
            <RequiredMark />
          </label>
          <textarea
            id="resolve-note-textarea"
            rows={3}
            autoFocus
            maxLength={1000}
            value={note}
            aria-invalid={Boolean(errorMsg)}
            onChange={(e) => {
              setNote(e.target.value)
              if (errorMsg) setErrorMsg('')
            }}
            placeholder="Ghi lại căn cứ để lưu nhật ký và tra cứu sau này..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: `1.5px solid ${errorMsg ? 'var(--red-9)' : 'var(--border-subtle)'}`,
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              lineHeight: 1.5,
              marginBottom: '10px',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />

          {shownError && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--red-3)',
                border: '1px solid var(--red-6)',
                color: 'var(--red-12)',
                fontSize: '12px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={15} style={{ color: 'var(--red-11)', flexShrink: 0 }} />
              <span>{shownError}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: copy.confirmBg,
                color: copy.confirmColor,
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: submitting ? 'wait' : 'pointer'
              }}
            >
              {submitting ? 'Đang xử lý...' : copy.confirm}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
