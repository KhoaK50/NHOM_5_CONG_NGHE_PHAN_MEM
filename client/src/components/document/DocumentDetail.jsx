import { useState } from 'react'
import { ArrowLeft, Download, Flag, Star } from 'lucide-react'
import { DOC_TYPE_LABELS } from '../../utils/documentCourseApi'
import PdfPreviewViewer from './PdfPreviewViewer'
import DownloadAction from './DownloadAction'
import RatingComments from './RatingComments'
import ReportModal from './ReportModal'

export default function DocumentDetail({
  documentItem,
  isAuthenticated = false,
  currentUser,
  isBookmarked = false,
  existingReports = [],
  onBackToDiscovery,
  onDownload,
  onToggleBookmark,
  onAddRatingComment,
  onEditComment,
  onDeleteComment,
  onSubmitReport,
  onRequireLogin
}) {
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportTarget, setReportTarget] = useState({ type: 'DOCUMENT', comment: null })

  if (!documentItem) return null

  const displayDate = (() => {
    const date = new Date(documentItem.createdAt)
    if (Number.isNaN(date.getTime())) return 'Chưa rõ'
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh'
    }).format(date).replaceAll('/', '-')
  })()

  const rating = Number(documentItem.ratingAvg || 0)
  const format = String(documentItem.format || documentItem.fileName?.split('.').pop() || 'pdf').toUpperCase()
  const formatLabel = { PDF: 'PDF', DOCX: 'Word', PPTX: 'PowerPoint' }[format] || format
  const fileSummary = documentItem.pageCount
    ? `${formatLabel} · ${documentItem.pageCount} ${format === 'PPTX' ? 'slide' : 'trang'}`
    : formatLabel

  const handleOpenDocReport = () => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin()
      return
    }
    setReportTarget({ type: 'DOCUMENT', comment: null })
    setReportModalOpen(true)
  }

  const handleOpenCommentReport = (comment) => {
    if (!isAuthenticated) {
      if (onRequireLogin) onRequireLogin()
      return
    }
    setReportTarget({ type: 'COMMENT', comment })
    setReportModalOpen(true)
  }

  return (
    <div>
      {/* Quay lại Kho học liệu */}
      <div style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={onBackToDiscovery}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại Kho học liệu</span>
        </button>
      </div>

      {/* Bố cục Reader-First 2 cột: 70% Khung đọc trực tuyến + 30% Cột thông tin, Tải về, Bookmark & Thảo luận */}
      <div className="detail-workspace-grid">
        {/* Cột trái (70%): Trình đọc trang giấy A4 trực tuyến */}
        <div>
          <PdfPreviewViewer
            documentItem={documentItem}
            isAuthenticated={isAuthenticated}
            onRequireLogin={onRequireLogin}
            onDownload={onDownload}
          />
        </div>

        {/* Cột phải cố định (30%): Thông tin tài liệu, Tải về, Bookmark, Thảo luận & Báo cáo */}
        <aside className="detail-sticky-sidebar">
          <div className="detail-info-card">
            <div className="detail-info-badges">
              <span className="status-badge blue">{documentItem.courseCode}</span>
              <span className="status-badge slate">{DOC_TYPE_LABELS[documentItem.docType] || documentItem.docType}</span>
              <span className="status-badge green">Đã kiểm duyệt</span>
            </div>

            <h1 className="detail-title">{documentItem.title}</h1>

            {documentItem.description && <p className="detail-desc">{documentItem.description}</p>}

            {/* Hai chỉ số cần nổi bật */}
            <div className="detail-highlights">
              <div className="detail-highlight detail-highlight-rating">
                <Star size={18} fill="currentColor" aria-hidden="true" />
                <div>
                  <strong>{rating ? rating.toFixed(1) : 'Mới'}</strong>
                  <span>{rating ? 'điểm đánh giá' : 'chưa có đánh giá'}</span>
                </div>
              </div>
              <div className="detail-highlight detail-highlight-downloads">
                <Download size={18} aria-hidden="true" />
                <div>
                  <strong>{Number(documentItem.downloadCount || 0).toLocaleString('vi-VN')}</strong>
                  <span>lượt tải</span>
                </div>
              </div>
            </div>

            {/* Nút Tải xuống & Lưu Bookmark */}
            <DownloadAction
              documentItem={documentItem}
              isAuthenticated={isAuthenticated}
              isBookmarked={isBookmarked}
              onDownload={onDownload}
              onToggleBookmark={onToggleBookmark}
              onRequireLogin={onRequireLogin}
            />

            <dl className="detail-facts">
              <div><dt>Học phần</dt><dd>{documentItem.courseName}</dd></div>
              <div><dt>Người đăng</dt><dd>{documentItem.uploaderName}</dd></div>
              <div><dt>Ngày đăng</dt><dd><time dateTime={documentItem.createdAt}>{displayDate}</time></dd></div>
              <div><dt>Định dạng</dt><dd>{fileSummary}</dd></div>
            </dl>

            <button type="button" className="detail-report-link" onClick={handleOpenDocReport}>
              <Flag size={14} aria-hidden="true" />
              <span>Báo cáo vi phạm</span>
            </button>
          </div>

          {/* Khu vực Đánh giá & Thảo luận học thuật */}
          <RatingComments
            documentItem={documentItem}
            isAuthenticated={isAuthenticated}
            currentUser={currentUser}
            onAddRatingComment={onAddRatingComment}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            onReportComment={handleOpenCommentReport}
            onRequireLogin={onRequireLogin}
          />
        </aside>
      </div>

      {reportModalOpen && (
        <ReportModal
          targetType={reportTarget.type}
          targetComment={reportTarget.comment}
          documentItem={documentItem}
          existingReports={existingReports}
          currentUser={currentUser}
          onClose={() => setReportModalOpen(false)}
          onSubmitReport={(payload) => {
            onSubmitReport(payload)
            setReportModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
