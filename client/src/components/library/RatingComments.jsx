import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { addDocumentComment, deleteDocumentComment, getDocumentComments, rateDocument } from '../../utils/interactionApi'

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN')
}

export default function RatingComments({
  documentItem,
  isAuthenticated = false,
  canInteract,
  currentUser,
  onRequireLogin
}) {
  const effectiveCanInteract = Boolean(canInteract !== undefined ? canInteract : isAuthenticated)
  const [summary, setSummary] = useState({ average: 0, totalRatings: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, myRating: null })
  const [comments, setComments] = useState([])
  const [selectedStars, setSelectedStars] = useState(5)
  const [hoverStar, setHoverStar] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [pagination, setPagination] = useState({ page: 1, totalItems: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const docId = documentItem?.id

  useEffect(() => {
    if (!docId) return undefined
    let cancelled = false
    getDocumentComments(docId, { page: 1, limit: 20 })
      .then((data) => {
        if (cancelled) return
        setSummary(data.summary)
        setSelectedStars(data.summary.myRating || 5)
        setComments(data.items)
        setPagination({ page: data.page, totalItems: data.totalItems })
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [docId, reloadKey])

  const submit = async (event, parentCommentId = null, text = commentText) => {
    event.preventDefault()
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin()
      return
    }
    setError('')
    setNotice('')
    setSaving(true)
    try {
      if (!parentCommentId && selectedStars) {
        await rateDocument(docId, selectedStars)
      }
      if (text.trim()) {
        await addDocumentComment(docId, { content: text.trim(), parentCommentId })
      }
      setCommentText('')
      setReplyingTo(null)
      setReplyText('')
      setNotice('Đã lưu đánh giá của bạn.')
      setReloadKey((k) => k + 1)
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
      setComments((prev) => [...prev, ...data.items])
      setPagination({ page: data.page, totalItems: data.totalItems })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (commentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return
    setError('')
    try {
      await deleteDocumentComment(docId, commentId)
      setReloadKey((k) => k + 1)
      setNotice('Đã xóa bình luận.')
    } catch (requestError) { setError(requestError.message) }
  }

  const isOwner = (comment) => Boolean(currentUser && Number(comment.userId) === Number(currentUser.id))
  const canDelete = (comment) => isAuthenticated && (isOwner(comment) || currentUser?.role === 'ADMIN')

  return (
    <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-card)' }} aria-label="Đánh giá và bình luận">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Đánh giá & bình luận ({pagination.totalItems})</h3>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{summary.totalRatings ? `★ ${Number(summary.average).toFixed(1)} · ${summary.totalRatings} lượt` : 'Chưa có đánh giá'}</span>
      </div>

      {effectiveCanInteract ? (
        <form onSubmit={(event) => submit(event)} style={{ marginBottom: 14 }}>
          <strong style={{ fontSize: 13 }}>Đánh giá tài liệu</strong>
          <div onMouseLeave={() => setHoverStar(0)} style={{ display: 'flex', gap: 3, margin: '8px 0' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                aria-label={`${star} sao`}
                onClick={() => setSelectedStars(star)}
                onMouseEnter={() => setHoverStar(star)}
                style={{
                  border: 0,
                  background: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: star <= (hoverStar || selectedStars) ? 'var(--amber-9)' : 'var(--slate-7)',
                  fontSize: 24
                }}
              >
                ★
              </button>
            ))}
            <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>{selectedStars}/5</span>
          </div>
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Chia sẻ nhận xét về tài liệu (không bắt buộc)…"
            style={{
              width: '100%',
              resize: 'vertical',
              padding: 9,
              borderRadius: 7,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 7, fontSize: 11, color: 'var(--text-tertiary)' }}>
            <span>{commentText.length}/2.000 ký tự</span>
            <button type="submit" className="btn-solid-primary" disabled={saving}>
              {saving ? 'Đang gửi…' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      ) : (
        !isAuthenticated && (
          <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Đăng nhập để gửi đánh giá và nhận xét học liệu</span>
            <button type="button" className="btn-ghost" onClick={onRequireLogin} style={{ fontSize: 12, fontWeight: 600 }}>Đăng nhập</button>
          </div>
        )
      )}

      {error && <div role="alert" style={{ display: 'flex', gap: 6, color: 'var(--red-9)', fontSize: 12, marginBottom: 10 }}><AlertCircle size={14} />{error}</div>}
      {notice && <div role="status" style={{ color: 'var(--green-9)', fontSize: 12, marginBottom: 10 }}>{notice}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 430, overflowY: 'auto' }}>
        {loading && comments.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>Đang tải bình luận…</p> : comments.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>Chưa có bình luận nào.</p> : comments.map((comment) => (
          <article key={comment.id} style={{ marginLeft: comment.parentCommentId ? 18 : 0, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><strong style={{ fontSize: 12.5 }}>{comment.authorName}</strong><time style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{formatDate(comment.createdAt)}</time></div>
              <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                {effectiveCanInteract && (
                  <button type="button" className="btn-ghost" onClick={() => { setReplyingTo(comment.id); setReplyText('') }} style={{ padding: 0, fontSize: 11 }}>
                    Trả lời
                  </button>
                )}
                {canDelete(comment) && (
                  <button type="button" className="btn-ghost" onClick={() => handleDelete(comment.id)} style={{ padding: 0, fontSize: 11, color: 'var(--red-9)' }}>
                    Xóa
                  </button>
                )}
              </div>
            </div>
            {comment.parentCommentId && <div style={{ marginBottom: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>Phản hồi bình luận #{comment.parentCommentId}</div>}
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{comment.content}</p>
            {replyingTo === comment.id && (
              <form onSubmit={(event) => submit(event, comment.id, replyText)} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input value={replyText} onChange={(event) => setReplyText(event.target.value)} maxLength={2000} placeholder="Viết phản hồi…" style={{ flex: 1, minWidth: 0, padding: 7, border: '1px solid var(--border-subtle)', borderRadius: 6 }} />
                <button className="btn-solid-primary" disabled={saving}>Gửi</button>
              </form>
            )}
          </article>
        ))}
      </div>
      {comments.length < pagination.totalItems && (
        <button type="button" className="btn-ghost" disabled={loading} onClick={handleLoadMore} style={{ marginTop: 10, width: '100%' }}>
          Tải thêm bình luận
        </button>
      )}
    </section>
  )
}
