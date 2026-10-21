import { useState } from 'react'
import {
  Star,
  MessageSquarePlus,
  Trash2,
  Edit3,
  Check,
  X,
  AlertCircle,
  Flag
} from 'lucide-react'

export default function RatingComments({
  documentItem,
  isAuthenticated = false,
  currentUser,
  onAddRatingComment,
  onEditComment,
  onDeleteComment,
  onReportComment,
  onRequireLogin
}) {
  const [selectedStars, setSelectedStars] = useState(5)
  const [commentText, setCommentText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingContent, setEditingContent] = useState('')

  if (!documentItem) return null

  const comments = documentItem.comments || []

  // Score breakdown distribution (5★ to 1★)
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  comments.forEach((c) => {
    const star = Math.min(5, Math.max(1, Math.round(c.rating || 5)))
    distribution[star] = (distribution[star] || 0) + 1
  })
  const totalRatings = comments.length || documentItem.ratingCount || 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin()
      return
    }

    const trimmed = commentText.trim()
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập nội dung nhận xét chuyên môn trước khi gửi (hoặc bấm "Chỉ chấm sao").')
      return
    }
    if (trimmed.length > 1000) {
      setErrorMsg('Nội dung bình luận không được vượt quá 1.000 ký tự.')
      return
    }

    setErrorMsg('')
    onAddRatingComment(documentItem.id, selectedStars, trimmed)
    setCommentText('')
  }

  const handleRateOnly = () => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin()
      return
    }
    setErrorMsg('')
    onAddRatingComment(documentItem.id, selectedStars, '')
  }

  const handleSaveEdit = (commentId) => {
    const trimmed = editingContent.trim()
    if (!trimmed || trimmed.length > 1000) return
    if (onEditComment) {
      onEditComment(documentItem.id, commentId, trimmed)
    }
    setEditingCommentId(null)
    setEditingContent('')
  }

  return (
    <section
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        boxShadow: 'var(--shadow-card)'
      }}
      aria-label="Đánh giá chất lượng và thảo luận học thuật"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px',
          paddingBottom: '10px',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
          Đánh giá & Thảo luận ({comments.length})
        </h3>

        <div className="status-badge amber" style={{ fontSize: '12px', padding: '4px 10px' }}>
          <Star size={13} fill="currentColor" />
          <span>
            {documentItem.ratingAvg > 0 ? documentItem.ratingAvg.toFixed(1) : 'Mới'} / 5.0 ({totalRatings})
          </span>
        </div>
      </div>

      {/* Score Breakdown Bars (5★ to 1★) */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-muted)',
          marginBottom: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px'
        }}
        aria-label="Biểu đồ phân bổ điểm số đánh giá"
      >
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '2px' }}>
          Phân bổ đánh giá ({totalRatings} nhận xét):
        </span>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] || 0
          const pct = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0
          return (
            <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
              <span style={{ width: '22px', color: 'var(--text-tertiary)', fontWeight: 600 }}>{star}★</span>
              <div
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: 'var(--slate-4, #e6e8eb)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    backgroundColor: 'var(--amber-9, #ffb224)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <span style={{ width: '52px', textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {pct}% ({count})
              </span>
            </div>
          )
        })}
      </div>

      {/* Biểu mẫu chấm 1-5 sao & viết bình luận */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4, 5].map((starValue) => (
            <button
              key={starValue}
              type="button"
              onClick={() => {
                if (!isAuthenticated && onRequireLogin) {
                  onRequireLogin()
                  return
                }
                setSelectedStars(starValue)
              }}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                border: selectedStars >= starValue ? '1px solid var(--amber-6)' : '1px solid var(--border-subtle)',
                backgroundColor: selectedStars >= starValue ? 'var(--amber-1)' : 'var(--bg-surface)',
                color: selectedStars >= starValue ? 'var(--amber-7)' : 'var(--text-tertiary)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <Star size={12} fill={selectedStars >= starValue ? 'currentColor' : 'none'} />
              <span>{starValue}★</span>
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={
            isAuthenticated
              ? 'Chia sẻ nhận xét về cấu trúc 4 hoạt động Công văn 5512, độ chính xác của bài tập hoặc đóng góp ý kiến nâng cao chất lượng...'
              : 'Đăng nhập tài khoản Sinh viên để chấm sao và tham gia thảo luận học thuật...'
          }
          style={{
            width: '100%',
            padding: '9px 11px',
            borderRadius: '8px',
            border: '1.5px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '12.5px',
            marginBottom: '8px',
            resize: 'vertical'
          }}
        />

        {errorMsg && (
          <div
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              backgroundColor: 'var(--red-1)',
              color: 'var(--red-6)',
              fontSize: '11.5px',
              marginBottom: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <AlertCircle size={13} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            className="btn-solid-primary"
            style={{ flex: 1, padding: '7px 12px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <MessageSquarePlus size={14} />
            <span>{isAuthenticated ? `Gửi ${selectedStars}★ & Nhận xét` : 'Đăng nhập để đánh giá'}</span>
          </button>

          {isAuthenticated && (
            <button
              type="button"
              className="btn-ghost"
              onClick={handleRateOnly}
              style={{
                padding: '7px 10px',
                fontSize: '12px',
                border: '1px solid var(--border-subtle)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Star size={13} />
              <span>Chỉ chấm {selectedStars}★</span>
            </button>
          )}
        </div>
      </form>

      {/* Danh sách bình luận học thuật */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
        {comments.length === 0 ? (
          <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12.5px' }}>
            Chưa có nhận xét nào. Hãy là người đầu tiên đóng góp ý kiến chuyên môn.
          </div>
        ) : (
          comments.map((cmt) => {
            const isOwner =
              isAuthenticated &&
              currentUser &&
              (cmt.authorId === currentUser.id ||
                cmt.userId === currentUser.id ||
                (cmt.authorName && currentUser.fullName && cmt.authorName.includes(currentUser.fullName)))

            // Self-delete + Admin moderation privilege
            const canDelete = Boolean(
              isAuthenticated &&
              currentUser &&
              (isOwner || currentUser.role === 'ADMIN')
            )

            const isEditing = editingCommentId === cmt.id

            return (
              <div
                key={cmt.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-muted)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '6px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>{cmt.authorName}</strong>
                    <span className="status-badge amber" style={{ padding: '1px 6px', fontSize: '10.5px' }}>★ {cmt.rating}/5</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{cmt.createdAt}</span>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    {/* Sửa bình luận (chỉ tác giả) */}
                    {isOwner && onEditComment && !isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentId(cmt.id)
                          setEditingContent(cmt.content)
                        }}
                        title="Chỉnh sửa bình luận"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary-base)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: 0
                        }}
                      >
                        <Edit3 size={12} />
                        <span>Sửa</span>
                      </button>
                    )}

                    {/* Báo cáo bình luận (chỉ dành cho người khác) */}
                    {!isOwner && isAuthenticated && onReportComment && (
                      <button
                        type="button"
                        onClick={() => onReportComment(cmt)}
                        title="Báo cáo bình luận vi phạm chuẩn mực học thuật"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: 0
                        }}
                      >
                        <Flag size={11} />
                        <span>Báo cáo</span>
                      </button>
                    )}

                    {/* Xóa bình luận (Tác giả hoặc Quản trị viên) */}
                    {canDelete && onDeleteComment && (
                      <button
                        type="button"
                        onClick={() => onDeleteComment(documentItem.id, cmt.id)}
                        title={currentUser?.role === 'ADMIN' && !isOwner ? 'Quản trị viên xóa bình luận' : 'Xóa bình luận'}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--red-6)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: 0
                        }}
                      >
                        <Trash2 size={12} />
                        <span>{currentUser?.role === 'ADMIN' && !isOwner ? 'Xóa (Admin)' : 'Xóa'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div style={{ marginTop: '6px' }}>
                    <textarea
                      rows={2}
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 9px',
                        borderRadius: '6px',
                        border: '1px solid var(--primary-base)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '12.5px',
                        marginBottom: '6px'
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn-solid-primary"
                        onClick={() => handleSaveEdit(cmt.id)}
                        style={{ padding: '4px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Check size={12} /> Lưu
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setEditingCommentId(null)}
                        style={{ padding: '4px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <X size={12} /> Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {cmt.content}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
