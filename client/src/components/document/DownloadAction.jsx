import { useState } from 'react'
import { Download, Bookmark, Check, Sparkles, AlertTriangle, LogIn } from 'lucide-react'

export default function DownloadAction({
  documentItem,
  isAuthenticated = false,
  isBookmarked = false,
  onDownload,
  onToggleBookmark,
  onRequireLogin
}) {
  const [showLimitModal, setShowLimitModal] = useState(false)

  if (!documentItem) return null

  const handleDownloadClick = () => {
    if (!isAuthenticated) {
      setShowLimitModal(true)
      return
    }

    if (onDownload) onDownload(documentItem)
  }

  const handleBookmarkClick = async () => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin()
      return
    }
    try { await onToggleBookmark?.(documentItem.id) } catch { /* The app displays the API error. */ }
  }

  const formatKey = (documentItem.format || documentItem.fileName?.split('.').pop() || 'pdf').toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Rate Limiting & Access Status Badge */}
      {!isAuthenticated ? (
        <div
          style={{
            padding: '7px 10px',
            borderRadius: '6px',
            backgroundColor: 'var(--amber-1)',
            border: '1px solid var(--amber-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: 'var(--amber-7)'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <LogIn size={12} />
            <span>Đăng nhập để tải tệp PDF gốc</span>
          </span>
          <span>Miễn phí cho sinh viên</span>
        </div>
      ) : (
        <div
          style={{
            padding: '6px 10px',
            borderRadius: '6px',
            backgroundColor: 'var(--green-1)',
            border: '1px solid var(--green-2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11.5px',
            color: 'var(--green-7)'
          }}
        >
          <Sparkles size={12} />
          <span>Tài khoản Sinh viên: Không giới hạn lượt tải học liệu</span>
        </div>
      )}

      {/* Main Download Button */}
      <button
        type="button"
        className="btn-solid-primary"
        onClick={handleDownloadClick}
        style={{
          width: '100%',
          height: '42px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <Download size={16} />
        <span>
          Tải xuống bản gốc {formatKey} ({documentItem.fileSizeMb} MB • {documentItem.downloadCount} lượt)
        </span>
      </button>

      {/* Bookmark Button */}
      <button
        type="button"
        onClick={handleBookmarkClick}
        style={{
          width: '100%',
          height: '38px',
          borderRadius: '8px',
          border: isBookmarked ? '1.5px solid var(--primary-base)' : '1.5px solid var(--border-subtle)',
          backgroundColor: isBookmarked ? 'var(--blue-1)' : 'var(--bg-surface)',
          color: isBookmarked ? 'var(--primary-base)' : 'var(--text-primary)',
          fontWeight: 700,
          fontSize: '12.5px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '7px'
        }}
      >
        {isBookmarked ? <Check size={15} /> : <Bookmark size={15} />}
        <span>
          {isBookmarked ? 'Đã lưu trong Tủ tài liệu cá nhân' : 'Lưu vào Tủ tài liệu cá nhân'}
        </span>
      </button>

      {/* Modal Alert when 3 guest downloads are exhausted */}
      {showLimitModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Giới hạn tải xuống cho Khách">
          <div
            className="modal-panel"
            style={{
              maxWidth: '440px',
              textAlign: 'center',
              padding: '28px 24px'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--amber-2)',
                color: 'var(--amber-7)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Cần đăng nhập để tải PDF gốc
            </h3>

            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Tệp gốc chỉ được cung cấp cho tài khoản sinh viên đã xác thực. Hãy đăng nhập để tải tài liệu và lưu lại lượt tải trong lịch sử của bạn.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn-solid-primary"
                onClick={() => {
                  setShowLimitModal(false)
                  if (onRequireLogin) onRequireLogin()
                }}
                style={{ width: '100%', height: '42px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <LogIn size={15} />
                <span>Đăng nhập tài khoản HCMUE</span>
              </button>

              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowLimitModal(false)}
                style={{ width: '100%', height: '38px', justifyContent: 'center' }}
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
