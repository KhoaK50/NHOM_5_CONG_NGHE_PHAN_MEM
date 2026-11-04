import { useState, useMemo } from 'react'
import {
  Award,
  Coins,
  Search,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react'
import { BACKEND_PENDING_MESSAGE } from '../../utils/documentCourseApi'

export default function BountyBoard({
  currentUser,
  actorRole = 'USER',
  courses = [],
  documents = [],
  bounties = [],
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

  const userPoints = currentUser?.points ?? 0
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

    setCreateError(BACKEND_PENDING_MESSAGE)
  }

  const handleFulfillSubmit = (e) => {
    e.preventDefault()
    setFulfillError('')

    if (!selectedDocId) {
      setFulfillError('Vui lòng chọn một học liệu từ danh sách để nộp giải thưởng.')
      return
    }

    setFulfillError(BACKEND_PENDING_MESSAGE)
  }

  // Filter approved user docs for fulfilling
  const userApprovedDocs = documents.filter((d) => {
    if (d.status !== 'APPROVED') return false
    if (!currentUser) return false
    return d.uploaderId === currentUser.id || (d.uploaderName && d.uploaderName.includes(currentUser.fullName))
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <header className="page-head">
        <div>
          <h1 className="page-title">Treo thưởng</h1>
          <p className="page-sub">Bạn đang có {userPoints} điểm</p>
        </div>
        <button type="button" className="btn-solid-primary" onClick={handleOpenCreateModal}>
          Tạo yêu cầu
        </button>
      </header>

      {/* 2. Main 2-Column Grid (68% Left Feed / 32% Right Leaderboard) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 340px)',
          gap: '20px',
          alignItems: 'start'
        }}
        className="bounty-workspace-grid"
      >
        {/* Left Column (Feed) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '2 1 540px' }}>
          {/* Toolbar & Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="underline-tabs" role="tablist" aria-label="Lọc yêu cầu">
              {[
                { id: 'ALL', label: `Tất cả (${bounties.length})` },
                { id: 'OPEN', label: `Đang tìm (${openCount})` },
                { id: 'FULFILLED', label: `Đã có lời giải (${fulfilledCount})` },
                { id: 'MINE', label: `Của tôi (${myCount})` }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedStatusTab === tab.id}
                  className={`underline-tab ${selectedStatusTab === tab.id ? 'active' : ''}`}
                  onClick={() => setSelectedStatusTab(tab.id)}
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
                  placeholder="Tìm yêu cầu"
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
                Chưa có yêu cầu treo thưởng nào
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Yêu cầu sẽ hiện ở đây khi chức năng được kết nối máy chủ.
              </p>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {bounty.courseCode}
                        {bounty.courseName ? ` · ${bounty.courseName}` : ''}
                        {isOpen ? '' : ' · Đã có lời giải'}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--status-amber)' }}>
                        +{bounty.rewardPoints} điểm
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
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
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}
                    >
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{bounty.creatorName}</span>

                      {/* Action CTA */}
                      <div>
                        {isOpen ? (
                          isCreator ? (
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Yêu cầu của bạn</span>
                          ) : (
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => handleOpenFulfillModal(bounty)}
                            >
                              <span>Nộp tài liệu</span>
                            </button>
                          )
                        ) : (
                          fulfilledDoc && onSelectDoc && (
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => onSelectDoc(fulfilledDoc)}
                            >
                              <span>Xem tài liệu</span>
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
          <section className="detail-info" aria-label="Top 10 đóng góp">
            <h2 className="section-title" style={{ fontSize: '14px' }}>Top 10 đóng góp</h2>
            <p className="page-sub" style={{ fontSize: '13px', margin: 0 }}>Chưa có dữ liệu xếp hạng.</p>
            <details className="file-check-details">
              <summary>Cách tính điểm</summary>
              <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>+50 điểm khi kích hoạt tài khoản.</li>
                <li>+20 điểm cho mỗi tài liệu được duyệt.</li>
                <li>Khi treo thưởng, điểm được tạm giữ.</li>
                <li>Người nộp đúng tài liệu nhận toàn bộ điểm thưởng.</li>
              </ul>
            </details>
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
                  placeholder="Ghi rõ yêu cầu cụ thể: đề thi có đáp án, kế hoạch bài dạy hoặc tài liệu tham khảo..."
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
                  <span>Đăng yêu cầu treo thưởng</span>
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
