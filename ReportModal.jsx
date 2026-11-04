import { useEffect, useState } from "react";

/**
 * ReportModal.jsx – UC04: Báo cáo tài liệu vi phạm (GIAI ĐOẠN 5: giao diện tĩnh, chưa gắn logic API)
 * Task 5S-035 | Trâm
 *
 * Bám theo Activity Diagram UC04 và Sequence Diagram UC04:
 *  - Hộp thoại mở từ nút "Báo cáo vi phạm" ở trang chi tiết học liệu (bước 1–2).
 *  - Nhóm lý do: Trùng lặp, Sai môn, Bản quyền, Nội dung xấu + ô nhập nội dung giải trình (3a).
 *  - Nút "Hủy" đóng hộp thoại và hủy gửi (3b); nút "Gửi báo cáo".
 *  - Cảnh báo thiếu thông tin: "yêu cầu chọn lý do và mô tả vi phạm".
 *  - Báo cáo trùng: "báo cáo trước đó đang được Quản trị viên xem xét" (banner).
 *  - Thành công: thông báo cảm ơn sinh viên.
 *
 * Body ở Giai đoạn 6 (POST /api/reports): { documentId, reason, description }
 *
 * Props (tùy chọn): open (mặc định true), documentId, documentTitle,
 *   errors { reason, description }, banner { tone: "warning" | "info" | "error", text },
 *   submitting, success, onClose(), onSubmit({ documentId, reason, description })
 */

const REASONS = [
  { value: "Trùng lặp", hint: "Đã có tài liệu giống hệt trên hệ thống" },
  { value: "Sai môn", hint: "Gắn sai môn học hoặc sai thông tin" },
  { value: "Bản quyền", hint: "Sao chép giáo trình hoặc sách có bản quyền" },
  { value: "Nội dung xấu", hint: "Nội dung phản cảm hoặc không phù hợp" },
];
const MAX_DESC = 1000;

const BANNER = {
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function ReportModal({
  open = true,
  documentId = 7,
  documentTitle = "Giáo trình Cấu trúc dữ liệu – Chương 3",
  errors = {},
  banner = null,
  submitting = false,
  success = false,
  onClose = () => {},
  onSubmit = () => {},
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && !submitting && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ documentId, reason, description: description.trim() });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="report-title"
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        {success ? (
          <div role="status" className="px-6 py-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">
              <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 10.5l3.2 3.2L15 6.8" /></svg>
            </span>
            <h2 id="report-title" className="mt-4 text-lg font-semibold text-slate-900">Cảm ơn bạn đã báo cáo</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Báo cáo đã được ghi nhận. Quản trị viên sẽ xem xét và xử lý tài liệu nếu vi phạm.
            </p>
            <button type="button" onClick={onClose}
              className="mt-6 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2">
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 id="report-title" className="text-lg font-semibold text-slate-900">Báo cáo vi phạm</h2>
                <p className="mt-1 text-sm text-slate-600">Chọn nhóm lý do và mô tả cụ thể để Quản trị viên xử lý nhanh hơn.</p>
              </div>
              <button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng"
                className="-mr-2 -mt-1 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="rounded-lg bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                <p className="text-xs text-slate-500">Học liệu bị báo cáo</p>
                <p className="mt-0.5 text-sm font-medium text-slate-900">{documentTitle}</p>
              </div>

              {banner && (
                <div role="alert" className={`rounded-lg border px-4 py-3 text-sm ${BANNER[banner.tone] || BANNER.error}`}>{banner.text}</div>
              )}

              <fieldset aria-describedby={errors.reason ? "reason-error" : undefined}>
                <legend className="mb-2 text-sm font-medium text-slate-800">Nhóm lý do</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {REASONS.map((r) => (
                    <label key={r.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-3 text-sm focus-within:ring-2 focus-within:ring-teal-600 ${
                        reason === r.value ? "border-teal-600 bg-teal-50" : "border-slate-300 hover:bg-slate-50"}`}>
                      <input type="radio" name="reason" value={r.value} checked={reason === r.value}
                        onChange={() => setReason(r.value)} disabled={submitting}
                        className="mt-0.5 h-4 w-4 flex-none border-slate-400 text-teal-700 focus:ring-0" />
                      <span>
                        <span className="block font-medium text-slate-900">{r.value}</span>
                        <span className="mt-0.5 block text-xs leading-snug text-slate-500">{r.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {errors.reason && <p id="reason-error" role="alert" className="mt-2 text-sm text-rose-600">{errors.reason}</p>}
              </fieldset>

              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <label htmlFor="description" className="text-sm font-medium text-slate-800">Nội dung giải trình</label>
                  <span className="text-xs text-slate-500">{description.length}/{MAX_DESC}</span>
                </div>
                <textarea id="description" rows={4} maxLength={MAX_DESC} value={description}
                  onChange={(e) => setDescription(e.target.value)} disabled={submitting}
                  placeholder="Ví dụ: Nội dung ở trang 12–18 được sao chép từ giáo trình có bản quyền."
                  aria-invalid={!!errors.description} aria-describedby={errors.description ? "description-error" : undefined}
                  className={`block w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600 ${errors.description ? "border-rose-500" : "border-slate-300"}`} />
                {errors.description && <p id="description-error" role="alert" className="mt-1.5 text-sm text-rose-600">{errors.description}</p>}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} disabled={submitting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
                Hủy
              </button>
              <button type="submit" disabled={submitting}
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-rose-300">
                {submitting ? "Đang gửi..." : "Gửi báo cáo"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
