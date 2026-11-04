import { useState, useMemo } from 'react'
import { Search, Upload, X, ChevronDown, ChevronUp } from 'lucide-react'
import FilterSidebar from './FilterSidebar'
import CurriculumTreeMap from './CurriculumTreeMap'
import DocumentGrid from './DocumentGrid'
import {
  KNOWLEDGE_BLOCKS,
  SEMESTERS,
  DOCUMENT_TYPES
} from '../../data/curriculum'
import { DOC_TYPE_LABELS } from '../../utils/documentCourseApi'

const PAGE_SIZE = 12

function normalizeVietnamese(str = '') {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function DiscoveryPage({
  documents = [],
  courses = [],
  bookmarkedIds = [],
  initialQuery = '',
  onSelectDoc,
  onToggleBookmark,
  onOpenUpload
}) {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [selectedFormat, setSelectedFormat] = useState('ALL')
  const [selectedBlock, setSelectedBlock] = useState(KNOWLEDGE_BLOCKS[0])
  const [selectedSemester, setSelectedSemester] = useState(SEMESTERS[0])
  const [selectedCourseCode, setSelectedCourseCode] = useState('ALL')
  const [selectedDocType, setSelectedDocType] = useState(DOCUMENT_TYPES[0])
  const [sortBy, setSortBy] = useState('popular')
  const [currentPage, setCurrentPage] = useState(1)
  const [isTreeOpen, setIsTreeOpen] = useState(false)

  const activeCourses = useMemo(
    () => courses.filter((c) => c.isActive),
    [courses]
  )

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedFormat('ALL')
    setSelectedBlock(KNOWLEDGE_BLOCKS[0])
    setSelectedSemester(SEMESTERS[0])
    setSelectedCourseCode('ALL')
    setSelectedDocType(DOCUMENT_TYPES[0])
    setSortBy('popular')
    setCurrentPage(1)
  }

  // Đổi bộ lọc nào cũng quay về trang 1
  const withPageReset = (setter) => (value) => {
    setter(value)
    setCurrentPage(1)
  }

  const filteredDocs = useMemo(() => {
    // API công khai chỉ trả mã môn và mã loại tài liệu, nên khối kiến thức và học kỳ lấy từ môn học
    const courseByCode = new Map(activeCourses.map((c) => [c.code, c]))
    const cleanKeyword = normalizeVietnamese(searchQuery)

    const matched = documents.filter((doc) => {
      if (doc.status !== 'APPROVED') return false
      const course = courseByCode.get(doc.courseCode)
      if (!course) return false

      if (selectedFormat !== 'ALL') {
        const docFmt = (
          doc.format ||
          (doc.fileName?.endsWith('.docx') ? 'docx' : doc.fileName?.endsWith('.pptx') ? 'pptx' : 'pdf')
        ).toLowerCase()
        if (docFmt !== selectedFormat.toLowerCase()) return false
      }

      if (selectedBlock !== KNOWLEDGE_BLOCKS[0] && course.knowledgeBlock !== selectedBlock) {
        return false
      }
      if (selectedSemester !== SEMESTERS[0] && course.semester !== selectedSemester) {
        return false
      }
      if (selectedCourseCode !== 'ALL' && doc.courseCode !== selectedCourseCode) {
        return false
      }
      if (selectedDocType !== DOCUMENT_TYPES[0] && (DOC_TYPE_LABELS[doc.docType] || doc.docType) !== selectedDocType) {
        return false
      }

      if (cleanKeyword.length > 0) {
        const haystack = normalizeVietnamese(
          `${doc.title} ${doc.description} ${doc.courseCode} ${doc.courseName} ${doc.uploaderName}`
        )
        const tokens = cleanKeyword.split(' ')
        const allTokensFound = tokens.every((tk) => haystack.includes(tk))
        if (!allTokensFound) return false
      }

      return true
    })

    return [...matched].sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt.localeCompare(a.createdAt)
      if (sortBy === 'rating') return b.ratingAvg - a.ratingAvg
      return b.downloadCount - a.downloadCount
    })
  }, [
    documents,
    activeCourses,
    searchQuery,
    selectedFormat,
    selectedBlock,
    selectedSemester,
    selectedCourseCode,
    selectedDocType,
    sortBy
  ])

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / PAGE_SIZE))
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const activeCourseObj =
    selectedCourseCode !== 'ALL'
      ? activeCourses.find((c) => c.code === selectedCourseCode)
      : null

  const hasActiveFilters =
    selectedFormat !== 'ALL' ||
    selectedBlock !== KNOWLEDGE_BLOCKS[0] ||
    selectedSemester !== SEMESTERS[0] ||
    selectedCourseCode !== 'ALL' ||
    selectedDocType !== DOCUMENT_TYPES[0] ||
    searchQuery.trim().length > 0

  return (
    <section className="discovery-page" aria-label="Kho học liệu">
      <header className="page-head">
        <div>
          <h1 className="page-title">
            {activeCourseObj ? `${activeCourseObj.code} – ${activeCourseObj.name}` : 'Kho học liệu'}
          </h1>
          <p className="page-sub">{filteredDocs.length} tài liệu đã được kiểm duyệt</p>
        </div>

        {onOpenUpload && (
          <button type="button" className="btn-solid-primary" onClick={onOpenUpload}>
            <Upload size={15} />
            <span>Đóng góp tài liệu</span>
          </button>
        )}
      </header>

      <div className="saas-search-box discovery-search">
        <Search size={16} className="saas-search-icon" />
        <input
          id="filter-keyword-input"
          type="search"
          className="saas-search-input"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setCurrentPage(1)
          }}
          placeholder="Tìm theo tên tài liệu, mã môn, tác giả"
          aria-label="Tìm tài liệu"
        />
        {searchQuery && (
          <button
            type="button"
            className="saas-search-clear"
            onClick={() => {
              setSearchQuery('')
              setCurrentPage(1)
            }}
            aria-label="Xóa từ khóa"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <FilterSidebar
        courses={courses}
        selectedBlock={selectedBlock}
        selectedSemester={selectedSemester}
        selectedCourseCode={selectedCourseCode}
        selectedDocType={selectedDocType}
        selectedFormat={selectedFormat}
        sortBy={sortBy}
        onChangeBlock={withPageReset(setSelectedBlock)}
        onChangeSemester={withPageReset(setSelectedSemester)}
        onChangeCourseCode={withPageReset(setSelectedCourseCode)}
        onChangeDocType={withPageReset(setSelectedDocType)}
        onChangeFormat={withPageReset(setSelectedFormat)}
        onChangeSort={setSortBy}
      />

      <div className="discovery-toolbar">
        {hasActiveFilters ? (
          <button type="button" className="btn-ghost nav-auth-link" onClick={handleResetFilters}>
            Xóa bộ lọc
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="btn-ghost nav-auth-link"
          aria-expanded={isTreeOpen}
          onClick={() => setIsTreeOpen((open) => !open)}
        >
          <span>{isTreeOpen ? 'Ẩn chương trình đào tạo' : 'Xem theo chương trình đào tạo'}</span>
          {isTreeOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {isTreeOpen && (
        <CurriculumTreeMap
          courses={courses}
          documents={documents}
          selectedBlock={selectedBlock}
          selectedSemester={selectedSemester}
          selectedCourseCode={selectedCourseCode}
          onSelectBlock={withPageReset(setSelectedBlock)}
          onSelectSemester={withPageReset(setSelectedSemester)}
          onSelectCourse={withPageReset(setSelectedCourseCode)}
          onResetFilters={handleResetFilters}
          onOpenUpload={onOpenUpload}
        />
      )}

      <DocumentGrid
        documents={paginatedDocs}
        totalSystemDocs={documents.length}
        hasActiveFilters={hasActiveFilters}
        bookmarkedIds={bookmarkedIds}
        onSelectDoc={onSelectDoc}
        onToggleBookmark={onToggleBookmark}
        onResetFilters={handleResetFilters}
        onOpenUpload={onOpenUpload}
      />

      {totalPages > 1 && (
        <nav className="saas-pagination" aria-label="Phân trang">
          <span>
            Trang <strong>{currentPage}</strong> / {totalPages}
          </span>
          <div className="saas-page-controls">
            <button
              type="button"
              className="saas-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={`saas-page-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              className="saas-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Sau
            </button>
          </div>
        </nav>
      )}
    </section>
  )
}
