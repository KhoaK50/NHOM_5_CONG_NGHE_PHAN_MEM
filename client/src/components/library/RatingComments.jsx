import { useEffect, useState } from 'react'
import { AlertCircle, Pencil, Star, Trash2 } from 'lucide-react'
import { deleteDocumentComment, deleteMyReview, getDocumentComments, saveMyReview } from '../../utils/interactionApi'
import ConfirmDialog from '../common/ConfirmDialog'
import RequiredMark from '../common/RequiredMark'

const EMPTY_SUMMARY = { average: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, myRating: null }
const MAX_REVIEW_LENGTH = 2000
const LEGACY_CONTENT_NOTICE = 'Bình luận cũ không hiển thị được nội dung.'

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function StarRow({ value = 0, size = 14 }) {
  const rounded = Math.round(Number(value) || 0)
  return (
    <span className="review-stars" role="img" aria-label={`${rounded} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} className={star <= rounded ? 'is-on' : ''} fill={star <= rounded ? 'currentColor' : 'none'} aria-hidden="true" />
      ))}
    </span>
  )
}

function IconAction({ label, danger = false, onClick, children }) {
  return (
    <button type="button" className={`review-icon-btn ${danger ? 'is-danger' : ''}`} onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  )
}

function readableContent(content) {
  return typeof content === 'string' && content !== '[object Object]' ? content : LEGACY_CONTENT_NOTICE
}

export default function RatingComments({
  documentItem,
  isAuthenticated = false,
  canInteract,
  currentUser,
  onRequireLogin,
  onSummaryChange
}) {
  const effectiveCanInteract = Boolean(canInteract !== undefined ? canInteract : isAuthenticated)
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [myReview, setMyReview] = useState(null)
  const [comments, setComments] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalItems: 0 })
  const [isEditing, setIsEditing] = useState(false)
  const [draftStars, setDraftStars] = useState(0)
  const [hoverStar, setHoverStar] = useState(0)
  const [draftText, setDraftText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [pendingDelete, setPendingDelete] = useState(null) // { kind: 'mine' } | { kind: 'comment', id }

  const docId = documentItem?.id

  useEffect(() => {
    if (!docId) return undefined
    let cancelled = false
    getDocumentComments(docId, { page: 1, limit: 20 })
      .then((data) => {
        if (cancelled) return
        setSummary(data.summary)
        setMyReview(data.myReview || null)
        setComments(data.items)
        setPagination({ page: data.pagination.page, totalItems: data.pagination.totalItems })
        onSummaryChange?.(docId, data.summary)
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [docId, reloadKey, onSummaryChange])

  const startEditing = () => {
    setDraftStars(myReview?.score || 0)
    setDraftText(myReview?.content || '')
    setError('')
    setNotice('')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setDraftStars(0)
    setDraftText('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isAuthenticated) {
      onRequireLogin?.()
      return
    }
    const content = draftText.trim()
    if (!draftStars) {
      setError('Vui lòng chọn số sao trước khi gửi đánh giá.')
      return
    }
    if (content.length === 1) {
      setError('Nhận xét cần ít nhất 2 ký tự, hoặc để trống nếu chỉ muốn chấm sao.')
      return
    }
    setError('')
    setNotice('')
    setSaving(true)
    try {
      await saveMyReview(docId, { score: draftStars, content })
      setIsEditing(false)
      setDraftStars(0)
      setDraftText('')
      setNotice(myReview ? 'Đã cập nhật đánh giá của bạn.' : 'Đã gửi đánh giá của bạn.')
      setReloadKey((key) => key + 1)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLoadMore = async () => {
    const nextPage = pagination.page + 1
    setLoading(true)
    try {
      const data = await getDocumentComments(docId, { page: nextPage, limit: 20 })
      setComments((prev) => [...prev, ...data.items.filter((item) => !prev.some((known) => known.id === item.id))])
      setPagination({ page: data.pagination.page, totalItems: data.pagination.totalItems })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    const target = pendingDelete
    setPendingDelete(null)
    setError('')
    setNotice('')
    try {
      if (target.kind === 'mine') {
        await deleteMyReview(docId)
        setIsEditing(false)
        setNotice('Đã xóa đánh giá của bạn.')
      } else {
        await deleteDocumentComment(docId, target.id)
        setNotice('Đã xóa nhận xét.')
      }
      setReloadKey((key) => key + 1)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const canDelete = (comment) => {
    if (!isAuthenticated) return false
    const isOwner = Boolean(currentUser && Number(comment.userId) === Number(currentUser.id))
    return isOwner || currentUser?.role === 'ADMIN'
  }

  const visibleComments = comments.filter((comment) => comment.id !== myReview?.commentId)
  const total = summary.totalRatings || 0
  const showForm = effectiveCanInteract && (!myReview || isEditing)

  return (
    <section className="review-panel" aria-label="Đánh giá và nhận xét">
      <h3 className="review-panel-title">Đánh giá và nhận xét</h3>

      <div className="review-summary">
        <div className="review-score">
          <strong>{total ? Number(summary.average).toFixed(1) : '–'}</strong>
          <StarRow value={summary.average} size={15} />
          <span>{total ? `${total.toLocaleString('vi-VN')} lượt đánh giá` : 'Chưa có đánh giá'}</span>
        </div>
        <div className="review-bars" aria-hidden="true">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.distribution?.[star] || 0
            return (
              <div className="review-bar-row" key={star}>
                <span>{star}</span>
                <div className="review-bar-track"><span style={{ width: `${total ? (count / total) * 100 : 0}%` }} /></div>
              </div>
            )
          })}
        </div>
      </div>

      {error && <div className="review-message is-error" role="alert"><AlertCircle size={15} aria-hidden="true" /><span>{error}</span></div>}
      {notice && <div className="review-message is-success" role="status"><span>{notice}</span></div>}

      {!isAuthenticated && (
        <div className="review-login-prompt">
          <span>Đăng nhập để đánh giá tài liệu này</span>
          <button type="button" className="btn-ghost" onClick={onRequireLogin}>Đăng nhập</button>
        </div>
      )}

      {myReview && !isEditing && (
        <article className="review-item is-mine" aria-label="Đánh giá của bạn">
          <div className="review-avatar" aria-hidden="true">{getInitials(currentUser?.fullName)}</div>
          <div className="review-body">
            <div className="review-head">
              <strong>Đánh giá của bạn</strong>
              <div className="review-actions">
                <IconAction label="Chỉnh sửa đánh giá" onClick={startEditing}><Pencil size={16} aria-hidden="true" /></IconAction>
                <IconAction label="Xóa đánh giá" danger onClick={() => setPendingDelete({ kind: 'mine' })}><Trash2 size={16} aria-hidden="true" /></IconAction>
              </div>
            </div>
            <div className="review-meta">
              {myReview.score ? <StarRow value={myReview.score} /> : <span>Chưa chấm sao</span>}
              <time>{formatDate(myReview.createdAt)}</time>
            </div>
            {myReview.content && <p className="review-text">{readableContent(myReview.content)}</p>}
          </div>
        </article>
      )}

      {showForm && (
        <form className="review-form" onSubmit={handleSubmit}>
          <span className="review-form-label" id="review-stars-label">
            {isEditing ? 'Chỉnh sửa đánh giá của bạn' : 'Đánh giá của bạn'}
            <RequiredMark />
          </span>
          <div className="review-star-input" role="group" aria-labelledby="review-stars-label" onMouseLeave={() => setHoverStar(0)}>
            {[1, 2, 3, 4, 5].map((star) => {
              const isOn = star <= (hoverStar || draftStars)
              return (
                <button
                  type="button"
                  key={star}
                  className={isOn ? 'is-on' : ''}
                  aria-label={`${star} sao`}
                  aria-pressed={draftStars === star}
                  onClick={() => { setDraftStars(star); setError('') }}
                  onMouseEnter={() => setHoverStar(star)}
                >
                  <Star size={28} fill={isOn ? 'currentColor' : 'none'} aria-hidden="true" />
                </button>
              )
            })}
          </div>
          <label className="review-form-label" htmlFor="review-text-input">Nhận xét (không bắt buộc)</label>
          <textarea
            id="review-text-input"
            className="vec-form-textarea"
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            maxLength={MAX_REVIEW_LENGTH}
            rows={3}
            placeholder="Chia sẻ nhận xét của bạn về tài liệu này"
          />
          <div className="review-form-footer">
            <span>{draftText.length.toLocaleString('vi-VN')}/2.000 ký tự</span>
            <div className="review-form-buttons">
              {isEditing && <button type="button" className="btn-ghost nav-auth-link" onClick={cancelEditing} disabled={saving}>Hủy</button>}
              <button type="submit" className="btn-solid-primary" disabled={saving}>
                {saving ? 'Đang lưu…' : isEditing ? 'Lưu thay đổi' : 'Gửi đánh giá'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="review-list">
        {loading && comments.length === 0 ? (
          <p className="review-empty">Đang tải nhận xét…</p>
        ) : visibleComments.length === 0 ? (
          <p className="review-empty">{myReview ? 'Chưa có nhận xét nào khác.' : 'Chưa có nhận xét nào.'}</p>
        ) : visibleComments.map((comment) => (
          <article key={comment.id} className={`review-item ${comment.parentCommentId ? 'is-reply' : ''}`}>
            <div className="review-avatar" aria-hidden="true">{getInitials(comment.authorName)}</div>
            <div className="review-body">
              <div className="review-head">
                <strong>{comment.authorName}</strong>
                {canDelete(comment) && (
                  <div className="review-actions">
                    <IconAction label="Xóa nhận xét" danger onClick={() => setPendingDelete({ kind: 'comment', id: comment.id })}>
                      <Trash2 size={16} aria-hidden="true" />
                    </IconAction>
                  </div>
                )}
              </div>
              <div className="review-meta">
                {comment.score ? <StarRow value={comment.score} /> : null}
                <time>{formatDate(comment.createdAt)}</time>
              </div>
              <p className="review-text">{readableContent(comment.content)}</p>
            </div>
          </article>
        ))}
      </div>

      {comments.length < pagination.totalItems && (
        <button type="button" className="btn-ghost review-more" disabled={loading} onClick={handleLoadMore}>
          Tải thêm nhận xét
        </button>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.kind === 'mine' ? 'Xóa đánh giá của bạn?' : 'Xóa nhận xét này?'}
          message={pendingDelete.kind === 'mine' ? 'Số sao và nhận xét của bạn sẽ bị xóa. Bạn có thể đánh giá lại sau.' : 'Nhận xét sẽ bị xóa khỏi tài liệu và không thể khôi phục.'}
          confirmLabel={pendingDelete.kind === 'mine' ? 'Xóa đánh giá' : 'Xóa nhận xét'}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  )
}
