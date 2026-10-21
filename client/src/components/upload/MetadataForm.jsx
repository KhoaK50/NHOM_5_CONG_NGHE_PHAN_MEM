import { DOCUMENT_TYPES } from '../../data/mockData'
import { FileText } from 'lucide-react'

const DESCRIPTION_TEMPLATES = {
  'KHBD Công văn 5512':
    'Kế hoạch bài dạy biên soạn chuẩn Công văn 5512/BGDĐT-GDTrH gồm: (1) Mục tiêu phát triển năng lực Tin học NLa, NLc; (2) Tiến trình 4 hoạt động: Khởi động, Hình thành kiến thức mới, Luyện tập và Vận dụng kèm phiếu học tập & Rubric đánh giá.',
  'Đề thi & Đáp án':
    'Bộ đề thi chính thức kèm ma trận đặc tả mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng) và hướng dẫn chấm chi tiết từng bước cho học phần.',
  'Slide bài giảng':
    'Bài trình chiếu lý thuyết kết hợp sơ đồ trực quan, mã nguồn minh họa từng bước và bộ câu hỏi thảo luận tình huống sư phạm tại lớp.',
  'Đề cương & Bài tập':
    'Hệ thống bài tập thực hành phòng máy phân theo chủ đề, kèm dữ liệu mẫu kiểm thử (test cases) và hướng dẫn giải thuật chi tiết.'
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
  const selectedCourseObj = activeCourses.find((c) => c.code === courseCode)

  const handleApplyTemplate = () => {
    const tpl =
      DESCRIPTION_TEMPLATES[docType] ||
      DESCRIPTION_TEMPLATES['KHBD Công văn 5512']
    onChangeDescription(tpl)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. Tiêu đề học liệu */}
      <div className="vec-form-field">
        <div className="vec-form-label-row">
          <label htmlFor="upload-doc-title" className="vec-form-label">
            Tiêu đề học liệu
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
          placeholder="Ví dụ: Kế hoạch bài dạy Tin học 11 - Bài 9: Truy vấn dữ liệu SQL (Chuẩn CV 5512)"
        />
      </div>

      {/* 2. Học phần CTĐT & Phân loại học liệu (FR-03 2 cấp) */}
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
              Học phần Chương trình Đào tạo (Cấp 2)
            </label>
            {selectedCourseObj && (
              <span className="vec-form-hint">
                {selectedCourseObj.knowledgeBlock}
              </span>
            )}
          </div>
          <select
            id="upload-course-select"
            className="vec-form-select"
            value={courseCode}
            onChange={(e) => onChangeCourseCode(e.target.value)}
          >
            {activeCourses.map((crs) => (
              <option key={crs.id} value={crs.code}>
                {crs.code} – {crs.name} ({crs.semester} • {crs.credits} TC)
              </option>
            ))}
          </select>
        </div>

        <div className="vec-form-field">
          <div className="vec-form-label-row">
            <label htmlFor="upload-doctype-select" className="vec-form-label">
              Loại tài liệu học thuật
            </label>
            <span className="vec-form-hint">Chuẩn FR-03</span>
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

      {/* 3. Mô tả tóm tắt nội dung & nút chèn khung chuẩn */}
      <div className="vec-form-field">
        <div className="vec-form-label-row">
          <label htmlFor="upload-doc-desc" className="vec-form-label">
            Tóm tắt nội dung & Mục tiêu học thuật
          </label>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <span className="vec-form-hint">
              {description.trim().length} / 15 ký tự tối thiểu
            </span>
            <button
              type="button"
              className="vec-template-btn"
              onClick={handleApplyTemplate}
              title={`Chèn khung mô tả mẫu cho ${docType}`}
            >
              <FileText size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
              Chèn khung mẫu {docType}
            </button>
          </div>
        </div>
        <textarea
          id="upload-doc-desc"
          rows={3}
          className="vec-form-textarea"
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          placeholder="Mô tả tóm tắt nội dung trọng tâm, cấu trúc bài học (4 hoạt động Công văn 5512) hoặc phạm vi kiến thức..."
        />
      </div>
    </div>
  )
}
