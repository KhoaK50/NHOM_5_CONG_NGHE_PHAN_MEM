import { useState, useRef } from 'react'
import {
  Lock,
  Unlock,
  FileText,
  LogIn,
  ChevronUp,
  ChevronDown,
  Share2,
  Check,
  FileSpreadsheet,
  Presentation,
  ExternalLink,
  Download
} from 'lucide-react'
import { getApiBaseUrl } from '../../utils/authGuard'

export default function PdfPreviewViewer({
  documentItem,
  isAuthenticated = false,
  onRequireLogin,
  onDownload
}) {
  const [zoomMode, setZoomMode] = useState('100') // 'fit' | '100' | '150'
  const [activePageIdx, setActivePageIdx] = useState(0)
  const [copiedLink, setCopiedLink] = useState(false)
  const pageRefs = useRef({})

  if (!documentItem) return null

  const fileExt = (
    documentItem.format ||
    documentItem.fileName?.split('.').pop() ||
    'pdf'
  ).toLowerCase()

  const isOfficeDoc = fileExt === 'docx' || fileExt === 'pptx'
  const streamUrl = `${getApiBaseUrl()}/api/documents/${documentItem.id}/preview`
  const allPages = documentItem.pages || []
  const visiblePages = isAuthenticated ? allPages : allPages.slice(0, 3)
  const totalNavigable = isAuthenticated ? visiblePages.length : visiblePages.length + 1
  const safePageIdx = Math.min(activePageIdx, Math.max(0, totalNavigable - 1))

  const jumpToPage = (targetIdx) => {
    const clamped = Math.max(0, Math.min(totalNavigable - 1, targetIdx))
    setActivePageIdx(clamped)
    const node = pageRefs.current[clamped]
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }

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
      {/* Thanh công cụ PDF / Office Viewer */}
      <div className="pdf-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {fileExt === 'docx' ? (
            <FileSpreadsheet size={16} style={{ color: 'var(--blue-9, #0090ff)' }} />
          ) : fileExt === 'pptx' ? (
            <Presentation size={16} style={{ color: 'var(--amber-9, #ffb224)' }} />
          ) : (
            <FileText size={16} style={{ color: 'var(--blue-9, #0090ff)' }} />
          )}

          <span style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '-0.01em', color: 'var(--slate-12, #11181c)' }}>
            {documentItem.fileName}
          </span>

          {isAuthenticated ? (
            <span className="status-badge green">
              <Unlock size={12} />
              <span>PDF xem trước ({documentItem.pageCount} {fileExt === 'pptx' ? 'slide' : 'trang'})</span>
            </span>
          ) : (
            <span className="status-badge amber">
              <Lock size={12} />
              <span>Xem trước 3 / {documentItem.pageCount} {fileExt === 'pptx' ? 'slide' : 'trang'}</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Nút Sao chép liên kết chia sẻ */}
          <button
            type="button"
            onClick={handleCopyShareLink}
            className="btn-ghost"
            title="Sao chép liên kết tài liệu để chia sẻ"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              color: copiedLink ? 'var(--green-9, #30a46c)' : 'var(--text-secondary)',
              backgroundColor: copiedLink ? 'var(--green-1)' : 'var(--bg-surface)'
            }}
          >
            {copiedLink ? <Check size={13} /> : <Share2 size={13} />}
            <span>{copiedLink ? 'Đã chép link!' : 'Chia sẻ'}</span>
          </button>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            title="Mở PDF toàn màn hình trong tab mới"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              textDecoration: 'none'
            }}
          >
            <ExternalLink size={13} />
            <span>Toàn màn hình</span>
          </a>

          <button
            type="button"
            onClick={() => {
              if (isAuthenticated) {
                if (onDownload) onDownload(documentItem)
              } else {
                if (onRequireLogin) onRequireLogin()
              }
            }}
            className="btn-primary"
            title="Tải tập tin PDF gốc về máy tính"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '5px 12px',
              borderRadius: '6px'
            }}
          >
            <Download size={13} />
            <span>Tải về PDF</span>
          </button>

          {!isOfficeDoc && (
            <>
              <span style={{ width: '1px', height: '18px', backgroundColor: 'var(--slate-6, #e6e8eb)' }} />

              {/* Cụm điều hướng chuyển trang */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => jumpToPage(safePageIdx - 1)}
                  disabled={safePageIdx <= 0}
                  aria-label="Trang trước"
                  style={{
                    backgroundColor: 'var(--slate-3, #f0f0f3)',
                    border: '1px solid var(--slate-6, #e6e8eb)',
                    color: 'var(--slate-12, #11181c)',
                    borderRadius: '6px',
                    padding: '5px 7px',
                    cursor: safePageIdx <= 0 ? 'not-allowed' : 'pointer',
                    opacity: safePageIdx <= 0 ? 0.45 : 1,
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  <ChevronUp size={14} />
                </button>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', minWidth: '82px', textAlign: 'center', color: 'var(--slate-12, #11181c)' }}>
                  Trang {safePageIdx + 1} / {documentItem.pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => jumpToPage(safePageIdx + 1)}
                  disabled={safePageIdx >= totalNavigable - 1}
                  aria-label="Trang tiếp theo"
                  style={{
                    backgroundColor: 'var(--slate-3, #f0f0f3)',
                    border: '1px solid var(--slate-6, #e6e8eb)',
                    color: 'var(--slate-12, #11181c)',
                    borderRadius: '6px',
                    padding: '5px 7px',
                    cursor: safePageIdx >= totalNavigable - 1 ? 'not-allowed' : 'pointer',
                    opacity: safePageIdx >= totalNavigable - 1 ? 0.45 : 1,
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <span style={{ width: '1px', height: '18px', backgroundColor: 'var(--slate-6, #e6e8eb)' }} />

              {/* Segmented Zoom Controls: Fit, 100%, 150% */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-muted)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '2px',
                  gap: '2px'
                }}
                role="group"
                aria-label="Điều khiển thu phóng tỉ lệ đọc"
              >
                <button
                  type="button"
                  onClick={() => setZoomMode('fit')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: zoomMode === 'fit' ? 'var(--bg-surface)' : 'transparent',
                    color: zoomMode === 'fit' ? 'var(--primary-base)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Vừa khung
                </button>
                <button
                  type="button"
                  onClick={() => setZoomMode('100')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: zoomMode === '100' ? 'var(--bg-surface)' : 'transparent',
                    color: zoomMode === '100' ? 'var(--primary-base)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomMode('150')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: zoomMode === '150' ? 'var(--bg-surface)' : 'transparent',
                    color: zoomMode === '150' ? 'var(--primary-base)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  150%
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sân khấu hiển thị: Office Document Google Docs Viewer hoặc A4 Paper Sheets */}
      {isOfficeDoc ? (
        <div style={{ padding: '20px', backgroundColor: 'var(--bg-muted)' }}>
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`status-badge ${fileExt === 'docx' ? 'blue' : 'amber'}`}>
                {fileExt.toUpperCase()} • Microsoft {fileExt === 'docx' ? 'Word' : 'PowerPoint'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Đang hiển thị qua Google Docs Viewer Sandbox
              </span>
            </div>

            <a
              href={`https://docs.google.com/viewer?url=${encodeURIComponent(
                documentItem.fileUrl || `https://5share.io.vn/samples/${documentItem.fileName}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '12px',
                color: 'var(--primary-base)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none'
              }}
            >
              <span>Mở tab mới</span>
              <ExternalLink size={13} />
            </a>
          </div>

          <div
            style={{
              position: 'relative',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)',
              backgroundColor: '#ffffff'
            }}
          >
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                documentItem.fileUrl || `https://5share.io.vn/samples/${documentItem.fileName}`
              )}&embedded=true`}
              title={documentItem.title}
              style={{
                width: '100%',
                height: '620px',
                border: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>
        </div>
      ) : (
        <div className="pdf-canvas-stage" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#525659', borderRadius: '8px' }}>
          <div style={{ position: 'relative', width: '100%', minHeight: '820px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', backgroundColor: '#525659' }}>
            <object
              data={`${streamUrl}#toolbar=1&navpanes=1`}
              type="application/pdf"
              style={{ width: '100%', height: '820px', border: 'none', display: 'block' }}
            >
              <iframe
                src={`${streamUrl}#toolbar=1&navpanes=1`}
                title={`Bản xem trước: ${documentItem.title}`}
                loading="lazy"
                style={{ width: '100%', height: '820px', border: 'none', display: 'block', backgroundColor: '#ffffff' }}
              />
            </object>
          </div>

          {!isAuthenticated && (
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--amber-3, #fef3c7)',
                    color: 'var(--amber-9, #d97706)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Lock size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                    Chế độ đọc thử giới hạn (UC06)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Bạn đang xem trước học liệu trực tuyến. Đăng nhập tài khoản Sinh viên / Giảng viên HCMUE để tải về tệp tin gốc và truy cập toàn bộ tài liệu.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={onRequireLogin}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap'
                }}
              >
                <LogIn size={14} />
                <span>Đăng nhập ngay</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
