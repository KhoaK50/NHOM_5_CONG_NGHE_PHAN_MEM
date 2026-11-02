import { useState } from 'react';

// ====== DỮ LIỆU MẪU (chưa gắn API) ======
const SAMPLE_DOCUMENTS = [
  {
    id: 1,
    title: 'Giáo trình Cấu trúc dữ liệu và Giải thuật',
    course: 'Cấu trúc dữ liệu',
    uploadedAt: '28/10/2026',
    size: '4.2 MB',
    pages: 186,
    sha256: 'a3f9c1…7be2',
    status: 'pending',
  },
  {
    id: 2,
    title: 'Bài giảng Lập trình hướng đối tượng với Java',
    course: 'Lập trình hướng đối tượng',
    uploadedAt: '30/10/2026',
    size: '2.8 MB',
    pages: 94,
    sha256: '5d20be…19ac',
    status: 'pending',
  },
  {
    id: 3,
    title: 'Slide Cơ sở dữ liệu - Chương 3: SQL nâng cao',
    course: 'Cơ sở dữ liệu',
    uploadedAt: '15/10/2026',
    size: '1.6 MB',
    pages: 52,
    sha256: 'c81e72…40fd',
    status: 'approved',
    approvedAt: '17/10/2026',
    views: 342,
    downloads: 87,
  },
  {
    id: 4,
    title: 'Đề cương ôn tập Phương pháp dạy học Tin học',
    course: 'PPDH Tin học',
    uploadedAt: '02/10/2026',
    size: '980 KB',
    pages: 24,
    sha256: 'e4da3b…aa01',
    status: 'approved',
    approvedAt: '04/10/2026',
    views: 215,
    downloads: 61,
  },
  {
    id: 5,
    title: 'Tổng hợp công thức Toán rời rạc',
    course: 'Toán rời rạc',
    uploadedAt: '20/10/2026',
    size: '3.1 MB',
    pages: 40,
    sha256: '1679091…3c9d',
    status: 'rejected',
    rejectedAt: '22/10/2026',
    reason: 'Tài liệu có nội dung bị trùng với bản đã đăng, chất lượng ảnh scan thấp.',
  },
];

const TABS = [
  { key: 'pending', label: 'Chờ duyệt', color: 'amber' },
  { key: 'approved', label: 'Đã duyệt', color: 'emerald' },
  { key: 'rejected', label: 'Bị từ chối', color: 'rose' },
];

const BADGE = {
  pending: 'bg-amber-100 text-amber-700 ring-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-100 text-rose-700 ring-rose-200',
};

const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
};

export default function MyDocuments() {
  const [activeTab, setActiveTab] = useState('pending');

  const countOf = (status) => SAMPLE_DOCUMENTS.filter((d) => d.status === status).length;
  const list = SAMPLE_DOCUMENTS.filter((d) => d.status === activeTab);

  return (
    <section className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tài liệu của tôi</h1>
          <p className="text-sm text-slate-500">
            Theo dõi trạng thái kiểm duyệt các tài liệu bạn đã tải lên.
          </p>
        </div>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700">
          + Tải tài liệu lên
        </button>
      </header>

      {/* 3 tab trạng thái */}
      <div className="mb-5 flex gap-2 border-b border-slate-200">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {countOf(tab.key)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Danh sách */}
      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          Chưa có tài liệu nào ở trạng thái này.
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((doc) => (
            <li
              key={doc.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-md bg-red-50 text-xs font-bold text-red-600">
                  PDF
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-800">{doc.title}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${BADGE[doc.status]}`}
                    >
                      {STATUS_LABEL[doc.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {doc.course} • {doc.pages} trang • {doc.size} • Tải lên {doc.uploadedAt}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    SHA-256: <span className="font-mono">{doc.sha256}</span>
                  </p>

                  {doc.status === 'approved' && (
                    <p className="mt-2 text-sm text-emerald-700">
                      Duyệt ngày {doc.approvedAt} • {doc.views} lượt xem • {doc.downloads} lượt tải
                    </p>
                  )}

                  {doc.status === 'rejected' && (
                    <div className="mt-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                      <strong>Lý do từ chối ({doc.rejectedAt}):</strong> {doc.reason}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  {doc.status === 'approved' && (
                    <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                      Xem
                    </button>
                  )}
                  {doc.status === 'pending' && (
                    <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                      Thu hồi
                    </button>
                  )}
                  {doc.status === 'rejected' && (
                    <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700">
                      Tải lại
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
