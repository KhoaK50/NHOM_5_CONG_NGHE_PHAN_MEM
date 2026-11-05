import { useEffect, useRef, useState } from 'react'
import { FileText, Presentation, BookOpen } from 'lucide-react'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { getApiBaseUrl, getAuthToken } from '../../utils/authGuard'

const PREVIEWABLE = ['pdf', 'docx', 'pptx']
// Word, PowerPoint được đọc trọn tệp trong trình duyệt, tệp quá lớn thì hiện biểu tượng
const OFFICE_PREVIEW_LIMIT_BYTES = 15 * 1024 * 1024

async function renderPdfFirstPage(data, canvas, isCancelled, track) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  // Tệp do người dùng tải lên: tắt eval để chặn lỗ hổng CVE-2024-4367 của pdf.js 3.x
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false })
  track.loadingTask = loadingTask
  const pdf = await loadingTask.promise
  const page = await pdf.getPage(1)
  if (isCancelled()) return false
  const viewport = page.getViewport({ scale: 0.42 })
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(viewport.width * dpr)
  canvas.height = Math.round(viewport.height * dpr)
  track.renderTask = page.render({
    canvasContext: canvas.getContext('2d'),
    viewport,
    transform: dpr === 1 ? null : [dpr, 0, 0, dpr, 0, 0]
  })
  await track.renderTask.promise
  return true
}

// Vẽ trang đầu trong shadow DOM để style của tài liệu không ảnh hưởng tới giao diện
async function renderDocxFirstPage(data, host) {
  const { renderAsync } = await import('docx-preview')
  const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
  shadow.replaceChildren()
  const styleBox = document.createElement('div')
  const body = document.createElement('div')
  shadow.append(styleBox, body)
  await renderAsync(data, body, styleBox, {
    inWrapper: false,
    breakPages: true,
    renderFooters: false,
    renderFootnotes: false,
    renderEndnotes: false,
    useBase64URL: true
  })
  const sections = [...body.querySelectorAll('section.docx')]
  if (sections.length === 0) return false
  sections.slice(1).forEach((section) => section.remove())
  const pageWidth = sections[0].offsetWidth || 794
  sections[0].style.margin = '0'
  sections[0].style.boxShadow = 'none'
  body.style.width = `${pageWidth}px`
  body.style.transformOrigin = 'top left'
  body.style.transform = `scale(${host.clientWidth / pageWidth})`
  return true
}

// PowerPoint lưu sẵn ảnh slide đầu trong tệp. Tệp không có ảnh thì giữ biểu tượng.
async function readPptxThumbnail(data) {
  const { default: JSZip } = await import('jszip')
  const zip = await JSZip.loadAsync(data)
  const entry = zip.file('docProps/thumbnail.jpeg') || zip.file('docProps/thumbnail.jpg') || zip.file('docProps/thumbnail.png')
  if (!entry) return null
  return URL.createObjectURL(await entry.async('blob'))
}

export default function DocumentThumbnail({ doc, format }) {
  const hostRef = useRef(null)
  const canvasRef = useRef(null)
  const docxRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [ready, setReady] = useState(false)
  const [slideUrl, setSlideUrl] = useState(null)

  const tooLarge = format !== 'pdf' && Number(doc.fileSizeBytes || 0) > OFFICE_PREVIEW_LIMIT_BYTES
  const canPreview = PREVIEWABLE.includes(format) && Boolean(doc.id) && !tooLarge

  useEffect(() => {
    const node = hostRef.current
    if (!node || !canPreview) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: '180px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [canPreview])

  useEffect(() => {
    if (!visible || !canPreview) return undefined
    const controller = new AbortController()
    const track = {}
    let cancelled = false
    let objectUrl = null

    async function renderPreview() {
      try {
        const token = getAuthToken()
        const response = await fetch(`${getApiBaseUrl()}/api/documents/${doc.id}/preview`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          signal: controller.signal
        })
        if (!response.ok) return
        const data = await response.arrayBuffer()
        if (cancelled) return

        if (format === 'pptx') {
          objectUrl = await readPptxThumbnail(data)
          if (cancelled || !objectUrl) return
          setSlideUrl(objectUrl)
          setReady(true)
          return
        }

        const done = format === 'docx'
          ? await renderDocxFirstPage(data, docxRef.current)
          : await renderPdfFirstPage(data, canvasRef.current, () => cancelled, track)
        if (done && !cancelled) setReady(true)
      } catch {
        // Tệp đọc không được thì giữ biểu tượng định dạng
        if (!cancelled) setReady(false)
      }
    }

    renderPreview()
    return () => {
      cancelled = true
      controller.abort()
      track.renderTask?.cancel()
      track.loadingTask?.destroy()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [visible, canPreview, doc.id, format])

  const Icon = format === 'pptx' ? Presentation : format === 'docx' ? FileText : BookOpen
  const label = format.toUpperCase()

  return (
    <div className="doc-card-preview" ref={hostRef} aria-hidden="true">
      <div className={`doc-card-paper ${format === 'pptx' ? 'is-slide' : ''}`}>
        {format === 'pdf' && <canvas ref={canvasRef} className={ready ? 'is-ready' : ''} />}
        {format === 'docx' && <div ref={docxRef} className={`doc-card-docx ${ready ? 'is-ready' : ''}`} />}
        {slideUrl && <img src={slideUrl} alt="" className="doc-card-slide" />}
        {!ready && <Icon size={38} strokeWidth={1.4} />}
      </div>
      <span className="doc-card-format">{label}</span>
      {doc.pageCount > 0 && <span className="doc-card-page-count">{doc.pageCount} {format === 'pptx' ? 'slide' : 'trang'}</span>}
    </div>
  )
}
