import { FileSearch, RotateCcw } from 'lucide-react'
import DocumentCard from './DocumentCard'

export default function DocumentGrid({
  documents = [],
  bookmarkedIds = [],
  viewMode = 'grid',
  pageOffset = 0,
  onSelectDoc,
  onToggleBookmark,
  onResetFilters
}) {
  if (documents.length === 0) {
    return (
      <section className="saas-empty-state" aria-label="Trạng thái không tìm thấy học liệu">
        <FileSearch size={32} className="saas-empty-icon" />
        <h3 className="saas-empty-title">
          Không tìm thấy học liệu phù hợp với tiêu chí đang chọn
        </h3>
        <p className="saas-empty-desc">
          Thử chọn môn học hoặc khối kiến thức khác ở danh mục bên trái, hoặc đặt lại bộ lọc để xem toàn bộ kho học liệu Sư phạm Tin học.
        </p>
        {onResetFilters && (
          <button
            type="button"
            className="saas-upload-action"
            onClick={onResetFilters}
          >
            <RotateCcw size={13} />
            <span>Đặt lại toàn bộ bộ lọc</span>
          </button>
        )}
      </section>
    )
  }

  return (
    <section
      className={viewMode === 'list' ? 'saas-list-table' : 'saas-cards-grid'}
      aria-label="Danh sách học liệu"
    >
      {documents.map((doc, idx) => (
        <DocumentCard
          key={doc.id}
          doc={doc}
          index={pageOffset + idx}
          viewMode={viewMode}
          isBookmarked={bookmarkedIds.includes(doc.id)}
          onSelectDoc={onSelectDoc}
          onToggleBookmark={onToggleBookmark}
        />
      ))}
    </section>
  )
}
