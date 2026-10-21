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
  ExternalLink
} from 'lucide-react'

export default function PdfPreviewViewer({
  documentItem,
  isAuthenticated = false,
  onRequireLogin
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

  const lockedPreviewPage = allPages[3] || {
    pageNumber: 4,
    heading: 'TRANG 4: HOẠT ĐỘNG 3 (LUYỆN TẬP TẠI PHÒNG MÁY) & PHIẾU HỌC TẬP SỐ 2',
    content: [
      '3. HOẠT ĐỘNG 3: LUYỆN TẬP (12 phút):',
      '• Bài tập thực hành 1: Viết hàm kiểm tra tính hợp lệ của dữ liệu đầu vào theo bộ kiểm thử chuẩn.',
      '• Bài tập thực hành 2: Tổ chức thảo luận nhóm đôi tại phòng máy và đối chiếu bảng Rubric đánh giá.',
      '• Bộ Test Case chấm điểm tự động và hướng dẫn giải chi tiết từng bước.'
    ]
  }

  // Calculate zoom styles
  const zoomStyles = {
    fit: { maxWidth: '100%', fontSize: '13px' },
    '100': { maxWidth: '780px', fontSize: '14px' },
    '150': { maxWidth: '1040px', fontSize: '16.5px' }
  }[zoomMode] || { maxWidth: '780px', fontSize: '14px' }

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
              <span>Toàn văn ({documentItem.pageCount} {fileExt === 'pptx' ? 'slide' : 'trang'})</span>
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
        <div className="pdf-canvas-stage">
          {visiblePages.map((page, idx) => (
            <div
              key={page.pageNumber}
              ref={(el) => {
                pageRefs.current[idx] = el
              }}
              className="pdf-page-sheet doc-body-preview"
              style={{
                maxWidth: zoomStyles.maxWidth,
                fontSize: zoomStyles.fontSize,
                fontFamily: "var(--font-academic, 'STIX Two Text', serif)"
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '12px',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <strong style={{ color: 'var(--primary-base)', fontSize: '12.5px', letterSpacing: '0.01em' }}>
                  {page.heading}
                </strong>
                <span className="status-badge slate">
                  Trang {page.pageNumber} / {documentItem.pageCount}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  color: 'var(--text-primary)',
                  fontFamily: "var(--font-academic, 'STIX Two Text', serif)"
                }}
              >
                {page.content.map((line, lineIdx) => (
                  <p key={lineIdx} style={{ margin: 0, lineHeight: 1.68 }}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {/* Trang 4 phủ mờ tự nhiên kèm thẻ mở khóa cho Khách */}
          {!isAuthenticated && (
            <div
              ref={(el) => {
                pageRefs.current[visiblePages.length] = el
              }}
              className="pdf-blurred-page-container doc-body-preview"
              style={{
                maxWidth: zoomStyles.maxWidth,
                fontFamily: "var(--font-academic, 'STIX Two Text', serif)"
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '12px',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}
              >
                <strong style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                  {lockedPreviewPage.heading}
                </strong>
                <span className="status-badge amber">
                  <Lock size={11} />
                  <span>Trang 4–{documentItem.pageCount}</span>
                </span>
              </div>

              <div
                className="pdf-blurred-content"
                aria-hidden="true"
                style={{ fontFamily: "var(--font-academic, 'STIX Two Text', serif)" }}
              >
                {lockedPreviewPage.content.map((line, idx) => (
                  <p key={idx} style={{ margin: '0 0 10px 0', lineHeight: 1.7 }}>
                    {line}
                  </p>
                ))}
                <p style={{ margin: '0 0 10px 0', lineHeight: 1.7 }}>
                  4. HOẠT ĐỘNG 4: VẬN DỤNG THỰC TIỄN (8 phút) • Bảng tiêu chí đánh giá Rubric theo Thông tư 22/2021/TT-BGDĐT và hướng dẫn tổ chức kiểm tra tại phòng thực hành máy tính.
                </p>
                <p style={{ margin: 0, lineHeight: 1.7 }}>
                  Phụ lục kèm theo: Đáp án chi tiết các câu hỏi phân hóa và mã nguồn mẫu kiểm thử tự động.
                </p>
              </div>

              <div className="pdf-unlock-overlay">
                <div className="pdf-unlock-card">
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, var(--blue-10, #0588f0) 0%, var(--blue-8, #0090ff) 100%)',
                      color: '#ffffff',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px',
                      boxShadow: '0 8px 18px rgba(0, 119, 230, 0.25)'
                    }}
                  >
                    <Lock size={19} />
                  </div>

                  <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Mở khóa toàn văn {documentItem.pageCount} trang học liệu
                  </h3>
                  <p style={{ margin: '0 0 18px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    Bạn đang xem trước 3 trang đầu tiên. Đăng nhập tài khoản Sinh viên 5share để đọc tiếp nội dung Luyện tập, Vận dụng, bảng Rubric và tải tệp gốc.
                  </p>

                  <button
                    type="button"
                    className="btn-solid-primary"
                    onClick={onRequireLogin}
                    style={{
                      width: '100%',
                      height: '40px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <LogIn size={15} />
                    <span>Đăng nhập để đọc toàn văn</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
