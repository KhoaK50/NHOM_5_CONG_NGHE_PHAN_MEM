import { useCallback, useEffect, useState } from 'react'
import { Star, MessageSquarePlus, Trash2, AlertCircle, ThumbsUp, CornerDownRight } from 'lucide-react'
import { addDocumentComment, deleteDocumentComment, getDocumentComments, rateDocument } from '../../utils/interactionApi'

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('vi-VN')
}

export default function RatingComments({ documentItem, isAuthenticated = false, currentUser, onRequireLogin }) {
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

  const loadComments = useCallback(async (page = 1, append = false) => {
    if (!documentItem?.id) return
    setLoading(true)
    setError('')
    try {
      const data = await getDocumentComments(documentItem.id, { page, limit: 20 })
      setSummary(data.summary)
      setSelectedStars(data.summary.myRating || 5)
      setComments((previous) => append ? [...previous, ...data.items] : data.items)
      setPagination(data.pagination)
    } catch (requestError) {
      setError(requestError.message)
      if (!append) setComments([])
    } finally { setLoading(false) }
  }, [documentItem?.id])

  useEffect(() => { loadComments() }, [loadComments])

  if (!documentItem) return null

  const submit = async (e, parentCommentId = null, replyContent = null) => {
    e?.preventDefault()
    if (!isAuthenticated) { onRequireLogin?.(); return }
    const content = (replyContent ?? commentText).trim()
    if (content.length > 2000) { setError('Bình luận không được vượt quá 2.000 ký tự.'); return }
    if (replyContent !== null && content.length < 2) { setError('Phản hồi cần ít nhất 2 ký tự.'); return }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (parentCommentId === null) await rateDocument(documentItem.id, selectedStars)
      if (content) await addDocumentComment(documentItem.id, content, parentCommentId)
      await loadComments()
      setCommentText('')
      setReplyText('')
      setReplyingTo(null)
      setNotice(parentCommentId ? 'Đã gửi phản hồi.' : content ? 'Đã lưu đánh giá và bình luận.' : 'Đã lưu đánh giá.')
    } catch (requestError) { setError(requestError.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (commentId) => {
    setError('')
    try { await deleteDocumentComment(documentItem.id, commentId); await loadComments(); setNotice('Đã xóa bình luận.') }
    catch (requestError) { setError(requestError.message) }
  }

  const isOwner = (comment) => Boolean(currentUser && Number(comment.userId) === Number(currentUser.id))
  const canDelete = (comment) => isAuthenticated && (isOwner(comment) || currentUser?.role === 'ADMIN')
  const initials = (name) => String(name || 'SV').trim().split(/\s+/).map((part) => part[0]).slice(-2).join('').toUpperCase()

  return (
    <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', boxShadow: 'var(--shadow-card)' }} aria-label="Đánh giá và bình luận">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Đánh giá & Bình luận ({pagination.totalItems})</h3>
        <span className="status-badge amber"><Star size={13} fill="currentColor" /> {summary.totalRatings ? `${Number(summary.average).toFixed(1)} / 5.0 (${summary.totalRatings} lượt)` : 'Chưa có đánh giá'}</span>
      </div>

      <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-muted)', marginBottom: 14 }}>
        <strong style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Phân bổ đánh giá</strong>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = Number(summary.distribution?.[star] || 0)
          const percent = summary.totalRatings ? Math.round(count * 100 / summary.totalRatings) : 0
          return <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontSize: 11 }}><span style={{ width: 28 }}>{star} ★</span><div style={{ flex: 1, height: 6, background: 'var(--slate-4, #e6e8eb)', borderRadius: 3 }}><div style={{ width: `${percent}%`, height: '100%', background: 'var(--amber-9, #ffb224)', borderRadius: 3 }} /></div><span style={{ width: 54, textAlign: 'right' }}>{percent}% ({count})</span></div>
        })}
      </div>

      <form onSubmit={(event) => submit(event)} style={{ marginBottom: 14 }}>
        <strong style={{ fontSize: 13 }}>Đánh giá tài liệu</strong>
        <div onMouseLeave={() => setHoverStar(0)} style={{ display: 'flex', gap: 3, margin: '8px 0' }}>
          {[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} aria-label={`${star} sao`} onClick={() => setSelectedStars(star)} onMouseEnter={() => setHoverStar(star)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', color: star <= (hoverStar || selectedStars) ? 'var(--amber-9)' : 'var(--slate-7)', fontSize: 24 }}>★</button>)}
          <span style={{ alignSelf: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>{selectedStars}/5</span>
        </div>
        <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={2000} rows={3} placeholder="Chia sẻ nhận xét về tài liệu (không bắt buộc)…" style={{ width: '100%', resize: 'vertical', padding: 9, borderRadius: 7, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 7, fontSize: 11, color: 'var(--text-tertiary)' }}>
          <span>{commentText.length}/2.000 ký tự</span>
          <button type="submit" className="btn-solid-primary" disabled={saving}>{saving ? 'Đang gửi…' : <><MessageSquarePlus size={14} /> Gửi đánh giá</>}</button>
        </div>
      </form>

      {error && <div role="alert" style={{ display: 'flex', gap: 6, color: 'var(--red-9)', fontSize: 12, marginBottom: 10 }}><AlertCircle size={14} />{error}</div>}
      {notice && <div role="status" style={{ color: 'var(--green-9)', fontSize: 12, marginBottom: 10 }}>{notice}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 430, overflowY: 'auto' }}>
        {loading && comments.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>Đang tải bình luận từ cơ sở dữ liệu…</p> : comments.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>Chưa có bình luận nào.</p> : comments.map((comment) => (
          <article key={comment.id} style={{ marginLeft: comment.parentCommentId ? 18 : 0, padding: '10px 12px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span className="status-badge blue">{initials(comment.authorName)}</span><strong style={{ fontSize: 12.5 }}>{comment.authorName}</strong><time style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{formatDate(comment.createdAt)}</time></div>
              <div style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}><span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}><ThumbsUp size={11} /> {comment.upvoteCount || 0}</span>{isAuthenticated && <button type="button" className="btn-ghost" onClick={() => { setReplyingTo(comment.id); setReplyText('') }} style={{ padding: 0, fontSize: 11 }}><CornerDownRight size={12} /> Trả lời</button>}{canDelete(comment) && <button type="button" className="btn-ghost" onClick={() => handleDelete(comment.id)} style={{ padding: 0, fontSize: 11, color: 'var(--red-9)' }}><Trash2 size={12} /> Xóa</button>}</div>
            </div>
            {comment.parentCommentId && <div style={{ marginBottom: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>Phản hồi bình luận #{comment.parentCommentId}</div>}
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{comment.content}</p>
            {replyingTo === comment.id && <form onSubmit={(event) => submit(event, comment.id, replyText)} style={{ display: 'flex', gap: 6, marginTop: 8 }}><input value={replyText} onChange={(event) => setReplyText(event.target.value)} maxLength={2000} placeholder="Viết phản hồi…" style={{ flex: 1, minWidth: 0, padding: 7, border: '1px solid var(--border-subtle)', borderRadius: 6 }} /><button className="btn-solid-primary" disabled={saving}>Gửi</button></form>}
          </article>
        ))}
      </div>
      {comments.length < pagination.totalItems && <button type="button" className="btn-ghost" disabled={loading} onClick={() => loadComments(pagination.page + 1, true)} style={{ marginTop: 10, width: '100%' }}>Tải thêm bình luận</button>}
    </section>
  )
}
