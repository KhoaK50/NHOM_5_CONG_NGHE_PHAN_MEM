import { useState } from 'react'
import { X, BookPlus, AlertTriangle } from 'lucide-react'
import { KNOWLEDGE_BLOCKS, SEMESTERS } from '../../data/mockData'

export default function CourseModal({
  editingCourse = null,
  existingCourses = [],
  onClose,
  onSaveCourse
}) {
  const validBlocks = KNOWLEDGE_BLOCKS.filter((b) => b !== 'Tất cả khối kiến thức')
  const validSemesters = SEMESTERS.filter((s) => s !== 'Tất cả học kỳ')

  const [code, setCode] = useState(editingCourse?.code || '')
  const [name, setName] = useState(editingCourse?.name || '')
  const [credits, setCredits] = useState(editingCourse?.credits || 3)
  const [knowledgeBlock, setKnowledgeBlock] = useState(editingCourse?.knowledgeBlock || validBlocks[0])
  const [semester, setSemester] = useState(editingCourse?.semester || validSemesters[4])
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const cleanCode = code.trim().toUpperCase()
    const cleanName = name.trim()

    if (!cleanCode || !cleanName) {
      setErrorMsg('Vui lòng nhập đầy đủ Mã học phần và Tên học phần.')
      return
    }

    const duplicate = existingCourses.some(
      (c) => c.code.toUpperCase() === cleanCode && c.id !== editingCourse?.id
    )
    if (duplicate) {
      setErrorMsg(`Mã học phần "${cleanCode}" đã tồn tại trong danh mục.`)
      return
    }

    setErrorMsg('')
    onSaveCourse({
      id: editingCourse?.id || `crs-${Date.now()}`,
      code: cleanCode,
      name: cleanName,
      credits: Number(credits) || 3,
      knowledgeBlock,
      semester,
      documentCount: editingCourse?.documentCount || 0,
      isActive: editingCourse ? editingCourse.isActive : true
    })
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Biểu mẫu học phần">
      <div className="modal-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span className="status-badge blue">
            <BookPlus size={13} />
            <span>{editingCourse ? 'Cập nhật học phần' : 'Thêm học phần mới'}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <h3 style={{ margin: '0 0 14px 0', fontSize: '18px', fontWeight: 800 }}>
          {editingCourse ? `Cập nhật Học phần ${editingCourse.code}` : 'Thêm Học phần Đào tạo Mới'}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px' }}>
            <div>
              <label
                htmlFor="course-code-input"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '5px' }}
              >
                Mã học phần:
              </label>
              <input
                id="course-code-input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ví dụ: COMP1044"
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div>
              <label
                htmlFor="course-credits-input"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '5px' }}
              >
                Số tín chỉ:
              </label>
              <input
                id="course-credits-input"
                type="number"
                min={1}
                max={10}
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="course-name-input"
              style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '5px' }}
            >
              Tên học phần theo Chương trình Đào tạo:
            </label>
            <input
              id="course-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Phương pháp dạy học môn Tin học"
              style={{
                width: '100%',
                height: '38px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1.5px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label
                htmlFor="course-block-select"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '5px' }}
              >
                Khối kiến thức:
              </label>
              <select
                id="course-block-select"
                value={knowledgeBlock}
                onChange={(e) => setKnowledgeBlock(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              >
                {validBlocks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="course-sem-select"
                style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '5px' }}
              >
                Học kỳ gợi ý:
              </label>
              <select
                id="course-sem-select"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              >
                {validSemesters.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--red-1)',
                border: '1px solid var(--red-2)',
                color: 'var(--red-6)',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Hủy
            </button>
            <button type="submit" className="btn-solid-primary">
              Lưu học phần
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
