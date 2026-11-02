import { useEffect, useState } from 'react'
import { X, BookPlus, AlertTriangle } from 'lucide-react'
import { KNOWLEDGE_BLOCK_LABELS } from '../../utils/documentCourseApi'

const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]
const MAX_SUMMARY_LENGTH = 500

const labelStyle = { display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '5px' }

function inputStyle(hasError) {
  return {
    width: '100%',
    height: '38px',
    padding: '0 10px',
    borderRadius: '8px',
    border: `1.5px solid ${hasError ? 'var(--red-9)' : 'var(--border-subtle)'}`,
    backgroundColor: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    boxSizing: 'border-box'
  }
}

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <span id={id} style={{ display: 'block', marginTop: '4px', fontSize: '11.5px', fontWeight: 500, color: 'var(--red-11)' }}>
      {message}
    </span>
  )
}

export default function CourseModal({ editingCourse = null, submitting = false, serverError = '', serverFields = {}, onClose, onSaveCourse }) {
  const [courseCode, setCourseCode] = useState(editingCourse?.courseCode || '')
  const [courseName, setCourseName] = useState(editingCourse?.courseName || '')
  const [credits, setCredits] = useState(editingCourse?.credits ?? 3)
  const [knowledgeBlock, setKnowledgeBlock] = useState(editingCourse?.knowledgeBlock || 'CO_SO_NGANH')
  const [semester, setSemester] = useState(editingCourse?.semester ?? 1)
  const [summary, setSummary] = useState(editingCourse?.summary || '')
  const [localFields, setLocalFields] = useState({})

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  const fieldErrors = { ...serverFields, ...localFields }

  const handleSubmit = (e) => {
    e.preventDefault()
    const cleanCode = courseCode.trim().toUpperCase()
    const cleanName = courseName.trim()
    const creditValue = Number(credits)

    const errors = {}
    if (!/^[A-Z0-9]{3,20}$/.test(cleanCode)) errors.courseCode = 'Mã học phần gồm 3–20 ký tự chữ hoặc số, không dấu.'
    if (cleanName.length < 2) errors.courseName = 'Vui lòng nhập tên học phần.'
    if (!Number.isInteger(creditValue) || creditValue < 1 || creditValue > 10) errors.credits = 'Số tín chỉ phải từ 1 đến 10.'
    setLocalFields(errors)
    if (Object.keys(errors).length > 0) return

    onSaveCourse({
      courseCode: cleanCode,
      courseName: cleanName,
      credits: creditValue,
      knowledgeBlock,
      semester: Number(semester),
      summary: summary.trim() || null
    })
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={editingCourse ? 'Cập nhật học phần' : 'Thêm học phần'}>
      <div className="modal-panel" style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span className="status-badge blue">
            <BookPlus size={13} />
            <span>{editingCourse ? 'Cập nhật học phần' : 'Thêm học phần'}</span>
          </span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <h3 style={{ margin: '0 0 14px 0', fontSize: '18px', fontWeight: 800 }}>
          {editingCourse ? `Cập nhật học phần ${editingCourse.courseCode}` : 'Thêm học phần đào tạo'}
        </h3>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '12px' }}>
            <div>
              <label htmlFor="course-code-input" style={labelStyle}>Mã học phần</label>
              <input
                id="course-code-input"
                type="text"
                autoFocus
                maxLength={20}
                value={courseCode}
                aria-invalid={Boolean(fieldErrors.courseCode)}
                aria-describedby="course-code-error"
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="Ví dụ: COMP1044"
                style={inputStyle(fieldErrors.courseCode)}
              />
              <FieldError id="course-code-error" message={fieldErrors.courseCode} />
            </div>
            <div>
              <label htmlFor="course-credits-input" style={labelStyle}>Số tín chỉ</label>
              <input
                id="course-credits-input"
                type="number"
                min={1}
                max={10}
                value={credits}
                aria-invalid={Boolean(fieldErrors.credits)}
                aria-describedby="course-credits-error"
                onChange={(e) => setCredits(e.target.value)}
                style={inputStyle(fieldErrors.credits)}
              />
              <FieldError id="course-credits-error" message={fieldErrors.credits} />
            </div>
          </div>

          <div>
            <label htmlFor="course-name-input" style={labelStyle}>Tên học phần theo chương trình đào tạo</label>
            <input
              id="course-name-input"
              type="text"
              maxLength={150}
              value={courseName}
              aria-invalid={Boolean(fieldErrors.courseName)}
              aria-describedby="course-name-error"
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="Ví dụ: Phương pháp dạy học môn Tin học"
              style={inputStyle(fieldErrors.courseName)}
            />
            <FieldError id="course-name-error" message={fieldErrors.courseName} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label htmlFor="course-block-select" style={labelStyle}>Khối kiến thức</label>
              <select id="course-block-select" value={knowledgeBlock} onChange={(e) => setKnowledgeBlock(e.target.value)} style={inputStyle(false)}>
                {Object.entries(KNOWLEDGE_BLOCK_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="course-sem-select" style={labelStyle}>Học kỳ gợi ý</label>
              <select id="course-sem-select" value={semester} onChange={(e) => setSemester(e.target.value)} style={inputStyle(false)}>
                {SEMESTER_OPTIONS.map((value) => (
                  <option key={value} value={value}>Học kỳ {value}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="course-summary-input" style={labelStyle}>Mô tả ngắn (không bắt buộc)</label>
            <textarea
              id="course-summary-input"
              rows={2}
              maxLength={MAX_SUMMARY_LENGTH}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              style={{ ...inputStyle(false), height: 'auto', padding: '9px 10px', resize: 'vertical', lineHeight: 1.45 }}
            />
            <span style={{ display: 'block', marginTop: '4px', fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
              {summary.length} / {MAX_SUMMARY_LENGTH} ký tự
            </span>
          </div>

          {serverError && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--red-3)',
                border: '1px solid var(--red-6)',
                color: 'var(--red-12)',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={15} style={{ color: 'var(--red-11)', flexShrink: 0 }} />
              <span>{serverError}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>Hủy</button>
            <button type="submit" className="btn-solid-primary" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu học phần'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
