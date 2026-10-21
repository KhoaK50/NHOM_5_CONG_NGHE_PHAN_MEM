import { useState, useMemo } from 'react'
import {
  Search,
  Upload,
  LayoutGrid,
  List,
  X
} from 'lucide-react'
import FilterSidebar from './FilterSidebar'
import CurriculumTreeMap from './CurriculumTreeMap'
import DocumentGrid from './DocumentGrid'
import {
  KNOWLEDGE_BLOCKS,
  SEMESTERS,
  CURRICULUM_SEMESTERS_META,
  DOCUMENT_TYPES
} from '../../data/mockData'

const PAGE_SIZE = 12

function normalizeVietnamese(str = '') {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  onSelectDoc,
  onToggleBookmark,
  onOpenUpload
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('ALL')
  const [selectedBlock, setSelectedBlock] = useState(KNOWLEDGE_BLOCKS[0])
  const [selectedSemester, setSelectedSemester] = useState(SEMESTERS[0])
  const [selectedCourseCode, setSelectedCourseCode] = useState('ALL')
  const [selectedDocType, setSelectedDocType] = useState(DOCUMENT_TYPES[0])
  const [sortBy, setSortBy] = useState('popular')
  const [viewMode, setViewMode] = useState('grid')
  const [currentPage, setCurrentPage] = useState(1)

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

  const filteredDocs = useMemo(() => {
    const activeCourseCodes = new Set(activeCourses.map((c) => c.code))
    const cleanKeyword = normalizeVietnamese(searchQuery)

    const matched = documents.filter((doc) => {
      if (doc.status !== 'APPROVED') return false
      if (!activeCourseCodes.has(doc.courseCode)) return false

      if (selectedFormat !== 'ALL') {
        const docFmt = (
          doc.format ||
          (doc.fileName?.endsWith('.docx') ? 'docx' : doc.fileName?.endsWith('.pptx') ? 'pptx' : 'pdf')
        ).toLowerCase()
        if (docFmt !== selectedFormat.toLowerCase()) return false
      }

      if (selectedBlock !== KNOWLEDGE_BLOCKS[0] && doc.knowledgeBlock !== selectedBlock) {
        return false
      }
      if (selectedSemester !== SEMESTERS[0] && doc.semester !== selectedSemester) {
        return false
      }
      if (selectedCourseCode !== 'ALL' && doc.courseCode !== selectedCourseCode) {
        return false
      }
      if (selectedDocType !== DOCUMENT_TYPES[0] && doc.docType !== selectedDocType) {
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

  // Ngữ cảnh tiêu đề động theo Môn học / Khối kiến thức / Học kỳ đang chọn
  const activeCourseObj =
    selectedCourseCode !== 'ALL'
      ? activeCourses.find((c) => c.code === selectedCourseCode)
      : null
  const activeSemMeta =
    selectedSemester !== SEMESTERS[0]
      ? CURRICULUM_SEMESTERS_META.find((s) => s.id === selectedSemester)
      : null

  const contextTitle = activeCourseObj
    ? `${activeCourseObj.code} — ${activeCourseObj.name}`
    : selectedBlock !== KNOWLEDGE_BLOCKS[0]
      ? `Khối kiến thức: ${selectedBlock}`
      : activeSemMeta
        ? `${activeSemMeta.id} (${activeSemMeta.credits} Tín chỉ) — ${activeSemMeta.focus}`
        : 'Kho Học Liệu Ngành Sư Phạm Tin Học'

  const contextSubtitle = activeCourseObj
    ? `${activeCourseObj.knowledgeBlock} • ${activeCourseObj.semester} (${activeCourseObj.credits} tín chỉ) • Khoa Công nghệ Thông tin – ĐH Sư phạm TP.HCM`
    : 'Hệ thống lưu trữ, thẩm định và phân loại học liệu theo Khối kiến thức, Môn học SPTH và Loại tài liệu chuẩn CTĐT ĐH Sư phạm TP.HCM (HCMUE).'

  const hasActiveFilters =
    selectedFormat !== 'ALL' ||
    selectedBlock !== KNOWLEDGE_BLOCKS[0] ||
    selectedSemester !== SEMESTERS[0] ||
    selectedCourseCode !== 'ALL' ||
    selectedDocType !== DOCUMENT_TYPES[0] ||
    searchQuery.trim().length > 0

  return (
    <section className="saas-workspace" aria-label="Không gian tra cứu học liệu Sư phạm Tin học">
      <FilterSidebar
        courses={courses}
        documents={documents}
        selectedBlock={selectedBlock}
        selectedSemester={selectedSemester}
        selectedCourseCode={selectedCourseCode}
        selectedDocType={selectedDocType}
        onChangeBlock={(val) => {
          setSelectedBlock(val)
          setCurrentPage(1)
        }}
        onChangeCourseCode={(val) => {
          setSelectedCourseCode(val)
          setCurrentPage(1)
        }}
        onChangeDocType={(val) => {
          setSelectedDocType(val)
          setCurrentPage(1)
        }}
        onResetFilters={handleResetFilters}
      />

      <main className="saas-main">
        {/* 1. Vectoria Academic Header & Breadcrumb (.bc + .view-title + .view-desc) */}
        <header className="saas-context-header">
          <div className="saas-context-info">
            <nav className="saas-breadcrumb" aria-label="Đường dẫn danh mục học thuật">
              <span
                className="saas-breadcrumb-link"
                onClick={handleResetFilters}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleResetFilters()
                }}
              >
                Kho học liệu
              </span>
              <span className="saas-breadcrumb-sep">›</span>
              <span
                className="saas-breadcrumb-link"
                onClick={() => {
                  setSelectedCourseCode('ALL')
                  setCurrentPage(1)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSelectedCourseCode('ALL')
                    setCurrentPage(1)
                  }
                }}
              >
                {selectedBlock === KNOWLEDGE_BLOCKS[0] ? 'Tất cả khối kiến thức' : selectedBlock}
              </span>
              {selectedSemester !== SEMESTERS[0] && (
                <>
                  <span className="saas-breadcrumb-sep">›</span>
                  <span className="saas-breadcrumb-current">{selectedSemester}</span>
                </>
              )}
              {activeCourseObj && (
                <>
                  <span className="saas-breadcrumb-sep">›</span>
                  <span className="saas-breadcrumb-current">
                    {activeCourseObj.code} – {activeCourseObj.name}
                  </span>
                </>
              )}
            </nav>
            <h1 className="saas-context-title">{contextTitle}</h1>
            <p className="saas-context-desc">{contextSubtitle}</p>
          </div>

          <button
            type="button"
            className="saas-upload-action"
            onClick={onOpenUpload}
          >
            <Upload size={14} />
            <span>Đóng góp học liệu</span>
          </button>
        </header>

        {/* 1.5. Sơ đồ Cây Chương trình Đào tạo Tương tác 8 Học kỳ (Đồng bộ 2 chiều với FR-03 & FR-04) */}
        <CurriculumTreeMap
          courses={courses}
          documents={documents}
          selectedBlock={selectedBlock}
          selectedSemester={selectedSemester}
          selectedCourseCode={selectedCourseCode}
          onSelectBlock={(blk) => {
            setSelectedBlock(blk)
            setCurrentPage(1)
          }}
          onSelectSemester={(sem) => {
            setSelectedSemester(sem)
            setCurrentPage(1)
          }}
          onSelectCourse={(code) => {
            setSelectedCourseCode(code)
            setCurrentPage(1)
          }}
          onResetFilters={handleResetFilters}
        />

        {/* 2. Vectoria Multi-Criteria Filter Panel (.pathfinding-panel -> .vec-filter-panel / FR-04 & UC05) */}
        <div className="vec-filter-panel" role="region" aria-label="Bộ lọc đa tiêu chí FR-04">
          <div className="vec-filter-grid">
            {/* Cột 1: Từ khóa FTS */}
            <div className="vec-pf-group">
              <label className="vec-pf-label" htmlFor="filter-keyword-input">
                Từ khóa tìm kiếm (FTS)
              </label>
              <div className="saas-search-box">
                <Search size={14} className="saas-search-icon" />
                <input
                  id="filter-keyword-input"
                  type="search"
                  className="saas-search-input"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Nhập mã môn (COMP1818, COMP1044), tên bài, chủ đề..."
                  aria-label="Thanh tìm kiếm học liệu toàn văn"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="saas-search-clear"
                    onClick={() => {
                      setSearchQuery('')
                      setCurrentPage(1)
                    }}
                    aria-label="Xóa từ khóa tìm kiếm"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Cột 2: Lọc theo Môn học SPTH (FR-03 / FR-04) */}
            <div className="vec-pf-group">
              <label className="vec-pf-label" htmlFor="filter-course-select">
                Môn học SPTH
              </label>
              <select
                id="filter-course-select"
                className="saas-sort-select"
                value={selectedCourseCode}
                onChange={(e) => {
                  setSelectedCourseCode(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="ALL">Tất cả môn học ({activeCourses.length} HP)</option>
                {activeCourses.map((crs) => (
                  <option key={crs.id} value={crs.code}>
                    {crs.code} – {crs.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cột 3: Lọc theo Học kỳ CTĐT (FR-04) */}
            <div className="vec-pf-group">
              <label className="vec-pf-label" htmlFor="filter-semester-select">
                Học kỳ CTĐT
              </label>
              <select
                id="filter-semester-select"
                className="saas-sort-select"
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value)
                  setCurrentPage(1)
                }}
              >
                {SEMESTERS.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </select>
            </div>

            {/* Cột 4: Lọc theo Định dạng tệp (FR-04) */}
            <div className="vec-pf-group">
              <label className="vec-pf-label" htmlFor="filter-format-select">
                Định dạng tệp
              </label>
              <select
                id="filter-format-select"
                className="saas-sort-select"
                value={selectedFormat}
                onChange={(e) => {
                  setSelectedFormat(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="ALL">Tất cả (.pdf, .docx, .pptx)</option>
                <option value="pdf">Tài liệu PDF (.pdf)</option>
                <option value="docx">Văn bản Word (.docx)</option>
                <option value="pptx">Bài trình chiếu (.pptx)</option>
              </select>
            </div>

            {/* Cột 5: Độ phổ biến / Sắp xếp (FR-04) */}
            <div className="vec-pf-group">
              <label className="vec-pf-label" htmlFor="filter-sort-select">
                Sắp xếp theo
              </label>
              <select
                id="filter-sort-select"
                className="saas-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="popular">Phổ biến nhất (Lượt tải)</option>
                <option value="rating">Đánh giá cao nhất</option>
                <option value="newest">Mới xuất bản</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Vectoria Segmented Tabs (.diagram-tabs / .dtab) cho Loại tài liệu (FR-03) & Chế độ xem */}
        <div className="vec-tabs-toolbar">
          <div className="vec-diagram-tabs" role="tablist" aria-label="Phân loại theo loại học liệu">
            {DOCUMENT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={selectedDocType === type}
                className={`vec-dtab ${selectedDocType === type ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDocType(type)
                  setCurrentPage(1)
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="vec-diagram-tabs" role="group" aria-label="Chế độ hiển thị">
            <button
              type="button"
              className={`vec-dtab ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Chế độ Lưới"
              aria-label="Hiển thị dạng Lưới"
            >
              <LayoutGrid size={13} />
              <span>Lưới</span>
            </button>
            <button
              type="button"
              className={`vec-dtab ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Chế độ Bảng danh sách"
              aria-label="Hiển thị dạng Danh sách"
            >
              <List size={13} />
              <span>Danh sách</span>
            </button>
          </div>
        </div>

        {/* 4. Thanh trạng thái kết quả & thẻ lọc đang áp dụng */}
        <div className="saas-status-bar">
          <span className="saas-result-summary">
            Hiển thị <strong>{filteredDocs.length}</strong> học liệu đã thẩm định
          </span>

          {hasActiveFilters && (
            <div className="saas-filter-tags">
              {selectedBlock !== KNOWLEDGE_BLOCKS[0] && (
                <span className="saas-filter-tag">
                  <span>Khối: {selectedBlock}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBlock(KNOWLEDGE_BLOCKS[0])
                      setCurrentPage(1)
                    }}
                    aria-label="Bỏ lọc khối kiến thức"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedCourseCode !== 'ALL' && (
                <span className="saas-filter-tag">
                  <span>Môn: {selectedCourseCode}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourseCode('ALL')
                      setCurrentPage(1)
                    }}
                    aria-label="Bỏ lọc môn học"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedSemester !== SEMESTERS[0] && (
                <span className="saas-filter-tag">
                  <span>{selectedSemester}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSemester(SEMESTERS[0])
                      setCurrentPage(1)
                    }}
                    aria-label="Bỏ lọc học kỳ"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedDocType !== DOCUMENT_TYPES[0] && (
                <span className="saas-filter-tag">
                  <span>Loại: {selectedDocType}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDocType(DOCUMENT_TYPES[0])
                      setCurrentPage(1)
                    }}
                    aria-label="Bỏ lọc loại học liệu"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedFormat !== 'ALL' && (
                <span className="saas-filter-tag">
                  <span>Định dạng: .{selectedFormat.toLowerCase()}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFormat('ALL')
                      setCurrentPage(1)
                    }}
                    aria-label="Bỏ lọc định dạng"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* 5. Lưới / Bảng Học liệu chuẩn Vectoria */}
        <DocumentGrid
          documents={paginatedDocs}
          bookmarkedIds={bookmarkedIds}
          viewMode={viewMode}
          pageOffset={(currentPage - 1) * PAGE_SIZE}
          onSelectDoc={onSelectDoc}
          onToggleBookmark={onToggleBookmark}
          onResetFilters={handleResetFilters}
        />

        {/* 6. Phân trang */}
        {totalPages > 1 && (
          <nav className="saas-pagination" aria-label="Phân trang danh sách học liệu">
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
      </main>
    </section>
  )
}
