import { useState } from 'react'
import { FileText, Share2, Check, FileSpreadsheet, Presentation, ExternalLink } from 'lucide-react'

function getSafeCloudinaryUrl(rawUrl) {
  try {
    const url = new URL(rawUrl || '')
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' ? url.href : null
  } catch {
    return null
  }
}

export default function PdfPreviewViewer({
  documentItem,
  isAuthenticated = false,
  onRequireLogin
}) {
  const [copiedLink, setCopiedLink] = useState(false)

  if (!documentItem) return null

  const fileExt = (
    documentItem.format ||
    documentItem.fileName?.split('.').pop() ||
    'pdf'
  ).toLowerCase()

  const isOfficeDoc = fileExt === 'docx' || fileExt === 'pptx'
  const previewUrl = getSafeCloudinaryUrl(documentItem.previewUrl)
  const pageUnit = fileExt === 'pptx' ? 'slide' : 'trang'
  const FileIcon = fileExt === 'docx' ? FileSpreadsheet : fileExt === 'pptx' ? Presentation : FileText

  const handleCopyShareLink = async () => {
    const shareUrl = `${window.location.origin}/documents/${documentItem.id}`
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const ta = document.createElement('textarea')
        ta.value = shareUrl
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2200)
    } catch {
      // ignore
    }
  }

  return (
    <div className="pdf-sandbox-card">
      <div className="pdf-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <FileIcon size={16} style={{ color: 'var(--primary-base)' }} />
          <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
            {documentItem.fileName}
          </span>
          <span className={`status-badge ${isAuthenticated ? 'green' : 'amber'}`}>
            {isAuthenticated
              ? `${documentItem.pageCount} ${pageUnit}`
              : `Xem trước 3 / ${documentItem.pageCount} ${pageUnit}`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyShareLink}
          className="btn-ghost nav-auth-link"
          title="Sao chép liên kết tài liệu để chia sẻ"
        >
          {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
          <span>{copiedLink ? 'Đã chép liên kết' : 'Chia sẻ'}</span>
        </button>
      </div>

      {isOfficeDoc && documentItem.fileUrl ? (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-muted)' }}>
          <a
            href={`https://docs.google.com/viewer?url=${encodeURIComponent(documentItem.fileUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '13px',
              color: 'var(--primary-base)',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '12px',
              textDecoration: 'none'
            }}
          >
            <span>Mở trong tab mới</span>
            <ExternalLink size={13} />
          </a>
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(documentItem.fileUrl)}&embedded=true`}
            title={documentItem.title}
            style={{ display: 'block', width: '100%', height: '620px', border: 0, background: '#fff' }}
          />
        </div>
      ) : !isOfficeDoc && previewUrl ? (
        <div className="pdf-canvas-stage" style={{ padding: 0 }}>
          <iframe
            src={`${previewUrl}#toolbar=1&navpanes=0`}
            title={`Bản xem trước: ${documentItem.title}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{ width: '100%', minHeight: '760px', border: 0, background: '#fff' }}
          />
        </div>
      ) : (
        <div className="empty-state-box" role="status">
          Tài liệu này chưa có bản xem trước.
        </div>
      )}

      {!isAuthenticated && (
        <div className="pdf-guest-note">
          <span>Đăng nhập để đọc toàn văn và tải tài liệu.</span>
          <button type="button" className="btn-ghost nav-auth-link" onClick={onRequireLogin}>
            Đăng nhập
          </button>
        </div>
      )}
    </div>
  )
}
