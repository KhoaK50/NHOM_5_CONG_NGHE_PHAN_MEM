import { useState } from 'react';

// UC13 - Đánh giá & bình luận tài liệu (giao diện tĩnh, dữ liệu mẫu)

const DOCUMENT = {
  title: 'Giáo trình Cấu trúc dữ liệu và Giải thuật',
  course: 'Cấu trúc dữ liệu',
};

const SAMPLE_COMMENTS = [
  { id: 1, author: 'Nguyễn Văn An', initials: 'NA', rating: 5, time: '2 ngày trước', content: 'Tài liệu trình bày rõ ràng, có nhiều ví dụ minh họa. Rất hợp để ôn thi cuối kỳ.' },
  { id: 2, author: 'Trần Thị Bình', initials: 'TB', rating: 4, time: '4 ngày trước', content: 'Nội dung đầy đủ, nhưng phần cây AVL hơi ngắn, mong bổ sung thêm bài tập.' },
  { id: 3, author: 'Lê Minh Châu', initials: 'LC', rating: 5, time: '1 tuần trước', content: 'Cảm ơn bạn đã chia sẻ, mình đọc online rất mượt.' },
  { id: 4, author: 'Phạm Quốc Dũng', initials: 'PD', rating: 3, time: '2 tuần trước', content: 'Một số trang bị mờ, đọc hơi khó.' },
];

const DISTRIBUTION = [
  { star: 5, count: 42 },
  { star: 4, count: 18 },
  { star: 3, count: 6 },
  { star: 2, count: 2 },
  { star: 1, count: 1 },
];

function Stars({ value, size = 'text-lg' }) {
  return (
    <span className={`${size} leading-none`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? 'text-amber-400' : 'text-slate-300'}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function RatingComments() {
  const [comments, setComments] = useState(SAMPLE_COMMENTS);
  const [myRating, setMyRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');

  const total = DISTRIBUTION.reduce((s, d) => s + d.count, 0);
  const average = (DISTRIBUTION.reduce((s, d) => s + d.star * d.count, 0) / total).toFixed(1);

  const submit = (e) => {
    e.preventDefault();
    if (!myRating || !text.trim()) return;
    setComments([
      { id: Date.now(), author: 'Bạn', initials: 'B', rating: myRating, time: 'Vừa xong', content: text.trim() },
      ...comments,
    ]);
    setMyRating(0);
    setText('');
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Đánh giá & bình luận</h1>
        <p className="text-sm text-slate-500">
          {DOCUMENT.title} • {DOCUMENT.course}
        </p>
      </header>

      {/* Tổng quan đánh giá */}
      <div className="grid gap-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center justify-center">
          <div className="text-5xl font-bold text-slate-800">{average}</div>
          <Stars value={Math.round(average)} size="text-xl" />
          <p className="mt-1 text-xs text-slate-500">{total} lượt đánh giá</p>
        </div>
        <ul className="space-y-2">
          {DISTRIBUTION.map((d) => (
            <li key={d.star} className="flex items-center gap-3 text-sm">
              <span className="w-10 text-slate-600">{d.star} ★</span>
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-amber-400"
                  style={{ width: `${(d.count / total) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-slate-500">{d.count}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Form đánh giá */}
      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Viết đánh giá của bạn</h2>
        <div className="mb-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setMyRating(n)}
              onMouseEnter={() => setHover(n)}
              className={`text-3xl leading-none transition ${
                n <= (hover || myRating) ? 'text-amber-400' : 'text-slate-300'
              }`}
              aria-label={`${n} sao`}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm text-slate-500">
            {myRating ? `${myRating}/5` : 'Chọn số sao'}
          </span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Chia sẻ cảm nhận của bạn về tài liệu này..."
          className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={!myRating || !text.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Gửi đánh giá
          </button>
        </div>
      </form>

      {/* Danh sách bình luận */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-800">Bình luận ({comments.length})</h2>
        <ul className="divide-y divide-slate-100">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                {c.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3">
                  <span className="font-medium text-slate-800">{c.author}</span>
                  <Stars value={c.rating} size="text-sm" />
                  <span className="text-xs text-slate-400">{c.time}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{c.content}</p>
                <div className="mt-2 flex gap-4 text-xs text-slate-400">
                  <button className="hover:text-indigo-600">Hữu ích</button>
                  <button className="hover:text-indigo-600">Trả lời</button>
                  <button className="hover:text-rose-600">Báo cáo</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
