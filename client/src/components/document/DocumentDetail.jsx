import { useState } from 'react'
import { ArrowLeft, Flag, ShieldCheck, Hash, Calendar, User, BookOpen } from 'lucide-react'
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
      {/* Thanh điều hướng quay lại & Breadcrumb môn học */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={onBackToDiscovery}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại Kho học liệu</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="status-badge blue">{documentItem.courseCode} • {documentItem.courseName}</span>
          <span className="status-badge green">{documentItem.docType}</span>
        </div>
      </div>

      {/* Bố cục Reader-First 2 cột: 70% Khung đọc trực tuyến + 30% Cột thông tin, Tải về, Bookmark & Thảo luận */}
      <div className="detail-workspace-grid">
        {/* Cột trái (70%): Trình đọc trang giấy A4 trực tuyến */}
        <div>
          <PdfPreviewViewer
            documentItem={documentItem}
            isAuthenticated={isAuthenticated}
            onRequireLogin={onRequireLogin}
          />
        </div>

        {/* Cột phải cố định (30%): Thông tin tài liệu, Tải về, Bookmark, Thảo luận & Báo cáo */}
        <aside className="detail-sticky-sidebar">
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px',
              boxShadow: 'var(--shadow-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span className="status-badge blue">{documentItem.courseCode}</span>
              <span className="status-badge slate">{documentItem.semester}</span>
              <span className="status-badge green">Đã thẩm định</span>
            </div>

            <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.38 }}>
              {documentItem.title}
            </h1>

            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {documentItem.description}
            </p>

            {/* Nút Tải xuống & Lưu Bookmark */}
            <DownloadAction
              documentItem={documentItem}
              isAuthenticated={isAuthenticated}
              isBookmarked={isBookmarked}
              onDownload={onDownload}
              onToggleBookmark={onToggleBookmark}
              onRequireLogin={onRequireLogin}
            />

            {/* Bảng thông tin học thuật */}
            <div
              style={{
                backgroundColor: 'var(--bg-muted)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '7px',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <BookOpen size={13} /> Học phần:
                </span>
                <strong style={{ color: 'var(--text-primary)', textAlign: 'right' }}>{documentItem.courseName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <User size={13} /> Tác giả:
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>{documentItem.uploaderName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={13} /> Ngày đăng:
                </span>
                <span style={{ color: 'var(--text-primary)' }}>{documentItem.createdAt}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={13} /> Chuẩn kiểm định:
                </span>
                <span style={{ color: 'var(--green-7)', fontWeight: 700 }}>Đạt 8/8 tiêu chí</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <div style={{ color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginBottom: '2px' }}>
                  <Hash size={11} /> Mã băm toàn vẹn SHA-256:
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10.5px',
                    color: 'var(--text-secondary)',
                    wordBreak: 'break-all'
                  }}
                >
                  {documentItem.fileHash}
                </div>
              </div>
            </div>

            {/* Nút Báo cáo tài liệu vi phạm */}
            <button
              type="button"
              onClick={handleOpenDocReport}
              style={{
                width: '100%',
                padding: '7px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'transparent',
                color: 'var(--text-tertiary)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Flag size={13} />
              <span>Báo cáo sai sót hoặc vi phạm học thuật</span>
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
