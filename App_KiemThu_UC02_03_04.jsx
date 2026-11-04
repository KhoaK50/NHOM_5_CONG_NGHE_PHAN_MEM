import React, { useState } from "react";
import RegisterForm from "./components/RegisterForm";
import NotificationPopover from "./components/NotificationPopover";
import ReportModal from "./components/ReportModal";
import { api } from "./api/apiService";

export default function App() {
  const [showRegister, setShowRegister] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportDoc, setReportDoc] = useState({
    id: 7,
    title: "Giáo trình Cấu trúc dữ liệu – Chương 3",
  });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Test Case 3: Nhận chuông thông báo duyệt tài liệu
  const handleSimulateApprove = async () => {
    await api.simulateModerationNotification("APPROVED", {
      documentTitle: "Đề cương ôn tập Lập trình hướng đối tượng (OOP 2026)",
      documentId: 6,
    });
    showToast("Admin vừa DUYỆT tài liệu! Chuông thông báo đã tự động nhận tin mới.", "success");
  };

  // Test Case 3: Nhận chuông thông báo từ chối tài liệu kèm lý do
  const handleSimulateReject = async () => {
    await api.simulateModerationNotification("REJECTED", {
      documentTitle: "Tài liệu Bài giảng Mạng máy tính.pdf",
      documentId: 8,
      reason: "nội dung scan mờ, thiếu mục lục chuẩn và trùng lặp băm SHA-256",
    });
    showToast("Admin vừa TỪ CHỐI tài liệu! Chuông thông báo đã nhận tin kèm lý do từ chối.", "warning");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Toast thông báo */}
      {toast && (
        <div className="fixed top-5 right-5 z-50">
          <div className={`rounded-xl px-4 py-3 text-sm font-medium shadow-xl text-white ${
            toast.type === "success" ? "bg-emerald-600" : toast.type === "warning" ? "bg-amber-600" : "bg-teal-700"
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      {/* Header hệ thống 5Share */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-700 text-white font-bold flex items-center justify-center text-lg shadow-sm">
              5S
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base">5Share – Kho học liệu mở</span>
              <p className="text-xs text-slate-500">Cụm Use Case: Trâm (UC02 Đăng ký • UC03 Thông báo • UC04 Báo cáo)</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Nút mở Form Đăng ký (UC02) */}
            <button
              type="button"
              onClick={() => setShowRegister(true)}
              className="rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition"
            >
              Mở Đăng ký (UC02)
            </button>

            {/* Chuông thông báo (UC03) */}
            <div className="border-l border-slate-200 pl-3">
              <NotificationPopover
                onSelect={(n) => {
                  showToast(`Đã chọn thông báo #${n.id}: "${n.title}"`, "info");
                }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Thanh công cụ kiểm thử 4 Test Cases quy định (Task 5S-048) */}
      <section className="bg-teal-900 text-white py-3 px-4 border-b border-teal-950">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold uppercase tracking-wider text-teal-200">
              Kiểm thử nhanh 4 Test Cases quy định [5S-048]:
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
                setReportDoc({ id: 7, title: "Giáo trình Cấu trúc dữ liệu – Chương 3" });
                setShowReport(true);
              }}
              className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700 transition"
            >
              🚩 Test UC04 (Báo cáo doc #7)
            </button>
            <button
              type="button"
              onClick={() => {
                setReportDoc({ id: 99, title: "Tài liệu đã có báo cáo PENDING (#99)" });
                setShowReport(true);
              }}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700 transition"
              title="Thử gửi trùng lặp trên tài liệu 99 để xem banner cảnh báo"
            >
              ⚠️ TC4: Test Báo cáo trùng (#99)
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">
            Hệ thống xác thực & kiểm duyệt tài liệu (Giai đoạn 6 - Logic MVP & Nối API)
          </h1>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
            Mã nguồn đã tích hợp đầy đủ kiểm tra dữ liệu đăng ký (Validation), kết nối API chuẩn RESTful, cơ chế đánh dấu đã đọc thông báo và kiểm soát gửi báo cáo vi phạm chống rỗng / chống trùng.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <span className="text-xs font-bold uppercase text-teal-700">UC02 – Đăng ký</span>
              <p className="mt-1 text-xs text-slate-600">
                • POST <code>/api/auth/register</code><br />
                • Chống trùng email (409 Conflict)<br />
                • Mật khẩu $\ge$ 8 ký tự, xác nhận khớp
              </p>
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="mt-3 text-xs font-semibold text-teal-700 hover:underline"
              >
                Mở Form Đăng ký →
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <span className="text-xs font-bold uppercase text-teal-700">UC03 – Thông báo</span>
              <p className="mt-1 text-xs text-slate-600">
                • GET/PATCH <code>/api/notifications</code><br />
                • Đánh dấu 1 tin hoặc tất cả đã đọc<br />
                • Nhận thông báo realtime duyệt/từ chối
              </p>
              <p className="mt-3 text-xs text-slate-500">Bấm icon Chuông trên thanh tiêu đề</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
              <span className="text-xs font-bold uppercase text-teal-700">UC04 – Báo cáo</span>
              <p className="mt-1 text-xs text-slate-600">
                • POST <code>/api/reports</code><br />
                • Chống rỗng (chọn lý do & mô tả $\ge$ 10 ký tự)<br />
                • Chống trùng (hiện banner cảnh báo 409)
              </p>
              <button
                type="button"
                onClick={() => {
                  setReportDoc({ id: 7, title: "Giáo trình Cấu trúc dữ liệu – Chương 3" });
                  setShowReport(true);
                }}
                className="mt-3 text-xs font-semibold text-rose-600 hover:underline"
              >
                Mở Modal Báo cáo →
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Đăng ký (UC02) */}
      <RegisterForm
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onGoToLogin={() => {
          setShowRegister(false);
          showToast("Chuyển sang màn hình Đăng nhập (UC01 - Khoa phụ trách)", "info");
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
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        Dự án 5Share – Nhóm 5 • Lê Nguyễn Thùy Trâm (50.01.103.088) • Cụm UC02, UC03, UC04
      </footer>
    </div>
  );
}
