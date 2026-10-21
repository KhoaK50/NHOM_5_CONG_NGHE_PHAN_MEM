import { useState, useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import {
  Compass,
  Upload,
  ArrowRight,
  RotateCcw
} from 'lucide-react'
import '../../styles/scrollytelling.css'

// ============================================================================
// 5 NHỊP TÂM TƯ TRONG CƠN MƠ ĐÊM TỐI (TRƯỚC SCENE 1) — Bạn có thể chỉnh sửa từ ngữ tại đây!
// ============================================================================
const DREAM_THOUGHTS = [
  {
    id: 'dream-1',
    text: 'Một nơi quy tụ tài liệu học tập?',
    posClass: 'thought-pos-1'
  },
  {
    id: 'dream-2',
    text: 'Đúng, mình cần một nơi như thế...',
    posClass: 'thought-pos-2'
  },
  {
    id: 'dream-3',
    text: 'Nơi chứa đựng đa dạng các loại tài liệu của ngành mình...',
    posClass: 'thought-pos-3'
  },
  {
    id: 'dream-4',
    text: '...mà mình không phải mất công tìm kiếm xa xôi.',
    posClass: 'thought-pos-4'
  },
  {
    id: 'dream-5',
    text: 'Không lẽ nơi đó là...',
    posClass: 'thought-pos-5'
  }
]

const ACT_TARGETS = [
  { id: 'act-dream', roman: 'I', label: 'Trong cơn mơ', isDream: true, ratio: 0.0 },
  { id: 'act-1', roman: 'II', label: 'Tỉnh giấc giữa ngổn ngang', ratio: 0.06 },
  { id: 'act-2', roman: 'III', label: 'Phân định đâu ra đấy', ratio: 0.36 },
  { id: 'act-3', roman: 'IV', label: 'Xoắn quyện & Kết tinh', ratio: 0.60 },
  { id: 'act-4', roman: 'V', label: 'Khởi sinh 5share', ratio: 0.96 }
]

// 5 Sắc thái Học liệu có độ bão hòa & tương phản cao
const FIVE_CATEGORIES = [
  {
    id: 0,
    name: 'Giáo trình & Chuyên khảo',
    primaryHex: '#0052cc',
    secondaryHex: '#cfe6ff',
    inkHex: '#091e42',
    threeColor: 0x0052cc
  },
  {
    id: 1,
    name: 'Kế hoạch bài dạy',
    primaryHex: '#0088ee',
    secondaryHex: '#ccf0ff',
    inkHex: '#052e42',
    threeColor: 0x0088ee
  },
  {
    id: 2,
    name: 'Slide & Trực quan',
    primaryHex: '#ea580c',
    secondaryHex: '#ffedd5',
    inkHex: '#431407',
    threeColor: 0xea580c
  },
  {
    id: 3,
    name: 'Thuật toán & Đồ án',
    primaryHex: '#5b21b6',
    secondaryHex: '#ede9fe',
    inkHex: '#2e1065',
    threeColor: 0x5b21b6
  },
  {
    id: 4,
    name: 'Đề cương & Khảo thí',
    primaryHex: '#dc2626',
    secondaryHex: '#fee2e2',
    inkHex: '#450a0a',
    threeColor: 0xdc2626
  }
]

const SPARK_ANGLES = [
  { dx: -46, dy: -38 },
  { dx: -24, dy: -54 },
  { dx: 0, dy: -62 },
  { dx: 26, dy: -52 },
  { dx: 48, dy: -34 },
  { dx: 34, dy: -14 }
]

function clamp01(x) {
  return Math.max(0, Math.min(1, x))
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function smootherstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function createCurvedFolioGeometry(width = 1.32, height = 1.82, segX = 12, segY = 16, bendProfile = 0) {
  const geo = new THREE.PlaneGeometry(width, height, segX, segY)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const nx = x / (width * 0.5)
    const ny = y / (height * 0.5)

    let z
    if (bendProfile === 0) {
      z = Math.sin(ny * Math.PI * 0.65) * 0.13 + (nx * nx) * 0.07
    } else if (bendProfile === 1) {
      z = Math.cos(nx * Math.PI * 0.6) * 0.12 - Math.sin(ny * 1.4) * 0.09
    } else {
      z = (nx * ny) * 0.15 + Math.sin((nx + ny) * 1.5) * 0.06
    }
    pos.setZ(i, z)
  }
  geo.computeVertexNormals()
  return geo
}

// Texture trang tài liệu độ tương phản cao, viền sắc nét, mực đậm rõ ràng
function createCategoryFolioTextures() {
  return FIVE_CATEGORIES.map((cat, idx) => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 720
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 512, 720)

    // Dải đầu trang & Gáy sách đậm màu tạo độ tương phản mạnh
    ctx.fillStyle = cat.primaryHex
    ctx.fillRect(0, 0, 512, 132)
    ctx.fillRect(0, 0, 42, 720)

    ctx.fillStyle = cat.secondaryHex
    ctx.fillRect(64, 156, 414, 190)

    // Khung viền ngoài đậm sắc nét
    ctx.strokeStyle = cat.primaryHex
    ctx.lineWidth = 10
    ctx.strokeRect(5, 5, 502, 710)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(68, 36, 160, 22)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)'
    ctx.fillRect(68, 72, 260, 12)

    ctx.strokeStyle = cat.primaryHex
    ctx.fillStyle = cat.primaryHex
    ctx.lineWidth = 5

    if (idx === 0) {
      ctx.beginPath()
      ctx.arc(225, 248, 62, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(295, 248, 62, 0, Math.PI * 2)
      ctx.stroke()
    } else if (idx === 1) {
      ctx.fillRect(225, 178, 86, 34)
      ctx.fillRect(115, 260, 86, 34)
      ctx.fillRect(225, 260, 86, 34)
      ctx.fillRect(335, 260, 86, 34)
      ctx.beginPath()
      ctx.moveTo(268, 212)
      ctx.lineTo(268, 260)
      ctx.moveTo(158, 236)
      ctx.lineTo(378, 236)
      ctx.moveTo(158, 236)
      ctx.lineTo(158, 260)
      ctx.moveTo(378, 236)
      ctx.lineTo(378, 260)
      ctx.stroke()
    } else if (idx === 2) {
      const bars = [70, 125, 95, 145, 112]
      bars.forEach((bh, bIdx) => {
        ctx.fillRect(115 + bIdx * 64, 318 - bh, 40, bh)
      })
    } else if (idx === 3) {
      ctx.beginPath()
      for (let x = 90; x <= 440; x += 6) {
        const t = (x - 90) / 350
        const y = 248 + Math.sin(t * Math.PI * 4) * 58
        if (x === 90) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    } else {
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          ctx.strokeRect(115 + c * 105, 178 + r * 48, 86, 36)
        }
      }
    }

    // Các dòng chữ in đậm rõ nét
    for (let row = 0; row < 9; row++) {
      const y = 382 + row * 32
      const w = row % 3 === 2 ? 255 : 395 - (row % 2) * 45
      ctx.fillStyle = row % 3 === 0 ? cat.inkHex : 'rgba(30, 41, 59, 0.72)'
      ctx.fillRect(68, y, w, 12)
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    return tex
  })
}

// Mặt sàn Đá Kiến Trúc Tương Phản Cao (High-Contrast Architectural Atrium Floor)
function createHighContrastAtriumFloorTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const ctx = canvas.getContext('2d')

  // Nền sàn đá xám xanh đậm dần vào tâm tạo chiều sâu vững chãi
  const rad = ctx.createRadialGradient(512, 512, 20, 512, 512, 505)
  rad.addColorStop(0.0, 'rgba(186, 206, 232, 0.92)')
  rad.addColorStop(0.55, 'rgba(203, 218, 236, 0.75)')
  rad.addColorStop(1.0, 'rgba(226, 234, 244, 0.0)')
  ctx.fillStyle = rad
  ctx.fillRect(0, 0, 1024, 1024)

  // Lưới mạch gạch kiến trúc sắc nét, độ tương phản cao
  const step = 64
  for (let i = 0; i <= 1024; i += step) {
    const isMajor = i % (step * 2) === 0
    ctx.strokeStyle = isMajor ? 'rgba(15, 38, 74, 0.36)' : 'rgba(30, 58, 95, 0.18)'
    ctx.lineWidth = isMajor ? 2.4 : 1.2
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, 1024)
    ctx.moveTo(0, i)
    ctx.lineTo(1024, i)
    ctx.stroke()
  }

  // Các vòng la bàn kiến trúc chính xác tại tâm khán phòng
  ;[140, 260, 380, 475].forEach((r, idx) => {
    ctx.strokeStyle = idx % 2 === 0 ? 'rgba(0, 82, 204, 0.42)' : 'rgba(15, 38, 74, 0.28)'
    ctx.lineWidth = idx % 2 === 0 ? 2.8 : 1.6
    ctx.beginPath()
    ctx.arc(512, 512, r, 0, Math.PI * 2)
    ctx.stroke()
  })

  // Các đường trục hướng tâm chỉ thẳng về 3 Đại Kệ Sách (Trái, Phải, Trực diện)
  ctx.strokeStyle = 'rgba(0, 82, 204, 0.35)'
  ctx.lineWidth = 2.2
  for (let a = 0; a < 8; a++) {
    const radAngle = (a / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(512 + Math.cos(radAngle) * 60, 512 + Math.sin(radAngle) * 60)
    ctx.lineTo(512 + Math.cos(radAngle) * 475, 512 + Math.sin(radAngle) * 475)
    ctx.stroke()
  }

  return new THREE.CanvasTexture(canvas)
}

function getLogoLoopPoint(leftOrRight, angleRad, radius = 3.25) {
  const centerX = leftOrRight === 0 ? -1.85 : 1.85
  const x = centerX + Math.cos(angleRad) * radius
  const y = Math.sin(angleRad) * radius
  const weaveSign = leftOrRight === 0 ? 1 : -1
  const z = Math.sin(angleRad) * 0.48 * weaveSign
  return new THREE.Vector3(x, y, z)
}

function buildLoopTubularFrames(leftOrRight, tubularSegs) {
  const frames = []
  for (let i = 0; i <= tubularSegs; i++) {
    const t = i / tubularSegs
    const u = t * Math.PI * 2
    const c = getLogoLoopPoint(leftOrRight, u, 3.25)
    const cNext = getLogoLoopPoint(leftOrRight, u + 0.002, 3.25)
    const cPrev = getLogoLoopPoint(leftOrRight, u - 0.002, 3.25)
    const tangent = cNext.sub(cPrev).normalize()

    const normal = new THREE.Vector3(Math.cos(u), Math.sin(u), 0)
    normal.addScaledVector(tangent, -normal.dot(tangent)).normalize()
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize()

    frames.push({
      cx: c.x,
      cy: c.y,
      cz: c.z,
      nx: normal.x,
      ny: normal.y,
      nz: normal.z,
      bx: binormal.x,
      by: binormal.y,
      bz: binormal.z,
      tx: tangent.x,
      ty: tangent.y,
      tz: tangent.z,
      t,
      u
    })
  }
  return frames
}

function createDynamicTubeBuffer(tubularSegs, radialSegs) {
  const geo = new THREE.BufferGeometry()
  const vertCount = (tubularSegs + 1) * (radialSegs + 1)
  const positions = new Float32Array(vertCount * 3)
  const normals = new Float32Array(vertCount * 3)
  const indices = []

  for (let i = 0; i < tubularSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * (radialSegs + 1) + j
      const b = (i + 1) * (radialSegs + 1) + j
      const c = (i + 1) * (radialSegs + 1) + (j + 1)
      const d = i * (radialSegs + 1) + (j + 1)
      indices.push(a, d, b)
      indices.push(b, d, c)
    }
  }

  geo.setIndex(indices)
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))

  const cosTable = new Float32Array(radialSegs + 1)
  const sinTable = new Float32Array(radialSegs + 1)
  const thetaTable = new Float32Array(radialSegs + 1)
  for (let j = 0; j <= radialSegs; j++) {
    const th = (j / radialSegs) * Math.PI * 2
    thetaTable[j] = th
    cosTable[j] = Math.cos(th)
    sinTable[j] = Math.sin(th)
  }

  return { geo, tubularSegs, radialSegs, cosTable, sinTable, thetaTable }
}

function updateBraidedStrandGeometry(tubeData, frames, coilRadius, baseTubeRadius, helixTurns, phaseOffset, liveSpinPhase, growT) {
  const { geo, tubularSegs, radialSegs, cosTable, sinTable } = tubeData
  const posArr = geo.attributes.position.array
  const normArr = geo.attributes.normal.array
  const stride = radialSegs + 1

  for (let i = 0; i <= tubularSegs; i++) {
    const f = frames[i]
    const tipEnvelope = smoothstep(0.0, 0.18, growT * 1.18 - f.t)
    const pulseWave = 1.0 + 0.30 * Math.sin(f.u * 3.0 - liveSpinPhase * 1.4 + phaseOffset)
    const rTube = baseTubeRadius * tipEnvelope * pulseWave

    const helixAngle = f.u * helixTurns + phaseOffset + liveSpinPhase
    const cosH = Math.cos(helixAngle)
    const sinH = Math.sin(helixAngle)

    const scx = f.cx + coilRadius * (cosH * f.nx + sinH * f.bx)
    const scy = f.cy + coilRadius * (cosH * f.ny + sinH * f.by)
    const scz = f.cz + coilRadius * (cosH * f.nz + sinH * f.bz)

    const rowBase = i * stride
    for (let j = 0; j <= radialSegs; j++) {
      const cT = cosTable[j]
      const sT = sinTable[j]

      const vnx = cT * f.nx + sT * f.bx
      const vny = cT * f.ny + sT * f.by
      const vnz = cT * f.nz + sT * f.bz

      const idx3 = (rowBase + j) * 3
      posArr[idx3] = scx + rTube * vnx
      posArr[idx3 + 1] = scy + rTube * vny
      posArr[idx3 + 2] = scz + rTube * vnz

      normArr[idx3] = vnx
      normArr[idx3 + 1] = vny
      normArr[idx3 + 2] = vnz
    }
  }

  geo.attributes.position.needsUpdate = true
  geo.attributes.normal.needsUpdate = true
}

function updateMasterRibbonGeometry(tubeData, frames, baseRadius, growT, polishT, liveSpinPhase) {
  const { geo, tubularSegs, radialSegs, cosTable, sinTable, thetaTable } = tubeData
  const posArr = geo.attributes.position.array
  const normArr = geo.attributes.normal.array
  const stride = radialSegs + 1

  const ropeState = 1.0 - polishT
  const fluteAmp = 0.25 * ropeState

  for (let i = 0; i <= tubularSegs; i++) {
    const f = frames[i]
    const tipEnvelope = smoothstep(0.0, 0.22, growT * 1.22 - f.t)
    const coreShrink = 1.0 - 0.16 * ropeState
    const rowBase = i * stride

    for (let j = 0; j <= radialSegs; j++) {
      const theta = thetaTable[j]
      const cT = cosTable[j]
      const sT = sinTable[j]

      const flutePhase = 4.0 * theta - f.u * 6.0 - liveSpinPhase * 1.35
      const cosFlute = Math.cos(flutePhase)
      const sinFlute = Math.sin(flutePhase)

      const rLocal = baseRadius * tipEnvelope * (coreShrink + fluteAmp * cosFlute)

      const radNx = cT * f.nx + sT * f.bx
      const radNy = cT * f.ny + sT * f.by
      const radNz = cT * f.nz + sT * f.bz

      const tanThetaX = -sT * f.nx + cT * f.bx
      const tanThetaY = -sT * f.ny + cT * f.by
      const tanThetaZ = -sT * f.nz + cT * f.bz

      const fluteSlope = 0.42 * ropeState * sinFlute
      let vnx = radNx + fluteSlope * tanThetaX
      let vny = radNy + fluteSlope * tanThetaY
      let vnz = radNz + fluteSlope * tanThetaZ
      const invLen = 1.0 / Math.max(0.0001, Math.sqrt(vnx * vnx + vny * vny + vnz * vnz))
      vnx *= invLen
      vny *= invLen
      vnz *= invLen

      const idx3 = (rowBase + j) * 3
      posArr[idx3] = f.cx + rLocal * radNx
      posArr[idx3 + 1] = f.cy + rLocal * radNy
      posArr[idx3 + 2] = f.cz + rLocal * radNz

      normArr[idx3] = vnx
      normArr[idx3 + 1] = vny
      normArr[idx3 + 2] = vnz
    }
  }

  geo.attributes.position.needsUpdate = true
  geo.attributes.normal.needsUpdate = true
}

const CAMERA_TIMELINE = [
  // 0. Vừa mở mắt tỉnh giấc: Bắt đầu xoay chậm sang Đại Kệ Sách TRÁI
  { p: 0.00, pos: [0.0, 0.5, 7.6], look: [-11.5, 0.5, -3.5], roll: 0.03, fov: 47 },
  // 1. Nhìn vào đống ngổn ngang tràn khỏi kệ TRÁI (-75°)
  { p: 0.05, pos: [-0.8, 0.4, 7.2], look: [-19.5, 0.4, 1.2], roll: 0.06, fov: 46 },
  // 2. Dừng ánh mắt ngắm kỹ kệ TRÁI (Dwell Hold)
  { p: 0.08, pos: [-0.9, 0.4, 7.1], look: [-19.8, 0.1, 1.8], roll: 0.05, fov: 46 },
  // 3. Điểm trung gian khi lia đầu từ Trái qua Phải để đầu xoay êm
  { p: 0.115, pos: [0.0, 0.5, 7.6], look: [0.0, 0.2, -12.5], roll: 0.0, fov: 48 },
  // 4. Nhìn vào đống ngổn ngang tràn khỏi kệ PHẢI (+75°)
  { p: 0.15, pos: [0.8, 0.4, 7.2], look: [19.5, -0.2, 1.2], roll: -0.06, fov: 46 },
  // 5. Dừng ánh mắt ngắm kỹ kệ PHẢI (Dwell Hold)
  { p: 0.18, pos: [0.9, 0.4, 7.1], look: [19.8, -0.4, 1.8], roll: -0.05, fov: 46 },
  // 6. Quay chậm về TRỰC DIỆN ngắm Đại Kệ Sách phía trước
  { p: 0.22, pos: [0.0, 0.5, 8.2], look: [0.0, 0.3, -15.5], roll: 0.0, fov: 49 },
  // 7. Giữ nhịp ngắn ở TRỰC DIỆN trước khi bị bao vây
  { p: 0.245, pos: [0.0, 0.6, 9.0], look: [0.0, 0.2, -14.0], roll: 0.0, fov: 50 },
  // 8. Cảm giác BAO VÂY: Lùi lại thấy toàn cảnh 3 Đại Kệ Sách Tương Phản Cao và 3 đống tài liệu ập vào vây kín
  { p: 0.30, pos: [0.0, 1.9, 17.8], look: [0.0, 0.2, -2.0], roll: 0.0, fov: 55 },
  // 9. Scene 2 (Phân đâu ra đấy): Bay lên góc cao nhìn 3 đống tự phân loại thành 5 LUỒNG MÀU
  { p: 0.39, pos: [0.0, 7.4, 18.8], look: [0.0, -0.4, 0.0], roll: 0.0, fov: 48 },
  // 10. 5 luồng màu đan thành 2 vòng nhẫn giấy và bắt đầu cuốn lốc xoáy
  { p: 0.46, pos: [-2.4, 1.2, 13.6], look: [0.0, 0.4, 0.0], roll: 0.04, fov: 44 },
  // 11. Hạ khung Letterbox & Tiến vào góc cận nghiêng nhìn 180 tờ giấy cuốn xoáy quanh lõi
  { p: 0.54, pos: [-1.65, 1.15, 4.80], look: [-0.15, 1.55, 0.0], roll: -0.13, fov: 33 },
  // 12. Góc Macro Cực Cận 1 (Trái -> Giữa): Ngắm 6 dải lụa 3D đang xoắn tít và bện chặt vào nhau
  { p: 0.63, pos: [-0.70, 1.62, 3.25], look: [0.0, 1.68, 0.0], roll: -0.17, fov: 27 },
  // 13. Góc Macro Cực Cận 2 (Giữa -> Phải): Ngắm các múi dây thừng xoắn đang nung chảy thành mặt kính bóng gương
  { p: 0.72, pos: [0.85, 1.70, 3.30], look: [0.0, 1.66, 0.0], roll: 0.14, fov: 27 },
  // 14. Góc Trung Cận rút dần ra khi mặt kính hoàn tất độ bóng và hạt bụi sao bung tỏa
  { p: 0.79, pos: [0.45, 0.85, 7.60], look: [0.0, 0.60, 0.0], roll: 0.05, fov: 35 },
  // 15. Scene 4 (Nâng khung Letterbox & Dolly Out toàn cảnh biểu tượng 3D)
  { p: 0.86, pos: [0.0, 0.15, 17.0], look: [0.0, 0.0, 0.0], roll: 0.0, fov: 41 },
  // 16. Scene 5 (Khởi sinh 5share)
  { p: 0.93, pos: [0.0, 0.0, 17.6], look: [0.0, 0.0, 0.0], roll: 0.0, fov: 40 },
  { p: 1.00, pos: [0.0, 0.0, 17.6], look: [0.0, 0.0, 0.0], roll: 0.0, fov: 40 }
]

function sampleCamera(progress) {
  const p = clamp01(progress)
  for (let i = 0; i < CAMERA_TIMELINE.length - 1; i++) {
    const k0 = CAMERA_TIMELINE[i]
    const k1 = CAMERA_TIMELINE[i + 1]
    if (p >= k0.p && p <= k1.p) {
      const t = smootherstep(k0.p, k1.p, p)
      return {
        pos: [
          lerp(k0.pos[0], k1.pos[0], t),
          lerp(k0.pos[1], k1.pos[1], t),
          lerp(k0.pos[2], k1.pos[2], t)
        ],
        look: [
          lerp(k0.look[0], k1.look[0], t),
          lerp(k0.look[1], k1.look[1], t),
          lerp(k0.look[2], k1.look[2], t)
        ],
        roll: lerp(k0.roll, k1.roll, t),
        fov: lerp(k0.fov, k1.fov, t)
      }
    }
  }
  const last = CAMERA_TIMELINE[CAMERA_TIMELINE.length - 1]
  return { pos: [...last.pos], look: [...last.look], roll: last.roll, fov: last.fov }
}

export default function LandingPage({
  onNavigate,
  onExploreDiscovery,
  onOpenUpload,
  actorRole = 'GUEST'
}) {
  const runwayRef = useRef(null)
  const mountRef = useRef(null)

  const [dreamPhase, setDreamPhase] = useState('dreaming')
  const [dreamStep, setDreamStep] = useState(0)

  const [progress, setProgress] = useState(0)
  const [finaleTime, setFinaleTime] = useState(0)

  const targetProgressRef = useRef(0)
  const currentProgressRef = useRef(0)
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })
  const finaleActiveRef = useRef(false)
  const finaleStartClockRef = useRef(null)
  const stepCooldownRef = useRef(0)
  const touchStartYRef = useRef(null)

  const returnToDreamOrigin = useCallback((initialStep = 0) => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    targetProgressRef.current = 0
    currentProgressRef.current = 0
    setProgress(0)
    setDreamStep(initialStep)
    setDreamPhase('dreaming')
  }, [])

  useEffect(() => {
    const brandBtn = document.querySelector('.vec-brand-group')
    if (!brandBtn) return
    const handleBrandClick = () => {
      returnToDreamOrigin(0)
    }
    brandBtn.addEventListener('click', handleBrandClick)
    return () => brandBtn.removeEventListener('click', handleBrandClick)
  }, [returnToDreamOrigin])

  const triggerWakeUpBlink = useCallback(() => {
    if (dreamPhase !== 'dreaming') return
    setDreamPhase('blinking')
    window.scrollTo({ top: 0, behavior: 'instant' })
    targetProgressRef.current = 0
    currentProgressRef.current = 0
    setProgress(0)

    setTimeout(() => {
      setDreamPhase('awake')
    }, 1950)
  }, [dreamPhase])

  const advanceDreamStep = useCallback(
    (direction) => {
      const now = performance.now()
      if (now - stepCooldownRef.current < 650) return
      stepCooldownRef.current = now

      if (direction > 0) {
        if (dreamStep < DREAM_THOUGHTS.length - 1) {
          setDreamStep((prev) => prev + 1)
        } else {
          triggerWakeUpBlink()
        }
      } else if (direction < 0) {
        if (dreamStep > 0) {
          setDreamStep((prev) => prev - 1)
        }
      }
    },
    [dreamStep, triggerWakeUpBlink]
  )

  useEffect(() => {
    const onWheel = (e) => {
      if (dreamPhase === 'awake') {
        if (window.scrollY <= 2 && e.deltaY < -25) {
          e.preventDefault()
          returnToDreamOrigin(DREAM_THOUGHTS.length - 1)
        }
        return
      }

      e.preventDefault()
      if (dreamPhase !== 'dreaming') return
      if (Math.abs(e.deltaY) < 8) return
      advanceDreamStep(e.deltaY > 0 ? 1 : -1)
    }

    const onKeyDown = (e) => {
      if (dreamPhase === 'awake') {
        if (window.scrollY <= 2 && e.key === 'ArrowUp') {
          e.preventDefault()
          returnToDreamOrigin(DREAM_THOUGHTS.length - 1)
        }
        return
      }
      if (dreamPhase !== 'dreaming') return
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault()
        advanceDreamStep(1)
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        advanceDreamStep(-1)
      }
    }

    const onTouchStart = (e) => {
      if (e.touches && e.touches.length > 0) {
        touchStartYRef.current = e.touches[0].clientY
      }
    }

    const onTouchMove = (e) => {
      if (dreamPhase === 'awake') return
      e.preventDefault()
      if (dreamPhase !== 'dreaming' || touchStartYRef.current === null) return
      const dy = touchStartYRef.current - e.touches[0].clientY
      if (Math.abs(dy) > 36) {
        touchStartYRef.current = e.touches[0].clientY
        advanceDreamStep(dy > 0 ? 1 : -1)
      }
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [dreamPhase, advanceDreamStep, returnToDreamOrigin])

  const handleReplayFinale = () => {
    finaleStartClockRef.current = performance.now()
    setFinaleTime(0)
  }

  useEffect(() => {
    const handleScroll = () => {
      if (dreamPhase !== 'awake') {
        window.scrollTo({ top: 0, behavior: 'instant' })
        return
      }
      if (!runwayRef.current) return
      const maxScroll = runwayRef.current.offsetHeight - window.innerHeight
      if (maxScroll <= 0) return
      targetProgressRef.current = clamp01(window.scrollY / maxScroll)
    }

    const handleMouseMove = (e) => {
      pointerRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1
      pointerRef.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [dreamPhase])

  // Khởi tạo Không gian 3D Three.js với Hậu cảnh Khán Phòng Tương Phản Cao (High-Contrast Architectural Hall)
  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xe6edf6)
    // Đẩy sương mù ra thật xa (near: 52, far: 120) để hậu cảnh ở khoảng cách 20-32 KHÔNG BAO GIỜ bị mờ nhòa!
    scene.fog = new THREE.Fog(0xe6edf6, 52, 120)

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 180)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    container.innerHTML = ''
    container.appendChild(renderer.domElement)

    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTexture

    // ==================== HỆ THỐNG ÁNH SÁNG TƯƠNG PHẢN ĐIỆN ẢNH ====================
    const ambientLight = new THREE.AmbientLight(0xf1f5f9, 0.92)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3)
    keyLight.position.set(16, 28, 20)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.9)
    rimLight.position.set(-18, 14, -18)
    scene.add(rimLight)

    const fusionCoreLight = new THREE.PointLight(0x38bdf8, 0, 22, 1.4)
    fusionCoreLight.position.set(0, 1.65, 1.5)
    scene.add(fusionCoreLight)

    // ==================== HẬU CẢNH KHÁN PHÒNG LƯU TRỮ TƯƠNG PHẢN CAO (HIGH-CONTRAST ARCHITECTURAL ARCHIVE HALL) ====================
    // Sử dụng hệ cột thép/đá Slate đậm (#1e293b) và hậu kệ Navy sâu (#0f243c) để làm nổi bật 100% các tờ giấy trắng & 5 màu!
    const horizonGroup = new THREE.Group()
    scene.add(horizonGroup)

    const floorTex = createHighContrastAtriumFloorTexture()
    const floorGeo = new THREE.PlaneGeometry(88, 88, 1, 1)
    const floorMesh = new THREE.Mesh(
      floorGeo,
      new THREE.MeshBasicMaterial({
        map: floorTex,
        transparent: true,
        opacity: 0.96,
        depthWrite: false
      })
    )
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.set(0, -5.8, 0)
    horizonGroup.add(floorMesh)

    const atriumArchGroup = new THREE.Group()
    scene.add(atriumArchGroup)

    // Vật liệu Cột trụ & Khung kệ màu Slate Đậm (#1e293b) tạo tương phản mạnh với giấy trắng
    const darkPillarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.25,
      envMapIntensity: 0.35,
      transparent: true,
      opacity: 0.96
    })

    // Vật liệu Tấm lưng hốc kệ màu Deep Navy-Slate (#16253b) để giấy trắng phía trước nổi bật sắc nét
    const backboardMat = new THREE.MeshStandardMaterial({
      color: 0x16253b,
      roughness: 0.65,
      metalness: 0.12,
      envMapIntensity: 0.15,
      transparent: true,
      opacity: 0.94
    })

    // Vật liệu Thanh dầm kệ ngang (#293b54)
    const shelfDeckMat = new THREE.MeshStandardMaterial({
      color: 0x293b54,
      roughness: 0.42,
      metalness: 0.20,
      envMapIntensity: 0.3,
      transparent: true,
      opacity: 0.96
    })

    // Viền chỉ Sapphire sáng sắc nét trên mép kệ và cột
    const crispAccentLineMat = new THREE.LineBasicMaterial({
      color: 0x0077e6,
      transparent: true,
      opacity: 0.72
    })

    const structuralWireMat = new THREE.LineBasicMaterial({
      color: 0x334155,
      transparent: true,
      opacity: 0.55
    })

    // Vật liệu các cuốn sách còn nằm trên kệ (bị xô nghiêng domino)
    const shelfBookMaterials = FIVE_CATEGORIES.map(
      (cat) =>
        new THREE.MeshStandardMaterial({
          color: cat.threeColor,
          roughness: 0.4,
          metalness: 0.08,
          envMapIntensity: 0.2,
          transparent: true,
          opacity: 0.95
        })
    )

    // Hàm dựng 1 Đại Kệ Học Liệu Tương Phản Cao (High-Contrast Monumental Bookcase Bay)
    function buildHighContrastArchiveBay(bayX, bayZ, rotY, baySeed) {
      const bay = new THREE.Group()
      bay.position.set(bayX, -5.8, bayZ)
      bay.rotation.y = rotY

      const bayWidth = 17.6
      const bayHeight = 16.2

      // 1. Tấm lưng kệ tối màu (Dark Architectural Backboard) giúp tạo nền tương phản cao sau đống giấy
      const backGeo = new THREE.BoxGeometry(bayWidth, bayHeight, 0.35)
      const backMesh = new THREE.Mesh(backGeo, backboardMat)
      backMesh.position.set(0, bayHeight / 2, -4.4)
      backMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(backGeo), crispAccentLineMat))
      bay.add(backMesh)

      // 2. 5 Cột trụ đứng bằng thép Slate đậm chia kệ thành 4 khoang
      const colGeo = new THREE.BoxGeometry(0.62, bayHeight + 0.6, 2.8)
      const colEdges = new THREE.EdgesGeometry(colGeo)
      ;[-8.5, -4.25, 0.0, 4.25, 8.5].forEach((cx) => {
        const col = new THREE.Mesh(colGeo, darkPillarMat)
        col.position.set(cx, (bayHeight + 0.6) / 2, -3.3)
        col.add(new THREE.LineSegments(colEdges, crispAccentLineMat))
        bay.add(col)
      })

      // 3. 5 Tầng kệ ngang + Sách trên kệ bị xô đổ Domino & tràn ra mép kệ
      const shelfGeo = new THREE.BoxGeometry(bayWidth + 0.4, 0.34, 2.9)
      const shelfEdges = new THREE.EdgesGeometry(shelfGeo)
      const bookGeo = new THREE.BoxGeometry(0.34, 1.75, 1.35)

      ;[0.3, 3.4, 6.5, 9.6, 12.7, 15.8].forEach((sy, sIdx) => {
        const shelf = new THREE.Mesh(shelfGeo, shelfDeckMat)
        shelf.position.set(0, sy, -3.3)
        shelf.add(new THREE.LineSegments(shelfEdges, crispAccentLineMat))
        bay.add(shelf)

        // Trên mỗi tầng kệ (trừ nóc trên cùng), đặt các dãy sách bị xô nghiêng và hổng chỗ do đã văng ra ngoài
        if (sIdx < 5) {
          for (let b = 0; b < 14; b++) {
            const hash = (baySeed * 31 + sIdx * 17 + b * 13) % 10
            // Chừa các khoảng trống nơi tài liệu đã bị bung tràn ra ngoài không trung
            if (hash < 4) continue

            const bx = -7.6 + b * 1.15
            const bMat = shelfBookMaterials[(b + sIdx + baySeed) % 5]
            const book = new THREE.Mesh(bookGeo, bMat)

            // Một số cuốn sách bị nghiêng đổ domino hoặc thò nửa thân ra khỏi mép kệ!
            const isTiltedDomino = hash >= 7
            const tiltZ = isTiltedDomino ? (b % 2 === 0 ? 0.42 : -0.38) : 0
            const jutOutZ = hash === 9 ? 0.85 : 0

            book.position.set(bx, sy + 1.02, -3.2 + jutOutZ)
            book.rotation.z = tiltZ
            if (jutOutZ > 0) {
              book.rotation.x = 0.35
            }
            bay.add(book)
          }
        }
      })

      return bay
    }

    // Đặt 3 Đại Kệ Tương Phản Cao tại đúng 3 hướng Trái, Phải, Trực diện
    atriumArchGroup.add(buildHighContrastArchiveBay(-23.5, 1.2, Math.PI / 2 - 0.12, 1))
    atriumArchGroup.add(buildHighContrastArchiveBay(23.5, 1.2, -Math.PI / 2 + 0.12, 2))
    atriumArchGroup.add(buildHighContrastArchiveBay(0.0, -20.5, 0.0, 3))

    // Hệ khung vòm kiến trúc nối liền 3 đại kệ (Perimeter Structural Colonnade) sắc nét
    ;[27.5, 32.0].forEach((radius, rIdx) => {
      const octGeo = new THREE.EdgesGeometry(new THREE.CylinderGeometry(radius, radius, 17.5, 16, 2, true))
      const octLines = new THREE.LineSegments(
        octGeo,
        rIdx === 0 ? crispAccentLineMat : structuralWireMat
      )
      octLines.position.y = 2.95
      atriumArchGroup.add(octLines)
    })

    // ==================== 180 TÀI LIỆU SẮC NÉT (5 MÀU SẮC & HÌNH KHỐI) TRÀN KHỎI KỆ & RƠI VƯƠNG VÃI DƯỚI SÀN ====================
    const stageRoot = new THREE.Group()
    scene.add(stageRoot)

    const foliosGroup = new THREE.Group()
    stageRoot.add(foliosGroup)

    const categoryTextures = createCategoryFolioTextures()
    const folioGeos = [
      createCurvedFolioGeometry(1.36, 1.86, 12, 16, 0),
      new THREE.BoxGeometry(1.38, 1.88, 0.18),
      createCurvedFolioGeometry(1.86, 1.28, 12, 12, 1),
      createCurvedFolioGeometry(1.36, 1.86, 12, 16, 2)
    ]

    const FOLIO_COUNT = 180
    const foliosData = []
    const standardEdgeGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.36, 1.86))

    for (let i = 0; i < FOLIO_COUNT; i++) {
      const categoryId = i % 5
      const clusterId = i % 3
      const idxInCluster = Math.floor(i / 3)

      // Giảm envMapIntensity xuống 0.18 để trang giấy KHÔNG bị chói trắng, giữ trọn màu sắc đậm đà và chữ sắc nét!
      const mat = new THREE.MeshPhysicalMaterial({
        map: categoryTextures[categoryId],
        color: 0xffffff,
        emissive: 0x003388,
        emissiveIntensity: 0.0,
        roughness: 0.42,
        metalness: 0.04,
        clearcoat: 0.18,
        clearcoatRoughness: 0.25,
        envMapIntensity: 0.18,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1.0
      })

      const edgeMat = new THREE.LineBasicMaterial({
        color: FIVE_CATEGORIES[categoryId].threeColor,
        transparent: true,
        opacity: 0.88
      })

      const geo = folioGeos[i % folioGeos.length]
      const fGroup = new THREE.Group()
      const mesh = new THREE.Mesh(geo, mat)
      const edge = new THREE.LineSegments(standardEdgeGeo, edgeMat)
      fGroup.add(mesh, edge)
      foliosGroup.add(fGroup)

      const golden = idxInCluster * 2.39996
      const radiusSpread = 1.2 + Math.sqrt(idxInCluster / 60) * 5.8
      const lx = Math.cos(golden) * radiusSpread * 1.15
      const isFloorSpill = idxInCluster % 4 === 0
      const ly = isFloorSpill
        ? -5.2 + (idxInCluster % 5) * 0.40
        : Math.sin(golden) * radiusSpread * 0.85 + Math.sin(i * 1.9) * 1.6 + 0.4
      const lz = Math.cos(idxInCluster * 0.85) * 4.5

      let clusterCenter
      if (clusterId === 0) {
        clusterCenter = new THREE.Vector3(-18.5, 0.5, 1.2)
      } else if (clusterId === 1) {
        clusterCenter = new THREE.Vector3(18.5, -0.2, 1.2)
      } else {
        clusterCenter = new THREE.Vector3(0.0, 0.3, -14.8)
      }

      const messyPos = new THREE.Vector3(
        clusterCenter.x + lx,
        isFloorSpill ? ly : clusterCenter.y + ly,
        clusterCenter.z + lz
      )

      const surroundPos = new THREE.Vector3(
        messyPos.x * 0.56,
        messyPos.y * 0.82,
        lerp(messyPos.z, 2.2, 0.46)
      )

      const messyRot = isFloorSpill
        ? new THREE.Euler(
            -Math.PI / 2 + Math.sin(i * 1.7) * 0.35,
            Math.cos(i * 1.1) * 0.4,
            Math.sin(i * 2.3) * 3.14
          )
        : new THREE.Euler(
            Math.sin(i * 1.3) * 1.45,
            Math.cos(i * 0.9) * 1.55 + (clusterId === 0 ? 1.1 : clusterId === 1 ? -1.1 : 0),
            Math.sin(i * 2.1) * 1.25
          )

      const idxInCategory = Math.floor(i / 5)
      const catLaneX = (categoryId - 2) * 3.85
      const catProgress = idxInCategory / 36
      const sortedPos = new THREE.Vector3(
        catLaneX + Math.sin(catProgress * Math.PI * 2) * 0.55,
        Math.cos(catProgress * Math.PI * 2 + categoryId * 0.7) * 2.2,
        7.5 - catProgress * 16.0
      )
      const sortedRot = new THREE.Euler(
        0.18 * Math.sin(catProgress * Math.PI * 2),
        0,
        0
      )

      const targetLoop = i < FOLIO_COUNT / 2 ? 0 : 1
      const idxInLoop = i % (FOLIO_COUNT / 2)
      const normalizedLoopOrder = idxInLoop / (FOLIO_COUNT / 2)
      const loopAngle = ((categoryId * 18 + (idxInLoop % 18)) / 90) * Math.PI * 2
      const radialLayerOffset = ((idxInLoop % 5) - 2) * 0.13

      foliosData.push({
        group: fGroup,
        mat,
        edgeMat,
        index: i,
        categoryId,
        clusterId,
        targetLoop,
        normalizedLoopOrder,
        loopAngle,
        radialLayerOffset,
        messyPos,
        surroundPos,
        messyRot,
        sortedPos,
        sortedRot
      })
    }

    // ==================== HỆ THỐNG XOẮN ĐỘNG 3 TẦNG (DYNAMIC 3D HELICAL BRAID & ROPE-TO-GLOSS MORPH) ====================
    const BRAID_TUBULAR_SEGS = 136
    const BRAID_RADIAL_SEGS = 12
    const leftBraidFrames = buildLoopTubularFrames(0, BRAID_TUBULAR_SEGS)
    const rightBraidFrames = buildLoopTubularFrames(1, BRAID_TUBULAR_SEGS)

    const braidGroup = new THREE.Group()
    stageRoot.add(braidGroup)

    const strandColors = [
      { color: 0x003d99, emissive: 0x051d4d },
      { color: 0x0052cc, emissive: 0x062863 },
      { color: 0x0077e6, emissive: 0x073475 },
      { color: 0x006adc, emissive: 0x062b66 },
      { color: 0x0095ff, emissive: 0x063666 },
      { color: 0x00b4ff, emissive: 0x084670 }
    ]

    const braidStrands = []
    for (let s = 0; s < 6; s++) {
      const loopSide = s < 3 ? 0 : 1
      const strandIdx = s % 3
      const phaseOffset = (strandIdx / 3) * Math.PI * 2
      const tubeData = createDynamicTubeBuffer(BRAID_TUBULAR_SEGS, BRAID_RADIAL_SEGS)
      const sMat = new THREE.MeshPhysicalMaterial({
        color: strandColors[s].color,
        emissive: strandColors[s].emissive,
        emissiveIntensity: 0.35,
        roughness: 0.12,
        metalness: 0.22,
        clearcoat: 1.0,
        clearcoatRoughness: 0.08,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0
      })
      const sMesh = new THREE.Mesh(tubeData.geo, sMat)
      braidGroup.add(sMesh)
      braidStrands.push({
        mesh: sMesh,
        mat: sMat,
        tubeData,
        frames: loopSide === 0 ? leftBraidFrames : rightBraidFrames,
        phaseOffset
      })
    }

    const MASTER_TUBULAR_SEGS = 160
    const MASTER_RADIAL_SEGS = 36
    const leftMasterFrames = buildLoopTubularFrames(0, MASTER_TUBULAR_SEGS)
    const rightMasterFrames = buildLoopTubularFrames(1, MASTER_TUBULAR_SEGS)

    const leftMasterTube = createDynamicTubeBuffer(MASTER_TUBULAR_SEGS, MASTER_RADIAL_SEGS)
    const rightMasterTube = createDynamicTubeBuffer(MASTER_TUBULAR_SEGS, MASTER_RADIAL_SEGS)

    const leftRibbonMat = new THREE.MeshPhysicalMaterial({
      color: 0x0052cc,
      emissive: 0x051f52,
      emissiveIntensity: 0.24,
      roughness: 0.11,
      metalness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.07,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0
    })

    const rightRibbonMat = new THREE.MeshPhysicalMaterial({
      color: 0x0095ff,
      emissive: 0x042f66,
      emissiveIntensity: 0.22,
      roughness: 0.10,
      metalness: 0.20,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0
    })

    const ribbonLogoGroup = new THREE.Group()
    stageRoot.add(ribbonLogoGroup)
    const leftRibbonMesh = new THREE.Mesh(leftMasterTube.geo, leftRibbonMat)
    const rightRibbonMesh = new THREE.Mesh(rightMasterTube.geo, rightRibbonMat)
    ribbonLogoGroup.add(leftRibbonMesh, rightRibbonMesh)

    updateMasterRibbonGeometry(leftMasterTube, leftMasterFrames, 0.48, 0.0, 0.0, 0.0)
    updateMasterRibbonGeometry(rightMasterTube, rightMasterFrames, 0.48, 0.0, 0.0, 0.0)

    const EMBER_COUNT = 160
    const emberGeo = new THREE.BufferGeometry()
    const emberBasePos = []
    const emberPositions = new Float32Array(EMBER_COUNT * 3)
    for (let e = 0; e < EMBER_COUNT; e++) {
      const loopSide = e % 2
      const a = (e / EMBER_COUNT) * Math.PI * 2
      const basePt = getLogoLoopPoint(loopSide, a, 3.25)
      const outDir = new THREE.Vector3(Math.cos(a), Math.sin(a), (Math.random() - 0.5) * 1.2).normalize()
      emberBasePos.push({ basePt, outDir, speed: 0.8 + (e % 7) * 0.35 })
      emberPositions[e * 3] = basePt.x
      emberPositions[e * 3 + 1] = basePt.y
      emberPositions[e * 3 + 2] = basePt.z
    }
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3))
    const emberMat = new THREE.PointsMaterial({
      color: 0x0090ff,
      size: 0.17,
      transparent: true,
      opacity: 0.0
    })
    const emberPoints = new THREE.Points(emberGeo, emberMat)
    stageRoot.add(emberPoints)

    const DUST_COUNT = 380
    const dustGeo = new THREE.BufferGeometry()
    const dustPos = new Float32Array(DUST_COUNT * 3)
    for (let i = 0; i < DUST_COUNT; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 54
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 28
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 42
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
    const dustMat = new THREE.PointsMaterial({
      color: 0x0052cc,
      size: 0.09,
      transparent: true,
      opacity: 0.24
    })
    const dustSystem = new THREE.Points(dustGeo, dustMat)
    scene.add(dustSystem)

    // ==================== VÒNG LẶP DIỄN HOẠT ĐIỆN ẢNH 60FPS ====================
    let animId
    const clock = new THREE.Clock()

    const animate = () => {
      const elapsed = clock.getElapsedTime()

      const targetP = targetProgressRef.current
      const currentP = currentProgressRef.current
      const diffP = targetP - currentP
      if (Math.abs(diffP) > 0.00004) {
        const isSlowHeadPan = currentP < 0.30
        const isMacroZone = currentP > 0.44 && currentP < 0.82
        const dampFactor = isSlowHeadPan ? 0.026 : isMacroZone ? 0.032 : 0.052
        currentProgressRef.current += diffP * dampFactor
        setProgress(currentProgressRef.current)
      }
      const p = currentProgressRef.current

      if (p >= 0.87) {
        if (!finaleActiveRef.current) {
          finaleActiveRef.current = true
          finaleStartClockRef.current = performance.now()
        }
        const sec = (performance.now() - finaleStartClockRef.current) / 1000
        setFinaleTime(sec)
      } else if (p < 0.81 && finaleActiveRef.current) {
        finaleActiveRef.current = false
        setFinaleTime(0)
      }

      pointerRef.current.x += (pointerRef.current.targetX - pointerRef.current.x) * 0.05
      pointerRef.current.y += (pointerRef.current.targetY - pointerRef.current.y) * 0.05
      const px = pointerRef.current.x
      const py = pointerRef.current.y

      const camState = sampleCamera(p)
      const handheldAmp = 1 - smoothstep(0.75, 0.88, p)
      const breathX = Math.sin(elapsed * 1.05) * 0.10 * handheldAmp
      const breathY = Math.cos(elapsed * 1.35) * 0.07 * handheldAmp

      camera.position.set(
        camState.pos[0] + breathX + px * 0.50 * handheldAmp,
        camState.pos[1] + breathY + py * 0.35 * handheldAmp,
        camState.pos[2]
      )
      camera.up.set(Math.sin(camState.roll), Math.cos(camState.roll), 0)
      camera.lookAt(
        camState.look[0] + px * 0.35,
        camState.look[1] + py * 0.25,
        camState.look[2]
      )

      if (Math.abs(camera.fov - camState.fov) > 0.04) {
        camera.fov = camState.fov
        camera.updateProjectionMatrix()
      }

      // Giữ nguyên 100% độ sắc nét và tương phản của 3 Đại Kệ Sách suốt Scene 1 & đầu Scene 2 (0.00 -> 0.34),
      // chỉ thu mờ dần khi bay vào vùng Macro Kết Tinh Logo (0.34 -> 0.54)
      const archVisibility = 1.0 - smootherstep(0.34, 0.54, p)
      darkPillarMat.opacity = archVisibility * 0.96
      backboardMat.opacity = archVisibility * 0.94
      shelfDeckMat.opacity = archVisibility * 0.96
      crispAccentLineMat.opacity = archVisibility * 0.72
      structuralWireMat.opacity = archVisibility * 0.55
      shelfBookMaterials.forEach((m) => {
        m.opacity = archVisibility * 0.95
      })
      atriumArchGroup.visible = archVisibility > 0.01

      // ==================== CHUYỂN ĐỘNG XOẮN ĐỘNG 3 TẦNG TRONG SCENE 3 (p: 0.46 -> 0.80) ====================
      const liveSpinPhase = elapsed * 3.4 + p * 26.0

      const braidGrowT = smootherstep(0.47, 0.63, p)
      const braidTightenT = smootherstep(0.58, 0.76, p)
      const braidFadeOut = 1.0 - smootherstep(0.71, 0.78, p)
      const braidOpacity = smoothstep(0.47, 0.53, p) * braidFadeOut

      if (braidOpacity > 0.005) {
        braidGroup.visible = true
        const currentCoilRadius = lerp(0.82, 0.10, braidTightenT)
        const currentStrandThickness = lerp(0.065, 0.125, smootherstep(0.50, 0.67, p))

        for (let s = 0; s < 6; s++) {
          const strand = braidStrands[s]
          strand.mat.opacity = braidOpacity * 0.94
          updateBraidedStrandGeometry(
            strand.tubeData,
            strand.frames,
            currentCoilRadius,
            currentStrandThickness,
            5,
            strand.phaseOffset,
            liveSpinPhase * (s < 3 ? 1 : -1),
            braidGrowT
          )
        }
      } else {
        braidGroup.visible = false
      }

      const ribbonGrowT = smootherstep(0.55, 0.71, p)
      const ribbonPolishT = smootherstep(0.63, 0.79, p)
      const fusionFlash = Math.sin(smoothstep(0.58, 0.78, p) * Math.PI)

      if (ribbonGrowT > 0.002) {
        ribbonLogoGroup.visible = true
        updateMasterRibbonGeometry(
          leftMasterTube,
          leftMasterFrames,
          0.48,
          ribbonGrowT,
          ribbonPolishT,
          liveSpinPhase
        )
        updateMasterRibbonGeometry(
          rightMasterTube,
          rightMasterFrames,
          0.48,
          ribbonGrowT,
          ribbonPolishT,
          -liveSpinPhase
        )
        leftRibbonMat.emissiveIntensity = 0.24 + fusionFlash * 1.1
        rightRibbonMat.emissiveIntensity = 0.22 + fusionFlash * 1.1
      } else {
        ribbonLogoGroup.visible = false
      }

      fusionCoreLight.intensity = fusionFlash * 34

      const emberBurstT = smoothstep(0.66, 0.86, p)
      const emberFade = Math.sin(smoothstep(0.64, 0.87, p) * Math.PI)
      if (emberFade > 0.01) {
        const eArr = emberGeo.attributes.position.array
        for (let e = 0; e < EMBER_COUNT; e++) {
          const item = emberBasePos[e]
          const dist = emberBurstT * item.speed * 2.2
          eArr[e * 3] = item.basePt.x + item.outDir.x * dist
          eArr[e * 3 + 1] = item.basePt.y + item.outDir.y * dist
          eArr[e * 3 + 2] = item.basePt.z + item.outDir.z * dist
        }
        emberGeo.attributes.position.needsUpdate = true
        emberMat.opacity = emberFade * 0.85
        emberPoints.visible = true
      } else {
        emberPoints.visible = false
      }

      const lockupShiftT = smootherstep(0.84, 0.92, p)
      stageRoot.position.x = lerp(0, -4.45, lockupShiftT)
      stageRoot.position.y = lerp(0, 0.12, lockupShiftT)
      stageRoot.scale.setScalar(lerp(1.0, 0.72, lockupShiftT))

      const subtleTiltY = Math.sin(elapsed * 0.65) * 0.06
      const subtleTiltX = Math.cos(elapsed * 0.45) * 0.04
      stageRoot.rotation.set(subtleTiltX, subtleTiltY, 0)

      const wSurround = smootherstep(0.22, 0.30, p)
      const wSort = smootherstep(0.30, 0.41, p)
      const wWeave = smootherstep(0.41, 0.50, p)
      const vortexSpinT = smootherstep(0.46, 0.66, p)
      const vortexTightenT = smootherstep(0.52, 0.68, p)

      for (let i = 0; i < FOLIO_COUNT; i++) {
        const d = foliosData[i]

        const floatAmp = (1 - wSort) * 0.28
        const fx = Math.sin(elapsed * 0.85 + i) * floatAmp
        const fy = Math.cos(elapsed * 1.05 + i * 0.7) * floatAmp

        let x = lerp(d.messyPos.x + fx, d.surroundPos.x + fx, wSurround)
        let y = lerp(d.messyPos.y + fy, d.surroundPos.y + fy, wSurround)
        let z = lerp(d.messyPos.z, d.surroundPos.z, wSurround)

        const streamWaveY = Math.sin(elapsed * 2.0 + d.index * 0.2) * 0.22
        x = lerp(x, d.sortedPos.x, wSort)
        y = lerp(y, d.sortedPos.y + streamWaveY, wSort)
        z = lerp(z, d.sortedPos.z, wSort)

        const flowAngle = d.loopAngle + elapsed * (0.20 + vortexSpinT * 0.55) + vortexSpinT * 2.6
        const corePt = getLogoLoopPoint(d.targetLoop, flowAngle, 3.25)

        const docHelixAngle =
          flowAngle * 5.0 +
          d.index * 0.48 +
          liveSpinPhase * 0.85 * (d.targetLoop === 0 ? 1 : -1)

        const vortexOrbitR = lerp(
          0.35 + Math.abs(d.radialLayerOffset) * 2.2 + vortexSpinT * 0.45,
          0.24,
          vortexTightenT
        )

        const radNx = Math.cos(flowAngle)
        const radNy = Math.sin(flowAngle)
        const cosDocH = Math.cos(docHelixAngle)
        const sinDocH = Math.sin(docHelixAngle)

        const loopX = corePt.x + vortexOrbitR * cosDocH * radNx
        const loopY = corePt.y + vortexOrbitR * cosDocH * radNy
        const loopZ = corePt.z + vortexOrbitR * sinDocH

        x = lerp(x, loopX, wWeave)
        y = lerp(y, loopY, wWeave)
        z = lerp(z, loopZ, wWeave)

        d.group.position.set(x, y, z)

        let rx = lerp(d.messyRot.x + Math.sin(elapsed + i) * 0.12, d.sortedRot.x, wSort)
        let ry = lerp(d.messyRot.y + Math.cos(elapsed + i) * 0.12, d.sortedRot.y, wSort)
        let rz = lerp(d.messyRot.z, d.sortedRot.z, wSort)

        const targetRz = flowAngle + Math.PI / 2
        const helicalRoll = sinDocH * 0.65 * (1 - vortexTightenT * 0.5)
        rx = lerp(rx, helicalRoll, wWeave)
        ry = lerp(ry, cosDocH * 0.45 * (d.targetLoop === 0 ? 1 : -1), wWeave)
        rz = lerp(rz, targetRz, wWeave)

        d.group.rotation.set(rx, ry, rz)

        const sheetMorphLocal = smoothstep(
          d.normalizedLoopOrder * 0.68,
          d.normalizedLoopOrder * 0.68 + 0.32,
          smootherstep(0.52, 0.70, p)
        )
        const preMorphGlow = Math.sin(sheetMorphLocal * Math.PI)
        d.mat.emissiveIntensity = preMorphGlow * 2.2

        const finalOpacity = 1 - sheetMorphLocal
        d.mat.opacity = finalOpacity
        d.edgeMat.opacity = finalOpacity * (0.75 + preMorphGlow * 0.25)
        d.group.visible = finalOpacity > 0.01

        const stretchX = lerp(1.0, 0.24, vortexTightenT)
        const stretchY = lerp(1.0, 2.15, vortexTightenT) * lerp(1.0, 0.35, sheetMorphLocal)
        d.group.scale.set(stretchX, stretchY, 1.0)
      }

      dustSystem.rotation.y = elapsed * 0.02

      renderer.render(scene, camera)
      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)

    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animId)
      pmremGenerator.dispose()
      renderer.dispose()
    }
  }, [])

  const activeActIndex =
    dreamPhase !== 'awake'
      ? 0
      : progress < 0.30
      ? 1
      : progress < 0.48
      ? 2
      : progress < 0.85
      ? 3
      : 4

  const percentInt = Math.round(progress * 100)
  const percentText = percentInt < 10 ? `0${percentInt}%` : `${percentInt}%`

  const macroCinemaIntensity = Math.sin(smoothstep(0.46, 0.84, progress) * Math.PI)
  const letterboxHeightPx = Math.round(macroCinemaIntensity * 44)

  // ============================================================================
  // HOẠT CẢNH FINALE 5 NHỊP CÓ CHẤT RIÊNG (~4.3 GIÂY)
  // ============================================================================
  const isFinaleVisible = progress >= 0.86
  const wipeProgress = clamp01(finaleTime / 0.90)
  const scanBeamVisible = finaleTime > 0.02 && finaleTime < 0.96

  const T_DROP_START = 0.90
  const T_FIRST_CONTACT = 1.42
  const T_SECOND_STOMP = 1.88
  const T_CRUSH_COMPLETE = 2.26
  const T_LAND_LEFT = 2.88
  const T_STAND_FIRM = 4.18

  const isPressingS = finaleTime >= T_FIRST_CONTACT && finaleTime < T_CRUSH_COMPLETE
  const hasCrushedToLower = finaleTime >= T_CRUSH_COMPLETE
  const timeSinceCrush = Math.max(0, finaleTime - T_CRUSH_COMPLETE)
  const isLockedIn = finaleTime >= T_STAND_FIRM

  let fiveTranslateX = 46
  let fiveTranslateY = -270
  let fiveRotateDeg = 0
  let fiveScaleX = 1
  let fiveScaleY = 1
  let fiveOpacity = 0

  let sScaleX = 1
  let sScaleY = 1
  let sTranslateX = 0
  let sTranslateY = 0
  let sRotateDeg = 0

  if (finaleTime >= T_DROP_START) {
    fiveOpacity = 1

    if (finaleTime < T_FIRST_CONTACT) {
      const dropT = clamp01((finaleTime - T_DROP_START) / (T_FIRST_CONTACT - T_DROP_START))
      const gT = dropT * dropT * dropT
      fiveTranslateX = 46
      fiveTranslateY = lerp(-270, -48, gT)
      fiveRotateDeg = lerp(-14, 5, gT)
      fiveScaleY = lerp(0.94, 1.15, gT)
      fiveScaleX = lerp(0.96, 0.88, gT)
    } else if (finaleTime < T_CRUSH_COMPLETE) {
      fiveTranslateX = 46

      if (finaleTime < T_SECOND_STOMP) {
        const stomp1T = clamp01((finaleTime - T_FIRST_CONTACT) / (T_SECOND_STOMP - T_FIRST_CONTACT))
        const pressCurve = Math.sin(stomp1T * Math.PI * 0.65)
        sScaleY = lerp(1.0, 0.74, pressCurve)
        sScaleX = lerp(1.0, 1.18, pressCurve)
        sTranslateY = lerp(0, 10, pressCurve)
        sTranslateX = Math.sin((finaleTime - T_FIRST_CONTACT) * 42) * 2.5
        sRotateDeg = Math.sin((finaleTime - T_FIRST_CONTACT) * 28) * 3.0

        fiveTranslateY = lerp(-48, -26, pressCurve)
        fiveScaleX = 1.0 + pressCurve * 0.14
        fiveScaleY = 1.0 - pressCurve * 0.12
        fiveRotateDeg = 4 - pressCurve * 8
      } else {
        const stomp2T = clamp01((finaleTime - T_SECOND_STOMP) / (T_CRUSH_COMPLETE - T_SECOND_STOMP))
        const windUpAndStomp =
          stomp2T < 0.28
            ? -Math.sin((stomp2T / 0.28) * Math.PI) * 0.15
            : Math.pow((stomp2T - 0.28) / 0.72, 2)

        sScaleY = clamp01(lerp(0.74, 0.48, windUpAndStomp))
        sScaleX = lerp(1.18, 1.38, Math.max(0, windUpAndStomp))
        sTranslateY = lerp(10, 22, Math.max(0, windUpAndStomp))
        sTranslateX = Math.sin((finaleTime - T_SECOND_STOMP) * 55) * 3.5
        sRotateDeg = -4 * Math.max(0, windUpAndStomp)

        fiveTranslateY = lerp(-26, -6, windUpAndStomp)
        fiveScaleX = 1.0 + Math.max(0, windUpAndStomp) * 0.22
        fiveScaleY = 1.0 - Math.max(0, windUpAndStomp) * 0.20
        fiveRotateDeg = -6 + windUpAndStomp * 12
      }
    } else if (finaleTime < T_LAND_LEFT) {
      const vaultT = clamp01((finaleTime - T_CRUSH_COMPLETE) / (T_LAND_LEFT - T_CRUSH_COMPLETE))
      const easeVault = 1 - Math.pow(1 - vaultT, 2.4)
      fiveTranslateX = lerp(46, 0, easeVault)
      const arcHeight = Math.sin(vaultT * Math.PI) * -68
      fiveTranslateY = lerp(-8, 0, vaultT) + arcHeight
      fiveRotateDeg = lerp(8, -26, easeVault)
      fiveScaleX = lerp(1.12, 0.94, Math.sin(vaultT * Math.PI))
      fiveScaleY = lerp(0.88, 1.08, Math.sin(vaultT * Math.PI))

      const sRebound = Math.exp(-timeSinceCrush * 5.5) * Math.cos(timeSinceCrush * 14)
      sScaleY = 1.0 - sRebound * 0.35
      sScaleX = 1.0 + sRebound * 0.24
      sTranslateY = Math.max(0, sRebound * 10)
    } else {
      fiveTranslateX = 0
      const landTime = finaleTime - T_LAND_LEFT
      const totalRecover = T_STAND_FIRM - T_LAND_LEFT

      if (landTime < totalRecover) {
        const rT = landTime / totalRecover
        const envelope = Math.pow(1 - rT, 1.65)
        fiveRotateDeg = -Math.cos(rT * Math.PI * 3.0) * 28 * envelope
        fiveTranslateY = -Math.abs(Math.sin(rT * Math.PI * 3.0)) * 7 * envelope
        const landSquash = Math.exp(-landTime * 7.0) * 0.20
        fiveScaleX = 1.0 + landSquash
        fiveScaleY = 1.0 - landSquash
      } else {
        fiveRotateDeg = 0
        fiveTranslateY = 0
        const lockTime = finaleTime - T_STAND_FIRM
        const proudPulse = lockTime < 0.35 ? Math.sin((lockTime / 0.35) * Math.PI) * 0.06 : 0
        fiveScaleX = 1.0 + proudPulse
        fiveScaleY = 1.0 + proudPulse
      }

      const sRebound = Math.exp(-timeSinceCrush * 5.5) * Math.cos(timeSinceCrush * 14)
      sScaleY = 1.0 - sRebound * 0.35
      sScaleX = 1.0 + sRebound * 0.24
      sTranslateY = Math.max(0, sRebound * 10)
    }
  }

  const handleScrubberClick = (act) => {
    if (act.isDream) {
      returnToDreamOrigin(0)
      return
    }
    if (dreamPhase !== 'awake') {
      setDreamPhase('awake')
    }
    setTimeout(() => {
      if (!runwayRef.current) return
      const maxScroll = runwayRef.current.offsetHeight - window.innerHeight
      window.scrollTo({
        top: maxScroll * act.ratio,
        behavior: 'smooth'
      })
    }, 30)
  }

  const handleGoDiscovery = () => {
    if (onExploreDiscovery) {
      onExploreDiscovery()
    } else if (onNavigate) {
      onNavigate(actorRole === 'ADMIN' ? 'admin-dashboard' : 'discovery')
    }
  }

  const handleGoUpload = () => {
    if (onOpenUpload) {
      onOpenUpload()
    } else if (onNavigate) {
      if (actorRole === 'GUEST') {
        onNavigate('auth')
      } else {
        onNavigate('upload')
      }
    }
  }

  return (
    <div className="scrolly-runway" ref={runwayRef} aria-label="Không gian điện ảnh 3D Scrollytelling 5share">
      <div className="scrolly-viewport">
        {/* SÂN KHẤU THREE.JS WEBGL 3D CHÍNH */}
        <div
          ref={mountRef}
          className={`threejs-stage-canvas ${
            dreamPhase === 'dreaming'
              ? 'is-dream-hidden'
              : dreamPhase === 'blinking'
              ? 'is-waking-focus'
              : ''
          }`}
          aria-hidden="true"
        />

        {/* LỚP VIỀN QUANG HỌC STUDIO */}
        <div className="studio-vignette-overlay" />

        {/* ==================== CƠN MƠ ĐÊM TỐI TRƯỚC SCENE 1 ==================== */}
        {dreamPhase !== 'awake' && (
          <div
            className={`dark-dream-stage ${dreamPhase === 'blinking' ? 'is-awakening' : ''}`}
            onClick={() => advanceDreamStep(1)}
            role="presentation"
          >
            <div className="dream-smoke-layer smoke-1" />
            <div className="dream-smoke-layer smoke-2" />
            <div className="dream-smoke-layer smoke-3" />

            <div className="dream-thoughts-stream">
              {DREAM_THOUGHTS.map((item, idx) => {
                const isCurrent = idx === dreamStep
                const isPast = idx < dreamStep
                if (idx > dreamStep) return null

                return (
                  <div
                    key={item.id}
                    className={`dream-thought-line ${item.posClass} ${
                      isCurrent ? 'is-current' : isPast ? 'is-past-echo' : ''
                    }`}
                  >
                    <span className="dream-thought-white-text">{item.text}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ==================== HIỆU ỨNG CHỚP MẮT MỞ RA ÁNH SÁNG TỪ BÓNG TỐI ==================== */}
        {dreamPhase === 'blinking' && (
          <div className="eyelid-blink-overlay" aria-hidden="true">
            <div className="eyelid-upper" />
            <div className="eyelid-lower" />
          </div>
        )}

        {/* THANH CINEMA LETTERBOX HẠ KHUNG & NÂNG KHUNG Ở CAO TRÀO MACRO */}
        <div className="cinema-letterbox-top" style={{ height: `${letterboxHeightPx}px` }} />
        <div className="cinema-letterbox-bottom" style={{ height: `${letterboxHeightPx}px` }} />

        {/* ==================== SÂN KHẤU FINALE 5 NHỊP: SHARE -> SỐ 5 GIẬM 2 NHỊP ĐÈ S THÀNH s -> CHỚI VỚI ĐỨNG DẬY ==================== */}
        <div
          className={`kinetic-brand-stage ${isFinaleVisible ? 'is-visible' : ''}`}
          aria-label="Hoạt cảnh định hình thương hiệu 5share"
        >
          <div className={`kinetic-wordmark-lockup ${isLockedIn ? 'is-locked-in' : ''}`}>
            <span
              className="kinetic-digit-five"
              style={{
                opacity: fiveOpacity,
                transform: `translate(${fiveTranslateX}px, ${fiveTranslateY}px) rotate(${fiveRotateDeg}deg) scale(${fiveScaleX}, ${fiveScaleY})`
              }}
            >
              5
            </span>

            <span
              className="kinetic-share-wipe"
              style={{
                clipPath: `inset(-35% ${Math.round((1 - wipeProgress) * 100)}% -35% -12%)`
              }}
            >
              <span
                className={`kinetic-letter-s ${
                  isPressingS ? 'is-under-pressure' : hasCrushedToLower ? 'is-crushed' : ''
                }`}
                style={{
                  transform: `translate(${sTranslateX}px, ${sTranslateY}px) rotate(${sRotateDeg}deg) scale(${sScaleX}, ${sScaleY})`
                }}
              >
                {hasCrushedToLower ? 's' : 'S'}
              </span>
              <span className="kinetic-letters-hare">hare</span>
            </span>

            {scanBeamVisible && (
              <span
                className="kinetic-scan-beam"
                style={{
                  left: `${Math.round(wipeProgress * 100)}%`,
                  opacity: Math.sin(wipeProgress * Math.PI)
                }}
              />
            )}

            {hasCrushedToLower && timeSinceCrush < 0.85 && (
              <>
                <span
                  className="kinetic-impact-ring"
                  style={{
                    transform: `scale(${0.4 + timeSinceCrush * 2.5})`,
                    opacity: Math.max(0, 1 - timeSinceCrush * 1.2)
                  }}
                />
                <span className="kinetic-spark-burst" aria-hidden="true">
                  {SPARK_ANGLES.map((sp, sIdx) => (
                    <span
                      key={sIdx}
                      className="kinetic-spark-mote"
                      style={{
                        transform: `translate(${sp.dx * timeSinceCrush * 1.6}px, ${
                          sp.dy * timeSinceCrush * 1.6 + timeSinceCrush * timeSinceCrush * 45
                        }px) scale(${Math.max(0, 1 - timeSinceCrush * 1.25)})`,
                        opacity: Math.max(0, 1 - timeSinceCrush * 1.25)
                      }}
                    />
                  ))}
                </span>
              </>
            )}
          </div>

          <div
            className="kinetic-group-credits"
            style={{
              opacity: finaleTime > T_STAND_FIRM ? clamp01((finaleTime - T_STAND_FIRM) / 0.55) : 0,
              transform: `translateY(${finaleTime > T_STAND_FIRM ? 0 : 12}px)`
            }}
          >
            <div className="credit-team-line">
              <span>Nhóm 5</span>
              <button
                type="button"
                className="kinetic-replay-btn"
                onClick={handleReplayFinale}
                title="Phát lại hoạt cảnh 5share"
              >
                <RotateCcw size={12} />
                <span>Xem lại</span>
              </button>
            </div>
            <div className="credit-course-line">
              Nhập môn Công nghệ phần mềm - 2611COMP104406
            </div>
          </div>
        </div>

        {/* CỔNG HÀNH ĐỘNG Ở CUỐI HÀNH TRÌNH */}
        <div className={`hud-portal-dock ${progress >= 0.90 ? 'is-visible' : ''}`}>
          <button
            type="button"
            className="btn btn-primary hud-cta-primary"
            onClick={handleGoDiscovery}
          >
            <Compass size={16} />
            <span>Tiến vào Kho học liệu</span>
            <ArrowRight size={15} />
          </button>
          <button
            type="button"
            className="btn btn-outline hud-cta-secondary"
            onClick={handleGoUpload}
          >
            <Upload size={16} />
            <span>Đóng góp học liệu</span>
          </button>
        </div>

        {/* THANH ĐIỀU HƯỚNG I - II - III - IV - V BÊN MÉP PHẢI */}
        {dreamPhase === 'awake' && (
          <nav className="chapter-scrubber" aria-label="Điều hướng phân cảnh">
            <div className="scrubber-percent">{percentText}</div>
            <div className="scrubber-rail">
              <div className="scrubber-bar" style={{ height: `${progress * 100}%` }} />
              {ACT_TARGETS.map((act, idx) => {
                const isActive = activeActIndex === idx
                return (
                  <button
                    key={act.id}
                    type="button"
                    className={`scrubber-node ${isActive ? 'active' : ''}`}
                    onClick={() => handleScrubberClick(act)}
                    title={act.label}
                    aria-label={act.label}
                  >
                    <span className="node-num">{act.roman}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    import.meta.hot.invalidate()
  })
}

