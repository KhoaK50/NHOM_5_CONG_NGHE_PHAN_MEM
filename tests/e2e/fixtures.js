/**
 * ============================================================================
 * FIXTURES VÀ DỮ LIỆU KIỂM THỬ CHUẨN CHO BỘ E2E TEST RUNNER
 * Dự án: 5Share - Nền tảng chia sẻ học liệu Sư phạm Tin học (HCMUE)
 * ============================================================================
 */

const crypto = require('crypto');

// 1. Chữ ký nhị phân Magic Bytes
const PDF_MAGIC_BYTES = Buffer.from('%PDF-1.7'); // %PDF-1.7 (25 50 44 46 2d 31 2e 37)
const ZIP_MAGIC_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04]);                     // PK\x03\x04 (DOCX & PPTX)
const EXE_MAGIC_BYTES = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);                     // MZ\x90\x00 (PE Windows Executable)
const ELF_MAGIC_BYTES = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);                     // \x7FELF (Linux Executable)

/**
 * Tạo buffer mô phỏng tệp tin nhị phân
 */
function createMockFileBuffer(magicBytes, length = 1024, fillChar = 0x20) {
  const buf = Buffer.alloc(length, fillChar);
  magicBytes.copy(buf, 0);
  return buf;
}

/**
 * Tính mã băm SHA-256 từ Buffer hoặc Chuỗi
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// 2. Mẫu người dùng khởi tạo (Seed Users)
const SEED_USERS = [
  {
    id: 'user-khoa',
    email: 'admin.khoacntt@hcmue.edu.vn',
    passwordHash: '$2a$10$eO1vV6L5Z5vQx8o7vO1vVeO1vV6L5Z5vQx8o7vO1vVeO1vV6L5Z5v', // admin123@A
    fullName: 'Nguyễn Trần Đăng Khoa',
    role: 'ADMIN',
    cohort: 'K48',
    points: 500,
    isActive: true,
    avatarUrl: '/avatars/khoa.png',
    createdAt: '2026-01-10T08:00:00Z'
  },
  {
    id: 'user-tram',
    email: 'tram.lenguyen.k50@hcmue.edu.vn',
    passwordHash: '$2a$10$wE1vV6L5Z5vQx8o7vO1vVwE1vV6L5Z5vQx8o7vO1vVwE1vV6L5Z5v', // student123@A
    fullName: 'Lê Nguyễn Thùy Trâm',
    role: 'STUDENT',
    cohort: 'K50',
    points: 120,
    isActive: true,
    avatarUrl: '/avatars/tram.png',
    createdAt: '2026-02-15T09:30:00Z'
  },
  {
    id: 'user-vi',
    email: 'vi.phantrieu.k50@hcmue.edu.vn',
    passwordHash: '$2a$10$yE1vV6L5Z5vQx8o7vO1vVyE1vV6L5Z5vQx8o7vO1vVyE1vV6L5Z5v', // student123@A
    fullName: 'Phan Triệu Vĩ',
    role: 'STUDENT',
    cohort: 'K50',
    points: 140,
    isActive: true,
    avatarUrl: '/avatars/vi.png',
    createdAt: '2026-02-20T10:15:00Z'
  },
  {
    id: 'user-dat',
    email: 'dat.tranduc.k50@hcmue.edu.vn',
    passwordHash: '$2a$10$zE1vV6L5Z5vQx8o7vO1vVzE1vV6L5Z5vQx8o7vO1vVzE1vV6L5Z5v', // student123@A
    fullName: 'Trần Đức Đạt',
    role: 'STUDENT',
    cohort: 'K50',
    points: 160,
    isActive: true,
    avatarUrl: '/avatars/dat.png',
    createdAt: '2026-02-22T14:20:00Z'
  },
  {
    id: 'user-danh',
    email: 'danh.nguyenhoang.k50@hcmue.edu.vn',
    passwordHash: '$2a$10$aE1vV6L5Z5vQx8o7vO1vVaE1vV6L5Z5vQx8o7vO1vVaE1vV6L5Z5v', // student123@A
    fullName: 'Nguyễn Hoàng Danh',
    role: 'STUDENT',
    cohort: 'K50',
    points: 90,
    isActive: true,
    avatarUrl: '/avatars/danh.png',
    createdAt: '2026-02-25T11:00:00Z'
  },
  {
    id: 'user-locked',
    email: 'spammer.badactor@hcmue.edu.vn',
    passwordHash: '$2a$10$bE1vV6L5Z5vQx8o7vO1vVbE1vV6L5Z5vQx8o7vO1vVbE1vV6L5Z5v', // badactor123@A
    fullName: 'Tài Khoản Đã Khóa',
    role: 'STUDENT',
    cohort: 'K49',
    points: 0,
    isActive: false,
    avatarUrl: '/avatars/default.png',
    createdAt: '2026-03-01T15:00:00Z'
  }
];

// 3. Môn học chuẩn Khung CTĐT Sư phạm Tin học - HCMUE
const SEED_COURSES = [
  {
    id: 'crs-1',
    code: 'COMP1044',
    name: 'Phương pháp dạy học môn Tin học',
    credits: 3,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    semester: 'Học kỳ 5',
    documentCount: 4,
    isActive: true
  },
  {
    id: 'crs-2',
    code: 'COMP1015',
    name: 'Mạng máy tính',
    credits: 3,
    knowledgeBlock: 'Cơ sở ngành',
    semester: 'Học kỳ 3',
    documentCount: 2,
    isActive: true
  },
  {
    id: 'crs-3',
    code: 'COMP1022',
    name: 'Lập trình Web và Ứng dụng',
    credits: 3,
    knowledgeBlock: 'Chuyên ngành',
    semester: 'Học kỳ 4',
    documentCount: 2,
    isActive: true
  },
  {
    id: 'crs-4',
    code: 'COMP1001',
    name: 'Cơ sở lập trình',
    credits: 4,
    knowledgeBlock: 'Cơ sở ngành',
    semester: 'Học kỳ 1',
    documentCount: 2,
    isActive: true
  },
  {
    id: 'crs-5',
    code: 'COMP1031',
    name: 'Cơ sở dữ liệu',
    credits: 3,
    knowledgeBlock: 'Cơ sở ngành',
    semester: 'Học kỳ 3',
    documentCount: 2,
    isActive: true
  },
  {
    id: 'crs-6',
    code: 'COMP1058',
    name: 'Thiết kế bài giảng điện tử e-Learning',
    credits: 2,
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    semester: 'Học kỳ 6',
    documentCount: 0,
    isActive: true
  },
  {
    id: 'crs-7',
    code: 'POLI1001',
    name: 'Pháp luật đại cương & Đạo đức số',
    credits: 2,
    knowledgeBlock: 'Đại cương',
    semester: 'Học kỳ 1',
    documentCount: 1,
    isActive: false
  }
];

// 4. Mẫu học liệu khởi tạo
const SEED_DOCUMENTS = [
  {
    id: 'doc-1',
    title: 'Kế hoạch bài dạy Tin học 10 - Bài 12: Xâu ký tự trong Python (Chuẩn 4 hoạt động Công văn 5512)',
    courseCode: 'COMP1044',
    courseName: 'Phương pháp dạy học môn Tin học',
    knowledgeBlock: 'Nghiệp vụ Sư phạm',
    semester: 'Học kỳ 5',
    docType: 'KHBD Công văn 5512',
    format: 'pdf',
    description: 'Giáo án mẫu biên soạn đầy đủ 4 hoạt động theo Công văn 5512/BGDĐT-GDTrH tích hợp bảng Rubric đánh giá năng lực Tin học NLa, NLc.',
    uploaderId: 'user-tram',
    uploaderName: 'Lê Nguyễn Thùy Trâm',
    createdAt: '2026-03-12T08:00:00Z',
    fileSizeMb: 2.42,
    pageCount: 18,
    fileName: 'KHBD_TinHoc10_Bai12_XauKyTu_CV5512.pdf',
    fileUrl: 'https://res.cloudinary.com/share5/raw/upload/v1/KHBD_TinHoc10_CV5512.pdf',
    fileHash: 'a94f8b2c71e09d34f5a811c63e9204d78b1a9f2304c812e3d90f12a4b6c8e019',
    status: 'APPROVED',
    rejectReason: null,
    viewCount: 412,
    downloadCount: 186,
    ratingAvg: 4.9,
    ratingCount: 28,
    comments: [
      {
        id: 'cmt-1',
        authorId: 'user-dat',
        authorName: 'Trần Đức Đạt (K50 SPTH)',
        rating: 5,
        content: 'Giáo án phân bổ thời lượng 4 hoạt động rất hợp lý cho tiết thực hành 45 phút.',
        createdAt: '2026-03-14T09:30:00Z'
      }
    ]
  },
  {
    id: 'doc-2',
    title: 'Đề thi kết thúc học phần Mạng máy tính COMP1015 (Kèm đáp án chi tiết chia Subnet VLSM)',
    courseCode: 'COMP1015',
    courseName: 'Mạng máy tính',
    knowledgeBlock: 'Cơ sở ngành',
    semester: 'Học kỳ 3',
    docType: 'Đề thi & Đáp án',
    format: 'pdf',
    description: 'Tổng hợp bộ đề thi chính thức học phần Mạng máy tính các khóa K48 K49 Khoa CNTT HCMUE có lời giải từng bước chia mạng con VLSM.',
    uploaderId: 'user-vi',
    uploaderName: 'Phan Triệu Vĩ',
    createdAt: '2026-03-10T10:00:00Z',
    fileSizeMb: 3.15,
    pageCount: 14,
    fileName: 'DeThi_DapAn_MangMayTinh_COMP1015_HCMUE.pdf',
    fileUrl: 'https://res.cloudinary.com/share5/raw/upload/v1/DeThi_MangMayTinh_COMP1015.pdf',
    fileHash: 'b72c19d4e81203f9a1b642c850d1e7f391a8c204e6b5d8f012a34c56e7890abc',
    status: 'APPROVED',
    rejectReason: null,
    viewCount: 530,
    downloadCount: 245,
    ratingAvg: 4.8,
    ratingCount: 35,
    comments: []
  },
  {
    id: 'doc-3',
    title: 'Slide Chuyên đề Kiến trúc 3 tầng RESTful API với Node.js, Express và PostgreSQL',
    courseCode: 'COMP1022',
    courseName: 'Lập trình Web và Ứng dụng',
    knowledgeBlock: 'Chuyên ngành',
    semester: 'Học kỳ 4',
    docType: 'Slide bài giảng',
    format: 'pptx',
    description: 'Slide chuyên đề thực hành môn Lập trình Web và Ứng dụng COMP1022 thiết kế phân tầng Controllers Services Data Access.',
    uploaderId: 'user-khoa',
    uploaderName: 'Nguyễn Trần Đăng Khoa',
    createdAt: '2026-03-08T11:00:00Z',
    fileSizeMb: 4.6,
    pageCount: 32,
    fileName: 'Slide_KienTruc3Tang_RESTful_API_COMP1022.pptx',
    fileUrl: 'https://res.cloudinary.com/share5/raw/upload/v1/Slide_KienTruc3Tang.pptx',
    fileHash: 'c45e81a2d90b34f781c2e6a901d5b3e7f4a210c9d8b7e6f5a4123c09d8e7f601',
    status: 'APPROVED',
    rejectReason: null,
    viewCount: 298,
    downloadCount: 134,
    ratingAvg: 4.7,
    ratingCount: 19,
    comments: []
  },
  {
    id: 'doc-8',
    title: 'Kế hoạch bài dạy Tin học 12 - Chủ đề Trí tuệ nhân tạo & Đạo đức AI trong Giáo dục (CV 5512)',
    courseCode: 'COMP1044',
    courseName: 'Phương pháp dạy học môn Tin học',
    knowledgeBlock: 'Nghiệp vụ Svr phạm',
    semester: 'Học kỳ 5',
    docType: 'KHBD Công văn 5512',
    format: 'pdf',
    description: 'Kế hoạch bài dạy chương trình Tin học 12 mới: Tổ chức hoạt động tranh biện học thuật về liêm chính học thuật khi sử dụng AI tạo sinh.',
    uploaderId: 'user-vi',
    uploaderName: 'Phan Triệu Vĩ',
    createdAt: '2026-03-18T14:00:00Z',
    fileSizeMb: 3.18,
    pageCount: 20,
    fileName: 'KHBD_TinHoc12_TriTueNhanTao_CV5512.pdf',
    fileUrl: 'https://res.cloudinary.com/share5/raw/upload/v1/KHBD_TinHoc12_AI.pdf',
    fileHash: '99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa',
    status: 'PENDING',
    rejectReason: null,
    viewCount: 0,
    downloadCount: 0,
    ratingAvg: 0,
    ratingCount: 0,
    comments: []
  },
  {
    id: 'doc-10',
    title: 'Đề cương ôn tập Kiến trúc máy tính & Hợp ngữ MIPS (Bản chụp nháp)',
    courseCode: 'COMP1001',
    courseName: 'Cơ sở lập trình',
    knowledgeBlock: 'Cơ sở ngành',
    semester: 'Học kỳ 1',
    docType: 'Đề cương & Bài tập',
    format: 'pdf',
    description: 'Tài liệu tổng hợp tập lệnh thanh ghi MIPS cơ bản.',
    uploaderId: 'user-vi',
    uploaderName: 'Phan Triệu Vĩ',
    createdAt: '2026-03-14T09:00:00Z',
    fileSizeMb: 6.8,
    pageCount: 9,
    fileName: 'DeCuong_KienTrucMayTinh_BanNhap.pdf',
    fileUrl: 'https://res.cloudinary.com/share5/raw/upload/v1/DeCuong_BanNhap.pdf',
    fileHash: '5544332211009988776655443322110099887766554433221100998877665544',
    status: 'REJECTED',
    rejectReason: 'Vi phạm Tiêu chí số 6 & số 8: Gắn sai học phần và bản scan trang 6-8 bị mờ nhòe.',
    viewCount: 0,
    downloadCount: 0,
    ratingAvg: 0,
    ratingCount: 0,
    comments: []
  }
];

// 5. Mẫu yêu cầu treo thưởng học liệu (Seed Bounties)
const SEED_BOUNTIES = [
  {
    id: 'bounty-1',
    title: 'Tìm Đề thi chính thức kèm đáp án môn An toàn thông tin COMP1040 K49',
    courseCode: 'COMP1015',
    creatorId: 'user-dat',
    creatorName: 'Trần Đức Đạt',
    rewardPoints: 50,
    status: 'OPEN',
    fulfilledDocId: null,
    createdAt: '2026-03-15T10:00:00Z'
  }
];

// 6. Danh mục lý do báo cáo vi phạm hợp lệ
const VALID_REPORT_REASONS = [
  'Sai kiến thức chuyên môn / Không đúng chuẩn Công văn 5512',
  'Không đúng môn học hoặc sai khối kiến thức CTĐT',
  'Vi phạm bản quyền hoặc đề thi đang trong thời gian bảo mật',
  'Tệp mờ nhòe, thiếu trang hoặc lỗi phông chữ Tiếng Việt'
];

module.exports = {
  PDF_MAGIC_BYTES,
  ZIP_MAGIC_BYTES,
  EXE_MAGIC_BYTES,
  ELF_MAGIC_BYTES,
  createMockFileBuffer,
  sha256,
  SEED_USERS,
  SEED_COURSES,
  SEED_DOCUMENTS,
  SEED_BOUNTIES,
  VALID_REPORT_REASONS
};
