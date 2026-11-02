// UC11 - Bảng điều khiển quản trị (giao diện tĩnh, dữ liệu mẫu)

const STATS = [
  { label: 'Tổng tài liệu', value: '1.248', note: '+32 tuần này', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Chờ kiểm duyệt', value: '17', note: '5 yêu cầu quá 48 giờ', color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Người dùng', value: '864', note: '+21 tuần này', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Lượt tải xuống', value: '9.730', note: '+412 tuần này', color: 'text-sky-600', bg: 'bg-sky-50' },
];

const WEEKLY_UPLOADS = [
  { week: 'T1', value: 18 },
  { week: 'T2', value: 26 },
  { week: 'T3', value: 22 },
  { week: 'T4', value: 35 },
  { week: 'T5', value: 29 },
  { week: 'T6', value: 41 },
  { week: 'T7', value: 32 },
];

const PENDING_QUEUE = [
  { id: 1, title: 'Giáo trình Cấu trúc dữ liệu và Giải thuật', author: 'Nguyễn Văn An', course: 'Cấu trúc dữ liệu', time: '2 giờ trước' },
  { id: 2, title: 'Bài giảng Lập trình hướng đối tượng với Java', author: 'Trần Thị Bình', course: 'Lập trình hướng đối tượng', time: '5 giờ trước' },
  { id: 3, title: 'Ôn tập Mạng máy tính', author: 'Lê Minh Châu', course: 'Mạng máy tính', time: 'Hôm qua' },
  { id: 4, title: 'Tài liệu Phương pháp dạy học Tin học', author: 'Phạm Quốc Dũng', course: 'PPDH Tin học', time: '2 ngày trước' },
];

const TOP_COURSES = [
  { name: 'Cơ sở dữ liệu', docs: 142, percent: 100 },
  { name: 'Cấu trúc dữ liệu', docs: 118, percent: 83 },
  { name: 'Lập trình hướng đối tượng', docs: 96, percent: 68 },
  { name: 'PPDH Tin học', docs: 74, percent: 52 },
];

const ACTIVITIES = [
  { text: 'Admin Khoa đã duyệt "Slide CSDL - Chương 3"', time: '10 phút trước', dot: 'bg-emerald-500' },
  { text: 'Admin Khoa đã từ chối "Công thức Toán rời rạc"', time: '1 giờ trước', dot: 'bg-rose-500' },
  { text: 'Có báo cáo vi phạm mới cho tài liệu #214', time: '3 giờ trước', dot: 'bg-amber-500' },
  { text: 'Người dùng mới đăng ký: Hoàng Gia Huy', time: '5 giờ trước', dot: 'bg-sky-500' },
];

export default function AdminDashboard() {
  const maxValue = Math.max(...WEEKLY_UPLOADS.map((w) => w.value));

  return (
    <section className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Bảng điều khiển quản trị</h1>
        <p className="text-sm text-slate-500">Tổng quan hoạt động của nền tảng 5share.</p>
      </header>

      {/* Thẻ thống kê */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`mb-3 inline-block rounded-lg px-2.5 py-1 text-xs font-medium ${s.bg} ${s.color}`}>
              {s.label}
            </div>
            <div className="text-3xl font-bold text-slate-800">{s.value}</div>
            <div className="mt-1 text-xs text-slate-500">{s.note}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Biểu đồ cột */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-slate-800">Tài liệu tải lên theo tuần</h2>
          <div className="flex h-48 items-end gap-3">
            {WEEKLY_UPLOADS.map((w) => (
              <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-slate-500">{w.value}</span>
                <div
                  className="w-full rounded-t-md bg-indigo-500"
                  style={{ height: `${Math.round((w.value / maxValue) * 140)}px` }}
                />
                <span className="text-xs text-slate-500">{w.week}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Môn học nhiều tài liệu */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Môn học nhiều tài liệu nhất</h2>
          <ul className="space-y-3">
            {TOP_COURSES.map((c) => (
              <li key={c.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-700">{c.name}</span>
                  <span className="text-slate-500">{c.docs}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${c.percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Hàng chờ duyệt */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Tài liệu chờ duyệt</h2>
            <button className="text-sm font-medium text-indigo-600 hover:underline">Xem tất cả</button>
          </div>
          <ul className="divide-y divide-slate-100">
            {PENDING_QUEUE.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.author} • {item.course} • {item.time}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700">
                    Duyệt
                  </button>
                  <button className="rounded-lg border border-rose-300 px-3 py-1 text-xs text-rose-600 hover:bg-rose-50">
                    Từ chối
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Hoạt động gần đây */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-800">Hoạt động gần đây</h2>
          <ul className="space-y-4">
            {ACTIVITIES.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.dot}`} />
                <div>
                  <p className="text-sm text-slate-700">{a.text}</p>
                  <p className="text-xs text-slate-400">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
