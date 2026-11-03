import { FileSearch, RotateCcw, BookOpen, Upload } from 'lucide-react'
import DocumentCard from './DocumentCard'

export default function DocumentGrid({
  documents = [],
  totalSystemDocs = 0,
  hasActiveFilters = false,
  bookmarkedIds = [],
  viewMode = 'grid',
  pageOffset = 0,
  onSelectDoc,
  onToggleBookmark,
  onResetFilters,
  onOpenUpload
}) {
  if (documents.length === 0) {
    if (totalSystemDocs === 0 && !hasActiveFilters) {
      return (
        <section className="saas-empty-state" aria-label="Kho học liệu chưa có dữ liệu">
          <BookOpen size={36} className="saas-empty-icon" style={{ color: 'var(--blue-9)' }} />
          <h3 className="saas-empty-title">
            Kho học liệu Sư phạm Tin học chưa có tài liệu nào
          </h3>
          <p className="saas-empty-desc">
            Toàn bộ 52 môn học chuẩn CTĐT Sư phạm Tin học HCMUE đã sẵn sàng. Hãy là người đầu tiên tải lên Kế hoạch bài dạy (Công văn 5512), Đề thi hoặc Bài giảng để nhận 50 điểm đóng góp!
          </p>
          {onOpenUpload && (
            <button
              type="button"
              className="saas-upload-action"
              onClick={onOpenUpload}
              style={{ marginTop: '10px' }}
            >
              <Upload size={14} />
              <span>Đóng góp tài liệu đầu tiên</span>
            </button>
          )}
        </section>
      )
    }

    return (
      <section className="saas-empty-state" aria-label="Trạng thái không tìm thấy học liệu">
        <FileSearch size={32} className="saas-empty-icon" />
        <h3 className="saas-empty-title">
          Không tìm thấy học liệu phù hợp với tiêu chí đang chọn
        </h3>
        <p className="saas-empty-desc">
          Thử chọn môn học hoặc khối kiến thức khác ở sơ đồ cây hoặc danh mục bên trái, hoặc đặt lại bộ lọc để xem toàn bộ kho học liệu Sư phạm Tin học.
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
