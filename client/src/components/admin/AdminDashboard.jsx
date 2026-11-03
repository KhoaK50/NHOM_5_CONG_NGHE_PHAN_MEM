import { useEffect, useState } from 'react'
import {
  FileCheck2,
  Download,
  Users,
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Award,
  Sparkles
} from 'lucide-react'
import { getDashboardStats } from '../../utils/interactionApi'

export default function AdminDashboard({
  onSelectDoc,
  onNavigateTab
}) {
  const [hoveredCourseIndex, setHoveredCourseIndex] = useState(null)
  const [hoveredPointIndex, setHoveredPointIndex] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [dashboardError, setDashboardError] = useState('')

  useEffect(() => {
    let cancelled = false
    getDashboardStats()
      .then((data) => { if (!cancelled) setDashboardData(data) })
      .catch((error) => { if (!cancelled) setDashboardError(error.message) })
    return () => { cancelled = true }
  }, [])

  const totalDocs = dashboardData?.totalDocuments ?? 0
  const approvedDocsCount = dashboardData?.approved ?? 0
  const pendingDocsCount = dashboardData?.pending ?? 0
  const rejectedDocsCount = dashboardData?.rejected ?? 0
  const totalDownloadsAll = dashboardData?.totalDownloads ?? 0
  const weeklyDownloadsSum = dashboardData?.downloadsThisWeek ?? 0
  const totalUsersCount = dashboardData?.totalUsers ?? 0
  const activeUsersCount = dashboardData?.activeUsers ?? 0
  const studentUsersCount = dashboardData?.students ?? 0
  const adminUsersCount = dashboardData?.admins ?? 0
  const pendingReportsCount = dashboardData?.pendingReports ?? 0
  const totalPendingRequests = pendingDocsCount + pendingReportsCount
  const top5Courses = (dashboardData?.topCourses || []).map((course) => ({ ...course, docCount: course.documents }))
  const maxCourseDownloads = Math.max(...top5Courses.map((c) => c.downloads), 1)

  const BASE_DAILY_DOWNLOADS = (dashboardData?.downloadsByDay || []).map((item) => {
    const date = new Date(`${item.date}T00:00:00`)
    return {
      day: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
      fullDay: date.toLocaleDateString('vi-VN', { weekday: 'long' }),
      date: date.toLocaleDateString('vi-VN'),
      downloads: Number(item.downloads),
      views: Number(item.views)
    }
  })

  // Tọa độ tính toán SVG Line Chart
  const chartWidth = 560
  const chartHeight = 220
  const padLeft = 46
  const padRight = 24
  const padTop = 26
  const padBottom = 38
  const plotW = chartWidth - padLeft - padRight
  const plotH = chartHeight - padTop - padBottom
  const maxDayDownloads = Math.max(...BASE_DAILY_DOWNLOADS.map((d) => d.downloads), 0)
  const yAxisMax = Math.ceil((maxDayDownloads * 1.15) / 20) * 20 || 160

  const points = BASE_DAILY_DOWNLOADS.map((d, idx) => {
    const x = padLeft + (idx / Math.max(BASE_DAILY_DOWNLOADS.length - 1, 1)) * plotW
    const y = padTop + plotH - (d.downloads / yAxisMax) * plotH
    return { x, y, data: d }
  })

  const linePath = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x},${pt.y}`
    const prev = arr[i - 1]
    const cpx1 = prev.x + (pt.x - prev.x) / 2
    const cpy1 = prev.y
    const cpx2 = prev.x + (pt.x - prev.x) / 2
    const cpy2 = pt.y
    return `${acc} C ${cpx1},${cpy1} ${cpx2},${cpy2} ${pt.x},${pt.y}`
  }, '')

  const areaPath = points.length ? `${linePath} L ${points[points.length - 1].x},${padTop + plotH} L ${points[0].x},${padTop + plotH} Z` : ''

  // 4 tài liệu được tải nhiều nhất cho danh sách phụ
  const topDownloadedDocs = dashboardData?.topDocuments || []

  // Hàng chờ duyệt nhanh & Hoạt động gần đây (UC11)
  const pendingDocsList = dashboardData?.pendingQueue || []
  const recentActivities = (dashboardData?.recentActivities || []).map((activity, index) => ({
    ...activity,
    color: ['var(--green-9)', 'var(--red-9)', 'var(--amber-9)', 'var(--blue-9)'][index % 4],
    time: activity.time ? new Date(activity.time).toLocaleString('vi-VN') : ''
  }))

  const radixBarColors = [
    'var(--blue-9, #0090ff)',
    'var(--blue-8, #5eb1ef)',
    'var(--blue-7, #8ec8f6)',
    'var(--blue-6, #acd8fc)',
    'var(--blue-5, #c2e5ff)'
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {dashboardError && (
        <div role="alert" className="empty-state-box">Không tải được thống kê từ máy chủ: {dashboardError}</div>
      )}
      {!dashboardData && !dashboardError && <div role="status" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Đang tải thống kê từ cơ sở dữ liệu…</div>}
      {/* Tiêu đề trang & Bộ lọc thời gian */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--primary-base)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '4px'
            }}
          >
            <Sparkles size={13} />
            <span>TRUNG TÂM PHÂN TÍCH & BÁO CÁO HỌC THUẬT</span>
          </div>
          <h1
            style={{
              margin: '0 0 4px 0',
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em'
            }}
          >
            Tổng quan hệ thống 5Share
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Số liệu được tổng hợp từ hoạt động và dữ liệu đã lưu trong cơ sở dữ liệu.
          </p>
        </div>

        <span className="status-badge blue">Số liệu 7 ngày gần nhất</span>
      </div>

      {/* 4 THẺ KPI METRIC CARDS ĐƯỢC TÍNH TOÁN TỰ ĐỘNG TỪ DỮ LIỆU SỐNG */}
      <div className="kpi-4-grid">
        {/* KPI 1: Tổng số học liệu */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--blue-11)',
                backgroundColor: 'var(--blue-3)',
                padding: '3px 8px',
                borderRadius: '999px',
                letterSpacing: '0.04em'
              }}
            >
              TỔNG SỐ HỌC LIỆU
            </span>
            <FileCheck2 size={18} style={{ color: 'var(--blue-9)' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {totalDocs}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>tài liệu</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
            <span style={{ color: 'var(--green-9)', fontWeight: 700 }}>+{approvedDocsCount}</span> đã xuất bản •{' '}
            <span style={{ color: 'var(--amber-11)', fontWeight: 600 }}>{pendingDocsCount}</span> chờ duyệt •{' '}
            <span style={{ color: 'var(--red-9)', fontWeight: 600 }}>{rejectedDocsCount}</span> từ chối
          </div>
        </div>

        {/* KPI 2: Lượt tải về trong tuần */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--green-11)',
                backgroundColor: 'var(--green-3)',
                padding: '3px 8px',
                borderRadius: '999px',
                letterSpacing: '0.04em'
              }}
            >
              LƯỢT TẢI TRONG TUẦN
            </span>
            <Download size={18} style={{ color: 'var(--green-9)' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {weeklyDownloadsSum.toLocaleString('vi-VN')}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>lượt tải</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
            Tích lũy hệ thống:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{totalDownloadsAll.toLocaleString('vi-VN')}</strong> lượt tải gốc
          </div>
        </div>

        {/* KPI 3: Thành viên hoạt động */}
        <div className="kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--amber-11)',
                backgroundColor: 'var(--amber-3)',
                padding: '3px 8px',
                borderRadius: '999px',
                letterSpacing: '0.04em'
              }}
            >
              THÀNH VIÊN HOẠT ĐỘNG
            </span>
            <Users size={18} style={{ color: 'var(--amber-9)' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {activeUsersCount}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>người dùng</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
            {studentUsersCount} Sinh viên SPTH • {adminUsersCount} Quản trị viên (Tổng {totalUsersCount})
          </div>
        </div>

        {/* KPI 4: Yêu cầu chờ duyệt */}
        <div
          className="kpi-card"
          style={{ cursor: onNavigateTab ? 'pointer' : 'default' }}
          onClick={() => onNavigateTab && onNavigateTab('moderation')}
          title="Nhấn để mở Hàng đợi kiểm duyệt"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: totalPendingRequests > 0 ? 'var(--red-11)' : 'var(--green-11)',
                backgroundColor: totalPendingRequests > 0 ? 'var(--red-3)' : 'var(--green-3)',
                padding: '3px 8px',
                borderRadius: '999px',
                letterSpacing: '0.04em'
              }}
            >
              YÊU CẦU CHỜ DUYỆT
            </span>
            <ShieldAlert size={18} style={{ color: totalPendingRequests > 0 ? 'var(--red-9)' : 'var(--green-9)' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {totalPendingRequests}{' '}
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>hồ sơ</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: 1.4 }}>
            {pendingDocsCount} tài liệu mới • {pendingReportsCount} báo cáo vi phạm
          </div>
        </div>
      </div>

      {/* 2 KHUNG BIỂU ĐỒ SVG CHUẨN RADIX LIGHT MODE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
        {/* BIỂU ĐỒ 1: TOP 5 HỌC PHẦN (PURE SVG HORIZONTAL BAR CHART) */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '22px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} style={{ color: 'var(--primary-base)' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Top 5 Học phần có lượt tải nhiều nhất
              </h3>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Xếp theo tổng lượt tải</span>
          </div>

          {/* Khung SVG Bar Chart */}
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox="0 0 520 220"
              style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
            >
              {top5Courses.map((c, idx) => {
                const y = 14 + idx * 40
                const barMaxWidth = 310
                const barWidth = Math.max(14, (c.downloads / maxCourseDownloads) * barMaxWidth)
                const isHovered = hoveredCourseIndex === idx
                const barColor = radixBarColors[idx] || 'var(--blue-9)'

                return (
                  <g
                    key={c.code}
                    onMouseEnter={() => setHoveredCourseIndex(idx)}
                    onMouseLeave={() => setHoveredCourseIndex(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Nhãn mã môn học */}
                    <text
                      x="78"
                      y={y + 13}
                      textAnchor="end"
                      fill="var(--text-primary)"
                      fontSize="12"
                      fontWeight="700"
                      fontFamily="var(--font-ui)"
                    >
                      {c.code}
                    </text>

                    {/* Thanh nền (Track) */}
                    <rect
                      x="88"
                      y={y}
                      width={barMaxWidth}
                      height="18"
                      rx="4"
                      fill="var(--slate-3)"
                    />

                    {/* Thanh dữ liệu thực (Bar) */}
                    <rect
                      x="88"
                      y={y}
                      width={barWidth}
                      height="18"
                      rx="4"
                      fill={barColor}
                      opacity={isHovered ? 1 : 0.9}
                      filter={isHovered ? 'drop-shadow(0 2px 4px rgba(0, 144, 255, 0.25))' : 'none'}
                      style={{ transition: 'all 0.2s ease' }}
                    />

                    {/* Con số lượt tải & tài liệu */}
                    <text
                      x={88 + barMaxWidth + 10}
                      y={y + 13}
                      textAnchor="start"
                      fill="var(--text-secondary)"
                      fontSize="11.5"
                      fontWeight="600"
                      fontFamily="var(--font-ui)"
                    >
                      {c.downloads} lượt ({c.docCount} TL)
                    </text>

                    {/* Tooltip khi hover trên thanh */}
                    {isHovered && (
                      <g>
                        <rect
                          x="92"
                          y={y - 24}
                          width="240"
                          height="20"
                          rx="4"
                          fill="var(--slate-12)"
                        />
                        <text
                          x="100"
                          y={y - 10}
                          fill="#ffffff"
                          fontSize="10.5"
                          fontWeight="500"
                          fontFamily="var(--font-ui)"
                        >
                          {c.name} ({c.credits} TC)
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* BIỂU ĐỒ 2: XU HƯỚNG TẢI VỀ 7 NGÀY (PURE SVG BEZIER LINE CHART) */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '22px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: 'var(--green-9)' }} />
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Xu hướng Lượt tải về theo ngày (Tuần này)
              </h3>
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--green-11)', fontWeight: 600 }}>
              Từ nhật ký truy cập
            </span>
          </div>

          {/* Khung SVG Line Chart */}
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
            >
              <defs>
                {/* Gradient vùng bóng dưới biểu đồ */}
                <linearGradient id="downloadAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--blue-9)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--blue-9)" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Lưới tọa độ ngang (Horizontal Grid Lines) */}
              {[0, 0.33, 0.66, 1].map((ratio) => {
                const y = padTop + plotH * (1 - ratio)
                const val = Math.round(yAxisMax * ratio)
                return (
                  <g key={ratio}>
                    <line
                      x1={padLeft}
                      x2={padLeft + plotW}
                      y1={y}
                      y2={y}
                      stroke="var(--slate-4)"
                      strokeDasharray="3 3"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      fill="var(--text-secondary)"
                      fontSize="10"
                      fontFamily="var(--font-ui)"
                    >
                      {val}
                    </text>
                  </g>
                )
              })}

              {/* Vùng diện tích Gradient */}
              <path d={areaPath} fill="url(#downloadAreaGrad)" />

              {/* Đường cong dữ liệu chính */}
              <path
                d={linePath}
                fill="none"
                stroke="var(--blue-9)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Điểm tròn dữ liệu & Nhãn trục X */}
              {points.map((pt, idx) => {
                const isHovered = hoveredPointIndex === idx
                return (
                  <g
                    key={pt.data.day}
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                    onMouseLeave={() => setHoveredPointIndex(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Nhãn Thứ trên trục X */}
                    <text
                      x={pt.x}
                      y={padTop + plotH + 18}
                      textAnchor="middle"
                      fill={isHovered ? 'var(--blue-11)' : 'var(--text-primary)'}
                      fontSize="11.5"
                      fontWeight={isHovered ? '700' : '600'}
                      fontFamily="var(--font-ui)"
                    >
                      {pt.data.day}
                    </text>

                    {/* Nhãn ngày tháng */}
                    <text
                      x={pt.x}
                      y={padTop + plotH + 30}
                      textAnchor="middle"
                      fill="var(--text-secondary)"
                      fontSize="9.5"
                      fontFamily="var(--font-ui)"
                    >
                      {pt.data.date}
                    </text>

                    {/* Đường dóng dọc khi hover */}
                    {isHovered && (
                      <line
                        x1={pt.x}
                        x2={pt.x}
                        y1={padTop}
                        y2={padTop + plotH}
                        stroke="var(--blue-8)"
                        strokeDasharray="2 2"
                        strokeWidth="1.2"
                      />
                    )}

                    {/* Vòng tròn điểm */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke="var(--blue-9)"
                      strokeWidth={isHovered ? 3 : 2}
                      style={{ transition: 'all 0.15s ease' }}
                    />

                    {/* Tooltip nổi khi hover trên điểm */}
                    {isHovered && (
                      <g>
                        <rect
                          x={Math.max(padLeft, Math.min(chartWidth - 140, pt.x - 65))}
                          y={pt.y - 38}
                          width="130"
                          height="28"
                          rx="6"
                          fill="var(--slate-12)"
                          filter="drop-shadow(0 4px 8px rgba(0,0,0,0.15))"
                        />
                        <text
                          x={Math.max(padLeft, Math.min(chartWidth - 140, pt.x - 65)) + 65}
                          y={pt.y - 20}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="700"
                          fontFamily="var(--font-ui)"
                        >
                          {pt.data.downloads} lượt tải ({pt.data.views} đọc)
                        </text>
                      </g>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* DANH SÁCH BỔ TRỢ: TOP HỌC LIỆU ĐƯỢC TẢI NHIỀU NHẤT */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} style={{ color: 'var(--amber-9)' }} />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Học liệu nổi bật có lượt tải cao nhất toàn hệ thống
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Bấm vào để xem trước trực tuyến</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {topDownloadedDocs.map((doc, idx) => (
            <div
              key={doc.id}
              onClick={() => onSelectDoc && onSelectDoc(doc)}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--slate-2)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  #{idx + 1}. {doc.title}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {doc.courseCode} • {doc.uploaderName}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--blue-11)',
                  backgroundColor: 'var(--blue-3)',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  flexShrink: 0
                }}
              >
                {doc.downloadCount} lượt
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* KHU VỰC HÀNG CHỜ DUYỆT NHANH & HOẠT ĐỘNG GẦN ĐÂY (UC11) */}
      <div className="dashboard-charts-grid">
        {/* Hàng chờ kiểm duyệt nhanh */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Tài liệu chờ kiểm duyệt ({pendingDocsCount})
            </h3>
            {onNavigateTab && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => onNavigateTab('moderation')}
                style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--primary-base)' }}
              >
                Xem tất cả hàng đợi
              </button>
            )}
          </div>

          {pendingDocsList.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12.5px', color: 'var(--text-tertiary)' }}>
              Không có tài liệu nào đang tồn đọng trong hàng chờ kiểm duyệt.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingDocsList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-muted)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {item.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {item.uploaderName} • {item.courseCode} • {item.createdAt}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-solid-primary"
                    onClick={() => onNavigateTab && onNavigateTab('moderation')}
                    style={{ padding: '5px 12px', fontSize: '11.5px' }}
                  >
                    Thẩm định
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nhật ký hoạt động gần đây */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Hoạt động quản trị gần đây
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivities.map((act, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: act.color,
                    marginTop: '6px',
                    flexShrink: 0
                  }}
                />
                <div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                    {act.text}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {act.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
