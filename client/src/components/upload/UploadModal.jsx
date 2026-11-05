import { useRef, useState } from 'react'
import { AlertTriangle, Loader2, Upload } from 'lucide-react'
import MetadataForm, { FieldError } from './MetadataForm'
import Sha256Verifier from './Sha256Verifier'
import RequiredMark from '../common/RequiredMark'
import { checkDocumentHash } from '../../utils/documentCourseApi'
import { verifyFileAndHash } from '../../utils/fileHasher'

const MIN_TITLE_LENGTH = 10
const MIN_DESCRIPTION_LENGTH = 15

const FIELD_FOCUS_IDS = {
  file: 'upload-dropzone',
  title: 'upload-doc-title',
  course: 'upload-course-select',
  description: 'upload-doc-desc'
}

function buildTitleFromFileName(fileName = '') {
  const clean = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

export default function UploadModal({
  courses = [],
  existingDocuments = [],
  onSubmitNewDocument,
  onCancel
}) {
  const activeCourses = courses.filter((c) => c.isActive)

  const [title, setTitle] = useState('')
  const [courseCode, setCourseCode] = useState(activeCourses[0]?.code || '')
  const [docType, setDocType] = useState('KHBD Công văn 5512')
  const [description, setDescription] = useState('')
  const [verificationResult, setVerificationResult] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedRawFile, setSelectedRawFile] = useState(null)
  const [isChecking, setIsChecking] = useState(false)
  const [hasAttempted, setHasAttempted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [serverError, setServerError] = useState('')

  // Tiêu đề do hệ thống tự điền gần nhất: đổi tệp thì được thay, tiêu đề người dùng tự gõ thì giữ nguyên
  const autoTitleRef = useRef('')
  // Chỉ nhận kết quả kiểm tra của tệp được chọn sau cùng
  const latestCheckRef = useRef(0)
  const summaryRef = useRef(null)

  // Tự động nhận diện Mã học phần, Loại tài liệu và Tiêu đề từ tên tệp tải lên
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
    } else if (/GIAO\s*TRINH|SACH|EBOOK/i.test(clean)) {
      setDocType('Giáo trình & Sách học liệu')
    } else if (/DE\s*CUONG|BAI\s*TAP|TAI\s*LIEU/i.test(clean)) {
      setDocType('Tài liệu')
    }

    const suggestedTitle = buildTitleFromFileName(fileName)
    const previousAutoTitle = autoTitleRef.current
    autoTitleRef.current = suggestedTitle
    setTitle((current) => (!current.trim() || current === previousAutoTitle ? suggestedTitle : current))
  }

  // Máy chủ kiểm tra bytes gốc và đối chiếu kho thật
  const confirmWithServer = async (file, clientResult) => {
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
    if (!file || isSubmitting) return
    const checkId = latestCheckRef.current + 1
    latestCheckRef.current = checkId
    setSelectedRawFile(file)
    setServerError('')
    setVerificationResult(null)
    setIsChecking(true)

    const clientResult = await verifyFileAndHash(file, existingDocuments)
    if (latestCheckRef.current !== checkId) return
    // Tệp sai định dạng không được ghi đè thông tin đang nhập
    if (clientResult.isValid) inferMetadataFromFilename(file.name)

    const finalResult = clientResult.isValid ? await confirmWithServer(file, clientResult) : clientResult
    if (latestCheckRef.current !== checkId) return
    setVerificationResult(finalResult)
    setIsChecking(false)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    // Cho phép chọn lại đúng tệp vừa chọn sau khi đã đổi sang tệp khác
    e.target.value = ''
    await processIncomingFile(file)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer?.files?.[0]
    await processIncomingFile(file)
  }

  const buildErrors = () => {
    const errors = {}
    if (!selectedRawFile) {
      errors.file = 'Chưa chọn tệp tài liệu. Hãy chọn tệp PDF, Word hoặc PowerPoint.'
    } else if (verificationResult && !verificationResult.isValid) {
      errors.file = verificationResult.errorMessage || 'Tệp không đủ điều kiện tải lên. Hãy chọn tệp khác.'
    }
    const titleLength = title.trim().length
    if (titleLength === 0) errors.title = `Chưa nhập tiêu đề. Tiêu đề cần ít nhất ${MIN_TITLE_LENGTH} ký tự.`
    else if (titleLength < MIN_TITLE_LENGTH) errors.title = `Tiêu đề quá ngắn: mới có ${titleLength}/${MIN_TITLE_LENGTH} ký tự.`
    if (!courseCode) errors.course = 'Chưa chọn môn học của tài liệu.'
    const descriptionLength = description.trim().length
    if (descriptionLength === 0) errors.description = `Chưa nhập mô tả. Mô tả cần ít nhất ${MIN_DESCRIPTION_LENGTH} ký tự.`
    else if (descriptionLength < MIN_DESCRIPTION_LENGTH) errors.description = `Mô tả quá ngắn: mới có ${descriptionLength}/${MIN_DESCRIPTION_LENGTH} ký tự.`
    return errors
  }

  const scrollToSummary = () => {
    requestAnimationFrame(() => {
      summaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      summaryRef.current?.focus({ preventScroll: true })
    })
  }

  const focusField = (name) => {
    const node = document.getElementById(FIELD_FOCUS_IDS[name])
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    node?.focus({ preventScroll: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isChecking || isSubmitting) return
    setHasAttempted(true)
    setServerError('')

    if (Object.keys(buildErrors()).length > 0) {
      scrollToSummary()
      return
    }

    const selectedCourse = courses.find((c) => c.code === courseCode) || activeCourses[0]

    setUploadProgress(0)
    setIsSubmitting(true)
    const result = await onSubmitNewDocument(
      {
        file: selectedRawFile,
        title: title.trim(),
        courseCode: selectedCourse?.code || courseCode,
        courseId: selectedCourse?.id,
        docType,
        description: description.trim()
      },
      { onProgress: setUploadProgress }
    )
    setIsSubmitting(false)
    if (result && !result.ok && result.message) {
      setServerError(result.message)
      scrollToSummary()
    }
  }

  const errors = hasAttempted ? buildErrors() : {}
  const errorEntries = Object.entries(errors)

  return (
    <section className="vec-upload-studio" aria-label="Đóng góp tài liệu">
      <header>
        <h1 className="page-title">Đóng góp tài liệu</h1>
        <p className="page-sub">
          Tài liệu sẽ được quản trị viên thẩm định theo 8 tiêu chí chuyên môn trước khi xuất bản.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="upload-form" noValidate>
        {(errorEntries.length > 0 || serverError) && (
          <div className="vec-form-alert" role="alert" tabIndex={-1} ref={summaryRef}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
            <div>
              <strong>
                {serverError ? 'Chưa gửi được tài liệu' : `Chưa thể gửi: còn ${errorEntries.length} mục cần sửa`}
              </strong>
              {serverError && <p>{serverError}</p>}
              {errorEntries.length > 0 && (
                <ul>
                  {errorEntries.map(([name, message]) => (
                    <li key={name}>
                      <button type="button" onClick={() => focusField(name)}>{message}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className={`vec-form-field ${errors.file ? 'has-error' : ''}`}>
          <div className="vec-form-label-row">
            <span className="vec-form-label">
              Tệp tài liệu
              <RequiredMark />
            </span>
          </div>
          <div
            id="upload-dropzone"
            tabIndex={-1}
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`vec-dropzone ${isDragging ? 'dragging' : ''}`}
          >
            <Upload size={22} color="var(--primary-base)" aria-hidden="true" />
            <strong className="vec-dropzone-title">Kéo thả tệp vào đây</strong>
            <span className="vec-dropzone-sub">PDF, Word (.docx) hoặc PowerPoint (.pptx), tối đa 10 MB</span>
            <label className="vec-file-picker-btn">
              <span>{selectedRawFile ? 'Đổi tệp khác' : 'Chọn tệp'}</span>
              <input
                type="file"
                accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={handleFileChange}
                disabled={isSubmitting}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          {!selectedRawFile && <FieldError id="upload-file-error" message={errors.file} />}
        </div>

        {isChecking && (
          <div className="file-check is-checking" role="status">
            <Loader2 size={16} className="spin-icon" aria-hidden="true" />
            <span>Đang kiểm tra tệp {selectedRawFile?.name}…</span>
          </div>
        )}
        <Sha256Verifier verificationResult={verificationResult} />

        <MetadataForm
          courses={courses}
          title={title}
          courseCode={courseCode}
          docType={docType}
          description={description}
          errors={errors}
          disabled={isSubmitting}
          onChangeTitle={setTitle}
          onChangeCourseCode={setCourseCode}
          onChangeDocType={setDocType}
          onChangeDescription={setDescription}
        />

        {isSubmitting && (
          <div className="upload-progress" role="status">
            <div className="upload-progress-head">
              <span>{uploadProgress < 100 ? 'Đang gửi tệp lên máy chủ' : 'Đang lưu trữ tài liệu, sắp xong'}</span>
              {uploadProgress < 100 && <strong>{uploadProgress}%</strong>}
            </div>
            <div className={`upload-progress-track ${uploadProgress >= 100 ? 'is-finishing' : ''}`}>
              <span style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        <div className="vec-form-actions">
          <button type="button" className="btn-ghost nav-auth-link" onClick={onCancel} disabled={isSubmitting}>
            Hủy
          </button>
          <button type="submit" className="btn-solid-primary" disabled={isChecking || isSubmitting}>
            {isSubmitting ? 'Đang gửi…' : isChecking ? 'Đang kiểm tra tệp…' : 'Gửi kiểm duyệt'}
          </button>
        </div>
      </form>
    </section>
  )
}
