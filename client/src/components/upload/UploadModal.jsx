import { useState } from 'react'
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Award
} from 'lucide-react'
import MetadataForm from './MetadataForm'
import Sha256Verifier from './Sha256Verifier'
import { EIGHT_MODERATION_CRITERIA } from '../../data/mockData'
import { checkDocumentHash } from '../../utils/documentCourseApi'
import { verifyFileAndHash } from '../../utils/fileHasher'

export default function UploadModal({
  courses = [],
  existingDocuments = [],
  onSubmitNewDocument,
  onCancel
}) {
  const activeCourses = courses.filter((c) => c.isActive)
  const defaultSqlCourse =
    activeCourses.find((c) => c.code === 'COMP1018')?.code ||
    activeCourses[0]?.code ||
    'COMP1044'

  const [title, setTitle] = useState('')
  const [courseCode, setCourseCode] = useState(defaultSqlCourse)
  const [docType, setDocType] = useState('KHBD Công văn 5512')
  const [description, setDescription] = useState('')
  const [verificationResult, setVerificationResult] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [formError, setFormError] = useState('')
  const [selectedRawFile, setSelectedRawFile] = useState(null)

  // Tự động nhận diện Mã học phần & Loại tài liệu từ tên tệp tải lên
  const inferMetadataFromFilename = (fileName = '') => {
    const clean = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')
    const upper = clean.toUpperCase()

    const matchedCourse = activeCourses.find((c) =>
      upper.includes(c.code.toUpperCase())
    )
    if (matchedCourse) {
      setCourseCode(matchedCourse.code)
    }

    if (/5512|KHBD|GIAO\s*AN/i.test(clean)) {
      setDocType('KHBD Công văn 5512')
    } else if (/DE\s*THI|DAP\s*AN|FINAL|MIDTERM/i.test(clean)) {
      setDocType('Đề thi & Đáp án')
    } else if (/SLIDE|BAI\s*GIANG|PRESENTATION|POWERPOINT/i.test(clean)) {
      setDocType('Slide bài giảng')
    } else if (/DO\s*AN|KHOA\s*LUAN|BTL|PROJECT|THESIS/i.test(clean)) {
      setDocType('Đồ án & Khóa luận')
    } else if (/GIAO\s*TRINH|SACH|EBOOK|DE\s*CUONG|BAI\s*TAP|TAI\s*LIEU/i.test(clean)) {
      setDocType('Giáo trình & Sách học liệu')
    }

    if (!title.trim()) {
      setTitle(clean.charAt(0).toUpperCase() + clean.slice(1))
    }
  }

  // Máy chủ kiểm tra bytes gốc và đối chiếu kho thật
  const confirmWithServer = async (file, clientResult) => {
    if (clientResult.format !== 'pdf') return clientResult
    try {
      const { data } = await checkDocumentHash(file)
      return { ...clientResult, sha256Hash: data.fileHash, isDuplicate: false, duplicateDoc: null }
    } catch (err) {
      return {
        ...clientResult,
        isValid: false,
        isDuplicate: err.code === 'DUPLICATE_FILE',
        duplicateDoc: null,
        magicBytesOk: err.code !== 'INVALID_PDF' && clientResult.magicBytesOk,
        stageFailed: err.code === 'DUPLICATE_FILE' ? 'DUPLICATE_HASH' : 'SERVER_CHECK',
        errorMessage: err.message
      }
    }
  }

  const processIncomingFile = async (file) => {
    if (!file) return
    setSelectedRawFile(file)
    setFormError('')
    inferMetadataFromFilename(file.name)
    const res = await verifyFileAndHash(file, existingDocuments)
    setVerificationResult(res.isValid ? await confirmWithServer(file, res) : res)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    await processIncomingFile(file)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer?.files?.[0]
    await processIncomingFile(file)
  }

  const isMetadataValid =
    title.trim().length >= 10 &&
    description.trim().length >= 15 &&
    Boolean(courseCode)

  const getCriterionStatus = (crit) => {
    if (!verificationResult) {
      return { passed: false, statusText: 'Chờ tải tệp', isAuto: crit.type === 'AUTO' }
    }
    switch (crit.id) {
      case 1:
        return {
          passed: Boolean(verificationResult.extensionOk),
          statusText: verificationResult.extensionOk ? 'Hợp lệ' : 'Sai định dạng',
          isAuto: true
        }
      case 2:
        return {
          passed: Boolean(verificationResult.sizeOk),
          statusText: verificationResult.sizeOk
            ? `Đạt (${verificationResult.sizeMb} MB)`
            : 'Quá 25MB',
          isAuto: true
        }
      case 3:
        return {
          passed: Boolean(verificationResult.magicBytesOk),
          statusText: verificationResult.magicBytesOk ? 'Hợp lệ' : 'Tệp lỗi',
          isAuto: true
        }
      case 4:
        return {
          passed: Boolean(!verificationResult.isDuplicate && verificationResult.magicBytesOk && verificationResult.sizeOk),
          statusText: verificationResult.isDuplicate ? 'Đã tồn tại' : 'Chưa có trên hệ thống',
          isAuto: true
        }
      case 5:
        return {
          passed: isMetadataValid,
          statusText: isMetadataValid ? 'Đầy đủ' : 'Chưa đủ thông tin',
          isAuto: true
        }
      default:
        return {
          passed: true,
          statusText: 'Ban kiểm duyệt',
          isAuto: false
        }
    }
  }

  const autoCriteriaPassedCount = [1, 2, 3, 4, 5].filter(
    (id) => getCriterionStatus({ id, type: 'AUTO' }).passed
  ).length

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedRawFile && !verificationResult) {
      setFormError('Vui lòng chọn tệp tài liệu cần tải lên từ thiết bị của bạn.')
      return
    }
    if (!title.trim() || title.trim().length < 10) {
      setFormError('Tiêu đề tài liệu bắt buộc tối thiểu 10 ký tự.')
      return
    }
    if (!description.trim() || description.trim().length < 15) {
      setFormError('Vui lòng nhập mô tả tóm tắt nội dung tài liệu (tối thiểu 15 ký tự).')
      return
    }
    if (!verificationResult || !verificationResult.isValid) {
      setFormError(
        verificationResult?.errorMessage ||
          'Tệp tin chưa hợp lệ hoặc đã tồn tại trong hệ thống. Vui lòng kiểm tra lại.'
      )
      return
    }

    const selectedCourse = courses.find((c) => c.code === courseCode) || activeCourses[0]

    let finalFile = selectedRawFile
    if (!finalFile && verificationResult) {
      const dummyPdfContent = `%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (${title}) /Author (5Share User) >>\nendobj\n2 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n3 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n4 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 595 842] >>\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000015 00000 n \n0000000085 00000 n \n0000000135 00000 n \n0000000195 00000 n \ntrailer\n<< /Size 5 /Root 2 0 R >>\nstartxref\n275\n%%EOF`
      finalFile = new File([dummyPdfContent], verificationResult.fileName || 'document.pdf', {
        type: 'application/pdf'
      })
    }

    onSubmitNewDocument({
      file: finalFile,
      title: title.trim(),
      courseCode: selectedCourse?.code || courseCode,
      courseId: selectedCourse?.id,
      courseName: selectedCourse?.name || 'Phương pháp dạy học môn Tin học',
      knowledgeBlock: selectedCourse?.knowledgeBlock || 'Nghiệp vụ Sư phạm',
      semester: selectedCourse?.semester || 'Học kỳ 5',
      docType,
      description: description.trim(),
      fileName: verificationResult.fileName,
      format: verificationResult.format || verificationResult.fileType || 'pdf',
      fileSizeMb: verificationResult.sizeMb,
      fileHash: verificationResult.sha256Hash
    })
  }

  return (
    <section className="vec-upload-studio" aria-label="Không gian đóng góp tài liệu">
      {/* Header trang đóng góp */}
      <header className="vec-upload-header">
        <div>
          <nav className="saas-breadcrumb" aria-label="Đường dẫn">
            <span>Kho tài liệu</span>
            <span className="saas-breadcrumb-sep">›</span>
            <span className="saas-breadcrumb-current">Đóng góp tài liệu</span>
          </nav>
          <h1 className="vec-upload-title">Đóng góp tài liệu học tập</h1>
          <p className="vec-upload-subtitle">
            Tài liệu gửi lên sẽ được kiểm tra định dạng, kiểm tra trùng lặp và chuyển đến ban kiểm duyệt trước khi xuất bản.
          </p>
        </div>

        <div className="vec-upload-reward-pill">
          <Award size={15} style={{ color: 'var(--blue-9, #0090ff)' }} />
          <span>Điểm thưởng khi duyệt: <strong>+20 điểm</strong></span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="vec-upload-grid">
        {/* CỘT TRÁI: CHỌN TỆP & NHẬP THÔNG TIN TÀI LIỆU */}
        <div className="vec-upload-col">
          {/* Bước 1: Chọn tệp tin từ thiết bị */}
          <div className="vec-upload-card">
            <div className="vec-upload-card-head">
              <h2 className="vec-upload-card-title">
                <span className="vec-step-num">1</span>
                <span>Tải tệp tài liệu lên</span>
              </h2>
              <span className="vec-form-hint">Hỗ trợ PDF, Word, PowerPoint tối đa 25MB</span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`vec-dropzone ${isDragging ? 'dragging' : ''}`}
            >
              <div className="vec-dropzone-left">
                <div className="vec-dropzone-icon">
                  <UploadCloud size={20} />
                </div>
                <div>
                  <strong className="vec-dropzone-title">
                    Kéo thả tệp tài liệu vào đây hoặc chọn từ máy tính
                  </strong>
                  <span className="vec-dropzone-sub">
                    Chấp nhận các định dạng .pdf, .docx, .pptx dung lượng tối đa 25MB.
                  </span>
                </div>
              </div>

              <label className="vec-file-picker-btn">
                <FileCheck2 size={14} />
                <span>Chọn tệp từ máy</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Bước 2: Khai báo thông tin tài liệu */}
          <div className="vec-upload-card">
            <div className="vec-upload-card-head">
              <h2 className="vec-upload-card-title">
                <span className="vec-step-num">2</span>
                <span>Thông tin tài liệu</span>
              </h2>
              <span className="vec-form-hint">Giúp người học dễ dàng tìm kiếm</span>
            </div>

            <MetadataForm
              courses={courses}
              title={title}
              courseCode={courseCode}
              docType={docType}
              description={description}
              onChangeTitle={setTitle}
              onChangeCourseCode={setCourseCode}
              onChangeDocType={setDocType}
              onChangeDescription={setDescription}
            />
          </div>

          {/* Thông báo lỗi nếu chưa đạt */}
          {formError && (
            <div className="vec-form-alert" role="alert">
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          {/* Nút thao tác hoàn tất */}
          <div className="vec-form-actions">
            <button
              type="button"
              className="saas-page-btn"
              onClick={onCancel}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="saas-upload-action"
              style={{ padding: '8px 18px', fontSize: '13px' }}
            >
              <Send size={14} />
              <span>Gửi tài liệu kiểm duyệt</span>
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: TRẠNG THÁI KIỂM TRA TỆP & TIÊU CHUẨN KIỂM DUYỆT */}
        <aside className="vec-upload-col" aria-label="Kiểm tra tệp tin và tiêu chuẩn kiểm duyệt">
          {/* Khung 1: Trạng thái kiểm tra tệp */}
          <div className="vec-upload-card">
            <div className="vec-upload-card-head">
              <h2 className="vec-upload-card-title">
                <span>Kiểm tra tệp tin</span>
              </h2>
              <span className="vec-form-hint">Tự động xác thực</span>
            </div>

            <Sha256Verifier verificationResult={verificationResult} />
          </div>

          {/* Khung 2: Tiêu chuẩn kiểm duyệt */}
          <div className="vec-upload-card">
            <div className="vec-upload-card-head">
              <h2 className="vec-upload-card-title">
                <span>Tiêu chuẩn kiểm duyệt</span>
              </h2>
              <span className="vec-form-hint">Đảm bảo chất lượng tài liệu</span>
            </div>

            <div className="vec-checklist">
              {EIGHT_MODERATION_CRITERIA.map((crit) => {
                const st = getCriterionStatus(crit)
                return (
                  <div
                    key={crit.id}
                    className={[
                      'vec-check-item',
                      st.isAuto ? (st.passed ? 'passed' : 'failed') : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="vec-check-left">
                      {st.isAuto ? (
                        st.passed ? (
                          <CheckCircle2
                            size={14}
                            style={{ color: 'var(--green-9, #30a46c)', marginTop: '2px', flexShrink: 0 }}
                          />
                        ) : (
                          <XCircle
                            size={14}
                            style={{ color: 'var(--red-9, #e5484d)', marginTop: '2px', flexShrink: 0 }}
                          />
                        )
                      ) : (
                        <Clock
                          size={14}
                          style={{ color: 'var(--blue-9, #0090ff)', marginTop: '2px', flexShrink: 0 }}
                        />
                      )}
                      <div>
                        <span className="vec-check-title">
                          {crit.id}. {crit.title}
                        </span>
                        <span className="vec-check-sub">{crit.executor}</span>
                      </div>
                    </div>

                    <span
                      className={[
                        'vec-check-tag',
                        st.isAuto ? (st.passed ? 'ok' : 'err') : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {st.statusText}
                    </span>
                  </div>
                )
              })}
            </div>

            <footer className="vec-checklist-foot">
              <span>Đạt tự động:</span>
              <strong style={{ color: autoCriteriaPassedCount === 5 ? 'var(--green-11)' : 'var(--amber-11)' }}>
                {autoCriteriaPassedCount} / 5 tiêu chí
              </strong>
            </footer>
          </div>
        </aside>
      </form>
    </section>
  )
}
