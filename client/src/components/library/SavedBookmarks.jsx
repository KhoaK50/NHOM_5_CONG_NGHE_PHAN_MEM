import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, BookOpen, Download, Trash2, FolderOpen } from 'lucide-react'
import { downloadDocument, listBookmarks } from '../../utils/interactionApi'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN')
}

export default function SavedBookmarks({ onSelectDoc, onToggleBookmark, onNavigateDiscovery }) {
  const [items, setItems] = useState([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setItems(await listBookmarks()) }
    catch (requestError) { setItems([]); setError(requestError.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLocaleLowerCase('vi')
    if (!q) return items
    return items.filter((doc) => `${doc.title} ${doc.courseName} ${doc.courseCode}`.toLocaleLowerCase('vi').includes(q))
  }, [items, keyword])

  const handleRemove = async (doc) => {
    try {
      await onToggleBookmark?.(doc.id)
      setItems((previous) => previous.filter((item) => item.id !== doc.id))
    } catch (requestError) { setError(requestError.message) }
  }

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id)
    setError('')
    try { await downloadDocument(doc.id, doc.fileName || `5share-${doc.id}.pdf`) }
    catch (requestError) { setError(requestError.message) }
    finally { setDownloadingId(null) }
  }

  return (
    <section>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>Tài liệu đã lưu</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{items.length} tài liệu trong tủ cá nhân của bạn.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-tertiary)' }} />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm trong tài liệu đã lưu…" aria-label="Tìm tài liệu đã lưu" style={{ height: 36, width: 270, maxWidth: '80vw', padding: '0 10px 0 30px', border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
        </div>
      </header>

      {error && <div role="alert" className="empty-state-box" style={{ marginBottom: 12 }}>Có lỗi: {error} <button type="button" className="btn-ghost" onClick={loadItems}>Tải lại</button></div>}
      {loading ? <div className="empty-state-box">Đang tải tủ tài liệu từ cơ sở dữ liệu…</div> : filtered.length === 0 ? (
        <div className="empty-state-box"><FolderOpen size={36} /><h3>{items.length ? 'Không tìm thấy tài liệu phù hợp' : 'Tủ tài liệu đang trống'}</h3><p>Lưu tài liệu đã phát hành để tìm lại và tải PDF gốc khi cần.</p>{!items.length && <button type="button" className="btn-solid-primary" onClick={onNavigateDiscovery}>Khám phá tài liệu</button>}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14 }}>
          {filtered.map((doc) => (
            <article key={doc.id} style={{ display: 'flex', flexDirection: 'column', padding: 16, border: '1px solid var(--border-subtle)', borderRadius: 12, background: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span className="status-badge red">PDF</span>
                <button type="button" className="btn-ghost" onClick={() => handleRemove(doc)} title="Bỏ lưu" aria-label={`Bỏ lưu ${doc.title}`}><Trash2 size={14} /> Bỏ lưu</button>
              </div>
              <h3 style={{ margin: '12px 0 4px', fontSize: 15, color: 'var(--text-primary)' }}>{doc.title}</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>{doc.courseName || doc.courseCode} · Lưu ngày {formatDate(doc.savedAt)}</p>
              <div style={{ marginTop: 13, flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Ghi chú cá nhân</div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{doc.note || 'Chưa có ghi chú.'}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn-solid-primary" onClick={() => onSelectDoc?.(doc)}><BookOpen size={14} /> Đọc tài liệu</button>
                <button type="button" className="btn-ghost" disabled={downloadingId === doc.id} onClick={() => handleDownload(doc)}><Download size={14} /> {downloadingId === doc.id ? 'Đang tải…' : 'Tải PDF gốc'}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
