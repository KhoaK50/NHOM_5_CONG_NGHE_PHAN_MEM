/**
 * ============================================================================
 * TẦNG 3: PAIRWISE COMBINATIONS & CROSS-FEATURE INTERACTIONS
 * 15 ca kiểm thử tương tác chéo giữa các cặp/nhóm Functional Requirements
 * ============================================================================
 */

const { SystemState } = require('./domain');
const {
  PDF_MAGIC_BYTES,
  ZIP_MAGIC_BYTES,
  createMockFileBuffer
} = require('./fixtures');

function registerTier3Tests(harness) {
  // --------------------------------------------------------------------------
  // T3_COMB_01: [FR-01 + FR-06 + FR-07 + FR-12]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_01',
    'Tổ hợp [FR-01 + FR-06 + FR-07 + FR-12]: Đăng ký -> Upload -> Admin duyệt 8 tiêu chí -> Cộng +20 điểm vào ví',
    { tier: 3, fr: 'FR-07' },
    (assert) => {
      const sys = new SystemState();
      // 1. Đăng ký tài khoản
      const regRes = sys.registerUser({
        email: 'tohop1@hcmue.edu.vn',
        password: 'Password123@',
        fullName: 'Sinh Viên Tổ Hợp 1'
      });
      const user = regRes.user;
      assert.eq(user.points, 50, 'Initial welcome points = 50');

      // 2. Upload tài liệu PDF hợp lệ
      const buf = createMockFileBuffer(PDF_MAGIC_BYTES, 2048);
      const upRes = sys.verifyAndUploadDocument({
        file: { name: 'giao_an_tohop1.pdf', size: buf.length, buffer: buf },
        metadata: {
          title: 'Kế hoạch bài dạy Tin học 10 Bài toán Xử lý Mảng',
          courseCode: 'COMP1044'
        },
        uploaderId: user.id
      });
      assert.true(upRes.isValid);
      assert.eq(upRes.document.status, 'PENDING');

      // 3. Admin duyệt 8 tiêu chí
      const modRes = sys.moderateDocument('ADMIN', upRes.document.id, 'APPROVE', {
        criteriaChecklist: {
          tc01: true,
          tc02: true,
          tc03: true,
          tc04: true,
          tc05: true,
          tc06: true
        }
      });
      assert.true(modRes.success);
      assert.eq(user.points, 70, 'Points must increase from 50 to 70');
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_02: [FR-06 + FR-03 + FR-08]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_02',
    'Tổ hợp [FR-06 + FR-03 + FR-08]: Đang có tài liệu PENDING liên kết thì Admin KHÔNG ĐƯỢC xóa môn học (FK Block)',
    { tier: 3, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      // Môn COMP1058 ban đầu có 0 tài liệu
      const buf = createMockFileBuffer(PDF_MAGIC_BYTES, 1024);
      sys.verifyAndUploadDocument({
        file: { name: 'elearning_sample.pdf', size: buf.length, buffer: buf },
        metadata: {
          title: 'Bài giảng mẫu e-Learning bằng Storyline',
          courseCode: 'COMP1058'
        },
        uploaderId: 'user-vi'
      });
      // Đã có 1 tài liệu PENDING liên kết với COMP1058 -> Thử xóa môn học
      assert.throws(
        () => sys.deleteCourse('ADMIN', 'COMP1058'),
        /Ràng buộc toàn vẹn CSDL \(Khóa ngoại\)/
      );
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_03: [FR-12 + FR-06 + FR-07]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_03',
    'Tổ hợp [FR-12 + FR-06 + FR-07]: Treo thưởng trừ điểm tạm giữ -> Nộp tài liệu -> Duyệt -> Chuyển điểm cho người nộp',
    { tier: 3, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();
      const creator = sys.users.find((u) => u.id === 'user-vi'); // 140 điểm
      const submitter = sys.users.find((u) => u.id === 'user-danh'); // 90 điểm

      // 1. Tạo Bounty 40 điểm
      const bounty = sys.createBounty('user-vi', {
        title: 'Cần Đề thi học kỳ 1 môn Cơ sở lập trình COMP1001',
        courseCode: 'COMP1001',
        rewardPoints: 40
      });
      assert.eq(creator.points, 100);

      // 2. Submitter nộp tài liệu
      const buf = createMockFileBuffer(PDF_MAGIC_BYTES, 1024);
      const upRes = sys.verifyAndUploadDocument({
        file: { name: 'de_thi_cslt_k49.pdf', size: buf.length, buffer: buf },
        metadata: { title: 'Đề thi chính thức CSLT COMP1001 K49 kèm đáp án', courseCode: 'COMP1001' },
        uploaderId: 'user-danh'
      });

      // 3. Admin duyệt tài liệu
      sys.moderateDocument('ADMIN', upRes.document.id, 'APPROVE', {
        criteriaChecklist: { tc01: true, tc02: true, tc03: true, tc04: true, tc05: true, tc06: true }
      });
      // Submitter nhận +20 điểm từ upload duyệt: 90 + 20 = 110

      // 4. Hoàn tất Bounty
      const fulfillRes = sys.fulfillBounty('user-danh', bounty.id, upRes.document.id);
      assert.true(fulfillRes.success);
      assert.eq(submitter.points, 150, 'Submitter must receive 40 bounty points: 110 + 40 = 150');
      assert.eq(bounty.status, 'FULFILLED');
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_04: [FR-13 + FR-01 + FR-05]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_04',
    'Tổ hợp [FR-13 + FR-01 + FR-05]: Khách kịch trần 3 lượt tải -> Chặn -> Đăng nhập Sinh viên -> Tải tự do',
    { tier: 3, fr: 'FR-13' },
    (assert) => {
      const sys = new SystemState();
      const clientIp = '172.16.0.5';
      sys.downloadDocument('doc-1', 'GUEST', clientIp);
      sys.downloadDocument('doc-2', 'GUEST', clientIp);
      sys.downloadDocument('doc-3', 'GUEST', clientIp);

      // Lần 4 bị chặn
      assert.throws(
        () => sys.downloadDocument('doc-1', 'GUEST', clientIp),
        /đạt giới hạn 3 lượt tải\/ngày/
      );

      // Đăng nhập Sinh viên
      const auth = sys.loginUser({ email: 'vi.phantrieu.k50@hcmue.edu.vn', password: 'Student123@' });
      assert.true(Boolean(auth.token));

      // Tải với vai trò STUDENT thành công
      const resStudent = sys.downloadDocument('doc-1', 'STUDENT', clientIp);
      assert.true(Boolean(resStudent.fileName));
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_05: [FR-06 + FR-04 + FR-05]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_05',
    'Tổ hợp [FR-06 + FR-04 + FR-05]: Upload tệp DOCX chữ ký PK.. -> Tìm FTS unaccent -> Sinh link Google Docs Viewer',
    { tier: 3, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();
      const zipBuf = createMockFileBuffer(ZIP_MAGIC_BYTES, 3072);
      const upRes = sys.verifyAndUploadDocument({
        file: { name: 'giao_an_word.docx', size: zipBuf.length, buffer: zipBuf },
        metadata: {
          title: 'Kế hoạch dạy học môn Kiến trúc máy tính văn bản Word',
          courseCode: 'COMP1001'
        },
        uploaderId: 'user-vi'
      });
      assert.true(upRes.isValid);
      assert.eq(upRes.document.format, 'docx');

      // Admin duyệt để lên kho chung
      sys.moderateDocument('ADMIN', upRes.document.id, 'APPROVE', {
        criteriaChecklist: { tc01: true, tc02: true, tc03: true, tc04: true, tc05: true, tc06: true }
      });

      // Tìm FTS không dấu
      const searchRes = sys.searchDocuments({ query: 'kien truc may tinh van ban word' });
      assert.true(searchRes.total >= 1);
      const found = searchRes.items.find((d) => d.id === upRes.document.id);
      assert.true(Boolean(found));

      // Sinh URL Google Docs Viewer
      const viewerUrl = sys.generateViewerUrl(found);
      assert.includes(viewerUrl, 'https://docs.google.com/viewer?url=');
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_06: [FR-10 + FR-09 + FR-02]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_06',
    'Tổ hợp [FR-10 + FR-09 + FR-02]: Đánh giá 5★ + Viết bình luận + Bookmark -> Hiển thị trong Tủ sách cá nhân',
    { tier: 3, fr: 'FR-09' },
    (assert) => {
      const sys = new SystemState();
      // user-dat bookmark doc-3
      sys.toggleBookmark('user-dat', 'doc-3');
      sys.rateDocument('user-dat', 'doc-3', 5);
      sys.addComment('user-dat', 'doc-3', 'Slide bài giảng rất trực quan và chi tiết!');

      const bookmarks = sys.getUserBookmarks('user-dat');
      assert.true(bookmarks.some((d) => d.id === 'doc-3'));
      const doc3 = sys.documents.find((d) => d.id === 'doc-3');
      assert.true(doc3.comments.some((c) => c.authorId === 'user-dat'));
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_07: [FR-08 + FR-01 + FR-06]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_07',
    'Tổ hợp [FR-08 + FR-01 + FR-06]: Admin khóa tài khoản -> Chặn đăng nhập mới -> Chặn tải lên học liệu',
    { tier: 3, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      // Khóa user-dat
      sys.toggleUserLock('ADMIN', 'user-dat');

      // Thử đăng nhập
      assert.throws(
        () => sys.loginUser({ email: 'dat.tranduc.k50@hcmue.edu.vn', password: 'Student123@' }),
        /Tài khoản đã bị khóa/
      );

      // Thử upload
      assert.throws(
        () =>
          sys.verifyAndUploadDocument({
            file: { name: 'test.pdf', size: 1024 },
            uploaderId: 'user-dat'
          }),
        /Tài khoản đã bị khóa/
      );
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_08: [FR-11 + FR-07 + FR-09]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_08',
    'Tổ hợp [FR-11 + FR-07 + FR-09]: Báo cáo vi phạm -> Admin chọn HIDE_DOC -> Tài liệu tác giả chuyển REJECTED',
    { tier: 3, fr: 'FR-11' },
    (assert) => {
      const sys = new SystemState();
      // rep-1 báo cáo doc-2 của user-vi
      sys.resolveReport('ADMIN', 'rep-1', 'HIDE_DOC');
      const doc2 = sys.documents.find((d) => d.id === 'doc-2');
      assert.eq(doc2.status, 'REJECTED');

      // Tác giả kiểm tra My Contributions
      const myRejected = sys.getUserContributions('user-vi', 'REJECTED');
      assert.true(myRejected.some((d) => d.id === 'doc-2'));
      assert.includes(doc2.rejectReason, 'Bị gỡ bỏ do vi phạm');
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_09: [FR-01 + FR-02]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_09',
    'Tổ hợp [FR-01 + FR-02]: Reset mật khẩu xong -> Đăng nhập mật khẩu cũ thất bại -> Đăng nhập mật khẩu mới thành công',
    { tier: 3, fr: 'FR-01' },
    (assert) => {
      const sys = new SystemState();
      const { token } = sys.requestPasswordReset('tram.lenguyen.k50@hcmue.edu.vn');
      sys.resetPassword({
        token,
        newPassword: 'BrandNewPassword999@',
        confirmPassword: 'BrandNewPassword999@'
      });

      // Mật khẩu cũ không còn đăng nhập được
      assert.throws(
        () => sys.loginUser({ email: 'tram.lenguyen.k50@hcmue.edu.vn', password: 'Student123@' }),
        /Thông tin đăng nhập không chính xác/
      );

      // Mật khẩu mới đăng nhập thành công
      const auth = sys.loginUser({
        email: 'tram.lenguyen.k50@hcmue.edu.vn',
        password: 'BrandNewPassword999@'
      });
      assert.true(Boolean(auth.token));
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_10: [FR-04 + FR-03 + FR-13]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_10',
    'Tổ hợp [FR-04 + FR-03 + FR-13]: Lọc tìm kiếm học phần -> Tải tệp -> Cập nhật thống kê download trên Dashboard',
    { tier: 3, fr: 'FR-13' },
    (assert) => {
      const sys = new SystemState();
      const statsBefore = sys.getAdminAnalytics('ADMIN', 'all');
      const downloadsBefore = statsBefore.totalDownloads;

      // Tìm theo học kỳ và môn học
      const searchRes = sys.searchDocuments({ courseCode: 'COMP1044', semester: 'Học kỳ 5' });
      assert.true(searchRes.total >= 1);
      const targetDoc = searchRes.items[0];

      // Sinh viên tải tài liệu
      sys.downloadDocument(targetDoc.id, 'STUDENT', '127.0.0.1');

      // Dashboard cập nhật
      const statsAfter = sys.getAdminAnalytics('ADMIN', 'all');
      assert.eq(statsAfter.totalDownloads, downloadsBefore + 1);
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_11: [FR-10 + FR-08]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_11',
    'Tổ hợp [FR-10 + FR-08]: Bình luận phản cảm -> Sinh viên khác không thể xóa -> Admin can thiệp xóa thành công',
    { tier: 3, fr: 'FR-10' },
    (assert) => {
      const sys = new SystemState();
      // Sinh viên Vi viết bình luận
      const badComment = sys.addComment('user-vi', 'doc-1', 'Bình luận spam quảng cáo phản cảm');
      assert.true(Boolean(badComment.id));

      // Sinh viên Trâm cố xóa bình luận của Vĩ -> Bị chặn 403
      assert.throws(
        () => sys.deleteComment('user-tram', 'STUDENT', 'doc-1', badComment.id),
        /Không có quyền xóa bình luận của người khác/
      );

      // Admin can thiệp xóa thành công
      const deleted = sys.deleteComment('user-khoa', 'ADMIN', 'doc-1', badComment.id);
      assert.eq(deleted.id, badComment.id);
      const doc = sys.documents.find((d) => d.id === 'doc-1');
      assert.false(doc.comments.some((c) => c.id === badComment.id));
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_12: [FR-06 + FR-06]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_12',
    'Tổ hợp [FR-06 + FR-06]: Hai lần tải cùng một nội dung file buffer -> Lần 2 bị chặn ở Tầng 3 (DUPLICATE_HASH)',
    { tier: 3, fr: 'FR-06' },
    (assert) => {
      const sys = new SystemState();
      const buf = createMockFileBuffer(PDF_MAGIC_BYTES, 2048, 0x41);
      // Lần 1: Thành công
      const res1 = sys.verifyAndUploadDocument({
        file: { name: 'file_goc.pdf', size: buf.length, buffer: buf },
        metadata: { title: 'Tài liệu độc nhất tải lần đầu tiên', courseCode: 'COMP1044' },
        uploaderId: 'user-vi'
      });
      assert.true(res1.isValid);

      // Lần 2: Đổi tên tệp nhưng giữ nguyên nội dung nhị phân (trùng SHA-256)
      const res2 = sys.verifyAndUploadDocument({
        file: { name: 'file_doi_ten.pdf', size: buf.length, buffer: buf },
        metadata: { title: 'Tài liệu cố tình đổi tên để spam', courseCode: 'COMP1044' },
        uploaderId: 'user-tram'
      });
      assert.false(res2.isValid);
      assert.eq(res2.stageFailed, 'DUPLICATE_HASH');
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_13: [FR-05 + FR-01]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_13',
    'Tổ hợp [FR-05 + FR-01]: Khách vãng lai xem trang 3 mở -> Xem trang 4 khóa -> Đăng nhập xem trang 4 thông suốt',
    { tier: 3, fr: 'FR-05' },
    (assert) => {
      const sys = new SystemState();
      // Khách
      const p3 = sys.getReaderPage('doc-1', 3, 'GUEST');
      const p4Guest = sys.getReaderPage('doc-1', 4, 'GUEST');
      assert.false(p3.locked);
      assert.true(p4Guest.locked);

      // Đăng nhập
      const auth = sys.loginUser({ email: 'vi.phantrieu.k50@hcmue.edu.vn', password: 'Student123@' });
      assert.true(Boolean(auth.token));

      // Đọc tiếp trang 4 với STUDENT
      const p4Student = sys.getReaderPage('doc-1', 4, 'STUDENT');
      assert.false(p4Student.locked);
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_14: [FR-12 + FR-12]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_14',
    'Tổ hợp [FR-12 + FR-12]: Nhiều sinh viên đóng góp tài liệu -> Điểm thay đổi -> Bảng xếp hạng Top 10 cập nhật thứ bậc',
    { tier: 3, fr: 'FR-12' },
    (assert) => {
      const sys = new SystemState();
      // Ban đầu: dat=160, vi=140, tram=120, danh=90
      const lb1 = sys.getTop10Leaderboard();
      assert.eq(lb1[0].id, 'user-dat');

      // user-danh được duyệt 4 tài liệu liên tiếp -> +80 điểm (90 + 80 = 170)
      for (let i = 0; i < 4; i++) {
        const buf = createMockFileBuffer(PDF_MAGIC_BYTES, 1024 + i, 0x30 + i);
        const up = sys.verifyAndUploadDocument({
          file: { name: `danh_doc_${i}.pdf`, size: buf.length, buffer: buf },
          metadata: { title: `Tài liệu đóng góp số ${i} của Danh`, courseCode: 'COMP1044' },
          uploaderId: 'user-danh'
        });
        sys.moderateDocument('ADMIN', up.document.id, 'APPROVE', {
          criteriaChecklist: { tc01: true, tc02: true, tc03: true, tc04: true, tc05: true, tc06: true }
        });
      }

      const lb2 = sys.getTop10Leaderboard();
      assert.eq(lb2[0].id, 'user-danh', 'Danh must climb to #1 with 170 points');
    }
  );

  // --------------------------------------------------------------------------
  // T3_COMB_15: [FR-08 + FR-03 + FR-06]
  // --------------------------------------------------------------------------
  harness.register(
    'T3_COMB_15',
    'Tổ hợp [FR-08 + FR-03 + FR-06]: Admin thêm môn học mới COMP2001 -> SV upload học liệu -> Khóa ngoại bảo vệ môn',
    { tier: 3, fr: 'FR-08' },
    (assert) => {
      const sys = new SystemState();
      const course = sys.createCourse('ADMIN', {
        code: 'COMP2001',
        name: 'Thực tập Sư phạm Tin học 1',
        credits: 3,
        knowledgeBlock: 'Nghiệp vụ Sư phạm',
        semester: 'Học kỳ 5'
      });
      assert.eq(course.documentCount, 0);

      // Upload học liệu cho môn mới
      const buf = createMockFileBuffer(PDF_MAGIC_BYTES, 1024);
      const up = sys.verifyAndUploadDocument({
        file: { name: 'ke_hoach_thuc_tap.pdf', size: buf.length, buffer: buf },
        metadata: { title: 'Hồ sơ thực tập sư phạm Tin học tại THPT', courseCode: 'COMP2001' },
        uploaderId: 'user-vi'
      });
      assert.true(up.isValid);
      assert.eq(course.documentCount, 1);

      // Thử xóa môn học vừa tạo -> Bị chặn
      assert.throws(
        () => sys.deleteCourse('ADMIN', 'COMP2001'),
        /Ràng buộc toàn vẹn CSDL/
      );
    }
  );
}

module.exports = { registerTier3Tests };
