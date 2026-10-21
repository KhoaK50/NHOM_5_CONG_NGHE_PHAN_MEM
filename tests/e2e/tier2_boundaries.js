/**
 * ============================================================================
 * TẦNG 2: BOUNDARY VALUE ANALYSIS (BVA) & CORNER CASES
 * Tối thiểu 5 ca kiểm thử biên cho mỗi yêu cầu chức năng (13 FRs x 5 = 65 ca)
 * ============================================================================
 */

const { SystemState } = require('./domain');
const {
  PDF_MAGIC_BYTES,
  EXE_MAGIC_BYTES,
  createMockFileBuffer
} = require('./fixtures');

function registerTier2Tests(harness) {
  // --------------------------------------------------------------------------
  // FR-01: Biên xác thực & Phiên (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR01_01',
    'FR-01 (Biên): Email sai định dạng (thiếu @ hoặc thiếu tên miền) bị từ chối',
    { tier: 2, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.registerUser({ email: 'invalid_email_format', password: 'Password123@' }),
        /Email không đúng định dạng chuẩn/
      );
    }
  );

  harness.register(
    'T2_FR01_02',
    'FR-01 (Biên): Mật khẩu đúng 7 ký tự (dưới ngưỡng tối thiểu 8) bị từ chối',
    { tier: 2, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.registerUser({ email: 'test.bva@hcmue.edu.vn', password: 'Pass12@' }),
        /tối thiểu 8 ký tự/
      );
    }
  );

  harness.register(
    'T2_FR01_03',
    'FR-01 (Biên): Mật khẩu thiếu chữ cái in hoa bị từ chối',
    { tier: 2, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.registerUser({ email: 'test.bva2@hcmue.edu.vn', password: 'lowercaseonly123@' }),
        /chữ in hoa/
      );
    }
  );

  harness.register(
    'T2_FR01_04',
    'FR-01 (Biên): Mật khẩu thiếu chữ số bị từ chối',
    { tier: 2, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.registerUser({ email: 'test.bva3@hcmue.edu.vn', password: 'NoNumberPassword@' }),
        /chữ số/
      );
    }
  );

  harness.register(
    'T2_FR01_05',
    'FR-01 (Biên): Token reset mật khẩu quá hạn 15 phút bị từ chối kích hoạt',
    { tier: 2, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();
      const { token } = sys.requestPasswordReset('tram.lenguyen.k50@hcmue.edu.vn');
      // Giả lập token đã quá hạn 15 phút
      const record = sys.passwordResetTokens.get(token);
      record.expiresAt = Date.now() - 1000;

      assert.throws(
        () => sys.resetPassword({ token, newPassword: 'NewPassword123@', confirmPassword: 'NewPassword123@' }),
        /đã hết hạn/
      );
    }
  );

  // --------------------------------------------------------------------------
  // FR-02: Biên hồ sơ & Bảo mật (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR02_01',
    'FR-02 (Biên): Khóa học nằm ngoài phạm vi K48-K52 (vd: K47 hoặc K55) bị từ chối',
    { tier: 2, fr: 'FR-02' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.updateProfile('user-vi', { cohort: 'K47' }),
        /Khóa học không hợp lệ/
      );
      assert.throws(
        () => sys.updateProfile('user-vi', { cohort: 'K55' }),
        /Khóa học không hợp lệ/
      );
    }
  );

  harness.register(
    'T2_FR02_02',
    'FR-02 (Biên): Đổi mật khẩu khi mật khẩu hiện tại bị sai trả lỗi',
    { tier: 2, fr: 'FR-02' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.changePassword('user-vi', {
          oldPassword: 'IncorrectOldPassword123@',
          newPassword: 'NewSecurePassword888@',
          confirmPassword: 'NewSecurePassword888@'
        }),
        /Mật khẩu hiện tại không chính xác/
      );
    }
  );

  harness.register(
    'T2_FR02_03',
    'FR-02 (Biên): Đổi mật khẩu khi mật khẩu mới trùng hoàn toàn mật khẩu cũ bị từ chối',
    { tier: 2, fr: 'FR-02' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.changePassword('user-vi', {
          oldPassword: 'Student123@',
          newPassword: 'Student123@',
          confirmPassword: 'Student123@'
        }),
        /Mật khẩu mới không được trùng/
      );
    }
  );

  harness.register(
    'T2_FR02_04',
    'FR-02 (Biên): Đổi mật khẩu khi mật khẩu xác nhận không khớp bị từ chối',
    { tier: 2, fr: 'FR-02' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.changePassword('user-vi', {
          oldPassword: 'Student123@',
          newPassword: 'NewSecurePassword888@',
          confirmPassword: 'MismatchPassword999@'
        }),
        /Xác nhận mật khẩu mới không khớp/
      );
    }
  );

  harness.register(
    'T2_FR02_05',
    'FR-02 (Biên): Đánh dấu đã đọc thông báo không tồn tại trả lỗi an toàn',
    { tier: 2, fr: 'FR-02' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.markNotificationRead('user-vi', 'non-existent-notif-id'),
        /Không tìm thấy thông báo/
      );
    }
  );

  // --------------------------------------------------------------------------
  // FR-03: Biên danh mục & Môn học (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR03_01',
    'FR-03 (Biên): Lọc theo khối kiến thức không tồn tại trả về danh sách rỗng',
    { tier: 2, fr: 'FR-03' },
    (assert) => {
      const sys = new SystemState();
      const courses = sys.getCourses({ knowledgeBlock: 'Khối Không Tồn Tại' });
      assert.eq(courses.length, 0);
    }
  );

  harness.register(
    'T2_FR03_02',
    'FR-03 (Biên): Lọc theo học kỳ ngoài phạm vi (vd: Học kỳ 8) trả về danh sách rỗng',
    { tier: 2, fr: 'FR-03' },
    (assert) => {
      const sys = new SystemState();
      const courses = sys.getCourses({ semester: 'Học kỳ 8' });
      assert.eq(courses.length, 0);
    }
  );

  harness.register(
    'T2_FR03_03',
    'FR-03 (Biên): Thêm môn học trùng mã code đã có trong CTĐT bị từ chối',
    { tier: 2, fr: 'FR-03' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.createCourse('ADMIN', {
          code: 'COMP1044', // đã có
          name: 'Tên trùng lặp',
          credits: 3
        }),
        /Mã môn học đã tồn tại/
      );
    }
  );

  harness.register(
    'T2_FR03_04',
    'FR-03 (Biên): Thêm môn học có số tín chỉ bằng 0 hoặc âm bị từ chối',
    { tier: 2, fr: 'FR-03' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.createCourse('ADMIN', { code: 'TEST0001', name: 'Môn thử', credits: 0 }),
        /Số tín chỉ phải lớn hơn 0/
      );
      assert.throws(
        () => sys.createCourse('ADMIN', { code: 'TEST0002', name: 'Môn thử âm', credits: -2 }),
        /Số tín chỉ phải lớn hơn 0/
      );
    }
  );

  harness.register(
    'T2_FR03_05',
    'FR-03 (Biên): Thêm môn học thiếu mã code hoặc tên môn bị từ chối',
    { tier: 2, fr: 'FR-03' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.createCourse('ADMIN', { code: '', name: 'Thiếu mã', credits: 3 }),
        /Mã và tên môn học là bắt buộc/
      );
    }
  );

  // --------------------------------------------------------------------------
  // FR-04: Biên tra cứu & Tìm kiếm (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR04_01',
    'FR-04 (Biên): Tìm kiếm với chuỗi SQL Injection xử lý an toàn không gây lỗi',
    { tier: 2, fr: 'FR-04' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.searchDocuments({ query: "' OR '1'='1" });
      assert.true(res.total >= 0);
      assert.true(Array.isArray(res.items));
    }
  );

  harness.register(
    'T2_FR04_02',
    'FR-04 (Biên): Tìm kiếm với chuỗi chứa nhiều khoảng trắng thừa và tab được chuẩn hóa',
    { tier: 2, fr: 'FR-04' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.searchDocuments({ query: '   mang   may    tinh   \t' });
      assert.true(res.total > 0);
      assert.eq(res.items[0].courseCode, 'COMP1015');
    }
  );

  harness.register(
    'T2_FR04_03',
    'FR-04 (Biên): Lọc theo định dạng không hỗ trợ (vd: .mp4 hoặc .exe) trả về 0 kết quả',
    { tier: 2, fr: 'FR-04' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.searchDocuments({ format: 'exe' });
      assert.eq(res.total, 0);
      assert.eq(res.items.length, 0);
    }
  );

  harness.register(
    'T2_FR04_04',
    'FR-04 (Biên): Offset phân trang vượt quá tổng số tài liệu trả về mảng rỗng',
    { tier: 2, fr: 'FR-04' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.searchDocuments({ page: 999, limit: 12 });
      assert.eq(res.items.length, 0);
      assert.eq(res.page, 999);
    }
  );

  harness.register(
    'T2_FR04_05',
    'FR-04 (Biên): Tìm kiếm từ khóa không tồn tại trả về totalResults = 0 mà không sập',
    { tier: 2, fr: 'FR-04' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.searchDocuments({ query: 'chuoi_tim_kiem_khong_bao_gio_ton_tai_xyz123' });
      assert.eq(res.total, 0);
      assert.eq(res.items.length, 0);
      assert.eq(res.totalPages, 1);
    }
  );

  // --------------------------------------------------------------------------
  // FR-05: Biên xem chi tiết & Reader (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR05_01',
    'FR-05 (Biên): Khách vãng lai xem trang 4 bị khóa và trả thông báo mở khóa',
    { tier: 2, fr: 'FR-05' },
    (assert) => {
      const sys = new SystemState();
      const p4 = sys.getReaderPage('doc-1', 4, 'GUEST');
      assert.true(p4.locked);
      assert.includes(p4.message, 'Khách vãng lai chỉ được đọc thử 3 trang đầu');
    }
  );

  harness.register(
    'T2_FR05_02',
    'FR-05 (Biên): Khách vãng lai xem trang 100 vẫn bị khóa an toàn',
    { tier: 2, fr: 'FR-05' },
    (assert) => {
      const sys = new SystemState();
      const p100 = sys.getReaderPage('doc-1', 100, 'GUEST');
      assert.true(p100.locked);
    }
  );

  harness.register(
    'T2_FR05_03',
    'FR-05 (Biên): Yêu cầu trang số 0 hoặc số âm trả lỗi số trang không hợp lệ',
    { tier: 2, fr: 'FR-05' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.getReaderPage('doc-1', 0, 'STUDENT'), /Số trang không hợp lệ/);
      assert.throws(() => sys.getReaderPage('doc-1', -1, 'STUDENT'), /Số trang không hợp lệ/);
    }
  );

  harness.register(
    'T2_FR05_04',
    'FR-05 (Biên): Khách vãng lai xem tài liệu PENDING bị chặn (Lỗi 403)',
    { tier: 2, fr: 'FR-05' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.getDocumentDetail('doc-8', 'GUEST'), /chưa được phê duyệt/);
    }
  );

  harness.register(
    'T2_FR05_05',
    'FR-05 (Biên): Yêu cầu tài liệu không tồn tại trả lỗi 404',
    { tier: 2, fr: 'FR-05' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.getDocumentDetail('doc-999999', 'STUDENT'), /không tồn tại/);
    }
  );

  // --------------------------------------------------------------------------
  // FR-06: Biên 4 Tầng Upload (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR06_01',
    'FR-06 (Biên): Tệp null/undefined bị chặn ngay tại Tầng 1 (FILE_MISSING)',
    { tier: 2, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.verifyAndUploadDocument({ file: null, uploaderId: 'user-vi' });
      assert.false(res.isValid);
      assert.eq(res.stageFailed, 'FILE_MISSING');
    }
  );

  harness.register(
    'T2_FR06_02',
    'FR-06 (Biên): Tệp sai đuôi (.exe, .zip) bị chặn tại Tầng 1 (EXTENSION)',
    { tier: 2, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.verifyAndUploadDocument({
        file: { name: 'virus.exe', size: 1024 },
        uploaderId: 'user-vi'
      });
      assert.false(res.isValid);
      assert.eq(res.stageFailed, 'EXTENSION');
    }
  );

  harness.register(
    'T2_FR06_03',
    'FR-06 (Biên): Tệp rỗng 0 byte bị chặn tại Tầng 1 (EMPTY_FILE)',
    { tier: 2, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.verifyAndUploadDocument({
        file: { name: 'empty.pdf', size: 0 },
        uploaderId: 'user-vi'
      });
      assert.false(res.isValid);
      assert.eq(res.stageFailed, 'EMPTY_FILE');
    }
  );

  harness.register(
    'T2_FR06_04',
    'FR-06 (Biên): Tệp vượt quá 25MB (25.1MB) bị chặn tại Tầng 1 (SIZE_LIMIT)',
    { tier: 2, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();
      const res = sys.verifyAndUploadDocument({
        file: { name: 'oversize.pdf', size: Math.round(25.1 * 1024 * 1024) },
        uploaderId: 'user-vi'
      });
      assert.false(res.isValid);
      assert.eq(res.stageFailed, 'SIZE_LIMIT');
    }
  );

  harness.register(
    'T2_FR06_05',
    'FR-06 (Biên): Tệp giả mạo chữ ký nhị phân (MZ thay vì %PDF-) bị chặn tại Tầng 2 (MAGIC_BYTES)',
    { tier: 2, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();
      const fakeExeBuffer = createMockFileBuffer(EXE_MAGIC_BYTES, 2048);
      const res = sys.verifyAndUploadDocument({
        file: { name: 'trojan_renamed.pdf', size: fakeExeBuffer.length, buffer: fakeExeBuffer },
        metadata: { title: 'Tài liệu giả mạo nguy hiểm', courseCode: 'COMP1044' },
        uploaderId: 'user-vi'
      });
      assert.false(res.isValid);
      assert.eq(res.stageFailed, 'MAGIC_BYTES');
    }
  );

  // --------------------------------------------------------------------------
  // FR-07: Biên Moderation & 8 Tiêu chí (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR07_01',
    'FR-07 (Biên): Sinh viên cố tình truy cập hàng đợi Moderation bị từ chối 403',
    { tier: 2, fr: 'FR-07' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.getPendingModerationQueue('STUDENT'), /Không có quyền Quản trị viên/);
    }
  );

  harness.register(
    'T2_FR07_02',
    'FR-07 (Biên): Phê duyệt tài liệu nhưng thiếu tiêu chí bắt buộc (vd: thiếu TC05) bị từ chối',
    { tier: 2, fr: 'FR-07' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () =>
          sys.moderateDocument('ADMIN', 'doc-8', 'APPROVE', {
            criteriaChecklist: {
              tc01: true,
              tc02: true,
              tc03: true,
              tc04: true,
              tc05: false, // Thiếu chuẩn 5512
              tc06: true
            }
          }),
        /Chưa đạt tiêu chí bắt buộc/
      );
    }
  );

  harness.register(
    'T2_FR07_03',
    'FR-07 (Biên): Từ chối tài liệu nhưng để trống lý do hoặc dưới 10 ký tự bị chặn',
    { tier: 2, fr: 'FR-07' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.moderateDocument('ADMIN', 'doc-8', 'REJECT', { rejectReason: 'Ngắn' }),
        /tối thiểu 10 ký tự/
      );
    }
  );

  harness.register(
    'T2_FR07_04',
    'FR-07 (Biên): Phê duyệt tài liệu đã ở trạng thái APPROVED bị từ chối',
    { tier: 2, fr: 'FR-07' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.moderateDocument('ADMIN', 'doc-1', 'APPROVE', { criteriaChecklist: { tc01: true } }),
        /không nằm trong hàng đợi/
      );
    }
  );

  harness.register(
    'T2_FR07_05',
    'FR-07 (Biên): Sinh viên cố tình gửi lệnh kiểm duyệt bị từ chối 403',
    { tier: 2, fr: 'FR-07' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.moderateDocument('STUDENT', 'doc-8', 'APPROVE'),
        /Không có quyền Quản trị viên/
      );
    }
  );

  // --------------------------------------------------------------------------
  // FR-08: Biên Quản trị khóa học & Tài khoản (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR08_01',
    'FR-08 (Biên): Xóa môn học đang có tài liệu liên kết bị CHẶN bởi khóa ngoại',
    { tier: 2, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.deleteCourse('ADMIN', 'COMP1044'),
        /Ràng buộc toàn vẹn CSDL \(Khóa ngoại\)/
      );
    }
  );

  harness.register(
    'T2_FR08_02',
    'FR-08 (Biên): Xóa môn học có 0 tài liệu liên kết thành công',
    { tier: 2, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      const deleted = sys.deleteCourse('ADMIN', 'COMP1058');
      assert.eq(deleted.code, 'COMP1058');
      assert.false(sys.courses.some((c) => c.code === 'COMP1058'));
    }
  );

  harness.register(
    'T2_FR08_03',
    'FR-08 (Biên): Sinh viên cố gắng xóa môn học bị từ chối 403',
    { tier: 2, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.deleteCourse('STUDENT', 'COMP1058'), /Chỉ Admin/);
    }
  );

  harness.register(
    'T2_FR08_04',
    'FR-08 (Biên): Sinh viên cố gắng khóa tài khoản người khác bị từ chối 403',
    { tier: 2, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.toggleUserLock('STUDENT', 'user-vi'), /Chỉ Admin/);
    }
  );

  harness.register(
    'T2_FR08_05',
    'FR-08 (Biên): Người dùng bị khóa (isActive=false) cố tình tải tài liệu lên bị chặn',
    { tier: 2, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () =>
          sys.verifyAndUploadDocument({
            file: { name: 'test.pdf', size: 1024 },
            uploaderId: 'user-locked'
          }),
        /Tài khoản đã bị khóa/
      );
    }
  );

  // --------------------------------------------------------------------------
  // FR-09: Biên Tủ sách cá nhân (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR09_01',
    'FR-09 (Biên): Người dùng không tồn tại cố thao tác bookmark bị từ chối',
    { tier: 2, fr: 'FR-09' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.toggleBookmark('ghost-user', 'doc-1'), /Người dùng không tồn tại/);
    }
  );

  harness.register(
    'T2_FR09_02',
    'FR-09 (Biên): Người dùng chưa từng bookmark tài liệu trả về mảng rỗng sạch sẽ',
    { tier: 2, fr: 'FR-09' },
    (assert) => {
      const sys = new SystemState();
      const saved = sys.getUserBookmarks('user-danh');
      assert.eq(saved.length, 0);
    }
  );

  harness.register(
    'T2_FR09_03',
    'FR-09 (Biên): Người dùng chưa từng đóng góp tài liệu trả về mảng rỗng',
    { tier: 2, fr: 'FR-09' },
    (assert) => {
      const sys = new SystemState();
      const contribs = sys.getUserContributions('user-danh');
      assert.eq(contribs.length, 0);
    }
  );

  harness.register(
    'T2_FR09_04',
    'FR-09 (Biên): Lọc tài liệu bị từ chối REJECTED hiển thị đúng trường rejectReason',
    { tier: 2, fr: 'FR-09' },
    (assert) => {
      const sys = new SystemState();
      const rejectedDocs = sys.getUserContributions('user-vi', 'REJECTED');
      assert.true(rejectedDocs.length >= 1);
      assert.true(Boolean(rejectedDocs[0].rejectReason));
    }
  );

  harness.register(
    'T2_FR09_05',
    'FR-09 (Biên): Sinh viên truy vấn bookmarks không bị lẫn tài liệu của người khác',
    { tier: 2, fr: 'FR-09' },
    (assert) => {
      const sys = new SystemState();
      const datSaved = sys.getUserBookmarks('user-dat');
      assert.eq(datSaved.length, 1);
      assert.eq(datSaved[0].id, 'doc-1');
    }
  );

  // --------------------------------------------------------------------------
  // FR-10: Biên Đánh giá & Bình luận (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR10_01',
    'FR-10 (Biên): Đánh giá 0 sao (dưới ngưỡng 1) bị từ chối',
    { tier: 2, fr: 'FR-10' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.rateDocument('user-vi', 'doc-1', 0), /từ 1 đến 5/);
    }
  );

  harness.register(
    'T2_FR10_02',
    'FR-10 (Biên): Đánh giá 6 sao (vượt ngưỡng 5) bị từ chối',
    { tier: 2, fr: 'FR-10' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.rateDocument('user-vi', 'doc-1', 6), /từ 1 đến 5/);
    }
  );

  harness.register(
    'T2_FR10_03',
    'FR-10 (Biên): Đánh giá số sao là số thập phân (4.5 sao) bị từ chối',
    { tier: 2, fr: 'FR-10' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.rateDocument('user-vi', 'doc-1', 4.5), /số nguyên/);
    }
  );

  harness.register(
    'T2_FR10_04',
    'FR-10 (Biên): Người dùng đánh giá lại tài liệu cập nhật số sao, không tăng ratingCount',
    { tier: 2, fr: 'FR-10' },
    (assert) => {
      const sys = new SystemState();
      // user-dat đang đánh giá 5 sao cho doc-1
      const countBefore = sys.ratings.filter((r) => r.docId === 'doc-1').length;
      sys.rateDocument('user-dat', 'doc-1', 4);
      const countAfter = sys.ratings.filter((r) => r.docId === 'doc-1').length;
      assert.eq(countAfter, countBefore);
    }
  );

  harness.register(
    'T2_FR10_05',
    'FR-10 (Biên): Sinh viên cố tình xóa bình luận của người khác bị chặn 403 Forbidden',
    { tier: 2, fr: 'FR-10' },
    (assert) => {
      const sys = new SystemState();
      // cmt-1 do user-dat viết, user-vi cố xóa
      assert.throws(
        () => sys.deleteComment('user-vi', 'STUDENT', 'doc-1', 'cmt-1'),
        /Không có quyền xóa bình luận của người khác/
      );
    }
  );

  // --------------------------------------------------------------------------
  // FR-11: Biên Báo cáo vi phạm & Góp ý (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR11_01',
    'FR-11 (Biên): Báo cáo vi phạm với lý do sai lệch ngoài danh mục bị từ chối',
    { tier: 2, fr: 'FR-11' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () =>
          sys.reportDocument('user-vi', {
            docId: 'doc-1',
            reasonGroup: 'Lý do bịa đặt không có trong quy định',
            details: 'Chi tiết báo cáo hợp lệ dài hơn 10 ký tự.'
          }),
        /không thuộc danh mục/
      );
    }
  );

  harness.register(
    'T2_FR11_02',
    'FR-11 (Biên): Báo cáo vi phạm với chi tiết dưới 10 ký tự bị từ chối',
    { tier: 2, fr: 'FR-11' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () =>
          sys.reportDocument('user-vi', {
            docId: 'doc-1',
            reasonGroup: 'Tệp mờ nhòe, thiếu trang hoặc lỗi phông chữ Tiếng Việt',
            details: 'Ngắn'
          }),
        /tối thiểu 10 ký tự/
      );
    }
  );

  harness.register(
    'T2_FR11_03',
    'FR-11 (Biên): Báo cáo tài liệu không tồn tại bị từ chối',
    { tier: 2, fr: 'FR-11' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () =>
          sys.reportDocument('user-vi', {
            docId: 'doc-ghost-999',
            reasonGroup: 'Tệp mờ nhòe, thiếu trang hoặc lỗi phông chữ Tiếng Việt',
            details: 'Chi tiết hợp lệ dài hơn 10 ký tự.'
          }),
        /không tồn tại/
      );
    }
  );

  harness.register(
    'T2_FR11_04',
    'FR-11 (Biên): Góp ý hệ thống với nội dung dưới 10 ký tự bị từ chối',
    { tier: 2, fr: 'FR-11' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.submitFeedback({ message: 'Quá ngắn' }),
        /tối thiểu 10 ký tự/
      );
    }
  );

  harness.register(
    'T2_FR11_05',
    'FR-11 (Biên): Sinh viên cố tình duyệt xử lý báo cáo vi phạm bị từ chối 403',
    { tier: 2, fr: 'FR-11' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.resolveReport('STUDENT', 'rep-1', 'HIDE_DOC'), /Chỉ Admin/);
    }
  );

  // --------------------------------------------------------------------------
  // FR-12: Biên Gamification & Treo thưởng (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR12_01',
    'FR-12 (Biên): Tạo yêu cầu treo thưởng vượt quá số dư ví điểm hiện có bị từ chối',
    { tier: 2, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();
      // user-danh có 90 điểm, cố treo thưởng 150 điểm
      assert.throws(
        () =>
          sys.createBounty('user-danh', {
            title: 'Cần tài liệu đề thi hiếm học kỳ 2',
            courseCode: 'COMP1044',
            rewardPoints: 150
          }),
        /không đủ để treo thưởng/
      );
    }
  );

  harness.register(
    'T2_FR12_02',
    'FR-12 (Biên): Tạo yêu cầu treo thưởng với số điểm bằng 0 hoặc âm bị từ chối',
    { tier: 2, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(
        () => sys.createBounty('user-vi', { title: 'Cần đề thi hiếm', rewardPoints: 0 }),
        /lớn hơn 0/
      );
      assert.throws(
        () => sys.createBounty('user-vi', { title: 'Cần đề thi hiếm', rewardPoints: -10 }),
        /lớn hơn 0/
      );
    }
  );

  harness.register(
    'T2_FR12_03',
    'FR-12 (Biên): Người tạo không thể tự giải thưởng cho yêu cầu do chính mình đăng',
    { tier: 2, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();
      // bounty-1 do user-dat tạo
      assert.throws(
        () => sys.fulfillBounty('user-dat', 'bounty-1', 'doc-1'),
        /Không thể tự giải thưởng/
      );
    }
  );

  harness.register(
    'T2_FR12_04',
    'FR-12 (Biên): Giải thưởng yêu cầu đã FULFILLED bị từ chối',
    { tier: 2, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();
      sys.fulfillBounty('user-vi', 'bounty-1', 'doc-1');
      assert.throws(
        () => sys.fulfillBounty('user-tram', 'bounty-1', 'doc-2'),
        /đã được giải quyết/
      );
    }
  );

  harness.register(
    'T2_FR12_05',
    'FR-12 (Biên): Bảng xếp hạng Top 10 luôn giới hạn tối đa 10 thành viên',
    { tier: 2, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();
      // Bổ sung thêm nhiều sinh viên giả lập
      for (let i = 0; i < 15; i++) {
        sys.users.push({
          id: `sim-user-${i}`,
          fullName: `Sim User ${i}`,
          role: 'STUDENT',
          points: 50 + i * 10
        });
      }
      const top10 = sys.getTop10Leaderboard();
      assert.eq(top10.length, 10);
    }
  );

  // --------------------------------------------------------------------------
  // FR-13: Biên Lượt tải & Dashboard (5 test cases)
  // --------------------------------------------------------------------------
  harness.register(
    'T2_FR13_01',
    'FR-13 (Biên): Khách vãng lai tải lượt thứ 4 trong ngày bị CHẶN triệt để',
    { tier: 2, fr: 'FR-13' },
    (assert) => {
      const sys = new SystemState();
      const ip = '10.0.0.1';
      sys.downloadDocument('doc-1', 'GUEST', ip); // 1
      sys.downloadDocument('doc-2', 'GUEST', ip); // 2
      sys.downloadDocument('doc-3', 'GUEST', ip); // 3
      assert.throws(
        () => sys.downloadDocument('doc-1', 'GUEST', ip), // 4 -> Chặn
        /đạt giới hạn 3 lượt tải\/ngày/
      );
    }
  );

  harness.register(
    'T2_FR13_02',
    'FR-13 (Biên): Khách bị chặn tải nhận được thông báo yêu cầu đăng nhập Sinh viên',
    { tier: 2, fr: 'FR-13' },
    (assert) => {
      const sys = new SystemState();
      const ip = '10.0.0.2';
      sys.downloadDocument('doc-1', 'GUEST', ip);
      sys.downloadDocument('doc-2', 'GUEST', ip);
      sys.downloadDocument('doc-3', 'GUEST', ip);
      let errMsg = '';
      try {
        sys.downloadDocument('doc-1', 'GUEST', ip);
      } catch (err) {
        errMsg = err.message;
      }
      assert.includes(errMsg, 'Vui lòng đăng nhập tài khoản Sinh viên');
    }
  );

  harness.register(
    'T2_FR13_03',
    'FR-13 (Biên): Tải tài liệu không tồn tại trả lỗi 404',
    { tier: 2, fr: 'FR-13' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.downloadDocument('ghost-doc-id', 'STUDENT'), /không tồn tại/);
    }
  );

  harness.register(
    'T2_FR13_04',
    'FR-13 (Biên): Sinh viên cố tình truy cập Analytics Dashboard bị từ chối 403',
    { tier: 2, fr: 'FR-13' },
    (assert) => {
      const sys = new SystemState();
      assert.throws(() => sys.getAdminAnalytics('STUDENT', 'all'), /Chỉ Admin/);
    }
  );

  harness.register(
    'T2_FR13_05',
    'FR-13 (Biên): Thống kê khi không có tài liệu nào không bị lỗi chia cho 0 (NaN)',
    { tier: 2, fr: 'FR-13' },
    (assert) => {
      const sys = new SystemState();
      sys.documents = []; // Rỗng
      const stats = sys.getAdminAnalytics('ADMIN', 'all');
      assert.eq(stats.approvedDocs, 0);
      assert.eq(stats.totalViews, 0);
      assert.eq(stats.totalDownloads, 0);
    }
  );
}

module.exports = { registerTier2Tests };
