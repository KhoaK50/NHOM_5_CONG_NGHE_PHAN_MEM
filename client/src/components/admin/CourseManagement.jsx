import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Info,
  Lock,
  Plus,
  Power,
  Search,
  Trash2,
  X
} from 'lucide-react'
import CourseModal from './CourseModal'
import {
  KNOWLEDGE_BLOCK_LABELS,
  createCourse,
  deleteCourse,
  listCourses,
  updateCourse
} from '../../utils/documentCourseApi'

const PAGE_SIZE = 10
const SEARCH_DEBOUNCE_MS = 300

const selectStyle = {
  height: '34px',
  padding: '0 10px',
  borderRadius: '8px',
  border: '1px solid var(--border-strong)',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: '12.5px',
  cursor: 'pointer'
}

const iconButtonStyle = { padding: '5px 8px', display: 'inline-flex', alignItems: 'center' }

export default function CourseManagement({ onNotice }) {
  const [courses, setCourses] = useState([])
  const [stats, setStats] = useState({ totalCourses: 0, activeCourses: 0, totalDocuments: 0 })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveFields, setSaveFields] = useState({})

  const [deletingCourse, setDeletingCourse] = useState(null)
  const [blockedCourse, setBlockedCourse] = useState(null)
  const [dialogBusy, setDialogBusy] = useState(false)
  const [dialogError, setDialogError] = useState('')

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    listCourses({
      q: searchQuery,
      semester: semesterFilter,
      knowledgeBlock: blockFilter,
      isActive: statusFilter,
      page,
      limit: PAGE_SIZE
    })
      .then((result) => {
        if (cancelled) return
        setCourses(result.data)
        setTotal(result.pagination.total)
        setStats(result.stats)
        setLoadError('')
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [searchQuery, semesterFilter, blockFilter, statusFilter, page, reloadKey])

  const hasFilter = Boolean(searchInput || semesterFilter || blockFilter || statusFilter)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastRow = Math.min(page * PAGE_SIZE, total)

  const closeModal = () => {
    setModalOpen(false)
    setSaveError('')
    setSaveFields({})
  }

  const handleSaveCourse = async (payload) => {
    setSaving(true)
    setSaveError('')
    setSaveFields({})
    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, payload)
      } else {
        await createCourse(payload)
      }
      closeModal()
      onNotice?.(`Đã lưu học phần "${payload.courseCode} - ${payload.courseName}".`)
      reload()
    } catch (err) {
      if (err.code === 'COURSE_CODE_EXISTS') {
        setSaveFields({ courseCode: err.message })
      } else if (err.code === 'VALIDATION_ERROR' && err.details.fields) {
        setSaveFields(err.details.fields)
      } else {
        setSaveError(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (course) => {
    setDialogError('')
    try {
      await updateCourse(course.id, { isActive: !course.isActive })
      setBlockedCourse(null)
      onNotice?.(
        course.isActive
          ? `Đã tạm ẩn ${course.courseCode}, tài liệu hiện có vẫn được giữ nguyên.`
          : `Đã kích hoạt lại ${course.courseCode}.`
      )
      reload()
    } catch (err) {
      setDialogError(err.message)
      setLoadError(err.message)
    }
  }

  const handleConfirmDelete = async () => {
    setDialogBusy(true)
    setDialogError('')
    try {
      await deleteCourse(deletingCourse.id)
      onNotice?.(`Đã xóa học phần ${deletingCourse.courseCode}.`)
      setDeletingCourse(null)
      reload()
    } catch (err) {
      // Danh sách có thể đã cũ: tài liệu vừa được gắn vào môn sau lần tải trước
      if (err.code === 'COURSE_IN_USE') {
        setBlockedCourse({ ...deletingCourse, documentCount: err.details.documentCount ?? deletingCourse.documentCount })
        setDeletingCourse(null)
        reload()
      } else {
        setDialogError(err.message)
      }
    } finally {
      setDialogBusy(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div style={{ flex: '1 1 420px' }}>
          <h1 className="page-title">Môn học</h1>
          <p className="page-sub">
            {stats.totalCourses} môn · {stats.activeCourses} đang mở · {stats.totalDocuments} tài liệu
          </p>
        </div>
        <button
          type="button"
          className="btn-solid-primary"
          onClick={() => {
            setEditingCourse(null)
            setModalOpen(true)
          }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>Thêm môn học</span>
        </button>
      </div>

      {loadError && (
        <div
          role="alert"
          style={{
            padding: '12px 14px',
            borderRadius: '10px',
            backgroundColor: 'var(--red-3)',
            border: '1px solid var(--red-6)',
            color: 'var(--red-12)',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--red-11)', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{loadError}</span>
          <button type="button" className="btn-ghost" onClick={reload}>Thử lại</button>
        </div>
      )}

      <div
        style={{
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '8px',
            padding: '8px 12px',
            flex: '1 1 280px',
            minWidth: '220px'
          }}
        >
          <Search size={15} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="search"
            aria-label="Tìm học phần"
            maxLength={100}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo mã hoặc tên môn"
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%', color: 'var(--text-primary)' }}
          />
        </div>

        <select
          aria-label="Lọc theo học kỳ"
          value={semesterFilter}
          onChange={(e) => {
            setSemesterFilter(e.target.value)
            setPage(1)
          }}
          style={selectStyle}
        >
          <option value="">Tất cả học kỳ</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
            <option key={value} value={value}>Học kỳ {value}</option>
          ))}
        </select>

        <select
          aria-label="Lọc theo khối kiến thức"
          value={blockFilter}
          onChange={(e) => {
            setBlockFilter(e.target.value)
            setPage(1)
          }}
          style={selectStyle}
        >
          <option value="">Tất cả khối kiến thức</option>
          {Object.entries(KNOWLEDGE_BLOCK_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select
          aria-label="Lọc theo trạng thái"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          style={selectStyle}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang mở đào tạo</option>
          <option value="false">Tạm ẩn</option>
        </select>

        {hasFilter && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              setSearchInput('')
              setSemesterFilter('')
              setBlockFilter('')
              setStatusFilter('')
              setPage(1)
            }}
            style={{ height: '34px', padding: '0 10px', fontSize: '12px' }}
          >
            Đặt lại
          </button>
        )}
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Mã môn</th>
              <th>Tên môn</th>
              <th style={{ width: '64px' }}>Tín chỉ</th>
              <th style={{ width: '160px' }}>Khối kiến thức</th>
              <th style={{ width: '70px' }}>Học kỳ</th>
              <th style={{ width: '76px' }}>Tài liệu</th>
              <th style={{ width: '104px' }}>Trạng thái</th>
              <th style={{ width: '132px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>Đang tải danh mục...</td>
              </tr>
            ) : courses.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={32} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Không tìm thấy học phần phù hợp</span>
                    <span style={{ fontSize: '12px' }}>Hãy đổi từ khóa hoặc đặt lại bộ lọc.</span>
                  </div>
                </td>
              </tr>
            ) : (
              courses.map((course) => {
                const isLocked = course.documentCount > 0
                return (
                  <tr key={course.id}>
                    <td>{course.courseCode}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{course.courseName}</td>
                    <td>{course.credits}</td>
                    <td>
                      {KNOWLEDGE_BLOCK_LABELS[course.knowledgeBlock] || course.knowledgeBlock}
                    </td>
                    <td>
                      {course.semester}
                    </td>
                    <td>
                      {course.documentCount}
                    </td>
                    <td>
                      {course.isActive ? <span className="status-badge green">Đang mở</span> : <span className="status-badge slate">Tạm ẩn</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          aria-label={`Sửa học phần ${course.courseCode}`}
                          title="Sửa"
                          onClick={() => {
                            setEditingCourse(course)
                            setModalOpen(true)
                          }}
                          style={iconButtonStyle}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          aria-label={`${course.isActive ? 'Tạm ẩn' : 'Kích hoạt'} học phần ${course.courseCode}`}
                          title={course.isActive ? 'Tạm ẩn' : 'Kích hoạt'}
                          onClick={() => handleToggleActive(course)}
                          style={iconButtonStyle}
                        >
                          <Power size={13} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Xóa học phần ${course.courseCode}`}
                          title={isLocked ? `Không thể xóa: đang có ${course.documentCount} tài liệu` : 'Xóa học phần'}
                          onClick={() => {
                            setDialogError('')
                            if (isLocked) setBlockedCourse(course)
                            else setDeletingCourse(course)
                          }}
                          style={{
                            ...iconButtonStyle,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: `1px solid ${isLocked ? 'var(--border-subtle)' : 'var(--red-6)'}`,
                            backgroundColor: isLocked ? 'var(--bg-hover)' : 'var(--red-3)',
                            color: isLocked ? 'var(--text-tertiary)' : 'var(--red-11)'
                          }}
                        >
                          {isLocked ? <Lock size={13} /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Hiển thị {firstRow}–{lastRow} trên {total} học phần
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button type="button" className="btn-ghost" style={iconButtonStyle} disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Trang trước">
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{page} / {totalPages}</span>
            <button type="button" className="btn-ghost" style={iconButtonStyle} disabled={page >= totalPages} onClick={() => setPage(page + 1)} aria-label="Trang sau">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        <Lock size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <span>Biểu tượng khóa: môn đang có tài liệu nên không xóa được, bấm vào để xem lý do và dùng Tạm ẩn thay thế.</span>
      </div>

      {modalOpen && (
        <CourseModal
          key={editingCourse?.id || 'new'}
          editingCourse={editingCourse}
          submitting={saving}
          serverError={saveError}
          serverFields={saveFields}
          onClose={closeModal}
          onSaveCourse={handleSaveCourse}
        />
      )}

      {blockedCourse && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`Không thể xóa ${blockedCourse.courseCode}`}>
          <div className="modal-panel" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="status-badge amber">
                <Lock size={13} />
                <span>Không thể xóa</span>
              </span>
              <button type="button" onClick={() => setBlockedCourse(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 800 }}>Không thể xóa {blockedCourse.courseCode}</h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Học phần &ldquo;{blockedCourse.courseName}&rdquo; đang có {blockedCourse.documentCount} tài liệu (tính cả tài liệu chờ duyệt, bị từ chối, đã ẩn hoặc đã xóa mềm). Xóa sẽ làm mất liên kết dữ liệu.
            </p>
            {blockedCourse.isActive && (
              <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'var(--blue-2)', border: '1px solid var(--blue-6)', color: 'var(--blue-12)', fontSize: '12px', lineHeight: 1.4, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={15} style={{ color: 'var(--blue-11)', flexShrink: 0 }} />
                <span>Tạm ẩn giúp môn không còn xuất hiện ở bộ lọc và form đóng góp, tài liệu cũ vẫn an toàn.</span>
              </div>
            )}
            {dialogError && <p role="alert" style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: 'var(--red-11)' }}>{dialogError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn-ghost" onClick={() => setBlockedCourse(null)}>Đóng</button>
              {blockedCourse.isActive && (
                <button type="button" className="btn-solid-primary" onClick={() => handleToggleActive(blockedCourse)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Power size={14} />
                  <span>Tạm ẩn học phần</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {deletingCourse && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Xác nhận xóa học phần">
          <div className="modal-panel" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="status-badge red">
                <Trash2 size={13} />
                <span>Xác nhận xóa học phần</span>
              </span>
              <button type="button" onClick={() => setDeletingCourse(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 800 }}>Xóa học phần {deletingCourse.courseCode}?</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Học phần &ldquo;{deletingCourse.courseName}&rdquo; chưa có tài liệu nào. Thao tác này sẽ gỡ hẳn học phần khỏi danh mục và không thể hoàn tác.
            </p>
            {dialogError && <p role="alert" style={{ margin: '0 0 12px 0', fontSize: '12.5px', color: 'var(--red-11)' }}>{dialogError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn-ghost" onClick={() => setDeletingCourse(null)} disabled={dialogBusy}>Hủy</button>
              <button
                type="button"
                disabled={dialogBusy}
                onClick={handleConfirmDelete}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: 'var(--red-9)', color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                {dialogBusy ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
