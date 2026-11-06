import { useEffect, useId, useRef, useState } from 'react'
// 1 pt = 12 700 EMU (đơn vị đo của Office). Không nhập từ pptxParser để bộ đọc tệp
// chỉ được tải khi thật sự mở một tệp .pptx.
const EMU_PER_PT = 12700
const DEFAULT_FONT_PT = 18

// Một số hình có sẵn thường gặp, vẽ trong hệ tọa độ 0..100
const PRESET_PATHS = {
  triangle: 'M 50 0 L 100 100 L 0 100 Z',
  rtTriangle: 'M 0 0 L 100 100 L 0 100 Z',
  diamond: 'M 50 0 L 100 50 L 50 100 L 0 50 Z',
  parallelogram: 'M 25 0 L 100 0 L 75 100 L 0 100 Z',
  trapezoid: 'M 25 0 L 75 0 L 100 100 L 0 100 Z',
  pentagon: 'M 50 0 L 100 38 L 81 100 L 19 100 L 0 38 Z',
  hexagon: 'M 25 0 L 75 0 L 100 50 L 75 100 L 25 100 L 0 50 Z',
  octagon: 'M 29 0 L 71 0 L 100 29 L 100 71 L 71 100 L 29 100 L 0 71 L 0 29 Z',
  homePlate: 'M 0 0 L 80 0 L 100 50 L 80 100 L 0 100 Z',
  chevron: 'M 0 0 L 80 0 L 100 50 L 80 100 L 0 100 L 20 50 Z',
  rightArrow: 'M 0 25 L 70 25 L 70 0 L 100 50 L 70 100 L 70 75 L 0 75 Z',
  leftArrow: 'M 100 25 L 30 25 L 30 0 L 0 50 L 30 100 L 30 75 L 100 75 Z',
  upArrow: 'M 25 100 L 25 30 L 0 30 L 50 0 L 100 30 L 75 30 L 75 100 Z',
  downArrow: 'M 25 0 L 25 70 L 0 70 L 50 100 L 100 70 L 75 70 L 75 0 Z',
  line: 'M 0 0 L 100 100',
  straightConnector1: 'M 0 0 L 100 100'
}

function cssFill(fill) {
  if (!fill) return undefined
  if (fill.type === 'solid') return fill.color
  if (fill.type === 'gradient') {
    const stops = fill.stops.map((s) => `${s.color} ${s.pos}%`).join(', ')
    return `linear-gradient(${fill.angle}deg, ${stops})`
  }
  return undefined
}

/** Ảnh lấp đầy khung, có cắt theo srcRect như PowerPoint. */
function CroppedImage({ fill }) {
  const c = fill.crop || { l: 0, t: 0, r: 0, b: 0 }
  const visW = Math.max(0.01, 1 - c.l - c.r)
  const visH = Math.max(0.01, 1 - c.t - c.b)
  return (
    <img
      src={fill.src}
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        left: `${(-c.l / visW) * 100}%`,
        top: `${(-c.t / visH) * 100}%`,
        width: `${100 / visW}%`,
        height: `${100 / visH}%`,
        maxWidth: 'none',
        opacity: fill.opacity ?? 1,
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    />
  )
}

function SvgGeometry({ el, paths, scale }) {
  const uid = useId().replace(/:/g, '')
  const { fill, line } = el
  const strokeWidth = line ? Math.max(0.75, line.width * scale) : 0
  return (
    <>
      {paths.map((p, i) => {
        const vw = p.w || el.w || 100
        const vh = p.h || el.h || 100
        const clipId = `clip-${uid}-${i}`
        const gradId = `grad-${uid}-${i}`
        let fillAttr = 'none'
        if (!p.noFill && fill?.type === 'solid') fillAttr = fill.color
        if (!p.noFill && fill?.type === 'gradient') fillAttr = `url(#${gradId})`
        const c = fill?.crop || { l: 0, t: 0, r: 0, b: 0 }
        const visW = Math.max(0.01, 1 - c.l - c.r)
        const visH = Math.max(0.01, 1 - c.t - c.b)
        return (
          <svg
            key={i}
            viewBox={`0 0 ${vw} ${vh}`}
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
            aria-hidden="true"
          >
            <defs>
              {fill?.type === 'image' && (
                <clipPath id={clipId}>
                  <path d={p.d} />
                </clipPath>
              )}
              {fill?.type === 'gradient' && (
                <linearGradient id={gradId} gradientTransform={`rotate(${fill.angle - 90} 0.5 0.5)`}>
                  {fill.stops.map((s, k) => (
                    <stop key={k} offset={`${s.pos}%`} stopColor={s.color} />
                  ))}
                </linearGradient>
              )}
            </defs>
            {fill?.type === 'image' && !p.noFill && (
              <image
                href={fill.src}
                x={(-c.l / visW) * vw}
                y={(-c.t / visH) * vh}
                width={vw / visW}
                height={vh / visH}
                preserveAspectRatio="none"
                clipPath={`url(#${clipId})`}
                opacity={fill.opacity ?? 1}
              />
            )}
            <path
              d={p.d}
              fill={fillAttr}
              stroke={line ? line.color : 'none'}
              strokeWidth={line ? strokeWidth : 0}
              strokeDasharray={line?.dashed ? `${strokeWidth * 3} ${strokeWidth * 2}` : undefined}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )
      })}
    </>
  )
}

function Geometry({ el, scale }) {
  const { geom, fill, line } = el
  if (geom.type === 'cust') return <SvgGeometry el={el} paths={geom.paths} scale={scale} />
  if (PRESET_PATHS[geom.type]) {
    return <SvgGeometry el={el} paths={[{ w: 100, h: 100, d: PRESET_PATHS[geom.type], noFill: geom.type === 'line' || geom.type === 'straightConnector1' }]} scale={scale} />
  }
  const radius =
    geom.type === 'ellipse'
      ? '50%'
      : geom.type === 'roundRect'
        ? `${Math.min(el.w, el.h) * scale * (geom.adj ?? 0.16667)}px`
        : 0
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: cssFill(fill),
        borderRadius: radius,
        border: line ? `${Math.max(0.75, line.width * scale)}px ${line.dashed ? 'dashed' : 'solid'} ${line.color}` : undefined,
        overflow: 'hidden'
      }}
    >
      {fill?.type === 'image' && <CroppedImage fill={fill} />}
    </div>
  )
}

function ptToPx(pt, scale) {
  return pt * EMU_PER_PT * scale
}

function TextBlock({ text, scale, theme }) {
  const justify = { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[text.anchor]
  return (
    <div
      style={{
        position: 'absolute',
        left: text.insets.l * scale,
        top: text.insets.t * scale,
        right: text.insets.r * scale,
        bottom: text.insets.b * scale,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: justify,
        overflow: 'visible',
        writingMode: text.vertical ? 'vertical-rl' : undefined
      }}
    >
      {text.paragraphs.map((p, i) => {
        const sizes = p.runs.map((r) => r.size).filter(Boolean)
        const basePt = (sizes.length ? Math.max(...sizes) : p.endSize || DEFAULT_FONT_PT) * text.fontScale
        let lineHeight = 1.2 * (1 - text.lnReduction)
        if (p.lineHeight?.pct) lineHeight = 1.2 * p.lineHeight.pct * (1 - text.lnReduction)
        else if (p.lineHeight?.pt) lineHeight = `${ptToPx(p.lineHeight.pt * text.fontScale, scale)}px`
        return (
          <p
            key={i}
            style={{
              margin: 0,
              textAlign: p.align || 'left',
              paddingLeft: (p.marL || 0) * scale,
              textIndent: (p.indent || 0) * scale,
              marginTop: p.spaceBefore ? ptToPx(p.spaceBefore, scale) : 0,
              marginBottom: p.spaceAfter ? ptToPx(p.spaceAfter, scale) : 0,
              lineHeight,
              fontSize: `${ptToPx(basePt, scale)}px`,
              whiteSpace: text.wrap ? 'pre-wrap' : 'pre',
              overflowWrap: 'break-word',
              fontFamily: `"${theme.fonts.minor}", "Segoe UI", Arial, sans-serif`
            }}
          >
            {p.bullet && <span style={{ marginRight: '0.4em' }}>{p.bullet}</span>}
            {p.runs.length === 0 && ' '}
            {p.runs.map((r, k) =>
              r.text === '\n' ? (
                <br key={k} />
              ) : (
                <span
                  key={k}
                  style={{
                    fontSize: `${ptToPx((r.size || basePt / text.fontScale) * text.fontScale, scale)}px`,
                    fontWeight: r.bold ? 700 : 400,
                    fontStyle: r.italic ? 'italic' : 'normal',
                    textDecoration: [r.underline && 'underline', r.strike && 'line-through'].filter(Boolean).join(' ') || 'none',
                    color: r.color || '#000000',
                    fontFamily: r.font ? `"${r.font}", "Segoe UI", Arial, sans-serif` : undefined,
                    verticalAlign: r.baseline ? (r.baseline > 0 ? 'super' : 'sub') : undefined,
                    letterSpacing: r.spacing ? `${ptToPx(r.spacing * text.fontScale, scale)}px` : undefined,
                    textTransform: r.caps ? 'uppercase' : undefined
                  }}
                >
                  {r.text}
                </span>
              )
            )}
          </p>
        )
      })}
    </div>
  )
}

function ShapeElement({ el, scale, theme }) {
  const flip = `${el.flipH ? 'scaleX(-1)' : ''} ${el.flipV ? 'scaleY(-1)' : ''}`.trim()
  return (
    <div
      style={{
        position: 'absolute',
        left: el.x * scale,
        top: el.y * scale,
        width: Math.max(1, el.w * scale),
        height: Math.max(1, el.h * scale),
        transform: el.rot ? `rotate(${el.rot}deg)` : undefined
      }}
    >
      <div style={{ position: 'absolute', inset: 0, transform: flip || undefined }}>
        <Geometry el={el} scale={scale} />
      </div>
      {el.text && <TextBlock text={el.text} scale={scale} theme={theme} />}
    </div>
  )
}

function TableElement({ el, scale, theme }) {
  const totalW = el.cols.reduce((s, w) => s + w, 0) || el.w
  return (
    <div style={{ position: 'absolute', left: el.x * scale, top: el.y * scale, width: el.w * scale }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          {el.cols.map((w, i) => (
            <col key={i} style={{ width: `${(w / totalW) * 100}%` }} />
          ))}
        </colgroup>
        <tbody>
          {el.rows.map((row, r) => (
            <tr key={r} style={{ height: row.h * scale }}>
              {row.cells.map((cell, c) => (
                <td
                  key={c}
                  colSpan={cell.colSpan}
                  rowSpan={cell.rowSpan}
                  style={{ position: 'relative', border: '1px solid #9ca3af', background: cell.fill || undefined, padding: 0, verticalAlign: 'top' }}
                >
                  {cell.text && (
                    <div style={{ position: 'relative', minHeight: row.h * scale }}>
                      <TextBlock text={{ ...cell.text, insets: { l: 91440, t: 45720, r: 91440, b: 45720 } }} scale={scale} theme={theme} />
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Slide({ slide, deck, scale, index, theme }) {
  const bg = slide.background
  return (
    <div
      role="img"
      aria-label={`Slide ${index + 1}`}
      style={{
        position: 'relative',
        width: deck.width * scale,
        height: deck.height * scale,
        overflow: 'hidden',
        background: cssFill(bg) || '#ffffff',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.18)',
        borderRadius: 4,
        color: '#000000',
        flexShrink: 0
      }}
    >
      {bg?.type === 'image' && <CroppedImage fill={bg} />}
      {slide.elements.map((el, i) =>
        el.kind === 'table' ? (
          <TableElement key={i} el={el} scale={scale} theme={theme} />
        ) : (
          <ShapeElement key={i} el={el} scale={scale} theme={theme} />
        )
      )}
    </div>
  )
}

/**
 * Hiển thị danh sách slide đã đọc bằng parsePptx, tự co theo bề rộng khung.
 */
export default function PptxSlides({ deck }) {
  const hostRef = useRef(null)
  const [hostWidth, setHostWidth] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const measure = () => setHostWidth(host.clientWidth)
    measure()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const slideWidth = Math.min(Math.max(hostWidth, 0), 960)
  const scale = deck.width ? slideWidth / deck.width : 0
  const theme = deck.theme || { fonts: { minor: 'Calibri' } }

  return (
    <div ref={hostRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
      {scale > 0 &&
        deck.slides.map((slide, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', userSelect: 'none' }}>
              Slide {i + 1}
            </div>
            <Slide slide={slide} deck={deck} scale={scale} index={i} theme={theme} />
          </div>
        ))}
    </div>
  )
}
