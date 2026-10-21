import { useState, useMemo } from 'react'
import {
  Award,
  Coins,
  Trophy,
  Crown,
  Search,
  Plus,
  Upload,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  HelpCircle,
  UserCheck
} from 'lucide-react'
import { INITIAL_TOP_CONTRIBUTORS } from '../../data/mockData'

export default function BountyBoard({
  currentUser,
  actorRole = 'USER',
  courses = [],
  documents = [],
  bounties = [],
  onCreateBounty,
  onFulfillBounty,
  onSelectDoc,
  onOpenUpload,
  onRequireLogin
}) {
  const [selectedStatusTab, setSelectedStatusTab] = useState('ALL') // 'ALL' | 'OPEN' | 'FULFILLED' | 'MINE'
  const [selectedCourse, setSelectedCourse] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [fulfillingBounty, setFulfillingBounty] = useState(null)

  // Create Bounty Form State
  const activeCourses = courses.filter((c) => c.isActive)
  const [newTitle, setNewTitle] = useState('')
  const [newCourseCode, setNewCourseCode] = useState(activeCourses[0]?.code || 'COMP1044')
  const [newRewardPoints, setNewRewardPoints] = useState(30)
  const [newDescription, setNewDescription] = useState('')
  const [createError, setCreateError] = useState('')

  // Fulfill Bounty Form State
  const [selectedDocId, setSelectedDocId] = useState('')
  const [fulfillError, setFulfillError] = useState('')

  const userPoints = currentUser?.points ?? 140
  const isGuest = actorRole === 'GUEST' || !currentUser

  // Filter bounties
  const filteredBounties = useMemo(() => {
    return bounties.filter((b) => {
      if (selectedStatusTab === 'OPEN' && b.status !== 'OPEN') return false
      if (selectedStatusTab === 'FULFILLED' && b.status !== 'FULFILLED') return false
      if (selectedStatusTab === 'MINE') {
        if (!currentUser) return false
        if (b.creatorId !== currentUser.id && b.creatorName !== currentUser.fullName) return false
      }

      if (selectedCourse !== 'ALL' && b.courseCode !== selectedCourse) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const haystack = `${b.title} ${b.description} ${b.courseCode} ${b.courseName || ''} ${b.creatorName}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [bounties, selectedStatusTab, selectedCourse, searchQuery, currentUser])

  const openCount = bounties.filter((b) => b.status === 'OPEN').length
  const fulfilledCount = bounties.filter((b) => b.status === 'FULFILLED').length
  const myCount = currentUser
    ? bounties.filter((b) => b.creatorId === currentUser.id || b.creatorName === currentUser.fullName).length
    : 0

  // Contributor Leaderboard ranking
  const leaderboard = useMemo(() => {
    return [...INITIAL_TOP_CONTRIBUTORS].sort((a, b) => b.points - a.points).slice(0, 10)
  }, [])

  const userRank = currentUser
    ? leaderboard.findIndex((entry) => entry.id === currentUser.id || entry.name.includes(currentUser.fullName)) + 1
    : 0

  const handleOpenCreateModal = () => {
    if (isGuest) {
      if (onRequireLogin) onRequireLogin()
      return
    }
    setNewTitle('')
    setNewRewardPoints(30)
    setNewDescription('')
    setCreateError('')
    setIsCreateModalOpen(true)
  }

  const handleOpenFulfillModal = (bounty) => {
    if (isGuest) {
      if (onRequireLogin) onRequireLogin()
      return
    }
    setFulfillingBounty(bounty)
    setSelectedDocId('')
    setFulfillError('')
  }

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    setCreateError('')

    const trimmedTitle = newTitle.trim()
    if (trimmedTitle.length < 10) {
      setCreateError('Tiêu đề yêu cầu bắt buộc tối thiểu 10 ký tự.')
      return
    }

    const pointsNum = Number(newRewardPoints)
    if (!Number.isInteger(pointsNum) || pointsNum <= 0) {
      setCreateError('Số điểm thưởng phải là số nguyên dương lớn hơn 0.')
      return
    }

    if (pointsNum > userPoints) {
      setCreateError(`Số dư ví hiện tại (${userPoints} điểm) không đủ để treo thưởng ${pointsNum} điểm.`)
      return
    }

    const matchedCourse = courses.find((c) => c.code === newCourseCode)

    if (onCreateBounty) {
      onCreateBounty({
        title: trimmedTitle,
        courseCode: newCourseCode,
        courseName: matchedCourse?.name || 'Phương pháp dạy học môn Tin học',
        rewardPoints: pointsNum,
        description: newDescription.trim()
      })
    }

    setIsCreateModalOpen(false)
  }

  const handleFulfillSubmit = (e) => {
    e.preventDefault()
    setFulfillError('')

    if (!selectedDocId) {
      setFulfillError('Vui lòng chọn một học liệu từ danh sách để nộp giải thưởng.')
      return
    }

    if (onFulfillBounty && fulfillingBounty) {
      onFulfillBounty(fulfillingBounty.id, selectedDocId)
    }

    setFulfillingBounty(null)
  }

  // Filter approved user docs for fulfilling
  const userApprovedDocs = documents.filter((d) => {
    if (d.status !== 'APPROVED') return false
    if (!currentUser) return false
    return d.uploaderId === currentUser.id || (d.uploaderName && d.uploaderName.includes(currentUser.fullName))
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Bounty Hero Header */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}
        aria-label="Sàn treo thưởng học liệu"
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="status-badge amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Award size={13} />
              <span>Kinh tế Tri thức Sư phạm</span>
            </span>
          </div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Sàn Treo Thưởng Học Liệu & Bảng Vàng Cống Hiến
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '640px', lineHeight: 1.55 }}>
            Treo thưởng điểm cống hiến để tìm kiếm đề thi hiếm, giáo án chuẩn Công văn 5512; giải thưởng yêu cầu để tích lũy điểm và ghi danh trên Bảng Vàng Sinh viên Sư phạm Tin học.
          </p>
        </div>

        {/* User points & Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              backgroundColor: 'var(--amber-1, #fff9ed)',
              border: '1.5px solid var(--amber-3, #ffe3a2)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <Coins size={18} style={{ color: 'var(--amber-11)' }} />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--amber-11)', display: 'block', fontWeight: 600 }}>
                Ví của bạn
              </span>
              <strong style={{ fontSize: '15px', color: 'var(--amber-12)', fontWeight: 800 }}>
                {isGuest ? 'Chưa đăng nhập' : `${userPoints} điểm`}
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="btn-solid-primary"
            onClick={handleOpenCreateModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '10px 18px', height: '42px' }}
          >
            <Plus size={16} />
            <span>Treo thưởng học liệu</span>
          </button>
        </div>
      </section>

      {/* 2. Main 2-Column Grid (68% Left Feed / 32% Right Leaderboard) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}
        className="bounty-workspace-grid"
      >
        {/* Left Column (Feed) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '2 1 540px' }}>
          {/* Toolbar & Filters */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 18px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Status tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: `Tất cả (${bounties.length})` },
                { id: 'OPEN', label: `Đang tìm kiếm (${openCount})` },
                { id: 'FULFILLED', label: `Đã có lời giải (${fulfilledCount})` },
                { id: 'MINE', label: `Của tôi (${myCount})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatusTab(tab.id)}
                  className={selectedStatusTab === tab.id ? 'btn-solid-primary' : 'btn-ghost'}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Course & Search Row */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm yêu cầu học liệu..."
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px 0 32px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12.5px'
                  }}
                />
              </div>

              <div style={{ width: '180px' }}>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12.5px'
                  }}
                >
                  <option value="ALL">Tất cả môn học</option>
                  {activeCourses.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code} – {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bounty Cards Feed */}
          {filteredBounties.length === 0 ? (
            <div className="empty-state-box">
              <Award size={36} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
              <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700 }}>
                Không tìm thấy yêu cầu treo thưởng nào
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Bạn có thể tự tạo yêu cầu mới để kêu gọi bạn học chia sẻ tài liệu.
              </p>
              <button type="button" className="btn-solid-primary" onClick={handleOpenCreateModal}>
                Tạo yêu cầu ngay
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredBounties.map((bounty) => {
                const isCreator = currentUser && (bounty.creatorId === currentUser.id || bounty.creatorName === currentUser.fullName)
                const isOpen = bounty.status === 'OPEN'
                const fulfilledDoc = bounty.fulfilledDocId ? documents.find((d) => d.id === bounty.fulfilledDocId) : null

                return (
                  <article
                    key={bounty.id}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '18px 20px',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Card Top: Badges & Reward Points */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="status-badge blue">{bounty.courseCode}</span>
                        {isOpen ? (
                          <span className="status-badge green">
                            <Clock size={12} /> Đang tìm kiếm
                          </span>
                        ) : (
                          <span className="status-badge slate">
                            <CheckCircle2 size={12} /> Đã có lời giải
                          </span>
                        )}
                        {bounty.courseName && (
                          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            {bounty.courseName}
                          </span>
                        )}
                      </div>

                      {/* Reward points pill */}
                      <span
                        style={{
                          backgroundColor: 'var(--amber-1, #fff9ed)',
                          color: 'var(--amber-11, #ad5700)',
                          border: '1px solid var(--amber-3, #ffe3a2)',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontWeight: 800,
                          fontSize: '13px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Coins size={14} />
                        <span>+{bounty.rewardPoints} điểm</span>
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {bounty.title}
                      </h3>
                      {bounty.description && (
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          {bounty.description}
                        </p>
                      )}
                    </div>

                    {/* Fulfilled banner */}
                    {!isOpen && bounty.fulfilledDocTitle && (
                      <div
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--green-1)',
                          border: '1px solid var(--green-2)',
                          fontSize: '12px',
                          color: 'var(--green-7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={14} />
                          <span>Học liệu giải thưởng: <strong>{bounty.fulfilledDocTitle}</strong></span>
                        </span>
                        {bounty.submitterName && (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Người nộp: {bounty.submitterName}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Card Footer: Creator info & CTA */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: '12px',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <div
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--blue-2)',
                            color: 'var(--primary-base)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 700
                          }}
                        >
                          {bounty.creatorName?.slice(0, 1) || 'S'}
                        </div>
                        <span>
                          <strong>{bounty.creatorName}</strong> ({bounty.creatorCohort || 'K50 SPTH'})
                        </span>
                      </div>

                      {/* Action CTA */}
                      <div>
                        {isOpen ? (
                          isCreator ? (
                            <span
                              style={{
                                fontSize: '12px',
                                color: 'var(--text-tertiary)',
                                fontStyle: 'italic',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <UserCheck size={13} />
                              <span>Yêu cầu của bạn</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-solid-primary"
                              onClick={() => handleOpenFulfillModal(bounty)}
                              style={{ padding: '6px 14px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Upload size={13} />
                              <span>Nộp tài liệu giải thưởng</span>
                            </button>
                          )
                        ) : (
                          fulfilledDoc && onSelectDoc && (
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => onSelectDoc(fulfilledDoc)}
                              style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                            >
                              <Eye size={13} />
                              <span>Xem học liệu giải thưởng</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Top 10 Contributor Leaderboard & Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', flex: '1 1 300px' }}>
          {/* Top 10 Leaderboard Card */}
          <section
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '20px',
              boxShadow: 'var(--shadow-card)'
            }}
            aria-label="Bảng vàng top 10 cống hiến"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Trophy size={18} style={{ color: 'var(--amber-9, #ffb224)' }} />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Bảng Vàng Top 10 Cống Hiến
              </h2>
            </div>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Vinh danh sinh viên Sư phạm Tin học tích cực chia sẻ học liệu và giải thưởng.
            </p>

            {/* List entries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {leaderboard.map((item, index) => {
                const rank = index + 1
                const isTop1 = rank === 1
                const isTop2 = rank === 2
                const isTop3 = rank === 3

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      backgroundColor: isTop1 ? 'var(--amber-1, #fff9ed)' : 'var(--bg-muted)',
                      border: isTop1 ? '1px solid var(--amber-3, #ffe3a2)' : '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      {/* Rank badge */}
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: isTop1 ? '#ffd700' : isTop2 ? '#cbd5e1' : isTop3 ? '#f59e0b' : 'var(--slate-4)',
                          color: isTop1 || isTop2 || isTop3 ? '#000000' : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 800,
                          flexShrink: 0
                        }}
                      >
                        {isTop1 ? <Crown size={13} style={{ color: '#854d0e' }} /> : rank}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                          {item.cohort}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: isTop1 ? 'var(--amber-12)' : 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {item.points} đ
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Current user position card */}
            {!isGuest && (
              <div
                style={{
                  marginTop: '14px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--blue-1)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}
              >
                <span>Vị trí của bạn: </span>
                <strong style={{ color: 'var(--primary-base)' }}>
                  {userRank > 0 ? `Hạng ${userRank}` : 'Hạng 12+'}
                </strong>
                <span> • </span>
                <strong style={{ color: 'var(--amber-11)' }}>{userPoints} điểm cống hiến</strong>
              </div>
            )}
          </section>

          {/* Gamification Rules Card */}
          <section
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '18px 20px',
              boxShadow: 'var(--shadow-sm)'
            }}
            aria-label="Cơ chế điểm thưởng học thuật"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <HelpCircle size={15} style={{ color: 'var(--primary-base)' }} />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Quy Tắc Điểm Cống Hiến
              </h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <li>
                <strong>+50 điểm:</strong> Tặng khi kích hoạt tài khoản Sinh viên HCMUE.
              </li>
              <li>
                <strong>+20 điểm:</strong> Mỗi học liệu được Admin phê duyệt đạt 8/8 tiêu chí.
              </li>
              <li>
                <strong>Treo thưởng:</strong> Tạm giữ điểm ví khi đăng yêu cầu tìm học liệu.
              </li>
              <li>
                <strong>Giải thưởng:</strong> 100% điểm thưởng chuyển vào ví người nộp tài liệu chuẩn.
              </li>
            </ul>
          </section>
        </div>
      </div>

      {/* 3. Create Bounty Modal */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Treo thưởng học liệu mới">
          <div className="modal-panel" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="status-badge amber">
                <Coins size={13} />
                <span>Treo thưởng học liệu</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Đăng Yêu Cầu Treo Thưởng Học Liệu
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Điểm thưởng sẽ được tạm giữ từ ví và chuyển cho bạn học nộp tài liệu chuẩn xác.
            </p>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Tiêu đề yêu cầu học liệu (Tối thiểu 10 ký tự):
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Cần Đề thi kết thúc học phần An toàn thông tin K49..."
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Học phần liên quan:
                </label>
                <select
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value)}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                >
                  {activeCourses.map((crs) => (
                    <option key={crs.id} value={crs.code}>
                      {crs.code} – {crs.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Số điểm thưởng muốn treo:
                  </label>
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Số dư: <strong>{userPoints} điểm</strong>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    max={userPoints}
                    value={newRewardPoints}
                    onChange={(e) => setNewRewardPoints(e.target.value)}
                    style={{
                      width: '110px',
                      height: '38px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[20, 30, 50, 100].map((pts) => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setNewRewardPoints(pts)}
                        className="btn-ghost"
                        style={{ padding: '4px 8px', fontSize: '11.5px', border: '1px solid var(--border-subtle)' }}
                      >
                        +{pts}đ
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Mô tả chi tiết yêu cầu:
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Ghi rõ yêu cầu cụ thể: đề thi có đáp án, giáo án theo mẫu CV 5512 hay slide có bài tập thực hành..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12.5px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {createError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--red-1)',
                    color: 'var(--red-6)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <AlertTriangle size={14} />
                  <span>{createError}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="btn-ghost" onClick={() => setIsCreateModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-solid-primary" style={{ padding: '8px 20px' }}>
                  <span>Treo thưởng ngay (-{newRewardPoints}đ)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Fulfill Bounty Modal */}
      {fulfillingBounty && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Nộp tài liệu giải thưởng">
          <div className="modal-panel" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="status-badge green">
                <Upload size={13} />
                <span>Giải thưởng +{fulfillingBounty.rewardPoints} điểm</span>
              </span>
              <button
                type="button"
                onClick={() => setFulfillingBounty(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Nộp Học Liệu Giải Thưởng
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Yêu cầu: <strong>{fulfillingBounty.title}</strong> ({fulfillingBounty.courseCode})
            </p>

            <form onSubmit={handleFulfillSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Chọn từ danh sách học liệu đã tải lên của bạn:
                </label>
                {userApprovedDocs.length === 0 ? (
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-muted)',
                      textAlign: 'center',
                      fontSize: '12.5px',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <p style={{ margin: '0 0 10px 0' }}>
                      Bạn chưa có tài liệu nào đã được phê duyệt trên hệ thống để chọn.
                    </p>
                    <button
                      type="button"
                      className="btn-solid-primary"
                      onClick={() => {
                        setFulfillingBounty(null)
                        if (onOpenUpload) onOpenUpload({ courseCode: fulfillingBounty.courseCode })
                      }}
                      style={{ fontSize: '12px', padding: '6px 14px' }}
                    >
                      Đóng góp tài liệu mới ngay
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 10px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '13px'
                    }}
                  >
                    <option value="">-- Chọn tài liệu đã phê duyệt --</option>
                    {userApprovedDocs.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title} ({doc.courseCode})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {fulfillError && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--red-1)',
                    color: 'var(--red-6)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <AlertTriangle size={14} />
                  <span>{fulfillError}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" className="btn-ghost" onClick={() => setFulfillingBounty(null)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-solid-primary"
                  disabled={!selectedDocId}
                  style={{ padding: '8px 20px', opacity: !selectedDocId ? 0.5 : 1 }}
                >
                  <span>Xác nhận nộp giải thưởng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
