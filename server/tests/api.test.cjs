/**
 * Kiểm thử API toàn hệ thống trên CSDL local vừa nạp schema, migration và seed.
 * Cách chạy: TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/ten_csdl npm test
 * Chạy trong tiến trình, chặn mọi kết nối ra ngoài và giả lập Cloudinary.
 * Tự dừng nếu CSDL không ở máy local để không ghi nhầm vào dữ liệu thật.
 */
const fs = require('fs');
const crypto = require('crypto');
const { Client } = require('pg');
const { PDFDocument } = require('pdf-lib');

const DB_URL = process.env.TEST_DATABASE_URL;
if (!DB_URL || !/@(127\.0\.0\.1|localhost)[:/]/.test(DB_URL)) {
  console.error('Cần TEST_DATABASE_URL trỏ tới CSDL local.');
  process.exit(2);
}
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = DB_URL;
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';

const SEED_PASSWORD = '5Share@2026';
const U = {
  admin: 'sc3.nguyentrandangkhoa@gmail.com',
  tram: 'tramlnt.spth@hcmue.edu.vn',
  vi: 'vipt.spth@hcmue.edu.vn',
  danh: 'danhnh.spth@hcmue.edu.vn',
  dat: 'dattd.spth@hcmue.edu.vn',
  locked: 'namtv.spth@hcmue.edu.vn'
};
const allCriteria = () => Object.fromEntries(['readable', 'academic', 'courseMatch', 'metadataComplete', 'notDuplicate', 'safeContent', 'copyrightOk', 'privacyOk'].map((k) => [k, true]));

async function makePdf(tag, pages = 5) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pages; i += 1) doc.addPage([300, 300]).drawText(`${tag} ${i}`, { x: 20, y: 200, size: 12 });
  return Buffer.from(await doc.save());
}
const pageCount = async (buffer) => (await PDFDocument.load(buffer)).getPageCount();

const results = [];
async function tc(id, title, expected, fn) {
  let out;
  try { out = await fn(); } catch (e) { out = { pass: false, actual: `LỖI KHI CHẠY: ${e.message}` }; }
  results.push({ id, title, expected, actual: out.actual, result: out.pass ? 'PASS' : 'FAIL' });
  console.log(`${out.pass ? 'PASS' : 'FAIL'} ${id} | ${title} | ${out.actual}`);
}

(async () => {
  const sample = await makePdf('Mau', 5);
  const realFetch = global.fetch;
  let cloudinaryCount = 0;
  global.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url || input.href);
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) return realFetch(input, options);
    if (url.hostname === 'api.cloudinary.com') {
      cloudinaryCount += 1;
      const bytes = options.body?.get?.('file')?.size || 1000;
      return new Response(JSON.stringify({ secure_url: `https://res.cloudinary.com/demo/raw/upload/v1/test_${cloudinaryCount}.pdf`, bytes, pages: 5, public_id: `test_${cloudinaryCount}` }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (/^res(-[1-5])?\.cloudinary\.com$/.test(url.hostname)) return new Response(sample, { status: 200, headers: { 'content-type': 'application/pdf', 'content-length': String(sample.length) } });
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const app = require('../index.js');
  const server = await new Promise((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const API = `http://127.0.0.1:${server.address().port}`;
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  const sql = async (q, p) => (await db.query(q, p)).rows;

  async function call(method, path, { token, body, form, headers = {} } = {}) {
    const h = { ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
    const r = await fetch(API + path, { method, headers: h, body: payload });
    const ct = r.headers.get('content-type') || '';
    let j = null, raw = null;
    if (ct.includes('json')) j = await r.json().catch(() => null);
    else raw = Buffer.from(await r.arrayBuffer());
    return { s: r.status, j, raw, h: r.headers };
  }
  const login = async (email) => {
    const r = await call('POST', '/api/auth/login', { body: { email, password: SEED_PASSWORD } });
    return { ...r, t: r.j?.token };
  };
  const fd = (buffer, name, fields = {}) => {
    const f = new FormData();
    if (buffer) f.append('file', new Blob([buffer]), name);
    for (const k of Object.keys(fields)) f.append(k, fields[k]);
    return f;
  };
  const T = {};
  for (const k of ['admin', 'tram', 'vi', 'danh', 'dat']) T[k] = (await login(U[k])).t;
  const meta = { title: 'Tài liệu kiểm thử tự động', description: 'Mô tả tài liệu kiểm thử đủ độ dài yêu cầu', courseCode: 'COMP1010', docType: 'GIAO_TRINH' };
  const exe = Buffer.concat([Buffer.from([0x4d, 0x5a, 0x90, 0]), Buffer.alloc(2000)]);

  // ===== UC01 & RBAC
  await tc('TC-01', 'Đăng nhập đúng mật khẩu', '200, có JWT', async () => { const r = await login(U.tram); return { pass: r.s === 200 && !!r.t, actual: `HTTP ${r.s}, token=${!!r.t}` }; });
  await tc('TC-02', 'Đăng nhập sai mật khẩu', '401', async () => { const r = await call('POST', '/api/auth/login', { body: { email: U.tram, password: 'SaiMatKhau#1' } }); return { pass: r.s === 401, actual: `HTTP ${r.s}` }; });
  await tc('TC-03', 'Đăng nhập tài khoản LOCKED', '403', async () => { const r = await login(U.locked); return { pass: r.s === 403, actual: `HTTP ${r.s}` }; });
  await tc('TC-04', 'Phân quyền Admin, User, Guest', 'Guest 401, Student 403, Admin 200', async () => {
    const g = await call('GET', '/api/admin/documents'), s = await call('GET', '/api/admin/documents', { token: T.tram }), a = await call('GET', '/api/admin/documents', { token: T.admin });
    return { pass: g.s === 401 && s.s === 403 && a.s === 200, actual: `${g.s}, ${s.s}, ${a.s}` };
  });

  // ===== UC02-04
  await tc('TC-05', 'Đăng ký trùng email', 'Lần 2: 409', async () => {
    const b = { fullName: 'Kiem Thu', email: 'kiemthu.tudong@gmail.com', password: 'KiemThu@2026' };
    const a = await call('POST', '/api/auth/register', { body: b }), c = await call('POST', '/api/auth/register', { body: b });
    return { pass: a.s === 201 && c.s === 409, actual: `${a.s}, ${c.s}` };
  });
  await tc('TC-06', 'Mật khẩu dưới 8 ký tự', '400', async () => { const r = await call('POST', '/api/auth/register', { body: { fullName: 'Kiem Thu', email: 'kiemthu.ngan@gmail.com', password: 'Ab@1234' } }); return { pass: r.s === 400, actual: `HTTP ${r.s}` }; });
  await tc('TC-07', 'Chuông thông báo khi duyệt và từ chối', 'unreadCount tăng, có lý do', async () => {
    const b0 = (await call('GET', '/api/notifications', { token: T.vi })).j.data.unreadCount;
    const a = await call('PATCH', '/api/admin/documents/7/moderate', { token: T.admin, body: { decision: 'APPROVE', criteria: allCriteria() } });
    const b1 = (await call('GET', '/api/notifications', { token: T.vi })).j.data;
    const t0 = (await call('GET', '/api/notifications', { token: T.tram })).j.data.unreadCount;
    const rj = await call('PATCH', '/api/admin/documents/10/moderate', { token: T.admin, body: { decision: 'REJECT', reason: 'Tài liệu thiếu phần đáp án và bị mờ ở nhiều trang' } });
    const t1 = (await call('GET', '/api/notifications', { token: T.tram })).j.data;
    return { pass: a.s === 200 && rj.s === 200 && b1.unreadCount === b0 + 1 && t1.unreadCount === t0 + 1 && /Lý do/.test(t1.items[0].message), actual: `Vĩ ${b0}→${b1.unreadCount}, Trâm ${t0}→${t1.unreadCount}` };
  });
  await tc('TC-08', 'Chặn báo cáo rỗng, trùng', 'Rỗng 400, lần 2 409', async () => {
    const body = { documentId: 15, reason: 'SAI_MON_HOC', description: 'Tài liệu này xếp sai môn học rõ ràng' };
    const e = await call('POST', '/api/reports', { token: T.dat, body: { ...body, description: '   ' } }), a = await call('POST', '/api/reports', { token: T.dat, body }), b = await call('POST', '/api/reports', { token: T.dat, body });
    return { pass: e.s === 400 && a.s === 201 && b.s === 409, actual: `${e.s}, ${a.s}, ${b.s}` };
  });

  // ===== UC05-07
  await tc('TC-09', 'Tìm tiếng Việt, lọc theo môn và kỳ ở API', 'Có dấu, không dấu đều ra; lọc đúng', async () => {
    const c = async (q) => (await call('GET', `/api/documents?${q}`)).j.data;
    const a = await c(`q=${encodeURIComponent('đồ thị')}`), b = await c('q=do%20thi'), code = await c('q=COMP1701');
    const all = await c('limit=100'), byCourse = await c('limit=100&courseId=8'), bySem = await c('limit=100&semester=1'), byFmt = await c('limit=100&format=pdf'), none = await c('q=zzzkhongco');
    const bad = await call('GET', '/api/documents?courseId=abc');
    return { pass: a.length > 0 && b.length === a.length && code.length > 0 && byCourse.length > 0 && byCourse.length < all.length && byCourse.every((d) => d.courseId === 8) && bySem.length < all.length && byFmt.length === all.length && none.length === 0 && bad.s === 400, actual: `có dấu=${a.length}, không dấu=${b.length}, môn=${byCourse.length}/${all.length}, kỳ=${bySem.length}, sai tham số=${bad.s}` };
  });
  await tc('TC-10', 'Guest chỉ nhận 3 trang PDF từ máy chủ', '200, tệp còn 3 trang; thành viên đủ 5', async () => {
    const g = await call('GET', '/api/documents/1/preview'), s = await call('GET', '/api/documents/1/preview', { token: T.dat });
    const gp = await pageCount(g.raw), sp = await pageCount(s.raw);
    return { pass: g.s === 200 && gp === 3 && sp === 5, actual: `Guest ${gp} trang, Sinh viên ${sp} trang` };
  });
  await tc('TC-11', 'Chặn .exe giả mạo', '415, không lưu', async () => {
    const n0 = (await sql('select count(*)::int c from documents'))[0].c;
    const a = await call('POST', '/api/documents', { token: T.dat, form: fd(exe, 'malware.exe', meta) }), b = await call('POST', '/api/documents', { token: T.dat, form: fd(exe, 'baitap.pdf', meta) });
    const n1 = (await sql('select count(*)::int c from documents'))[0].c;
    return { pass: a.s === 415 && b.s === 415 && n0 === n1, actual: `${a.j?.code}, ${b.j?.code}, ${n0}→${n1}` };
  });
  await tc('TC-12', 'Chặn tệp quá 10 MB', '413; đúng 10 MB không bị chặn vì dung lượng', async () => {
    const base = await makePdf('Lon', 1);
    const over = Buffer.concat([base, Buffer.from('\n%'), Buffer.alloc(10 * 1024 * 1024, 120)]);
    const r = await call('POST', '/api/documents', { token: T.dat, form: fd(over, 'lon.pdf', meta) });
    return { pass: r.s === 413 && /10 MB/.test(r.j?.message), actual: `HTTP ${r.s}: ${r.j?.message}` };
  });
  await tc('TC-13', 'Chặn thiếu metadata và môn không hợp lệ', '400 cả ba', async () => {
    const pdf = await makePdf('Thieu');
    const a = await call('POST', '/api/documents', { token: T.dat, form: fd(pdf, 'a.pdf', { ...meta, title: '' }) });
    const b = await call('POST', '/api/documents', { token: T.dat, form: fd(pdf, 'a.pdf', { ...meta, description: '' }) });
    const c = await call('POST', '/api/documents', { token: T.dat, form: fd(pdf, 'a.pdf', { ...meta, courseCode: 'KHONGTONTAI' }) });
    return { pass: a.s === 400 && b.s === 400 && c.s === 400 && c.j?.code === 'COURSE_NOT_FOUND', actual: `${a.s}, ${b.s}, ${c.s} ${c.j?.code}` };
  });

  // ===== UC08-10
  await tc('TC-14', 'Chặn trùng SHA-256', 'Lần 2: 409', async () => {
    const pdf = await makePdf('Trung');
    const a = await call('POST', '/api/documents', { token: T.dat, form: fd(pdf, 'u.pdf', meta) });
    const h = await call('POST', '/api/documents/check-hash', { token: T.danh, form: fd(pdf, 'u.pdf') });
    const b = await call('POST', '/api/documents', { token: T.danh, form: fd(pdf, 'khac.pdf', meta) });
    return { pass: a.s === 201 && h.s === 409 && b.s === 409 && a.j.data.status === 'PENDING', actual: `${a.s}, ${h.s}, ${b.s}` };
  });
  await tc('TC-15', 'Không lộ PENDING, REJECTED', '401 hoặc 404, chủ tài liệu xem được', async () => {
    const codes = new Set();
    for (const id of [9, 8]) for (const t of [null, T.vi]) for (const p of ['', '/preview', '/download', '/comments']) codes.add((await call('GET', `/api/documents/${id}${p}`, { token: t })).s);
    const leak = (await call('GET', '/api/documents?limit=100')).j.data.filter((d) => d.status !== 'APPROVED').length;
    const own = await call('GET', '/api/documents/9', { token: T.danh });
    return { pass: [...codes].every((c) => c === 401 || c === 404) && leak === 0 && own.s === 200, actual: `${[...codes].join(',')}; rò rỉ=${leak}; chủ=${own.s}` };
  });
  await tc('TC-16', 'Từ chối thiếu lý do', '422, vẫn PENDING', async () => {
    const a = await call('PATCH', '/api/admin/documents/9/moderate', { token: T.admin, body: { decision: 'REJECT', reason: '' } }), b = await call('PATCH', '/api/admin/documents/9/moderate', { token: T.admin, body: { decision: 'REJECT', reason: '123456789' } });
    const s = (await sql('select status from documents where id=9'))[0].status;
    return { pass: a.s === 422 && b.s === 422 && s === 'PENDING', actual: `${a.s}, ${b.s}, ${s}` };
  });
  await tc('TC-17', 'Ẩn, xóa vi phạm xử lý liên đới', 'Rời Kho, bookmark không hiện, bình luận ẩn, có log', async () => {
    const a = await call('PATCH', '/api/admin/reports/1/resolve', { token: T.admin, body: { action: 'HIDE', adminNote: 'Ẩn để xác minh vi phạm' } });
    const c = await call('PATCH', '/api/admin/reports/3/resolve', { token: T.admin, body: { action: 'DELETE', adminNote: 'Gỡ tài liệu vi phạm' } });
    const pub = (await call('GET', '/api/documents?limit=100')).j.data.map((d) => d.id);
    const bm = (await call('GET', '/api/bookmarks', { token: T.danh })).j.data.map((d) => d.id);
    const visible = (await sql('select count(*)::int c from document_comments where document_id in (5,14) and is_hidden=false'))[0].c;
    const logs = (await sql("select count(*)::int c from moderation_logs where document_id in (5,14) and new_status in ('HIDDEN','DELETED')"))[0].c;
    return { pass: a.s === 200 && c.s === 200 && !pub.includes(5) && !pub.includes(14) && !bm.includes(5) && visible === 0 && logs === 2, actual: `${a.s}, ${c.s}; bookmark còn=${bm.includes(5)}; bình luận=${visible}; log=${logs}` };
  });
  await tc('TC-18', 'Chặn xóa môn có tài liệu', '409; môn trống 204', async () => {
    const a = await call('DELETE', '/api/admin/courses/1', { token: T.admin });
    const n = await call('POST', '/api/admin/courses', { token: T.admin, body: { courseCode: 'TESTAUTO', courseName: 'Môn kiểm thử', knowledgeBlock: 'DAI_CUONG', credits: 2, semester: 1 } });
    const d = await call('DELETE', `/api/admin/courses/${n.j?.data?.id}`, { token: T.admin });
    return { pass: a.s === 409 && n.s === 201 && d.s === 204, actual: `${a.s}, ${n.s}, ${d.s}` };
  });

  // ===== UC11-13
  await tc('TC-19', 'Đếm lượt tải, chặn Guest', 'Guest 401, Student 200, +1', async () => {
    const g = await call('GET', '/api/documents/1/download');
    const b = (await sql('select total_downloads n from documents where id=1'))[0].n;
    const s = await call('GET', '/api/documents/1/download', { token: T.dat });
    const a = (await sql('select total_downloads n from documents where id=1'))[0].n;
    return { pass: g.s === 401 && s.s === 200 && a === b + 1, actual: `${g.s}, ${s.s}, ${b}→${a}` };
  });
  await tc('TC-20', 'Thêm, bỏ Bookmark', '201, 204, PENDING 404, Guest 401', async () => {
    const a = await call('POST', '/api/bookmarks', { token: T.dat, body: { documentId: 1 } });
    const l = (await call('GET', '/api/bookmarks', { token: T.dat })).j.data.map((d) => d.id);
    const d = await call('DELETE', '/api/bookmarks/1', { token: T.dat });
    const p = await call('POST', '/api/bookmarks', { token: T.dat, body: { documentId: 9 } }), g = await call('POST', '/api/bookmarks', { body: { documentId: 1 } });
    return { pass: a.s === 201 && l.includes(1) && d.s === 204 && p.s === 404 && g.s === 401, actual: `${a.s}, ${d.s}, ${p.s}, ${g.s}` };
  });
  await tc('TC-21', 'Chống chấm lặp, tính lại rating_avg', '2 bản ghi, trung bình 2', async () => {
    const r = (t, score) => call('POST', '/api/documents/15/ratings', { token: t, body: { score } });
    await r(T.danh, 5); await r(T.danh, 3); await r(T.dat, 1);
    const z = await r(T.dat, 0), s = await r(T.dat, 6);
    const n = (await sql('select count(*)::int c from ratings where document_id=15'))[0].c;
    const avg = Number((await sql('select rating_avg r from documents where id=15'))[0].r);
    return { pass: z.s === 400 && s.s === 400 && n === 2 && avg === 2, actual: `${n} bản ghi, trung bình ${avg}, ${z.s}, ${s.s}` };
  });
  await tc('TC-22', 'Bình luận: rỗng, quá 1.000 ký tự, xóa', '400, 400, 201, 403, 200; đúng 1.000 ký tự được nhận', async () => {
    const post = (content) => call('POST', '/api/documents/16/comments', { token: T.dat, body: { content } });
    const e = await post('   '), l = await post('a'.repeat(1001));
    const m = await post('a'.repeat(1000));
    await call('DELETE', `/api/documents/16/comments/${m.j?.data?.id}`, { token: T.dat });
    const o = await post('Tài liệu rất hữu ích cho ôn tập');
    const f = await call('DELETE', `/api/documents/16/comments/${o.j?.data?.id}`, { token: T.vi }), d = await call('DELETE', `/api/documents/16/comments/${o.j?.data?.id}`, { token: T.dat });
    const rv = await call('PUT', '/api/documents/16/reviews/mine', { token: T.dat, body: { score: 4, content: 'a'.repeat(1001) } });
    return { pass: e.s === 400 && l.s === 400 && m.s === 201 && o.s === 201 && f.s === 403 && d.s === 200 && rv.s === 400, actual: `${e.s}, ${l.s}, 1000 ký tự ${m.s}, ${o.s}, ${f.s}, ${d.s}, nhận xét dài ${rv.s}` };
  });
  await tc('TC-23', 'Lý do từ chối ở trang cá nhân', 'REJECTED, đúng lý do', async () => {
    const r = await call('GET', '/api/documents/my-uploads?status=REJECTED', { token: T.tram });
    const d = r.j?.data?.items?.find((x) => x.id === 10);
    return { pass: d?.status === 'REJECTED' && /thiếu phần đáp án/.test(d?.rejectReason || ''), actual: `${d?.status}` };
  });

  // ===== Hồi quy các lỗi trong Bug Log
  await tc('R-01', 'BUG-01: giá trị mẫu không thay được JWT', '401', async () => {
    const r = await call('GET', '/api/notifications', { headers: { Authorization: 'Bearer mock_jwt' } });
    return { pass: r.s === 401, actual: `HTTP ${r.s}` };
  });
  await tc('R-02', 'BUG-02: không còn API giả lập thông báo', '404', async () => {
    const r = await call('POST', '/api/notifications/simulate-moderation', { body: {} });
    return { pass: r.s === 404, actual: `HTTP ${r.s}` };
  });
  await tc('R-03', 'BUG-03: seed dùng hash thật', 'Không còn hash cũ; mật khẩu cố định khác bị từ chối', async () => {
    const n = (await sql("select count(*)::int c from users where password_hash like '$2b$10$5ShareHash%'"))[0].c;
    const r = await call('POST', '/api/auth/login', { body: { email: U.vi, password: 'Secret@123' } });
    return { pass: n === 0 && r.s === 401, actual: `hash cũ=${n}; ${r.s}` };
  });
  await tc('R-04', 'BUG-04: JSON công khai không lộ link, mã băm', 'Không có previewUrl, fileHash, fileUrl', async () => {
    const l = (await call('GET', '/api/documents?limit=100')).j.data;
    const d = (await call('GET', '/api/documents/1')).j.data;
    const m = (await call('GET', '/api/documents/1', { token: T.dat })).j.data;
    return { pass: l.every((x) => !('previewUrl' in x) && !('fileHash' in x)) && d.previewUrl === null && d.fileUrl === null && !!m.fileUrl, actual: `Guest previewUrl=${d.previewUrl}; thành viên có link=${!!m.fileUrl}` };
  });
  await tc('R-05', 'BUG-05: khóa, mở khóa tài khoản và thu hồi phiên', '200, token cũ 401/403, 200', async () => {
    const k = await call('PATCH', '/api/auth/users/3/status', { token: T.admin, body: { status: 'locked' } });
    const r = await call('GET', '/api/bookmarks', { token: T.vi });
    const st = (await sql('select status from users where id=3'))[0].status;
    const m = await call('PATCH', '/api/auth/users/3/status', { token: T.admin, body: { status: 'active' } });
    // Khóa tài khoản đã thu hồi phiên cũ nên phải đăng nhập lại cho các ca sau
    T.vi = (await login(U.vi)).t;
    return { pass: k.s === 200 && [401, 403].includes(r.s) && st === 'locked' && m.s === 200 && !!T.vi, actual: `khóa ${k.s} (${st}); token cũ ${r.s}; mở ${m.s}; đăng nhập lại=${!!T.vi}` };
  });
  await tc('R-10', 'BUG-10: không nhận báo cáo tài liệu chưa công khai', '404', async () => {
    const r = await call('POST', '/api/reports', { token: T.vi, body: { documentId: 9, reason: 'SAI_MON_HOC', description: 'Thử báo cáo tài liệu chưa công khai' } });
    return { pass: r.s === 404, actual: `HTTP ${r.s}` };
  });
  await tc('R-17', 'BUG-17, BUG-26: số liệu công khai và phiên bản', 'Đếm APPROVED; health có version, không có userCount', async () => {
    const c = (await call('GET', '/api/courses?limit=50')).j;
    const real = (await sql("select count(*)::int c from documents where status='APPROVED'"))[0].c;
    const h = (await call('GET', '/api/health')).j;
    const sum = c.data.reduce((n, x) => n + x.documentCount, 0);
    return { pass: sum === real && c.stats.totalDocuments === real && !('userCount' in h) && !!h.version, actual: `tổng môn=${sum}, APPROVED=${real}, version=${h.version}` };
  });
  await tc('R-19', 'BUG-19: không nhận token trên URL', '401', async () => {
    const r = await call('GET', `/api/bookmarks?token=${T.dat}`);
    return { pass: r.s === 401, actual: `HTTP ${r.s}` };
  });
  await tc('R-24', 'BUG-24: hết đọc được ngay sau khi ẩn, kể cả có cache', 'no-cache; 304 khi còn công khai; 404 sau khi ẩn', async () => {
    const a = await call('GET', '/api/documents/2/preview');
    const etag = a.h.get('etag');
    const b = await call('GET', '/api/documents/2/preview', { headers: { 'If-None-Match': etag } });
    await call('POST', '/api/reports', { token: T.dat, body: { documentId: 2, reason: 'SAI_MON_HOC', description: 'Báo cáo để kiểm tra cache sau khi ẩn' } });
    const rep = (await call('GET', '/api/admin/reports?limit=50', { token: T.admin })).j.data.find((x) => x.documentId === 2);
    await call('PATCH', `/api/admin/reports/${rep.id}/resolve`, { token: T.admin, body: { action: 'HIDE', adminNote: 'Ẩn để kiểm tra cache' } });
    const c = await call('GET', '/api/documents/2/preview', { headers: { 'If-None-Match': etag } });
    return { pass: a.h.get('cache-control').includes('no-cache') && b.s === 304 && c.s === 404, actual: `${a.h.get('cache-control')}; ${b.s}; sau khi ẩn ${c.s}` };
  });
  await tc('R-30', 'Duyệt thiếu tiêu chí, xử lý lại', '422, 409', async () => {
    const a = await call('PATCH', '/api/admin/documents/9/moderate', { token: T.admin, body: { decision: 'APPROVE', criteria: { readable: true } } });
    const b = await call('PATCH', '/api/admin/documents/10/moderate', { token: T.admin, body: { decision: 'REJECT', reason: 'Lý do hợp lệ đủ độ dài' } });
    return { pass: a.s === 422 && b.s === 409, actual: `${a.s}, ${b.s}` };
  });
  await tc('R-31', 'Tải lên hợp lệ, giữ tên tiếng Việt, cộng điểm', '201, 200, +20', async () => {
    const u = await call('POST', '/api/documents', { token: T.dat, form: fd(await makePdf('Hop le'), 'Đề cương ôn tập.pdf', meta) });
    const row = (await sql('select file_name from documents where id=$1', [u.j.data.id]))[0];
    const s0 = (await sql('select contribution_score s from users where id=5'))[0].s;
    const a = await call('PATCH', `/api/admin/documents/${u.j.data.id}/moderate`, { token: T.admin, body: { decision: 'APPROVE', criteria: allCriteria() } });
    const s1 = (await sql('select contribution_score s from users where id=5'))[0].s;
    return { pass: u.s === 201 && a.s === 200 && s1 === s0 + 20 && row.file_name === 'Đề cương ôn tập.pdf', actual: `${u.s}, ${a.s}, ${row.file_name}, ${s0}→${s1}` };
  });
  await tc('R-32', 'Dữ liệu môn học sai, trùng', '422, 409', async () => {
    const b = { courseCode: 'AB CD', courseName: 'Tên môn', knowledgeBlock: 'DAI_CUONG', credits: 0, semester: 9 };
    const a = await call('POST', '/api/admin/courses', { token: T.admin, body: b }), d = await call('POST', '/api/admin/courses', { token: T.admin, body: { ...b, courseCode: 'COMP1010', credits: 2, semester: 1 } });
    return { pass: a.s === 422 && d.s === 409, actual: `${a.s}, ${d.s}` };
  });
  await tc('R-08', 'BUG-08: giới hạn đăng nhập sai', 'Sau 10 lần sai: 429; tài khoản khác vẫn vào được', async () => {
    const cnt = {};
    for (let i = 0; i < 12; i += 1) { const r = await call('POST', '/api/auth/login', { body: { email: U.dat, password: `Sai#${i}` } }); cnt[r.s] = (cnt[r.s] || 0) + 1; }
    const other = await login(U.danh);
    return { pass: cnt[401] === 10 && cnt[429] === 2 && other.s === 200, actual: `${JSON.stringify(cnt)}; tài khoản khác ${other.s}` };
  });

  if (process.env.TEST_RESULT_FILE) fs.writeFileSync(process.env.TEST_RESULT_FILE, JSON.stringify(results, null, 1));
  const passed = results.filter((r) => r.result === 'PASS').length;
  console.log(`\nTỔNG: ${passed}/${results.length} PASS`);
  await db.end();
  server.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
