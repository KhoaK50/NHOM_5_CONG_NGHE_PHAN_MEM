import { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  Printer,
  Download,
  Share2,
  Check,
  Lock,
  Unlock,
  LogIn,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { getApiBaseUrl } from '../../utils/authGuard'

// Cấu hình worker chuẩn của Mozilla PDF.js
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

/**
 * Thành phần vẽ từng trang PDF riêng lẻ lên thẻ Canvas
 */
function SinglePdfPage({ pageNumber, pdfDoc, scale, rotation, onPageLoaded }) {
  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)

  useEffect(() => {
    let isCancelled = false

    async function renderPage() {
      if (!pdfDoc || !canvasRef.current) return
      try {
        const page = await pdfDoc.getPage(pageNumber)
        if (isCancelled) return

        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel()
          } catch {
            // bỏ qua
          }
        }

        const viewport = page.getViewport({ scale, rotation })
        const canvas = canvasRef.current
        const context = canvas.getContext('2d', { alpha: false })

        // Hỗ trợ màn hình Retina / HiDPI siêu nét
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null

        const renderContext = {
          canvasContext: context,
          transform,
          viewport
        }

        const task = page.render(renderContext)
        renderTaskRef.current = task
        await task.promise

        if (!isCancelled && onPageLoaded) {
          onPageLoaded(pageNumber, viewport.width, viewport.height)
        }
      } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
          console.warn(`[PDF.js] Lỗi render trang ${pageNumber}:`, err)
        }
      }
    }

    renderPage()

    return () => {
      isCancelled = true
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {
          // bỏ qua
        }
      }
    }
  }, [pdfDoc, pageNumber, scale, rotation, onPageLoaded])

  return (
    <div
      id={`pdf-page-${pageNumber}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '0 auto 20px auto',
        width: '100%',
        position: 'relative'
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: '#9aa0a6',
          marginBottom: '6px',
          userSelect: 'none',
          fontFamily: 'monospace'
        }}
      >
        Trang {pageNumber}
      </div>
      <canvas
        ref={canvasRef}
        style={{
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45), 0 1px 4px rgba(0, 0, 0, 0.3)',
          borderRadius: '3px',
          backgroundColor: '#ffffff',
          display: 'block',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
    </div>
  )
}

/**
 * Trình đọc PDF Enterprise (Chrome PDF Viewer Style - Cụm UC06)
 */
export default function PdfPreviewViewer({
  documentItem,
  isAuthenticated = false,
  onRequireLogin,
  onDownload
}) {
  const [pdfDoc, setPdfDoc] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [inputPage, setInputPage] = useState('1')
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const viewerContainerRef = useRef(null)
  const scrollContainerRef = useRef(null)

  const docId = documentItem?.id
  const fileExt = (
    documentItem?.format ||
    documentItem?.fileName?.split('.').pop() ||
    'pdf'
  ).toLowerCase()

  const isOfficeDoc = fileExt === 'docx' || fileExt === 'pptx'
  const streamUrl = docId ? `${getApiBaseUrl()}/api/documents/${docId}/preview` : ''

  // Tải dữ liệu PDF nhị phân và khởi tạo PDF.js
  useEffect(() => {
    let isMounted = true

    if (!docId || isOfficeDoc) {
      return
    }

    async function loadPdfDocument() {
      setLoading(true)
      setLoadError(null)
      try {
        const token =
          localStorage.getItem('5share_auth_token') ||
          sessionStorage.getItem('5share_auth_token') ||
          localStorage.getItem('5share_access_token')

        const headers = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(streamUrl, {
          headers,
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error(
            `Không thể tải tệp tin xem trước (Máy chủ phản hồi HTTP ${response.status})`
          )
        }

        const arrayBuffer = await response.arrayBuffer()
        if (!isMounted) return

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true
        })

        const doc = await loadingTask.promise
        if (!isMounted) return

        setPdfDoc(doc)
        setNumPages(doc.numPages)
        setLoading(false)

        // Tự động căn chỉnh scale phù hợp với độ rộng container khi trên màn hình nhỏ/mobile
        if (scrollContainerRef.current) {
          const containerWidth = scrollContainerRef.current.clientWidth - 48
          if (containerWidth > 0 && containerWidth < 700) {
            const page1 = await doc.getPage(1)
            const vp = page1.getViewport({ scale: 1.0 })
            const autoScale = Math.min(1.2, Math.max(0.45, containerWidth / vp.width))
            setScale(parseFloat(autoScale.toFixed(2)))
          }
        }
      } catch (err) {
        console.error('[PdfPreviewViewer] Lỗi tải tài liệu PDF:', err)
        if (isMounted) {
          setLoadError(err.message || 'Không thể hiển thị tệp tin PDF.')
          setLoading(false)
        }
      }
    }

    loadPdfDocument()

    return () => {
      isMounted = false
    }
  }, [docId, streamUrl, isOfficeDoc])

  if (!documentItem) return null

  // Giới hạn số trang đọc thử theo quy định UC06: Khách vãng lai tối đa 3 trang
  const maxAccessiblePages = isAuthenticated ? numPages : Math.min(3, numPages)
  const isCappedForGuest = !isAuthenticated && numPages > 3

  // Điều hướng trang
  const handlePageChange = (newPage) => {
    const pageNum = Math.max(1, Math.min(maxAccessiblePages, newPage))
    setCurrentPage(pageNum)
    setInputPage(String(pageNum))

    const targetEl = document.getElementById(`pdf-page-${pageNum}`)
    if (targetEl && scrollContainerRef.current) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleInputPageKeyDown = (e) => {
    if (e.key === 'Enter') {
      const parsed = parseInt(inputPage, 10)
      if (!isNaN(parsed)) {
        handlePageChange(parsed)
      } else {
        setInputPage(String(currentPage))
      }
    }
  }

  // Thu phóng (Zoom)
  const handleZoomIn = () => {
    setScale((prev) => Math.min(2.5, parseFloat((prev + 0.15).toFixed(2))))
  }

  const handleZoomOut = () => {
    setScale((prev) => Math.max(0.5, parseFloat((prev - 0.15).toFixed(2))))
  }

  const handleFitWidth = async () => {
    if (!pdfDoc || !scrollContainerRef.current) return
    try {
      const page = await pdfDoc.getPage(currentPage || 1)
      const vp = page.getViewport({ scale: 1.0, rotation })
      const containerWidth = scrollContainerRef.current.clientWidth - 48
      if (containerWidth > 0) {
        const fitScale = parseFloat((containerWidth / vp.width).toFixed(2))
        setScale(Math.max(0.5, Math.min(2.0, fitScale)))
      }
    } catch {
      setScale(1.0)
    }
  }

  // Xoay chiều tài liệu 90 độ
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  // Toàn màn hình
  const handleToggleFullscreen = () => {
    if (!viewerContainerRef.current) return
    if (!document.fullscreenElement) {
      viewerContainerRef.current.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // In ấn tài liệu (Chỉ áp dụng khi đã đăng nhập)
  const handlePrint = () => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin()
      return
    }
    window.open(streamUrl, '_blank')
  }

  // Tải về (Chặn khách vãng lai theo quy định UC06 / UC12)
  const handleDownload = () => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin()
      return
    }
    if (onDownload) {
      onDownload(documentItem)
    } else {
      window.location.href = `${getApiBaseUrl()}/api/documents/${documentItem.id}/download`
    }
  }

  // Sao chép liên kết chia sẻ
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
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      // bỏ qua
    }
  }

  // Fallback dành cho tệp Office (DOCX / PPTX)
  if (isOfficeDoc) {
    return (
      <div className="pdf-sandbox-card" style={{ borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', backgroundColor: '#323639', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: '#8ab4f8' }} />
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{documentItem.fileName}</span>
          </div>
          <button
            onClick={handleDownload}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#0077e6', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
          >
            <Download size={14} />
            <span>Tải tệp tin gốc</span>
          </button>
        </div>
        <iframe
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(documentItem.fileUrl || streamUrl)}&embedded=true`}
          title={documentItem.title}
          style={{ width: '100%', height: '680px', border: 'none', backgroundColor: '#ffffff' }}
        />
      </div>
    )
  }

  return (
    <div
      ref={viewerContainerRef}
      className="pdf-sandbox-card"
      style={{
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #3c4043',
        backgroundColor: '#323639',
        boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* THANH CÔNG CỤ CHUẨN CHROME PDF VIEWER (DARK SLATE TOOLBAR) */}
      <div
        style={{
          backgroundColor: '#323639',
          color: '#f1f3f4',
          minHeight: '48px',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          borderBottom: '1px solid #202124',
          userSelect: 'none'
        }}
      >
        {/* Nhóm trái: Tiêu đề tệp & Trạng thái phân quyền */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <FileText size={18} style={{ color: '#8ab4f8', flexShrink: 0 }} />
          <span
            title={documentItem.fileName}
            style={{
              fontWeight: 600,
              fontSize: '13px',
              color: '#e8eaed',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '220px'
            }}
          >
            {documentItem.fileName}
          </span>

          {isAuthenticated ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(52, 168, 83, 0.2)',
                color: '#81c995',
                border: '1px solid rgba(52, 168, 83, 0.3)',
                fontWeight: 600
              }}
            >
              <Unlock size={11} />
              <span>Toàn văn • {numPages} trang</span>
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(251, 188, 4, 0.2)',
                color: '#fdd663',
                border: '1px solid rgba(251, 188, 4, 0.3)',
                fontWeight: 600
              }}
            >
              <Lock size={11} />
              <span>Xem trước 3 / {numPages || '...'} trang</span>
            </span>
          )}
        </div>

        {/* Nhóm giữa: Bộ chuyển trang (Pagination Controls) */}
        {numPages > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#202124',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid #3c4043'
            }}
          >
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              title="Trang trước"
              style={{
                background: 'none',
                border: 'none',
                color: currentPage <= 1 ? '#5f6368' : '#e8eaed',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <input
              type="text"
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onKeyDown={handleInputPageKeyDown}
              onBlur={() => setInputPage(String(currentPage))}
              style={{
                width: '32px',
                textAlign: 'center',
                backgroundColor: '#323639',
                border: '1px solid #5f6368',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
                padding: '2px 0',
                outline: 'none'
              }}
            />

            <span style={{ fontSize: '12px', color: '#9aa0a6' }}>
              / {maxAccessiblePages}
            </span>

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= maxAccessiblePages}
              title="Trang tiếp theo"
              style={{
                background: 'none',
                border: 'none',
                color: currentPage >= maxAccessiblePages ? '#5f6368' : '#e8eaed',
                cursor: currentPage >= maxAccessiblePages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Nhóm phải: Zoom, Rotate, Fullscreen, Print, Download, Share */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Zoom controls */}
          <button
            type="button"
            onClick={handleZoomOut}
            title="Thu nhỏ (-)"
            style={{
              background: 'none',
              border: 'none',
              color: '#e8eaed',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ZoomOut size={16} />
          </button>

          <span
            onClick={handleFitWidth}
            title="Bấm để căn vừa trang"
            style={{
              fontSize: '12px',
              color: '#e8eaed',
              minWidth: '42px',
              textAlign: 'center',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '4px',
              backgroundColor: '#202124',
              userSelect: 'none'
            }}
          >
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            title="Phóng to (+)"
            style={{
              background: 'none',
              border: 'none',
              color: '#e8eaed',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ZoomIn size={16} />
          </button>

          <button
            type="button"
            onClick={handleFitWidth}
            title="Căn vừa chiều rộng"
            style={{
              background: 'none',
              border: 'none',
              color: '#e8eaed',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Maximize2 size={15} />
          </button>

          <button
            type="button"
            onClick={handleRotate}
            title="Xoay 90 độ theo chiều kim đồng hồ"
            style={{
              background: 'none',
              border: 'none',
              color: '#e8eaed',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RotateCw size={15} />
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}
            style={{
              background: 'none',
              border: 'none',
              color: '#e8eaed',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <div style={{ width: '1px', height: '18px', backgroundColor: '#5f6368', margin: '0 4px' }} />

          {/* Nút In ấn */}
          <button
            type="button"
            onClick={handlePrint}
            title="In ấn tài liệu"
            style={{
              background: 'none',
              border: 'none',
              color: '#e8eaed',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Printer size={16} />
          </button>

          {/* Nút Sao chép liên kết */}
          <button
            type="button"
            onClick={handleCopyShareLink}
            title="Sao chép link tài liệu"
            style={{
              background: 'none',
              border: 'none',
              color: copiedLink ? '#81c995' : '#e8eaed',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
          </button>

          {/* Nút Tải về */}
          <button
            type="button"
            onClick={handleDownload}
            title="Tải xuống tệp tin gốc (.pdf)"
            style={{
              backgroundColor: '#0077e6',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={14} />
            <span>Tải PDF</span>
          </button>
        </div>
      </div>

      {/* KHÔNG GIAN HIỂN THỊ CÁC TRANG TÀI LIỆU (CANVAS VIEWPORT) */}
      <div
        ref={scrollContainerRef}
        style={{
          backgroundColor: '#525659',
          minHeight: '750px',
          maxHeight: isFullscreen ? 'calc(100vh - 48px)' : '850px',
          overflowY: 'auto',
          overflowX: 'auto',
          padding: '24px 16px',
          position: 'relative'
        }}
      >
        {/* Loading Spinner */}
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              color: '#e8eaed'
            }}
          >
            <Loader2 size={36} className="spin" style={{ color: '#8ab4f8', marginBottom: '14px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Đang chuẩn bị hiển thị học liệu...</div>
            <div style={{ fontSize: '12px', color: '#9aa0a6', marginTop: '4px' }}>
              Giải mã trang tài liệu bằng PDF.js Engine
            </div>
          </div>
        )}

        {/* Thông báo lỗi khi không đọc được file */}
        {loadError && !loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '380px',
              color: '#fff',
              textAlign: 'center',
              padding: '24px'
            }}
          >
            <AlertCircle size={44} style={{ color: '#f28b82', marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
              Không thể hiển thị bản xem trước trực tiếp
            </div>
            <div style={{ fontSize: '13px', color: '#dadce0', maxWidth: '420px', marginBottom: '20px' }}>
              {loadError}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href={streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#3c4043',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  textDecoration: 'none',
                  fontWeight: 600
                }}
              >
                <span>Mở trong tab mới</span>
                <ExternalLink size={14} />
              </a>
              <button
                type="button"
                onClick={handleDownload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#0077e6',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Download size={14} />
                <span>Tải tệp tin về máy</span>
              </button>
            </div>
          </div>
        )}

        {/* Danh sách các trang PDF được render liên tục */}
        {!loading && !loadError && pdfDoc && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {Array.from({ length: maxAccessiblePages }, (_, idx) => idx + 1).map((pageNum) => (
              <SinglePdfPage
                key={`page-${pageNum}-${scale}-${rotation}`}
                pageNumber={pageNum}
                pdfDoc={pdfDoc}
                scale={scale}
                rotation={rotation}
              />
            ))}

            {/* BẢNG KHÓA XEM TRƯỚC 3 TRANG DÀNH CHO KHÁCH VÃNG LAI (UC06) */}
            {isCappedForGuest && (
              <div
                style={{
                  maxWidth: '680px',
                  width: '100%',
                  margin: '16px auto 32px auto',
                  padding: '24px 28px',
                  backgroundColor: '#202124',
                  borderRadius: '12px',
                  border: '1px solid #3c4043',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(251, 188, 4, 0.15)',
                    color: '#fdd663',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px auto'
                  }}
                >
                  <Lock size={24} />
                </div>

                <div style={{ fontSize: '16px', fontWeight: 700, color: '#e8eaed', marginBottom: '8px' }}>
                  Giới hạn xem trước 3/{numPages} trang (Quy định UC06)
                </div>

                <p style={{ fontSize: '13.5px', color: '#9aa0a6', lineHeight: 1.6, marginBottom: '20px' }}>
                  Bạn đang trải nghiệm chế độ đọc thử dành cho <strong>Khách vãng lai</strong>. Để tiếp tục đọc toàn văn{' '}
                  <strong>từ trang 4 đến trang {numPages}</strong> cũng như tải tệp tin gốc về máy cá nhân, vui lòng đăng nhập
                  bằng tài khoản Sinh viên / Giảng viên HCMUE.
                </p>

                <button
                  type="button"
                  onClick={onRequireLogin}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#0077e6',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 119, 230, 0.4)'
                  }}
                >
                  <LogIn size={16} />
                  <span>Đăng nhập để xem trọn vẹn {numPages} trang</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
