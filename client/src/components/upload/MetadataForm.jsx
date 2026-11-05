import { AlertCircle } from 'lucide-react'
import { DOCUMENT_TYPES } from '../../data/curriculum'
import { CourseFilter } from '../home/FilterSidebar'
import RequiredMark from '../common/RequiredMark'

export function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} className="vec-field-error">
      <AlertCircle size={14} aria-hidden="true" />
      <span>{message}</span>
    </p>
  )
}

export default function MetadataForm({
  courses = [],
  title = '',
  courseCode = '',
  docType = 'KHBD Công văn 5512',
  description = '',
  errors = {},
  disabled = false,
  onChangeTitle,
  onChangeCourseCode,
  onChangeDocType,
  onChangeDescription
}) {
  const activeCourses = courses.filter((c) => c.isActive)
  const validDocTypes = DOCUMENT_TYPES.filter((t) => t !== 'Tất cả loại học liệu')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. Tiêu đề tài liệu */}
      <div className={`vec-form-field ${errors.title ? 'has-error' : ''}`}>
        <div className="vec-form-label-row">
          <label htmlFor="upload-doc-title" className="vec-form-label">
            Tiêu đề
            <RequiredMark />
          </label>
          <span className="vec-form-hint">
            {title.trim().length} / 10 ký tự tối thiểu
          </span>
        </div>
        <input
          id="upload-doc-title"
          type="text"
          className="vec-form-input"
          value={title}
          disabled={disabled}
          required
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? 'upload-doc-title-error' : undefined}
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="Ví dụ: Kế hoạch bài dạy Tin học 11 - Bài 9: Truy vấn dữ liệu SQL"
        />
        <FieldError id="upload-doc-title-error" message={errors.title} />
      </div>

      {/* 2. Môn học & Loại tài liệu */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}
      >
        <div className={`vec-form-field ${errors.course ? 'has-error' : ''}`}>
          <div className="vec-form-label-row">
            <label htmlFor="upload-course-select" className="vec-form-label">
              Môn học
              <RequiredMark />
            </label>
          </div>
          <CourseFilter id="upload-course-select" courses={activeCourses} value={courseCode} onChange={onChangeCourseCode} includeAll={false} />
          <FieldError id="upload-course-error" message={errors.course} />
        </div>

        <div className="vec-form-field">
          <div className="vec-form-label-row">
            <label htmlFor="upload-doctype-select" className="vec-form-label">
              Loại tài liệu
              <RequiredMark />
            </label>
          </div>
          <select
            id="upload-doctype-select"
            className="vec-form-select"
            value={docType}
            disabled={disabled}
            required
            onChange={(e) => onChangeDocType(e.target.value)}
          >
            {validDocTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Mô tả tóm tắt nội dung */}
      <div className={`vec-form-field ${errors.description ? 'has-error' : ''}`}>
        <div className="vec-form-label-row">
          <label htmlFor="upload-doc-desc" className="vec-form-label">
            Mô tả
            <RequiredMark />
          </label>
          <span className="vec-form-hint">
            {description.trim().length} / 15 ký tự tối thiểu
          </span>
        </div>
        <textarea
          id="upload-doc-desc"
          rows={3}
          className="vec-form-textarea"
          value={description}
          disabled={disabled}
          required
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? 'upload-doc-desc-error' : undefined}
          onChange={(e) => onChangeDescription(e.target.value)}
          placeholder="Tóm tắt nội dung, ít nhất 15 ký tự"
        />
        <FieldError id="upload-doc-desc-error" message={errors.description} />
      </div>
    </div>
  )
}
