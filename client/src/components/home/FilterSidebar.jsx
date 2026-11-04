import {
  KNOWLEDGE_BLOCKS,
  SEMESTERS,
  DOCUMENT_TYPES
} from '../../data/curriculum'

// Hàng bộ lọc đa tiêu chí của Kho học liệu (FR-03, FR-04)
export default function FilterSidebar({
  courses = [],
  selectedBlock,
  selectedSemester,
  selectedCourseCode,
  selectedDocType,
  selectedFormat,
  sortBy,
  onChangeBlock,
  onChangeSemester,
  onChangeCourseCode,
  onChangeDocType,
  onChangeFormat,
  onChangeSort
}) {
  const visibleCourses = courses
    .filter((crs) => crs.isActive)
    .filter((crs) => selectedBlock === KNOWLEDGE_BLOCKS[0] || crs.knowledgeBlock === selectedBlock)
    .filter((crs) => selectedSemester === SEMESTERS[0] || crs.semester === selectedSemester)
    .sort((a, b) => a.code.localeCompare(b.code))

  return (
    <div className="filter-row" role="group" aria-label="Bộ lọc tài liệu">
      <select
        className="filter-select"
        aria-label="Khối kiến thức"
        value={selectedBlock}
        onChange={(e) => onChangeBlock(e.target.value)}
      >
        {KNOWLEDGE_BLOCKS.map((block) => (
          <option key={block} value={block}>
            {block}
          </option>
        ))}
      </select>

      <select
        className="filter-select"
        aria-label="Môn học"
        value={selectedCourseCode}
        onChange={(e) => onChangeCourseCode(e.target.value)}
      >
        <option value="ALL">Tất cả môn học</option>
        {visibleCourses.map((crs) => (
          <option key={crs.id} value={crs.code}>
            {crs.code} – {crs.name}
          </option>
        ))}
      </select>

      <select
        className="filter-select"
        aria-label="Học kỳ"
        value={selectedSemester}
        onChange={(e) => onChangeSemester(e.target.value)}
      >
        {SEMESTERS.map((sem) => (
          <option key={sem} value={sem}>
            {sem}
          </option>
        ))}
      </select>

      <select
        className="filter-select"
        aria-label="Loại tài liệu"
        value={selectedDocType}
        onChange={(e) => onChangeDocType(e.target.value)}
      >
        {DOCUMENT_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      <select
        className="filter-select"
        aria-label="Định dạng"
        value={selectedFormat}
        onChange={(e) => onChangeFormat(e.target.value)}
      >
        <option value="ALL">Tất cả định dạng</option>
        <option value="pdf">PDF</option>
        <option value="docx">Word</option>
        <option value="pptx">PowerPoint</option>
      </select>

      <select
        className="filter-select"
        aria-label="Sắp xếp"
        value={sortBy}
        onChange={(e) => onChangeSort(e.target.value)}
      >
        <option value="popular">Tải nhiều nhất</option>
        <option value="rating">Đánh giá cao nhất</option>
        <option value="newest">Mới nhất</option>
      </select>
    </div>
  )
}
