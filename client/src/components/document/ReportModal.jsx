/**
 * ============================================================================
 * UC04: BÁO CÁO HỌC LIỆU VI PHẠM CHUẨN MỰC HỌC THUẬT (REPORT MODAL)
 * Thành viên phụ trách: Lê Nguyễn Thùy Trâm (50.01.103.088)
 * Nối API POST /api/reports chuẩn RESTful (Chống trùng lặp 409 & Chống rỗng)
 * Tinh chỉnh UI tương thích Radix Colors & Dark/Light Theme của 5Share
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

const BANNER = {
  warning: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300",
  info: "border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300",
  error: "border-rose-200 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
};

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4 backdrop-blur-sm transition-all"
      onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-t-2xl bg-[var(--bg-surface,#ffffff)] border border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 shadow-2xl sm:rounded-2xl"
      >
        {success ? (
          <div role="status" className="px-6 py-10 text-center sm:px-8">
            <span
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              aria-hidden="true"
            >
              <svg viewBox="0 0 20 20" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 10.5l3.2 3.2L15 6.8" />
              </svg>
            </span>
            <h2 id="report-title" className="mt-4 text-xl font-bold text-[var(--text-primary,#0f172a)]">
              Cảm ơn bạn đã phản hồi!
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary,#475569)]">
              Báo cáo vi phạm đã được chuyển tới Ban Kiểm duyệt Khoa CNTT. Chúng tôi sẽ thẩm tra và xử lý tài liệu nếu phát hiện vi phạm.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-xl bg-[var(--brand-primary,#007A5E)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#007A5E)] focus-visible:ring-offset-2 transition"
            >
              Đóng hộp thoại
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 px-6 py-5 bg-[var(--bg-muted,#f8fafc)]">
              <div>
                <h2 id="report-title" className="text-lg font-bold text-[var(--text-primary,#0f172a)]">
                  Báo cáo tài liệu vi phạm
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-secondary,#475569)]">
                  Giúp cộng đồng giữ gìn nguồn học liệu chuẩn mực, chất lượng cao.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                aria-label="Đóng"
                className="-mr-2 -mt-1 rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#007A5E)] transition"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-xl bg-[var(--bg-muted,#f8fafc)] px-4 py-3 border border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary,#64748b)]">
                  Học liệu phản ánh (Mã #{activeDocId})
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary,#0f172a)]">
                  {activeDocTitle}
                </p>
              </div>

              {banner && (
                <div role="alert" className={`rounded-xl border px-4 py-3 text-xs leading-relaxed font-medium ${BANNER[banner.tone] || BANNER.error}`}>
                  {banner.text}
                </div>
              )}

              <fieldset aria-describedby={errors.reason ? "reason-error" : undefined}>
                <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary,#475569)]">
                  Nhóm lý do vi phạm
                </legend>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs transition ${
                        reason === r.value
                          ? "border-[var(--brand-primary,#007A5E)] bg-[var(--brand-primary,#007A5E)]/5 ring-1 ring-[var(--brand-primary,#007A5E)]"
                          : "border-[var(--border-subtle,#e2e8f0)] dark:border-slate-700 hover:bg-[var(--bg-muted,#f8fafc)]"
                      }`}
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
                        className="mt-0.5 h-4 w-4 flex-none text-[var(--brand-primary,#007A5E)] focus:ring-0"
                      />
                      <span>
                        <span className="block font-semibold text-[var(--text-primary,#0f172a)]">
                          {r.value}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-[var(--text-secondary,#475569)]">
                          {r.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.reason && (
                  <p id="reason-error" role="alert" className="mt-1.5 text-xs text-rose-600">
                    {errors.reason}
                  </p>
                )}
              </fieldset>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary,#475569)]">
                    Nội dung giải trình cụ thể
                  </label>
                  <span className="text-[11px] text-[var(--text-tertiary,#64748b)]">
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
                  className={`block w-full resize-y rounded-xl border bg-[var(--bg-surface,#ffffff)] px-3.5 py-2.5 text-sm text-[var(--text-primary,#0f172a)] placeholder-slate-400 focus:border-[var(--brand-primary,#007A5E)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#007A5E)] transition ${
                    errors.description ? "border-rose-500" : "border-[var(--border-subtle,#e2e8f0)] dark:border-slate-700"
                  }`}
                />
                {errors.description && (
                  <p id="description-error" role="alert" className="mt-1.5 text-xs text-rose-600">
                    {errors.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 bg-[var(--bg-muted,#f8fafc)] px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-xl border border-[var(--border-subtle,#e2e8f0)] dark:border-slate-700 bg-[var(--bg-surface,#ffffff)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#007A5E)] transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition"
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
