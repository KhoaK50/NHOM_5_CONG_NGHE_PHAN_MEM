import { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import {
  FileText,
  Presentation,
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
import { getApiBaseUrl, getAuthToken } from '../../utils/authGuard'
import PptxSlides from './PptxSlides'
import { downloadDocument } from '../../utils/interactionApi'

// Cấu hình worker chuẩn của Mozilla PDF.js
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
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
          color: 'var(--text-secondary)',
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
          boxShadow: 'none',
          borderRadius: '3px',
          backgroundColor: 'var(--bg-paper)',
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
/**
 * Trình xem trước nội bộ dành cho tệp tin văn phòng (.docx và .pptx),
 * không phụ thuộc vào Google Docs Viewer tránh lỗi tự tải file "viewer" trên Chrome.
 */
// Khách vãng lai chỉ xem thử 3 slide đầu, giống giới hạn 3 trang PDF của UC06
const GUEST_PREVIEW_SLIDES = 3

function OfficePreviewViewer({ documentItem, fileExt, streamUrl, handleDownload, isAuthenticated = false, onRequireLogin }) {
  const docxContainerRef = useRef(null)
  const docxHostRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pptxThumbnail, setPptxThumbnail] = useState(null)
  const [pptxDeck, setPptxDeck] = useState(null)
  const [docxRenderCount, setDocxRenderCount] = useState(0)

  // Trang Word có bề rộng cố định (A4 ≈ 794px) nên rộng hơn khung xem ở trang Kiểm duyệt.
  // Thu nhỏ cả trang cho vừa khung thay vì để trang tràn và bị cắt mất lề trái.
  useEffect(() => {
    const host = docxHostRef.current
    const container = docxContainerRef.current
    if (fileExt !== 'docx' || !host || !container || docxRenderCount === 0) return undefined

    const fitPagesToWidth = () => {
      const wrapper = container.querySelector('.docx-preview-body-wrapper')
      if (!wrapper) return
      wrapper.style.zoom = ''
      const sections = Array.from(wrapper.querySelectorAll('section.docx-preview-body'))
      const pageWidth = Math.max(0, ...sections.map((section) => section.offsetWidth))
      const hostStyle = window.getComputedStyle(host)
      const available =
        host.clientWidth - parseFloat(hostStyle.paddingLeft || 0) - parseFloat(hostStyle.paddingRight || 0)
      if (pageWidth > 0 && available > 0 && pageWidth > available) {
        wrapper.style.zoom = String(Math.max(0.3, available / pageWidth))
      }
    }

    fitPagesToWidth()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() => fitPagesToWidth())
    observer.observe(host)
    return () => observer.disconnect()
  }, [docxRenderCount, fileExt])

  const onDownloadClick = async () => {
    if (documentItem?.fileUrl && documentItem.status !== 'APPROVED') {
      const link = document.createElement('a')
      link.href = documentItem.fileUrl
      link.download = documentItem.fileName || `document-${documentItem.id}`
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      link.remove()
      return
    }
    if (handleDownload) {
      await handleDownload()
    } else if (documentItem?.fileUrl) {
      window.open(documentItem.fileUrl, '_blank')
    }
  }

  useEffect(() => {
    let isCancelled = false
    let deckToDispose = null

    async function loadOfficeContent() {
      setLoading(true)
      setError(null)
      setPptxThumbnail(null)
      setPptxDeck(null)
      try {
        const token = getAuthToken()
        const headers = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        // Thử cả fileUrl lưu trữ trực tiếp (dành cho Admin thẩm định) và streamUrl
        const candidateUrls = [documentItem?.fileUrl, streamUrl].filter(Boolean)
        if (candidateUrls.length === 0) throw new Error('Không tìm thấy đường dẫn tệp.')

        let arrayBuffer = null
        let lastError = null

        for (const url of candidateUrls) {
          try {
            const resp = await fetch(url, url === streamUrl ? { headers } : {})
            if (resp.ok) {
              arrayBuffer = await resp.arrayBuffer()
              break
            } else {
              lastError = new Error(`Máy chủ phản hồi HTTP ${resp.status}`)
            }
          } catch (e) {
            lastError = e
          }
        }

        if (!arrayBuffer) {
          throw lastError || new Error('Không thể tải tệp tin từ máy chủ.')
        }
        if (isCancelled) return

        if (fileExt === 'docx') {
          const { renderAsync } = await import('docx-preview')
          setLoading(false)
          // Đợi React mount DOM node container
          await new Promise((resolve) => setTimeout(resolve, 60))
          if (docxContainerRef.current) {
            docxContainerRef.current.innerHTML = ''
            await renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
              className: 'docx-preview-body',
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false
            })
            if (!isCancelled) setDocxRenderCount((count) => count + 1)
          }
        } else if (fileExt === 'pptx') {
          // Dựng từng slide ngay trên trình duyệt; tệp lỗi thì quay về ảnh bìa như trước
          try {
            const { parsePptx } = await import('../../utils/pptxParser')
            const deck = await parsePptx(arrayBuffer, {
              maxSlides: isAuthenticated ? undefined : GUEST_PREVIEW_SLIDES
            })
            if (isCancelled) {
              deck.dispose()
              return
            }
            if (deck.slides.length) {
              deckToDispose = deck
              setPptxDeck(deck)
              setLoading(false)
              return
            }
            deck.dispose()
          } catch (parseError) {
            console.warn('[OfficePreviewViewer] Không dựng được slide, dùng ảnh bìa:', parseError)
          }
          const { default: JSZip } = await import('jszip')
          const zip = await JSZip.loadAsync(arrayBuffer)
          const entry =
            zip.file('docProps/thumbnail.jpeg') ||
            zip.file('docProps/thumbnail.jpg') ||
            zip.file('docProps/thumbnail.png')
          if (entry) {
            const blob = await entry.async('blob')
            if (!isCancelled) setPptxThumbnail(URL.createObjectURL(blob))
          }
          if (!isCancelled) setLoading(false)
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[OfficePreviewViewer]', err)
          setError(err.message || 'Không thể tạo bản xem trước trực tiếp.')
          setLoading(false)
        }
      }
    }

    loadOfficeContent()
    return () => {
      isCancelled = true
      // Giải phóng ảnh slide đã tạo trong bộ nhớ trình duyệt
      if (deckToDispose) deckToDispose.dispose()
    }
  }, [documentItem?.id, documentItem?.fileUrl, streamUrl, fileExt, isAuthenticated])

  return (
    <div className="pdf-sandbox-card" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--line-default)', backgroundColor: 'var(--bg-surface)' }}>
      {/* Thanh tiêu đề & Tải tệp */}
      <div style={{ padding: '12px 18px', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-default)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {fileExt === 'pptx' ? <Presentation size={18} style={{ color: 'var(--primary-base)', flexShrink: 0 }} /> : <FileText size={18} style={{ color: 'var(--primary-base)', flexShrink: 0 }} />}
          <span style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{documentItem?.fileName || documentItem?.title}</span>
        </div>
        <button
          type="button"
          onClick={onDownloadClick}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--primary-base)', color: 'var(--text-on-brand)', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
        >
          <Download size={14} />
          <span>Tải tệp gốc</span>
        </button>
      </div>

      {/* Trạng thái tải */}
      {loading && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--primary-base)' }} />
          <p style={{ fontSize: '13px', fontWeight: 500 }}>Đang phân tích và hiển thị nội dung tài liệu...</p>
        </div>
      )}

      {/* Trạng thái lỗi */}
      {error && !loading && (
        <div style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: 'var(--bg-surface)' }}>
          <AlertCircle size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 10px' }} />
          <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>Bản xem trước trực tiếp chưa khả dụng cho tệp này</p>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Vui lòng bấm nút <strong>Tải tệp gốc</strong> ở góc trên để mở và xem đầy đủ bằng Microsoft {fileExt === 'pptx' ? 'PowerPoint' : 'Word'}.</p>
          <button
            type="button"
            onClick={onDownloadClick}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--primary-base)', color: 'var(--text-on-brand)', border: 'none', padding: '8px 18px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
          >
            <Download size={15} />
            <span>Tải tệp gốc ngay</span>
          </button>
        </div>
      )}

      {/* Hiển thị Word (.docx) */}
      {!error && fileExt === 'docx' && (
        <div
          ref={docxHostRef}
          className="docx-viewer-host"
          style={{
            width: '100%',
            maxHeight: '720px',
            overflow: 'auto',
            backgroundColor: 'var(--bg-muted)',
            padding: '24px 16px',
            display: loading ? 'none' : 'block'
          }}
        >
          <div ref={docxContainerRef} style={{ width: '100%' }} />
        </div>
      )}

      {/* Hiển thị PowerPoint (.pptx): dựng từng slide */}
      {!loading && !error && fileExt === 'pptx' && pptxDeck && (
        <div
          className="pptx-viewer-host"
          style={{ width: '100%', maxHeight: '720px', overflow: 'auto', backgroundColor: 'var(--bg-muted)', padding: '20px 16px' }}
        >
          <PptxSlides deck={pptxDeck} />
          {pptxDeck.totalSlides > pptxDeck.slides.length && (
            <div
              style={{ maxWidth: '560px', margin: '20px auto 0', padding: '18px 20px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--line-default)', borderRadius: '10px' }}
            >
              <Lock size={20} style={{ color: 'var(--status-warning)', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Xem trước {pptxDeck.slides.length}/{pptxDeck.totalSlides} slide
              </p>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: onRequireLogin ? '12px' : 0 }}>
                Đăng nhập để xem toàn bộ {pptxDeck.totalSlides} slide và tải tệp gốc.
              </p>
              {onRequireLogin && (
                <button
                  type="button"
                  onClick={onRequireLogin}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--primary-base)', color: 'var(--text-on-brand)', border: 'none', padding: '8px 18px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
                >
                  <LogIn size={15} />
                  <span>Đăng nhập</span>
                </button>
              )}
            </div>
          )}
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', margin: '16px 0 0' }}>
            Bản xem nhanh có thể khác bản gốc về phông chữ và hiệu ứng. Bấm <strong>Tải tệp gốc</strong> để trình chiếu đầy đủ.
          </p>
        </div>
      )}

      {/* Dự phòng khi không dựng được slide: ảnh bìa và nút tải */}
      {!loading && !error && fileExt === 'pptx' && !pptxDeck && (
        <div style={{ padding: '32px 20px', textAlign: 'center', backgroundColor: 'var(--bg-canvas)' }}>
          {pptxThumbnail ? (
            <div style={{ maxWidth: '640px', margin: '0 auto 20px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid var(--line-default)' }}>
              <img src={pptxThumbnail} alt="Slide trang bìa" style={{ width: '100%', display: 'block' }} />
            </div>
          ) : (
            <div style={{ maxWidth: '400px', margin: '0 auto 20px', padding: '32px 20px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--line-default)' }}>
              <Presentation size={48} style={{ color: 'var(--primary-base)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>Tài liệu trình chiếu PowerPoint</p>
            </div>
          )}
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Học liệu PowerPoint dạng slide bài giảng. Bấm bên dưới để tải và trình chiếu với hiệu ứng nguyên bản:
          </p>
          <button
            type="button"
            onClick={onDownloadClick}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--primary-base)', color: 'var(--text-on-brand)', border: 'none', padding: '9px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
          >
            <Download size={16} />
            <span>Tải tệp slide (.pptx) về máy</span>
          </button>
        </div>
      )}
    </div>
  )
}

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
        const token = getAuthToken()
        const headers = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(streamUrl, {
          headers
        })

        if (!response.ok) {
          throw new Error(
            `Không thể tải tệp tin xem trước (Máy chủ phản hồi HTTP ${response.status})`
          )
        }

        const arrayBuffer = await response.arrayBuffer()
        if (!isMounted) return

        const loadingTask = pdfjsLib.getDocument({
          // Tệp do người dùng tải lên: không cho pdf.js chạy eval
          isEvalSupported: false,
          data: new Uint8Array(arrayBuffer),
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
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
  // Khách chỉ nhận 3 trang từ máy chủ, tổng số trang lấy từ thông tin tài liệu
  const totalPages = isAuthenticated ? numPages : Math.max(numPages, Number(documentItem.pageCount) || 0)
  const maxAccessiblePages = isAuthenticated ? numPages : Math.min(3, numPages)
  const isCappedForGuest = !isAuthenticated && totalPages > 3

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
  const handleDownload = async () => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin()
      return
    }
    if (onDownload) {
      onDownload(documentItem)
      return
    }
    // Nếu là Admin thẩm định hoặc tài liệu chưa phát hành (PENDING/REJECTED), tải trực tiếp từ fileUrl lưu trữ
    if (documentItem?.fileUrl && documentItem.status !== 'APPROVED') {
      const link = document.createElement('a')
      link.href = documentItem.fileUrl
      link.download = documentItem.fileName || `document-${documentItem.id}`
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      link.remove()
      return
    }
    try {
      await downloadDocument(documentItem.id, documentItem.fileName)
    } catch (err) {
      console.error('[PdfPreviewViewer] Lỗi tải tài liệu:', err)
      if (documentItem?.fileUrl) {
        window.open(documentItem.fileUrl, '_blank')
      }
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

  // Hiển thị tệp Office (DOCX / PPTX) bằng trình xem nội bộ
  if (isOfficeDoc) {
    return (
      <OfficePreviewViewer
        documentItem={documentItem}
        fileExt={fileExt}
        streamUrl={streamUrl}
        handleDownload={handleDownload}
        isAuthenticated={isAuthenticated}
        onRequireLogin={onRequireLogin}
      />
    )
  }

  return (
    <div
      ref={viewerContainerRef}
      className="pdf-sandbox-card"
      style={{
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--line-default)',
        backgroundColor: 'var(--bg-surface)',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* THANH CÔNG CỤ CHUẨN CHROME PDF VIEWER (DARK SLATE TOOLBAR) */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          minHeight: '48px',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          borderBottom: '1px solid var(--line-default)',
          userSelect: 'none'
        }}
      >
        {/* Nhóm trái: Tiêu đề tệp & Trạng thái phân quyền */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <FileText size={18} style={{ color: 'var(--primary-base)', flexShrink: 0 }} />
          <span
            title={documentItem.fileName}
            style={{
              fontWeight: 600,
              fontSize: '13px',
              color: 'var(--text-primary)',
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
                backgroundColor: 'var(--status-success-soft)',
                color: 'var(--status-success)',
                border: '1px solid var(--status-success)',
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
                backgroundColor: 'var(--status-warning-soft)',
                color: 'var(--status-warning)',
                border: '1px solid var(--status-warning)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <Lock size={11} />
              <span>Xem trước 3 / {totalPages || '...'} trang</span>
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
              backgroundColor: 'var(--bg-muted)',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid var(--line-default)'
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
                color: currentPage <= 1 ? 'var(--disabled-text)' : 'var(--text-primary)',
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
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--line-strong)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                padding: '2px 0',
                outline: 'none'
              }}
            />

            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
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
                color: currentPage >= maxAccessiblePages ? 'var(--disabled-text)' : 'var(--text-primary)',
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
              color: 'var(--text-primary)',
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
              color: 'var(--text-primary)',
              minWidth: '42px',
              textAlign: 'center',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-muted)',
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
              color: 'var(--text-primary)',
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
              color: 'var(--text-primary)',
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
              color: 'var(--text-primary)',
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
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--line-strong)', margin: '0 4px' }} />

          {/* Nút In ấn */}
          <button
            type="button"
            onClick={handlePrint}
            title="In ấn tài liệu"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
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
              color: copiedLink ? 'var(--status-success)' : 'var(--text-primary)',
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
              backgroundColor: 'var(--primary-base)',
              border: 'none',
              color: 'var(--text-on-brand)',
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
          backgroundColor: 'var(--bg-muted)',
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
              color: 'var(--text-primary)'
            }}
          >
            <Loader2 size={36} className="spin" style={{ color: 'var(--primary-base)', marginBottom: '14px' }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Đang chuẩn bị hiển thị học liệu...</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
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
              color: 'var(--text-primary)',
              textAlign: 'center',
              padding: '24px'
            }}
          >
            <AlertCircle size={44} style={{ color: 'var(--status-danger)', marginBottom: '12px' }} />
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
              Không thể hiển thị bản xem trước trực tiếp
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', maxWidth: '420px', marginBottom: '20px' }}>
              {loadError}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href={documentItem.fileUrl || streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'var(--bg-hover)',
                  color: 'var(--text-primary)',
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
                  backgroundColor: 'var(--primary-base)',
                  color: 'var(--text-on-brand)',
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
                  backgroundColor: 'var(--bg-muted)',
                  borderRadius: '12px',
                  border: '1px solid var(--line-default)',
                  boxShadow: 'none',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--status-warning-soft)',
                    color: 'var(--status-warning)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px auto'
                  }}
                >
                  <Lock size={24} />
                </div>

                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Giới hạn xem trước 3/{totalPages} trang (Quy định UC06)
                </div>

                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
                  Bạn đang trải nghiệm chế độ đọc thử dành cho <strong>Khách vãng lai</strong>. Để tiếp tục đọc toàn văn{' '}
                  <strong>từ trang 4 đến trang {totalPages}</strong> cũng như tải tệp tin gốc về máy cá nhân, vui lòng đăng nhập
                  bằng tài khoản Sinh viên / Giảng viên HCMUE.
                </p>

                <button
                  type="button"
                  onClick={onRequireLogin}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: 'var(--primary-base)',
                    color: 'var(--text-on-brand)',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: 'none'
                  }}
                >
                  <LogIn size={16} />
                  <span>Đăng nhập để xem trọn vẹn {totalPages} trang</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
