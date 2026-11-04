import { useState } from 'react'
import { Flag, X, AlertTriangle } from 'lucide-react'
import { REPORT_REASON_GROUPS } from '../../data/curriculum'
import { BACKEND_PENDING_MESSAGE } from '../../utils/documentCourseApi'

export default function ReportModal({ documentItem, onClose }) {
  const reasonList = REPORT_REASON_GROUPS

  const [reasonGroup, setReasonGroup] = useState(reasonList[0])
  const [details, setDetails] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  if (!documentItem) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!reasonGroup || !details.trim() || details.trim().length < 10) {
      setErrorMsg('Vui lòng chọn lý do và mô tả chi tiết dấu hiệu vi phạm (tối thiểu 10 ký tự).')
      return
    }
    setErrorMsg(BACKEND_PENDING_MESSAGE)
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Báo cáo vi phạm chuẩn mực học thuật">
      <div className="modal-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span className="status-badge red">
            <Flag size={12} />
            <span>Báo cáo vi phạm</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '4px'
            }}
            aria-label="Đóng hộp thoại"
          >
            <X size={18} />
          </button>
        </div>

        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
          Báo cáo tài liệu vi phạm
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Học liệu: <strong>{documentItem.title}</strong> ({documentItem.courseCode})
        </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px'
                }}
              >
                Chọn nhóm lý do phản ánh:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reasonList.map((group) => (
                  <label
                    key={group}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: reasonGroup === group ? '1.5px solid var(--red-6)' : '1px solid var(--border-subtle)',
                      backgroundColor: reasonGroup === group ? 'var(--red-1)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: reasonGroup === group ? 600 : 400
                    }}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={group}
                      checked={reasonGroup === group}
                      onChange={() => setReasonGroup(group)}
                    />
                    <span>{group}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label
                htmlFor="report-details-input"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '6px'
                }}
              >
                Mô tả chi tiết vị trí hoặc nội dung sai phạm (Tối thiểu 10 ký tự):
              </label>
              <textarea
                id="report-details-input"
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Ví dụ: Tại trang 4, đáp án tính sai địa chỉ Broadcast"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  resize: 'vertical'
                }}
              />
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--red-1)',
                  border: '1px solid var(--red-2)',
                  color: 'var(--red-6)',
                  fontSize: '12.5px',
                  marginBottom: '14px',
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
                Gửi báo cáo
              </button>
            </div>
          </form>
      </div>
    </div>
  )
}
