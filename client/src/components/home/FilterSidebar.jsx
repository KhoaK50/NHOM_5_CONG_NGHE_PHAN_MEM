import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import {
  KNOWLEDGE_BLOCKS,
  SEMESTERS,
  DOCUMENT_TYPES
} from '../../data/curriculum'

export function CourseFilter({ courses, value, onChange, id, includeAll = true }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)
  const selected = courses.find((course) => course.code === value)
  const filtered = courses.filter((course) =>
    `${course.code} ${course.name}`.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN'))
  )

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false)
    }
    const closeEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('mousedown', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [open])

  const select = (code) => {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="course-filter" ref={wrapRef}>
      <button id={id} type="button" className="filter-select course-filter-trigger" aria-label="Môn học" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span title={selected ? `${selected.code} – ${selected.name}` : includeAll ? 'Tất cả môn học' : 'Chọn môn học'}>{selected ? `${selected.code} – ${selected.name}` : includeAll ? 'Tất cả môn học' : 'Chọn môn học'}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="course-filter-popover">
          <label className="course-filter-search">
            <Search size={15} aria-hidden="true" />
            <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã hoặc tên môn" aria-label="Tìm môn học" />
          </label>
          <div role="listbox" aria-label="Chọn môn học" className="course-filter-options">
            {includeAll && !query && <button type="button" role="option" aria-selected={value === 'ALL'} onClick={() => select('ALL')}>Tất cả môn học</button>}
            {filtered.map((course) => (
              <button key={course.id} type="button" role="option" aria-selected={value === course.code} onClick={() => select(course.code)} title={`${course.code} – ${course.name}`}>
                <strong>{course.code}</strong><span>{course.name}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="course-filter-empty">Không tìm thấy môn học.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

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

      <CourseFilter courses={visibleCourses} value={selectedCourseCode} onChange={onChangeCourseCode} />

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
