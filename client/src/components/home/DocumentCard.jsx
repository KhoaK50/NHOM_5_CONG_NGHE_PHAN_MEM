import { Download, Star, Bookmark, ArrowUpRight } from 'lucide-react'

export default function DocumentCard({
  doc,
  isBookmarked = false,
  viewMode = 'grid',
  onSelectDoc,
  onToggleBookmark
}) {
  const rawFormat = (
    doc.format ||
    (doc.fileName?.endsWith('.docx')
      ? 'docx'
      : doc.fileName?.endsWith('.pptx')
        ? 'pptx'
        : 'pdf')
  ).toLowerCase()

  const formatMeta = {
    pdf: { label: 'PDF', unit: 'trang' },
    docx: { label: 'DOCX', unit: 'trang' },
    pptx: { label: 'PPTX', unit: 'slide' }
  }[rawFormat] || { label: 'PDF', unit: 'trang' }

  const shortSemester = doc.semester
    ? doc.semester.replace('Học kỳ ', 'HK')
    : 'HK'

  const shortDocType =
    doc.docType === 'KHBD Công văn 5512' ? 'KHBD 5512' : doc.docType

  // Chế độ Danh sách ngang (List View) tối giản, thoáng mắt
  if (viewMode === 'list') {
    return (
      <article
        className="vec-folio-list-row"
        onClick={() => onSelectDoc(doc)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSelectDoc(doc)
        }}
      >
        <div className="vec-list-code-col">
          <span className="vec-folio-code-pill">{doc.courseCode}</span>
          <span className="vec-list-sem">{shortSemester}</span>
        </div>

        <div className="vec-list-main">
          <h3 className="vec-list-title">{doc.title}</h3>
          <span className="vec-list-course">{doc.courseName}</span>
        </div>

        <span className="vec-list-type-badge saas-list-hide-tablet">
          {shortDocType}
        </span>

        <span className="vec-list-spec saas-list-hide-mobile">
          {formatMeta.label} · {doc.pageCount} {formatMeta.unit}
        </span>

        <div className="vec-list-metrics saas-list-hide-tablet">
          <span className="vec-folio-stat">
            <Star size={12} className="vec-star-icon" />
            <span>{doc.ratingAvg > 0 ? doc.ratingAvg.toFixed(1) : 'Mới'}</span>
          </span>
          <span className="vec-folio-stat">
            <Download size={12} />
            <span>{doc.downloadCount}</span>
          </span>
        </div>

        <div
          className="saas-list-actions"
          onClick={(e) => e.stopPropagation()}
        >
          {onToggleBookmark && (
            <button
              type="button"
              className={`saas-bookmark-btn ${isBookmarked ? 'saved' : ''}`}
              onClick={() => onToggleBookmark(doc.id)}
              title={
                isBookmarked
                  ? 'Bỏ lưu khỏi Tủ cá nhân'
                  : 'Lưu vào Tủ tài liệu cá nhân'
              }
              aria-label="Lưu vào tủ tài liệu cá nhân"
            >
              <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          )}
          <button
            type="button"
            className="saas-open-btn"
            onClick={() => onSelectDoc(doc)}
            title="Mở xem chi tiết học liệu"
            aria-label={`Đọc tài liệu ${doc.title}`}
          >
            <ArrowUpRight size={14} />
          </button>
        </div>
      </article>
    )
  }

  // Chế độ Lưới (Editorial Folio Card): Trực quan hóa tờ A4 / Slide ở phần đầu + Thông tin cô đọng tuyệt đối
  return (
    <article
      className="vec-folio-card"
      onClick={() => onSelectDoc(doc)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelectDoc(doc)
      }}
    >
      {/* 1. KHU VỰC THỊ GIÁC: Tờ Bản thảo A4 / Slide Thu nhỏ (Miniature Studio Folio Stage) */}
      <div className={`vec-folio-stage format-${rawFormat}`}>
        <div className="vec-folio-stage-top">
          <span className="vec-folio-course-pill">
            <strong>{doc.courseCode}</strong>
            <span className="vec-pill-dot">·</span>
            <span>{shortSemester}</span>
          </span>

          {onToggleBookmark && (
            <button
              type="button"
              className={`vec-folio-bookmark ${isBookmarked ? 'saved' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                onToggleBookmark(doc.id)
              }}
              title={
                isBookmarked
                  ? 'Bỏ lưu khỏi Tủ cá nhân'
                  : 'Lưu vào Tủ tài liệu cá nhân'
              }
              aria-label="Lưu vào tủ tài liệu cá nhân"
            >
              <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {/* Mô hình trang giấy A4 / Slide nổi 3D nhẹ từ đáy khung preview */}
        {rawFormat === 'pptx' ? (
          <div className="vec-mini-slide-deck" aria-hidden="true">
            <div className="vec-mini-slide-back" />
            <div className="vec-mini-slide-front">
              <div className="vec-mini-slide-bar">
                <span className="vec-mini-format-tag pptx">PPTX</span>
                <span className="vec-mini-line-short" />
              </div>
              <div className="vec-mini-slide-cols">
                <div className="vec-mini-slide-box" />
                <div className="vec-mini-slide-lines">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="vec-mini-a4-sheet" aria-hidden="true">
            <div className="vec-mini-a4-head">
              <span className={`vec-mini-format-tag ${rawFormat}`}>
                {formatMeta.label}
              </span>
              <span className="vec-mini-a4-code">{doc.courseCode}</span>
            </div>
            <div className="vec-mini-a4-lines">
              <span className="w-85" />
              <span className="w-100" />
              <span className="w-70" />
            </div>
          </div>
        )}

        <span className="vec-folio-hover-cta" aria-hidden="true">
          <span>Xem chi tiết</span>
          <ArrowUpRight size={12} />
        </span>
      </div>

      {/* 2. THÂN THẺ CÔ ĐỌNG: Chỉ giữ Tên môn, Loại tài liệu và Tiêu đề học liệu (Không nhồi đoạn văn mô tả dài) */}
      <div className="vec-folio-body">
        <div className="vec-folio-meta-row">
          <span className="vec-folio-course-name" title={doc.courseName}>
            {doc.courseName}
          </span>
          <span className="vec-folio-type-pill">{shortDocType}</span>
        </div>

        <h3 className="vec-folio-title" title={doc.title}>
          {doc.title}
        </h3>

        <footer className="vec-folio-footer">
          <div className="vec-folio-stats">
            <span className="vec-folio-stat" title="Điểm đánh giá">
              <Star size={12} className="vec-star-icon" />
              <strong>
                {doc.ratingAvg > 0 ? doc.ratingAvg.toFixed(1) : 'Mới'}
              </strong>
            </span>
            <span className="vec-stat-sep">·</span>
            <span className="vec-folio-stat" title="Lượt tải về">
              <Download size={12} />
              <span>{doc.downloadCount} lượt tải</span>
            </span>
          </div>

          <span className="vec-folio-spec">
            {formatMeta.label} · {doc.pageCount} {formatMeta.unit}
          </span>
        </footer>
      </div>
    </article>
  )
}
