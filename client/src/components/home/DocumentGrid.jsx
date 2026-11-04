import { FileSearch, BookOpen } from 'lucide-react'
import DocumentCard from './DocumentCard'

export default function DocumentGrid({
  documents = [],
  totalSystemDocs = 0,
  hasActiveFilters = false,
  bookmarkedIds = [],
  onSelectDoc,
  onToggleBookmark,
  onResetFilters,
  onOpenUpload
}) {
  if (documents.length === 0) {
    if (totalSystemDocs === 0 && !hasActiveFilters) {
      return (
        <section className="saas-empty-state" aria-label="Kho học liệu chưa có dữ liệu">
          <BookOpen size={32} className="saas-empty-icon" />
          <h3 className="saas-empty-title">Kho học liệu chưa có tài liệu nào</h3>
          {onOpenUpload && (
            <>
              <p className="saas-empty-desc">Hãy là người đầu tiên đóng góp tài liệu.</p>
              <button type="button" className="btn-solid-primary" onClick={onOpenUpload}>
                Đóng góp tài liệu
              </button>
            </>
          )}
        </section>
      )
    }

    return (
      <section className="saas-empty-state" aria-label="Không tìm thấy tài liệu">
        <FileSearch size={32} className="saas-empty-icon" />
        <h3 className="saas-empty-title">Không tìm thấy tài liệu phù hợp</h3>
        <p className="saas-empty-desc">Thử đổi từ khóa hoặc bộ lọc.</p>
        {onResetFilters && (
          <button type="button" className="btn-ghost" onClick={onResetFilters}>
            Xóa bộ lọc
          </button>
        )}
      </section>
    )
  }

  return (
    <section className="saas-cards-grid" aria-label="Danh sách tài liệu">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          doc={doc}
          isBookmarked={bookmarkedIds.includes(doc.id)}
          onSelectDoc={onSelectDoc}
          onToggleBookmark={onToggleBookmark}
        />
      ))}
    </section>
  )
}
