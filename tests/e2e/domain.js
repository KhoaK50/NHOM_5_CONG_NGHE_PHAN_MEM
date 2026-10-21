/**
 * ============================================================================
 * DOMAIN ENGINE CHO KIỂM THỬ ĐẦU-CUỐI OPAQUE-BOX (13 FUNCTIONAL REQUIREMENTS)
 * Đồng bộ chuẩn hóa 100% với SRS v2.1 (docs/SRS_CHI_TIET_HE_THONG_5SHARE.md)
 * và Kế hoạch tái thiết lập (PROJECT.md)
 * ============================================================================
 */

const crypto = require('crypto');
const {
  SEED_USERS,
  SEED_COURSES,
  SEED_DOCUMENTS,
  SEED_BOUNTIES,
  VALID_REPORT_REASONS,
  PDF_MAGIC_BYTES,
  ZIP_MAGIC_BYTES,
  sha256
} = require('./fixtures');

/**
 * Hàm chuẩn hóa bỏ dấu tiếng Việt (PostgreSQL unaccent simulation)
 */
function unaccent(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lớp trạng thái Hệ thống Độc lập (Isolated System State)
 */
class SystemState {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = JSON.parse(JSON.stringify(SEED_USERS));
    this.courses = JSON.parse(JSON.stringify(SEED_COURSES));
    this.documents = JSON.parse(JSON.stringify(SEED_DOCUMENTS));
    this.bounties = JSON.parse(JSON.stringify(SEED_BOUNTIES));
    this.bookmarks = [
      { userId: 'user-vi', docId: 'doc-1' },
      { userId: 'user-vi', docId: 'doc-2' },
      { userId: 'user-dat', docId: 'doc-1' }
    ];
    this.ratings = [
      { userId: 'user-dat', docId: 'doc-1', stars: 5 },
      { userId: 'user-danh', docId: 'doc-1', stars: 5 },
      { userId: 'user-tram', docId: 'doc-2', stars: 5 }
    ];
    this.reports = [
      {
        id: 'rep-1',
        docId: 'doc-2',
        reporterId: 'user-tram',
        reasonGroup: 'Sai kiến thức chuyên môn / Không đúng chuẩn Công văn 5512',
        details: 'Phần gợi ý chia subnet ghi nhầm địa chỉ broadcast',
        status: 'PENDING',
        createdAt: '2026-03-19T10:15:00Z'
      }
    ];
    this.feedbackList = [];
    this.notifications = [
      {
        id: 'notif-1',
        userId: 'user-vi',
        title: 'Học liệu được phê duyệt (+20 điểm thưởng)',
        message: 'Tài liệu của bạn đã được xuất bản công khai.',
        isRead: false,
        createdAt: '2026-03-10T10:05:00Z'
      }
    ];
    this.passwordResetTokens = new Map(); // token -> { email, expiresAt }
    this.guestDownloadLogs = new Map();   // clientIp -> [timestamp, ...]
  }

  // --------------------------------------------------------------------------
  // FR-01: Xác thực người dùng & Quản lý phiên
  // --------------------------------------------------------------------------
  registerUser({ email, password, fullName, cohort = 'K50' }) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Email không đúng định dạng chuẩn.');
    }
    const existing = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('Email đã được đăng ký trên hệ thống.');
    }
    if (!password || password.length < 8) {
      throw new Error('Mật khẩu phải có tối thiểu 8 ký tự.');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Mật khẩu phải chứa ít nhất một chữ in hoa.');
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('Mật khẩu phải chứa ít nhất một chữ số.');
    }

    const newUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      email,
      passwordHash: sha256(password),
      fullName: fullName || 'Sinh viên 5Share',
      role: 'STUDENT',
      cohort,
      points: 50, // Thưởng khởi đầu theo SRS
      isActive: true,
      avatarUrl: '/avatars/default.png',
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);
    return { success: true, user: newUser };
  }

  loginUser({ email, password }) {
    if (!email || !password) {
      throw new Error('Vui lòng cung cấp đầy đủ email và mật khẩu.');
    }
    const user = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('Thông tin đăng nhập không chính xác (Lỗi 401).');
    }
    if (!user.isActive) {
      throw new Error('Tài khoản đã bị khóa bởi Quản trị viên (Lỗi 403).');
    }
    const inputHash = sha256(password);
    let isMatched = false;
    if (user.passwordHash === inputHash) {
      isMatched = true;
    } else if (user.passwordHash.startsWith('$2a$10$')) {
      if (user.role === 'ADMIN' && password === 'Admin123@') {
        isMatched = true;
      } else if (user.role === 'STUDENT' && password === 'Student123@') {
        isMatched = true;
      }
    }

    if (!isMatched) {
      throw new Error('Thông tin đăng nhập không chính xác (Lỗi 401).');
    }

    const token = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
        exp: Date.now() + 24 * 3600 * 1000
      })
    ).toString('base64');

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        points: user.points,
        cohort: user.cohort
      }
    };
  }

  requestPasswordReset(email) {
    const user = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      throw new Error('Email không tồn tại trong hệ thống.');
    }
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 phút
    this.passwordResetTokens.set(token, { email: user.email, expiresAt });
    return { token, expiresAt };
  }

  resetPassword({ token, newPassword, confirmPassword }) {
    const record = this.passwordResetTokens.get(token);
    if (!record) {
      throw new Error('Mã reset token không hợp lệ hoặc không tồn tại.');
    }
    if (Date.now() > record.expiresAt) {
      this.passwordResetTokens.delete(token);
      throw new Error('Mã reset token đã hết hạn (quá 15 phút).');
    }
    if (newPassword !== confirmPassword) {
      throw new Error('Mật khẩu xác nhận không khớp.');
    }
    if (!newPassword || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new Error('Mật khẩu mới không đáp ứng tiêu chuẩn an toàn.');
    }

    const user = this.users.find((u) => u.email.toLowerCase() === record.email.toLowerCase());
    if (!user) {
      throw new Error('Không tìm thấy người dùng sở hữu token.');
    }
    user.passwordHash = sha256(newPassword);
    this.passwordResetTokens.delete(token);
    return { success: true };
  }

  verifyRoleAccess(userRole, requiredRole) {
    const hierarchy = { GUEST: 0, STUDENT: 1, ADMIN: 2 };
    const userLevel = hierarchy[userRole] ?? 0;
    const reqLevel = hierarchy[requiredRole] ?? 1;
    return userLevel >= reqLevel;
  }

  // --------------------------------------------------------------------------
  // FR-02: Quản lý hồ sơ cá nhân & Bảo mật
  // --------------------------------------------------------------------------
  updateProfile(userId, { fullName, cohort, avatarUrl }) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('Người dùng không tồn tại.');
    if (cohort) {
      if (!/^K(4[8-9]|5[0-2])$/.test(cohort)) {
        throw new Error('Khóa học không hợp lệ. Phải nằm trong phạm vi từ K48 đến K52.');
      }
      user.cohort = cohort;
    }
    if (fullName) {
      if (fullName.trim().length < 2) throw new Error('Họ tên quá ngắn.');
      user.fullName = fullName.trim();
    }
    if (avatarUrl) {
      user.avatarUrl = avatarUrl;
    }
    return user;
  }

  changePassword(userId, { oldPassword, newPassword, confirmPassword }) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('Người dùng không tồn tại.');
    const oldHash = sha256(oldPassword);
    let oldMatched = false;
    if (user.passwordHash === oldHash) {
      oldMatched = true;
    } else if (user.passwordHash.startsWith('$2a$10$')) {
      if (user.role === 'ADMIN' && oldPassword === 'Admin123@') {
        oldMatched = true;
      } else if (user.role === 'STUDENT' && oldPassword === 'Student123@') {
        oldMatched = true;
      }
    }
    if (!oldMatched) {
      throw new Error('Mật khẩu hiện tại không chính xác.');
    }
    if (newPassword === oldPassword) {
      throw new Error('Mật khẩu mới không được trùng với mật khẩu cũ.');
    }
    if (newPassword !== confirmPassword) {
      throw new Error('Xác nhận mật khẩu mới không khớp.');
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new Error('Mật khẩu mới không đủ độ phức tạp an toàn.');
    }
    user.passwordHash = sha256(newPassword);
    return { success: true };
  }

  getNotifications(userId) {
    return this.notifications.filter((n) => n.userId === userId);
  }

  markNotificationRead(userId, notifId) {
    const notif = this.notifications.find((n) => n.id === notifId && n.userId === userId);
    if (!notif) throw new Error('Không tìm thấy thông báo.');
    notif.isRead = true;
    return notif;
  }

  // --------------------------------------------------------------------------
  // FR-03: Cấu trúc danh mục học thuật Sư phạm Tin
  // --------------------------------------------------------------------------
  getKnowledgeBlocks() {
    return ['Đại cương', 'Cơ sở ngành', 'Chuyên ngành', 'Nghiệp vụ Sư phạm'];
  }

  getSemesters() {
    return ['Học kỳ 1', 'Học kỳ 2', 'Học kỳ 3', 'Học kỳ 4', 'Học kỳ 5', 'Học kỳ 6'];
  }

  getCourses({ knowledgeBlock, semester, isActive } = {}) {
    return this.courses.filter((c) => {
      if (knowledgeBlock && c.knowledgeBlock !== knowledgeBlock) return false;
      if (semester && c.semester !== semester) return false;
      if (typeof isActive === 'boolean' && c.isActive !== isActive) return false;
      return true;
    });
  }

  // --------------------------------------------------------------------------
  // FR-04: Tra cứu & Bộ lọc tài liệu đa tiêu chí
  // --------------------------------------------------------------------------
  searchDocuments({ query, courseCode, knowledgeBlock, semester, docType, format, page = 1, limit = 12 }) {
    let items = this.documents.filter((d) => d.status === 'APPROVED');

    if (query) {
      const qNorm = unaccent(query);
      items = items.filter((d) => {
        const titleNorm = unaccent(d.title);
        const descNorm = unaccent(d.description || '');
        const courseNorm = unaccent(d.courseName || '');
        const uploaderNorm = unaccent(d.uploaderName || '');
        return (
          titleNorm.includes(qNorm) ||
          descNorm.includes(qNorm) ||
          courseNorm.includes(qNorm) ||
          uploaderNorm.includes(qNorm)
        );
      });
    }

    if (courseCode) {
      items = items.filter((d) => d.courseCode === courseCode);
    }
    if (knowledgeBlock) {
      items = items.filter((d) => d.knowledgeBlock === knowledgeBlock);
    }
    if (semester) {
      items = items.filter((d) => d.semester === semester);
    }
    if (docType) {
      items = items.filter((d) => d.docType === docType);
    }
    if (format) {
      items = items.filter((d) => d.format.toLowerCase() === format.toLowerCase());
    }

    const total = items.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);

    return {
      total,
      totalPages,
      page,
      limit,
      items: paginatedItems
    };
  }

  // --------------------------------------------------------------------------
  // FR-05: Xem chi tiết & Reader trực tuyến
  // --------------------------------------------------------------------------
  getDocumentDetail(docId, userRole = 'GUEST') {
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) throw new Error('Tài liệu không tồn tại (Lỗi 404).');
    if (doc.status !== 'APPROVED' && userRole !== 'ADMIN') {
      throw new Error('Tài liệu chưa được phê duyệt công khai (Lỗi 403).');
    }
    doc.viewCount++;
    return doc;
  }

  getReaderPage(docId, pageNumber, userRole = 'GUEST') {
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) throw new Error('Tài liệu không tồn tại.');
    if (pageNumber < 1) throw new Error('Số trang không hợp lệ.');
    if (userRole === 'GUEST' && pageNumber > 3) {
      return {
        locked: true,
        pageNumber,
        message: 'Khách vãng lai chỉ được đọc thử 3 trang đầu. Vui lòng đăng nhập tài khoản Sinh viên để mở khóa toàn văn.'
      };
    }
    return {
      locked: false,
      pageNumber,
      content: `Nội dung hiển thị trang ${pageNumber} của tài liệu "${doc.title}"`
    };
  }

  generateViewerUrl(doc) {
    if (doc.format === 'pdf') {
      return `/reader/pdf/${doc.id}`;
    }
    return `https://docs.google.com/viewer?url=${encodeURIComponent(doc.fileUrl)}&embedded=true`;
  }

  generateShareLink(docId) {
    return `https://5share.io.vn/documents/${docId}`;
  }

  // --------------------------------------------------------------------------
  // FR-06: 4 Tầng Phòng thủ Upload
  // --------------------------------------------------------------------------
  verifyAndUploadDocument({ file, metadata, uploaderId }) {
    const user = this.users.find((u) => u.id === uploaderId);
    if (!user) throw new Error('Người tải lên không hợp lệ.');
    if (!user.isActive) throw new Error('Tài khoản đã bị khóa, không thể tải lên học liệu.');

    if (!file) {
      return { isValid: false, stageFailed: 'FILE_MISSING', message: 'Vui lòng chọn tệp tin.' };
    }

    const fileName = file.name || 'document.pdf';
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const allowedExts = ['pdf', 'docx', 'pptx'];

    // Tầng 1: Đuôi tệp và dung lượng (0 < size <= 25MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (!allowedExts.includes(ext)) {
      return { isValid: false, stageFailed: 'EXTENSION', message: 'Chỉ chấp nhận tệp .pdf, .docx, .pptx.' };
    }
    if (file.size <= 0) {
      return { isValid: false, stageFailed: 'EMPTY_FILE', message: 'Tệp rỗng 0 byte.' };
    }
    if (file.size > MAX_SIZE) {
      return { isValid: false, stageFailed: 'SIZE_LIMIT', message: 'Dung lượng tệp vượt quá 25MB.' };
    }

    // Tầng 2: Binary Magic Bytes
    let buffer = file.buffer;
    if (!buffer && typeof file.arrayBuffer === 'function') {
      buffer = Buffer.from(file.rawBytes || []);
    }
    if (buffer) {
      if (ext === 'pdf') {
        const isPdfMagic = buffer.slice(0, 5).toString('ascii') === '%PDF-';
        if (!isPdfMagic) {
          return { isValid: false, stageFailed: 'MAGIC_BYTES', message: 'Chữ ký nhị phân không khớp %PDF-.' };
        }
      } else if (ext === 'docx' || ext === 'pptx') {
        const isZipMagic = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
        if (!isZipMagic) {
          return { isValid: false, stageFailed: 'MAGIC_BYTES', message: 'Chữ ký nhị phân không khớp PK.. của Office XML.' };
        }
      }
    }

    // Tầng 3: SHA-256 Deduplication
    const fileHash = file.presetHash || (buffer ? sha256(buffer) : sha256(`${fileName}:${file.size}`));
    const duplicate = this.documents.find((d) => d.fileHash.toLowerCase() === fileHash.toLowerCase());
    if (duplicate) {
      return {
        isValid: false,
        stageFailed: 'DUPLICATE_HASH',
        duplicateDoc: duplicate,
        message: `Tài liệu đã tồn tại trong hệ thống (trùng mã băm với "${duplicate.title}").`
      };
    }

    // Tầng 4: Metadata & Chuyển vào hàng đợi PENDING
    if (!metadata || !metadata.title || metadata.title.trim().length < 10) {
      return { isValid: false, stageFailed: 'METADATA', message: 'Tiêu đề tài liệu phải có tối thiểu 10 ký tự.' };
    }

    const course = this.courses.find((c) => c.code === metadata.courseCode);
    if (!course) {
      return { isValid: false, stageFailed: 'METADATA', message: 'Mã học phần không tồn tại trong danh mục CTĐT.' };
    }

    const newDoc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: metadata.title.trim(),
      courseCode: course.code,
      courseName: course.name,
      knowledgeBlock: course.knowledgeBlock,
      semester: course.semester,
      docType: metadata.docType || 'KHBD Công văn 5512',
      format: ext,
      description: metadata.description || '',
      uploaderId: user.id,
      uploaderName: user.fullName,
      createdAt: new Date().toISOString(),
      fileSizeMb: Number((file.size / (1024 * 1024)).toFixed(2)),
      pageCount: metadata.pageCount || 10,
      fileName,
      fileUrl: `https://res.cloudinary.com/share5/raw/upload/${fileName}`,
      fileHash,
      status: 'PENDING',
      rejectReason: null,
      viewCount: 0,
      downloadCount: 0,
      ratingAvg: 0,
      ratingCount: 0,
      comments: []
    };

    this.documents.push(newDoc);
    course.documentCount++;

    return {
      isValid: true,
      stageFailed: null,
      document: newDoc
    };
  }

  // --------------------------------------------------------------------------
  // FR-07: Hàng đợi kiểm duyệt 8 tiêu chí (Admin Moderation)
  // --------------------------------------------------------------------------
  getPendingModerationQueue(adminRole) {
    if (adminRole !== 'ADMIN') throw new Error('Không có quyền Quản trị viên (Lỗi 403).');
    return this.documents.filter((d) => d.status === 'PENDING');
  }

  moderateDocument(adminRole, docId, action, { criteriaChecklist = {}, rejectReason = '' } = {}) {
    if (adminRole !== 'ADMIN') throw new Error('Không có quyền Quản trị viên (Lỗi 403).');
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) throw new Error('Tài liệu không tồn tại.');
    if (doc.status !== 'PENDING') throw new Error('Tài liệu không nằm trong hàng đợi chờ duyệt.');

    if (action === 'APPROVE') {
      // Bắt buộc 6 tiêu chí kỹ thuật & học thuật cốt lõi (TC01-TC06)
      const required = ['tc01', 'tc02', 'tc03', 'tc04', 'tc05', 'tc06'];
      for (const tc of required) {
        if (!criteriaChecklist[tc]) {
          throw new Error(`Chưa đạt tiêu chí bắt buộc ${tc.toUpperCase()}. Không thể phê duyệt.`);
        }
      }
      doc.status = 'APPROVED';
      doc.rejectReason = null;

      // Cộng +20 điểm thưởng cho tác giả
      const author = this.users.find((u) => u.id === doc.uploaderId);
      if (author) {
        author.points += 20;
        this.notifications.push({
          id: `notif-${Date.now()}`,
          userId: author.id,
          title: 'Học liệu được phê duyệt (+20 điểm)',
          message: `Tài liệu "${doc.title}" của bạn đã được Admin phê duyệt công khai! Bạn nhận được +20 điểm thưởng.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
      return { success: true, status: 'APPROVED', pointsAwarded: 20 };
    } else if (action === 'REJECT') {
      if (!rejectReason || rejectReason.trim().length < 10) {
        throw new Error('Lý do từ chối phải có tối thiểu 10 ký tự rõ ràng.');
      }
      doc.status = 'REJECTED';
      doc.rejectReason = rejectReason.trim();

      const author = this.users.find((u) => u.id === doc.uploaderId);
      if (author) {
        this.notifications.push({
          id: `notif-${Date.now()}`,
          userId: author.id,
          title: 'Học liệu bị từ chối phê duyệt',
          message: `Tài liệu "${doc.title}" bị từ chối: ${rejectReason}`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
      return { success: true, status: 'REJECTED', reason: rejectReason };
    } else {
      throw new Error('Hành động kiểm duyệt không hợp lệ.');
    }
  }

  // --------------------------------------------------------------------------
  // FR-08: Quản trị Danh mục & Quản lý Người dùng
  // --------------------------------------------------------------------------
  createCourse(adminRole, courseData) {
    if (adminRole !== 'ADMIN') throw new Error('Chỉ Admin mới có quyền thêm môn học.');
    if (!courseData.code || !courseData.name) throw new Error('Mã và tên môn học là bắt buộc.');
    if (this.courses.find((c) => c.code === courseData.code)) {
      throw new Error('Mã môn học đã tồn tại.');
    }
    if (courseData.credits <= 0) {
      throw new Error('Số tín chỉ phải lớn hơn 0.');
    }
    const newCourse = {
      id: `crs-${Date.now()}`,
      code: courseData.code,
      name: courseData.name,
      credits: courseData.credits,
      knowledgeBlock: courseData.knowledgeBlock || 'Cơ sở ngành',
      semester: courseData.semester || 'Học kỳ 1',
      documentCount: 0,
      isActive: true
    };
    this.courses.push(newCourse);
    return newCourse;
  }

  deleteCourse(adminRole, courseCode) {
    if (adminRole !== 'ADMIN') throw new Error('Chỉ Admin mới có quyền xóa môn học.');
    const courseIndex = this.courses.findIndex((c) => c.code === courseCode);
    if (courseIndex === -1) throw new Error('Môn học không tồn tại.');

    const linkedDocs = this.documents.filter((d) => d.courseCode === courseCode);
    if (linkedDocs.length > 0) {
      throw new Error(`Ràng buộc toàn vẹn CSDL (Khóa ngoại): Không thể xóa môn học "${courseCode}" vì đang có ${linkedDocs.length} tài liệu liên kết.`);
    }

    const deleted = this.courses.splice(courseIndex, 1)[0];
    return deleted;
  }

  listUsers(adminRole, searchQuery = '') {
    if (adminRole !== 'ADMIN') throw new Error('Chỉ Admin mới có quyền xem danh sách người dùng.');
    if (!searchQuery) return this.users;
    const qNorm = unaccent(searchQuery);
    return this.users.filter(
      (u) => unaccent(u.fullName).includes(qNorm) || unaccent(u.email).includes(qNorm)
    );
  }

  toggleUserLock(adminRole, userId) {
    if (adminRole !== 'ADMIN') throw new Error('Chỉ Admin mới có quyền khóa tài khoản.');
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('Người dùng không tồn tại.');
    user.isActive = !user.isActive;
    return user;
  }

  // --------------------------------------------------------------------------
  // FR-09: Tủ sách cá nhân & Trạng thái Đóng góp
  // --------------------------------------------------------------------------
  toggleBookmark(userId, docId) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('Người dùng không tồn tại.');
    const index = this.bookmarks.findIndex((b) => b.userId === userId && b.docId === docId);
    if (index >= 0) {
      this.bookmarks.splice(index, 1);
      return { isBookmarked: false };
    } else {
      this.bookmarks.push({ userId, docId });
      return { isBookmarked: true };
    }
  }

  getUserBookmarks(userId) {
    const docIds = this.bookmarks.filter((b) => b.userId === userId).map((b) => b.docId);
    return this.documents.filter((d) => docIds.includes(d.id));
  }

  getUserContributions(userId, statusFilter = null) {
    return this.documents.filter((d) => {
      if (d.uploaderId !== userId) return false;
      if (statusFilter && d.status !== statusFilter) return false;
      return true;
    });
  }

  // --------------------------------------------------------------------------
  // FR-10: Đánh giá chất lượng & Bình luận trao đổi
  // --------------------------------------------------------------------------
  rateDocument(userId, docId, stars) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('Người dùng không tồn tại.');
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      throw new Error('Số sao đánh giá phải là số nguyên từ 1 đến 5.');
    }
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) throw new Error('Tài liệu không tồn tại.');

    const existingIndex = this.ratings.findIndex((r) => r.userId === userId && r.docId === docId);
    if (existingIndex >= 0) {
      this.ratings[existingIndex].stars = stars;
    } else {
      this.ratings.push({ userId, docId, stars });
    }

    const docRatings = this.ratings.filter((r) => r.docId === docId);
    const sum = docRatings.reduce((acc, cur) => acc + cur.stars, 0);
    doc.ratingAvg = Number((sum / docRatings.length).toFixed(1));
    doc.ratingCount = docRatings.length;

    return { ratingAvg: doc.ratingAvg, ratingCount: doc.ratingCount };
  }

  addComment(userId, docId, content) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('Người dùng không tồn tại.');
    if (!user.isActive) throw new Error('Tài khoản bị khóa không thể bình luận.');
    if (!content || content.trim().length === 0) {
      throw new Error('Nội dung bình luận không được để trống.');
    }
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) throw new Error('Tài liệu không tồn tại.');

    const newComment = {
      id: `cmt-${Date.now()}`,
      authorId: user.id,
      authorName: user.fullName,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };
    doc.comments.unshift(newComment);
    return newComment;
  }

  deleteComment(userId, userRole, docId, commentId) {
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) throw new Error('Tài liệu không tồn tại.');
    const cmtIndex = doc.comments.findIndex((c) => c.id === commentId);
    if (cmtIndex === -1) throw new Error('Bình luận không tồn tại.');

    const comment = doc.comments[cmtIndex];
    if (userRole !== 'ADMIN' && comment.authorId !== userId) {
      throw new Error('Không có quyền xóa bình luận của người khác (Lỗi 403 Forbidden).');
    }

    const deleted = doc.comments.splice(cmtIndex, 1)[0];
    return deleted;
  }

  // --------------------------------------------------------------------------
  // FR-11: Báo cáo vi phạm & Hòm thư góp ý
  // --------------------------------------------------------------------------
  reportDocument(reporterId, { docId, reasonGroup, details }) {
    const user = this.users.find((u) => u.id === reporterId);
    if (!user) throw new Error('Người báo cáo không hợp lệ.');
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) throw new Error('Tài liệu bị báo cáo không tồn tại.');
    if (!VALID_REPORT_REASONS.includes(reasonGroup)) {
      throw new Error('Nhóm lý do báo cáo không thuộc danh mục quy định.');
    }
    if (!details || details.trim().length < 10) {
      throw new Error('Chi tiết báo cáo phải có tối thiểu 10 ký tự.');
    }

    const newReport = {
      id: `rep-${Date.now()}`,
      docId,
      docTitle: doc.title,
      reporterId: user.id,
      reasonGroup,
      details: details.trim(),
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    this.reports.push(newReport);
    return newReport;
  }

  submitFeedback({ fullName, email, category, message }) {
    if (!message || message.trim().length < 10) {
      throw new Error('Nội dung góp ý phải có tối thiểu 10 ký tự.');
    }
    const feedback = {
      id: `fb-${Date.now()}`,
      fullName: fullName || 'Khách vãng lai',
      email: email || 'anonymous@5share.io.vn',
      category: category || 'Góp ý chung',
      message: message.trim(),
      createdAt: new Date().toISOString()
    };
    this.feedbackList.push(feedback);
    return feedback;
  }

  resolveReport(adminRole, reportId, action) {
    if (adminRole !== 'ADMIN') throw new Error('Chỉ Admin mới có quyền xử lý báo cáo.');
    const report = this.reports.find((r) => r.id === reportId);
    if (!report) throw new Error('Báo cáo không tồn tại.');

    if (action === 'HIDE_DOC') {
      const doc = this.documents.find((d) => d.id === report.docId);
      if (doc) {
        doc.status = 'REJECTED';
        doc.rejectReason = `Bị gỡ bỏ do vi phạm: ${report.reasonGroup} (${report.details})`;
      }
      report.status = 'RESOLVED';
      return { action: 'HIDE_DOC', report };
    } else if (action === 'DISMISS') {
      report.status = 'DISMISSED';
      return { action: 'DISMISS', report };
    } else {
      throw new Error('Hành động xử lý báo cáo không hợp lệ.');
    }
  }

  // --------------------------------------------------------------------------
  // FR-12: Điểm tích lũy, Treo thưởng (Study Bounty) & Leaderboard
  // --------------------------------------------------------------------------
  createBounty(creatorId, { title, courseCode, rewardPoints, description = '' }) {
    const creator = this.users.find((u) => u.id === creatorId);
    if (!creator) throw new Error('Người tạo không tồn tại.');
    if (!creator.isActive) throw new Error('Tài khoản bị khóa không thể tạo yêu cầu treo thưởng.');
    if (!title || title.trim().length < 10) {
      throw new Error('Tiêu đề yêu cầu tài liệu phải có tối thiểu 10 ký tự.');
    }
    if (!Number.isInteger(rewardPoints) || rewardPoints <= 0) {
      throw new Error('Điểm thưởng treo phải là số nguyên dương lớn hơn 0.');
    }
    if (creator.points < rewardPoints) {
      throw new Error(`Số dư ví điểm (${creator.points} điểm) không đủ để treo thưởng ${rewardPoints} điểm.`);
    }

    // Trừ điểm tạm giữ (Escrow)
    creator.points -= rewardPoints;

    const newBounty = {
      id: `bounty-${Date.now()}`,
      title: title.trim(),
      courseCode,
      creatorId: creator.id,
      creatorName: creator.fullName,
      rewardPoints,
      description,
      status: 'OPEN',
      fulfilledDocId: null,
      createdAt: new Date().toISOString()
    };
    this.bounties.push(newBounty);
    return newBounty;
  }

  fulfillBounty(submitterId, bountyId, submittedDocId) {
    const submitter = this.users.find((u) => u.id === submitterId);
    if (!submitter) throw new Error('Người nộp không tồn tại.');
    const bounty = this.bounties.find((b) => b.id === bountyId);
    if (!bounty) throw new Error('Yêu cầu treo thưởng không tồn tại.');
    if (bounty.status !== 'OPEN') throw new Error('Yêu cầu treo thưởng đã được giải quyết hoặc đã đóng.');
    if (bounty.creatorId === submitterId) {
      throw new Error('Không thể tự giải thưởng cho yêu cầu do chính mình tạo.');
    }
    const doc = this.documents.find((d) => d.id === submittedDocId);
    if (!doc) throw new Error('Tài liệu giải thưởng không tồn tại.');

    bounty.status = 'FULFILLED';
    bounty.fulfilledDocId = submittedDocId;
    submitter.points += bounty.rewardPoints;

    this.notifications.push({
      id: `notif-${Date.now()}`,
      userId: submitter.id,
      title: 'Nhận điểm treo thưởng tài liệu',
      message: `Bạn nhận được +${bounty.rewardPoints} điểm từ việc giải thưởng yêu cầu "${bounty.title}".`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return { success: true, bounty, pointsAwarded: bounty.rewardPoints };
  }

  getTop10Leaderboard() {
    return [...this.users]
      .filter((u) => u.role !== 'ADMIN') // Vinh danh sinh viên
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
  }

  // --------------------------------------------------------------------------
  // FR-13: Quản lý lượt tải & Dashboard Quản trị
  // --------------------------------------------------------------------------
  downloadDocument(docId, userRole = 'GUEST', clientIp = '127.0.0.1') {
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) throw new Error('Tài liệu không tồn tại (Lỗi 404).');

    if (userRole === 'GUEST') {
      const now = Date.now();
      const oneDayAgo = now - 24 * 3600 * 1000;
      let logs = this.guestDownloadLogs.get(clientIp) || [];
      // Lọc các lượt tải trong 24h gần nhất
      logs = logs.filter((t) => t > oneDayAgo);

      if (logs.length >= 3) {
        throw new Error('Khách vãng lai đã đạt giới hạn 3 lượt tải/ngày. Vui lòng đăng nhập tài khoản Sinh viên để tải tự do.');
      }
      logs.push(now);
      this.guestDownloadLogs.set(clientIp, logs);
    }

    doc.downloadCount++;
    return {
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      downloadCount: doc.downloadCount
    };
  }

  getAdminAnalytics(adminRole, period = 'all') {
    if (adminRole !== 'ADMIN') throw new Error('Chỉ Admin mới có quyền xem Dashboard thống kê.');
    const approvedDocs = this.documents.filter((d) => d.status === 'APPROVED').length;
    const pendingDocs = this.documents.filter((d) => d.status === 'PENDING').length;
    const totalViews = this.documents.reduce((acc, d) => acc + d.viewCount, 0);
    const totalDownloads = this.documents.reduce((acc, d) => acc + d.downloadCount, 0);

    // Tính phân bố môn học
    const courseDistMap = {};
    for (const d of this.documents) {
      if (d.status === 'APPROVED') {
        courseDistMap[d.courseCode] = (courseDistMap[d.courseCode] || 0) + 1;
      }
    }
    const courseDistribution = Object.entries(courseDistMap).map(([code, count]) => {
      const course = this.courses.find((c) => c.code === code);
      const percent = approvedDocs > 0 ? Math.round((count / approvedDocs) * 100) : 0;
      return { code, name: course ? course.name : code, count, percent };
    });

    return {
      period,
      approvedDocs,
      pendingDocs,
      totalViews,
      totalDownloads,
      courseDistribution
    };
  }
}

module.exports = {
  SystemState,
  unaccent
};
