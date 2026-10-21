import { Bookmark, Compass } from 'lucide-react'
import DocumentCard from '../home/DocumentCard'

export default function SavedBookmarks({
  documents = [],
  bookmarkedIds = [],
  onSelectDoc,
  onToggleBookmark,
  onNavigateDiscovery
}) {
  const savedDocs = documents.filter(
    (doc) => bookmarkedIds.includes(doc.id) && doc.status === 'APPROVED'
  )

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
            Tủ tài liệu cá nhân đã lưu
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Quản lý các Kế hoạch bài dạy Công văn 5512, Đề thi và Slide chuyên đề đã đánh dấu để truy cập nhanh.
          </p>
        </div>

        <span className="status-badge blue">
          <Bookmark size={13} /> {savedDocs.length} học liệu đã lưu
        </span>
      </div>

      {savedDocs.length === 0 ? (
        <div className="empty-state-box">
          <Bookmark size={38} style={{ color: 'var(--text-tertiary)', marginBottom: '10px' }} />
          <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700 }}>
            Tủ tài liệu cá nhân của bạn đang trống
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Nhấn vào biểu tượng Đánh dấu trên bất kỳ thẻ học liệu nào để lưu vào tủ cá nhân.
          </p>
          {onNavigateDiscovery && (
            <button
              type="button"
              className="btn-solid-primary"
              onClick={onNavigateDiscovery}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Compass size={15} />
              <span>Khám phá kho học liệu ngay</span>
            </button>
          )}
        </div>
      ) : (
        <div className="document-cards-grid">
          {savedDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              isBookmarked={true}
              onSelectDoc={onSelectDoc}
              onToggleBookmark={onToggleBookmark}
              viewMode="grid"
            />
          ))}
        </div>
      )}
    </div>
  )
}
