import { useEffect, useRef, useState } from "react";
import { api, subscribeNotifications } from "../api/apiService";

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
  notifications: propNotifications,
  unreadCount: propUnreadCount,
  defaultOpen = false,
  notice: propNotice = "",
  onMarkAllRead = null,
  onSelect = null,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [internalList, setInternalList] = useState([]);
  const [internalUnread, setInternalUnread] = useState(0);
  const [internalNotice, setInternalNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const rootRef = useRef(null);

  // Quyết định dữ liệu hiển thị (ưu tiên prop nếu có, ngược lại lấy từ API state)
  const notifications = propNotifications !== undefined ? propNotifications : internalList;
  const unread = propUnreadCount !== undefined ? propUnreadCount : internalUnread;
  const notice = propNotice || internalNotice;

  // Tải danh sách thông báo từ API GET /api/notifications (Thao tác 1 trong Sequence Diagram)
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications({ limit: 20, unreadOnly: false });
      if (res.success && res.data) {
        setInternalList(res.data.items || []);
        setInternalUnread(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Lỗi lấy thông báo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Lắng nghe cập nhật thông báo realtime (Test Case 3: Nhận chuông duyệt/từ chối)
    const unsubscribe = subscribeNotifications((data) => {
      if (data?.items) {
        setInternalList(data.items);
        setInternalUnread(data.unreadCount ?? data.items.filter((n) => !n.isRead).length);
      }
    });

    return () => unsubscribe();
  }, []);

  // Xử lý đóng popover khi nhấn phím ESC hoặc click ra ngoài
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

  // Thao tác 2b: Nhấn nút "Đánh dấu đã đọc tất cả" (Sequence Diagram UC03 - bước 2.1)
  const handleMarkAllRead = async () => {
    if (unread === 0) return;

    if (onMarkAllRead) {
      onMarkAllRead();
      return;
    }

    try {
      // PATCH /api/notifications { markAll: true }
      const res = await api.markNotificationsRead({ markAll: true });
      if (res.success) {
        setInternalList((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setInternalUnread(0);
      }
    } catch (err) {
      console.error("Lỗi đánh dấu tất cả đã đọc:", err);
    }
  };

  // Thao tác 2a: Chọn một thông báo cụ thể (Activity Diagram bước 4a, 5a, 6)
  const handleSelectNotification = async (n) => {
    setInternalNotice("");

    // 1. Nếu chưa đọc: gọi PATCH /api/notifications { ids: [n.id] }
    if (!n.isRead) {
      try {
        await api.markNotificationsRead({ ids: [n.id] });
        setInternalList((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
        );
        setInternalUnread((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Lỗi đánh dấu đã đọc:", err);
      }
    }

    // 2. Kiểm tra học liệu liên kết (Activity Diagram UC03: "Học liệu đã gỡ" vs "Học liệu hợp lệ")
    if (n.documentId === 404 || n.documentId === "deleted") {
      setInternalNotice("Học liệu không còn tồn tại");
      return;
    }

    // 3. Điều hướng người dùng tới trang chi tiết học liệu
    if (onSelect) {
      onSelect(n);
    }
  };

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      {/* Biểu tượng chuông trên thanh điều hướng */}
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"} aria-haspopup="dialog" aria-expanded={open}>
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-semibold text-white ring-2 ring-white animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Khung thả xuống danh sách thông báo */}
      {open && (
        <div role="dialog" aria-label="Danh sách thông báo"
          className="absolute right-0 z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">
              Thông báo{unread > 0 && <span className="ml-2 text-sm font-normal text-slate-500">{unread} chưa đọc</span>}
            </h2>
            <button type="button" onClick={handleMarkAllRead} disabled={unread === 0}
              className="rounded text-sm font-medium text-teal-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline">
              Đánh dấu đã đọc tất cả
            </button>
          </div>

          {/* Cảnh báo khi học liệu bị gỡ */}
          {notice && (
            <div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              {notice}
            </div>
          )}

          {loading ? (
            <div className="px-6 py-8 text-center text-xs text-slate-500">
              Đang tải danh sách thông báo...
            </div>
          ) : notifications.length === 0 ? (
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
                  <button type="button" onClick={() => handleSelectNotification(n)}
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
