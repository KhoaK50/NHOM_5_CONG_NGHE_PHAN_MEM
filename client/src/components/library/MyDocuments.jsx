import { useEffect, useState } from 'react'
import { Eye, Download, FolderOpen } from 'lucide-react'
import { listMyUploads } from '../../utils/interactionApi'

const TABS = [
  { id: 'PENDING', label: 'Chờ duyệt' },
  { id: 'APPROVED', label: 'Đã duyệt' },
  { id: 'REJECTED', label: 'Bị từ chối' }
]

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN')
}

export default function MyDocuments({ currentUser, onSelectDoc, onOpenUpload, refreshSignal = 0 }) {
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [documents, setDocuments] = useState([])
  const [counts, setCounts] = useState({ PENDING: 0, APPROVED: 0, REJECTED: 0 })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      Promise.all(TABS.map(({ id }) => listMyUploads({ status: id, page: 1, limit: 1 }))),
      listMyUploads({ status: statusFilter, page, limit: 10 })
    ])
      .then(([countsResult, pageResult]) => {
        if (cancelled) return
        const countMap = Object.fromEntries(TABS.map(({ id }, index) => [id, countsResult[index].pagination.totalItems]))
        setCounts(countMap)
        setDocuments(pageResult.items)
        setTotalPages(pageResult.pagination.totalPages)
        setError('')
      })
      .catch((requestError) => {
        if (cancelled) return
        setError(requestError.message)
        setDocuments([])
        setTotalPages(1)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [statusFilter, page, currentUser?.id, reloadKey, refreshSignal])

  const filtered = documents.filter((doc) => doc.status === statusFilter)
  const tabStyle = (active) => ({
    border: 'none', borderBottom: active ? '2px solid var(--primary-base)' : '2px solid transparent',
    background: 'transparent', padding: '9px 13px', color: active ? 'var(--primary-base)' : 'var(--text-secondary)',
    fontWeight: 700, cursor: 'pointer', display: 'inline-flex', gap: '7px', alignItems: 'center'
  })

  return (
    <section>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Tài liệu của tôi</h1>
        </div>
        <button type="button" className="btn-solid-primary" onClick={onOpenUpload}>
          Đóng góp tài liệu
        </button>
      </header>

      <div role="tablist" aria-label="Lọc trạng thái tài liệu" style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border-subtle)', marginBottom: 16 }}>
        {TABS.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={statusFilter === tab.id} style={tabStyle(statusFilter === tab.id)} onClick={() => { setStatusFilter(tab.id); setPage(1) }}>
            {tab.label}<span className="status-badge slate">{counts[tab.id]}</span>
          </button>
        ))}
      </div>

      {error && <div role="alert" className="empty-state-box" style={{ marginBottom: 12 }}>Không tải được tài liệu: {error} <button type="button" className="btn-ghost" onClick={() => setReloadKey((k) => k + 1)}>Thử lại</button></div>}
      {loading ? (
        <div className="empty-state-box" aria-live="polite">Đang tải danh sách…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state-box"><FolderOpen size={36} /><h3>Chưa có tài liệu ở trạng thái này</h3><p>Trạng thái và phản hồi sẽ được cập nhật sau khi quản trị viên kiểm duyệt.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((doc) => {
            const badge = doc.status === 'APPROVED' ? 'green' : doc.status === 'REJECTED' || doc.status === 'HIDDEN' ? 'red' : 'amber'
            const fileSize = doc.fileSizeBytes ? `${(doc.fileSizeBytes / 1048576).toFixed(2)} MB` : '—'
            return (
              <article key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', padding: 16, border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 240 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</h3>
                      <span className={`status-badge ${badge}`}>{doc.status === 'APPROVED' ? 'Đã duyệt' : doc.status === 'REJECTED' ? 'Bị từ chối' : doc.status === 'HIDDEN' ? 'Đã ẩn' : 'Chờ duyệt'}</span>
                    </div>
                    <p style={{ margin: '6px 0', fontSize: 12, color: 'var(--text-secondary)' }}>{doc.courseName || doc.courseCode} • {doc.pageCount} trang • {fileSize} • Tải lên {formatDate(doc.createdAt)}</p>
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {doc.status === 'PENDING' ? (doc.reviewNote || 'Đang chờ quản trị viên kiểm duyệt.') : doc.status === 'REJECTED' ? `Lý do từ chối: ${doc.rejectReason || doc.reviewNote || 'Chưa có ghi chú.'}` : doc.reviewNote || `Được duyệt ${formatDate(doc.reviewedAt)}.`}
                    </p>
                    {doc.status === 'APPROVED' && <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}><Eye size={12} /> {doc.viewCount} lượt xem · <Download size={12} /> {doc.downloadCount} lượt tải</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {doc.status === 'APPROVED' && <button type="button" className="btn-ghost" onClick={() => onSelectDoc?.(doc)}>Xem tài liệu</button>}
                  {doc.status === 'REJECTED' && <button type="button" className="btn-solid-primary" onClick={onOpenUpload}>Tải lại bản mới</button>}
                </div>
              </article>
            )
          })}
        </div>
      )}
      {!loading && totalPages > 1 && (
        <nav aria-label="Phân trang tài liệu của tôi" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button type="button" className="btn-ghost" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Trang trước</button>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Trang {page} / {totalPages}</span>
          <button type="button" className="btn-ghost" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Trang sau</button>
        </nav>
      )}
    </section>
  )
}
