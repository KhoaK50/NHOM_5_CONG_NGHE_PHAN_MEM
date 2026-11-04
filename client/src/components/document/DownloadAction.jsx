import { Download, Bookmark, Check, LogIn } from 'lucide-react'

export default function DownloadAction({
  documentItem,
  isAuthenticated = false,
  canBookmark = false,
  isBookmarked = false,
  onDownload,
  onToggleBookmark,
  onRequireLogin
}) {
  if (!documentItem) return null

  if (!isAuthenticated) {
    return (
      <button type="button" className="btn-solid-primary detail-action" onClick={onRequireLogin}>
        <LogIn size={16} />
        <span>Đăng nhập để tải tài liệu</span>
      </button>
    )
  }

  const handleBookmarkClick = async () => {
    try { await onToggleBookmark?.(documentItem.id) } catch { /* The app displays the API error. */ }
  }

  return (
    <div className="detail-actions">
      <button type="button" className="btn-solid-primary detail-action" onClick={() => onDownload?.(documentItem)}>
        <Download size={16} />
        <span>Tải xuống</span>
      </button>

      {canBookmark && (
        <button type="button" className="btn-ghost detail-action" onClick={handleBookmarkClick} aria-pressed={isBookmarked}>
          {isBookmarked ? <Check size={15} /> : <Bookmark size={15} />}
          <span>{isBookmarked ? 'Đã lưu' : 'Lưu tài liệu'}</span>
        </button>
      )}
    </div>
  )
}
