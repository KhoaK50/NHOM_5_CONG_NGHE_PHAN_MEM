import { useState } from 'react'
import { CheckCircle2, Clock, XCircle, EyeOff, Eye, Download, Upload, FolderOpen } from 'lucide-react'

export default function MyDocuments({
  documents = [],
  currentUser,
  onSelectDoc,
  onOpenUpload
}) {
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'APPROVED' | 'PENDING' | 'REJECTED'

  const myDocs = documents.filter((doc) => {
    if (doc.status === 'DELETED') return false
    if (!currentUser) return true
    return (
      doc.uploaderId === currentUser.id ||
      (doc.uploaderName && doc.uploaderName.includes(currentUser.fullName))
    )
  })

  const filtered = myDocs.filter((doc) => {
    if (statusFilter === 'ALL') return true
    return doc.status === statusFilter
  })

  const countByStatus = (st) => myDocs.filter((d) => d.status === st).length

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Tài liệu của tôi – Theo dõi tiến trình kiểm duyệt
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Các tài liệu đang chờ thẩm định hoặc bị từ chối được bảo mật riêng tư, chỉ hiển thị cho chính tác giả ({currentUser?.fullName || 'Phan Triệu Vĩ'}).
          </p>
        </div>

        <button
          type="button"
          className="btn-solid-primary"
          onClick={onOpenUpload}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Upload size={15} />
          <span>Đóng góp học liệu mới</span>
        </button>
      </div>

      {/* Bộ lọc trạng thái kiểm duyệt */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {[
          { id: 'ALL', label: `Tất cả của tôi (${myDocs.length})` },
          { id: 'APPROVED', label: `Đã phê duyệt (${countByStatus('APPROVED')})` },
          { id: 'PENDING', label: `Chờ thẩm định (${countByStatus('PENDING')})` },
          { id: 'REJECTED', label: `Bị từ chối (${countByStatus('REJECTED')})` }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={statusFilter === tab.id ? 'btn-solid-primary' : 'btn-ghost'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state-box">
          <FolderOpen size={38} style={{ color: 'var(--text-tertiary)', marginBottom: '10px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700 }}>
            Bạn chưa có học liệu nào ở trạng thái này
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Hãy chia sẻ Kế hoạch bài dạy Công văn 5512, Đề thi hoặc Slide chuyên đề để nhận +20 điểm thưởng sau khi được duyệt.
          </p>
          <button type="button" className="btn-solid-primary" onClick={onOpenUpload}>
            Đóng góp học liệu ngay
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filtered.map((doc) => (
            <div
              key={doc.id}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border:
                  doc.status === 'REJECTED' || doc.status === 'HIDDEN'
                    ? '1.5px solid var(--red-2)'
                    : doc.status === 'PENDING'
                    ? '1.5px solid var(--amber-2)'
                    : '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ maxWidth: '880px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {doc.status === 'APPROVED' && (
                    <span className="status-badge green">
                      <CheckCircle2 size={13} /> Đã xuất bản công khai (+20 điểm)
                    </span>
                  )}
                  {doc.status === 'PENDING' && (
                    <span className="status-badge amber">
                      <Clock size={13} /> Đang chờ thẩm định 8 tiêu chí học thuật
                    </span>
                  )}
                  {doc.status === 'REJECTED' && (
                    <span className="status-badge red">
                      <XCircle size={13} /> Không đạt tiêu chí kiểm duyệt
                    </span>
                  )}
                  {doc.status === 'HIDDEN' && (
                    <span className="status-badge red">
                      <EyeOff size={13} /> Đã tạm ẩn để rà soát báo cáo vi phạm
                    </span>
                  )}
                  <span className="status-badge blue">{doc.courseCode}</span>
                  <span className="status-badge slate">{doc.docType}</span>
                </div>

                <h3
                  style={{
                    margin: '0 0 6px 0',
                    fontSize: '15.5px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => onSelectDoc && onSelectDoc(doc)}
                >
                  {doc.title}
                </h3>

                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span>Ngày tải lên: {doc.createdAt}</span>
                  <span>Dung lượng: {doc.fileSizeMb} MB</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Eye size={13} /> {doc.viewCount} lượt xem
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Download size={13} /> {doc.downloadCount} lượt tải
                  </span>
                </div>

                {doc.status === 'REJECTED' && doc.rejectReason && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--red-1)',
                      color: 'var(--red-6)',
                      fontSize: '12.5px',
                      fontWeight: 600
                    }}
                  >
                    Lý do từ chối của Quản trị viên: &ldquo;{doc.rejectReason}&rdquo;
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => onSelectDoc && onSelectDoc(doc)}
                >
                  Xem bản đọc thử
                </button>

                {doc.status === 'REJECTED' && (
                  <button
                    type="button"
                    className="btn-solid-primary"
                    onClick={onOpenUpload}
                  >
                    Đóng góp lại bản mới
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
