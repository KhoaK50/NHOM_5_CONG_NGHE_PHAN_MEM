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
  CURRICULUM_SEMESTERS_META,
  MANDATORY_GRADUATION_CONDITIONS,
  KNOWLEDGE_BLOCKS,
  SEMESTERS
} from '../../data/curriculum'

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

  const canvasSize = useMemo(
    () => ({
      width: 2020,
      height: isTallViewport ? 980 : 660
    }),
    [isTallViewport]
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

  const activeCourses = useMemo(
    () => courses.filter((c) => c.isActive),
    [courses]
  )

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

    const semOrder = CURRICULUM_SEMESTERS_META.map((s) => s.id)
    const colIndexBySem = {}
    const colBounds = []

    semOrder.forEach((semId, idx) => {
      colIndexBySem[semId] = idx
      const colEl = colRefs.current[semId]
      if (colEl) {
        const r = colEl.getBoundingClientRect()
        colBounds[idx] = {
          left: (r.left - boardRect.left) / scale,
          right: (r.right - boardRect.left) / scale
        }
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
        if (!el) return

        const r = el.getBoundingClientRect()
        const left = (r.left - boardRect.left) / scale
        const right = (r.right - boardRect.left) / scale
        const top = (r.top - boardRect.top) / scale
        const bottom = (r.bottom - boardRect.top) / scale

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

    // Tâm rãnh bus ngang rộng 28px giữa các hàng học phần
    const hCorridorY = []
    const maxRow = Math.max(0, ...Object.keys(rowBottoms).map(Number))
    for (let r = 0; r <= maxRow; r++) {
      if (rowBottoms[r] !== undefined && rowTops[r + 1] !== undefined) {
        hCorridorY[r] = (rowBottoms[r] + rowTops[r + 1]) / 2
      } else if (rowBottoms[r] !== undefined) {
        hCorridorY[r] = rowBottoms[r] + 14
      }
    }

    // Gom danh sách tất cả các liên kết tiên quyết
    const rawConnections = []
    const outgoingByCourse = {}
    const incomingByCourse = {}

    for (const targetCourse of activeCourses) {
      const prereqs = targetCourse.prerequisites || []
      const toBox = nodeBoxByCode[targetCourse.code]
      if (!toBox) continue

      for (const preCode of prereqs) {
        const fromBox = nodeBoxByCode[preCode]
        if (!fromBox) continue

        const conn = {
          id: `${preCode}->${targetCourse.code}`,
          from: preCode,
          to: targetCourse.code,
          fromBox,
          toBox
        }
        rawConnections.push(conn)
        if (!outgoingByCourse[preCode]) outgoingByCourse[preCode] = []
        outgoingByCourse[preCode].push(conn)

        if (!incomingByCourse[targetCourse.code]) incomingByCourse[targetCourse.code] = []
        incomingByCourse[targetCourse.code].push(conn)
      }
    }

    // Tách chân cực ra / vào theo tọa độ Y
    const outPortYByConnId = {}
    for (const code of Object.keys(outgoingByCourse)) {
      const list = outgoingByCourse[code]
      list.sort((a, b) => a.toBox.midY - b.toBox.midY)
      const n = list.length
      list.forEach((conn, idx) => {
        const offset = (idx - (n - 1) / 2) * 12
        outPortYByConnId[conn.id] = conn.fromBox.midY + offset
      })
    }

    const inPortYByConnId = {}
    for (const code of Object.keys(incomingByCourse)) {
      const list = incomingByCourse[code]
      list.sort((a, b) => a.fromBox.midY - b.fromBox.midY)
      const n = list.length
      list.forEach((conn, idx) => {
        const offset = (idx - (n - 1) / 2) * 12
        inPortYByConnId[conn.id] = conn.toBox.midY + offset
      })
    }

    const vChannelUsage = {}
    const hCorridorUsage = {}

    const allocateLane = (usageMap, key, step = 8) => {
      const count = usageMap[key] || 0
      usageMap[key] = count + 1
      if (count === 0) return 0
      const dir = count % 2 === 1 ? -1 : 1
      const mag = Math.ceil(count / 2)
      return dir * mag * step
    }

    const computedWires = []
    for (const conn of rawConnections) {
      const { id, from: preCode, to: targetCode, fromBox, toBox } = conn
      const c1 = fromBox.colIdx
      const c2 = toBox.colIdx

      let waypoints

      // TH1: Cùng học kỳ / cùng cột (như POLI2002 -> POLI2003 trong HK2)
      // Chuẩn hóa: đi thẳng đứng từ đáy môn trên xuống đỉnh môn dưới (TUYỆT ĐỐI KHÔNG DÙNG ĐƯỜNG CHIM BAY)
      if (c1 === c2) {
        if (fromBox.bottom <= toBox.top) {
          const mx = (fromBox.left + fromBox.right) / 2
          waypoints = [
            { x: mx, y: fromBox.bottom },
            { x: mx, y: toBox.top }
          ]
        } else {
          // Ngược chiều: vòng qua rãnh phải
          const minChX = (colBounds[c1]?.right ?? fromBox.right) + 12
          const maxChX = (colBounds[c1 + 1]?.left ?? (fromBox.right + 68)) - 12
          const vx = Math.max(minChX, Math.min(maxChX, (minChX + maxChX) / 2))
          waypoints = [
            { x: fromBox.right, y: fromBox.midY },
            { x: vx, y: fromBox.midY },
            { x: vx, y: toBox.midY },
            { x: toBox.right, y: toBox.midY }
          ]
        }
      }
      // TH2: Hai học kỳ liên tiếp (c2 === c1 + 1)
      // Chuẩn hóa: vx BẮT BUỘC nằm trong khoảng an toàn giữa 2 cột, không chạm vào viền thẻ của cột đích
      else if (c2 === c1 + 1) {
        const x1 = fromBox.right
        const y1 = outPortYByConnId[id] ?? fromBox.midY
        const x2 = toBox.left
        const y2 = inPortYByConnId[id] ?? toBox.midY

        const minChX = (colBounds[c1]?.right ?? x1) + 12
        const maxChX = (colBounds[c2]?.left ?? x2) - 12
        const baseChX = (minChX + maxChX) / 2
        const laneShift = allocateLane(vChannelUsage, `v_${c1}`, 8)
        const vx = Math.max(minChX, Math.min(maxChX, baseChX + laneShift))

        if (Math.abs(y1 - y2) <= 3) {
          waypoints = [
            { x: x1, y: y1 },
            { x: x2, y: y1 }
          ]
        } else {
          waypoints = [
            { x: x1, y: y1 },
            { x: vx, y: y1 },
            { x: vx, y: y2 },
            { x: x2, y: y2 }
          ]
        }
      }
      // TH3: Cách nhau nhiều học kỳ (c2 > c1 + 1)
      // Chuẩn hóa: đi qua rãnh ngang bus giữa các hàng học phần, không đâm xuyên qua chữ của học phần trung gian
      else if (c2 > c1 + 1) {
        const x1 = fromBox.right
        const y1 = outPortYByConnId[id] ?? fromBox.midY
        const x2 = toBox.left
        const y2 = inPortYByConnId[id] ?? toBox.midY

        const minChX1 = (colBounds[c1]?.right ?? x1) + 12
        const maxChX1 = (colBounds[c1 + 1]?.left ?? (x1 + 68)) - 12
        const vx1 = Math.max(
          minChX1,
          Math.min(maxChX1, (minChX1 + maxChX1) / 2 + allocateLane(vChannelUsage, `v_${c1}`, 8))
        )

        const minChX2 = (colBounds[c2 - 1]?.right ?? (x2 - 68)) + 12
        const maxChX2 = (colBounds[c2]?.left ?? x2) - 12
        const vx2 = Math.max(
          minChX2,
          Math.min(maxChX2, (minChX2 + maxChX2) / 2 + allocateLane(vChannelUsage, `v_${c2 - 1}`, 8))
        )

        const rawCorridorIdx = Math.min(
          hCorridorY.length - 1,
          Math.max(0, Math.min(fromBox.rowIdx, toBox.rowIdx))
        )
        const baseBusY = hCorridorY[rawCorridorIdx] ?? (fromBox.bottom + 14)
        const busY = baseBusY + allocateLane(hCorridorUsage, `h_${rawCorridorIdx}`, 5)

        waypoints = [
          { x: x1, y: y1 },
          { x: vx1, y: y1 },
          { x: vx1, y: busY },
          { x: vx2, y: busY },
          { x: vx2, y: y2 },
          { x: x2, y: y2 }
        ]
      }
      // TH4: Dự phòng fallback vuông góc
      else {
        const x1 = fromBox.right
        const y1 = fromBox.midY
        const x2 = toBox.left
        const y2 = toBox.midY
        const midX = (x1 + x2) / 2
        waypoints = [
          { x: x1, y: y1 },
          { x: midX, y: y1 },
          { x: midX, y: y2 },
          { x: x2, y: y2 }
        ]
      }

      computedWires.push({
        id,
        from: preCode,
        to: targetCode,
        x1: waypoints[0].x,
        y1: waypoints[0].y,
        x2: waypoints[waypoints.length - 1].x,
        y2: waypoints[waypoints.length - 1].y,
        d: buildOrthogonalPath(waypoints, 6)
      })
    }

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
                      <path d="M 0 1.2 L 6.5 4 L 0 6.8 z" fill="var(--slate-8)" />
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
                      <path d="M 0 1 L 6.8 4 L 0 7 z" fill="#d97706" />
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
                      <path d="M 0 1 L 6.8 4 L 0 7 z" fill="var(--blue-9)" />
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
                      <path d="M 0 1 L 6.8 4 L 0 7 z" fill="#0d74ce" />
                    </marker>
                  </defs>

                  {edges.map((edge) => {
                    const role = edge.wireRole
                    const markerUrl =
                      role === 'direct-pre'
                        ? 'url(#vec-ortho-arrow-pre)'
                        : role === 'direct-next'
                          ? 'url(#vec-ortho-arrow-next)'
                          : role === 'chain'
                            ? 'url(#vec-ortho-arrow-chain)'
                            : 'url(#vec-ortho-arrow-idle)'

                    return (
                      <g key={edge.id} className={`vec-tree-wire-group ${role}`}>
                        <path
                          d={edge.d}
                          fill="none"
                          className={`vec-tree-edge ${role}`}
                          markerEnd={markerUrl}
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
                                `group-${crs.treeGroup || 'general'}`,
                                crs.isElective ? 'is-elective' : '',
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
                              title={`${crs.code} (${crs.credits} TC) – ${crs.name} • ${
                                crs.isElective ? 'Học phần tự chọn' : 'Học phần bắt buộc'
                              } • ${crs.knowledgeBlock}`}
                            >
                              <div className="vec-tree-node-top">
                                <span className="vec-tree-node-code">
                                  {crs.code} ({crs.credits})
                                </span>
                                <span
                                  className={`vec-tree-node-docs ${
                                    docCount > 0 ? 'has-docs' : ''
                                  }`}
                                >
                                  {docCount} TL
                                </span>
                              </div>

                              <div className="vec-tree-node-name">{crs.name}</div>

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
                                      isSelected ? 'selected' : '',
                                      isFocused ? 'focused' : '',
                                      isDimmed ? 'dimmed' : ''
                                    ]
                                      .filter(Boolean)
                                      .join(' ')}
                                    onMouseEnter={() => setHoveredCode(crs.code)}
                                    onMouseLeave={() => setHoveredCode(null)}
                                    onClick={() => handleCourseClick(crs)}
                                    title={`${crs.code} (${crs.credits} TC) – ${crs.name} (Học phần tự chọn Học kỳ 2)`}
                                  >
                                    <div className="vec-tree-stack-top">
                                      <span className="vec-tree-stack-code">
                                        {crs.code} ({crs.credits})
                                      </span>
                                      {docCount > 0 && (
                                        <span className="vec-tree-stack-docs">
                                          {docCount} TL
                                        </span>
                                      )}
                                    </div>
                                    <div className="vec-tree-stack-name">
                                      {crs.name}
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

                {/* 3 Thanh Học phần Điều kiện Tốt nghiệp trải ngang cuối sơ đồ (Giáo dục thể chất, GDQPAN, Chứng chỉ ngoại ngữ) */}
                <div className="vec-tree-graduation-bars" aria-label="Học phần điều kiện tốt nghiệp">
                  {MANDATORY_GRADUATION_CONDITIONS.map((cond) => (
                    <div key={cond.id} className="vec-tree-grad-bar" title={cond.note}>
                      <span className="vec-tree-grad-title">{cond.title}</span>
                      <span className="vec-tree-grad-note">{cond.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Thanh CHÚ THÍCH chính thức dưới chân Sơ đồ Chương trình Đào tạo */}
          <footer className="vec-tree-official-legend" aria-label="Chú thích ký hiệu sơ đồ chương trình đào tạo">
            <span className="vec-official-legend-title">CHÚ THÍCH:</span>
            <span className="vec-official-legend-chip">
              <span className="vec-swatch-box mandatory" />
              <span>Học phần bắt buộc</span>
            </span>
            <span className="vec-official-legend-chip">
              <span className="vec-swatch-box elective" />
              <span>Học phần tự chọn</span>
            </span>
            <span className="vec-official-legend-chip">
              <span className="vec-swatch-box group-foundation" />
              <span>Nhóm HP Nền tảng</span>
            </span>
            <span className="vec-official-legend-chip">
              <span className="vec-swatch-box group-pedagogy" />
              <span>Nhóm HP Nghiệp vụ sư phạm</span>
            </span>
            <span className="vec-official-legend-chip">
              <span className="vec-swatch-box group-practice" />
              <span>Nhóm HP Thực hành, thực tập nghề nghiệp</span>
            </span>
            <span className="vec-official-legend-chip">
              <span className="vec-swatch-box group-graduation" />
              <span>Nhóm Tốt nghiệp</span>
            </span>
          </footer>
        </>
      )}
    </section>
  )
}
