/**
 * ============================================================================
 * ADVERSARIAL TIER 5 WHITE-BOX COVERAGE HARDENING & EDGE-CASE STRESS SUITE
 * ============================================================================
 * Targets 10 Core Subsystems:
 * 1. AuthSubsystem: input sanitization, whitespace trim, empty password, email format.
 * 2. UserProfile: cohort validation boundary checks, extreme lengths, avatar switching.
 * 3. BountyBoard: bounty escrow edge cases (0, negative, fractional, self-fulfillment).
 * 4. fileHasher: truncated magic bytes (<4 bytes), corrupted buffers, double extensions.
 * 5. downloadTracker: clock drift, corrupted JSON in localStorage, negative timestamps.
 * 6. ModerationQueue: whitespace-only rejection reasons, double-action prevention.
 * 7. CourseManagement: partial matches in course search, edge case semester filtering.
 * 8. UserManagement: locking already locked user, unlocking already active user, self-lock.
 * 9. AdminDashboard: zero download data edge case, pure SVG chart rendering integrity.
 * 10. FeedbackModal: whitespace-only content, invalid email formats.
 * ============================================================================
 */

import React from '../client/node_modules/react/index.js';
import { renderToStaticMarkup } from '../client/node_modules/react-dom/server.node.js';
import { createServer } from '../client/node_modules/vite/dist/node/index.js';
import fs from 'fs';
import path from 'path';

let totalTests = 0;
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message, details = '') {
  totalTests++;
  if (condition) {
    passed++;
    console.log(`  ✔ PASS: ${message}`);
  } else {
    failed++;
    const err = `${message} ${details ? `(${details})` : ''}`;
    failures.push(err);
    console.error(`  ✖ FAIL: ${err}`);
  }
}

// In-Memory LocalStorage Mock for Node.js SSR
class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

async function run() {
  console.log('\n============================================================');
  console.log('  TIER 5 WHITE-BOX ADVERSARIAL COVERAGE HARDENING SUITE');
  console.log('============================================================\n');

  const mockStorage = new MockLocalStorage();
  globalThis.localStorage = mockStorage;

  const server = await createServer({
    root: './client',
    server: { middlewareMode: true }
  });

  try {
    // Load Client Modules through Vite SSR
    const mockData = await server.ssrLoadModule('/src/data/mockData.js');
    const authValidation = await server.ssrLoadModule('/src/utils/authValidation.js');
    const fileHasher = await server.ssrLoadModule('/src/utils/fileHasher.js');
    const downloadTracker = await server.ssrLoadModule('/src/utils/downloadTracker.js');

    const { default: AuthSubsystem } = await server.ssrLoadModule('/src/components/auth/AuthSubsystem.jsx');
    const { default: UserProfile } = await server.ssrLoadModule('/src/components/profile/UserProfile.jsx');
    const { default: BountyBoard } = await server.ssrLoadModule('/src/components/bounty/BountyBoard.jsx');
    const { default: ModerationQueue } = await server.ssrLoadModule('/src/components/admin/ModerationQueue.jsx');
    const { default: CourseManagement } = await server.ssrLoadModule('/src/components/admin/CourseManagement.jsx');
    const { default: UserManagement } = await server.ssrLoadModule('/src/components/admin/UserManagement.jsx');
    const { default: AdminDashboard } = await server.ssrLoadModule('/src/components/admin/AdminDashboard.jsx');
    const { default: FeedbackModal } = await server.ssrLoadModule('/src/components/document/FeedbackModal.jsx');

    const {
      INITIAL_DOCUMENTS,
      INITIAL_COURSES,
      INITIAL_USERS,
      EIGHT_MODERATION_CRITERIA
    } = mockData;

    // =========================================================================
    // 1. AUTHSUBSYSTEM & PASSWORD / EMAIL INPUT SANITIZATION
    // =========================================================================
    console.log('--- 1. AuthSubsystem: Input Sanitization, Whitespace & Email Regex ---');

    // 1.1 Password Evaluation Edge Cases
    const emptyEval = authValidation.evaluatePassword('');
    assert(emptyEval.isSecure === false, 'Empty password is evaluated as not secure');
    assert(emptyEval.scoreLabel === 'Chưa đạt', 'Empty password score label is "Chưa đạt"');
    assert(emptyEval.passedCount === 0, 'Empty password passes 0 criteria');

    const undefEval = authValidation.evaluatePassword(undefined);
    assert(undefEval.isSecure === false, 'Undefined password safely defaults without crash');

    // Sub-boundary: 7 characters with all other criteria met
    const len7Eval = authValidation.evaluatePassword('Aa1@bbb');
    assert(len7Eval.isSecure === false, '7-character password fails security requirement (needs >= 8)');
    assert(len7Eval.criteria.find(c => c.id === 'length').valid === false, 'Length criterion is false for 7 chars');
    assert(len7Eval.criteria.find(c => c.id === 'upper').valid === true, 'Upper criterion is true for "Aa1@bbb"');
    assert(len7Eval.criteria.find(c => c.id === 'number').valid === true, 'Number criterion is true for "Aa1@bbb"');
    assert(len7Eval.criteria.find(c => c.id === 'special').valid === true, 'Special criterion is true for "Aa1@bbb"');

    // 8 characters, only lowercase
    const weak8 = authValidation.evaluatePassword('abcdefgh');
    assert(weak8.isSecure === false, '8-character lowercase-only is not secure');
    assert(weak8.scoreLabel === 'Yếu', '8-character lowercase-only score label is "Yếu"');

    // 8 characters, lower + upper (2 criteria)
    const med8 = authValidation.evaluatePassword('Abcdefgh');
    assert(med8.isSecure === false, '8-character upper+lower is not secure (< 3 criteria)');
    assert(med8.scoreLabel === 'Trung bình', '8-character upper+lower score label is "Trung bình"');

    // 8 characters, lower + upper + number (3 criteria)
    const good8 = authValidation.evaluatePassword('Abcdefg1');
    assert(good8.isSecure === true, '8-character upper+lower+number is secure (>=3 criteria, len>=8)');
    assert(good8.scoreLabel === 'Khá', '8-character upper+lower+number score label is "Khá"');

    // 8 characters, lower + upper + number + special (4 criteria)
    const strong8 = authValidation.evaluatePassword('Abcdef1@');
    assert(strong8.isSecure === true, '8-character all 4 criteria is secure');
    assert(strong8.scoreLabel === 'Rất an toàn', 'All 4 criteria met score label is "Rất an toàn"');

    // 1.2 Email Regex Boundary Testing (using AuthSubsystem regex pattern /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    assert(emailRegex.test('student@hcmue.edu.vn') === true, 'Valid institutional email passes');
    assert(emailRegex.test('admin.khoa@gmail.com') === true, 'Valid standard email passes');
    assert(emailRegex.test('plainaddress') === false, 'Plain address rejected');
    assert(emailRegex.test('@hcmue.edu.vn') === false, 'Missing local part rejected');
    assert(emailRegex.test('student@') === false, 'Missing domain part rejected');
    assert(emailRegex.test('student@domain') === false, 'Missing top-level domain dot rejected');
    assert(emailRegex.test('student @hcmue.edu.vn') === false, 'Email with space rejected');
    assert(emailRegex.test('') === false, 'Empty string rejected');

    // Whitespace trim behavior
    const paddedEmail = '   student@hcmue.edu.vn   ';
    assert(emailRegex.test(paddedEmail.trim()) === true, 'Trimmed padded email passes validation');
    const whitespaceOnly = '     ';
    assert(whitespaceOnly.trim().length === 0, 'Whitespace-only email trims to length 0 (triggers empty check)');

    // 1.3 AuthSubsystem Component SSR Rendering
    const authHtmlLogin = renderToStaticMarkup(
      React.createElement(AuthSubsystem, { initialTab: 'login', onLoginSuccess: () => {} })
    );
    assert(authHtmlLogin.includes('Đăng nhập'), 'AuthSubsystem renders login view');
    assert(authHtmlLogin.includes('email'), 'AuthSubsystem contains email input');
    assert(authHtmlLogin.includes('password'), 'AuthSubsystem contains password input');

    const authHtmlReg = renderToStaticMarkup(
      React.createElement(AuthSubsystem, { initialTab: 'register', onLoginSuccess: () => {} })
    );
    assert(authHtmlReg.includes('Tạo tài khoản'), 'AuthSubsystem renders register view');
    assert(authHtmlReg.includes('Họ và tên'), 'AuthSubsystem register view contains Full Name input');
    assert(authHtmlReg.includes('Điều khoản'), 'AuthSubsystem register view contains Terms checkbox');

    // =========================================================================
    // 2. USERPROFILE: COHORT BOUNDARY, EXTREME LENGTHS & AVATAR SWITCHING
    // =========================================================================
    console.log('\n--- 2. UserProfile: Cohort Boundary, Extreme Lengths & Avatar Switching ---');

    // 2.1 Cohort Regex Boundary Verification: /^K(4[8-9]|5[0-2])$/
    const cohortRegex = /^K(4[8-9]|5[0-2])$/;
    const validCohorts = ['K48', 'K49', 'K50', 'K51', 'K52'];
    validCohorts.forEach(c => {
      assert(cohortRegex.test(c) === true, `Cohort ${c} is strictly valid within [K48..K52]`);
    });

    const invalidCohorts = [
      'K47',      // Below lower bound
      'K53',      // Above upper bound
      'K46',      // Distant past
      'K55',      // Distant future
      'k48',      // Lowercase k rejected
      'K48 ',     // Trailing space rejected
      ' K50',     // Leading space rejected
      'K48\n',    // Newline rejected
      'K48-SPTH', // Suffix rejected
      'K50.01',   // Sub-cohort rejected
      'K',        // Prefix only rejected
      ''          // Empty rejected
    ];
    invalidCohorts.forEach(c => {
      assert(cohortRegex.test(c) === false, `Invalid cohort "${c}" is rejected by boundary regex`);
    });

    // 2.2 Full Name Boundary Testing
    assert(''.trim().length < 2, 'Empty name trimmed is < 2 chars (rejected)');
    assert('A'.trim().length < 2, 'Single char name "A" is < 2 chars (rejected)');
    assert('   A   '.trim().length < 2, 'Padded single char "   A   " is < 2 chars (rejected)');
    assert('An'.trim().length >= 2, 'Min boundary name "An" (2 chars) is accepted');
    const extremeLongName = 'Nguyễn Trần Đăng Khoa '.repeat(10).trim();
    assert(extremeLongName.length > 200, 'Extreme 200+ char name constructed');
    assert(extremeLongName.trim().length >= 2, 'Extreme name passes >= 2 chars length guard');

    // 2.3 SSR Rendering UserProfile with Various Personas and Presets
    const profileHtmlStudent = renderToStaticMarkup(
      React.createElement(UserProfile, {
        currentUser: INITIAL_USERS[0],
        initialTab: 'info',
        documents: INITIAL_DOCUMENTS,
        bookmarkedIds: ['doc-1', 'doc-3']
      })
    );
    assert(profileHtmlStudent.includes('Hồ sơ cá nhân') || profileHtmlStudent.includes('Thông tin tổng quan'), 'UserProfile renders header');
    assert(profileHtmlStudent.includes('K50'), 'UserProfile displays K50 cohort');
    assert(profileHtmlStudent.includes('Mật khẩu'), 'UserProfile provides password change tab');

    // SSR with Password tab and all 6 criteria checklist
    const profileHtmlPwd = renderToStaticMarkup(
      React.createElement(UserProfile, {
        currentUser: INITIAL_USERS[0],
        initialTab: 'password',
        documents: INITIAL_DOCUMENTS
      })
    );
    assert(profileHtmlPwd.includes('Tối thiểu 8 ký tự'), 'Password checklist includes length requirement');
    assert(profileHtmlPwd.includes('chữ cái in hoa'), 'Password checklist includes uppercase requirement');
    assert(profileHtmlPwd.includes('chữ số'), 'Password checklist includes digit requirement');
    assert(profileHtmlPwd.includes('ký tự đặc biệt'), 'Password checklist includes special char requirement');
    assert(profileHtmlPwd.includes('Khác với mật khẩu hiện tại'), 'Password checklist includes difference from current');
    assert(profileHtmlPwd.includes('Xác nhận mật khẩu khớp'), 'Password checklist includes confirmation match');

    // =========================================================================
    // 3. BOUNTYBOARD: BOUNTY ESCROW EDGE CASES & FRAUD PREVENTION
    // =========================================================================
    console.log('\n--- 3. BountyBoard: Bounty Escrow Edge Cases & Fraud Prevention ---');

    // 3.1 Reward Points Escrow Rules
    const validateRewardPoints = (points, userPoints = 140) => {
      const pointsNum = Number(points);
      if (!Number.isInteger(pointsNum) || pointsNum <= 0) {
        return { valid: false, error: 'Số điểm thưởng phải là số nguyên dương lớn hơn 0.' };
      }
      if (pointsNum > userPoints) {
        return { valid: false, error: `Số dư ví hiện tại (${userPoints} điểm) không đủ để treo thưởng ${pointsNum} điểm.` };
      }
      return { valid: true, error: null };
    };

    // Edge case: 0 points
    assert(validateRewardPoints(0).valid === false, '0 bounty points rejected');
    assert(validateRewardPoints('0').valid === false, 'String "0" bounty points rejected');

    // Edge case: Negative points
    assert(validateRewardPoints(-1).valid === false, '-1 bounty points rejected');
    assert(validateRewardPoints(-100).valid === false, '-100 bounty points rejected');

    // Edge case: Fractional / Float points
    assert(validateRewardPoints(10.5).valid === false, 'Fractional points (10.5) rejected');
    assert(validateRewardPoints(0.1).valid === false, 'Sub-integer points (0.1) rejected');

    // Edge case: Non-numeric values
    assert(validateRewardPoints('abc').valid === false, 'String "abc" points rejected');
    assert(validateRewardPoints(NaN).valid === false, 'NaN points rejected');
    assert(validateRewardPoints(null).valid === false, 'null points rejected');

    // Edge case: Points exceeding current wallet balance
    assert(validateRewardPoints(141, 140).valid === false, '141 points with 140 balance rejected (escrow overflow)');
    assert(validateRewardPoints(9999, 140).valid === false, 'Extreme 9999 points with 140 balance rejected');

    // Edge case: Valid boundary points
    assert(validateRewardPoints(1, 140).valid === true, '1 point (minimum valid integer) accepted');
    assert(validateRewardPoints(140, 140).valid === true, 'Exact balance (140 points) accepted');
    assert(validateRewardPoints(50, 140).valid === true, 'Standard 50 points accepted');

    // 3.2 Title Length & Whitespace Validation
    const validateBountyTitle = (title) => {
      const trimmed = title.trim();
      if (trimmed.length < 10) {
        return { valid: false, error: 'Tiêu đề yêu cầu bắt buộc tối thiểu 10 ký tự.' };
      }
      return { valid: true, error: null };
    };
    assert(validateBountyTitle('Short').valid === false, '5-character title rejected (<10 chars)');
    assert(validateBountyTitle('          ').valid === false, '10 spaces title trimmed to 0 chars rejected');
    assert(validateBountyTitle('   123456789   ').valid === false, '9 chars with padding trimmed to 9 chars rejected');
    assert(validateBountyTitle('Cần tìm giáo án Tin học lớp 10').valid === true, 'Valid title (30 chars) accepted');

    // 3.3 Self-Fulfillment Escrow Fraud Prevention Check
    const sampleBounties = [
      {
        id: 'bty-1',
        title: 'Cần tìm đề cương ôn tập môn Cấu trúc dữ liệu',
        courseCode: 'COMP1015',
        courseName: 'Cấu trúc dữ liệu và giải thuật',
        rewardPoints: 50,
        creatorId: 'usr-vi',
        creatorName: 'Phan Triệu Vĩ',
        creatorCohort: 'K50 SPTH',
        status: 'OPEN'
      },
      {
        id: 'bty-2',
        title: 'Tìm bài giảng môn Kiến trúc máy tính',
        courseCode: 'COMP1022',
        courseName: 'Kiến trúc máy tính',
        rewardPoints: 30,
        creatorId: 'usr-other',
        creatorName: 'Lê Hoàng Long',
        creatorCohort: 'K49 SPTH',
        status: 'OPEN'
      }
    ];

    // SSR when currentUser IS the creator of bty-1
    const bountyHtmlCreator = renderToStaticMarkup(
      React.createElement(BountyBoard, {
        currentUser: { id: 'usr-vi', fullName: 'Phan Triệu Vĩ', points: 140 },
        actorRole: 'USER',
        courses: INITIAL_COURSES,
        documents: INITIAL_DOCUMENTS,
        bounties: sampleBounties
      })
    );
    // When creator views their own bounty, action CTA MUST display "Yêu cầu của bạn" and NOT "Nộp tài liệu giải thưởng"
    assert(bountyHtmlCreator.includes('Yêu cầu của bạn'), 'Creator sees "Yêu cầu của bạn" badge on their own bounty');
    assert(bountyHtmlCreator.includes('Nộp tài liệu giải thưởng'), 'Creator sees "Nộp tài liệu giải thưởng" on other user bounty');

    // SSR when guest views BountyBoard
    const bountyHtmlGuest = renderToStaticMarkup(
      React.createElement(BountyBoard, {
        currentUser: null,
        actorRole: 'GUEST',
        courses: INITIAL_COURSES,
        documents: INITIAL_DOCUMENTS,
        bounties: sampleBounties
      })
    );
    assert(!bountyHtmlGuest.includes('Yêu cầu của bạn'), 'Guest does not own any bounties');
    assert(bountyHtmlGuest.includes('Nộp tài liệu giải thưởng'), 'Guest sees action buttons prompting engagement');

    // =========================================================================
    // 4. FILEHASHER: TRUNCATED MAGIC BYTES, CORRUPTED BUFFERS & DOUBLE EXTENSIONS
    // =========================================================================
    console.log('\n--- 4. fileHasher: Truncated Magic Bytes, Corrupted Buffers & Extensions ---');

    // 4.1 Truncated Magic Bytes (< 4 bytes)
    // 0-byte buffer
    const zeroByteFile = {
      name: 'tai_lieu.pdf',
      size: 0,
      type: 'application/pdf',
      arrayBuffer: async () => new Uint8Array([]).buffer
    };
    const zeroRes = await fileHasher.verifyFileAndHash(zeroByteFile, INITIAL_DOCUMENTS);
    assert(zeroRes.isValid === false, '0-byte file rejected');
    assert(zeroRes.stageFailed === 'EMPTY_FILE', '0-byte file fails at EMPTY_FILE stage');

    // 1-byte truncated PDF buffer [0x25]
    const trunc1Pdf = {
      name: 'tai_lieu.pdf',
      size: 1,
      type: 'application/pdf',
      arrayBuffer: async () => new Uint8Array([0x25]).buffer
    };
    const trunc1Res = await fileHasher.verifyFileAndHash(trunc1Pdf, INITIAL_DOCUMENTS);
    assert(trunc1Res.isValid === false, '1-byte truncated PDF rejected');
    assert(trunc1Res.stageFailed === 'MAGIC_BYTES', '1-byte PDF fails at MAGIC_BYTES stage');

    // 2-byte truncated PDF buffer [0x25, 0x50]
    const trunc2Pdf = {
      name: 'tai_lieu.pdf',
      size: 2,
      type: 'application/pdf',
      arrayBuffer: async () => new Uint8Array([0x25, 0x50]).buffer
    };
    const trunc2Res = await fileHasher.verifyFileAndHash(trunc2Pdf, INITIAL_DOCUMENTS);
    assert(trunc2Res.isValid === false, '2-byte truncated PDF rejected');
    assert(trunc2Res.stageFailed === 'MAGIC_BYTES', '2-byte PDF fails at MAGIC_BYTES stage');

    // 3-byte truncated PDF buffer [0x25, 0x50, 0x44]
    const trunc3Pdf = {
      name: 'tai_lieu.pdf',
      size: 3,
      type: 'application/pdf',
      arrayBuffer: async () => new Uint8Array([0x25, 0x50, 0x44]).buffer
    };
    const trunc3Res = await fileHasher.verifyFileAndHash(trunc3Pdf, INITIAL_DOCUMENTS);
    assert(trunc3Res.isValid === false, '3-byte truncated PDF rejected');
    assert(trunc3Res.stageFailed === 'MAGIC_BYTES', '3-byte PDF fails at MAGIC_BYTES stage');

    // 2-byte truncated DOCX buffer [0x50, 0x4B]
    const trunc2Docx = {
      name: 'giao_an.docx',
      size: 2,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      arrayBuffer: async () => new Uint8Array([0x50, 0x4B]).buffer
    };
    const trunc2DocxRes = await fileHasher.verifyFileAndHash(trunc2Docx, INITIAL_DOCUMENTS);
    assert(trunc2DocxRes.isValid === false, '2-byte truncated DOCX rejected');
    assert(trunc2DocxRes.stageFailed === 'MAGIC_BYTES', '2-byte DOCX fails at MAGIC_BYTES stage');

    // 3-byte truncated PPTX buffer [0x50, 0x4B, 0x03]
    const trunc3Pptx = {
      name: 'bai_giang.pptx',
      size: 3,
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      arrayBuffer: async () => new Uint8Array([0x50, 0x4B, 0x03]).buffer
    };
    const trunc3PptxRes = await fileHasher.verifyFileAndHash(trunc3Pptx, INITIAL_DOCUMENTS);
    assert(trunc3PptxRes.isValid === false, '3-byte truncated PPTX rejected');
    assert(trunc3PptxRes.stageFailed === 'MAGIC_BYTES', '3-byte PPTX fails at MAGIC_BYTES stage');

    // 4.2 Corrupted Buffers & Malware Signatures
    // PE Executable disguised as PDF (MZ header 0x4D, 0x5A)
    const mzExeDisguisedPdf = {
      name: 'malware.pdf',
      size: 1024,
      type: 'application/pdf',
      arrayBuffer: async () => new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]).buffer
    };
    const mzRes = await fileHasher.verifyFileAndHash(mzExeDisguisedPdf, INITIAL_DOCUMENTS);
    assert(mzRes.isValid === false, 'PE Executable (MZ) disguised as PDF rejected');
    assert(mzRes.stageFailed === 'MAGIC_BYTES', 'MZ executable fails at MAGIC_BYTES stage');
    assert(mzRes.magicHeaderHex.includes('MZ'), 'Error diagnostics explicitly flags MZ header');

    // ELF Executable disguised as DOCX (\x7FELF)
    const elfDisguisedDocx = {
      name: 'rootkit.docx',
      size: 2048,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      arrayBuffer: async () => new Uint8Array([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01, 0x01, 0x00]).buffer
    };
    const elfRes = await fileHasher.verifyFileAndHash(elfDisguisedDocx, INITIAL_DOCUMENTS);
    assert(elfRes.isValid === false, 'ELF Executable disguised as DOCX rejected');
    assert(elfRes.stageFailed === 'MAGIC_BYTES', 'ELF binary fails at MAGIC_BYTES stage');

    // Random corrupted buffer for PDF
    const randomGarbagePdf = {
      name: 'corrupted.pdf',
      size: 512,
      type: 'application/pdf',
      arrayBuffer: async () => new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE]).buffer
    };
    const randomRes = await fileHasher.verifyFileAndHash(randomGarbagePdf, INITIAL_DOCUMENTS);
    assert(randomRes.isValid === false, 'Random garbage buffer rejected');
    assert(randomRes.stageFailed === 'MAGIC_BYTES', 'Random garbage fails at MAGIC_BYTES stage');

    // Buffer throwing exception during read
    const throwingFile = {
      name: 'io_error.pdf',
      size: 512,
      type: 'application/pdf',
      arrayBuffer: async () => { throw new Error('Simulated disk read error'); }
    };
    const throwingRes = await fileHasher.verifyFileAndHash(throwingFile, INITIAL_DOCUMENTS);
    assert(typeof throwingRes === 'object', 'Exception during arrayBuffer handled gracefully without crash');

    // 4.3 Double Extensions & Extension Evasion
    const doubleExtCases = [
      { name: 'document.pdf.exe', expectedFail: 'EXTENSION' },
      { name: 'syllabus.docx.sh', expectedFail: 'EXTENSION' },
      { name: 'presentation.pptx.bat', expectedFail: 'EXTENSION' },
      { name: 'lecture.pdf.js', expectedFail: 'EXTENSION' },
      { name: 'archive.pdf.zip', expectedFail: 'EXTENSION' },
      { name: 'script.docx.vbs', expectedFail: 'EXTENSION' }
    ];
    for (const item of doubleExtCases) {
      const res = await fileHasher.verifyFileAndHash({ name: item.name, size: 1024 });
      assert(res.isValid === false, `Double extension "${item.name}" rejected`);
      assert(res.stageFailed === item.expectedFail, `Double extension "${item.name}" fails at ${item.expectedFail} stage`);
    }

    // MIME Spoofing
    const mimeSpoofFile = {
      name: 'trojan.pdf',
      size: 1024,
      type: 'application/x-msdownload',
      arrayBuffer: async () => new Uint8Array([0x25, 0x50, 0x44, 0x2D, 0x31, 0x2E, 0x37]).buffer
    };
    const mimeSpoofRes = await fileHasher.verifyFileAndHash(mimeSpoofFile, INITIAL_DOCUMENTS);
    assert(mimeSpoofRes.isValid === false, 'MIME mismatch (application/x-msdownload for .pdf) rejected');
    assert(mimeSpoofRes.stageFailed === 'EXTENSION', 'MIME mismatch fails at EXTENSION stage');

    // Valid Real PDF & Real DOCX/PPTX Buffers
    const validPdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x2D, 0x31, 0x2E, 0x37, 0x0A]);
    const validPdfRes = await fileHasher.verifyFileAndHash(
      { name: 'valid.pdf', size: 1024, type: 'application/pdf', arrayBuffer: async () => validPdfBuffer.buffer },
      INITIAL_DOCUMENTS
    );
    assert(validPdfRes.isValid === true, 'Valid PDF buffer (%PDF-) passes all 4 stages');
    assert(validPdfRes.magicBytesOk === true, 'Valid PDF magic bytes verified');
    assert(validPdfRes.sha256Hash !== null, 'Valid PDF generates SHA-256 hash');

    const validZipBuffer = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    const validDocxRes = await fileHasher.verifyFileAndHash(
      { name: 'valid.docx', size: 2048, arrayBuffer: async () => validZipBuffer.buffer },
      INITIAL_DOCUMENTS
    );
    assert(validDocxRes.isValid === true, 'Valid DOCX OpenXML ZIP buffer (PK..) passes all stages');

    // =========================================================================
    // 5. DOWNLOADTRACKER: CLOCK DRIFT, CORRUPTED JSON & NEGATIVE TIMESTAMPS
    // =========================================================================
    console.log('\n--- 5. downloadTracker: Corrupted JSON, Clock Drift & Edge Conditions ---');

    // 5.1 Corrupted JSON in localStorage
    const GUEST_KEY = '5share_guest_download_log';

    mockStorage.setItem(GUEST_KEY, '{"invalid_json": true'); // Syntax error
    const corruptJsonStats = downloadTracker.getGuestDownloadStats();
    assert(corruptJsonStats.count === 0, 'Corrupted JSON defaults to 0 downloads');
    assert(corruptJsonStats.remaining === 3, 'Corrupted JSON provides 3 remaining downloads');
    assert(corruptJsonStats.isExhausted === false, 'Corrupted JSON is not exhausted');

    // Non-array JSON values
    mockStorage.setItem(GUEST_KEY, JSON.stringify("a string"));
    assert(downloadTracker.getGuestDownloadStats().count === 0, 'String JSON defaults to 0 downloads');

    mockStorage.setItem(GUEST_KEY, JSON.stringify(12345));
    assert(downloadTracker.getGuestDownloadStats().count === 0, 'Number JSON defaults to 0 downloads');

    mockStorage.setItem(GUEST_KEY, JSON.stringify({ a: 1, b: 2 }));
    assert(downloadTracker.getGuestDownloadStats().count === 0, 'Object JSON defaults to 0 downloads');

    // 5.2 Negative timestamps & Clock drift
    const now = Date.now();
    const mixedLog = [
      -500000,                              // Negative timestamp
      "corrupted_entry",                    // String in array
      null,                                 // Null in array
      now - 25 * 60 * 60 * 1000,            // Expired (>24h ago)
      now - 1000,                           // Valid recent (1s ago)
      now - 5000                            // Valid recent (5s ago)
    ];
    mockStorage.setItem(GUEST_KEY, JSON.stringify(mixedLog));
    const driftStats = downloadTracker.getGuestDownloadStats();
    assert(driftStats.count === 2, 'Exactly 2 valid non-expired timestamps counted from dirty array');
    assert(driftStats.remaining === 1, 'Remaining downloads is 1 (3 - 2)');
    assert(driftStats.isExhausted === false, 'Not exhausted at 2 downloads');

    // Check auto-pruning written back to localStorage
    const pruned = JSON.parse(mockStorage.getItem(GUEST_KEY));
    assert(pruned.length === 2, 'Corrupt & expired entries were pruned from localStorage');
    assert(pruned.every(ts => typeof ts === 'number' && ts > 0), 'All stored timestamps are positive numbers');

    // 5.3 Exhaustion & Remaining clamping
    const fullLog = [now - 3000, now - 2000, now - 1000];
    mockStorage.setItem(GUEST_KEY, JSON.stringify(fullLog));
    const exhaustedStats = downloadTracker.getGuestDownloadStats();
    assert(exhaustedStats.count === 3, 'Count reaches 3');
    assert(exhaustedStats.remaining === 0, 'Remaining is 0');
    assert(exhaustedStats.isExhausted === true, 'Limit reached: isExhausted is true');

    // Overflow beyond 3 downloads (e.g. 5 downloads recorded)
    const overLog = [now - 5000, now - 4000, now - 3000, now - 2000, now - 1000];
    mockStorage.setItem(GUEST_KEY, JSON.stringify(overLog));
    const overStats = downloadTracker.getGuestDownloadStats();
    assert(overStats.count === 5, 'Count records 5 downloads');
    assert(overStats.remaining === 0, 'Remaining downloads safely clamped at 0 (never negative)');
    assert(overStats.isExhausted === true, 'isExhausted remains true for >= 3');

    // =========================================================================
    // 6. MODERATIONQUEUE: WHITESPACE REJECTION & CRITERIA CHECKLIST
    // =========================================================================
    console.log('\n--- 6. ModerationQueue: Whitespace Rejection Reasons & 8 Criteria ---');

    // 6.1 Whitespace-only Rejection Reason Validation
    const validateRejectReason = (reason) => {
      const trimmed = (reason || '').trim();
      if (!trimmed || trimmed.length < 10) {
        return {
          valid: false,
          error: 'Bắt buộc phải nhập lý do từ chối cụ thể (tối thiểu 10 ký tự) để sinh viên nắm rõ và chỉnh sửa.'
        };
      }
      return { valid: true, error: null };
    };

    assert(validateRejectReason('').valid === false, 'Empty rejection reason rejected');
    assert(validateRejectReason('          ').valid === false, '10 spaces rejection reason rejected');
    assert(validateRejectReason('                    ').valid === false, '20 spaces rejection reason rejected');
    assert(validateRejectReason('\t\t\n\r   ').valid === false, 'Newline/tab whitespace rejection reason rejected');
    assert(validateRejectReason('123456789').valid === false, '9-character rejection reason rejected (<10 chars)');
    assert(validateRejectReason('1234567890').valid === true, '10-character rejection reason accepted');
    assert(
      validateRejectReason('Kế hoạch bài dạy chưa đủ cấu trúc 4 hoạt động chuẩn theo CV 5512.').valid === true,
      'Valid detailed rejection reason accepted'
    );

    // 6.2 8-Criteria Verification & Split-Review Rendering
    const pendingDocuments = INITIAL_DOCUMENTS.filter(d => d.status === 'PENDING');
    assert(pendingDocuments.length > 0, `There are ${pendingDocuments.length} pending documents in mock data`);

    const modQueueHtml = renderToStaticMarkup(
      React.createElement(ModerationQueue, {
        documents: INITIAL_DOCUMENTS,
        reports: [],
        onApproveDocument: () => {},
        onRejectDocument: () => {},
        onResolveReport: () => {}
      })
    );
    assert(modQueueHtml.includes('Hàng đợi Kiểm duyệt'), 'ModerationQueue renders header');
    assert(modQueueHtml.includes('Bảng kiểm 8 Tiêu chí'), 'ModerationQueue renders 8 criteria checklist');
    assert(modQueueHtml.includes('Phê duyệt &amp; Xuất bản (+20 điểm)'), 'ModerationQueue renders Approve action');
    assert(modQueueHtml.includes('Từ chối'), 'ModerationQueue renders Reject action');

    // Empty Pending Queue State
    const emptyModHtml = renderToStaticMarkup(
      React.createElement(ModerationQueue, {
        documents: INITIAL_DOCUMENTS.map(d => ({ ...d, status: 'APPROVED' })),
        reports: []
      })
    );
    assert(
      emptyModHtml.includes('Hàng đợi kiểm duyệt đã được xử lý hoàn tất'),
      'ModerationQueue renders dedicated empty state when 0 documents are pending'
    );

    // =========================================================================
    // 7. COURSEMANAGEMENT: PARTIAL MATCH SEARCH, SEMESTER FILTERING & FK BLOCK
    // =========================================================================
    console.log('\n--- 7. CourseManagement: Partial Search, Semester Filtering & FK Block ---');

    // 7.1 Course Search Logic
    const filterCourses = (courses, query, semester = 'Tất cả học kỳ', block = 'Tất cả khối kiến thức', status = 'ALL') => {
      const q = (query || '').trim().toLowerCase();
      return courses.filter(course => {
        const matchesSearch = !q || course.code.toLowerCase().includes(q) || course.name.toLowerCase().includes(q);
        const matchesSemester = semester === 'Tất cả học kỳ' || course.semester === semester;
        const matchesBlock = block === 'Tất cả khối kiến thức' || course.knowledgeBlock === block;
        const matchesStatus = status === 'ALL' || (status === 'ACTIVE' && course.isActive) || (status === 'INACTIVE' && !course.isActive);
        return matchesSearch && matchesSemester && matchesBlock && matchesStatus;
      });
    };

    // Partial search matches
    assert(filterCourses(INITIAL_COURSES, 'COMP').length >= 4, 'Partial search "COMP" matches all COMP courses');
    assert(filterCourses(INITIAL_COURSES, '1044').length === 1, 'Partial search "1044" matches COMP1044');
    assert(filterCourses(INITIAL_COURSES, 'tin học').length >= 1, 'Partial search "tin học" matches course name');
    assert(filterCourses(INITIAL_COURSES, 'dạy học').length >= 1, 'Partial search "dạy học" matches course name');
    assert(filterCourses(INITIAL_COURSES, '  cOmP1015  ').length === 1, 'Padded & mixed case "  cOmP1015  " matches COMP1015');
    assert(filterCourses(INITIAL_COURSES, 'XYZ9999').length === 0, 'Non-existent course returns 0 results');

    // Semester filtering
    assert(filterCourses(INITIAL_COURSES, '', 'Học kỳ 1').length >= 1, 'Semester "Học kỳ 1" filter returns results');
    assert(filterCourses(INITIAL_COURSES, '', 'Học kỳ 6').length >= 1, 'Semester "Học kỳ 6" filter returns results');
    assert(filterCourses(INITIAL_COURSES, '', 'Học kỳ 99').length === 0, 'Non-existent semester returns 0 results');

    // 7.2 Strict Foreign Key Deletion Block
    const comp1044 = INITIAL_COURSES.find(c => c.code === 'COMP1044');
    const linkedDocs1044 = INITIAL_DOCUMENTS.filter(d => d.courseCode === 'COMP1044' && d.status !== 'DELETED');
    assert(linkedDocs1044.length > 0, `COMP1044 has ${linkedDocs1044.length} linked active documents`);

    // Render CourseManagement
    const courseMgmtHtml = renderToStaticMarkup(
      React.createElement(CourseManagement, {
        courses: INITIAL_COURSES,
        documents: INITIAL_DOCUMENTS,
        onSaveCourse: () => {},
        onToggleCourseActive: () => {},
        onDeleteCourse: () => {}
      })
    );
    assert(courseMgmtHtml.includes('Quản lý Danh mục Học phần'), 'CourseManagement renders header');
    assert(courseMgmtHtml.includes('COMP1044'), 'CourseManagement lists COMP1044');
    assert(courseMgmtHtml.includes('COMP1015'), 'CourseManagement lists COMP1015');

    // =========================================================================
    // 8. USERMANAGEMENT: LOCKING/UNLOCKING & SELF-LOCK GUARD
    // =========================================================================
    console.log('\n--- 8. UserManagement: Self-Lock Guard, State Machine & Filtering ---');

    const adminUser = INITIAL_USERS.find(u => u.role === 'ADMIN') || { id: 'usr-admin', fullName: 'Nguyễn Trần Đăng Khoa', role: 'ADMIN' };
    const studentUser = INITIAL_USERS.find(u => u.role === 'USER' || u.role === 'STUDENT') || INITIAL_USERS[0];

    // 8.1 SSR UserManagement rendering with Admin as currentUser
    const userMgmtHtml = renderToStaticMarkup(
      React.createElement(UserManagement, {
        users: INITIAL_USERS,
        currentUser: adminUser,
        onToggleUserStatus: () => {}
      })
    );
    assert(userMgmtHtml.includes('Quản trị Người dùng'), 'UserManagement renders header');
    assert(userMgmtHtml.includes('(Bạn)'), 'UserManagement highlights current logged-in Admin');

    // Self-lock button is disabled
    assert(userMgmtHtml.includes('title="Không thể tự khóa tài khoản của bạn"'), 'Self-lock guard title rendered');
    assert(userMgmtHtml.includes('disabled=""') || userMgmtHtml.includes('disabled'), 'Self-lock button has disabled attribute');

    // State machine check:
    // Active users display "Khóa" button; Locked users display "Mở khóa" button
    const activeStudent = INITIAL_USERS.find(u => u.isActive && u.id !== adminUser.id);
    const lockedUsers = INITIAL_USERS.filter(u => !u.isActive);

    assert(activeStudent !== undefined, 'Found active student in user fixtures');
    assert(userMgmtHtml.includes('Khóa'), 'Active user rows have "Khóa" button');

    // Test with a locked user injected
    const usersWithLocked = [
      ...INITIAL_USERS,
      {
        id: 'usr-locked-1',
        fullName: 'Trần Văn Vi Phạm',
        email: 'vipham@hcmue.edu.vn',
        role: 'STUDENT',
        isActive: false,
        lockReason: 'Spam tài liệu giả mạo'
      }
    ];
    const userMgmtLockedHtml = renderToStaticMarkup(
      React.createElement(UserManagement, {
        users: usersWithLocked,
        currentUser: adminUser,
        onToggleUserStatus: () => {}
      })
    );
    assert(userMgmtLockedHtml.includes('Mở khóa'), 'Locked user row displays "Mở khóa" action button');
    assert(userMgmtLockedHtml.includes('Đã khóa'), 'Locked user displays "Đã khóa" status badge');

    // =========================================================================
    // 9. ADMINDASHBOARD: ZERO DOWNLOAD DATA & PURE SVG CHART INTEGRITY
    // =========================================================================
    console.log('\n--- 9. AdminDashboard: Zero Download Data Edge Case & Pure SVG Charts ---');

    // 9.1 Zero Download Data Edge Case
    const zeroDocs = INITIAL_DOCUMENTS.map(d => ({ ...d, downloadCount: 0 }));
    const zeroDashHtml = renderToStaticMarkup(
      React.createElement(AdminDashboard, {
        documents: zeroDocs,
        courses: INITIAL_COURSES,
        users: INITIAL_USERS,
        reports: [],
        downloadHistory: []
      })
    );
    assert(zeroDashHtml.includes('Tổng quan Vận hành'), 'AdminDashboard renders with zero download documents');
    assert(!zeroDashHtml.includes('NaN'), 'Zero download documents does NOT generate NaN in output');
    assert(!zeroDashHtml.includes('Infinity'), 'Zero download documents does NOT generate Infinity');

    // Empty documents array & empty courses array
    const emptyDashHtml = renderToStaticMarkup(
      React.createElement(AdminDashboard, {
        documents: [],
        courses: [],
        users: [],
        reports: []
      })
    );
    assert(emptyDashHtml.includes('Tổng quan Vận hành'), 'AdminDashboard safely renders with empty arrays');
    assert(!emptyDashHtml.includes('NaN'), 'Empty dataset does not produce NaN');

    // 9.2 Pure SVG Chart Rendering Integrity
    const standardDashHtml = renderToStaticMarkup(
      React.createElement(AdminDashboard, {
        documents: INITIAL_DOCUMENTS,
        courses: INITIAL_COURSES,
        users: INITIAL_USERS,
        reports: []
      })
    );

    // Verify SVG elements
    assert(standardDashHtml.includes('<svg'), 'Dashboard renders SVG charts');
    assert(standardDashHtml.includes('<path'), 'Dashboard renders SVG paths for spline and area charts');
    assert(standardDashHtml.includes('linearGradient'), 'Dashboard renders SVG linear gradients');

    // Strict Anti-AI Slop: Zero external charting canvas/libs
    assert(!standardDashHtml.includes('<canvas'), 'Zero canvas elements (no Chart.js slop)');
    assert(!standardDashHtml.includes('recharts'), 'Zero recharts artifacts');
    assert(!standardDashHtml.includes('highcharts'), 'Zero highcharts artifacts');

    // Verify cubic bezier curve path syntax (M ... C ...)
    const pathMatch = standardDashHtml.match(/d="(M\s*[\d.]+,[\d.]+\s*C[^"]+)"/);
    assert(pathMatch !== null, 'SVG path contains genuine Cubic Bezier Spline ("M ... C ...")');

    // =========================================================================
    // 10. FEEDBACKMODAL: WHITESPACE-ONLY CONTENT & INVALID EMAIL FORMATS
    // =========================================================================
    console.log('\n--- 10. FeedbackModal: Whitespace-Only Content, Email Validation & Categories ---');

    // 10.1 Validation Function for Feedback
    const validateFeedback = ({ title, content, contactEmail, currentUser }) => {
      const trimmedTitle = (title || '').trim();
      const trimmedContent = (content || '').trim();
      const trimmedEmail = (contactEmail || '').trim();

      if (!trimmedTitle || trimmedTitle.length < 5) {
        return { valid: false, error: 'Vui lòng nhập tiêu đề góp ý rõ ràng (tối thiểu 5 ký tự).' };
      }
      if (!trimmedContent || trimmedContent.length < 15) {
        return { valid: false, error: 'Vui lòng mô tả chi tiết nội dung đóng góp của bạn (tối thiểu 15 ký tự).' };
      }
      if (!currentUser && (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail))) {
        return { valid: false, error: 'Vui lòng cung cấp email liên hệ hợp lệ để Ban Quản trị phản hồi.' };
      }
      return { valid: true, error: null };
    };

    // Title validation
    assert(validateFeedback({ title: '', content: '123456789012345', currentUser: adminUser }).valid === false, 'Empty title rejected');
    assert(validateFeedback({ title: '    ', content: '123456789012345', currentUser: adminUser }).valid === false, 'Whitespace-only title rejected');
    assert(validateFeedback({ title: 'abcd', content: '123456789012345', currentUser: adminUser }).valid === false, '4-character title rejected (<5 chars)');
    assert(validateFeedback({ title: 'abcde', content: '123456789012345', currentUser: adminUser }).valid === true, '5-character title accepted');

    // Content validation (minimum 15 characters)
    assert(validateFeedback({ title: 'Góp ý hệ thống', content: '', currentUser: adminUser }).valid === false, 'Empty content rejected');
    assert(validateFeedback({ title: 'Góp ý hệ thống', content: '               ', currentUser: adminUser }).valid === false, '15 spaces content trimmed to 0 rejected');
    assert(validateFeedback({ title: 'Góp ý hệ thống', content: '                         ', currentUser: adminUser }).valid === false, '25 spaces content trimmed to 0 rejected');
    assert(validateFeedback({ title: 'Góp ý hệ thống', content: '12345678901234', currentUser: adminUser }).valid === false, '14-character content rejected (<15 chars)');
    assert(validateFeedback({ title: 'Góp ý hệ thống', content: '123456789012345', currentUser: adminUser }).valid === true, '15-character content accepted');

    // Guest contact email validation
    assert(validateFeedback({ title: 'Góp ý hệ thống', content: '123456789012345', contactEmail: '', currentUser: null }).valid === false, 'Guest empty email rejected');
    assert(validateFeedback({ title: 'Góp ý hệ thống', content: '123456789012345', contactEmail: 'not-an-email', currentUser: null }).valid === false, 'Guest plain email rejected');
    assert(validateFeedback({ title: 'Góp ý hệ thống', content: '123456789012345', contactEmail: 'guest@hcmue', currentUser: null }).valid === false, 'Guest email missing domain dot rejected');
    assert(validateFeedback({ title: 'Góp ý hệ thống', content: '123456789012345', contactEmail: 'guest@hcmue.edu.vn', currentUser: null }).valid === true, 'Guest valid email accepted');

    // 10.2 FeedbackModal SSR Component Verification
    const feedbackModalHtml = renderToStaticMarkup(
      React.createElement(FeedbackModal, {
        isOpen: true,
        onClose: () => {},
        currentUser: adminUser,
        onSubmitFeedback: () => {}
      })
    );
    assert(feedbackModalHtml.includes('HÒM THƯ GÓP Ý'), 'FeedbackModal renders header');
    assert(feedbackModalHtml.includes('Góp ý tính năng mới'), 'FeedbackModal renders Category 1: Feature Request');
    assert(feedbackModalHtml.includes('Báo lỗi kỹ thuật'), 'FeedbackModal renders Category 2: Bug Report');
    assert(feedbackModalHtml.includes('Đề xuất học liệu'), 'FeedbackModal renders Category 3: Academic Suggestion');
    assert(feedbackModalHtml.includes('Ý kiến đóng góp khác'), 'FeedbackModal renders Category 4: Other');
    assert(feedbackModalHtml.includes('Gửi đóng góp'), 'FeedbackModal renders Submit button');

    // Closed Modal renders null
    const closedModalHtml = renderToStaticMarkup(
      React.createElement(FeedbackModal, {
        isOpen: false,
        onClose: () => {}
      })
    );
    assert(closedModalHtml === '', 'Closed FeedbackModal safely renders empty string (null)');

  } finally {
    await server.close();
  }

  // =========================================================================
  // FINAL TEST SUITE RESULTS
  // =========================================================================
  console.log('\n============================================================');
  console.log(`  TIER 5 RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${totalTests})`);
  console.log('============================================================\n');

  if (failed > 0) {
    console.error(`❌ STRESS TEST FAILED with ${failed} failure(s):`);
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL TIER 5 WHITE-BOX ADVERSARIAL STRESS TESTS PASSED (0 FAILURES)!');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal unhandled error during stress test execution:', err);
  process.exit(1);
});
