import { Bookmark } from 'lucide-react'
import { DOC_TYPE_LABELS } from '../../utils/documentCourseApi'

const FORMAT_META = {
  pdf: { label: 'PDF', unit: 'trang' },
  docx: { label: 'Word', unit: 'trang' },
  pptx: { label: 'PowerPoint', unit: 'slide' }
}

export default function DocumentCard({
  doc,
  isBookmarked = false,
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

  const formatMeta = FORMAT_META[rawFormat] || FORMAT_META.pdf
  const rating = doc.ratingAvg > 0 ? `★ ${doc.ratingAvg.toFixed(1)}` : 'Mới'

  return (
    <article
      className="doc-card"
      onClick={() => onSelectDoc(doc)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelectDoc(doc)
      }}
    >
      <div className="doc-card-top">
        <span className="doc-card-meta">
          {doc.courseCode} · {DOC_TYPE_LABELS[doc.docType] || doc.docType}
        </span>
        {onToggleBookmark && (
          <button
            type="button"
            className={`doc-card-save ${isBookmarked ? 'saved' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleBookmark(doc.id)
            }}
            title={isBookmarked ? 'Bỏ lưu tài liệu' : 'Lưu tài liệu'}
            aria-label={isBookmarked ? `Bỏ lưu ${doc.title}` : `Lưu ${doc.title}`}
            aria-pressed={isBookmarked}
          >
            <Bookmark size={16} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <h3 className="doc-card-title" title={doc.title}>
        {doc.title}
      </h3>
      <p className="doc-card-course">{doc.courseName}</p>
      <p className="doc-card-stats">
        {rating} · {doc.downloadCount || 0} lượt tải · {formatMeta.label}
        {doc.pageCount ? ` ${doc.pageCount} ${formatMeta.unit}` : ''}
      </p>
    </article>
  )
}
