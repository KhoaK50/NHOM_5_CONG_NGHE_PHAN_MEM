/**
 * Đọc tệp PowerPoint (.pptx) ngay trên trình duyệt để dựng bản xem trước từng slide.
 *
 * Chỉ trích dữ liệu hình học, màu, chữ và ảnh thành một mô hình thuần (không chuỗi HTML),
 * phần hiển thị dùng phần tử React nên nội dung từ tệp tải lên không thể chèn mã vào trang.
 * Hỗ trợ: nền slide, hình chữ nhật/bo góc/elip, hình vẽ tự do (custGeom), ảnh (PNG, JPEG,
 * GIF, SVG), nhóm hình, hộp chữ, bảng, placeholder kế thừa từ layout/master, màu theme.
 * Biểu đồ, SmartArt, video, hiệu ứng chuyển động thì bỏ qua.
 */
import JSZip from 'jszip'

const EMU_PER_PT = 12700
const MAX_SLIDES = 200

const IMAGE_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  svg: 'image/svg+xml'
}

// ---------------------------------------------------------------- XML helpers
function parseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) return null
  return doc
}

function kids(el, name) {
  if (!el) return []
  const out = []
  for (const c of el.children) if (c.localName === name) out.push(c)
  return out
}

function kid(el, name) {
  if (!el) return null
  for (const c of el.children) if (c.localName === name) return c
  return null
}

function path(el, ...names) {
  let cur = el
  for (const n of names) {
    cur = kid(cur, n)
    if (!cur) return null
  }
  return cur
}

function num(el, name, fallback = 0) {
  if (!el) return fallback
  const v = el.getAttribute(name)
  if (v === null || v === '') return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

/** Mã quan hệ r:id / r:embed (không nhầm với thuộc tính id thường, vd <p:sldId id="256" r:id="rId2"/>). */
function relId(el) {
  if (!el) return null
  for (const a of el.attributes) {
    if (a.namespaceURI === REL_NS && (a.localName === 'embed' || a.localName === 'id' || a.localName === 'link')) return a.value
  }
  for (const a of el.attributes) if (a.name === 'r:embed' || a.name === 'r:id') return a.value
  return null
}

function resolvePath(base, target) {
  if (target.startsWith('/')) return target.slice(1)
  const parts = base.split('/').slice(0, -1)
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg && seg !== '.') parts.push(seg)
  }
  return parts.join('/')
}

// ---------------------------------------------------------------- màu sắc
function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHsl([r, g, b]) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h /= 6
  }
  return [h, s, l]
}

function hslToRgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255]
  const hue = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255]
}

const SCHEME_ALIAS = { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' }
const PRESET_COLORS = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080' }

/** Đọc một phần tử màu (srgbClr, schemeClr, sysClr, prstClr) kèm lumMod/lumOff/tint/shade/alpha. */
function readColor(el, ctx) {
  if (!el) return null
  let hex = null
  if (el.localName === 'srgbClr') hex = el.getAttribute('val')
  else if (el.localName === 'sysClr') hex = el.getAttribute('lastClr') || '000000'
  else if (el.localName === 'prstClr') hex = PRESET_COLORS[el.getAttribute('val')] || '000000'
  else if (el.localName === 'schemeClr') {
    let key = el.getAttribute('val')
    if (key === 'phClr' && ctx.phColor) return ctx.phColor
    key = (ctx.colorMap && ctx.colorMap[key]) || SCHEME_ALIAS[key] || key
    hex = ctx.theme.colors[key] || null
  }
  let rgb = hexToRgb(hex)
  if (!rgb) return null
  let alpha = 1
  for (const mod of el.children) {
    const v = num(mod, 'val', 100000) / 100000
    if (mod.localName === 'alpha') alpha = v
    else if (mod.localName === 'lumMod' || mod.localName === 'lumOff') {
      const hsl = rgbToHsl(rgb)
      hsl[2] = mod.localName === 'lumMod' ? hsl[2] * v : Math.min(1, hsl[2] + v)
      rgb = hslToRgb(hsl)
    } else if (mod.localName === 'tint') rgb = rgb.map((c) => c + (255 - c) * (1 - v))
    else if (mod.localName === 'shade') rgb = rgb.map((c) => c * v)
  }
  const [r, g, b] = rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))))
  return alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})` : `rgb(${r}, ${g}, ${b})`
}

function firstColorChild(el) {
  if (!el) return null
  for (const c of el.children) {
    if (['srgbClr', 'schemeClr', 'sysClr', 'prstClr'].includes(c.localName)) return c
  }
  return null
}

// ---------------------------------------------------------------- package
async function loadPart(zip, name) {
  const file = zip.file(name)
  if (!file) return null
  return parseXml(await file.async('text'))
}

async function loadRels(zip, partName) {
  const parts = partName.split('/')
  const file = parts.pop()
  const relsName = [...parts, '_rels', `${file}.rels`].join('/')
  const doc = await loadPart(zip, relsName)
  const map = {}
  if (!doc) return map
  for (const r of doc.getElementsByTagName('Relationship')) {
    const mode = r.getAttribute('TargetMode')
    map[r.getAttribute('Id')] = {
      type: (r.getAttribute('Type') || '').split('/').pop(),
      target: mode === 'External' ? null : resolvePath(partName, r.getAttribute('Target') || '')
    }
  }
  return map
}

function readTheme(doc) {
  const colors = {}
  const fonts = { major: 'Calibri', minor: 'Calibri' }
  if (!doc) return { colors, fonts }
  const scheme = doc.getElementsByTagNameNS('*', 'clrScheme')[0]
  if (scheme) {
    for (const c of scheme.children) {
      const v = firstColorChild(c)
      if (!v) continue
      colors[c.localName] = v.localName === 'sysClr' ? v.getAttribute('lastClr') : v.getAttribute('val')
    }
  }
  const major = doc.getElementsByTagNameNS('*', 'majorFont')[0]
  const minor = doc.getElementsByTagNameNS('*', 'minorFont')[0]
  if (major) fonts.major = kid(major, 'latin')?.getAttribute('typeface') || fonts.major
  if (minor) fonts.minor = kid(minor, 'latin')?.getAttribute('typeface') || fonts.minor
  return { colors, fonts }
}

function readColorMap(el) {
  if (!el) return null
  const map = {}
  for (const a of el.attributes) map[a.localName] = a.value
  return map
}

// ---------------------------------------------------------------- media
function createMediaStore(zip) {
  const cache = new Map()
  const urls = []
  return {
    urls,
    async get(target) {
      if (!target) return null
      if (cache.has(target)) return cache.get(target)
      const ext = target.split('.').pop().toLowerCase()
      const type = IMAGE_TYPES[ext]
      const file = zip.file(target)
      let url = null
      if (type && file) {
        const blob = new Blob([await file.async('uint8array')], { type })
        url = URL.createObjectURL(blob)
        urls.push(url)
      }
      cache.set(target, url)
      return url
    }
  }
}

// ---------------------------------------------------------------- hình học
function readXfrm(xfrm) {
  if (!xfrm) return null
  const off = kid(xfrm, 'off')
  const ext = kid(xfrm, 'ext')
  if (!off || !ext) return null
  const chOff = kid(xfrm, 'chOff')
  const chExt = kid(xfrm, 'chExt')
  return {
    x: num(off, 'x'),
    y: num(off, 'y'),
    w: num(ext, 'cx'),
    h: num(ext, 'cy'),
    rot: num(xfrm, 'rot') / 60000,
    flipH: xfrm.getAttribute('flipH') === '1',
    flipV: xfrm.getAttribute('flipV') === '1',
    chX: chOff ? num(chOff, 'x') : null,
    chY: chOff ? num(chOff, 'y') : null,
    chW: chExt ? num(chExt, 'cx') : null,
    chH: chExt ? num(chExt, 'cy') : null
  }
}

/** Đổi tọa độ con trong nhóm sang tọa độ slide. */
function applyGroup(box, group) {
  if (!group) return box
  const sx = group.chW ? group.w / group.chW : 1
  const sy = group.chH ? group.h / group.chH : 1
  return {
    ...box,
    x: group.x + (box.x - (group.chX || 0)) * sx,
    y: group.y + (box.y - (group.chY || 0)) * sy,
    w: box.w * sx,
    h: box.h * sy
  }
}

function readCustGeom(geom) {
  const paths = []
  for (const p of kids(kid(geom, 'pathLst'), 'path')) {
    const w = num(p, 'w')
    const h = num(p, 'h')
    let d = ''
    for (const cmd of p.children) {
      const pts = kids(cmd, 'pt').map((pt) => `${num(pt, 'x')} ${num(pt, 'y')}`)
      if (cmd.localName === 'moveTo' && pts[0]) d += `M ${pts[0]} `
      else if (cmd.localName === 'lnTo' && pts[0]) d += `L ${pts[0]} `
      else if (cmd.localName === 'cubicBezTo' && pts.length === 3) d += `C ${pts.join(' ')} `
      else if (cmd.localName === 'quadBezTo' && pts.length === 2) d += `Q ${pts.join(' ')} `
      else if (cmd.localName === 'close') d += 'Z '
    }
    if (d.trim()) paths.push({ w, h, d: d.trim(), noFill: p.getAttribute('fill') === 'none' })
  }
  return paths.length ? { type: 'cust', paths } : { type: 'rect' }
}

function readGeometry(spPr) {
  const prst = kid(spPr, 'prstGeom')
  if (prst) {
    const name = prst.getAttribute('prst') || 'rect'
    let adj = null
    const gd = kid(kid(prst, 'avLst'), 'gd')
    if (gd) {
      const m = /val\s+(-?\d+)/.exec(gd.getAttribute('fmla') || '')
      if (m) adj = Number(m[1]) / 100000
    }
    return { type: name, adj }
  }
  const cust = kid(spPr, 'custGeom')
  if (cust) return readCustGeom(cust)
  return { type: 'rect' }
}

async function readBlip(blipFill, rels, media) {
  const blip = kid(blipFill, 'blip')
  if (!blip) return null
  let id = relId(blip)
  // Office 2016+: ảnh SVG nằm trong phần mở rộng svgBlip
  const svg = blip.getElementsByTagNameNS('*', 'svgBlip')[0]
  if (svg && relId(svg)) id = relId(svg) || id
  let src = id ? await media.get(rels[id]?.target) : null
  if (!src && id !== relId(blip) && relId(blip)) src = await media.get(rels[relId(blip)]?.target)
  if (!src) return null
  const alphaFix = kid(blip, 'alphaModFix')
  const crop = kid(blipFill, 'srcRect')
  return {
    type: 'image',
    src,
    opacity: alphaFix ? num(alphaFix, 'amt', 100000) / 100000 : 1,
    crop: crop
      ? {
          l: num(crop, 'l') / 100000,
          t: num(crop, 't') / 100000,
          r: num(crop, 'r') / 100000,
          b: num(crop, 'b') / 100000
        }
      : null
  }
}

async function readFill(spPr, ctx, rels) {
  if (!spPr) return undefined
  if (kid(spPr, 'noFill')) return null
  const solid = kid(spPr, 'solidFill')
  if (solid) {
    const color = readColor(firstColorChild(solid), ctx)
    return color ? { type: 'solid', color } : null
  }
  const grad = kid(spPr, 'gradFill')
  if (grad) {
    const stops = kids(kid(grad, 'gsLst'), 'gs')
      .map((gs) => ({ pos: num(gs, 'pos') / 1000, color: readColor(firstColorChild(gs), ctx) }))
      .filter((s) => s.color)
    const lin = kid(grad, 'lin')
    const angle = lin ? num(lin, 'ang') / 60000 + 90 : 180
    if (stops.length) return { type: 'gradient', angle, stops }
    return null
  }
  const blip = kid(spPr, 'blipFill')
  if (blip) return readBlip(blip, rels, ctx.media)
  return undefined
}

function readLine(spPr, ctx) {
  const ln = kid(spPr, 'ln')
  if (!ln || kid(ln, 'noFill')) return null
  const solid = kid(ln, 'solidFill')
  const color = solid ? readColor(firstColorChild(solid), ctx) : null
  if (!color) return null
  const dash = kid(ln, 'prstDash')?.getAttribute('val')
  return { color, width: Math.max(EMU_PER_PT * 0.75, num(ln, 'w', EMU_PER_PT * 0.75)), dashed: dash && dash !== 'solid' }
}

// ---------------------------------------------------------------- chữ
function stripStyleSuffix(face) {
  if (!face) return { family: null, bold: false, italic: false }
  let family = face
  let bold = false
  let italic = false
  if (/\s(Bold|Black|Heavy)(\s|$)/i.test(family)) bold = true
  if (/\sItalic(\s|$)/i.test(family)) italic = true
  family = family.replace(/\s(Bold|Black|Heavy|Italic|Semibold|Light|Medium)\b/gi, '').trim()
  return { family, bold, italic }
}

function readRunProps(rPr, ctx) {
  if (!rPr) return {}
  const out = {}
  if (rPr.getAttribute('sz')) out.size = num(rPr, 'sz') / 100
  if (rPr.getAttribute('b') !== null) out.bold = rPr.getAttribute('b') === '1' || rPr.getAttribute('b') === 'true'
  if (rPr.getAttribute('i') !== null) out.italic = rPr.getAttribute('i') === '1' || rPr.getAttribute('i') === 'true'
  const u = rPr.getAttribute('u')
  if (u) out.underline = u !== 'none'
  const strike = rPr.getAttribute('strike')
  if (strike) out.strike = strike !== 'noStrike'
  const solid = kid(rPr, 'solidFill')
  if (solid) {
    const color = readColor(firstColorChild(solid), ctx)
    if (color) out.color = color
  }
  const latin = kid(rPr, 'latin')
  if (latin) {
    let face = latin.getAttribute('typeface')
    if (face === '+mj-lt') face = ctx.theme.fonts.major
    else if (face === '+mn-lt') face = ctx.theme.fonts.minor
    const s = stripStyleSuffix(face)
    if (s.family) out.font = s.family
    if (s.bold && out.bold === undefined) out.bold = true
    if (s.italic && out.italic === undefined) out.italic = true
  }
  const baseline = num(rPr, 'baseline')
  if (baseline) out.baseline = baseline / 1000
  // Giãn/thu khoảng cách chữ, đơn vị 1/100 pt
  if (rPr.getAttribute('spc') !== null) out.spacing = num(rPr, 'spc') / 100
  const cap = rPr.getAttribute('cap')
  if (cap === 'all') out.caps = true
  return out
}

function readParaProps(pPr, ctx) {
  if (!pPr) return {}
  const out = {}
  const algn = pPr.getAttribute('algn')
  if (algn) out.align = { l: 'left', ctr: 'center', r: 'right', just: 'justify', dist: 'justify' }[algn] || 'left'
  if (pPr.getAttribute('marL') !== null) out.marL = num(pPr, 'marL')
  if (pPr.getAttribute('indent') !== null) out.indent = num(pPr, 'indent')
  const lnPct = path(pPr, 'lnSpc', 'spcPct')
  const lnPts = path(pPr, 'lnSpc', 'spcPts')
  if (lnPct) out.lineHeight = { pct: num(lnPct, 'val', 100000) / 100000 }
  else if (lnPts) out.lineHeight = { pt: num(lnPts, 'val') / 100 }
  const before = path(pPr, 'spcBef', 'spcPts')
  const after = path(pPr, 'spcAft', 'spcPts')
  if (before) out.spaceBefore = num(before, 'val') / 100
  if (after) out.spaceAfter = num(after, 'val') / 100
  if (kid(pPr, 'buNone')) out.bullet = null
  const buChar = kid(pPr, 'buChar')
  if (buChar) out.bullet = buChar.getAttribute('char') || '•'
  if (kid(pPr, 'buAutoNum')) out.bullet = '#'
  const def = kid(pPr, 'defRPr')
  if (def) out.defRun = readRunProps(def, ctx)
  return out
}

/** Kiểu chữ theo cấp (lvl1pPr...lvl9pPr) từ một lstStyle hoặc txStyles của master. */
function readLevelStyles(listEl, ctx) {
  const levels = {}
  if (!listEl) return levels
  for (let i = 1; i <= 9; i++) {
    const l = kid(listEl, `lvl${i}pPr`)
    if (l) levels[i - 1] = readParaProps(l, ctx)
  }
  return levels
}

function mergeLevel(...styles) {
  const out = {}
  for (const s of styles) {
    if (!s) continue
    for (const [k, v] of Object.entries(s)) {
      if (v === undefined) continue
      out[k] = k === 'defRun' ? { ...(out.defRun || {}), ...v } : v
    }
  }
  return out
}

function readTextBody(txBody, ctx, inherited) {
  if (!txBody) return null
  const bodyPr = kid(txBody, 'bodyPr')
  const ownLevels = readLevelStyles(kid(txBody, 'lstStyle'), ctx)
  const norm = kid(bodyPr, 'normAutofit')
  const fontScale = norm ? num(norm, 'fontScale', 100000) / 100000 : 1
  const lnReduction = norm ? num(norm, 'lnSpcReduction', 0) / 100000 : 0
  const paragraphs = []
  let numbering = 0
  for (const p of kids(txBody, 'p')) {
    const pPr = kid(p, 'pPr')
    const lvl = pPr ? num(pPr, 'lvl') : 0
    const style = mergeLevel(...inherited.map((levels) => levels?.[lvl]), ownLevels[lvl], readParaProps(pPr, ctx))
    const runs = []
    for (const r of p.children) {
      if (r.localName === 'r' || r.localName === 'fld') {
        const t = kid(r, 't')?.textContent ?? ''
        if (!t) continue
        runs.push({ text: t, ...style.defRun, ...readRunProps(kid(r, 'rPr'), ctx) })
      } else if (r.localName === 'br') {
        runs.push({ text: '\n', ...style.defRun, ...readRunProps(kid(r, 'rPr'), ctx) })
      }
    }
    const endProps = { ...style.defRun, ...readRunProps(kid(p, 'endParaRPr'), ctx) }
    let bullet = runs.length ? style.bullet : null
    if (bullet === '#') {
      numbering += 1
      bullet = `${numbering}.`
    } else if (bullet !== undefined) numbering = 0
    paragraphs.push({ ...style, runs, endSize: endProps.size, bullet: bullet || null, defRun: undefined })
  }
  const hasText = paragraphs.some((p) => p.runs.some((r) => r.text.trim()))
  if (!hasText) return null
  return {
    paragraphs,
    anchor: { t: 'top', ctr: 'middle', b: 'bottom' }[bodyPr?.getAttribute('anchor')] || inherited.anchor || 'top',
    insets: {
      l: num(bodyPr, 'lIns', 91440),
      t: num(bodyPr, 'tIns', 45720),
      r: num(bodyPr, 'rIns', 91440),
      b: num(bodyPr, 'bIns', 45720)
    },
    wrap: bodyPr?.getAttribute('wrap') !== 'none',
    vertical: bodyPr?.getAttribute('vert') && bodyPr.getAttribute('vert') !== 'horz',
    fontScale,
    lnReduction
  }
}

// ---------------------------------------------------------------- placeholder
function placeholderKey(sp) {
  const ph = sp.getElementsByTagNameNS('*', 'ph')[0]
  if (!ph) return null
  return { type: ph.getAttribute('type') || 'body', idx: ph.getAttribute('idx') }
}

function indexPlaceholders(spTree) {
  const list = []
  if (!spTree) return list
  for (const sp of spTree.getElementsByTagNameNS('*', 'sp')) {
    const key = placeholderKey(sp)
    if (key) list.push({ key, sp })
  }
  return list
}

function sameType(a, b) {
  const norm = (t) => (t === 'ctrTitle' ? 'title' : t === 'subTitle' || t === 'obj' ? 'body' : t)
  return norm(a) === norm(b)
}

function findPlaceholder(list, key) {
  if (!key) return null
  return (
    (key.idx && list.find((p) => p.key.idx === key.idx && sameType(p.key.type, key.type))) ||
    (key.idx && list.find((p) => p.key.idx === key.idx)) ||
    list.find((p) => p.key.type === key.type) ||
    list.find((p) => sameType(p.key.type, key.type)) ||
    null
  )
}

// ---------------------------------------------------------------- dựng phần tử
async function readShape(sp, ctx, rels, group, layers) {
  const spPr = kid(sp, 'spPr')
  const key = placeholderKey(sp)
  const layoutPh = key ? findPlaceholder(layers.layoutPh, key) : null
  const masterPh = key ? findPlaceholder(layers.masterPh, key) : null
  let xfrm = readXfrm(kid(spPr, 'xfrm'))
  if (!xfrm && layoutPh) xfrm = readXfrm(path(layoutPh.sp, 'spPr', 'xfrm'))
  if (!xfrm && masterPh) xfrm = readXfrm(path(masterPh.sp, 'spPr', 'xfrm'))
  if (!xfrm) return null
  const box = applyGroup(xfrm, group)

  let fill = await readFill(spPr, ctx, rels)
  if (fill === undefined && layoutPh) fill = await readFill(kid(layoutPh.sp, 'spPr'), ctx, layers.layoutRels)
  if (fill === undefined) {
    const ref = path(sp, 'style', 'fillRef')
    const color = ref && num(ref, 'idx') > 0 ? readColor(firstColorChild(ref), ctx) : null
    fill = color ? { type: 'solid', color } : null
  }
  let line = readLine(spPr, ctx)
  if (!line && !kid(kid(spPr, 'ln'), 'noFill')) {
    const ref = path(sp, 'style', 'lnRef')
    const color = ref && num(ref, 'idx') > 0 ? readColor(firstColorChild(ref), ctx) : null
    if (color) line = { color, width: EMU_PER_PT * 0.75 }
  }

  const typeStyle = key
    ? key.type === 'title' || key.type === 'ctrTitle'
      ? layers.txStyles.title
      : key.type === 'body' || key.type === 'subTitle' || key.type === 'obj'
        ? layers.txStyles.body
        : layers.txStyles.other
    : layers.txStyles.other
  const inherited = [
    layers.defaultText,
    typeStyle,
    masterPh ? readLevelStyles(path(masterPh.sp, 'txBody', 'lstStyle'), ctx) : null,
    layoutPh ? readLevelStyles(path(layoutPh.sp, 'txBody', 'lstStyle'), ctx) : null
  ]
  const fontRef = path(sp, 'style', 'fontRef')
  const refColor = fontRef ? readColor(firstColorChild(fontRef), ctx) : null
  if (refColor) inherited.push({ 0: { defRun: { color: refColor } } })
  inherited.anchor =
    { t: 'top', ctr: 'middle', b: 'bottom' }[
      path(layoutPh?.sp, 'txBody', 'bodyPr')?.getAttribute('anchor') || path(masterPh?.sp, 'txBody', 'bodyPr')?.getAttribute('anchor')
    ] || null
  const text = readTextBody(kid(sp, 'txBody'), ctx, inherited)

  if (!fill && !line && !text) return null
  return { kind: 'shape', ...box, geom: readGeometry(spPr), fill, line, text }
}

async function readPicture(pic, ctx, rels, group) {
  const spPr = kid(pic, 'spPr')
  const xfrm = readXfrm(kid(spPr, 'xfrm'))
  if (!xfrm) return null
  const fill = await readBlip(kid(pic, 'blipFill'), rels, ctx.media)
  if (!fill) return null
  return { kind: 'shape', ...applyGroup(xfrm, group), geom: readGeometry(spPr), fill, line: readLine(spPr, ctx), text: null }
}

async function readTable(frame, ctx, group) {
  const tbl = frame.getElementsByTagNameNS('*', 'tbl')[0]
  const xfrm = readXfrm(kid(frame, 'xfrm'))
  if (!tbl || !xfrm) return null
  const cols = kids(kid(tbl, 'tblGrid'), 'gridCol').map((c) => num(c, 'w'))
  const rows = []
  for (const tr of kids(tbl, 'tr')) {
    const cells = []
    for (const tc of kids(tr, 'tc')) {
      if (tc.getAttribute('hMerge') === '1' || tc.getAttribute('vMerge') === '1') continue
      const tcPr = kid(tc, 'tcPr')
      const solid = kid(tcPr, 'solidFill')
      cells.push({
        colSpan: num(tc, 'gridSpan', 1),
        rowSpan: num(tc, 'rowSpan', 1),
        fill: solid ? readColor(firstColorChild(solid), ctx) : null,
        text: readTextBody(kid(tc, 'txBody'), ctx, [ctx.defaultText])
      })
    }
    rows.push({ h: num(tr, 'h'), cells })
  }
  return { kind: 'table', ...applyGroup(xfrm, group), cols, rows }
}

async function readTree(tree, ctx, rels, layers, group = null, out = []) {
  if (!tree) return out
  for (const node of tree.children) {
    const name = node.localName
    try {
      if (name === 'sp' || name === 'cxnSp') {
        if (layers.skipPlaceholders && placeholderKey(node)) continue
        const el = await readShape(node, ctx, rels, group, layers)
        if (el) out.push(el)
      } else if (name === 'pic') {
        const el = await readPicture(node, ctx, rels, group)
        if (el) out.push(el)
      } else if (name === 'graphicFrame') {
        const el = await readTable(node, ctx, group)
        if (el) out.push(el)
      } else if (name === 'grpSp') {
        const gx = readXfrm(path(node, 'grpSpPr', 'xfrm'))
        const nested = gx ? applyGroup(gx, group) : group
        const merged = gx ? { ...nested, chX: gx.chX, chY: gx.chY, chW: gx.chW, chH: gx.chH } : group
        await readTree(node, ctx, rels, layers, merged, out)
      } else if (name === 'AlternateContent') {
        const fallback = kid(node, 'Fallback') || kid(node, 'Choice')
        if (fallback) await readTree(fallback, ctx, rels, layers, group, out)
      }
    } catch {
      // Một hình không đọc được thì bỏ qua, các hình khác vẫn hiển thị
    }
  }
  return out
}

async function readBackground(cSld, ctx, rels) {
  const bg = kid(cSld, 'bg')
  if (!bg) return undefined
  const bgPr = kid(bg, 'bgPr')
  if (bgPr) {
    const fill = await readFill(bgPr, ctx, rels)
    return fill === undefined ? null : fill
  }
  const ref = kid(bg, 'bgRef')
  if (ref) {
    const color = readColor(firstColorChild(ref), ctx)
    return color ? { type: 'solid', color } : null
  }
  return undefined
}

/**
 * @param {ArrayBuffer} data Nội dung tệp .pptx
 * @param {{ maxSlides?: number }} [options] Giới hạn số slide dựng (vd 3 slide cho Khách)
 * @returns {Promise<{ width:number, height:number, totalSlides:number, slides:object[], dispose:() => void }>}
 */
export async function parsePptx(data, { maxSlides = MAX_SLIDES } = {}) {
  const zip = await JSZip.loadAsync(data)
  const presentation = await loadPart(zip, 'ppt/presentation.xml')
  if (!presentation) throw new Error('Tệp không phải PowerPoint hợp lệ.')
  const presRels = await loadRels(zip, 'ppt/presentation.xml')
  const root = presentation.documentElement
  const size = kid(root, 'sldSz')
  const width = num(size, 'cx', 12192000)
  const height = num(size, 'cy', 6858000)

  const slideIds = kids(kid(root, 'sldIdLst'), 'sldId')
  const slideParts = slideIds.map((s) => presRels[relId(s)]?.target).filter(Boolean)

  const media = createMediaStore(zip)
  const themeCache = new Map()
  const partCache = new Map()
  const getPart = async (name) => {
    if (!partCache.has(name)) partCache.set(name, { doc: await loadPart(zip, name), rels: await loadRels(zip, name) })
    return partCache.get(name)
  }

  const slides = []
  for (const slidePart of slideParts.slice(0, Math.max(0, maxSlides))) {
    const slide = await getPart(slidePart)
    if (!slide.doc) continue
    const layoutName = Object.values(slide.rels).find((r) => r.type === 'slideLayout')?.target
    const layout = layoutName ? await getPart(layoutName) : { doc: null, rels: {} }
    const masterName = Object.values(layout.rels).find((r) => r.type === 'slideMaster')?.target
    const master = masterName ? await getPart(masterName) : { doc: null, rels: {} }
    const themeName = Object.values(master.rels).find((r) => r.type === 'theme')?.target
    if (themeName && !themeCache.has(themeName)) themeCache.set(themeName, readTheme(await loadPart(zip, themeName)))
    const theme = themeCache.get(themeName) || readTheme(null)

    const masterRoot = master.doc?.documentElement
    const ctx = {
      theme,
      media,
      colorMap: readColorMap(kid(masterRoot, 'clrMap'))
    }
    const override = path(slide.doc.documentElement, 'clrMapOvr', 'overrideClrMapping')
    if (override) ctx.colorMap = readColorMap(override)

    const txStyles = kid(masterRoot, 'txStyles')
    ctx.defaultText = readLevelStyles(kid(root, 'defaultTextStyle'), ctx)
    const layers = {
      defaultText: ctx.defaultText,
      txStyles: {
        title: readLevelStyles(kid(txStyles, 'titleStyle'), ctx),
        body: readLevelStyles(kid(txStyles, 'bodyStyle'), ctx),
        other: readLevelStyles(kid(txStyles, 'otherStyle'), ctx)
      },
      layoutPh: indexPlaceholders(path(layout.doc?.documentElement, 'cSld', 'spTree')),
      masterPh: indexPlaceholders(path(masterRoot, 'cSld', 'spTree')),
      layoutRels: layout.rels
    }

    const slideRoot = slide.doc.documentElement
    const slideCSld = kid(slideRoot, 'cSld')
    let background = await readBackground(slideCSld, ctx, slide.rels)
    if (background === undefined) background = await readBackground(kid(layout.doc?.documentElement, 'cSld'), ctx, layout.rels)
    if (background === undefined) background = await readBackground(kid(masterRoot, 'cSld'), ctx, master.rels)

    const elements = []
    const showMaster = (el) => !el || el.getAttribute('showMasterSp') !== '0'
    if (master.doc && showMaster(slideRoot) && showMaster(layout.doc?.documentElement)) {
      await readTree(path(masterRoot, 'cSld', 'spTree'), ctx, master.rels, { ...layers, skipPlaceholders: true }, null, elements)
    }
    if (layout.doc && showMaster(slideRoot)) {
      await readTree(path(layout.doc.documentElement, 'cSld', 'spTree'), ctx, layout.rels, { ...layers, skipPlaceholders: true }, null, elements)
    }
    await readTree(kid(slideCSld, 'spTree'), ctx, slide.rels, layers, null, elements)

    slides.push({ background: background || { type: 'solid', color: '#ffffff' }, elements })
  }

  return {
    width,
    height,
    totalSlides: slideParts.length,
    slides,
    theme: themeCache.values().next().value || readTheme(null),
    dispose() {
      for (const url of media.urls) URL.revokeObjectURL(url)
    }
  }
}

