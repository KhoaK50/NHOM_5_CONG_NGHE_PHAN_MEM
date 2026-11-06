/**
 * Định tuyến đường nối vuông góc cho Cây Chương trình Đào tạo.
 *
 * Mỗi học phần nguồn tạo thành một "lưới" (net): một trục dọc riêng trong rãnh
 * giữa hai cột học kỳ, các nhánh rẽ vào học phần đích, và một làn ngang riêng
 * trong rãnh giữa hai hàng khi phải vượt qua nhiều học kỳ. Các đường cùng nguồn
 * dùng chung trục (giống sơ đồ gốc); hai nguồn khác nhau không bao giờ dùng
 * chung một đoạn thẳng, nên đường nối không bị chồng lên nhau.
 *
 * Hàm thuần, không đọc DOM: nhận tọa độ các ô đã đo và trả về danh sách waypoint.
 */

const PORT_GAP = 12
const LANE_MARGIN = 12
const MAX_LANE_STEP = 8
const TRACK_MARGIN = 6
const MAX_TRACK_STEP = 8
const SAME_Y = 3
// Hai nhánh khác nguồn trong cùng một rãnh phải lệch nhau ít nhất chừng này (px)
const FORBID_GAP = 7

function permutations(items) {
  if (items.length <= 1) return [items.slice()]
  const out = []
  items.forEach((item, idx) => {
    const rest = items.slice(0, idx).concat(items.slice(idx + 1))
    for (const p of permutations(rest)) out.push([item, ...p])
  })
  return out
}

// Chọn thứ tự tốt nhất theo hàm chi phí; quá 7 phần tử thì giữ thứ tự gốc.
function bestOrder(items, cost) {
  if (items.length <= 1) return items.slice()
  if (items.length > 7) return items.slice()
  let best = null
  let bestCost = Infinity
  for (const p of permutations(items)) {
    const c = cost(p)
    if (c < bestCost) {
      bestCost = c
      best = p
    }
  }
  return best
}

function spread(count, center, step) {
  return Array.from({ length: count }, (_, i) => center + (i - (count - 1) / 2) * step)
}

function boxesHitSegment(boxes, a, b, ignore) {
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)
  return boxes.some((bx) => {
    if (ignore.has(bx)) return false
    return minX < bx.right - 1 && maxX > bx.left + 1 && minY < bx.bottom - 1 && maxY > bx.top + 1
  })
}

/**
 * @param {object} p
 * @param {Record<string, {left,right,top,bottom,midX,midY,colIdx,rowIdx}>} p.boxes
 * @param {{left:number,right:number}[]} p.colBounds
 * @param {Record<number, number>} p.rowTops    Đỉnh nhỏ nhất của mỗi hàng (không tính khối tự chọn xếp chồng)
 * @param {Record<number, number>} p.rowBottoms Đáy lớn nhất của mỗi hàng
 * @param {{from:string,to:string,type?:string,busLane?:string}[]} p.connections
 * @param {number} p.topBusY    Tung độ rãnh bus trên đỉnh (giữa tiêu đề học kỳ và hàng đầu)
 * @param {number} p.bottomBusY Tung độ rãnh bus dưới đáy
 * @param {{left,right,top,bottom}[]} [p.obstacles] Vật cản ngoài các ô học phần (vd khối tự chọn)
 * @returns {{id,from,to,connType,points:{x:number,y:number}[]}[]}
 */
export function routeCurriculumWires({
  boxes,
  colBounds,
  rowTops,
  rowBottoms,
  connections,
  topBusY,
  bottomBusY,
  obstacles = []
}) {
  const allObstacles = [...Object.values(boxes), ...obstacles]

  const channelBounds = (ch) => {
    const left = (colBounds[ch]?.right ?? 0) + LANE_MARGIN
    const right = (colBounds[ch + 1]?.left ?? left + 44) - LANE_MARGIN
    return { left, right, center: (left + right) / 2, edgeL: colBounds[ch]?.right ?? left, edgeR: colBounds[ch + 1]?.left ?? right }
  }

  const corridor = (r) => {
    if (r < 0 || rowBottoms[r] === undefined) return null
    if (rowTops[r + 1] === undefined) {
      return { center: rowBottoms[r] + 14, height: 28 }
    }
    return {
      center: (rowBottoms[r] + rowTops[r + 1]) / 2,
      height: rowTops[r + 1] - rowBottoms[r]
    }
  }

  // ---------------------------------------------------------------- 1. Gom lưới
  const nets = []
  const netByKey = {}
  const wires = []

  for (const rel of connections) {
    const fromBox = boxes[rel.from]
    const toBox = boxes[rel.to]
    if (!fromBox || !toBox) continue
    const connType = rel.type || 'precursor'
    const wire = {
      id: `${rel.from}->${rel.to}`,
      from: rel.from,
      to: rel.to,
      connType,
      busLane: rel.busLane || null,
      fromBox,
      toBox
    }
    wires.push(wire)

    const clearVertical = (x, y1, y2) =>
      !boxesHitSegment(allObstacles, { x, y: y1 }, { x, y: y2 }, new Set([fromBox, toBox]))

    let kind
    if (connType === 'corequisite') {
      // Hai học phần song hành nằm sát nhau thì nối thẳng đứng; có ô khác chen giữa
      // (thứ tự cột thay đổi) thì vòng qua rãnh bên phải cột.
      const upper = fromBox.top <= toBox.top ? fromBox : toBox
      const lower = upper === fromBox ? toBox : fromBox
      const mx = (Math.max(upper.left, lower.left) + Math.min(upper.right, lower.right)) / 2
      if (fromBox.colIdx !== toBox.colIdx || clearVertical(mx, upper.bottom, lower.top)) continue
      kind = 'coreq'
      wire.sideRoute = true
    } else if (wire.busLane === 'bottom') {
      // Bus dưới đáy: đi thẳng xuống/lên ở giữa ô nếu không bị ô khác chắn, ngược lại đi qua rãnh bên cạnh
      wire.srcSide = !clearVertical(fromBox.midX, fromBox.bottom, bottomBusY)
      wire.dstSide = !clearVertical(toBox.midX, bottomBusY, toBox.bottom)
      kind = 'bottom'
    } else if (wire.busLane === 'top') {
      wire.srcSide = true
      wire.dstSide = !clearVertical(toBox.midX, topBusY, toBox.top)
      kind = 'top'
    } else {
      kind = connType === 'prerequisite' ? 'pre' : 'std'
    }
    const key = `${rel.from}|${kind}`
    if (!netByKey[key]) {
      netByKey[key] = { key, source: rel.from, box: fromBox, kind, wires: [] }
      nets.push(netByKey[key])
    }
    netByKey[key].wires.push(wire)
    wire.net = netByKey[key]
  }

  // Cổng ra: nguồn có nhiều lưới thì tách cổng, lưới đi lên đặt phía trên
  const netsBySource = {}
  const BUS_KINDS = new Set(['top', 'bottom', 'coreq'])
  for (const net of nets) {
    // Bus dưới đáy đi ra từ đáy ô thì không chiếm cổng bên phải
    if (net.kind === 'bottom' && !net.wires.some((w) => w.srcSide)) {
      net.outY = net.box.midY
      net.noSidePort = true
      continue
    }
    ;(netsBySource[net.source] ||= []).push(net)
  }
  for (const list of Object.values(netsBySource)) {
    const meanY = (net) =>
      net.kind === 'top'
        ? -Infinity
        : net.kind === 'bottom'
          ? Infinity
          : net.wires.reduce((s, w) => s + w.toBox.midY, 0) / net.wires.length
    list.sort((a, b) => meanY(a) - meanY(b))
    const ys = spread(list.length, list[0].box.midY, PORT_GAP)
    list.forEach((net, i) => {
      net.outY = ys[i]
    })
  }

  // Rãnh ngang dùng khi vượt nhiều học kỳ: mặc định đi phía trên hàng nguồn,
  // chỉ đi phía dưới khi mọi học phần đích đều nằm ở hàng thấp hơn.
  for (const net of nets) {
    const cs = net.box.colIdx
    const far = BUS_KINDS.has(net.kind) ? [] : net.wires.filter((w) => w.toBox.colIdx > cs + 1)
    net.farWires = far
    if (!far.length) continue
    const rs = net.box.rowIdx
    const prefer = far.every((w) => w.toBox.rowIdx > rs) ? 'below' : 'above'
    const maxCol = Math.max(...far.map((w) => w.toBox.colIdx))
    const xFrom = channelBounds(cs).center
    const xTo = channelBounds(maxCol - 1).center
    // Thử rãnh sát hàng nguồn trước (theo hướng ưu tiên), rồi lan dần ra xa nếu bị chắn
    const options = []
    for (let d = 0; d <= Object.keys(rowBottoms).length; d++) {
      const pair = prefer === 'above' ? [rs - 1 - d, rs + d] : [rs + d, rs - 1 - d]
      for (const r of pair) if (r >= 0 && !options.includes(r)) options.push(r)
    }
    let chosen = null
    for (const r of options) {
      const c = corridor(r)
      if (!c) continue
      const ignore = new Set([net.box, ...far.map((w) => w.toBox)])
      const blocked = boxesHitSegment(allObstacles, { x: xFrom, y: c.center }, { x: xTo, y: c.center }, ignore)
      if (!blocked) {
        chosen = r
        break
      }
      if (chosen === null) chosen = r
    }
    net.corridorIdx = chosen ?? rs
    net.trackY = corridor(net.corridorIdx)?.center ?? net.box.bottom + 14
    net.trackFromCh = cs
    net.trackToCh = maxCol - 1
  }

  // ------------------------------------------------------------- 2. Cổng vào
  // Song hành đi vòng: đi vào cạnh phải ô đích, tránh trùng cổng ra của chính ô đó
  for (const w of wires) {
    if (w.net?.kind !== 'coreq') continue
    const t = w.toBox
    const taken = nets.filter((n) => n.box === t && !n.noSidePort).map((n) => n.outY)
    const options = [t.midY, t.midY + PORT_GAP, t.midY - PORT_GAP, t.midY + 2 * PORT_GAP, t.midY - 2 * PORT_GAP]
    w.inY = options.find((y) => taken.every((f) => Math.abs(f - y) >= FORBID_GAP)) ?? t.midY
  }

  const incoming = {}
  for (const w of wires) {
    if (!w.net || w.net.kind === 'coreq') continue
    let approachY
    if (w.net.kind === 'top' || w.net.kind === 'bottom') {
      if (!w.dstSide) continue
      approachY = w.net.kind === 'top' ? topBusY : bottomBusY
    } else {
      approachY = w.toBox.colIdx === w.fromBox.colIdx + 1 ? w.net.outY : w.net.trackY
    }
    ;(incoming[w.to] ||= []).push({ wire: w, approachY })
  }
  // Cổng ra của các lưới khác nằm ở cột ngay bên trái (cùng rãnh). Nhánh vào không
  // được trùng tung độ với chúng, nếu không hai đường khác nguồn sẽ nối thẳng hàng
  // và trông như một đường duy nhất.
  const outPortsByChannel = {}
  for (const net of nets) {
    if (!net.noSidePort) (outPortsByChannel[net.box.colIdx] ||= []).push(net)
  }
  // Đường song hành đi vòng cũng chiếm một tung độ ở mép trái rãnh (cạnh phải ô đích)
  const coreqPortsByChannel = {}
  for (const w of wires) {
    if (w.net?.kind === 'coreq') (coreqPortsByChannel[w.toBox.colIdx] ||= []).push(w.inY)
  }
  for (const [code, list] of Object.entries(incoming)) {
    const t = boxes[code]
    list.sort((a, b) => a.approachY - b.approachY)
    const ownNets = new Set(list.map((e) => e.wire.net))
    const forbidden = (outPortsByChannel[t.colIdx - 1] || [])
      .filter((net) => !ownNets.has(net))
      .map((net) => net.outY)
      .concat(coreqPortsByChannel[t.colIdx - 1] || [])
    const isFree = (y) => forbidden.every((f) => Math.abs(f - y) >= FORBID_GAP)

    let ys = spread(list.length, t.midY, PORT_GAP)
    if (!ys.every(isFree)) {
      // Lấy các vị trí cách đều quanh tâm ô, bỏ vị trí vướng, giữ thứ tự trên-dưới
      const limit = (t.bottom - t.top) / 2 - 8
      const candidates = []
      for (let k = -Math.floor(limit / 6); k <= Math.floor(limit / 6); k++) {
        const y = t.midY + k * 6
        if (isFree(y)) candidates.push(y)
      }
      const meanApproach = list.reduce((s, e) => s + e.approachY, 0) / list.length
      const towardApproach = meanApproach < t.midY ? -1 : 1
      let best = null
      let bestCost = Infinity
      for (let i = 0; i + list.length <= candidates.length; i++) {
        for (let gapStep = 2; gapStep <= 4; gapStep++) {
          const pick = []
          let j = i
          while (pick.length < list.length && j < candidates.length) {
            if (!pick.length || candidates[j] - pick[pick.length - 1] >= gapStep * 6) pick.push(candidates[j])
            j++
          }
          if (pick.length < list.length) continue
          const center = pick.reduce((s, y) => s + y, 0) / pick.length
          const c = Math.abs(center - t.midY) * 10 + (pick[pick.length - 1] - pick[0]) - towardApproach * (center - t.midY)
          if (c < bestCost) {
            bestCost = c
            best = pick
          }
        }
      }
      if (best) ys = best
    }
    list.forEach((entry, i) => {
      entry.wire.inY = ys[i]
    })
  }

  // ------------------------------------------- 3. Trục dọc trong rãnh giữa cột
  const channels = {}
  const laneEntry = (ch, net) => {
    const channel = (channels[ch] ||= { ch, entries: {}, straights: [] })
    if (!channel.entries[net.key]) {
      channel.entries[net.key] = { net, ys: [], left: [], right: [] }
    }
    return channel.entries[net.key]
  }

  for (const net of nets) {
    const cs = net.box.colIdx
    if (net.kind === 'coreq') {
      for (const w of net.wires) {
        const e = laneEntry(cs, net)
        e.ys.push(net.outY, w.inY)
        e.left.push(net.outY, w.inY)
      }
      continue
    }
    if (net.kind === 'top' || net.kind === 'bottom') {
      const busY = net.kind === 'top' ? topBusY : bottomBusY
      for (const w of net.wires) {
        if (w.srcSide) {
          const e = laneEntry(cs, net)
          e.ys.push(net.outY, busY)
          e.left.push(net.outY)
          e.right.push(busY)
        }
        if (w.dstSide) {
          const e = laneEntry(w.toBox.colIdx - 1, net)
          e.ys.push(busY, w.inY)
          e.left.push(busY)
          e.right.push(w.inY)
        }
      }
      continue
    }
    for (const w of net.wires) {
      const ct = w.toBox.colIdx
      if (ct === cs + 1) {
        const e = laneEntry(cs, net)
        e.ys.push(net.outY, w.inY)
        e.left.push(net.outY)
        e.right.push(w.inY)
      } else if (ct > cs + 1) {
        const e0 = laneEntry(cs, net)
        e0.ys.push(net.outY, net.trackY)
        e0.left.push(net.outY)
        e0.right.push(net.trackY)
        const e1 = laneEntry(ct - 1, net)
        e1.ys.push(net.trackY, w.inY)
        e1.left.push(net.trackY)
        e1.right.push(w.inY)
        if (ct - 1 < net.trackToCh) e1.right.push(net.trackY)
      }
    }
  }

  const laneX = {}
  for (const channel of Object.values(channels)) {
    const bounds = channelBounds(channel.ch)
    const all = Object.values(channel.entries).map((e) => ({
      ...e,
      min: Math.min(...e.ys),
      max: Math.max(...e.ys)
    }))
    // Đường thẳng (cổng ra trùng cổng vào) không cần trục dọc
    const straight = all.filter((e) => e.max - e.min < 0.5)
    const lanes = all.filter((e) => e.max - e.min >= 0.5)
    for (const e of straight) laneX[`${e.net.key}@${channel.ch}`] = bounds.center

    const n = lanes.length
    if (!n) continue
    const step = n > 1 ? Math.min(MAX_LANE_STEP, (bounds.right - bounds.left) / (n - 1)) : 0
    const xs = spread(n, bounds.center, step)

    const inside = (y, e) => y > e.min + 0.5 && y < e.max - 0.5
    const cost = (order) => {
      let c = 0
      for (let i = 0; i < order.length; i++) {
        for (let j = i + 1; j < order.length; j++) {
          const a = order[i] // a nằm bên trái b
          const b = order[j]
          for (const y of b.left) if (inside(y, a)) c += 1
          for (const y of a.right) if (inside(y, b)) c += 1
          // Chồng thẳng hàng: nhánh từ mép trái tới trục b và nhánh từ trục a sang
          // mép phải cùng tung độ sẽ trùng nhau trên đoạn [a, b]
          for (const y of b.left) {
            for (const y2 of a.right) {
              const dy = Math.abs(y - y2)
              if (dy < SAME_Y) c += 1000
              else if (dy < FORBID_GAP) c += 50
            }
          }
        }
      }
      return c
    }
    const order = bestOrder(lanes, cost)
    order.forEach((e, i) => {
      laneX[`${e.net.key}@${channel.ch}`] = xs[i]
    })
  }

  // --------------------------------------------- 4. Làn ngang trong rãnh hàng
  const corridors = {}
  for (const net of nets) {
    if (!net.farWires?.length) continue
    const x0 = laneX[`${net.key}@${net.trackFromCh}`]
    const x1 = laneX[`${net.key}@${net.trackToCh}`]
    const verticals = [{ x: x0, toY: net.outY }]
    for (const w of net.farWires) {
      verticals.push({ x: laneX[`${net.key}@${w.toBox.colIdx - 1}`], toY: w.inY })
    }
    ;(corridors[net.corridorIdx] ||= []).push({ net, x0, x1, verticals })
  }

  for (const [rKey, list] of Object.entries(corridors)) {
    const c = corridor(Number(rKey))
    const center = c?.center ?? list[0].net.trackY
    const height = c?.height ?? 28
    const n = list.length
    const step = n > 1 ? Math.min(MAX_TRACK_STEP, Math.max(2, height - 2 * TRACK_MARGIN) / (n - 1)) : 0
    const ys = spread(n, center, step)
    const overlapX = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5
    const cost = (order) => {
      let total = 0
      order.forEach((a, ia) => {
        order.forEach((b, ib) => {
          if (a === b || !overlapX(a, b)) return
          const ya = ys[ia]
          const yb = ys[ib]
          for (const v of a.verticals) {
            if (v.x <= b.x0 + 0.5 || v.x >= b.x1 - 0.5) continue
            if (v.toY < ya && yb < ya && yb > v.toY) total += 1
            if (v.toY > ya && yb > ya && yb < v.toY) total += 1
          }
        })
      })
      return total
    }
    const order = bestOrder(list, cost)
    order.forEach((entry, i) => {
      entry.net.trackY = ys[i]
    })
  }

  // ------------------------------------------------------- 5. Dựng waypoint
  return wires.map((w) => {
    const { fromBox: s, toBox: t, net } = w
    let points

    if (net?.kind === 'coreq') {
      const lx = laneX[`${net.key}@${s.colIdx}`]
      points = [
        { x: s.right, y: net.outY },
        { x: lx, y: net.outY },
        { x: lx, y: w.inY },
        { x: t.right, y: w.inY }
      ]
    } else if (w.connType === 'corequisite') {
      const upper = s.top <= t.top ? s : t
      const lower = upper === s ? t : s
      const mx = (Math.max(upper.left, lower.left) + Math.min(upper.right, lower.right)) / 2
      points = upper === s
        ? [{ x: mx, y: upper.bottom }, { x: mx, y: lower.top }]
        : [{ x: mx, y: lower.top }, { x: mx, y: upper.bottom }]
    } else if (net.kind === 'top' || net.kind === 'bottom') {
      const busY = net.kind === 'top' ? topBusY : bottomBusY
      const start = w.srcSide
        ? [
            { x: s.right, y: net.outY },
            { x: laneX[`${net.key}@${s.colIdx}`], y: net.outY },
            { x: laneX[`${net.key}@${s.colIdx}`], y: busY }
          ]
        : [
            { x: s.midX, y: s.bottom },
            { x: s.midX, y: busY }
          ]
      const lx1 = laneX[`${net.key}@${t.colIdx - 1}`]
      const end = w.dstSide
        ? [
            { x: lx1, y: busY },
            { x: lx1, y: w.inY },
            { x: t.left, y: w.inY }
          ]
        : [
            { x: t.midX, y: busY },
            { x: t.midX, y: net.kind === 'top' ? t.top : t.bottom }
          ]
      points = [...start, ...end]
    } else if (t.colIdx === s.colIdx + 1) {
      const lx = laneX[`${net.key}@${s.colIdx}`]
      points = [
        { x: s.right, y: net.outY },
        { x: lx, y: net.outY },
        { x: lx, y: w.inY },
        { x: t.left, y: w.inY }
      ]
    } else if (t.colIdx > s.colIdx + 1) {
      const lx0 = laneX[`${net.key}@${s.colIdx}`]
      const lx1 = laneX[`${net.key}@${t.colIdx - 1}`]
      points = [
        { x: s.right, y: net.outY },
        { x: lx0, y: net.outY },
        { x: lx0, y: net.trackY },
        { x: lx1, y: net.trackY },
        { x: lx1, y: w.inY },
        { x: t.left, y: w.inY }
      ]
    } else {
      // Dự phòng (đích nằm ở cột trước nguồn): vòng qua rãnh bên phải nguồn
      const lx = channelBounds(s.colIdx).center
      points = [
        { x: s.right, y: s.midY },
        { x: lx, y: s.midY },
        { x: lx, y: t.midY },
        { x: t.right, y: t.midY }
      ]
    }

    return { id: w.id, from: w.from, to: w.to, connType: w.connType, points }
  })
}

/**
 * Kiểm tra hình học sau khi định tuyến: đoạn thẳng xuyên qua ô học phần, và đoạn
 * thẳng hàng chồng lên nhau giữa hai nguồn khác nhau. Dùng cho kiểm thử.
 */
export function findWireConflicts(routed, boxes, obstacles = []) {
  const segs = []
  for (const r of routed) {
    const pts = r.points.filter((p, i, arr) => i === 0 || Math.abs(p.x - arr[i - 1].x) > 0.5 || Math.abs(p.y - arr[i - 1].y) > 0.5)
    for (let i = 1; i < pts.length; i++) segs.push({ wire: r, a: pts[i - 1], b: pts[i] })
  }

  const crossings = []
  const named = Object.entries(boxes)
  for (const { wire, a, b } of segs) {
    for (const [code, bx] of named) {
      if (code === wire.from || code === wire.to) continue
      if (boxesHitSegment([bx], a, b, new Set())) crossings.push(`${wire.id} xuyên qua ${code}`)
    }
    if (boxesHitSegment(obstacles, a, b, new Set())) crossings.push(`${wire.id} xuyên qua vật cản`)
  }

  const overlaps = []
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const s1 = segs[i]
      const s2 = segs[j]
      if (s1.wire.from === s2.wire.from) continue
      const v1 = Math.abs(s1.a.x - s1.b.x) < 0.5
      const v2 = Math.abs(s2.a.x - s2.b.x) < 0.5
      if (v1 !== v2) continue
      if (v1) {
        if (Math.abs(s1.a.x - s2.a.x) >= 2) continue
        const o = Math.min(Math.max(s1.a.y, s1.b.y), Math.max(s2.a.y, s2.b.y)) - Math.max(Math.min(s1.a.y, s1.b.y), Math.min(s2.a.y, s2.b.y))
        if (o > 1) overlaps.push(`${s1.wire.id} & ${s2.wire.id} (dọc x=${s1.a.x.toFixed(0)})`)
      } else {
        if (Math.abs(s1.a.y - s2.a.y) >= 2) continue
        const o = Math.min(Math.max(s1.a.x, s1.b.x), Math.max(s2.a.x, s2.b.x)) - Math.max(Math.min(s1.a.x, s1.b.x), Math.min(s2.a.x, s2.b.x))
        if (o > 1) overlaps.push(`${s1.wire.id} & ${s2.wire.id} (ngang y=${s1.a.y.toFixed(0)})`)
      }
    }
  }

  return { crossings: [...new Set(crossings)], overlaps: [...new Set(overlaps)] }
}
