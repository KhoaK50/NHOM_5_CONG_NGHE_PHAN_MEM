import { useEffect, useRef, useState } from "react";

const SAMPLE = [
  { id: 15, type: "DOCUMENT_REJECTED", title: "Tài liệu bị từ chối", message: "Giáo trình Cấu trúc dữ liệu – Chương 3. Lý do: nội dung trùng lặp với tài liệu đã có.", documentId: 7, isRead: false, createdAt: "10 phút trước" },
  { id: 14, type: "DOCUMENT_APPROVED", title: "Tài liệu đã được duyệt", message: "Đề cương ôn tập Lập trình hướng đối tượng đã hiển thị cho mọi người.", documentId: 6, isRead: false, createdAt: "2 giờ trước" },
  { id: 12, type: "DOCUMENT_APPROVED", title: "Tài liệu đã được duyệt", message: "Bài tập Cơ sở dữ liệu – Tuần 5 đã hiển thị cho mọi người.", documentId: 4, isRead: true, createdAt: "Hôm qua" },
];

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function TypeIcon({ type }) {
  const approved = type === "DOCUMENT_APPROVED";
  return (
    <span aria-hidden="true"
      className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${approved ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {approved ? <path d="M5 10.5l3.2 3.2L15 6.8" /> : <path d="M6 6l8 8M14 6l-8 8" />}
      </svg>
    </span>
  );
}

export default function NotificationPopover({
  notifications = SAMPLE,
  unreadCount,
  defaultOpen = false,
  notice = "",
  onMarkAllRead = () => {},
  onSelect = () => {},
}) {
  const [open, setOpen] = useState(defaultOpen);
  const rootRef = useRef(null);
  const unread = unreadCount ?? notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => rootRef.current && !rootRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"} aria-haspopup="dialog" aria-expanded={open}>
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-semibold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Danh sách thông báo"
          className="absolute right-0 z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">
              Thông báo{unread > 0 && <span className="ml-2 text-sm font-normal text-slate-500">{unread} chưa đọc</span>}
            </h2>
            <button type="button" onClick={onMarkAllRead} disabled={unread === 0}
              className="rounded text-sm font-medium text-teal-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">
              Đánh dấu đã đọc tất cả
            </button>
          </div>

          {notice && (
            <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">{notice}</div>
          )}

          {notifications.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-slate-800">Bạn chưa có thông báo mới nào</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Khi tài liệu bạn đăng được duyệt hoặc bị từ chối, kết quả sẽ hiện ở đây.
              </p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => onSelect(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600 ${n.isRead ? "" : "bg-teal-50/60"}`}>
                    <TypeIcon type={n.type} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm text-slate-900 ${n.isRead ? "font-medium" : "font-semibold"}`}>{n.title}</span>
                      <span className="mt-0.5 block text-sm leading-snug text-slate-600">{n.message}</span>
                      <span className="mt-1 block text-xs text-slate-500">{n.createdAt}</span>
                    </span>
                    {!n.isRead && <span className="mt-2 h-2.5 w-2.5 flex-none rounded-full bg-teal-600" aria-label="Chưa đọc" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
