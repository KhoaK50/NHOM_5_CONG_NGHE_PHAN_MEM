import { useState } from 'react'
import {
  Plus,
  Edit3,
  Power,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Search,
  BookOpen,
  X,
  FileText
} from 'lucide-react'
import CourseModal from './CourseModal'
import { KNOWLEDGE_BLOCKS, SEMESTERS } from '../../data/mockData'

export default function CourseManagement({
  courses = [],
  documents = [],
  onSaveCourse,
  onToggleCourseActive,
  onDeleteCourse
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [warningBanner, setWarningBanner] = useState('')
  const [deletingCourse, setDeletingCourse] = useState(null)

  // Bộ lọc và tìm kiếm
  const [searchQuery, setSearchQuery] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('Tất cả học kỳ')
  const [knowledgeBlockFilter, setKnowledgeBlockFilter] = useState('Tất cả khối kiến thức')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Tính số lượng tài liệu đang liên kết với học phần (Kiểm tra khóa ngoại)
  const getLiveDocCount = (course) => {
    const liveMatches = documents.filter(
      (d) =>
        d.status !== 'DELETED' &&
        (d.courseCode === course.code ||
          d.courseId === course.id ||
          d.course === course.name ||
          d.courseTitle === course.name)
    ).length
    return Math.max(course.documentCount || 0, liveMatches)
  }

  // Ràng buộc toàn vẹn khóa ngoại (Strict Foreign Key Deletion Block)
  const handleAttemptDelete = (course) => {
    const count = getLiveDocCount(course)
    if (count > 0) {
      setWarningBanner(
        `Không thể xóa học phần này vì đang có ${count} tài liệu gắn kèm. Vui lòng chuyển hoặc xóa các tài liệu trước.`
      )
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setWarningBanner('')
    setDeletingCourse(course)
  }

  const handleConfirmDelete = () => {
    if (deletingCourse) {
      onDeleteCourse(deletingCourse.id)
      setDeletingCourse(null)
    }
  }

  // Danh sách học phần sau lọc và tìm kiếm
  const filteredCourses = courses.filter((course) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch =
      !q ||
      course.code.toLowerCase().includes(q) ||
      course.name.toLowerCase().includes(q)

    const matchesSemester =
      semesterFilter === 'Tất cả học kỳ' || course.semester === semesterFilter

    const matchesBlock =
      knowledgeBlockFilter === 'Tất cả khối kiến thức' ||
      course.knowledgeBlock === knowledgeBlockFilter

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && course.isActive) ||
      (statusFilter === 'INACTIVE' && !course.isActive)

    return matchesSearch && matchesSemester && matchesBlock && matchesStatus
  })

  // Thống kê nhanh
  const totalCourses = courses.length
  const activeCount = courses.filter((c) => c.isActive).length
  const totalDocsCount = courses.reduce((acc, c) => acc + getLiveDocCount(c), 0)

  return (
    <div>
      {/* Tiêu đề & Nút Thêm mới */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '18px'
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Quản lý Danh mục Học phần Đào tạo (FR-08 / UC10)
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Cấu hình danh mục môn học bám sát Khung Chương trình Đào tạo ngành Sư phạm Tin học (HCMUE).
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
          <span>Thêm học phần mới</span>
        </button>
      </div>

      {/* Thẻ thống kê nhanh (3 KPI cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>TỔNG HỌC PHẦN</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCourses}</div>
          </div>
          <BookOpen size={22} style={{ color: 'var(--primary-base)' }} />
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>ĐANG MỞ ĐÀO TẠO</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--green-9)' }}>{activeCount}</div>
          </div>
          <ShieldCheck size={22} style={{ color: 'var(--green-9)' }} />
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>TÀI LIỆU GẮN KÈM</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--blue-9)' }}>{totalDocsCount}</div>
          </div>
          <FileText size={22} style={{ color: 'var(--blue-9)' }} />
        </div>
      </div>

      {/* Cảnh báo vi phạm khóa ngoại (Foreign Key Deletion Block) */}
      {warningBanner && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--amber-1)',
            border: '1.5px solid var(--amber-3)',
            color: 'var(--amber-12)',
            fontSize: '13.5px',
            fontWeight: 600,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <AlertTriangle size={20} style={{ color: 'var(--amber-9)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 800, color: 'var(--amber-11)', marginBottom: '2px' }}>
                Ràng buộc toàn vẹn cơ sở dữ liệu (Khóa ngoại)
              </div>
              <div>{warningBanner}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Gợi ý: Quản trị viên có thể chọn thao tác <strong>&quot;Tạm ẩn&quot;</strong> để học phần không hiển thị trên bộ lọc tìm kiếm mà vẫn đảm bảo an toàn cho các tài liệu hiện có.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setWarningBanner('')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '2px'
            }}
            aria-label="Đóng cảnh báo"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Thanh tìm kiếm & Bộ lọc nâng cao */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Ô tìm kiếm theo mã hoặc tên môn học */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-muted)',
            border: '1px solid var(--border-strong)',
            borderRadius: '8px',
            padding: '6px 12px',
            flex: '1 1 280px',
            minWidth: '220px'
          }}
        >
          <Search size={15} style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo mã học phần (COMP1044...) hoặc tên môn..."
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              width: '100%',
              color: 'var(--text-primary)'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Các dropdown lọc */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {/* Lọc theo học kỳ */}
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            {SEMESTERS.map((sem) => (
              <option key={sem} value={sem}>
                {sem}
              </option>
            ))}
          </select>

          {/* Lọc theo khối kiến thức */}
          <select
            value={knowledgeBlockFilter}
            onChange={(e) => setKnowledgeBlockFilter(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            {KNOWLEDGE_BLOCKS.map((kb) => (
              <option key={kb} value={kb}>
                {kb}
              </option>
            ))}
          </select>

          {/* Lọc theo trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: '34px',
              padding: '0 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang mở đào tạo</option>
            <option value="INACTIVE">Tạm ẩn</option>
          </select>

          {(searchQuery || semesterFilter !== 'Tất cả học kỳ' || knowledgeBlockFilter !== 'Tất cả khối kiến thức' || statusFilter !== 'ALL') && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setSearchQuery('')
                setSemesterFilter('Tất cả học kỳ')
                setKnowledgeBlockFilter('Tất cả khối kiến thức')
                setStatusFilter('ALL')
              }}
              style={{ height: '34px', padding: '0 10px', fontSize: '12px' }}
            >
              Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* Bảng dữ liệu học phần */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '110px' }}>Mã HP</th>
              <th>Tên học phần theo CTĐT</th>
              <th style={{ width: '80px' }}>Số TC</th>
              <th>Khối kiến thức</th>
              <th style={{ width: '100px' }}>Học kỳ</th>
              <th style={{ width: '110px' }}>Số tài liệu</th>
              <th style={{ width: '110px' }}>Trạng thái</th>
              <th style={{ width: '190px' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={32} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Không tìm thấy học phần phù hợp với bộ lọc</span>
                    <span style={{ fontSize: '12px' }}>Vui lòng thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc học kỳ.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCourses.map((course) => {
                const liveDocCount = getLiveDocCount(course)
                return (
                  <tr key={course.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary-base)' }}>
                      {course.code}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{course.name}</td>
                    <td>{course.credits} TC</td>
                    <td>
                      <span className="status-badge blue">{course.knowledgeBlock}</span>
                    </td>
                    <td>
                      <span className="status-badge slate">{course.semester}</span>
                    </td>
                    <td>
                      <strong style={{ color: liveDocCount > 0 ? 'var(--blue-11)' : 'var(--text-secondary)' }}>
                        {liveDocCount}
                      </strong>{' '}
                      tài liệu
                    </td>
                    <td>
                      {course.isActive ? (
                        <span className="status-badge green">
                          <ShieldCheck size={12} /> Đang mở
                        </span>
                      ) : (
                        <span className="status-badge slate">Tạm ẩn</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            setEditingCourse(course)
                            setModalOpen(true)
                          }}
                          style={{
                            padding: '5px 10px',
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit3 size={13} />
                          <span>Sửa</span>
                        </button>

                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            setWarningBanner('')
                            onToggleCourseActive(course.id)
                          }}
                          style={{
                            padding: '5px 10px',
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Power size={13} />
                          <span>{course.isActive ? 'Tạm ẩn' : 'Kích hoạt'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAttemptDelete(course)}
                          title={
                            liveDocCount > 0
                              ? `Không thể xóa vì đang có ${liveDocCount} tài liệu liên kết`
                              : 'Xóa học phần'
                          }
                          style={{
                            padding: '5px 10px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: '1px solid var(--red-2)',
                            backgroundColor: 'var(--red-1)',
                            color: 'var(--red-9)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm / Chỉnh sửa học phần */}
      {modalOpen && (
        <CourseModal
          editingCourse={editingCourse}
          existingCourses={courses}
          onClose={() => setModalOpen(false)}
          onSaveCourse={(payload) => {
            onSaveCourse(payload)
            setModalOpen(false)
          }}
        />
      )}

      {/* Modal Xác nhận Xóa học phần (Khi documentCount === 0) */}
      {deletingCourse && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Xác nhận xóa học phần">
          <div className="modal-panel" style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="status-badge red">
                <Trash2 size={13} />
                <span>Xác nhận xóa học phần</span>
              </span>
              <button
                type="button"
                onClick={() => setDeletingCourse(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: 800 }}>
              Xóa học phần {deletingCourse.code}?
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Học phần <strong>&quot;{deletingCourse.code} - {deletingCourse.name}&quot;</strong> hiện có 0 tài liệu gắn kèm. Thao tác này sẽ gỡ bỏ học phần hoàn toàn khỏi danh mục đào tạo.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setDeletingCourse(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--red-9)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
