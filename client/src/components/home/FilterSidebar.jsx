import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import {
  KNOWLEDGE_BLOCKS,
  SEMESTERS,
  DOCUMENT_TYPES
} from '../../data/curriculum'

import CustomSelect from '../common/CustomSelect'

export { CustomSelect }

/**
 * Dropdown Môn học: có ô tìm kiếm nhanh, phân tách mã môn và tên môn rõ ràng
 */
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

  const triggerLabel = selected
    ? `${selected.code} – ${selected.name}`
    : includeAll
      ? 'Tất cả môn học'
      : 'Chọn môn học'

  return (
    <div className="course-filter" ref={wrapRef}>
      <button
        id={id}
        type="button"
        className={`filter-select course-filter-trigger ${open ? 'is-open' : ''}`}
        aria-label="Môn học"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((val) => !val)}
      >
        <span title={triggerLabel}>{triggerLabel}</span>
        <ChevronDown size={15} aria-hidden="true" className={`dropdown-chevron ${open ? 'rotated' : ''}`} />
      </button>

      {open && (
        <div className="course-filter-popover">
          <label className="course-filter-search">
            <Search size={15} aria-hidden="true" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm mã hoặc tên môn"
              aria-label="Tìm môn học"
            />
          </label>
          <div role="listbox" aria-label="Chọn môn học" className="course-filter-options">
            {includeAll && !query && (
              <button
                type="button"
                role="option"
                aria-selected={value === 'ALL'}
                className={value === 'ALL' ? 'is-selected' : ''}
                onClick={() => select('ALL')}
              >
                <span>Tất cả môn học</span>
              </button>
            )}
            {filtered.map((course) => {
              const isSelected = value === course.code
              return (
                <button
                  key={course.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={isSelected ? 'is-selected' : ''}
                  onClick={() => select(course.code)}
                  title={`${course.code} – ${course.name}`}
                >
                  <strong>{course.code}</strong>
                  <span>{course.name}</span>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="course-filter-empty">Không tìm thấy môn học phù hợp.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const FORMAT_OPTIONS = [
  { value: 'ALL', label: 'Tất cả định dạng' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word' },
  { value: 'pptx', label: 'PowerPoint' }
]

const SORT_OPTIONS = [
  { value: 'popular', label: 'Tải nhiều nhất' },
  { value: 'rating', label: 'Đánh giá cao nhất' },
  { value: 'newest', label: 'Mới nhất' }
]

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
      <CustomSelect
        id="filter-block-select"
        label="Khối kiến thức"
        value={selectedBlock}
        options={KNOWLEDGE_BLOCKS}
        onChange={onChangeBlock}
      />

      <CourseFilter
        id="filter-course-select"
        courses={visibleCourses}
        value={selectedCourseCode}
        onChange={onChangeCourseCode}
      />

      <CustomSelect
        id="filter-semester-select"
        label="Học kỳ"
        value={selectedSemester}
        options={SEMESTERS}
        onChange={onChangeSemester}
      />

      <CustomSelect
        id="filter-doctype-select"
        label="Loại học liệu"
        value={selectedDocType}
        options={DOCUMENT_TYPES}
        onChange={onChangeDocType}
      />

      <CustomSelect
        id="filter-format-select"
        label="Định dạng"
        value={selectedFormat}
        options={FORMAT_OPTIONS}
        onChange={onChangeFormat}
      />

      <CustomSelect
        id="filter-sort-select"
        label="Sắp xếp"
        value={sortBy}
        options={SORT_OPTIONS}
        onChange={onChangeSort}
      />
    </div>
  )
}
