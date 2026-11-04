import { useState } from 'react'
import { ArrowLeft, Flag } from 'lucide-react'
import PdfPreviewViewer from './PdfPreviewViewer'
import DownloadAction from './DownloadAction'
import RatingComments from './RatingComments'
import ReportModal from './ReportModal'
import { DOC_TYPE_LABELS } from '../../utils/documentCourseApi'

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN')
}

export default function DocumentDetail({
  documentItem,
  isAuthenticated = false,
  canBookmark = false,
  canReport = false,
  canComment = false,
  currentUser,
  isBookmarked = false,
  onBackToDiscovery,
  onDownload,
  onToggleBookmark,
  onRequireLogin
}) {
  const [reportModalOpen, setReportModalOpen] = useState(false)

  if (!documentItem) return null

  const format = (documentItem.format || documentItem.fileName?.split('.').pop() || 'pdf').toUpperCase()
  const fileInfo = [
    format,
    documentItem.fileSizeMb ? `${Number(documentItem.fileSizeMb).toFixed(2)} MB` : null,
    `${documentItem.downloadCount || 0} lượt tải`
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div>
      <button
        type="button"
        className="btn-ghost nav-auth-link"
        onClick={onBackToDiscovery}
        style={{ marginBottom: '12px' }}
      >
        <ArrowLeft size={16} />
        <span>Quay lại Kho học liệu</span>
      </button>

      <div className="detail-workspace-grid">
        <div>
          <PdfPreviewViewer
            documentItem={documentItem}
            isAuthenticated={isAuthenticated}
            onRequireLogin={onRequireLogin}
          />
        </div>

        <aside className="detail-sticky-sidebar">
          <div className="detail-info">
            <div>
              <span className="status-badge blue">
                {documentItem.courseCode} · {DOC_TYPE_LABELS[documentItem.docType] || documentItem.docType}
              </span>
            </div>

            <h1 className="detail-title">{documentItem.title}</h1>
            <p className="detail-desc">{documentItem.description}</p>

            <DownloadAction
              documentItem={documentItem}
              isAuthenticated={isAuthenticated}
              canBookmark={canBookmark}
              isBookmarked={isBookmarked}
              onDownload={onDownload}
              onToggleBookmark={onToggleBookmark}
              onRequireLogin={onRequireLogin}
            />

            <dl className="detail-meta">
              <div>
                <dt>Môn học</dt>
                <dd>{documentItem.courseName}</dd>
              </div>
              <div>
                <dt>Người đăng</dt>
                <dd>{documentItem.uploaderName}</dd>
              </div>
              <div>
                <dt>Ngày đăng</dt>
                <dd>{formatDate(documentItem.createdAt)}</dd>
              </div>
              <div>
                <dt>Tệp</dt>
                <dd>{fileInfo}</dd>
              </div>
            </dl>

            {canReport && (
              <button type="button" className="detail-report" onClick={() => setReportModalOpen(true)}>
                <Flag size={13} />
                <span>Báo cáo vi phạm</span>
              </button>
            )}
          </div>

          <RatingComments
            documentItem={documentItem}
            isAuthenticated={isAuthenticated}
            canInteract={canComment}
            currentUser={currentUser}
            onRequireLogin={onRequireLogin}
          />
        </aside>
      </div>

      {reportModalOpen && (
        <ReportModal documentItem={documentItem} onClose={() => setReportModalOpen(false)} />
      )}
    </div>
  )
}
