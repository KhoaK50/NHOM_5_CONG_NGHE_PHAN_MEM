import { useState } from 'react';

// UC12 - Tài liệu đã lưu / đánh dấu trang (giao diện tĩnh, dữ liệu mẫu)

const SAMPLE_SAVED = [
  { id: 1, title: 'Giáo trình Cấu trúc dữ liệu và Giải thuật', course: 'Cấu trúc dữ liệu', savedAt: '30/10/2026', bookmarks: [{ page: 12, note: 'Định nghĩa danh sách liên kết' }, { page: 58, note: 'Thuật toán sắp xếp nhanh' }] },
  { id: 2, title: 'Slide Cơ sở dữ liệu - Chương 3: SQL nâng cao', course: 'Cơ sở dữ liệu', savedAt: '28/10/2026', bookmarks: [{ page: 7, note: 'JOIN các loại' }] },
  { id: 3, title: 'Bài giảng Lập trình hướng đối tượng với Java', course: 'Lập trình hướng đối tượng', savedAt: '25/10/2026', bookmarks: [] },
  { id: 4, title: 'Đề cương ôn tập Phương pháp dạy học Tin học', course: 'PPDH Tin học', savedAt: '20/10/2026', bookmarks: [{ page: 3, note: 'Các phương pháp dạy học tích cực' }, { page: 15, note: '' }] },
  { id: 5, title: 'Giáo trình Mạng máy tính căn bản', course: 'Mạng máy tính', savedAt: '18/10/2026', bookmarks: [{ page: 40, note: 'Mô hình OSI' }] },
  { id: 6, title: 'Tổng hợp bài tập Toán rời rạc', course: 'Toán rời rạc', savedAt: '10/10/2026', bookmarks: [] },
];

export default function SavedBookmarks() {
  const [items, setItems] = useState(SAMPLE_SAVED);
  const [keyword, setKeyword] = useState('');

  const filtered = items.filter((d) =>
    d.title.toLowerCase().includes(keyword.trim().toLowerCase())
  );

  const removeItem = (id) => setItems((prev) => prev.filter((d) => d.id !== id));

  return (
    <section className="mx-auto max-w-6xl p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tài liệu đã lưu</h1>
          <p className="text-sm text-slate-500">
            {items.length} tài liệu • các trang bạn đã đánh dấu để đọc lại nhanh.
          </p>
        </div>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm trong tài liệu đã lưu..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 sm:w-72"
        />
      </header>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Không có tài liệu nào phù hợp.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc) => (
            <article
              key={doc.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex h-12 w-10 shrink-0 items-center justify-center rounded-md bg-red-50 text-xs font-bold text-red-600">
                  PDF
                </div>
                <button
                  onClick={() => removeItem(doc.id)}
                  title="Bỏ lưu"
                  className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  ✕ Bỏ lưu
                </button>
              </div>

              <h3 className="font-semibold leading-snug text-slate-800">{doc.title}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {doc.course} • Lưu ngày {doc.savedAt}
              </p>

              <div className="mt-3 flex-1">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Trang đã đánh dấu
                </p>
                {doc.bookmarks.length === 0 ? (
                  <p className="text-sm text-slate-400">Chưa có đánh dấu trang.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {doc.bookmarks.map((b) => (
                      <li
                        key={b.page}
                        className="flex items-center gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-sm"
                      >
                        <span className="rounded bg-amber-200 px-1.5 text-xs font-semibold text-amber-800">
                          Tr.{b.page}
                        </span>
                        <span className="truncate text-slate-700">{b.note || 'Không có ghi chú'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button className="mt-4 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Đọc tiếp
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
