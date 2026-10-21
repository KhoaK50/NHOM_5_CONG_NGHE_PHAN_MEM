import { useState, useEffect } from 'react'
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
import { verifyFileAndHash, computeDeterministicHexHash } from '../../utils/fileHasher'

function buildUniqueSampleHash(existingDocs = [], baseName = 'KHBD_TinHoc11_Bai9_TruyVanSQL_CV5512') {
  const existingSet = new Set(
    existingDocs.map((d) => (d.fileHash || '').toLowerCase()).filter(Boolean)
  )
  let attempt = existingDocs.length + 1
  let candidate = computeDeterministicHexHash(`${baseName}_v${attempt}`)
  while (existingSet.has(candidate.toLowerCase())) {
    attempt += 1
    candidate = computeDeterministicHexHash(`${baseName}_v${attempt}`)
  }
  return candidate
}

const SCENARIO_LIST = [
  { id: 'PDF_VALID', label: 'PDF Chuẩn (.pdf)', danger: false },
  { id: 'DOCX_VALID', label: 'Word Chuẩn (.docx)', danger: false },
  { id: 'PPTX_VALID', label: 'Slide Chuẩn (.pptx)', danger: false },
  { id: 'DUPLICATE_HASH', label: 'Trùng SHA-256', danger: true },
  { id: 'FAKE_MAGIC_BYTES', label: 'Giả mạo đuôi (MZ .exe)', danger: true },
  { id: 'EMPTY_FILE', label: 'Tệp rỗng (0 Byte)', danger: true },
  { id: 'OVERSIZE', label: 'Quá tải (26.2 MB)', danger: true }
]

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

  const [activeScenario, setActiveScenario] = useState('PDF_VALID')
  const [title, setTitle] = useState(
    'Kế hoạch bài dạy Tin học 11 - Bài 9: Truy vấn dữ liệu SQL nâng cao (Chuẩn CV 5512)'
  )
  const [courseCode, setCourseCode] = useState(defaultSqlCourse)
  const [docType, setDocType] = useState('KHBD Công văn 5512')
  const [description, setDescription] = useState(
    'Giáo án chi tiết 2 tiết thực hành phòng máy theo Công văn 5512, có đầy đủ 4 hoạt động dạy học và Rubric đánh giá năng lực giải quyết vấn đề NLc.'
  )
  const [verificationResult, setVerificationResult] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let mounted = true
    const uniqueHexHash = buildUniqueSampleHash(existingDocuments)
    verifyFileAndHash(
      {
        name: 'COMP1018_KHBD_TinHoc11_Bai9_TruyVanSQL_CV5512.pdf',
        size: 2.85 * 1024 * 1024,
        presetHash: uniqueHexHash
      },
      existingDocuments
    ).then((res) => {
      if (mounted) setVerificationResult(res)
    })
    return () => {
      mounted = false
    }
  }, [existingDocuments])

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
    } else if (/SLIDE|PPT|BAI\s*GIANG/i.test(clean)) {
      setDocType('Slide bài giảng')
    } else if (/DE\s*CUONG|BAI\s*TAP|LAB|DO\s*AN/i.test(clean)) {
      setDocType('Đề cương & Bài tập')
    }

    if (clean.trim().length >= 10) {
      setTitle(clean.trim())
    }
  }

  const processIncomingFile = async (file) => {
    if (!file) return
    setFormError('')
    setActiveScenario('CUSTOM_FILE')
    inferMetadataFromFilename(file.name)
    const res = await verifyFileAndHash(file, existingDocuments)
    setVerificationResult(res)
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

  const handleSelectPresetScenario = async (scenario) => {
    setFormError('')
    setActiveScenario(scenario)

    if (scenario === 'UNIQUE_PASS' || scenario === 'PDF_VALID') {
      const uniqueHexHash = buildUniqueSampleHash(
        existingDocuments,
        'COMP1018_KHBD_TinHoc11_Bai9_PDF'
      )
      setTitle(
        'Kế hoạch bài dạy Tin học 11 - Bài 9: Truy vấn dữ liệu SQL nâng cao (Chuẩn CV 5512)'
      )
      if (activeCourses.some((c) => c.code === 'COMP1018')) {
        setCourseCode('COMP1018')
      }
      setDocType('KHBD Công văn 5512')
      const res = await verifyFileAndHash(
        {
          name: 'COMP1018_KHBD_TinHoc11_Bai9_TruyVanSQL_CV5512.pdf',
          size: 2.85 * 1024 * 1024,
          presetHash: uniqueHexHash
        },
        existingDocuments
      )
      setVerificationResult(res)
    } else if (scenario === 'DOCX_VALID') {
      const uniqueHexHash = buildUniqueSampleHash(
        existingDocuments,
        'COMP1818_GiaoAn_ChuyenDe_Python_DOCX'
      )
      setTitle(
        'Kế hoạch bài dạy Chuyên đề Python & Thiết kế kế hoạch dạy học (Chuẩn CV 5512)'
      )
      if (activeCourses.some((c) => c.code === 'COMP1818')) {
        setCourseCode('COMP1818')
      }
      setDocType('KHBD Công văn 5512')
      const res = await verifyFileAndHash(
        {
          name: 'COMP1818_GiaoAn_ChuyenDe_Python_GDPT2018.docx',
          size: 1.45 * 1024 * 1024,
          presetHash: uniqueHexHash
        },
        existingDocuments
      )
      setVerificationResult(res)
    } else if (scenario === 'PPTX_VALID') {
      const uniqueHexHash = buildUniqueSampleHash(
        existingDocuments,
        'COMP1314_Slide_MangNoRon_CNN_PPTX'
      )
      setTitle(
        'Slide bài giảng Chương 4: Mạng Nơ-ron Nhân tạo & Học sâu (Trí tuệ nhân tạo)'
      )
      if (activeCourses.some((c) => c.code === 'COMP1314')) {
        setCourseCode('COMP1314')
      }
      setDocType('Slide bài giảng')
      const res = await verifyFileAndHash(
        {
          name: 'COMP1314_Slide_MangNoRon_CNN_NhanDangAnh.pptx',
          size: 5.82 * 1024 * 1024,
          presetHash: uniqueHexHash
        },
        existingDocuments
      )
      setVerificationResult(res)
    } else if (scenario === 'DUPLICATE_HASH') {
      const existingHash =
        existingDocuments[0]?.fileHash ||
        'a94f8b2c71e09d34f5a811c63e9204d78b1a9f2304c812e3d90f12a4b6c8e019'
      const res = await verifyFileAndHash(
        {
          name: 'BanSao_DoiTen_KHBD_TinHoc10_Bai12.pdf',
          size: 2.42 * 1024 * 1024,
          presetHash: existingHash
        },
        existingDocuments
      )
      setVerificationResult(res)
    } else if (scenario === 'FAKE_MAGIC_BYTES') {
      const res = await verifyFileAndHash(
        {
          name: 'DeThi_GiaMao_MaDoc.docx',
          size: 1.2 * 1024 * 1024,
          presetMagic: 'INVALID_EXE'
        },
        existingDocuments
      )
      setVerificationResult(res)
    } else if (scenario === 'EMPTY_FILE') {
      const res = await verifyFileAndHash(
        {
          name: 'tep_rong_0byte.pdf',
          size: 0
        },
        existingDocuments
      )
      setVerificationResult(res)
    } else if (scenario === 'OVERSIZE') {
      const res = await verifyFileAndHash(
        {
          name: 'video_bai_giang_qua_tai.pptx',
          size: Math.round(26.2 * 1024 * 1024)
        },
        existingDocuments
      )
      setVerificationResult(res)
    }
  }

  const isMetadataValid =
    title.trim().length >= 10 &&
    description.trim().length >= 15 &&
    Boolean(courseCode)

  const getCriterionStatus = (crit) => {
    if (!verificationResult) {
      return { passed: false, statusText: 'Đang chờ tệp', isAuto: crit.type === 'AUTO' }
    }
    switch (crit.id) {
      case 1:
        return {
          passed: Boolean(verificationResult.extensionOk),
          statusText: verificationResult.extensionOk ? 'Đạt (.pdf/.docx/.pptx)' : 'Sai đuôi tệp',
          isAuto: true
        }
      case 2:
        return {
          passed: Boolean(verificationResult.sizeOk),
          statusText: verificationResult.sizeOk
            ? `Đạt (${verificationResult.sizeMb} MB)`
            : 'Vi phạm dung lượng',
          isAuto: true
        }
      case 3:
        return {
          passed: Boolean(verificationResult.magicBytesOk),
          statusText: verificationResult.magicBytesOk ? 'Đạt Magic Bytes' : 'Giả mạo chữ ký',
          isAuto: true
        }
      case 4:
        return {
          passed: Boolean(!verificationResult.isDuplicate && verificationResult.magicBytesOk && verificationResult.sizeOk),
          statusText: verificationResult.isDuplicate ? 'Trùng SHA-256' : 'Duy nhất (0 trùng)',
          isAuto: true
        }
      case 5:
        return {
          passed: isMetadataValid,
          statusText: isMetadataValid ? 'Đủ Metadata' : 'Thiếu thông tin',
          isAuto: true
        }
      default:
        return {
          passed: true,
          statusText: 'Hội đồng duyệt',
          isAuto: false
        }
    }
  }

  const autoCriteriaPassedCount = [1, 2, 3, 4, 5].filter(
    (id) => getCriterionStatus({ id, type: 'AUTO' }).passed
  ).length

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || title.trim().length < 10) {
      setFormError('Tiêu đề học liệu bắt buộc tối thiểu 10 ký tự.')
      return
    }
    if (!description.trim() || description.trim().length < 15) {
      setFormError('Vui lòng nhập mô tả tóm tắt nội dung học liệu (tối thiểu 15 ký tự).')
      return
    }
    if (!verificationResult || !verificationResult.isValid) {
      setFormError(
        verificationResult?.errorMessage ||
          'Tệp tin chưa vượt qua bước kiểm tra chữ ký nhị phân Magic Bytes và mã băm SHA-256 chống trùng.'
      )
      return
    }

    const selectedCourse = courses.find((c) => c.code === courseCode) || activeCourses[0]
    onSubmitNewDocument({
      title: title.trim(),
      courseCode: selectedCourse?.code || courseCode,
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
    <section className="vec-upload-studio" aria-label="Không gian đóng góp và thẩm định kỹ thuật học liệu">
      {/* Header học thuật kiểu Vectoria */}
      <header className="vec-upload-header">
        <div>
          <nav className="saas-breadcrumb" aria-label="Đường dẫn chức năng">
            <span>Kho học liệu</span>
            <span className="saas-breadcrumb-sep">›</span>
            <span className="saas-breadcrumb-current">Đóng góp & Kiểm định học liệu (UC07 • UC08)</span>
          </nav>
          <h1 className="vec-upload-title">Đóng góp Học liệu Số Sư phạm Tin học</h1>
          <p className="vec-upload-subtitle">
            Tệp tải lên được kiểm tra toàn vẹn nhị phân (Magic Bytes), đối sánh mã băm <code>SHA-256</code> chống trùng lặp và chuyển đến Hội đồng thẩm định theo 8 tiêu chí học thuật.
          </p>
        </div>

        <div className="vec-upload-reward-pill">
          <Award size={15} style={{ color: 'var(--blue-9, #0090ff)' }} />
          <span>Thưởng phê duyệt: <strong>+20 điểm cống hiến</strong></span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="vec-upload-grid">
        {/* CỘT TRÁI: NẠP TỆP & KHAI BÁO HỒ SƠ HỌC THUẬT */}
        <div className="vec-upload-col">
          {/* Bước 1: Chọn tệp & Bộ kịch bản kiểm thử UC08 */}
          <div className="vec-upload-card">
            <div className="vec-upload-card-head">
              <h2 className="vec-upload-card-title">
                <span className="vec-step-num">1</span>
                <span>Tệp học liệu đính kèm (.PDF, .DOCX, .PPTX ≤ 25MB)</span>
              </h2>
              <span className="vec-form-hint">Tự động nhận diện mã học phần từ tên tệp</span>
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
                    Kéo thả tệp học liệu vào đây hoặc chọn từ máy tính
                  </strong>
                  <span className="vec-dropzone-sub">
                    Hỗ trợ Adobe PDF (.pdf), Microsoft Word (.docx) và PowerPoint (.pptx).
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

            {/* Thanh chuyển nhanh 7 Kịch bản Kiểm thử Hộp mờ UC08 */}
            <div className="vec-scenario-bar">
              <span className="vec-scenario-label">
                Bộ kịch bản mô phỏng kiểm định kỹ thuật (UC08 — 7 Trường hợp biên):
              </span>
              <div className="vec-scenario-pills">
                {SCENARIO_LIST.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    className={[
                      'vec-scenario-btn',
                      sc.danger ? 'danger' : '',
                      activeScenario === sc.id ? 'active' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => handleSelectPresetScenario(sc.id)}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bước 2: Khai báo Metadata học thuật (FR-03 & FR-06) */}
          <div className="vec-upload-card">
            <div className="vec-upload-card-head">
              <h2 className="vec-upload-card-title">
                <span className="vec-step-num">2</span>
                <span>Hồ sơ Học thuật & Gắn mục Chương trình Đào tạo</span>
              </h2>
              <span className="vec-form-hint">Bắt buộc đầy đủ theo Tiêu chí 5</span>
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

            {formError && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--red-3, #ffefef)',
                  border: '1px solid var(--red-7, #cd2b31)',
                  color: 'var(--red-11, #cd2b31)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--slate-6, #e6e8eb)',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--slate-11, #687076)' }}>
                Trạng thái tự động: <strong>{autoCriteriaPassedCount}/5 tiêu chí kỹ thuật đạt</strong>
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onCancel && (
                  <button
                    type="button"
                    className="saas-reset-btn"
                    style={{ height: '36px', padding: '0 14px', fontSize: '12.5px' }}
                    onClick={onCancel}
                  >
                    Hủy bỏ
                  </button>
                )}
                <button
                  type="submit"
                  className="saas-upload-action"
                  disabled={!verificationResult || !verificationResult.isValid}
                  style={{
                    opacity: !verificationResult || !verificationResult.isValid ? 0.45 : 1,
                    cursor: !verificationResult || !verificationResult.isValid ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Send size={14} />
                  <span>Gửi đóng góp học liệu</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: TRẠM KIỂM ĐỊNH KỸ THUẬT UC08 & ĐỐI CHIẾU 8 TIÊU CHÍ (BẢNG 1.2) */}
        <aside className="vec-upload-col" aria-label="Trạm kiểm định kỹ thuật và 8 tiêu chí">
          {/* Khung 1: Binary & SHA-256 Inspector */}
          <div className="vec-upload-card">
            <div className="vec-upload-card-head">
              <h2 className="vec-upload-card-title">
                <span>Phân tích Nhị phân & Mã băm (UC08)</span>
              </h2>
              <span className="vec-form-hint">4 Tầng An ninh FR-06</span>
            </div>

            <Sha256Verifier verificationResult={verificationResult} />
          </div>

          {/* Khung 2: Bảng đối chiếu trực tiếp 8 Tiêu chí Kiểm duyệt (Bảng 1.2 Chương 1) */}
          <div className="vec-upload-card">
            <div className="vec-upload-card-head">
              <h2 className="vec-upload-card-title">
                <span>Đối chiếu 8 Tiêu chí Kiểm duyệt</span>
              </h2>
              <span className="vec-form-hint">Bảng 1.2 • SRS FR-07</span>
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
          </div>
        </aside>
      </form>
    </section>
  )
}
