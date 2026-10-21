import { useState } from 'react'
import { XCircle, X, AlertTriangle } from 'lucide-react'

const QUICK_REJECT_REASONS = [
  'Kế hoạch bài dạy chưa đủ cấu trúc 4 hoạt động chuẩn theo Công văn 5512/BGDĐT-GDTrH.',
  'Gắn sai mã học phần hoặc không đúng chương trình đào tạo Sư phạm Tin học HCMUE.',
  'Tài liệu chứa thông tin đề thi đang trong thời hạn bảo mật hoặc vi phạm bản quyền.',
  'Bản scan bị mờ nhòe, nghiêng lệch, thiếu trang hoặc lỗi phông chữ Tiếng Việt.',
  'Tiêu đề hoặc mô tả học liệu sơ sài, thiếu thông tin nhận diện cần thiết.',
  'Nội dung tài liệu trùng lặp hoặc không đạt chất lượng học thuật chuyên ngành.'
]

export default function RejectReasonModal({
  documentItem,
  onClose,
  onConfirmReject
}) {
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  if (!documentItem) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = reason.trim()
    if (!trimmed || trimmed.length < 10) {
      setErrorMsg('Bắt buộc phải nhập lý do từ chối cụ thể (tối thiểu 10 ký tự) để sinh viên nắm rõ và chỉnh sửa.')
      return
    }
    setErrorMsg('')
    onConfirmReject(documentItem.id, trimmed)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Nhập lý do từ chối học liệu">
      <div className="modal-panel" style={{ maxWidth: '540px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span className="status-badge red">
            <XCircle size={13} />
            <span>Từ chối phê duyệt học liệu</span>
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
          Nhập Lý do Từ chối & Yêu cầu Chỉnh sửa
        </h3>
        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Tài liệu: <strong>{documentItem.title}</strong> • Tác giả: {documentItem.uploaderName}
        </p>

        {/* Các mẫu lý do chọn nhanh */}
        <div style={{ marginBottom: '12px' }}>
          <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Mẫu phản hồi nhanh theo 8 tiêu chí kiểm duyệt:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {QUICK_REJECT_REASONS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setReason(preset)
                  setErrorMsg('')
                }}
                style={{
                  textAlign: 'left',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-muted)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label
              htmlFor="reject-reason-textarea"
              style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}
            >
              Nội dung phản hồi chi tiết gửi tới tác giả:
            </label>
            <span style={{ fontSize: '11px', color: reason.trim().length >= 10 ? 'var(--green-9)' : 'var(--text-tertiary)' }}>
              {reason.trim().length} / 10 ký tự tối thiểu
            </span>
          </div>

          <textarea
            id="reject-reason-textarea"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (errorMsg) setErrorMsg('')
            }}
            placeholder="Nhập lý do từ chối cụ thể để sinh viên khắc phục sai sót và đóng góp lại..."
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1.5px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              lineHeight: 1.5,
              marginBottom: '10px',
              resize: 'vertical'
            }}
          />

          {errorMsg && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--red-1)',
                border: '1px solid var(--red-2)',
                color: 'var(--red-9)',
                fontSize: '12.5px',
                fontWeight: 600,
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Hủy
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--red-9, #e5484d)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 18px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Xác nhận Từ chối
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
