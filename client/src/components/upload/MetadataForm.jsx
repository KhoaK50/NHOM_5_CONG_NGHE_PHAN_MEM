import { DOCUMENT_TYPES } from '../../data/curriculum'

const DESCRIPTION_TEMPLATES = {
  'KHBD Công văn 5512':
    'Kế hoạch bài dạy gồm: Mục tiêu bài học, tiến trình các hoạt động dạy học, phiếu học tập và tiêu chí đánh giá theo chuẩn CV 5512.',
  'Slide bài giảng':
    'Bài trình chiếu bài giảng kết hợp sơ đồ trực quan, ví dụ minh họa và câu hỏi thảo luận tại lớp.',
  'Đề thi & Đáp án':
    'Bộ đề thi chính thức kèm ma trận đặc tả đề kiểm tra và hướng dẫn chấm chi tiết cho học phần.',
  'Đồ án & Khóa luận':
    'Báo cáo đồ án môn học / Khóa luận tốt nghiệp gồm: Đặt vấn đề, mô hình kiến trúc, thiết kế cơ sở dữ liệu và kết quả thực nghiệm.',
  'Giáo trình & Sách học liệu':
    'Giáo trình học phần, sách tài liệu tham khảo chính thức, tóm tắt lý thuyết trọng tâm và đề cương chi tiết môn học.'
}

export default function MetadataForm({
  courses = [],
  title = '',
  courseCode = '',
  docType = 'KHBD Công văn 5512',
  description = '',
  onChangeTitle,
  onChangeCourseCode,
  onChangeDocType,
  onChangeDescription
}) {
  const activeCourses = courses.filter((c) => c.isActive)
  const validDocTypes = DOCUMENT_TYPES.filter((t) => t !== 'Tất cả loại học liệu')

  const handleApplyTemplate = () => {
    const tpl =
      DESCRIPTION_TEMPLATES[docType] ||
      DESCRIPTION_TEMPLATES['KHBD Công văn 5512']
    onChangeDescription(tpl)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. Tiêu đề tài liệu */}
      <div className="vec-form-field">
        <div className="vec-form-label-row">
          <label htmlFor="upload-doc-title" className="vec-form-label">
            Tiêu đề
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
          onChange={(e) => onChangeTitle(e.target.value)}
          placeholder="Ví dụ: Kế hoạch bài dạy Tin học 11 - Bài 9: Truy vấn dữ liệu SQL"
        />
      </div>

      {/* 2. Môn học & Loại tài liệu */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}
      >
        <div className="vec-form-field">
          <div className="vec-form-label-row">
            <label htmlFor="upload-course-select" className="vec-form-label">
              Môn học
            </label>
          </div>
          <select
            id="upload-course-select"
            className="vec-form-select"
            value={courseCode}
            onChange={(e) => onChangeCourseCode(e.target.value)}
          >
            {activeCourses.map((crs) => (
              <option key={crs.id} value={crs.code}>
                {crs.code} – {crs.name}
              </option>
            ))}
          </select>
        </div>

        <div className="vec-form-field">
          <div className="vec-form-label-row">
            <label htmlFor="upload-doctype-select" className="vec-form-label">
              Loại tài liệu
            </label>
          </div>
          <select
            id="upload-doctype-select"
            className="vec-form-select"
            value={docType}
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
      <div className="vec-form-field">
        <div className="vec-form-label-row">
          <label htmlFor="upload-doc-desc" className="vec-form-label">
            Mô tả
          </label>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span className="vec-form-hint">
              {description.trim().length} / 15 ký tự tối thiểu
            </span>
            <button
              type="button"
              className="vec-template-btn"
              onClick={handleApplyTemplate}
              title={`Chèn mô tả gợi ý cho ${docType}`}
            >
              Chèn mô tả gợi ý
            </button>
          </div>
        </div>
        <textarea
          id="upload-doc-desc"
          rows={3}
          className="vec-form-textarea"
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          placeholder="Tóm tắt nội dung, ít nhất 15 ký tự"
        />
      </div>
    </div>
  )
}
