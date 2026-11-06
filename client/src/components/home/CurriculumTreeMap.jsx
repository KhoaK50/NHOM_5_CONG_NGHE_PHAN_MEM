import {
  useState,
  useRef,
  useLayoutEffect,
  useMemo,
  useCallback
} from 'react'
import {
  GitBranch,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Move
} from 'lucide-react'
import {
  CURRICULUM_COURSES,
  CURRICULUM_SEMESTERS_META,
  CURRICULUM_OFFICIAL_CONNECTIONS,
  KNOWLEDGE_BLOCKS,
  SEMESTERS
} from '../../data/curriculum'
import { routeCurriculumWires } from '../../utils/curriculumRouting'

// Thứ tự ô trong mỗi cột học kỳ theo đúng sơ đồ CTĐT. Danh sách môn lấy từ API được
// sắp theo mã môn, nếu vẽ theo thứ tự đó thì các ô bị đảo chỗ so với sơ đồ gốc.
const CURRICULUM_ORDER = new Map(CURRICULUM_COURSES.map((c, idx) => [c.code, idx]))

/**
 * Dựng đường dẫn SVG vuông góc (Orthogonal Manhattan / PCB Bus Routing)
 * từ danh sách các điểm gấp khúc (waypoints) với góc bo 90 độ bán kính r.
 */
function buildOrthogonalPath(pts, radius = 6) {
  if (!pts || pts.length < 2) return ''

  const clean = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const prev = clean[clean.length - 1]
    if (Math.abs(pts[i].x - prev.x) > 0.5 || Math.abs(pts[i].y - prev.y) > 0.5) {
      clean.push(pts[i])
    }
  }
  if (clean.length < 2) return ''
  if (clean.length === 2) {
    return `M ${clean[0].x.toFixed(1)} ${clean[0].y.toFixed(1)} L ${clean[1].x.toFixed(1)} ${clean[1].y.toFixed(1)}`
  }

  let d = `M ${clean[0].x.toFixed(1)} ${clean[0].y.toFixed(1)}`
  for (let i = 1; i < clean.length - 1; i++) {
    const p0 = clean[i - 1]
    const p1 = clean[i]
    const p2 = clean[i + 1]

    const vx1 = p1.x - p0.x
    const vy1 = p1.y - p0.y
    const len1 = Math.hypot(vx1, vy1)

    const vx2 = p2.x - p1.x
    const vy2 = p2.y - p1.y
    const len2 = Math.hypot(vx2, vy2)

    const r = Math.min(radius, len1 * 0.45, len2 * 0.45)
    if (r < 1) {
      d += ` L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
      continue
    }

    const startX = p1.x - (vx1 / len1) * r
    const startY = p1.y - (vy1 / len1) * r
    const endX = p1.x + (vx2 / len2) * r
    const endY = p1.y + (vy2 / len2) * r

    d += ` L ${startX.toFixed(1)} ${startY.toFixed(1)} Q ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`
  }

  const last = clean[clean.length - 1]
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`
  return d
}

export default function CurriculumTreeMap({
  courses = [],
  documents = [],
  selectedBlock,
  selectedSemester,
  selectedCourseCode,
  onSelectBlock,
  onSelectSemester,
  onSelectCourse,
  onResetFilters
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isTallViewport, setIsTallViewport] = useState(false)
  const [zoom, setZoom] = useState(0.92)
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredCode, setHoveredCode] = useState(null)
  const [staticWires, setStaticWires] = useState([])
  const [boardHeight, setBoardHeight] = useState(0)

  // Chiều cao lớp SVG phải phủ hết bảng (kể cả rãnh bus dưới đáy), nếu không các
  // đường đi xuống thấp hơn khung mặc định sẽ bị cắt cụt giữa chừng.
  const canvasSize = useMemo(
    () => ({
      width: 2020,
      height: Math.max(isTallViewport ? 980 : 660, Math.ceil(boardHeight))
    }),
    [isTallViewport, boardHeight]
  )

  const viewportRef = useRef(null)
  const boardRef = useRef(null)
  const nodeRefs = useRef({})
  const colRefs = useRef({})
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    moved: false
  })

  const activeCourses = useMemo(() => {
    const rank = (c) => CURRICULUM_ORDER.get(c.code) ?? Number.MAX_SAFE_INTEGER
    // Môn mới (không có trong sơ đồ) xếp cuối cột, theo mã môn
    return courses
      .filter((c) => c.isActive)
      .sort((a, b) => rank(a) - rank(b) || String(a.code).localeCompare(String(b.code)))
  }, [courses])

  const approvedDocs = useMemo(
    () => documents.filter((d) => d.status === 'APPROVED'),
    [documents]
  )

  const docCountByCourse = useMemo(() => {
    const map = {}
    for (const d of approvedDocs) {
      map[d.courseCode] = (map[d.courseCode] || 0) + 1
    }
    return map
  }, [approvedDocs])

  // Môn học đang được tâm điểm (do hover hoặc đang được chọn lọc)
  const focusCode = hoveredCode || (selectedCourseCode !== 'ALL' ? selectedCourseCode : null)

  // Phân tách rõ:
  // - directUpCodes (Tiên quyết trực tiếp 1 bước - màu Vàng Hổ Phách đậm)
  // - directDownCodes (Học tiếp trực tiếp 1 bước - màu Xanh Sapphire đậm)
  // - indirectUpCodes / indirectDownCodes (Chuỗi liên đới xa hơn - nét đứt mảnh)
  const {
    directUpCodes,
    directDownCodes,
    upstreamCodes,
    downstreamCodes
  } = useMemo(() => {
    const directUp = new Set()
    const directDown = new Set()
    const up = new Set()
    const down = new Set()
    if (!focusCode) {
      return {
        directUpCodes: directUp,
        directDownCodes: directDown,
        upstreamCodes: up,
        downstreamCodes: down
      }
    }

    const courseByCode = new Map(activeCourses.map((c) => [c.code, c]))
    const focusCourse = courseByCode.get(focusCode)
    if (focusCourse && Array.isArray(focusCourse.prerequisites)) {
      for (const pre of focusCourse.prerequisites) {
        directUp.add(pre)
      }
    }

    for (const crs of activeCourses) {
      if (Array.isArray(crs.prerequisites) && crs.prerequisites.includes(focusCode)) {
        directDown.add(crs.code)
      }
    }

    const visitUp = (code) => {
      const crs = courseByCode.get(code)
      if (!crs || !Array.isArray(crs.prerequisites)) return
      for (const pre of crs.prerequisites) {
        if (!up.has(pre)) {
          up.add(pre)
          visitUp(pre)
        }
      }
    }

    const visitDown = (code) => {
      for (const crs of activeCourses) {
        if (Array.isArray(crs.prerequisites) && crs.prerequisites.includes(code)) {
          if (!down.has(crs.code)) {
            down.add(crs.code)
            visitDown(crs.code)
          }
        }
      }
    }

    visitUp(focusCode)
    visitDown(focusCode)
    return {
      directUpCodes: directUp,
      directDownCodes: directDown,
      upstreamCodes: up,
      downstreamCodes: down
    }
  }, [focusCode, activeCourses])

  // 1. Tính toán tọa độ tĩnh của mạng lưới mạch nối (Orthogonal Routing)
  // Chỉ chạy khi load dữ liệu, thay đổi zoom hoặc resize cửa sổ. HOÀN TOÀN TÁCH RỜI khỏi sự kiện hover/click để chống giật giật.
  const computeStaticWires = useCallback(() => {
    const boardEl = boardRef.current
    if (!boardEl || !isExpanded) return

    const boardRect = boardEl.getBoundingClientRect()
    const scale = zoom || 1
    const toBoardBox = (r) => ({
      left: (r.left - boardRect.left) / scale,
      right: (r.right - boardRect.left) / scale,
      top: (r.top - boardRect.top) / scale,
      bottom: (r.bottom - boardRect.top) / scale
    })

    const semOrder = CURRICULUM_SEMESTERS_META.map((s) => s.id)
    const colIndexBySem = {}
    const colBounds = []

    semOrder.forEach((semId, idx) => {
      colIndexBySem[semId] = idx
      const colEl = colRefs.current[semId]
      if (colEl) {
        const r = toBoardBox(colEl.getBoundingClientRect())
        colBounds[idx] = { left: r.left, right: r.right }
      }
    })

    const nodeBoxByCode = {}
    const rowTops = {}
    const rowBottoms = {}

    semOrder.forEach((semId) => {
      const semCourses = activeCourses.filter((c) => c.semester === semId)
      let regularIdx = 0
      semCourses.forEach((crs) => {
        const el = nodeRefs.current[crs.code]
        const isStackedSkill = crs.electiveGroup === 'HK2_SKILL'
        const rIdx = isStackedSkill ? 5 : regularIdx
        if (!isStackedSkill) {
          regularIdx += 1
        }
        if (!el || !el.isConnected) return

        const { left, right, top, bottom } = toBoardBox(el.getBoundingClientRect())

        nodeBoxByCode[crs.code] = {
          left,
          right,
          top,
          bottom,
          midX: (left + right) / 2,
          midY: (top + bottom) / 2,
          height: bottom - top,
          colIdx: colIndexBySem[semId],
          rowIdx: rIdx
        }

        if (!isStackedSkill) {
          if (rowTops[rIdx] === undefined || top < rowTops[rIdx]) rowTops[rIdx] = top
          if (rowBottoms[rIdx] === undefined || bottom > rowBottoms[rIdx]) rowBottoms[rIdx] = bottom
        }
      })
    })

    const allBoxes = Object.values(nodeBoxByCode)
    if (!allBoxes.length) {
      setStaticWires([])
      return
    }

    // Khối tự chọn HK2 là vật cản: rãnh ngang không được cắt ngang qua khối này
    const obstacles = []
    const stackEl = boardEl.querySelector('.vec-tree-elective-stack')
    if (stackEl) obstacles.push(toBoardBox(stackEl.getBoundingClientRect()))

    // Rãnh bus trên đỉnh nằm giữa tiêu đề học kỳ và hàng học phần đầu tiên
    const minTop = Math.min(...allBoxes.map((b) => b.top))
    const headerEls = boardEl.querySelectorAll('.vec-tree-sem-header')
    const headerBottom = headerEls.length
      ? Math.max(...Array.from(headerEls, (el) => toBoardBox(el.getBoundingClientRect()).bottom))
      : minTop - 24
    const topBusY = headerBottom < minTop ? (headerBottom + minTop) / 2 : Math.max(6, minTop - 10)

    // Rãnh bus dưới đáy nằm dưới mọi học phần và phía trên các thanh điều kiện tốt nghiệp
    const maxBottom = Math.max(...allBoxes.map((b) => b.bottom), ...obstacles.map((b) => b.bottom))
    const gradEl = boardEl.querySelector('.vec-tree-graduation-bars')
    const gradTop = gradEl ? toBoardBox(gradEl.getBoundingClientRect()).top : Infinity
    const bottomBusY = gradTop - maxBottom > 12 ? (maxBottom + gradTop) / 2 : maxBottom + 18

    const routed = routeCurriculumWires({
      boxes: nodeBoxByCode,
      colBounds,
      rowTops,
      rowBottoms,
      connections: CURRICULUM_OFFICIAL_CONNECTIONS,
      topBusY,
      bottomBusY,
      obstacles
    })

    const computedWires = routed.map((wire) => {
      const first = wire.points[0]
      const last = wire.points[wire.points.length - 1]
      return {
        id: wire.id,
        from: wire.from,
        to: wire.to,
        connType: wire.connType,
        x1: first.x,
        y1: first.y,
        x2: last.x,
        y2: last.y,
        d: buildOrthogonalPath(wire.points, 6)
      }
    })

    setBoardHeight(boardEl.offsetHeight)
    setStaticWires(computedWires)
  }, [activeCourses, isExpanded, zoom])

  // Chỉ kích hoạt đo đạc lại DOM khi kích thước layout thực sự thay đổi
  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      computeStaticWires()
    }, 40)
    const handleResize = () => computeStaticWires()
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [computeStaticWires])

  // 2. Phân loại vai trò dây dẫn (Highlighting) tức thì trong bộ nhớ — KHÔNG ĐO DOM, KHÔNG GÂY GIẬT KHUNG HÌNH
  const edges = useMemo(() => {
    if (!staticWires.length) return []
    const mapped = staticWires.map((wire) => {
      let wireRole = 'idle'
      if (focusCode) {
        if (wire.to === focusCode && directUpCodes.has(wire.from)) {
          wireRole = 'direct-pre' // Môn tiên quyết trực tiếp dẫn vào môn đang chọn (Vàng Hổ Phách đậm)
        } else if (wire.from === focusCode && directDownCodes.has(wire.to)) {
          wireRole = 'direct-next' // Từ môn đang chọn dẫn trực tiếp sang môn kế tiếp (Xanh Sapphire đậm)
        } else if (
          (upstreamCodes.has(wire.from) && upstreamCodes.has(wire.to)) ||
          (downstreamCodes.has(wire.from) && downstreamCodes.has(wire.to))
        ) {
          wireRole = 'chain' // Chuỗi liên đới xa hơn (Nét đứt mảnh)
        } else {
          wireRole = 'dimmed'
        }
      }

      const priority =
        wireRole === 'direct-pre' || wireRole === 'direct-next'
          ? 3
          : wireRole === 'chain'
            ? 2
            : wireRole === 'idle'
              ? 1
              : 0

      return {
        ...wire,
        wireRole,
        priority
      }
    })

    return mapped.sort((a, b) => a.priority - b.priority)
  }, [
    staticWires,
    focusCode,
    directUpCodes,
    directDownCodes,
    upstreamCodes,
    downstreamCodes
  ])

  // Xử lý Kéo chuột để di chuyển bản đồ (Drag-to-Pan)
  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    const vp = viewportRef.current
    if (!vp) return
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: vp.scrollLeft,
      scrollTop: vp.scrollTop,
      moved: false
    }
    setIsDragging(true)
  }

  const handleMouseMove = (e) => {
    const st = dragStateRef.current
    if (!st.active) return
    const vp = viewportRef.current
    if (!vp) return

    const dx = e.clientX - st.startX
    const dy = e.clientY - st.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      st.moved = true
    }
    vp.scrollLeft = st.scrollLeft - dx
    vp.scrollTop = st.scrollTop - dy
  }

  const handleMouseUp = () => {
    if (dragStateRef.current.active) {
      dragStateRef.current.active = false
      setIsDragging(false)
    }
  }

  // Hỗ trợ giữ Ctrl/Alt + Lăn chuột để Zoom mượt mà
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.08 : -0.08
      setZoom((z) => Math.min(1.45, Math.max(0.55, Number((z + delta).toFixed(2)))))
    }
  }

  const handleFitToViewport = () => {
    const vp = viewportRef.current
    if (!vp) return
    const fitScale = Math.min(1, Math.max(0.56, (vp.clientWidth - 40) / 1980))
    setZoom(Number(fitScale.toFixed(2)))
    vp.scrollLeft = 0
    vp.scrollTop = 0
  }

  const handleCourseClick = (crs) => {
    if (dragStateRef.current.moved) return
    if (selectedCourseCode === crs.code) {
      onSelectCourse('ALL')
    } else {
      onSelectCourse(crs.code)
    }
  }

  const handleSemesterHeaderClick = (semId) => {
    if (dragStateRef.current.moved) return
    if (selectedSemester === semId) {
      onSelectSemester(SEMESTERS[0])
    } else {
      onSelectSemester(semId)
    }
  }

  return (
    <section
      className="vec-curriculum-map"
      aria-label="Sơ đồ Cây Chương trình Đào tạo Tương tác 8 Học kỳ"
    >
      {/* Thanh tiêu đề, chú giải mạch nối & bộ công cụ Zoom / Fit / Pan */}
      <header className="vec-tree-header">
        <div className="vec-tree-title-group">
          <span className="vec-tree-icon-badge" aria-hidden="true">
            <GitBranch size={14} />
          </span>
          <div>
            <h2 className="vec-tree-title">
              Cây Chương trình Đào tạo Cử nhân Sư phạm Tin học (8 Học kỳ • 47 Học phần • 124 TC)
            </h2>
            <div className="vec-tree-legend-row">
              <span className="vec-legend-item">
                <span className="vec-legend-line pre" />
                <span>Tiên quyết trực tiếp</span>
              </span>
              <span className="vec-legend-item">
                <span className="vec-legend-line next" />
                <span>Học tiếp trực tiếp</span>
              </span>
              <span className="vec-legend-item">
                <span className="vec-legend-line chain" />
                <span>Mạch liên đới</span>
              </span>
              <span className="vec-legend-hint">
                <Move size={11} /> Kéo nền để di chuyển • Nhấp chọn môn để lọc tài liệu
              </span>
            </div>
          </div>
        </div>

        <div className="vec-tree-controls">
          {/* Lọc sáng theo 4 Khối kiến thức chuẩn FR-03 */}
          <div className="vec-tree-block-pills" role="group" aria-label="Lọc sơ đồ theo khối kiến thức">
            {KNOWLEDGE_BLOCKS.map((blk) => {
              const label = blk === KNOWLEDGE_BLOCKS[0] ? 'Tất cả khối' : blk
              return (
                <button
                  key={blk}
                  type="button"
                  className={`vec-tree-block-btn ${selectedBlock === blk ? 'active' : ''}`}
                  onClick={() => onSelectBlock(blk)}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Cụm điều khiển Thu phóng (Zoom) & Vừa khung (Fit View) */}
          {isExpanded && (
            <div className="vec-zoom-toolbar" role="group" aria-label="Điều khiển thu phóng bản đồ">
              <button
                type="button"
                className="vec-zoom-btn"
                onClick={() =>
                  setZoom((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))))
                }
                title="Thu nhỏ sơ đồ"
                aria-label="Thu nhỏ sơ đồ"
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                className="vec-zoom-pct"
                onClick={() => setZoom(0.92)}
                title="Đặt lại tỷ lệ chuẩn"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                className="vec-zoom-btn"
                onClick={() =>
                  setZoom((z) => Math.min(1.45, Number((z + 0.1).toFixed(2))))
                }
                title="Phóng to sơ đồ"
                aria-label="Phóng to sơ đồ"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                className="vec-zoom-fit-btn"
                onClick={handleFitToViewport}
                title="Thu gọn vừa khít toàn bộ 8 học kỳ trong khung nhìn"
              >
                Vừa khung
              </button>
              <button
                type="button"
                className="vec-zoom-btn"
                onClick={() => setIsTallViewport((v) => !v)}
                title={isTallViewport ? 'Thu nhỏ chiều cao khung' : 'Mở rộng chiều cao khung bản đồ'}
                aria-label="Mở rộng khung bản đồ"
              >
                {isTallViewport ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </div>
          )}

          {(selectedCourseCode !== 'ALL' ||
            selectedBlock !== KNOWLEDGE_BLOCKS[0] ||
            selectedSemester !== SEMESTERS[0]) && (
            <button
              type="button"
              className="saas-reset-btn"
              onClick={onResetFilters}
              title="Đặt lại lựa chọn trên sơ đồ"
            >
              <RotateCcw size={11} />
              <span>Đặt lại</span>
            </button>
          )}

          <button
            type="button"
            className="vec-tree-toggle-btn"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
          >
            <span>{isExpanded ? 'Thu gọn' : 'Mở sơ đồ CTĐT'}</span>
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </header>

      {/* Không gian Bản đồ Pan & Zoom rộng rãi với rãnh đi dây 68px x 32px */}
      {isExpanded && (
        <>
          <div
            ref={viewportRef}
            className={[
              'vec-tree-stage-scroll',
              isDragging ? 'is-dragging' : '',
              isTallViewport ? 'is-tall' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <div
              className="vec-tree-zoom-wrapper"
              style={{
                width: `${Math.round(canvasSize.width * zoom)}px`,
                height: `${Math.round(canvasSize.height * zoom)}px`
              }}
            >
              <div
                ref={boardRef}
                className="vec-tree-grid-inner"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: '0 0'
                }}
              >
                {/* Lớp SVG vẽ đường mạch vuông góc phân màu Trực tiếp vs Chuỗi liên đới */}
                <svg
                  className="vec-tree-svg"
                  width={canvasSize.width}
                  height={canvasSize.height}
                  aria-hidden="true"
                >
                  <defs>
                    <marker
                      id="vec-ortho-arrow-idle"
                      viewBox="0 0 8 8"
                      refX="6.5"
                      refY="4"
                      markerWidth="5"
                      markerHeight="5"
                      orient="auto"
                    >
                      <path d="M 0 1.2 L 6.5 4 L 0 6.8 z" fill="var(--slate-10, #64748b)" />
                    </marker>
                    <marker
                      id="vec-ortho-arrow-prereq"
                      viewBox="0 0 8 8"
                      refX="6.5"
                      refY="4"
                      markerWidth="5.5"
                      markerHeight="5.5"
                      orient="auto"
                    >
                      <path d="M 0 1.2 L 6.5 4 L 0 6.8 z" fill="var(--slate-12, #0f172a)" />
                    </marker>
                    <marker
                      id="vec-ortho-arrow-coreq-end"
                      viewBox="0 0 8 8"
                      refX="6.5"
                      refY="4"
                      markerWidth="5.5"
                      markerHeight="5.5"
                      orient="auto"
                    >
                      <path d="M 0 1.2 L 6.5 4 L 0 6.8 z" fill="#dc2626" />
                    </marker>
                    <marker
                      id="vec-ortho-arrow-coreq-start"
                      viewBox="0 0 8 8"
                      refX="1.5"
                      refY="4"
                      markerWidth="5.5"
                      markerHeight="5.5"
                      orient="auto"
                    >
                      <path d="M 6.5 1.2 L 0 4 L 6.5 6.8 z" fill="#dc2626" />
                    </marker>
                    <marker
                      id="vec-ortho-arrow-pre"
                      viewBox="0 0 8 8"
                      refX="6.5"
                      refY="4"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 1 L 6.8 4 L 0 7 z" fill="var(--status-warning, #d97706)" />
                    </marker>
                    <marker
                      id="vec-ortho-arrow-next"
                      viewBox="0 0 8 8"
                      refX="6.5"
                      refY="4"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto"
                    >
                      <path d="M 0 1 L 6.8 4 L 0 7 z" fill="var(--blue-9, #2563eb)" />
                    </marker>
                    <marker
                      id="vec-ortho-arrow-chain"
                      viewBox="0 0 8 8"
                      refX="6.5"
                      refY="4"
                      markerWidth="5.5"
                      markerHeight="5.5"
                      orient="auto"
                    >
                      <path d="M 0 1 L 6.8 4 L 0 7 z" fill="var(--primary-base, #0d74ce)" />
                    </marker>
                  </defs>

                  {edges.map((edge) => {
                    const role = edge.wireRole
                    const isCoreq = edge.connType === 'corequisite'
                    const isPrereq = edge.connType === 'prerequisite'

                    let markerEndUrl = 'url(#vec-ortho-arrow-idle)'
                    let markerStartUrl = undefined

                    if (role === 'direct-pre') {
                      markerEndUrl = 'url(#vec-ortho-arrow-pre)'
                    } else if (role === 'direct-next') {
                      markerEndUrl = 'url(#vec-ortho-arrow-next)'
                    } else if (role === 'chain') {
                      markerEndUrl = 'url(#vec-ortho-arrow-chain)'
                    } else if (isCoreq) {
                      markerEndUrl = 'url(#vec-ortho-arrow-coreq-end)'
                      markerStartUrl = 'url(#vec-ortho-arrow-coreq-start)'
                    } else if (isPrereq) {
                      markerEndUrl = 'url(#vec-ortho-arrow-prereq)'
                    }

                    return (
                      <g key={edge.id} className={`vec-tree-wire-group ${role} ${isCoreq ? 'is-coreq' : ''} ${isPrereq ? 'is-prereq' : ''}`}>
                        <path
                          d={edge.d}
                          fill="none"
                          className={`vec-tree-edge ${role} type-${edge.connType || 'precursor'}`}
                          strokeDasharray={isCoreq ? '4 3' : isPrereq ? '5 4' : undefined}
                          stroke={isCoreq ? '#dc2626' : undefined}
                          markerStart={markerStartUrl}
                          markerEnd={markerEndUrl}
                        />
                        <circle
                          cx={edge.x1}
                          cy={edge.y1}
                          r={
                            role === 'direct-pre' || role === 'direct-next'
                              ? 3.2
                              : role === 'chain'
                                ? 2.4
                                : 1.8
                          }
                          className={`vec-tree-terminal ${role}`}
                        />
                      </g>
                    )
                  })}
                </svg>

                {/* 8 Cột Học kỳ (Học kỳ 1 -> Học kỳ 8) */}
                {CURRICULUM_SEMESTERS_META.map((semMeta) => {
                  const semCourses = activeCourses.filter(
                    (c) => c.semester === semMeta.id
                  )
                  const regularCourses = semCourses.filter(
                    (c) => c.electiveGroup !== 'HK2_SKILL'
                  )
                  const stackedSkillCourses = semCourses.filter(
                    (c) => c.electiveGroup === 'HK2_SKILL'
                  )
                  const isSemSelected = selectedSemester === semMeta.id

                  return (
                    <div
                      key={semMeta.id}
                      ref={(el) => {
                        if (el) colRefs.current[semMeta.id] = el
                      }}
                      className={`vec-tree-col ${isSemSelected ? 'sem-selected' : ''}`}
                    >
                      <button
                        type="button"
                        className={`vec-tree-sem-header ${isSemSelected ? 'active' : ''}`}
                        onClick={() => handleSemesterHeaderClick(semMeta.id)}
                        title={`Lọc học liệu thuộc ${semMeta.id} (${semMeta.credits} tín chỉ)`}
                      >
                        <span className="vec-tree-sem-name">{semMeta.id}</span>
                        <span className="vec-tree-sem-tc">({semMeta.credits} TC)</span>
                      </button>

                      <div className="vec-tree-col-nodes">
                        {regularCourses.map((crs) => {
                          const docCount = docCountByCourse[crs.code] || 0
                          const isSelected = selectedCourseCode === crs.code
                          const isFocused = focusCode === crs.code
                          const isDirectPre = directUpCodes.has(crs.code)
                          const isDirectNext = directDownCodes.has(crs.code)
                          const isIndirectUp =
                            !isDirectPre && upstreamCodes.has(crs.code)
                          const isIndirectDown =
                            !isDirectNext && downstreamCodes.has(crs.code)
                          const isBlockFilteredOut =
                            selectedBlock !== KNOWLEDGE_BLOCKS[0] &&
                            crs.knowledgeBlock !== selectedBlock
                          const isDimmed =
                            isBlockFilteredOut ||
                            (focusCode &&
                              !isFocused &&
                              !isDirectPre &&
                              !isDirectNext &&
                              !isIndirectUp &&
                              !isIndirectDown)

                          return (
                            <button
                              key={crs.id}
                              ref={(el) => {
                                if (el) nodeRefs.current[crs.code] = el
                              }}
                              type="button"
                              className={[
                                'vec-tree-node',
                                `group-${crs.treeGroup || 'foundation'}`,
                                `scope-${crs.courseScope || 'major'}`,
                                crs.isElective ? 'is-elective' : 'is-mandatory',
                                isSelected ? 'selected' : '',
                                isFocused ? 'focused' : '',
                                isDirectPre ? 'direct-pre' : '',
                                isDirectNext ? 'direct-next' : '',
                                isIndirectUp || isIndirectDown ? 'chain-node' : '',
                                isDimmed ? 'dimmed' : ''
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              onMouseEnter={() => setHoveredCode(crs.code)}
                              onMouseLeave={() => setHoveredCode(null)}
                              onClick={() => handleCourseClick(crs)}
                              title={`${crs.displayCode || crs.code} (${crs.credits} TC) – ${crs.name} • ${
                                crs.isElective ? 'Học phần tự chọn' : 'Học phần bắt buộc'
                              } • ${crs.knowledgeBlock}`}
                            >
                              <div className="vec-tree-node-top">
                                <span className={`vec-tree-node-code scope-${crs.courseScope || 'major'}`}>
                                  {crs.displayCode || crs.code} ({crs.credits})
                                </span>
                                <span
                                  className={`vec-tree-node-docs ${
                                    docCount > 0 ? 'has-docs' : ''
                                  }`}
                                >
                                  {docCount} TL
                                </span>
                              </div>

                              <div className={`vec-tree-node-name scope-${crs.courseScope || 'major'}`}>
                                {crs.shortName || crs.name}
                              </div>

                              <div className="vec-tree-node-meta">
                                <span className="vec-tree-node-block">
                                  {crs.knowledgeBlock}
                                </span>
                                <span className="vec-tree-node-credits">
                                  {crs.isElective ? 'Tự chọn' : 'Bắt buộc'}
                                </span>
                              </div>

                              {isDirectPre && (
                                <span className="vec-tree-relation-tag direct-pre">
                                  ← Tiên quyết
                                </span>
                              )}
                              {isDirectNext && (
                                <span className="vec-tree-relation-tag direct-next">
                                  Học tiếp →
                                </span>
                              )}
                              {(isIndirectUp || isIndirectDown) && (
                                <span className="vec-tree-relation-tag chain">
                                  {isIndirectUp ? 'Mạch trước' : 'Mạch sau'}
                                </span>
                              )}
                            </button>
                          )
                        })}

                        {/* Khối 5 môn Tự chọn Kỹ năng tại Học kỳ 2 (2 TC) xếp chồng đúng chuẩn Sơ đồ CTĐT */}
                        {stackedSkillCourses.length > 0 && (
                          <div
                            className="vec-tree-elective-stack"
                            role="group"
                            aria-label="Khối học phần tự chọn Học kỳ 2"
                          >
                            <div className="vec-tree-stack-header">
                              <span>Nhóm tự chọn HK2</span>
                              <span>Chọn 1 • 2 TC</span>
                            </div>
                            <div className="vec-tree-stack-list">
                              {stackedSkillCourses.map((crs) => {
                                const docCount = docCountByCourse[crs.code] || 0
                                const isSelected = selectedCourseCode === crs.code
                                const isFocused = focusCode === crs.code
                                const isBlockFilteredOut =
                                  selectedBlock !== KNOWLEDGE_BLOCKS[0] &&
                                  crs.knowledgeBlock !== selectedBlock
                                const isDimmed =
                                  isBlockFilteredOut || (focusCode && !isFocused)

                                return (
                                  <button
                                    key={crs.id}
                                    ref={(el) => {
                                      if (el) nodeRefs.current[crs.code] = el
                                    }}
                                    type="button"
                                    className={[
                                      'vec-tree-stack-item',
                                      `scope-${crs.courseScope || 'school'}`,
                                      'is-elective',
                                      isSelected ? 'selected' : '',
                                      isFocused ? 'focused' : '',
                                      isDimmed ? 'dimmed' : ''
                                    ]
                                      .filter(Boolean)
                                      .join(' ')}
                                    onMouseEnter={() => setHoveredCode(crs.code)}
                                    onMouseLeave={() => setHoveredCode(null)}
                                    onClick={() => handleCourseClick(crs)}
                                    title={`${crs.displayCode || crs.code} (${crs.credits} TC) – ${crs.name} (Học phần tự chọn Học kỳ 2)`}
                                  >
                                    <div className="vec-tree-stack-top">
                                      <span className={`vec-tree-stack-code scope-${crs.courseScope || 'school'}`}>
                                        {crs.displayCode || crs.code} ({crs.credits})
                                      </span>
                                      {docCount > 0 && (
                                        <span className="vec-tree-stack-docs">
                                          {docCount} TL
                                        </span>
                                      )}
                                    </div>
                                    <div className={`vec-tree-stack-name scope-${crs.courseScope || 'school'}`}>
                                      {crs.shortName || crs.name}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* 3 Thanh Học phần Điều kiện Tốt nghiệp trải ngang cuối sơ đồ đúng chuẩn Pháp lệnh Sơ đồ Khoa CNTT */}
                <div className="vec-tree-graduation-bars" aria-label="Học phần điều kiện tốt nghiệp">
                  <div className="vec-tree-grad-bar col-span-3" title="Giáo dục thể chất: Điều kiện bắt buộc (*)">
                    <span className="vec-tree-grad-title">Giáo dục thể chất (*)</span>
                  </div>
                  <div className="vec-tree-grad-bar col-span-4" title="Giáo dục quốc phòng, an ninh: Điều kiện bắt buộc (*)">
                    <span className="vec-tree-grad-title">Giáo dục quốc phòng, an ninh (*)</span>
                  </div>
                  <div className="vec-tree-grad-bar col-span-8" title="Chứng chỉ ngoại ngữ: Chuẩn đầu ra ngoại ngữ">
                    <span className="vec-tree-grad-title">Chứng chỉ ngoại ngữ</span>
                  </div>
                  <div className="vec-tree-condition-footnote">
                    <strong className="vec-tree-footnote-star">(*):</strong> Là điều kiện bắt buộc. Không tính vào số tín chỉ tích lũy của học kỳ hay toàn khóa.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bảng CHÚ THÍCH chính thức theo Pháp lệnh Sơ đồ Cây CTĐT Khoa CNTT */}
          <footer className="vec-tree-official-decree-legend" aria-label="Bảng chú thích chính thức Sơ đồ Cây Chương trình Đào tạo">
            <div className="decree-legend-col title-col">
              <span className="decree-legend-badge">CHÚ THÍCH</span>
            </div>

            {/* Khối 1: 4 Màu nhóm học phần */}
            <div className="decree-legend-col groups-col">
              <div className="decree-swatch-card group-foundation">Nhóm HP Nền tảng</div>
              <div className="decree-swatch-card group-practice">Nhóm HP: Thực hành, thực tập nghề nghiệp</div>
              <div className="decree-swatch-card group-pedagogy">Nhóm HP Nghiệp vụ sư phạm</div>
              <div className="decree-swatch-card group-graduation">Nhóm Tốt nghiệp</div>
            </div>

            {/* Khối 2: Mẫu thông tin ô HP & Khung Bắt buộc / Tự chọn */}
            <div className="decree-legend-col box-sample-col">
              <div className="decree-sample-header">
                <span>THÔNG TIN Ô HP</span>
                <strong>Mã HP (Số tín chỉ)</strong>
                <span>Tên HP</span>
              </div>
              <div className="decree-sample-borders">
                <div className="sample-box-border mandatory">Bắt buộc</div>
                <div className="sample-box-border elective">Tự chọn</div>
              </div>
            </div>

            {/* Khối 3: Màu chữ phân cấp phạm vi HP */}
            <div className="decree-legend-col scopes-col">
              <div className="decree-scope-tag scope-school">HP chung toàn trường</div>
              <div className="decree-scope-tag scope-field">HP chung cho lĩnh vực/nhóm ngành</div>
              <div className="decree-scope-tag scope-major">HP riêng của ngành</div>
            </div>

            {/* Khối 4: 3 Loại đường nối */}
            <div className="decree-legend-col lines-col">
              <div className="decree-line-entry">
                <svg width="48" height="12" aria-hidden="true">
                  <line x1="0" y1="6" x2="38" y2="6" stroke="var(--slate-11)" strokeWidth="2" />
                  <polygon points="38,2 48,6 38,10" fill="var(--slate-11)" />
                </svg>
                <span>Học trước</span>
              </div>
              <div className="decree-line-entry">
                <svg width="48" height="12" aria-hidden="true">
                  <line x1="8" y1="6" x2="40" y2="6" stroke="#dc2626" strokeWidth="2" strokeDasharray="3 2" />
                  <polygon points="8,2 0,6 8,10" fill="#dc2626" />
                  <polygon points="40,2 48,6 40,10" fill="#dc2626" />
                </svg>
                <span>Song hành</span>
              </div>
              <div className="decree-line-entry">
                <svg width="48" height="12" aria-hidden="true">
                  <line x1="0" y1="6" x2="38" y2="6" stroke="var(--slate-12)" strokeWidth="2" strokeDasharray="5 3" />
                  <polygon points="38,2 48,6 38,10" fill="var(--slate-12)" />
                </svg>
                <span>Tiên quyết</span>
              </div>
            </div>
          </footer>
        </>
      )}
    </section>
  )
}
