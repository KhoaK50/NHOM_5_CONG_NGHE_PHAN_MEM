/**
 * ============================================================================
 * TẦNG 4: REAL-WORLD APPLICATION SCENARIOS
 * 8 kịch bản ứng dụng thế giới thực (End-to-End Multi-Step User Journeys)
 * ============================================================================
 */

const { SystemState } = require('./domain');
const {
  PDF_MAGIC_BYTES,
  ZIP_MAGIC_BYTES,
  EXE_MAGIC_BYTES,
  createMockFileBuffer
} = require('./fixtures');

function registerTier4Tests(harness) {
  // --------------------------------------------------------------------------
  // T4_SCEN_01: Hành trình Sinh viên mới gia nhập & Đóng góp học liệu đầu tay
  // --------------------------------------------------------------------------
  harness.register(
    'T4_SCEN_01',
    'Kịch bản 01: Hành trình Sinh viên mới gia nhập, hoàn thiện hồ sơ và đóng góp học liệu đầu tay',
    { tier: 4, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();

      // Bước 1: Đăng ký tài khoản sinh viên mới
      const reg = sys.registerUser({
        email: 'sinhvien.k50@hcmue.edu.vn',
        password: 'K50Password123@',
        fullName: 'Nguyễn Văn Tân Sinh Viên',
        cohort: 'K50'
      });
      const user = reg.user;
      assert.eq(user.points, 50, 'Chào mừng thành viên mới nhận +50 điểm');

      // Bước 2: Hoàn thiện hồ sơ cá nhân và ảnh đại diện
      const updated = sys.updateProfile(user.id, {
        avatarUrl: '/avatars/tan_sinh_vien.png'
      });
      assert.eq(updated.avatarUrl, '/avatars/tan_sinh_vien.png');

      // Bước 3: Đăng nhập nhận JWT Token
      const login = sys.loginUser({
        email: 'sinhvien.k50@hcmue.edu.vn',
        password: 'K50Password123@'
      });
      assert.true(Boolean(login.token));

      // Bước 4: Chuẩn bị tệp PDF giáo án chuẩn và upload
      const pdfBuffer = createMockFileBuffer(PDF_MAGIC_BYTES, 3072);
      const upload = sys.verifyAndUploadDocument({
        file: { name: 'KHBD_TinHoc10_BaiTap.pdf', size: pdfBuffer.length, buffer: pdfBuffer },
        metadata: {
          title: 'Kế hoạch bài dạy Tin học 10 Bài tập Cấu trúc Lặp for while chuẩn 5512',
          courseCode: 'COMP1044'
        },
        uploaderId: user.id
      });
      assert.true(upload.isValid, 'Upload phải vượt qua 4 tầng kiểm tra');
      assert.eq(upload.document.status, 'PENDING');

      // Bước 5: Admin vào hàng đợi kiểm duyệt và thẩm định 8 tiêu chí
      const queue = sys.getPendingModerationQueue('ADMIN');
      assert.true(queue.some((d) => d.id === upload.document.id));

      const mod = sys.moderateDocument('ADMIN', upload.document.id, 'APPROVE', {
        criteriaChecklist: {
          tc01: true,
          tc02: true,
          tc03: true,
          tc04: true,
          tc05: true,
          tc06: true,
          tc07: true,
          tc08: true
        }
      });
      assert.true(mod.success);

      // Bước 6: Kiểm tra ví điểm và chuông thông báo
      assert.eq(user.points, 70, 'Điểm cộng dồn: 50 + 20 = 70 điểm');
      const notifs = sys.getNotifications(user.id);
      assert.true(notifs.length >= 1);
      assert.includes(notifs[0].title, 'phê duyệt');

      // Bước 7: Học liệu đã có mặt trên Kho học liệu công khai
      const discovery = sys.searchDocuments({ query: 'Cau truc Lap' });
      assert.true(discovery.items.some((d) => d.id === upload.document.id));
    }
  );

  // --------------------------------------------------------------------------
  // T4_SCEN_02: Chuyển đổi Khách vãng lai sang Sinh viên
  // --------------------------------------------------------------------------
  harness.register(
    'T4_SCEN_02',
    'Kịch bản 02: Chuyển đổi Khách vãng lai sang Sinh viên qua hàng rào Đọc thử & Giới hạn tải',
    { tier: 4, fr: 'FR-05' },
    (assert) => {
      const sys = new SystemState();
      const guestIp = '10.10.10.1';

      // Bước 1: Khách đọc thử 3 trang đầu
      const p1 = sys.getReaderPage('doc-1', 1, 'GUEST');
      const p3 = sys.getReaderPage('doc-1', 3, 'GUEST');
      assert.false(p1.locked);
      assert.false(p3.locked);

      // Bước 2: Khách thử lật trang 4 -> Bị khóa và hiện modal kêu gọi đăng nhập
      const p4 = sys.getReaderPage('doc-1', 4, 'GUEST');
      assert.true(p4.locked);
      assert.includes(p4.message, 'Khách vãng lai chỉ được đọc thử 3 trang đầu');

      // Bước 3: Khách tải 3 tài liệu trong ngày
      sys.downloadDocument('doc-1', 'GUEST', guestIp);
      sys.downloadDocument('doc-2', 'GUEST', guestIp);
      sys.downloadDocument('doc-3', 'GUEST', guestIp);

      // Bước 4: Lần tải thứ 4 bị chặn bởi Rate Limiter
      assert.throws(
        () => sys.downloadDocument('doc-1', 'GUEST', guestIp),
        /đạt giới hạn 3 lượt tải\/ngày/
      );

      // Bước 5: Khách tiến hành Đăng ký tài khoản Sinh viên
      const reg = sys.registerUser({
        email: 'khach.chuyendoi@hcmue.edu.vn',
        password: 'StudentSecurePass123@',
        fullName: 'Cựu Khách Vãng Lai'
      });
      const login = sys.loginUser({
        email: 'khach.chuyendoi@hcmue.edu.vn',
        password: 'StudentSecurePass123@'
      });
      assert.true(Boolean(login.token));

      // Bước 6: Trở lại đọc toàn văn không còn bị giới hạn trang 4
      const p4Unlocked = sys.getReaderPage('doc-1', 4, 'STUDENT');
      assert.false(p4Unlocked.locked);

      // Bước 7: Tải tệp gốc tự do với tư cách Sinh viên
      const dl = sys.downloadDocument('doc-1', 'STUDENT', guestIp);
      assert.true(Boolean(dl.fileName));
    }
  );

  // --------------------------------------------------------------------------
  // T4_SCEN_03: Nền kinh tế Tri thức: Treo thưởng Tài liệu (Study Bounty) & Leaderboard
  // --------------------------------------------------------------------------
  harness.register(
    'T4_SCEN_03',
    'Kịch bản 03: Nền kinh tế tri thức: Treo thưởng tài liệu (Study Bounty) và cập nhật Bảng vàng',
    { tier: 4, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();

      // Sinh viên A (user-vi, 140 điểm) cần tài liệu MIPS hiếm
      const bounty = sys.createBounty('user-vi', {
        title: 'Cần bài giải hợp ngữ MIPS tính dãy Fibonacci',
        courseCode: 'COMP1001',
        rewardPoints: 50
      });
      assert.eq(sys.users.find((u) => u.id === 'user-vi').points, 90, 'Ví A bị trừ 50 điểm tạm giữ');

      // Sinh viên B (user-tram, 120 điểm) tìm thấy tài liệu và nộp giải thưởng
      const pdfBuf = createMockFileBuffer(PDF_MAGIC_BYTES, 2048);
      const upload = sys.verifyAndUploadDocument({
        file: { name: 'MIPS_Fibonacci_Solution.pdf', size: pdfBuf.length, buffer: pdfBuf },
        metadata: {
          title: 'Bài giải chuẩn hợp ngữ MIPS tính số Fibonacci đệ quy',
          courseCode: 'COMP1001'
        },
        uploaderId: 'user-tram'
      });

      // Admin thẩm định và duyệt tài liệu
      sys.moderateDocument('ADMIN', upload.document.id, 'APPROVE', {
        criteriaChecklist: { tc01: true, tc02: true, tc03: true, tc04: true, tc05: true, tc06: true }
      });
      // B nhận +20 điểm duyệt: 120 + 20 = 140

      // Chuyển giao phần thưởng Bounty cho B
      const fulfill = sys.fulfillBounty('user-tram', bounty.id, upload.document.id);
      assert.true(fulfill.success);

      // B nhận thêm +50 điểm: 140 + 50 = 190 điểm
      const userTram = sys.users.find((u) => u.id === 'user-tram');
      assert.eq(userTram.points, 190);

      // Bảng xếp hạng Top 10 ghi nhận B vươn lên dẫn đầu
      const top10 = sys.getTop10Leaderboard();
      assert.eq(top10[0].id, 'user-tram', 'Trâm phải vươn lên vị trí số 1 với 190 điểm');
    }
  );

  // --------------------------------------------------------------------------
  // T4_SCEN_04: Chu trình Bảo vệ Liêm chính Học thuật & Xử lý Báo cáo
  // --------------------------------------------------------------------------
  harness.register(
    'T4_SCEN_04',
    'Kịch bản 04: Chu trình bảo vệ liêm chính học thuật và xử lý báo cáo vi phạm của Admin',
    { tier: 4, fr: 'FR-11' },
    (assert) => {
      const sys = new SystemState();

      // Sinh viên phát hiện tài liệu doc-2 có lỗi sai học thuật
      const report = sys.reportDocument('user-tram', {
        docId: 'doc-2',
        reasonGroup: 'Sai kiến thức chuyên môn / Không đúng chuẩn Công văn 5512',
        details: 'Phần hướng dẫn chia subnet mask trang 4 bị sai công thức tính số host.'
      });
      assert.eq(report.status, 'PENDING');

      // Admin kiểm tra hàng đợi báo cáo
      const pendingReps = sys.reports.filter((r) => r.status === 'PENDING');
      assert.true(pendingReps.some((r) => r.id === report.id));

      // Admin đối chiếu tài liệu và quyết định Ẩn tài liệu vi phạm
      const resolve = sys.resolveReport('ADMIN', report.id, 'HIDE_DOC');
      assert.eq(resolve.report.status, 'RESOLVED');

      // Tài liệu doc-2 bị thu hồi khỏi kho công khai
      const discovery = sys.searchDocuments({ query: 'Mang may tinh' });
      assert.false(discovery.items.some((d) => d.id === 'doc-2'), 'doc-2 phải biến mất khỏi kho công khai');

      // Tác giả kiểm tra thấy trạng thái chuyển thành REJECTED kèm lý do
      const authorDocs = sys.getUserContributions('user-vi', 'REJECTED');
      assert.true(authorDocs.some((d) => d.id === 'doc-2'));
    }
  );

  // --------------------------------------------------------------------------
  // T4_SCEN_05: Vòng đời Học liệu Đa định dạng (.docx/.pptx) & Đánh giá Sao
  // --------------------------------------------------------------------------
  harness.register(
    'T4_SCEN_05',
    'Kịch bản 05: Vòng đời học liệu đa định dạng (.docx/.pptx), xem trực tuyến và đánh giá sao',
    { tier: 4, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();

      // Giảng viên/Sinh viên upload slide PowerPoint (.pptx)
      const pptxBuf = createMockFileBuffer(ZIP_MAGIC_BYTES, 4096);
      const upload = sys.verifyAndUploadDocument({
        file: { name: 'Slide_PPGD_TinHoc11.pptx', size: pptxBuf.length, buffer: pptxBuf },
        metadata: {
          title: 'Slide Phương pháp giảng dạy Tin học 11 chuyên đề Học máy',
          courseCode: 'COMP1044',
          docType: 'Slide bài giảng'
        },
        uploaderId: 'user-vi'
      });
      assert.true(upload.isValid);
      assert.eq(upload.document.format, 'pptx');

      // Admin duyệt học liệu
      sys.moderateDocument('ADMIN', upload.document.id, 'APPROVE', {
        criteriaChecklist: { tc01: true, tc02: true, tc03: true, tc04: true, tc05: true, tc06: true }
      });

      // Sinh viên khác tìm kiếm bằng từ khóa không dấu
      const search = sys.searchDocuments({ query: 'hoc may', format: 'pptx' });
      assert.true(search.total >= 1);
      const doc = search.items[0];

      // Xem trực tuyến qua Google Docs Viewer
      const viewerUrl = sys.generateViewerUrl(doc);
      assert.includes(viewerUrl, 'https://docs.google.com/viewer?url=');

      // Sinh liên kết chia sẻ
      const shareUrl = sys.generateShareLink(doc.id);
      assert.includes(shareUrl, doc.id);

      // Đánh giá 5 sao và bình luận
      const rating = sys.rateDocument('user-tram', doc.id, 5);
      assert.eq(rating.ratingAvg, 5.0);
      const cmt = sys.addComment('user-tram', doc.id, 'Slide thiết kế rất sư phạm và dễ hiểu!');
      assert.true(Boolean(cmt.id));
    }
  );

  // --------------------------------------------------------------------------
  // T4_SCEN_06: Cập nhật CTĐT & Ràng buộc toàn vẹn Khóa ngoại (FK Block)
  // --------------------------------------------------------------------------
  harness.register(
    'T4_SCEN_06',
    'Kịch bản 06: Cập nhật khung chương trình đào tạo, bảo vệ toàn vẹn khóa ngoại khi xóa môn',
    { tier: 4, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();

      // Admin cố tình xóa môn COMP1015 (Mạng máy tính) đang có tài liệu liên kết
      assert.throws(
        () => sys.deleteCourse('ADMIN', 'COMP1015'),
        /Ràng buộc toàn vẹn CSDL \(Khóa ngoại\)/
      );

      // Admin tạo môn mới chuẩn CTĐT 2026
      const newCourse = sys.createCourse('ADMIN', {
        code: 'COMP3001',
        name: 'Thực hành Sư phạm Số và STEM',
        credits: 3,
        knowledgeBlock: 'Nghiệp vụ Sư phạm',
        semester: 'Học kỳ 6'
      });
      assert.eq(newCourse.documentCount, 0);

      // Xóa môn mới khi chưa có tài liệu nào -> Thành công
      const deleted = sys.deleteCourse('ADMIN', 'COMP3001');
      assert.eq(deleted.code, 'COMP3001');
    }
  );

  // --------------------------------------------------------------------------
  // T4_SCEN_07: Cách ly Người dùng Vi phạm & Hòm thư Góp ý
  // --------------------------------------------------------------------------
  harness.register(
    'T4_SCEN_07',
    'Kịch bản 07: Cách ly người dùng vi phạm quy chuẩn và gửi phản hồi qua Hòm thư góp ý',
    { tier: 4, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();

      // Kẻ xấu cố tình đổi đuôi tệp virus EXE thành .pdf
      const fakeExe = createMockFileBuffer(EXE_MAGIC_BYTES, 2048);
      const up = sys.verifyAndUploadDocument({
        file: { name: 'trojan.pdf', size: fakeExe.length, buffer: fakeExe },
        metadata: { title: 'Tài liệu độc hại giả mạo', courseCode: 'COMP1044' },
        uploaderId: 'user-vi'
      });
      assert.false(up.isValid);
      assert.eq(up.stageFailed, 'MAGIC_BYTES', 'Bị chặn ngay tại Tầng 2 Magic Bytes');

      // Admin tiến hành khóa tài khoản vi phạm
      sys.toggleUserLock('ADMIN', 'user-vi');
      assert.false(sys.users.find((u) => u.id === 'user-vi').isActive);

      // Người dùng gửi khiếu nại qua Hòm thư góp ý hệ thống
      const feedback = sys.submitFeedback({
        fullName: 'Phan Triệu Vĩ',
        email: 'vi.phantrieu.k50@hcmue.edu.vn',
        category: 'Hỗ trợ tài khoản',
        message: 'Em vô tình chọn nhầm file thực thi, xin Admin xem xét mở lại tài khoản giúp em.'
      });
      assert.true(Boolean(feedback.id));
      assert.includes(feedback.message, 'xin Admin xem xét');
    }
  );

  // --------------------------------------------------------------------------
  // T4_SCEN_08: Chu trình Khôi phục Mật khẩu & Quản lý Phiên
  // --------------------------------------------------------------------------
  harness.register(
    'T4_SCEN_08',
    'Kịch bản 08: Chu trình khôi phục mật khẩu, kiểm soát hạn token và cấp mới JWT',
    { tier: 4, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();

      // Yêu cầu reset mật khẩu
      const { token, expiresAt } = sys.requestPasswordReset('dat.tranduc.k50@hcmue.edu.vn');
      assert.true(expiresAt > Date.now());

      // Thử đặt mật khẩu yếu (< 8 ký tự) -> Bị từ chối
      assert.throws(
        () => sys.resetPassword({ token, newPassword: 'short', confirmPassword: 'short' }),
        /không đáp ứng tiêu chuẩn/
      );

      // Đặt mật khẩu mới an toàn
      const res = sys.resetPassword({
        token,
        newPassword: 'BrandNewSecure123@',
        confirmPassword: 'BrandNewSecure123@'
      });
      assert.true(res.success);

      // Token đã bị hủy, không thể tái sử dụng
      assert.throws(
        () => sys.resetPassword({ token, newPassword: 'BrandNewSecure123@', confirmPassword: 'BrandNewSecure123@' }),
        /không hợp lệ hoặc không tồn tại/
      );

      // Đăng nhập với mật khẩu mới thành công
      const login = sys.loginUser({
        email: 'dat.tranduc.k50@hcmue.edu.vn',
        password: 'BrandNewSecure123@'
      });
      assert.true(Boolean(login.token));
      assert.eq(login.user.id, 'user-dat');
    }
  );
}

module.exports = { registerTier4Tests };
