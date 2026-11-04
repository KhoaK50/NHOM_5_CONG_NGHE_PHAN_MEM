/**
 * ============================================================================
 * CÔNG CỤ KIỂM THỬ 4 TEST CASES [TASK 5S-048] (TRÂM - UC02, UC03, UC04)
 * Giúp Thầy và Nhóm kiểm tra trực quan các kịch bản kiểm thử:
 * 1. TC1: Đăng ký thành công
 * 2. TC2: Chặn mật khẩu ngắn (< 8 ký tự)
 * 3. TC3: Bắn chuông thông báo duyệt / từ chối kèm lý do
 * 4. TC4: Chặn báo cáo trùng lặp (HTTP 409 Conflict)
 * ============================================================================
 */

import { useState } from "react";
import RegisterModal from "../auth/RegisterModal";
import NotificationPopover from "../notifications/NotificationPopover";
import ReportModal from "../document/ReportModal";
import { api } from "../../api/notificationReportApi";

export default function KiemThuTramHarness({ onClose = null }) {
  const [showRegister, setShowRegister] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportDoc, setReportDoc] = useState({
    id: 11,
    title: "Algorithm 00 Intro (Học liệu thực tế)",
  });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Test Case 3: Nhận chuông thông báo duyệt tài liệu
  const handleSimulateApprove = async () => {
    try {
      await api.simulateModerationNotification("APPROVED", {
        documentTitle: "Đề cương ôn tập Lập trình hướng đối tượng (OOP 2026)",
        documentId: 11,
      });
      showToast("Admin vừa DUYỆT tài liệu! Chuông thông báo đã tự động cập nhật.", "success");
    } catch (e) {
      showToast("Lỗi bắn thông báo: " + e.message, "warning");
    }
  };

  // Test Case 3: Nhận chuông thông báo từ chối tài liệu kèm lý do
  const handleSimulateReject = async () => {
    try {
      await api.simulateModerationNotification("REJECTED", {
        documentTitle: "Tài liệu Bài giảng Mạng máy tính.pdf",
        documentId: 12,
        reason: "nội dung scan mờ, thiếu mục lục chuẩn và trùng lặp băm SHA-256",
      });
      showToast("Admin vừa TỪ CHỐI tài liệu! Chuông thông báo đã nhận tin kèm lý do.", "warning");
    } catch (e) {
      showToast("Lỗi bắn thông báo: " + e.message, "warning");
    }
  };

  return (
    <div className="min-h-[500px] bg-[var(--bg-app,#f8fafc)] text-[var(--text-primary,#0f172a)] flex flex-col font-sans rounded-2xl border border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 shadow-xl overflow-hidden my-4">
      {/* Toast thông báo */}
      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div
            className={`rounded-xl px-4 py-3 text-sm font-semibold shadow-xl text-white ${
              toast.type === "success"
                ? "bg-emerald-600"
                : toast.type === "warning"
                  ? "bg-amber-600"
                  : "bg-[var(--brand-primary,#007A5E)]"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* Header thanh công cụ */}
      <header className="bg-[var(--bg-surface,#ffffff)] border-b border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--brand-primary,#007A5E)] text-white font-bold flex items-center justify-center text-base shadow-sm">
            5S
          </div>
          <div>
            <span className="font-bold text-sm sm:text-base text-[var(--text-primary,#0f172a)]">
              5Share – Môi trường Kiểm thử Cụm Use Case của Trâm
            </span>
            <p className="text-xs text-[var(--text-secondary,#475569)]">
              Lê Nguyễn Thùy Trâm (50.01.103.088) • UC02 Đăng ký • UC03 Thông báo • UC04 Báo cáo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="rounded-xl bg-[var(--brand-primary,#007A5E)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 transition"
          >
            Mở Đăng ký (UC02)
          </button>

          <div className="border-l border-[var(--border-subtle,#e2e8f0)] dark:border-slate-700 pl-3">
            <NotificationPopover
              onSelect={(n) => {
                showToast(`Đã chọn thông báo #${n.id}: "${n.title}"`, "info");
              }}
            />
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-2 rounded-lg border border-[var(--border-subtle,#e2e8f0)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-secondary,#475569)] hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Đóng
            </button>
          )}
        </div>
      </header>

      {/* Thanh công cụ 4 Test Cases quy định */}
      <section className="bg-slate-900 text-white py-3 px-6 border-b border-slate-950">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold uppercase tracking-wider text-emerald-300">
              Kiểm thử nhanh 4 Test Cases quy định [Task 5S-048]:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateApprove}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700 transition"
            >
              🔔 TC3: Bắn chuông Duyệt
            </button>
            <button
              type="button"
              onClick={handleSimulateReject}
              className="rounded-lg bg-rose-600 px-3 py-1.5 font-semibold text-white hover:bg-rose-700 transition"
            >
              🔕 TC3: Bắn chuông Từ chối
            </button>
            <button
              type="button"
              onClick={() => {
                setReportDoc({ id: 11, title: "Algorithm 00 Intro (#11)" });
                setShowReport(true);
              }}
              className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700 transition"
            >
              🚩 Test UC04 (Báo cáo #11)
            </button>
            <button
              type="button"
              onClick={() => {
                setReportDoc({ id: 99, title: "Tài liệu đã có báo cáo PENDING (#99)" });
                setShowReport(true);
              }}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700 transition"
              title="Thử gửi trùng lặp trên tài liệu 99 để xem banner cảnh báo 409"
            >
              ⚠️ TC4: Test Báo cáo trùng (#99)
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Info */}
      <main className="p-6 space-y-6 flex-1 bg-[var(--bg-surface,#ffffff)]">
        <div className="rounded-2xl border border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 p-6 bg-[var(--bg-muted,#f8fafc)]">
          <h3 className="text-base font-bold text-[var(--text-primary,#0f172a)]">
            Hệ thống xác thực & kiểm duyệt học liệu (Giai đoạn 6 - Logic MVP & Nối API Thực tế)
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary,#475569)] leading-relaxed">
            Mã nguồn đã tích hợp đầy đủ kiểm tra dữ liệu đăng ký (Validation), kết nối API chuẩn RESTful với Express và CSDL PostgreSQL, cơ chế đánh dấu đã đọc thông báo và kiểm soát gửi báo cáo vi phạm chống rỗng / chống trùng (HTTP 409 Conflict).
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 p-4 bg-[var(--bg-surface,#ffffff)] shadow-sm">
              <span className="text-xs font-bold uppercase text-[var(--brand-primary,#007A5E)]">UC02 – Đăng ký</span>
              <p className="mt-1 text-xs text-[var(--text-secondary,#475569)]">
                • POST <code>/api/auth/register</code><br />
                • Chống trùng email (409 Conflict)<br />
                • Mật khẩu $\ge$ 8 ký tự, xác nhận khớp
              </p>
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="mt-3 text-xs font-bold text-[var(--brand-primary,#007A5E)] hover:underline"
              >
                Mở Form Đăng ký →
              </button>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 p-4 bg-[var(--bg-surface,#ffffff)] shadow-sm">
              <span className="text-xs font-bold uppercase text-[var(--brand-primary,#007A5E)]">UC03 – Thông báo</span>
              <p className="mt-1 text-xs text-[var(--text-secondary,#475569)]">
                • GET/PATCH <code>/api/notifications</code><br />
                • Đánh dấu 1 tin hoặc tất cả đã đọc<br />
                • Nhận chuông realtime khi duyệt/từ chối
              </p>
              <p className="mt-3 text-xs text-[var(--text-tertiary,#64748b)]">Bấm icon Chuông trên thanh tiêu đề</p>
            </div>

            <div className="rounded-xl border border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 p-4 bg-[var(--bg-surface,#ffffff)] shadow-sm">
              <span className="text-xs font-bold uppercase text-rose-600">UC04 – Báo cáo</span>
              <p className="mt-1 text-xs text-[var(--text-secondary,#475569)]">
                • POST <code>/api/reports</code><br />
                • Chống rỗng (lý do & mô tả $\ge$ 10 ký tự)<br />
                • Chống trùng (hiện banner cảnh báo 409)
              </p>
              <button
                type="button"
                onClick={() => {
                  setReportDoc({ id: 11, title: "Algorithm 00 Intro (#11)" });
                  setShowReport(true);
                }}
                className="mt-3 text-xs font-bold text-rose-600 hover:underline"
              >
                Mở Modal Báo cáo →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Đăng ký (UC02) */}
      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onGoToLogin={() => {
          setShowRegister(false);
          showToast("Chuyển sang màn hình Đăng nhập (UC01)", "info");
        }}
        onGoHome={() => {
          setShowRegister(false);
          showToast("Đã điều hướng về Trang chủ!", "success");
        }}
      />

      {/* Modal Báo cáo vi phạm (UC04) */}
      <ReportModal
        open={showReport}
        documentId={reportDoc.id}
        documentTitle={reportDoc.title}
        onClose={() => setShowReport(false)}
      />

      {/* Footer */}
      <footer className="bg-[var(--bg-muted,#f8fafc)] border-t border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 py-3 px-6 text-center text-xs text-[var(--text-tertiary,#64748b)]">
        Dự án 5Share – Nhóm 5 • Lê Nguyễn Thùy Trâm (50.01.103.088) • Cụm UC02, UC03, UC04
      </footer>
    </div>
  );
}
