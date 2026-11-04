/**
 * ============================================================================
 * UC03: XEM THÔNG BÁO HỆ THỐNG TRÊN CHUÔNG (NOTIFICATION POPOVER)
 * Thành viên phụ trách: Lê Nguyễn Thùy Trâm (50.01.103.088)
 * Nối API GET/PATCH /api/notifications chuẩn RESTful
 * Tinh chỉnh UI tương thích Radix Colors & Dark/Light Theme của 5Share
 * ============================================================================
 */

import { useEffect, useRef, useState } from "react";
import { api, subscribeNotifications } from "../../api/notificationReportApi";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}

function TypeIcon({ type }) {
  const isApproved = type === "DOCUMENT_APPROVED" || type === "DOC_APPROVED";
  const isRejected = type === "DOCUMENT_REJECTED" || type === "DOC_REJECTED";

  if (isApproved) {
    return (
      <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 10.5l3.2 3.2L15 6.8" />
        </svg>
      </span>
    );
  }

  if (isRejected) {
    return (
      <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 6l8 8M14 6l-8 8" />
        </svg>
      </span>
    );
  }

  return (
    <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 10c0 3.866-3.582 7-8 7a8.84 8.84 0 0 1-2.9-.48L3 17l.8-2.6A6.74 6.74 0 0 1 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7Z" />
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

  // Tải danh sách thông báo và lắng nghe realtime (UC03)
  useEffect(() => {
    let active = true;
    api.getNotifications({ limit: 20, unreadOnly: false })
      .then((res) => {
        if (active && res.success && res.data) {
          setInternalList(res.data.items || []);
          setInternalUnread(res.data.unreadCount || 0);
        }
      })
      .catch((err) => {
        console.error("Lỗi lấy thông báo:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = subscribeNotifications((data) => {
      if (data?.items) {
        setInternalList(data.items);
        setInternalUnread(data.unreadCount ?? data.items.filter((n) => !n.isRead).length);
      } else if (data?.unreadCount !== undefined) {
        setInternalUnread(data.unreadCount);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
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
      setInternalNotice("Học liệu không còn tồn tại trên hệ thống");
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-[var(--text-secondary,#475569)] hover:bg-[var(--bg-muted,#f1f5f9)] hover:text-[var(--text-primary,#0f172a)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#007A5E)] transition"
        aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white ring-2 ring-[var(--bg-surface,#ffffff)] animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Khung thả xuống danh sách thông báo */}
      {open && (
        <div
          role="dialog"
          aria-label="Danh sách thông báo"
          className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-[var(--bg-surface,#ffffff)] shadow-2xl border border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle,#e2e8f0)] dark:border-slate-800 px-4 py-3 bg-[var(--bg-muted,#f8fafc)]">
            <h2 className="text-sm font-bold text-[var(--text-primary,#0f172a)]">
              Thông báo{unread > 0 && <span className="ml-1.5 text-xs font-semibold text-[var(--brand-primary,#007A5E)]">({unread} chưa đọc)</span>}
            </h2>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unread === 0}
              className="rounded text-xs font-semibold text-[var(--brand-primary,#007A5E)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#007A5E)] disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline transition"
            >
              Đánh dấu đã đọc tất cả
            </button>
          </div>

          {/* Cảnh báo khi học liệu bị gỡ */}
          {notice && (
            <div role="alert" className="border-b border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
              {notice}
            </div>
          )}

          {loading ? (
            <div className="px-6 py-8 text-center text-xs text-[var(--text-tertiary,#64748b)]">
              Đang tải danh sách thông báo...
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--text-primary,#0f172a)]">Bạn chưa có thông báo mới nào</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary,#475569)]">
                Khi tài liệu bạn đăng được duyệt hoặc bị từ chối, kết quả sẽ hiện ở đây.
              </p>
            </div>
          ) : (
            <ul className="max-h-96 divide-y divide-[var(--border-subtle,#e2e8f0)] dark:divide-slate-800 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectNotification(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-[var(--bg-muted,#f8fafc)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand-primary,#007A5E)] transition ${
                      n.isRead ? "" : "bg-[var(--brand-primary,#007A5E)]/5 dark:bg-[var(--brand-primary,#007A5E)]/10"
                    }`}
                  >
                    <TypeIcon type={n.type} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-xs leading-tight text-[var(--text-primary,#0f172a)] ${n.isRead ? "font-medium" : "font-bold"}`}>
                        {n.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-[var(--text-secondary,#475569)] line-clamp-2">
                        {n.message}
                      </span>
                      <span className="mt-1 block text-[10px] text-[var(--text-tertiary,#64748b)]">
                        {n.createdAt}
                      </span>
                    </span>
                    {!n.isRead && (
                      <span className="mt-2 h-2 w-2 flex-none rounded-full bg-[var(--brand-primary,#007A5E)]" aria-label="Chưa đọc" />
                    )}
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
