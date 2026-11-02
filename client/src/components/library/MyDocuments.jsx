import { useState } from 'react'
import {
  CheckCircle2,
  Clock,
  XCircle,
  EyeOff,
  Eye,
  Download,
  Upload,
  FolderOpen,
  Hash,
  FileText,
  RotateCcw
} from 'lucide-react'

// UC11 - Quản lý Tài liệu của tôi theo các tab trạng thái kiểm duyệt (Đã kết nối dữ liệu hệ thống)
const TABS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PENDING', label: 'Chờ duyệt' },
  { id: 'APPROVED', label: 'Đã duyệt' },
  { id: 'REJECTED', label: 'Bị từ chối' }
]

export default function MyDocuments({
  documents = [],
  currentUser,
  onSelectDoc,
  onOpenUpload
}) {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [withdrawnIds, setWithdrawnIds] = useState([])
  const [noticeText, setNoticeText] = useState('')

  const myDocs = documents.filter((doc) => {
    if (doc.status === 'DELETED' || withdrawnIds.includes(doc.id)) return false
    if (!currentUser) return true
    return (
      doc.uploaderId === currentUser.id ||
      (doc.uploaderName &&
        currentUser.fullName &&
        doc.uploaderName.includes(currentUser.fullName))
    )
  })

  const filtered = myDocs.filter((doc) => {
    if (statusFilter === 'ALL') return true
    return doc.status === statusFilter
  })

  const countByStatus = (st) =>
    st === 'ALL' ? myDocs.length : myDocs.filter((d) => d.status === st).length

  const handleWithdrawPending = (doc) => {
    setWithdrawnIds((prev) => [...prev, doc.id])
    setNoticeText(`Đã thu hồi yêu cầu kiểm duyệt đối với tài liệu "${doc.title}".`)
    setTimeout(() => setNoticeText(''), 4000)
  }

  return (
    <div>
      {/* Header */}
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
            Theo dõi trạng thái thẩm định 8 tiêu chí học thuật của các tài liệu bạn đã tải lên ({currentUser?.fullName || 'Thành viên 5Share'}).
          </p>
        </div>

        <button
          type="button"
          className="btn-solid-primary"
          onClick={onOpenUpload}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Upload size={15} />
          <span>+ Tải tài liệu lên</span>
        </button>
      </div>

      {noticeText && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--amber-1)',
            border: '1px solid var(--amber-3)',
            color: 'var(--amber-11)',
            fontSize: '13px',
            fontWeight: 600
          }}
        >
          {noticeText}
        </div>
      )}

      {/* Thanh Tab trạng thái kèm bộ đếm */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {TABS.map((tab) => {
          const active = statusFilter === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={active ? 'btn-solid-primary' : 'btn-ghost'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  padding: '1px 7px',
                  borderRadius: '999px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  backgroundColor: active ? 'rgba(255,255,255,0.22)' : 'var(--bg-muted)',
                  color: active ? '#ffffff' : 'var(--text-secondary)'
                }}
              >
                {countByStatus(tab.id)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Danh sách tài liệu */}
      {filtered.length === 0 ? (
        <div className="empty-state-box">
          <FolderOpen size={38} style={{ color: 'var(--text-tertiary)', marginBottom: '10px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700 }}>
            Chưa có tài liệu nào ở trạng thái này
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
          {filtered.map((doc) => {
            const shortHash = doc.fileHash
              ? `${doc.fileHash.slice(0, 8)}…${doc.fileHash.slice(-6)}`
              : 'a3f9c1…7be2'
            const pageCount = doc.pageCount || doc.pages || 24

            return (
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
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
                  {/* Nhãn định dạng tệp */}
                  <div
                    style={{
                      width: '46px',
                      height: '54px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--red-1, #fff0f0)',
                      border: '1px solid var(--red-3, #ffd1d1)',
                      color: 'var(--red-9, #e5484d)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                      flexShrink: 0,
                      gap: '2px'
                    }}
                  >
                    <FileText size={15} />
                    <span>{(doc.format || 'PDF').toUpperCase()}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
                      {doc.status === 'APPROVED' && (
                        <span className="status-badge green">
                          <CheckCircle2 size={13} /> Đã duyệt (+20 điểm)
                        </span>
                      )}
                      {doc.status === 'PENDING' && (
                        <span className="status-badge amber">
                          <Clock size={13} /> Chờ duyệt (8 tiêu chí)
                        </span>
                      )}
                      {doc.status === 'REJECTED' && (
                        <span className="status-badge red">
                          <XCircle size={13} /> Bị từ chối
                        </span>
                      )}
                      {doc.status === 'HIDDEN' && (
                        <span className="status-badge red">
                          <EyeOff size={13} /> Đã tạm ẩn
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

                    <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                      <span>{doc.courseName || doc.courseCode}</span>
                      <span>• {pageCount} trang</span>
                      <span>• {doc.fileSizeMb} MB</span>
                      <span>• Tải lên: {doc.createdAt}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={13} /> {doc.viewCount || 0} lượt xem
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Download size={13} /> {doc.downloadCount || 0} lượt tải
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: '5px',
                        fontSize: '11.5px',
                        color: 'var(--text-tertiary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Hash size={11} />
                      <span>SHA-256:</span>
                      <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {shortHash}
                      </code>
                    </div>

                    {doc.status === 'PENDING' && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '9px 13px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--amber-1)',
                          color: 'var(--amber-11)',
                          fontSize: '12.5px'
                        }}
                      >
                        <strong>Phản hồi hệ thống:</strong> Tài liệu đã vượt qua bước đối chiếu chống trùng SHA-256 và đang chờ Quản trị viên thẩm định 8 tiêu chí học thuật.
                      </div>
                    )}

                    {doc.status === 'APPROVED' && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '9px 13px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--green-1)',
                          color: 'var(--green-11)',
                          fontSize: '12.5px'
                        }}
                      >
                        <strong>Phản hồi từ Quản trị viên:</strong> Tài liệu đạt đủ 8/8 tiêu chí kiểm duyệt học thuật, nội dung rõ ràng và đã được phát hành công khai.
                      </div>
                    )}

                    {doc.status === 'REJECTED' && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '9px 13px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--red-1)',
                          color: 'var(--red-6)',
                          fontSize: '12.5px',
                          fontWeight: 600
                        }}
                      >
                        Lý do từ chối: &ldquo;{doc.rejectReason || 'Tài liệu chưa đạt đủ 8 tiêu chí học thuật Khoa CNTT.'}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {/* Cột nút thao tác theo từng trạng thái */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => onSelectDoc && onSelectDoc(doc)}
                  >
                    Xem chi tiết
                  </button>

                  {doc.status === 'PENDING' && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => handleWithdrawPending(doc)}
                      style={{
                        color: 'var(--amber-11)',
                        borderColor: 'var(--amber-4)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <RotateCcw size={13} />
                      <span>Thu hồi</span>
                    </button>
                  )}

                  {doc.status === 'REJECTED' && (
                    <button
                      type="button"
                      className="btn-solid-primary"
                      onClick={onOpenUpload}
                    >
                      Tải lại bản mới
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
