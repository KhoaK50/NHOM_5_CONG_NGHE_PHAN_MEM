import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  EyeOff,
  FileCheck,
  FileText,
  Flag,
  Hash,
  ShieldCheck,
  Trash2,
  XCircle
} from 'lucide-react'
import CriteriaChecklist from './CriteriaChecklist'
import RejectReasonModal from './RejectReasonModal'
import ResolveReportModal from './ResolveReportModal'
import {
  AUTO_CRITERIA,
  DOC_TYPE_LABELS,
  MANUAL_CRITERIA,
  REPORT_REASON_LABELS,
  formatBytes,
  formatRelativeTime,
  getModerationDocument,
  isSafeHttpsUrl,
  listModerationDocuments,
  listReports,
  moderateDocument,
  resolveReport
} from '../../utils/documentCourseApi'

const PAGE_SIZE = 10

const DOCUMENT_STATUS_BADGES = {
  APPROVED: { label: 'Đang hiển thị', className: 'green' },
  HIDDEN: { label: 'Đang ẩn', className: 'amber' },
  REJECTED: { label: 'Bị từ chối', className: 'red' },
  PENDING: { label: 'Chờ duyệt', className: 'blue' },
  DELETED: { label: 'Đã xóa', className: 'slate' }
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div
      role="alert"
      style={{
        padding: '12px 14px',
        borderRadius: '10px',
        backgroundColor: 'var(--red-3)',
        border: '1px solid var(--red-6)',
        color: 'var(--red-12)',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}
    >
      <AlertTriangle size={16} style={{ color: 'var(--red-11)', flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry && (
        <button type="button" className="btn-ghost" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  )
}

function PageControls({ page, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const buttonStyle = { padding: '4px 8px', display: 'inline-flex', alignItems: 'center' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
        Trang {page}/{totalPages}
      </span>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button type="button" className="btn-ghost" style={buttonStyle} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Trang trước">
          <ChevronLeft size={14} />
        </button>
        <button type="button" className="btn-ghost" style={buttonStyle} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Trang sau">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

function DocumentReader({ detail }) {
  const canEmbed = isSafeHttpsUrl(detail.fileUrl)
  return (
    <section
      aria-label="Xem toàn văn tài liệu"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        minWidth: 0
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          backgroundColor: 'var(--bg-muted)',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <FileText size={16} style={{ color: 'var(--primary-base)', flexShrink: 0 }} />
        <strong
          title={detail.fileName}
          style={{ flex: 1, minWidth: 0, fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}
        >
          {detail.fileName}
        </strong>
        <span className="status-badge green">Toàn văn • {detail.pageCount} trang</span>
      </div>

      {canEmbed ? (
        <iframe
          src={detail.fileUrl}
          title={`Nội dung tài liệu ${detail.title}`}
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '640px', border: 'none', display: 'block', backgroundColor: '#eef0f3' }}
        />
      ) : (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Đường dẫn tệp không hợp lệ nên không thể hiển thị. Vui lòng từ chối tài liệu để tác giả tải lại.
        </div>
      )}

      {canEmbed && (
        <div style={{ padding: '10px 16px', backgroundColor: 'var(--bg-muted)', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Khung xem không hiển thị?{' '}
          <a
            href={detail.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--primary-base)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <span>Mở tệp ở tab mới</span>
            <ExternalLink size={12} />
          </a>
        </div>
      )}
    </section>
  )
}

function buildEmptyChecks() {
  return Object.fromEntries(MANUAL_CRITERIA.map((item) => [item.key, false]))
}

export default function ModerationQueue({ onNotice, onPendingCountChange }) {
  const [activeTab, setActiveTab] = useState('pending') // 'pending' | 'reports'

  // Hàng đợi tài liệu
  const [docs, setDocs] = useState([])
  const [docPage, setDocPage] = useState(1)
  const [docTotal, setDocTotal] = useState(0)
  const [selectedDocId, setSelectedDocId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [checks, setChecks] = useState(buildEmptyChecks)
  const [rejectingDoc, setRejectingDoc] = useState(null)

  // Báo cáo vi phạm
  const [reports, setReports] = useState([])
  const [reportPage, setReportPage] = useState(1)
  const [reportTotal, setReportTotal] = useState(0)
  const [resolving, setResolving] = useState(null) // { report, action }

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [listError, setListError] = useState('')
  const [actionError, setActionError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      listModerationDocuments({ status: 'PENDING', page: docPage, limit: PAGE_SIZE }),
      listReports({ status: 'PENDING', page: reportPage, limit: PAGE_SIZE })
    ])
      .then(([docResult, reportResult]) => {
        if (cancelled) return
        setDocs(docResult.data)
        setDocTotal(docResult.pagination.total)
        setReports(reportResult.data)
        setReportTotal(reportResult.pagination.total)
        setListError('')
        setSelectedDocId((current) =>
          docResult.data.some((doc) => doc.id === current) ? current : docResult.data[0]?.id ?? null
        )
        onPendingCountChange?.(docResult.pagination.total + reportResult.pagination.total)
      })
      .catch((err) => {
        if (!cancelled) setListError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [docPage, reportPage, reloadKey, onPendingCountChange])

  // Mỗi tài liệu bắt đầu với bảng kiểm trống: Admin phải tự xác nhận sau khi đọc.
  useEffect(() => {
    if (!selectedDocId) return undefined
    let cancelled = false
    getModerationDocument(selectedDocId)
      .then((result) => {
        if (cancelled) return
        setDetail(result.data)
        setChecks(buildEmptyChecks())
      })
      .catch((err) => {
        if (!cancelled) setListError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [selectedDocId])

  const currentDetail = detail && detail.id === selectedDocId ? detail : null
  const autoChecks = currentDetail?.autoChecks || {}
  const isFileOk = Boolean(autoChecks.formatOk && autoChecks.sizeOk)
  const autoPassed = AUTO_CRITERIA.every((item) => autoChecks[item.key])
  const remainingManual = MANUAL_CRITERIA.filter((item) => !checks[item.key]).length
  const canApprove = Boolean(currentDetail) && isFileOk && autoPassed && remainingManual === 0

  const handleModerationError = (err) => {
    if (err.code === 'DOCUMENT_NOT_PENDING') {
      onNotice?.('Tài liệu này đã được Admin khác xử lý, danh sách đã được làm mới.')
      setRejectingDoc(null)
      reload()
      return
    }
    setActionError(err.message)
  }

  const handleApprove = async () => {
    if (!canApprove || submitting) return
    setSubmitting(true)
    setActionError('')
    try {
      await moderateDocument(currentDetail.id, {
        decision: 'APPROVE',
        criteria: {
          ...checks,
          metadataComplete: Boolean(autoChecks.metadataComplete),
          notDuplicate: Boolean(autoChecks.notDuplicate)
        }
      })
      onNotice?.('Đã phê duyệt và xuất bản tài liệu, tác giả được cộng +20 điểm.')
      reload()
    } catch (err) {
      handleModerationError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmReject = async (docId, reason) => {
    setSubmitting(true)
    setActionError('')
    try {
      await moderateDocument(docId, { decision: 'REJECT', reason })
      setRejectingDoc(null)
      onNotice?.('Đã từ chối tài liệu và gửi lý do tới tác giả.')
      reload()
    } catch (err) {
      handleModerationError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmResolve = async (adminNote) => {
    setSubmitting(true)
    setActionError('')
    try {
      await resolveReport(resolving.report.id, { action: resolving.action, adminNote })
      setResolving(null)
      onNotice?.('Đã xử lý báo cáo và gửi thông báo cho các bên liên quan.')
      reload()
    } catch (err) {
      if (err.code === 'REPORT_ALREADY_RESOLVED' || err.code === 'INVALID_DOCUMENT_STATE') {
        setResolving(null)
        onNotice?.(err.message)
        reload()
      } else {
        setActionError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div style={{ flex: '1 1 420px' }}>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>Hàng đợi kiểm duyệt</h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            {activeTab === 'pending'
              ? 'Xem toàn văn tài liệu, xác nhận đủ 8 tiêu chí rồi mới phê duyệt. Tài liệu gửi sớm nhất được xếp lên đầu.'
              : 'Xử lý báo cáo vi phạm: mỗi quyết định cần ghi chú để lưu nhật ký và thông báo cho các bên liên quan.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }} role="tablist" aria-label="Loại công việc kiểm duyệt">
          <button type="button" role="tab" aria-selected={activeTab === 'pending'} onClick={() => setActiveTab('pending')} className={activeTab === 'pending' ? 'btn-solid-primary' : 'btn-ghost'}>
            Chờ thẩm định ({docTotal})
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'reports'} onClick={() => setActiveTab('reports')} className={activeTab === 'reports' ? 'btn-solid-primary' : 'btn-ghost'}>
            Báo cáo vi phạm ({reportTotal})
          </button>
        </div>
      </div>

      {listError && (
        <div style={{ marginBottom: '16px' }}>
          <ErrorBanner message={listError} onRetry={reload} />
        </div>
      )}

      {loading ? (
        <div className="empty-state-box" aria-busy="true">
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Đang tải dữ liệu kiểm duyệt...</p>
        </div>
      ) : activeTab === 'pending' ? (
        docs.length === 0 ? (
          !listError && (
            <div className="empty-state-box">
              <FileCheck size={38} style={{ color: 'var(--green-9)', marginBottom: '10px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Đã xử lý hết hàng đợi</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Hiện không còn tài liệu nào đang chờ thẩm định.</p>
            </div>
          )
        ) : (
          <div className="moderation-review-grid">
            {/* Cột hàng đợi */}
            <nav
              aria-label="Danh sách tài liệu chờ duyệt"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <strong style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{docTotal} tài liệu đang chờ</strong>
              {docs.map((doc) => {
                const isSelected = doc.id === selectedDocId
                return (
                  <button
                    key={doc.id}
                    type="button"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => {
                      setActionError('')
                      setSelectedDocId(doc.id)
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid var(--primary-base)' : '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'var(--blue-2)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '5px' }}>
                      <span className="status-badge blue">{doc.courseCode}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{formatBytes(doc.fileSizeBytes)}</span>
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: '4px' }}>{doc.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {doc.uploaderName} • {formatRelativeTime(doc.createdAt)}
                    </div>
                  </button>
                )
              })}
              <PageControls page={docPage} total={docTotal} onChange={setDocPage} />
            </nav>

            {/* Cột xem tài liệu */}
            {currentDetail ? <DocumentReader detail={currentDetail} /> : <div className="empty-state-box" aria-busy="true">Đang tải tài liệu...</div>}

            {/* Cột bảng kiểm */}
            {currentDetail && (
              <aside
                aria-label="Bảng kiểm và quyết định duyệt"
                style={{
                  position: 'sticky',
                  top: '78px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="status-badge blue">{currentDetail.courseCode}</span>
                  <span className="status-badge slate">{DOC_TYPE_LABELS[currentDetail.docType] || currentDetail.docType}</span>
                  <span className={`status-badge ${autoChecks.formatOk ? 'amber' : 'red'}`}>{autoChecks.formatOk ? 'PDF' : 'Sai định dạng'}</span>
                </div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.4 }}>{currentDetail.title}</h3>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{currentDetail.description}</p>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Người đóng góp: {currentDetail.uploaderName} • Năm học {currentDetail.academicYear}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-muted)' }}>
                  <Hash size={12} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                  <code title={currentDetail.fileHash} style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--blue-11)' }}>
                    {currentDetail.fileHash.slice(0, 8)}…{currentDetail.fileHash.slice(-8)}
                  </code>
                </div>

                <CriteriaChecklist
                  autoChecks={autoChecks}
                  checks={checks}
                  onToggleCriterion={(key) => setChecks((prev) => ({ ...prev, [key]: !prev[key] }))}
                />

                {actionError && !rejectingDoc && <ErrorBanner message={actionError} />}

                {!canApprove && (
                  <span role="status" style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--amber-11)' }}>
                    {!isFileOk || !autoPassed
                      ? 'Tài liệu chưa đạt kiểm tra của hệ thống, chỉ có thể từ chối.'
                      : `Còn ${remainingManual} tiêu chí cần xác nhận trước khi phê duyệt.`}
                  </span>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={!canApprove || submitting}
                    onClick={handleApprove}
                    style={{
                      flex: 1,
                      backgroundColor: canApprove ? 'var(--green-9)' : 'var(--bg-hover)',
                      color: canApprove ? '#ffffff' : 'var(--text-tertiary)',
                      border: canApprove ? 'none' : '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '9px 14px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: canApprove && !submitting ? 'pointer' : 'not-allowed',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {canApprove ? <CheckCircle2 size={15} /> : <Check size={15} />}
                    <span>{submitting ? 'Đang xử lý...' : 'Phê duyệt & xuất bản'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setActionError('')
                      setRejectingDoc(currentDetail)
                    }}
                    style={{
                      backgroundColor: 'var(--red-9)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 14px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <XCircle size={15} />
                    <span>Từ chối</span>
                  </button>
                </div>
              </aside>
            )}
          </div>
        )
      ) : reports.length === 0 ? (
        !listError && (
          <div className="empty-state-box">
            <ShieldCheck size={38} style={{ color: 'var(--green-9)', marginBottom: '10px' }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Không có báo cáo nào đang chờ</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Kho tài liệu hiện chưa có phản ánh mới.</p>
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {reports.map((report) => {
            const statusBadge = DOCUMENT_STATUS_BADGES[report.documentStatus] || DOCUMENT_STATUS_BADGES.PENDING
            const canHide = report.documentStatus === 'APPROVED'
            const canDelete = report.documentStatus === 'APPROVED' || report.documentStatus === 'HIDDEN'
            return (
              <article
                key={report.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span className="status-badge red">
                      <Flag size={12} /> {REPORT_REASON_LABELS[report.reasonCategory] || report.reasonCategory}
                    </span>
                    <span className="status-badge slate">{report.courseCode}</span>
                    <span className={`status-badge ${statusBadge.className}`}>{statusBadge.label}</span>
                  </div>
                  <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{report.documentTitle}</strong>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>&ldquo;{report.description}&rdquo;</p>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-tertiary)' }}>
                    Người báo cáo: {report.reporterName} • {formatRelativeTime(report.createdAt)} • Tác giả: {report.uploaderName}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button type="button" className="btn-ghost" onClick={() => setResolving({ report, action: 'DISMISS' })}>
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    disabled={!canHide}
                    title={canHide ? undefined : 'Tài liệu không còn ở trạng thái đang hiển thị'}
                    onClick={() => setResolving({ report, action: 'HIDE' })}
                    style={{
                      backgroundColor: canHide ? 'var(--amber-9)' : 'var(--bg-hover)',
                      color: canHide ? '#11181c' : 'var(--text-tertiary)',
                      border: canHide ? 'none' : '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: canHide ? 'pointer' : 'not-allowed',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <EyeOff size={14} />
                    <span>Tạm ẩn</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => setResolving({ report, action: 'DELETE' })}
                    style={{
                      backgroundColor: canDelete ? 'var(--red-9)' : 'var(--bg-hover)',
                      color: canDelete ? '#ffffff' : 'var(--text-tertiary)',
                      border: canDelete ? 'none' : '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: canDelete ? 'pointer' : 'not-allowed',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={14} />
                    <span>Xóa tài liệu</span>
                  </button>
                </div>
              </article>
            )
          })}
          <PageControls page={reportPage} total={reportTotal} onChange={setReportPage} />
        </div>
      )}

      {rejectingDoc && (
        <RejectReasonModal
          documentItem={rejectingDoc}
          submitting={submitting}
          serverError={actionError}
          onClose={() => {
            setRejectingDoc(null)
            setActionError('')
          }}
          onConfirmReject={handleConfirmReject}
        />
      )}

      {resolving && (
        <ResolveReportModal
          report={resolving.report}
          action={resolving.action}
          submitting={submitting}
          serverError={actionError}
          onClose={() => {
            setResolving(null)
            setActionError('')
          }}
          onConfirm={handleConfirmResolve}
        />
      )}
    </div>
  )
}
