import { useEffect, useState } from 'react'
import { XCircle, X, AlertTriangle, Info } from 'lucide-react'

const MIN_REASON_LENGTH = 10
const MAX_REASON_LENGTH = 2000

const QUICK_REJECT_REASONS = [
  { label: 'Bản scan mờ, thiếu trang', text: 'Bản scan bị mờ hoặc thiếu trang, vui lòng tải lại bản PDF gốc rõ nét và đầy đủ.' },
  { label: 'Sai môn học', text: 'Tài liệu gắn sai môn học, vui lòng chọn đúng học phần theo chương trình đào tạo.' },
  { label: 'Vi phạm bản quyền', text: 'Tài liệu có dấu hiệu vi phạm bản quyền, vui lòng chỉ đóng góp nội dung được phép chia sẻ.' },
  { label: 'Đề thi còn bảo mật', text: 'Tài liệu chứa đề thi đang trong thời hạn bảo mật nên chưa thể xuất bản.' },
  { label: 'Thiếu thông tin mô tả', text: 'Tiêu đề hoặc mô tả còn sơ sài, vui lòng bổ sung thông tin để sinh viên dễ tra cứu.' },
  { label: 'Trùng nội dung', text: 'Nội dung trùng với tài liệu đã có trong kho hoặc chưa đạt chất lượng học thuật.' },
  { label: 'Chưa đúng cấu trúc CV 5512', text: 'Kế hoạch bài dạy chưa đủ cấu trúc 4 hoạt động theo Công văn 5512/BGDĐT-GDTrH.' }
]

export default function RejectReasonModal({ documentItem, submitting = false, serverError = '', onClose, onConfirmReject }) {
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  if (!documentItem) return null

  const trimmedLength = reason.trim().length
  const isLengthOk = trimmedLength >= MIN_REASON_LENGTH && trimmedLength <= MAX_REASON_LENGTH
  const shownError = errorMsg || serverError

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isLengthOk) {
      setErrorMsg(`Bắt buộc nhập lý do cụ thể (tối thiểu ${MIN_REASON_LENGTH} ký tự) để tác giả biết cần sửa gì.`)
      return
    }
    setErrorMsg('')
    onConfirmReject(documentItem.id, reason.trim())
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Nhập lý do từ chối tài liệu">
      <div className="modal-panel" style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span className="status-badge red">
            <XCircle size={13} />
            <span>Từ chối tài liệu</span>
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

        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
          Nhập lý do từ chối
        </h3>
        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {documentItem.title} • {documentItem.uploaderName}
        </p>

        <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Chọn nhanh lý do thường gặp
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
          {QUICK_REJECT_REASONS.map((preset) => {
            const isActive = reason === preset.text
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  setReason(preset.text)
                  setErrorMsg('')
                }}
                style={{
                  padding: '6px 11px',
                  borderRadius: '999px',
                  border: `1px solid ${isActive ? 'var(--blue-6)' : 'var(--border-subtle)'}`,
                  backgroundColor: isActive ? 'var(--blue-3)' : 'var(--bg-muted)',
                  color: isActive ? 'var(--blue-11)' : 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer'
                }}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label htmlFor="reject-reason-textarea" style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Nội dung gửi tới tác giả
            </label>
            <span style={{ fontSize: '11px', fontWeight: 500, color: isLengthOk ? 'var(--green-11)' : shownError ? 'var(--red-11)' : 'var(--text-tertiary)' }}>
              {trimmedLength < MIN_REASON_LENGTH
                ? `${trimmedLength} / tối thiểu ${MIN_REASON_LENGTH} ký tự`
                : `${trimmedLength} / ${MAX_REASON_LENGTH} ký tự`}
            </span>
          </div>

          <textarea
            id="reject-reason-textarea"
            rows={4}
            autoFocus
            maxLength={MAX_REASON_LENGTH}
            value={reason}
            aria-invalid={Boolean(errorMsg)}
            onChange={(e) => {
              setReason(e.target.value)
              if (errorMsg) setErrorMsg('')
            }}
            placeholder="Nêu rõ điểm cần sửa để tác giả chỉnh lại và đóng góp lần nữa..."
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

          {shownError ? (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--red-3)',
                border: '1px solid var(--red-6)',
                color: 'var(--red-12)',
                fontSize: '12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={15} style={{ color: 'var(--red-11)', flexShrink: 0 }} />
              <span>{shownError}</span>
            </div>
          ) : (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--blue-2)',
                border: '1px solid var(--blue-6)',
                color: 'var(--blue-12)',
                fontSize: '12px',
                lineHeight: 1.4,
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Info size={15} style={{ color: 'var(--blue-11)', flexShrink: 0 }} />
              <span>Tác giả nhận lý do này trong thông báo và mục Tài liệu của tôi. Tài liệu không được cộng điểm.</span>
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
                backgroundColor: 'var(--red-9, #e5484d)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
