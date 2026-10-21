import { RotateCcw } from 'lucide-react'
import {
  KNOWLEDGE_BLOCKS,
  DOCUMENT_TYPES,
  SEMESTERS
} from '../../data/mockData'

export default function FilterSidebar({
  courses = [],
  documents = [],
  selectedBlock,
  selectedSemester,
  selectedCourseCode,
  selectedDocType,
  onChangeBlock,
  onChangeCourseCode,
  onChangeDocType,
  onResetFilters
}) {
  const activeCourses = courses.filter((c) => c.isActive)
  const approvedDocs = documents.filter((d) => d.status === 'APPROVED')

  const countByBlock = (block) => {
    if (block === KNOWLEDGE_BLOCKS[0]) return approvedDocs.length
    return approvedDocs.filter((d) => d.knowledgeBlock === block).length
  }

  const countByCourse = (code) =>
    approvedDocs.filter((d) => d.courseCode === code).length

  const countByDocType = (type) => {
    if (type === DOCUMENT_TYPES[0]) return approvedDocs.length
    return approvedDocs.filter((d) => d.docType === type).length
  }

  // Lọc danh sách Môn học (Cấp 2) theo Khối kiến thức (Cấp 1) và Học kỳ đang chọn
  const visibleCourses = activeCourses
    .filter((crs) => {
      if (selectedBlock !== KNOWLEDGE_BLOCKS[0] && crs.knowledgeBlock !== selectedBlock) {
        return false
      }
      if (selectedSemester !== SEMESTERS[0] && crs.semester !== selectedSemester) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      const countDiff = countByCourse(b.code) - countByCourse(a.code)
      if (countDiff !== 0) return countDiff
      return a.code.localeCompare(b.code)
    })

  return (
    <aside className="saas-sidebar" aria-label="Danh mục học thuật 2 cấp Sư phạm Tin học">
      <header className="saas-sidebar-header">
        <div className="saas-sidebar-brand">
          <h2 className="saas-sidebar-title">Danh mục Học thuật</h2>
          <p className="saas-sidebar-subtitle">CTĐT Sư phạm Tin học • HCMUE</p>
        </div>
        <button
          type="button"
          className="saas-reset-btn"
          onClick={onResetFilters}
          title="Đặt lại toàn bộ bộ lọc"
        >
          <RotateCcw size={11} />
          <span>Mặc định</span>
        </button>
      </header>

      {/* CẤP 1 (FR-03): KHỐI KIẾN THỨC */}
      <nav className="saas-nav-section" aria-label="Cấp 1: Khối kiến thức">
        <h3 className="saas-nav-heading">1. Khối kiến thức (Cấp 1)</h3>
        {KNOWLEDGE_BLOCKS.map((block) => (
          <button
            key={block}
            type="button"
            className={`saas-nav-item ${selectedBlock === block ? 'active' : ''}`}
            onClick={() => {
              onChangeBlock(block)
              onChangeCourseCode('ALL')
            }}
          >
            <span className="saas-nav-label">{block}</span>
            <span className="saas-nav-count">{countByBlock(block)}</span>
          </button>
        ))}
      </nav>

      {/* CẤP 2 (FR-03 & UC05 1a): MÔN HỌC SƯ PHẠM TIN HỌC */}
      <nav className="saas-nav-section" aria-label="Cấp 2: Môn học Sư phạm Tin học">
        <h3 className="saas-nav-heading">
          2. Môn học SPTH ({visibleCourses.length} học phần)
        </h3>
        <div className="saas-course-list">
          <button
            type="button"
            className={`saas-nav-item ${selectedCourseCode === 'ALL' ? 'active' : ''}`}
            onClick={() => onChangeCourseCode('ALL')}
          >
            <span className="saas-nav-label">Tất cả môn học</span>
            <span className="saas-nav-count">
              {selectedBlock === KNOWLEDGE_BLOCKS[0]
                ? approvedDocs.length
                : countByBlock(selectedBlock)}
            </span>
          </button>

          {visibleCourses.map((crs) => {
            const crsCount = countByCourse(crs.code)
            const isSelected = selectedCourseCode === crs.code
            return (
              <button
                key={crs.id}
                type="button"
                className={`saas-course-node ${isSelected ? 'active' : ''}`}
                onClick={() =>
                  onChangeCourseCode(isSelected ? 'ALL' : crs.code)
                }
                title={`${crs.code} – ${crs.name} (${crs.semester}, ${crs.credits} tín chỉ)`}
              >
                <span className="saas-course-node-code">{crs.code}</span>
                <span className="saas-course-node-name">{crs.name}</span>
                <span className="saas-nav-count">{crsCount}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* PHÂN LOẠI THEO LOẠI TÀI LIỆU (FR-03 & FR-04) */}
      <nav className="saas-nav-section" aria-label="Phân loại theo loại tài liệu">
        <h3 className="saas-nav-heading">3. Loại tài liệu</h3>
        {DOCUMENT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`saas-nav-item ${selectedDocType === type ? 'active' : ''}`}
            onClick={() => onChangeDocType(type)}
          >
            <span className="saas-nav-label">{type}</span>
            <span className="saas-nav-count">{countByDocType(type)}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
