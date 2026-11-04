/**
 * ============================================================================
 * UC04: BÁO CÁO HỌC LIỆU VI PHẠM CHUẨN MỰC HỌC THUẬT (REPORT MODAL)
 * Thành viên phụ trách: Lê Nguyễn Thùy Trâm (50.01.103.088)
 * Nối API POST /api/reports chuẩn RESTful (Chống trùng lặp 409 & Chống rỗng)
 * Giao diện theo Figma bản V5, dùng token màu sáng/tối trong styles/theme.css
 * ============================================================================
 */

import { useEffect, useState } from "react";
import { api } from "../../api/notificationReportApi";

const REASONS = [
  { value: "Trùng lặp", hint: "Đã có tài liệu giống hệt trên hệ thống 5Share" },
  { value: "Sai môn", hint: "Gắn sai mã môn học hoặc lệch chuyên ngành" },
  { value: "Bản quyền", hint: "Sao chép giáo trình, sách hoặc tài liệu có bản quyền" },
  { value: "Nội dung xấu", hint: "Nội dung phản cảm, sai lệch kiến thức hoặc spam" },
];
const MAX_DESC = 1000;

export default function ReportModal({
  open = true,
  documentId: propDocId,
  documentTitle: propDocTitle,
  documentItem,
  targetType = "DOCUMENT",
  targetComment = null,
  errors: propErrors = {},
  banner: propBanner = null,
  submitting: propSubmitting,
  success: propSuccess,
  onClose = () => {},
  onSubmit = null,
  onSubmitReport = null,
}) {
  const activeDocId = propDocId || documentItem?.id || 11;
  const activeDocTitle = propDocTitle || documentItem?.title || "Tài liệu học tập";

  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [internalErrors, setInternalErrors] = useState({});
  const [internalBanner, setInternalBanner] = useState(null);
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const [internalSuccess, setInternalSuccess] = useState(false);

  const errors = { ...internalErrors, ...propErrors };
  const banner = propBanner || internalBanner;
  const submitting = propSubmitting !== undefined ? propSubmitting : internalSubmitting;
  const success = propSuccess !== undefined ? propSuccess : internalSuccess;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !submitting && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  // Điều chỉnh state khi đổi sang documentId mới theo mẫu React chuẩn
  const [prevDocId, setPrevDocId] = useState(activeDocId);
  if (activeDocId !== prevDocId) {
    setPrevDocId(activeDocId);
    setReason("");
    setDescription("");
    setInternalErrors({});
    setInternalBanner(null);
    setInternalSuccess(false);
  }

  if (!open) return null;

  // Kiểm tra tính hợp lệ dữ liệu báo cáo (Chống rỗng - Activity Diagram UC04 bước 4)
  const validateForm = () => {
    const errs = {};
    if (!reason) {
      errs.reason = "Yêu cầu chọn nhóm lý do vi phạm.";
    }

    const cleanDesc = description.trim();
    if (!cleanDesc) {
      errs.description = "Yêu cầu nhập mô tả cụ thể về vi phạm.";
    } else if (cleanDesc.length < 10) {
      errs.description = "Mô tả vi phạm quá ngắn! Vui lòng nhập tối thiểu 10 ký tự.";
    }

    setInternalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Nối API POST /api/reports (Sequence Diagram UC04)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setInternalBanner(null);

    // Chặn báo cáo rỗng
    if (!validateForm()) return;

    const payload = {
      documentId: Number(activeDocId),
      reason,
      description: description.trim(),
      targetType,
      commentId: targetComment?.id,
    };

    // Nếu caller truyền custom onSubmit handler, ưu tiên gọi
    const customSubmit = onSubmitReport || onSubmit;
    if (customSubmit) {
      try {
        setInternalSubmitting(true);
        // Gọi API backend trước
        await api.submitReport(payload);
        customSubmit(payload);
        setInternalSuccess(true);
      } catch (err) {
        if (err.status === 409 || err.code === "REPORT_ALREADY_EXISTS") {
          setInternalBanner({
            tone: "warning",
            text: "Báo cáo trước đó đang được Quản trị viên xem xét.",
          });
        } else if (err.status === 404 || err.code === "DOCUMENT_NOT_FOUND") {
          setInternalBanner({
            tone: "error",
            text: "Học liệu không tồn tại hoặc không còn khả dụng trên hệ thống.",
          });
        } else {
          setInternalBanner({
            tone: "error",
            text: err.message || "Không thể gửi báo cáo vi phạm vào lúc này. Vui lòng thử lại sau.",
          });
        }
      } finally {
        setInternalSubmitting(false);
      }
      return;
    }

    // Thực thi luồng gọi API mặc định
    setInternalSubmitting(true);
    setInternalErrors({});

    try {
      // POST /api/reports
      const res = await api.submitReport(payload);
      if (res.success) {
        setInternalSuccess(true);
      }
    } catch (err) {
      // Chặn báo cáo trùng (HTTP 409 Conflict - Test Case 4 & Activity Diagram bước 5)
      if (err.status === 409 || err.code === "REPORT_ALREADY_EXISTS") {
        setInternalBanner({
          tone: "warning",
          text: "Báo cáo trước đó đang được Quản trị viên xem xét.",
        });
      } else if (err.status === 404 || err.code === "DOCUMENT_NOT_FOUND") {
        setInternalBanner({
          tone: "error",
          text: "Học liệu không tồn tại hoặc không còn khả dụng trên hệ thống.",
        });
      } else {
        setInternalBanner({
          tone: "error",
          text: err.message || "Không thể gửi báo cáo vi phạm vào lúc này. Vui lòng thử lại sau.",
        });
      }
    } finally {
      setInternalSubmitting(false);
    }
  };

  return (
    <div
      className="report-modal"
      onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className="report-dialog"
      >
        {success ? (
          <div role="status" className="report-success">
            <span aria-hidden="true">
              <svg viewBox="0 0 20 20" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 10.5l3.2 3.2L15 6.8" />
              </svg>
            </span>
            <h2 id="report-title">
              Cảm ơn bạn đã phản hồi!
            </h2>
            <p>
              Báo cáo vi phạm đã được chuyển tới Ban Kiểm duyệt Khoa CNTT. Chúng tôi sẽ thẩm tra và xử lý tài liệu nếu phát hiện vi phạm.
            </p>
            <button type="button" onClick={onClose}>
              Đóng hộp thoại
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="report-header">
              <div>
                <h2 id="report-title">
                  Báo cáo tài liệu vi phạm
                </h2>
                <p>
                  Giúp cộng đồng giữ gìn nguồn học liệu chuẩn mực, chất lượng cao.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label="Đóng"
              >
                <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <div className="report-body">
              <div className="report-document">
                <p>
                  Tài liệu
                </p>
                <p>
                  {activeDocTitle}
                </p>
              </div>

              {banner && (
                <div role="alert" className={`report-banner report-banner-${banner.tone || 'error'}`}>
                  {banner.text}
                </div>
              )}

              <fieldset className="report-fieldset" aria-describedby={errors.reason ? "reason-error" : undefined}>
                <legend>
                  Lý do báo cáo
                </legend>
                <div className="report-reasons">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className="report-reason"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => {
                          setReason(r.value);
                          if (internalErrors.reason) {
                            setInternalErrors((prev) => {
                              const n = { ...prev };
                              delete n.reason;
                              return n;
                            });
                          }
                        }}
                        disabled={submitting}
                                              />
                      <span>
                        <span>
                          {r.value}
                        </span>
                        <span>
                          {r.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.reason && (
                  <p id="reason-error" role="alert">
                    {errors.reason}
                  </p>
                )}
              </fieldset>

              <div className="report-description">
                <div>
                  <label htmlFor="description">
                    Mô tả chi tiết
                  </label>
                  <span>
                    {description.length}/{MAX_DESC}
                  </span>
                </div>
                <textarea
                  id="description"
                  rows={4}
                  maxLength={MAX_DESC}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (internalErrors.description) {
                      setInternalErrors((prev) => {
                        const n = { ...prev };
                        delete n.description;
                        return n;
                      });
                    }
                    if (internalBanner) setInternalBanner(null);
                  }}
                  disabled={submitting}
                  placeholder="Ví dụ: Trang 12–18 trùng lặp hoàn toàn với tài liệu đã đăng, hoặc có dấu hiệu sao chép sách có bản quyền..."
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? "description-error" : undefined}
                />
                {errors.description && (
                  <p id="description-error" role="alert">
                    {errors.description}
                  </p>
                )}
              </div>
            </div>

            <div className="report-actions">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="report-submit"
              >
                {submitting ? "Đang gửi báo cáo..." : "Gửi báo cáo"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
