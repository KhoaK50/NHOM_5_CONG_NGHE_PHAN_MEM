import { useState } from 'react'
import { AlertTriangle, Upload } from 'lucide-react'
import MetadataForm from './MetadataForm'
import Sha256Verifier from './Sha256Verifier'
import { checkDocumentHash } from '../../utils/documentCourseApi'
import { verifyFileAndHash } from '../../utils/fileHasher'

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
    } else if (/GIAO\s*TRINH|SACH|EBOOK/i.test(clean)) {
      setDocType('Giáo trình & Sách học liệu')
    } else if (/DE\s*CUONG|BAI\s*TAP|TAI\s*LIEU/i.test(clean)) {
      setDocType('Tài liệu')
    }

    if (!title.trim()) {
      setTitle(clean.charAt(0).toUpperCase() + clean.slice(1))
    }
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

    onSubmitNewDocument({
      file: selectedRawFile,
      title: title.trim(),
      courseCode: selectedCourse?.code || courseCode,
      courseId: selectedCourse?.id,
      docType,
      description: description.trim()
    })
  }

  return (
    <section className="vec-upload-studio" aria-label="Đóng góp tài liệu">
      <header>
        <h1 className="page-title">Đóng góp tài liệu</h1>
        <p className="page-sub">
          Tài liệu sẽ được quản trị viên thẩm định theo 8 tiêu chí chuyên môn trước khi xuất bản.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="upload-form">
        <div
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
          <span className="vec-dropzone-sub">PDF, Word hoặc PowerPoint, tối đa 25 MB</span>
          <label className="vec-file-picker-btn">
            <span>Chọn tệp</span>
            <input
              type="file"
              accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <Sha256Verifier verificationResult={verificationResult} />

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

        {formError && (
          <div className="vec-form-alert" role="alert">
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>{formError}</span>
          </div>
        )}

        <div className="vec-form-actions">
          <button type="button" className="btn-ghost nav-auth-link" onClick={onCancel}>
            Hủy
          </button>
          <button type="submit" className="btn-solid-primary">
            Gửi kiểm duyệt
          </button>
        </div>
      </form>
    </section>
  )
}
