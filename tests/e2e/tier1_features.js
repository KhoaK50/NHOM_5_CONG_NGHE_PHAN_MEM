/**
 * ============================================================================
 * TẦNG 1: FEATURE COVERAGE (CATEGORY-PARTITION EQUIVALENCE PARTITIONING)
 * Tối thiểu 5 ca kiểm thử chuẩn tắc cho mỗi yêu cầu chức năng (13 FRs x 5 = 65 ca)
 * ============================================================================
 */

const { SystemState } = require('./domain');
const { PDF_MAGIC_BYTES, ZIP_MAGIC_BYTES, createMockFileBuffer } = require('./fixtures');

function registerTier1Tests(harness) {
  // --------------------------------------------------------------------------
  // FR-01: Xác thực người dùng & Quản lý phiên (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR01_01',
    'FR-01: Đăng ký tài khoản sinh viên mới hợp lệ nhận +50 điểm khởi đầu',
    { tier: 1, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.registerUser({
        email: 'sinhvien.moi@hcmue.edu.vn',
        password: 'Password123@',
        fullName: 'Sinh Viên Mới',
        cohort: 'K50'
      });
      assert.true(res.success, 'Registration must succeed');
      assert.eq(res.user.role, 'STUDENT', 'New user role must be STUDENT');
      assert.eq(res.user.points, 50, 'New user must receive +50 welcome points');
      assert.eq(res.user.cohort, 'K50', 'Cohort must match K50');
    }
  );

  harness.register(
    'T1_FR01_02',
    'FR-01: Đăng nhập thành công với thông tin chính xác cấp mã token JWT an toàn',
    { tier: 1, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.loginUser({
        email: 'vi.phantrieu.k50@hcmue.edu.vn',
        password: 'Student123@'
      });
      assert.true(Boolean(res.token), 'Must return JWT token');
      assert.eq(res.user.role, 'STUDENT');
      assert.eq(res.user.id, 'user-vi');
    }
  );

  harness.register(
    'T1_FR01_03',
    'FR-01: Đăng nhập thất bại khi sai mật khẩu trả lỗi xác thực 401',
    { tier: 1, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.loginUser({ email: 'vi.phantrieu.k50@hcmue.edu.vn', password: 'WrongPassword999@' }),
        /Thông tin đăng nhập không chính xác/
      );
    }
  );

  harness.register(
    'T1_FR01_04',
    'FR-01: Luồng quên mật khẩu tạo mã reset token có hạn 15 phút',
    { tier: 1, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.requestPasswordReset('tram.lenguyen.k50@hcmue.edu.vn');
      assert.true(Boolean(res.token), 'Must generate reset token');
      assert.true(res.expiresAt > Date.now(), 'Token expiry must be in the future');
      assert.true(res.expiresAt <= Date.now() + 15 * 60 * 1000, 'Token expiry must not exceed 15 mins');
    }
  );

  harness.register(
    'T1_FR01_05',
    'FR-01: Ma trận phân quyền RBAC thực thi kiểm soát truy cập GUEST < STUDENT < ADMIN',
    { tier: 1, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();
      assert.true(sys.verifyRoleAccess('ADMIN', 'STUDENT'), 'ADMIN must have STUDENT access');
      assert.true(sys.verifyRoleAccess('ADMIN', 'ADMIN'), 'ADMIN must have ADMIN access');
      assert.true(sys.verifyRoleAccess('STUDENT', 'STUDENT'), 'STUDENT must have STUDENT access');
      assert.false(sys.verifyRoleAccess('STUDENT', 'ADMIN'), 'STUDENT must NOT have ADMIN access');
      assert.false(sys.verifyRoleAccess('GUEST', 'STUDENT'), 'GUEST must NOT have STUDENT access');
    }
  );

  // --------------------------------------------------------------------------
  // FR-02: Quản lý hồ sơ cá nhân & Bảo mật (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR02_01',
    'FR-02: Cập nhật thông tin họ tên sinh viên thành công',
    { tier: 1, fr: 'FR-02' },
    (assert) => {
      const sys = new SystemState();
      const updated = sys.updateProfile('user-vi', { fullName: 'Phan Triệu Vĩ (K50)' });
      assert.eq(updated.fullName, 'Phan Triệu Vĩ (K50)');
    }
  );

  harness.register(
    'T1_FR02_02',
    'FR-02: Cập nhật khóa học sinh viên hợp lệ trong phạm vi K48-K52',
    { tier: 1, fr: 'FR-02' },
    (assert) => {
      const sys = new SystemState();
      const updated = sys.updateProfile('user-vi', { cohort: 'K51' });
      assert.eq(updated.cohort, 'K51');
    }
  );

  harness.register(
    'T1_FR02_03',
    'FR-02: Cập nhật URL ảnh đại diện thành công',
    { tier: 1, fr: 'FR-02' },
    (assert) => {
      const sys = new SystemState();
      const updated = sys.updateProfile('user-vi', { avatarUrl: '/avatars/new_vi.png' });
      assert.eq(updated.avatarUrl, '/avatars/new_vi.png');
    }
  );

  harness.register(
    'T1_FR02_04',
    'FR-02: Đổi mật khẩu thành công khi xác thực mật khẩu cũ và đáp ứng độ phức tạp',
    { tier: 1, fr: 'FR-02' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.changePassword('user-vi', {
        oldPassword: 'Student123@',
        newPassword: 'NewSecurePassword888@',
        confirmPassword: 'NewSecurePassword888@'
      });
      assert.true(res.success);
    }
  );

  harness.register(
    'T1_FR02_05',
    'FR-02: Đánh dấu thông báo đã đọc và kiểm tra danh sách thông báo người dùng',
    { tier: 1, fr: 'FR-02' },
    (assert) => {
      const sys = new SystemState();
      const notifsBefore = sys.getNotifications('user-vi');
      assert.true(notifsBefore.length > 0);
      assert.false(notifsBefore[0].isRead);

      const readNotif = sys.markNotificationRead('user-vi', notifsBefore[0].id);
      assert.true(readNotif.isRead);
    }
  );

  // --------------------------------------------------------------------------
  // FR-03: Cấu trúc danh mục học thuật Sư phạm Tin (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR03_01',
    'FR-03: Hệ thống trả về đầy đủ 4 khối kiến thức chuẩn của CTĐT',
    { tier: 1, fr: 'FR-03' },
    (assert) => {
      const sys = new SystemState();
      const blocks = sys.getKnowledgeBlocks();
      assert.eq(blocks.length, 4);
      assert.includes(blocks, 'Nghiệp vụ Sư phạm');
      assert.includes(blocks, 'Cơ sở ngành');
      assert.includes(blocks, 'Chuyên ngành');
      assert.includes(blocks, 'Đại cương');
    }
  );

  harness.register(
    'T1_FR03_02',
    'FR-03: Hệ thống trả về danh sách 6 học kỳ chính khóa',
    { tier: 1, fr: 'FR-03' },
    (assert) => {
      const sys = new SystemState();
      const semesters = sys.getSemesters();
      assert.eq(semesters.length, 6);
      assert.includes(semesters, 'Học kỳ 1');
      assert.includes(semesters, 'Học kỳ 6');
    }
  );

  harness.register(
    'T1_FR03_03',
    'FR-03: Lọc môn học theo khối kiến thức Nghiệp vụ Sư phạm chính xác',
    { tier: 1, fr: 'FR-03' },
    (assert) => {
      const sys = new SystemState();
      const courses = sys.getCourses({ knowledgeBlock: 'Nghiệp vụ Sư phạm' });
      assert.true(courses.length >= 2);
      for (const c of courses) {
        assert.eq(c.knowledgeBlock, 'Nghiệp vụ Sư phạm');
      }
    }
  );

  harness.register(
    'T1_FR03_04',
    'FR-03: Lọc môn học theo học kỳ Học kỳ 3 chính xác',
    { tier: 1, fr: 'FR-03' },
    (assert) => {
      const sys = new SystemState();
      const courses = sys.getCourses({ semester: 'Học kỳ 3' });
      assert.true(courses.length >= 2);
      for (const c of courses) {
        assert.eq(c.semester, 'Học kỳ 3');
      }
    }
  );

  harness.register(
    'T1_FR03_05',
    'FR-03: Ánh xạ mã môn học COMP1044 đúng tên môn và số tín chỉ',
    { tier: 1, fr: 'FR-03' },
    (assert) => {
      const sys = new SystemState();
      const course = sys.courses.find((c) => c.code === 'COMP1044');
      assert.true(Boolean(course));
      assert.eq(course.name, 'Phương pháp dạy học môn Tin học');
      assert.eq(course.credits, 3);
    }
  );

  // --------------------------------------------------------------------------
  // FR-04: Tra cứu & Bộ lọc tài liệu đa tiêu chí (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR04_01',
    'FR-04: Tìm kiếm FTS tiếng Việt có dấu "Kế hoạch bài dạy" tìm ra học liệu',
    { tier: 1, fr: 'FR-04' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.searchDocuments({ query: 'Kế hoạch bài dạy' });
      assert.true(res.total > 0);
      assert.includes(res.items[0].title, 'Kế hoạch bài dạy');
    }
  );

  harness.register(
    'T1_FR04_02',
    'FR-04: Chuẩn hóa unaccent không dấu "mang may tinh" khớp tài liệu có dấu "Mạng máy tính"',
    { tier: 1, fr: 'FR-04' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.searchDocuments({ query: 'mang may tinh' });
      assert.true(res.total > 0);
      assert.eq(res.items[0].courseCode, 'COMP1015');
    }
  );

  harness.register(
    'T1_FR04_03',
    'FR-04: Bộ lọc định dạng lọc chính xác tài liệu .pptx',
    { tier: 1, fr: 'FR-04' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.searchDocuments({ format: 'pptx' });
      assert.true(res.total >= 1);
      for (const doc of res.items) {
        assert.eq(doc.format, 'pptx');
      }
    }
  );

  harness.register(
    'T1_FR04_04',
    'FR-04: Giao thoa đa tiêu chí: Khối kiến thức + Học kỳ + Loại tài liệu',
    { tier: 1, fr: 'FR-04' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.searchDocuments({
        knowledgeBlock: 'Nghiệp vụ Sư phạm',
        semester: 'Học kỳ 5',
        docType: 'KHBD Công văn 5512'
      });
      assert.true(res.total >= 1);
      assert.eq(res.items[0].docType, 'KHBD Công văn 5512');
      assert.eq(res.items[0].knowledgeBlock, 'Nghiệp vụ Sư phạm');
    }
  );

  harness.register(
    'T1_FR04_05',
    'FR-04: Phân trang tìm kiếm chuẩn 12 tài liệu/trang với tính toán tổng số trang',
    { tier: 1, fr: 'FR-04' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.searchDocuments({ page: 1, limit: 2 });
      assert.eq(res.items.length, 2);
      assert.eq(res.page, 1);
      assert.eq(res.limit, 2);
      assert.true(res.totalPages >= 1);
    }
  );

  // --------------------------------------------------------------------------
  // FR-05: Xem chi tiết & Reader trực tuyến (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR05_01',
    'FR-05: Tải chi tiết tài liệu tự động tăng biến đếm viewCount',
    { tier: 1, fr: 'FR-05' },
    (assert) => {
      const sys = new SystemState();
      const before = sys.documents.find((d) => d.id === 'doc-1').viewCount;
      const doc = sys.getDocumentDetail('doc-1', 'GUEST');
      assert.eq(doc.viewCount, before + 1);
    }
  );

  harness.register(
    'T1_FR05_02',
    'FR-05: Khách vãng lai đọc thử mượt mà trang 1 đến trang 3',
    { tier: 1, fr: 'FR-05' },
    (assert) => {
      const sys = new SystemState();
      const p1 = sys.getReaderPage('doc-1', 1, 'GUEST');
      const p2 = sys.getReaderPage('doc-1', 2, 'GUEST');
      const p3 = sys.getReaderPage('doc-1', 3, 'GUEST');
      assert.false(p1.locked);
      assert.false(p2.locked);
      assert.false(p3.locked);
    }
  );

  harness.register(
    'T1_FR05_03',
    'FR-05: Sinh viên đã đăng nhập đọc toàn văn từ trang 4 trở đi không bị khóa',
    { tier: 1, fr: 'FR-05' },
    (assert) => {
      const sys = new SystemState();
      const p4 = sys.getReaderPage('doc-1', 4, 'STUDENT');
      const p10 = sys.getReaderPage('doc-1', 10, 'STUDENT');
      assert.false(p4.locked);
      assert.false(p10.locked);
    }
  );

  harness.register(
    'T1_FR05_04',
    'FR-05: Tài liệu PPTX sinh URL nhúng Google Docs Viewer an toàn',
    { tier: 1, fr: 'FR-05' },
    (assert) => {
      const sys = new SystemState();
      const pptxDoc = sys.documents.find((d) => d.format === 'pptx');
      const viewerUrl = sys.generateViewerUrl(pptxDoc);
      assert.includes(viewerUrl, 'https://docs.google.com/viewer?url=');
      assert.includes(viewerUrl, '&embedded=true');
    }
  );

  harness.register(
    'T1_FR05_05',
    'FR-05: Nút sao chép liên kết sinh đường dẫn chia sẻ chuẩn tắc permalink',
    { tier: 1, fr: 'FR-05' },
    (assert) => {
      const sys = new SystemState();
      const link = sys.generateShareLink('doc-1');
      assert.eq(link, 'https://5share.io.vn/documents/doc-1');
    }
  );

  // --------------------------------------------------------------------------
  // FR-06: 4 Tầng Phòng thủ Upload (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR06_01',
    'FR-06: Tải lên tệp PDF chuẩn chữ ký %PDF- chuyển vào trạng thái PENDING',
    { tier: 1, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();
      const pdfBuffer = createMockFileBuffer(PDF_MAGIC_BYTES, 2048);
      const res = sys.verifyAndUploadDocument({
        file: { name: 'giao_an_moi.pdf', size: pdfBuffer.length, buffer: pdfBuffer },
        metadata: {
          title: 'Kế hoạch bài dạy Tin học 10 chuẩn Công văn 5512 mẫu số 2',
          courseCode: 'COMP1044'
        },
        uploaderId: 'user-vi'
      });
      assert.true(res.isValid);
      assert.eq(res.document.status, 'PENDING');
      assert.eq(res.document.format, 'pdf');
    }
  );

  harness.register(
    'T1_FR06_02',
    'FR-06: Tải lên tệp DOCX chuẩn chữ ký PK.. của Office XML thành công',
    { tier: 1, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();
      const docxBuffer = createMockFileBuffer(ZIP_MAGIC_BYTES, 4096);
      const res = sys.verifyAndUploadDocument({
        file: { name: 'de_cuong_on_tap.docx', size: docxBuffer.length, buffer: docxBuffer },
        metadata: {
          title: 'Đề cương ôn tập chi tiết môn Mạng máy tính K49',
          courseCode: 'COMP1015'
        },
        uploaderId: 'user-vi'
      });
      assert.true(res.isValid);
      assert.eq(res.document.format, 'docx');
      assert.eq(res.document.status, 'PENDING');
    }
  );

  harness.register(
    'T1_FR06_03',
    'FR-06: Tải lên tệp PPTX chuẩn chữ ký PK.. của PowerPoint thành công',
    { tier: 1, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();
      const pptxBuffer = createMockFileBuffer(ZIP_MAGIC_BYTES, 5120);
      const res = sys.verifyAndUploadDocument({
        file: { name: 'slide_bai_giang.pptx', size: pptxBuffer.length, buffer: pptxBuffer },
        metadata: {
          title: 'Slide bài giảng thiết kế CSDL quan hệ chuẩn 3NF',
          courseCode: 'COMP1031'
        },
        uploaderId: 'user-vi'
      });
      assert.true(res.isValid);
      assert.eq(res.document.format, 'pptx');
    }
  );

  harness.register(
    'T1_FR06_04',
    'FR-06: Hệ thống băm mã SHA-256 chính xác 64 ký tự hex',
    { tier: 1, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();
      const buffer = createMockFileBuffer(PDF_MAGIC_BYTES, 1024);
      const res = sys.verifyAndUploadDocument({
        file: { name: 'bai_tap_moi.pdf', size: buffer.length, buffer },
        metadata: {
          title: 'Bài tập thực hành Lập trình Web với React và Tailwind',
          courseCode: 'COMP1022'
        },
        uploaderId: 'user-vi'
      });
      assert.true(res.isValid);
      assert.match(res.document.fileHash, /^[0-9a-f]{64}$/);
    }
  );

  harness.register(
    'T1_FR06_05',
    'FR-06: Đóng góp tài liệu mới tự động tăng biến đếm documentCount của học phần',
    { tier: 1, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();
      const course = sys.courses.find((c) => c.code === 'COMP1058');
      const beforeCount = course.documentCount;
      const buffer = createMockFileBuffer(PDF_MAGIC_BYTES, 1024);
      const res = sys.verifyAndUploadDocument({
        file: { name: 'elearning_guide.pdf', size: buffer.length, buffer },
        metadata: {
          title: 'Hướng dẫn thiết kế bài giảng điện tử e-Learning với iSpring',
          courseCode: 'COMP1058'
        },
        uploaderId: 'user-vi'
      });
      assert.true(res.isValid);
      assert.eq(course.documentCount, beforeCount + 1);
    }
  );

  // --------------------------------------------------------------------------
  // FR-07: Hàng đợi kiểm duyệt 8 tiêu chí (Admin Moderation) (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR07_01',
    'FR-07: Hàng đợi Moderation Queue hiển thị chính xác các tài liệu có status PENDING',
    { tier: 1, fr: 'FR-07' },
    (assert) => {
      const sys = new SystemState();
      const queue = sys.getPendingModerationQueue('ADMIN');
      assert.true(queue.length >= 1);
      for (const doc of queue) {
        assert.eq(doc.status, 'PENDING');
      }
    }
  );

  harness.register(
    'T1_FR07_02',
    'FR-07: Admin duyệt tài liệu đạt 8 tiêu chí chuyển trạng thái sang APPROVED',
    { tier: 1, fr: 'FR-07' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.moderateDocument('ADMIN', 'doc-8', 'APPROVE', {
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
      assert.true(res.success);
      assert.eq(res.status, 'APPROVED');
      const doc = sys.documents.find((d) => d.id === 'doc-8');
      assert.eq(doc.status, 'APPROVED');
    }
  );

  harness.register(
    'T1_FR07_03',
    'FR-07: Phê duyệt tài liệu tự động cộng +20 điểm thưởng cống hiến cho tác giả',
    { tier: 1, fr: 'FR-07' },
    (assert) => {
      const sys = new SystemState();
      const author = sys.users.find((u) => u.id === 'user-vi');
      const beforePoints = author.points;
      sys.moderateDocument('ADMIN', 'doc-8', 'APPROVE', {
        criteriaChecklist: {
          tc01: true,
          tc02: true,
          tc03: true,
          tc04: true,
          tc05: true,
          tc06: true
        }
      });
      assert.eq(author.points, beforePoints + 20);
    }
  );

  harness.register(
    'T1_FR07_04',
    'FR-07: Phê duyệt tài liệu tự động gửi thông báo chuông chúc mừng cho tác giả',
    { tier: 1, fr: 'FR-07' },
    (assert) => {
      const sys = new SystemState();
      sys.moderateDocument('ADMIN', 'doc-8', 'APPROVE', {
        criteriaChecklist: {
          tc01: true,
          tc02: true,
          tc03: true,
          tc04: true,
          tc05: true,
          tc06: true
        }
      });
      const notifs = sys.getNotifications('user-vi');
      const latestNotif = notifs[notifs.length - 1];
      assert.includes(latestNotif.title, 'phê duyệt');
      assert.includes(latestNotif.message, '+20 điểm');
    }
  );

  harness.register(
    'T1_FR07_05',
    'FR-07: Từ chối tài liệu kèm lý do cụ thể chuyển trạng thái REJECTED và thông báo tác giả',
    { tier: 1, fr: 'FR-07' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.moderateDocument('ADMIN', 'doc-8', 'REJECT', {
        rejectReason: 'Tài liệu vi phạm Tiêu chí số 4: Gắn sai học phần và nội dung bị mờ nhòe.'
      });
      assert.true(res.success);
      assert.eq(res.status, 'REJECTED');
      const doc = sys.documents.find((d) => d.id === 'doc-8');
      assert.eq(doc.status, 'REJECTED');
      assert.includes(doc.rejectReason, 'Tiêu chí số 4');
    }
  );

  // --------------------------------------------------------------------------
  // FR-08: Quản trị Danh mục & Quản lý Người dùng (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR08_01',
    'FR-08: Admin tạo mới môn học vào khung chương trình đào tạo thành công',
    { tier: 1, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      const newCourse = sys.createCourse('ADMIN', {
        code: 'COMP1099',
        name: 'Trí tuệ nhân tạo trong Dạy học Tin học',
        credits: 3,
        knowledgeBlock: 'Chuyên ngành',
        semester: 'Học kỳ 6'
      });
      assert.eq(newCourse.code, 'COMP1099');
      assert.eq(newCourse.credits, 3);
      assert.true(newCourse.isActive);
    }
  );

  harness.register(
    'T1_FR08_02',
    'FR-08: Admin xem danh sách toàn bộ người dùng hiển thị đầy đủ thông tin',
    { tier: 1, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      const users = sys.listUsers('ADMIN');
      assert.true(users.length >= 5);
      assert.true(users.every((u) => u.email && u.role));
    }
  );

  harness.register(
    'T1_FR08_03',
    'FR-08: Admin tìm kiếm người dùng theo tên hoặc email chuẩn xác',
    { tier: 1, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      const results = sys.listUsers('ADMIN', 'Lê Nguyễn Thùy Trâm');
      assert.eq(results.length, 1);
      assert.eq(results[0].id, 'user-tram');
    }
  );

  harness.register(
    'T1_FR08_04',
    'FR-08: Admin khóa tài khoản người dùng đổi isActive thành false',
    { tier: 1, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      const updated = sys.toggleUserLock('ADMIN', 'user-dat');
      assert.false(updated.isActive);
    }
  );

  harness.register(
    'T1_FR08_05',
    'FR-08: Admin mở khóa tài khoản đang bị khóa đổi isActive thành true',
    { tier: 1, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      const updated = sys.toggleUserLock('ADMIN', 'user-locked');
      assert.true(updated.isActive);
    }
  );

  // --------------------------------------------------------------------------
  // FR-09: Kho tài liệu cá nhân (My Library) (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR09_01',
    'FR-09: Thêm tài liệu vào danh sách Yêu thích (Bookmark) thành công',
    { tier: 1, fr: 'FR-09' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.toggleBookmark('user-dat', 'doc-2');
      assert.true(res.isBookmarked);
    }
  );

  harness.register(
    'T1_FR09_02',
    'FR-09: Xóa tài liệu khỏi danh sách Bookmark khi bấm lần hai',
    { tier: 1, fr: 'FR-09' },
    (assert) => {
      const sys = new SystemState();
      // user-dat đang bookmark doc-1
      const res = sys.toggleBookmark('user-dat', 'doc-1');
      assert.false(res.isBookmarked);
    }
  );

  harness.register(
    'T1_FR09_03',
    'FR-09: Truy vấn danh sách Bookmarks trả về đúng các tài liệu đã lưu',
    { tier: 1, fr: 'FR-09' },
    (assert) => {
      const sys = new SystemState();
      const savedDocs = sys.getUserBookmarks('user-vi');
      assert.eq(savedDocs.length, 2);
      assert.includes(savedDocs.map((d) => d.id), 'doc-1');
      assert.includes(savedDocs.map((d) => d.id), 'doc-2');
    }
  );

  harness.register(
    'T1_FR09_04',
    'FR-09: Tab "Tài liệu của tôi" hiển thị học liệu đang PENDING của người dùng',
    { tier: 1, fr: 'FR-09' },
    (assert) => {
      const sys = new SystemState();
      const pendingDocs = sys.getUserContributions('user-vi', 'PENDING');
      assert.true(pendingDocs.length >= 1);
      assert.eq(pendingDocs[0].id, 'doc-8');
    }
  );

  harness.register(
    'T1_FR09_05',
    'FR-09: Tab "Tài liệu của tôi" hiển thị học liệu đã APPROVED công khai của người dùng',
    { tier: 1, fr: 'FR-09' },
    (assert) => {
      const sys = new SystemState();
      const approvedDocs = sys.getUserContributions('user-vi', 'APPROVED');
      assert.true(approvedDocs.length >= 1);
      assert.eq(approvedDocs[0].id, 'doc-2');
    }
  );

  // --------------------------------------------------------------------------
  // FR-10: Đánh giá chất lượng & Bình luận trao đổi (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR10_01',
    'FR-10: Gửi đánh giá sao hợp lệ (5 sao) ghi nhận vào hệ thống',
    { tier: 1, fr: 'FR-10' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.rateDocument('user-khoa', 'doc-2', 5);
      assert.true(res.ratingCount > 0);
      assert.true(res.ratingAvg > 0);
    }
  );

  harness.register(
    'T1_FR10_02',
    'FR-10: Tính toán điểm đánh giá sao trung bình chuẩn xác đến 1 chữ số thập phân',
    { tier: 1, fr: 'FR-10' },
    (assert) => {
      const sys = new SystemState();
      // Thêm đánh giá 4 sao và 5 sao
      sys.rateDocument('user-tram', 'doc-3', 4);
      const res = sys.rateDocument('user-dat', 'doc-3', 5);
      assert.eq(res.ratingAvg, 4.5);
      assert.eq(res.ratingCount, 2);
    }
  );

  harness.register(
    'T1_FR10_03',
    'FR-10: Thêm bình luận học thuật mới đính kèm thông tin tác giả và thời gian',
    { tier: 1, fr: 'FR-10' },
    (assert) => {
      const sys = new SystemState();
      const cmt = sys.addComment('user-vi', 'doc-1', 'Bài giải rất chuẩn xác, cảm ơn bạn!');
      assert.eq(cmt.authorId, 'user-vi');
      assert.includes(cmt.content, 'Bài giải rất chuẩn xác');
      assert.true(Boolean(cmt.createdAt));
    }
  );

  harness.register(
    'T1_FR10_04',
    'FR-10: Tác giả tự xóa bình luận của chính mình thành công',
    { tier: 1, fr: 'FR-10' },
    (assert) => {
      const sys = new SystemState();
      // cmt-1 do user-dat viết
      const deleted = sys.deleteComment('user-dat', 'STUDENT', 'doc-1', 'cmt-1');
      assert.eq(deleted.id, 'cmt-1');
      const doc = sys.documents.find((d) => d.id === 'doc-1');
      assert.false(doc.comments.some((c) => c.id === 'cmt-1'));
    }
  );

  harness.register(
    'T1_FR10_05',
    'FR-10: Quản trị viên (Admin) có quyền xóa bình luận của bất kỳ ai để kiểm duyệt',
    { tier: 1, fr: 'FR-10' },
    (assert) => {
      const sys = new SystemState();
      // Admin xóa cmt-1
      const deleted = sys.deleteComment('user-khoa', 'ADMIN', 'doc-1', 'cmt-1');
      assert.eq(deleted.id, 'cmt-1');
    }
  );

  // --------------------------------------------------------------------------
  // FR-11: Báo cáo vi phạm & Hòm thư góp ý (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR11_01',
    'FR-11: Gửi báo cáo vi phạm tài liệu với lý do hợp lệ chuyển vào hàng đợi PENDING',
    { tier: 1, fr: 'FR-11' },
    (assert) => {
      const sys = new SystemState();
      const rep = sys.reportDocument('user-vi', {
        docId: 'doc-1',
        reasonGroup: 'Vi phạm bản quyền hoặc đề thi đang trong thời gian bảo mật',
        details: 'Tài liệu chứa câu hỏi đề thi bảo mật của trường THPT Thực hành.'
      });
      assert.eq(rep.status, 'PENDING');
      assert.eq(rep.docId, 'doc-1');
    }
  );

  harness.register(
    'T1_FR11_02',
    'FR-11: Gửi phản hồi qua Hòm thư góp ý hệ thống thành công',
    { tier: 1, fr: 'FR-11' },
    (assert) => {
      const sys = new SystemState();
      const fb = sys.submitFeedback({
        fullName: 'Nguyễn Văn A',
        email: 'nva@gmail.com',
        category: 'Giao diện & Trải nghiệm',
        message: 'Giao diện Vectoria Light Mode rất hiện đại và dễ nhìn!'
      });
      assert.true(Boolean(fb.id));
      assert.eq(fb.category, 'Giao diện & Trải nghiệm');
    }
  );

  harness.register(
    'T1_FR11_03',
    'FR-11: Admin xử lý báo cáo: Hành động Ẩn/Xóa tài liệu chuyển doc sang REJECTED',
    { tier: 1, fr: 'FR-11' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.resolveReport('ADMIN', 'rep-1', 'HIDE_DOC');
      assert.eq(res.action, 'HIDE_DOC');
      assert.eq(res.report.status, 'RESOLVED');
      const doc = sys.documents.find((d) => d.id === 'doc-2');
      assert.eq(doc.status, 'REJECTED');
    }
  );

  harness.register(
    'T1_FR11_04',
    'FR-11: Admin xử lý báo cáo: Hành động Bác bỏ báo cáo sai lệch chuyển sang DISMISSED',
    { tier: 1, fr: 'FR-11' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.resolveReport('ADMIN', 'rep-1', 'DISMISS');
      assert.eq(res.action, 'DISMISS');
      assert.eq(res.report.status, 'DISMISSED');
      const doc = sys.documents.find((d) => d.id === 'doc-2');
      assert.eq(doc.status, 'APPROVED'); // Vẫn giữ nguyên trạng thái
    }
  );

  harness.register(
    'T1_FR11_05',
    'FR-11: Hàng đợi báo cáo ghi nhận chính xác các báo cáo vi phạm đang PENDING',
    { tier: 1, fr: 'FR-11' },
    (assert) => {
      const sys = new SystemState();
      const pendingReps = sys.reports.filter((r) => r.status === 'PENDING');
      assert.true(pendingReps.length >= 1);
      assert.eq(pendingReps[0].id, 'rep-1');
    }
  );

  // --------------------------------------------------------------------------
  // FR-12: Điểm tích lũy, Treo thưởng (Study Bounty) & Leaderboard (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR12_01',
    'FR-12: Người dùng đăng ký tài khoản được cấp +50 điểm khởi đầu',
    { tier: 1, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.registerUser({
        email: 'gamification.user@hcmue.edu.vn',
        password: 'Password123@',
        fullName: 'Gamification User'
      });
      assert.eq(res.user.points, 50);
    }
  );

  harness.register(
    'T1_FR12_02',
    'FR-12: Tạo yêu cầu treo thưởng tài liệu trừ điểm tạm giữ trong ví của người tạo',
    { tier: 1, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();
      const creator = sys.users.find((u) => u.id === 'user-vi');
      const beforePoints = creator.points; // 140
      const bounty = sys.createBounty('user-vi', {
        title: 'Cần đề thi học kỳ 2 môn Lập trình Web COMP1022 K49',
        courseCode: 'COMP1022',
        rewardPoints: 30
      });
      assert.eq(bounty.status, 'OPEN');
      assert.eq(creator.points, beforePoints - 30);
    }
  );

  harness.register(
    'T1_FR12_03',
    'FR-12: Giải thưởng yêu cầu tài liệu chuyển điểm thưởng sang ví của người nộp',
    { tier: 1, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();
      const submitter = sys.users.find((u) => u.id === 'user-vi');
      const beforePoints = submitter.points;
      const res = sys.fulfillBounty('user-vi', 'bounty-1', 'doc-1');
      assert.true(res.success);
      assert.eq(submitter.points, beforePoints + 50);
    }
  );

  harness.register(
    'T1_FR12_04',
    'FR-12: Yêu cầu treo thưởng sau khi giải quyết chuyển trạng thái sang FULFILLED',
    { tier: 1, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();
      sys.fulfillBounty('user-vi', 'bounty-1', 'doc-1');
      const bounty = sys.bounties.find((b) => b.id === 'bounty-1');
      assert.eq(bounty.status, 'FULFILLED');
      assert.eq(bounty.fulfilledDocId, 'doc-1');
    }
  );

  harness.register(
    'T1_FR12_05',
    'FR-12: Bảng xếp hạng Top 10 sắp xếp thành viên cống hiến theo điểm giảm dần',
    { tier: 1, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();
      const top10 = sys.getTop10Leaderboard();
      assert.true(top10.length <= 10);
      for (let i = 0; i < top10.length - 1; i++) {
        assert.true(top10[i].points >= top10[i + 1].points, 'Leaderboard must be sorted DESC by points');
      }
    }
  );

  // --------------------------------------------------------------------------
  // FR-13: Quản lý lượt tải & Dashboard Quản trị (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T1_FR13_01',
    'FR-13: Khách vãng lai tải tệp lượt 1 thành công và tăng biến đếm downloadCount',
    { tier: 1, fr: 'FR-13' },
    (assert) => {
      const sys = new SystemState();
      const before = sys.documents.find((d) => d.id === 'doc-1').downloadCount;
      const res = sys.downloadDocument('doc-1', 'GUEST', '192.168.1.100');
      assert.eq(res.downloadCount, before + 1);
    }
  );

  harness.register(
    'T1_FR13_02',
    'FR-13: Khách vãng lai tải tệp lượt 2 và lượt 3 trong ngày thành công',
    { tier: 1, fr: 'FR-13' },
    (assert) => {
      const sys = new SystemState();
      sys.downloadDocument('doc-1', 'GUEST', '192.168.1.101'); // lượt 1
      const res2 = sys.downloadDocument('doc-2', 'GUEST', '192.168.1.101'); // lượt 2
      const res3 = sys.downloadDocument('doc-3', 'GUEST', '192.168.1.101'); // lượt 3
      assert.true(Boolean(res2.fileName));
      assert.true(Boolean(res3.fileName));
    }
  );

  harness.register(
    'T1_FR13_03',
    'FR-13: Sinh viên đã đăng nhập được tải tệp tự do không bị giới hạn 3 lượt/ngày',
    { tier: 1, fr: 'FR-13' },
    (assert) => {
      const sys = new SystemState();
      // Sinh viên tải 5 lần liên tiếp
      for (let i = 0; i < 5; i++) {
        const res = sys.downloadDocument('doc-1', 'STUDENT', '192.168.1.102');
        assert.true(Boolean(res.fileName));
      }
    }
  );

  harness.register(
    'T1_FR13_04',
    'FR-13: Dashboard Quản trị tính toán chính xác tổng tài liệu, lượt xem và lượt tải',
    { tier: 1, fr: 'FR-13' },
    (assert) => {
      const sys = new SystemState();
      const stats = sys.getAdminAnalytics('ADMIN', 'all');
      assert.true(stats.approvedDocs >= 1);
      assert.true(stats.totalViews > 0);
      assert.true(stats.totalDownloads > 0);
    }
  );

  harness.register(
    'T1_FR13_05',
    'FR-13: Dashboard tính toán tỷ lệ phần trăm phân bố môn học chính xác',
    { tier: 1, fr: 'FR-13' },
    (assert) => {
      const sys = new SystemState();
      const stats = sys.getAdminAnalytics('ADMIN', 'all');
      assert.true(Array.isArray(stats.courseDistribution));
      assert.true(stats.courseDistribution.length > 0);
      for (const item of stats.courseDistribution) {
        assert.true(item.percent >= 0 && item.percent <= 100);
      }
    }
  );
}

module.exports = { registerTier1Tests };
