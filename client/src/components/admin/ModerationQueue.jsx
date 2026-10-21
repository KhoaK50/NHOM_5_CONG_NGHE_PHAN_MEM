import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  EyeOff,
  ShieldAlert,
  FileCheck,
  FileText,
  Trash2,
  MessageSquare,
  ShieldCheck
} from 'lucide-react'
import CriteriaChecklist from './CriteriaChecklist'
import RejectReasonModal from './RejectReasonModal'
import PdfPreviewViewer from '../document/PdfPreviewViewer'

export default function ModerationQueue({
  documents = [],
  reports = [],
  onApproveDocument,
  onRejectDocument,
  onResolveReport
}) {
  const pendingDocs = documents.filter((d) => d.status === 'PENDING')
  const pendingReports = reports.filter((r) => r.status === 'PENDING')

  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'reports'
  const [selectedDocId, setSelectedDocId] = useState(pendingDocs[0]?.id || null)

  const currentDoc =
    pendingDocs.find((d) => d.id === selectedDocId) || pendingDocs[0] || null

  // Tự động quét 4 tiêu chí kỹ thuật: TC1 format, TC2 size, TC3 course, TC7 title
  const evaluateInitialChecks = (doc) => {
    if (!doc) {
      return { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true }
    }
    const fmt = (doc.format || doc.fileName?.split('.').pop() || '').toLowerCase()
    const isFormatOk = ['pdf', 'docx', 'pptx'].includes(fmt)
    const isSizeOk = (doc.fileSizeMb || 0) <= 25
    const isCourseOk = Boolean(doc.courseCode)
    const isTitleOk = (doc.title || '').trim().length >= 10

    return {
      1: isFormatOk,
      2: isSizeOk,
      3: isCourseOk,
      4: true,
      5: true,
      6: true,
      7: isTitleOk,
      8: true
    }
  }

  const [criteriaChecks, setCriteriaChecks] = useState(() => evaluateInitialChecks(currentDoc))
  const [rejectingDoc, setRejectingDoc] = useState(null)

  const handleSelectDoc = (doc) => {
    setSelectedDocId(doc.id)
    setCriteriaChecks(evaluateInitialChecks(doc))
  }

  const handleToggleCriterion = (id) => {
    setCriteriaChecks((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCheckAll = () => {
    setCriteriaChecks({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true })
  }

  const handleResetChecks = () => {
    setCriteriaChecks(evaluateInitialChecks(currentDoc))
  }

  const allEightChecked = [1, 2, 3, 4, 5, 6, 7, 8].every((id) => Boolean(criteriaChecks[id]))

  return (
    <div>
      {/* Header & Sub-tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Hàng đợi Kiểm duyệt Học thuật (FR-07, FR-11 / UC09)
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Thẩm định trực tiếp học liệu đa định dạng (.pdf, .docx, .pptx) bên trái và xác nhận bảng kiểm 8 tiêu chí bên phải trước khi xuất bản.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={activeTab === 'pending' ? 'btn-solid-primary' : 'btn-ghost'}
          >
            Chờ thẩm định ({pendingDocs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={activeTab === 'reports' ? 'btn-solid-primary' : 'btn-ghost'}
          >
            Báo cáo vi phạm ({pendingReports.length})
          </button>
        </div>
      </div>

      {activeTab === 'pending' ? (
        pendingDocs.length === 0 ? (
          <div className="empty-state-box">
            <FileCheck size={38} style={{ color: 'var(--green-9)', marginBottom: '10px' }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Hàng đợi kiểm duyệt đã được xử lý hoàn tất
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Hiện không còn tài liệu nào đang chờ thẩm định.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Thanh chọn nhanh hồ sơ chờ duyệt */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px'
              }}
            >
              {pendingDocs.map((doc) => {
                const isSelected = currentDoc && currentDoc.id === doc.id
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => handleSelectDoc(doc)}
                    style={{
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: isSelected
                        ? '1.5px solid var(--primary-base)'
                        : '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'var(--blue-1)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="status-badge blue">{doc.courseCode}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                        {doc.format || 'PDF'} • {doc.fileSizeMb || 2.4}MB
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '4px',
                        lineHeight: 1.35
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                        {doc.title}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      Tác giả: {doc.uploaderName} • Ngày gửi: {doc.createdAt}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Khung duyệt bài chia đôi (Split-Review Stage: Trái xem toàn văn PDF/Word/PPTX - Phải duyệt 8 tiêu chí) */}
            {currentDoc && (
              <div className="admin-split-review-grid">
                {/* Cột Trái: Xem toàn văn học liệu thực tế */}
                <div>
                  <PdfPreviewViewer documentItem={currentDoc} isAuthenticated={true} />
                </div>

                {/* Cột Phải: Thông tin hồ sơ + Checklist 8 tiêu chí + Quyết định Phê duyệt / Từ chối */}
                <aside
                  style={{
                    position: 'sticky',
                    top: '78px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '22px',
                    boxShadow: 'var(--shadow-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span className="status-badge blue">{currentDoc.courseCode}</span>
                      <span className="status-badge slate">{currentDoc.docType || 'Học liệu'}</span>
                      <span className="status-badge amber">{(currentDoc.format || 'pdf').toUpperCase()}</span>
                    </div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                      {currentDoc.title}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Người đóng góp: <strong>{currentDoc.uploaderName}</strong> • SHA-256:{' '}
                      <code style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--blue-11)' }}>
                        {currentDoc.fileHash ? currentDoc.fileHash.slice(0, 18) : 'e3b0c44298fc1c149a'}...
                      </code>
                    </div>
                  </div>

                  <CriteriaChecklist
                    checks={criteriaChecks}
                    onToggleCriterion={handleToggleCriterion}
                    onCheckAll={handleCheckAll}
                    onResetChecks={handleResetChecks}
                  />

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      disabled={!allEightChecked}
                      onClick={() => onApproveDocument(currentDoc.id)}
                      style={{
                        flex: 1,
                        backgroundColor: 'var(--green-9, #30a46c)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: allEightChecked ? 'pointer' : 'not-allowed',
                        opacity: allEightChecked ? 1 : 0.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'opacity 0.15s ease'
                      }}
                      title={allEightChecked ? 'Phê duyệt tài liệu đạt chuẩn 8 tiêu chí' : 'Vui lòng tích chọn đủ 8 tiêu chí để phê duyệt'}
                    >
                      <CheckCircle2 size={16} />
                      <span>Phê duyệt & Xuất bản (+20 điểm)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRejectingDoc(currentDoc)}
                      style={{
                        backgroundColor: 'var(--red-9, #e5484d)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <XCircle size={16} />
                      <span>Từ chối</span>
                    </button>
                  </div>
                </aside>
              </div>
            )}
          </div>
        )
      ) : (
        /* Tab 2: Xử lý báo cáo vi phạm (Học liệu & Bình luận) */
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Danh sách Báo cáo Vi phạm Chờ xử lý ({pendingReports.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Xử lý nhanh báo cáo học liệu và bình luận vi phạm văn hóa học thuật
            </span>
          </div>

          {pendingReports.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <ShieldCheck size={32} style={{ color: 'var(--green-9)', margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Không có báo cáo vi phạm nào đang chờ xử lý
              </div>
              <span style={{ fontSize: '12.5px' }}>Hệ thống học liệu và bình luận hiện đang đạt chuẩn mực an toàn.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {pendingReports.map((rep) => {
                const isCommentReport = rep.targetType === 'COMMENT'
                return (
                  <div
                    key={rep.id}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '10px',
                      border: '1px solid var(--red-2)',
                      backgroundColor: 'var(--red-1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '14px'
                    }}
                  >
                    <div style={{ maxWidth: '740px', flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span className="status-badge red">
                          <ShieldAlert size={12} /> {rep.reasonGroup}
                        </span>
                        {isCommentReport ? (
                          <span className="status-badge amber">
                            <MessageSquare size={12} /> Báo cáo Bình luận
                          </span>
                        ) : (
                          <span className="status-badge blue">
                            <FileText size={12} /> Báo cáo Học liệu
                          </span>
                        )}
                        <span className="status-badge slate">{rep.courseCode}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          Người phản ánh: {rep.reporterName} • {rep.createdAt}
                        </span>
                      </div>

                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                        Tài liệu liên quan: {rep.docTitle}
                      </strong>

                      {/* Nếu là báo cáo bình luận: hiển thị trích dẫn nội dung bình luận */}
                      {isCommentReport && (
                        <div
                          style={{
                            padding: '8px 12px',
                            margin: '8px 0',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '12.5px',
                            color: 'var(--text-primary)',
                            lineHeight: 1.45
                          }}
                        >
                          <span style={{ fontWeight: 700, color: 'var(--red-9)', display: 'block', marginBottom: '2px' }}>
                            Nội dung bình luận bị phản ánh (Tác giả: {rep.commentAuthor || 'Ẩn danh'}):
                          </span>
                          <em>&ldquo;{rep.commentContent || rep.details}&rdquo;</em>
                        </div>
                      )}

                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Chi tiết phản ánh từ người dùng: &ldquo;{rep.details}&rdquo;
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => onResolveReport(rep.id, rep.docId, 'DISMISS', rep.targetType)}
                      >
                        Bỏ qua báo cáo
                      </button>

                      {isCommentReport ? (
                        <button
                          type="button"
                          onClick={() => onResolveReport(rep.id, rep.docId, 'DELETE_COMMENT', 'COMMENT', rep.commentId)}
                          style={{
                            backgroundColor: 'var(--red-9, #e5484d)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 14px',
                            fontWeight: 700,
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Xóa bình luận vi phạm</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onResolveReport(rep.id, rep.docId, 'HIDE_DOC', 'DOCUMENT')}
                            style={{
                              backgroundColor: 'var(--amber-9, #ffb224)',
                              color: '#11181c',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 14px',
                              fontWeight: 700,
                              fontSize: '12.5px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <EyeOff size={14} />
                            <span>Tạm ẩn tài liệu</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onResolveReport(rep.id, rep.docId, 'DELETE_DOC', 'DOCUMENT')}
                            style={{
                              backgroundColor: 'var(--red-9, #e5484d)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 14px',
                              fontWeight: 700,
                              fontSize: '12.5px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Gỡ vĩnh viễn</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {rejectingDoc && (
        <RejectReasonModal
          documentItem={rejectingDoc}
          onClose={() => setRejectingDoc(null)}
          onConfirmReject={(docId, reasonText) => {
            onRejectDocument(docId, reasonText)
            setRejectingDoc(null)
          }}
        />
      )}
    </div>
  )
}
