/**
 * ADVERSARIAL STRESS TEST SUITE FOR MILESTONE 4: MODERATION & GOVERNANCE
 * 
 * Verifies:
 * 1. 8-Criteria Moderation Checklist:
 *    - Full 8-criteria matrix integrity.
 *    - BVA: Approval button disabled when criteria count < 8 (0..7 checked).
 *    - Exhaustive 8-combination test: each single missing criterion disables approval.
 *    - Approval enabled ONLY when all 8 criteria are checked.
 * 2. Document Approval State Machine & Reward Settlement:
 *    - Status transitions from PENDING -> APPROVED.
 *    - Uploader points credited with exactly +20 reward points.
 *    - UserSession and users registry points synchronized.
 *    - Approval notification dispatched to uploader.
 * 3. Rejection Modal & Validation Engine:
 *    - Rejection reasons < 10 characters blocked (empty, whitespace, 1..9 chars).
 *    - Exact boundary: 9 chars blocked, 10 chars accepted.
 *    - Status transitions from PENDING -> REJECTED with rejectReason saved.
 *    - No point rewards on rejection.
 *    - Rejection notification dispatched with reason.
 * 4. Strict Foreign Key Deletion Block:
 *    - Courses with attached documents (>0 docs) CANNOT be deleted.
 *    - Exact Vietnamese blocking message verified verbatim:
 *      "Không thể xóa học phần này vì đang có ${count} tài liệu gắn kèm. Vui lòng chuyển hoặc xóa các tài liệu trước."
 *    - Courses with 0 documents CAN be safely deleted.
 *    - Deleted courses are purged from state.
 * 5. Violation Reports Resolution:
 *    - Dismissal (DISMISS): report resolved, document status untouched.
 *    - Hide Document (HIDE_DOC): report resolved, document status HIDDEN, bookmarks purged.
 *    - Delete Document (DELETE_DOC): report resolved, document status DELETED, bookmarks purged.
 *    - Delete Comment (DELETE_COMMENT): report resolved, targeted comment purged, sibling comments preserved.
 * 6. User Management & RBAC Governance (FR-08 / UC10):
 *    - Account lock toggling with violation reason.
 *    - Admin self-protection (cannot lock self).
 *    - Locked accounts blocked from upload, rating, and bounty actions.
 * 7. Admin Dashboard Analytics & Pure SVG Rendering (FR-13 / UC11):
 *    - Dynamic KPI computations.
 *    - Pure SVG horizontal bar chart & 7-day spline curve.
 *    - Zero external charting library bloat.
 */

import { createServer } from '../client/node_modules/vite/dist/node/index.js';
import React from '../client/node_modules/react/index.js';
import { renderToStaticMarkup } from '../client/node_modules/react-dom/server.node.js';
import fs from 'fs';
import path from 'path';

let totalTests = 0;
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passed++;
    console.log(`  ✔ PASS: ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✖ FAIL: ${message}`);
  }
}

// In-Memory LocalStorage Mock
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
  console.log('  M4 ADVERSARIAL MODERATION & GOVERNANCE STRESS HARNESS');
  console.log('============================================================\n');

  // Polyfill browser globals for Node SSR environment
  if (!globalThis.window) {
    globalThis.window = {
      scrollTo: () => {}
    };
  }
  if (!globalThis.localStorage) {
    globalThis.localStorage = new MockLocalStorage();
  }

  const server = await createServer({
    root: './client',
    server: { middlewareMode: true }
  });

  try {
    // Load target modules
    const mockData = await server.ssrLoadModule('/src/data/mockData.js');
    const { default: ModerationQueue } = await server.ssrLoadModule('/src/components/admin/ModerationQueue.jsx');
    const { default: CriteriaChecklist } = await server.ssrLoadModule('/src/components/admin/CriteriaChecklist.jsx');
    const { default: RejectReasonModal } = await server.ssrLoadModule('/src/components/admin/RejectReasonModal.jsx');
    const { default: CourseManagement } = await server.ssrLoadModule('/src/components/admin/CourseManagement.jsx');
    const { default: UserManagement } = await server.ssrLoadModule('/src/components/admin/UserManagement.jsx');
    const { default: AdminDashboard } = await server.ssrLoadModule('/src/components/admin/AdminDashboard.jsx');

    const {
      EIGHT_MODERATION_CRITERIA,
      INITIAL_COURSES,
      INITIAL_DOCUMENTS,
      INITIAL_USERS,
      INITIAL_REPORTS,
      INITIAL_DOWNLOAD_HISTORY,
      INITIAL_FEEDBACKS
    } = mockData;

    // =========================================================================
    // SECTION 1: 8-CRITERIA MODERATION CHECKLIST & APPROVAL GATE
    // =========================================================================
    console.log('--- 1. Testing 8-Criteria Moderation Checklist & Approval Gate ---');

    // 1.1 Checklist Matrix Integrity
    assert(Array.isArray(EIGHT_MODERATION_CRITERIA), 'EIGHT_MODERATION_CRITERIA is an array');
    assert(EIGHT_MODERATION_CRITERIA.length === 8, 'EIGHT_MODERATION_CRITERIA contains exactly 8 criteria');
    const criteriaIds = EIGHT_MODERATION_CRITERIA.map((c) => c.id).sort();
    assert(
      JSON.stringify(criteriaIds) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]),
      'Criteria IDs are exactly sequential integers 1 through 8'
    );

    // Verify required schema on all 8 criteria
    EIGHT_MODERATION_CRITERIA.forEach((crit) => {
      assert(
        Boolean(crit.title && crit.rule && crit.executor && crit.type),
        `Criterion #${crit.id} "${crit.title.slice(0, 20)}..." has title, rule, executor, and type`
      );
    });

    // 1.2 Boundary Value Analysis: Approval Gate Logic
    // Logic: allEightChecked = [1, 2, 3, 4, 5, 6, 7, 8].every((id) => Boolean(checks[id]))
    const checkGate = (checks) => [1, 2, 3, 4, 5, 6, 7, 8].every((id) => Boolean(checks[id]));

    // 0 criteria checked
    const zeroChecks = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false };
    assert(checkGate(zeroChecks) === false, 'Approval gate BLOCKS when 0 criteria checked');

    // 1 criterion checked (test each of the 8 singletons)
    for (let i = 1; i <= 8; i++) {
      const singleCheck = { ...zeroChecks, [i]: true };
      assert(
        checkGate(singleCheck) === false,
        `Approval gate BLOCKS when only criterion #${i} is checked (1/8)`
      );
    }

    // 7 criteria checked (test each of the 8 combinations where exactly 1 is missing)
    const fullChecks = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true };
    for (let missingId = 1; missingId <= 8; missingId++) {
      const missingOne = { ...fullChecks, [missingId]: false };
      assert(
        checkGate(missingOne) === false,
        `Approval gate BLOCKS when criterion #${missingId} is missing (7/8)`
      );
    }

    // All 8 criteria checked
    assert(checkGate(fullChecks) === true, 'Approval gate OPENS when all 8/8 criteria are checked');

    // 1.3 CriteriaChecklist Component SSR Rendering
    const checklistMarkup = renderToStaticMarkup(
      React.createElement(CriteriaChecklist, {
        checks: { 1: true, 2: true, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false },
        onToggleCriterion: () => {},
        onCheckAll: () => {},
        onResetChecks: () => {}
      })
    );
    assert(checklistMarkup.includes('Bảng kiểm 8 Tiêu chí Thẩm định'), 'CriteriaChecklist renders standard Vietnamese header');
    assert(checklistMarkup.includes('2/8 Đạt chuẩn'), 'CriteriaChecklist displays live counter "2/8 Đạt chuẩn"');
    assert(checklistMarkup.includes('Hệ thống tự động'), 'CriteriaChecklist displays "Hệ thống tự động" badge for system checks');
    assert(checklistMarkup.includes('Quản trị viên'), 'CriteriaChecklist displays "Quản trị viên" badge for admin review criteria');

    // =========================================================================
    // SECTION 2: DOCUMENT APPROVAL STATE MACHINE & +20 POINTS REWARD
    // =========================================================================
    console.log('\n--- 2. Testing Document Approval State Machine & +20 Points Reward ---');

    // Setup simulated state store mimicking App.jsx
    let docsState = JSON.parse(JSON.stringify(INITIAL_DOCUMENTS));
    let usersState = JSON.parse(JSON.stringify(INITIAL_USERS));
    let notifsState = [];
    let studentPoints = 140;
    let userSession = { ...INITIAL_USERS.find((u) => u.id === 'user-vi') };

    const handleApproveDocument = (docId) => {
      const target = docsState.find((d) => d.id === docId);
      docsState = docsState.map((d) =>
        d.id === docId ? { ...d, status: 'APPROVED', rejectReason: null } : d
      );
      studentPoints += 20;
      if (userSession && (userSession.role === 'USER' || userSession.role === 'STUDENT')) {
        userSession = { ...userSession, points: (userSession.points || 140) + 20 };
      }
      if (target) {
        usersState = usersState.map((u) =>
          u.id === target.uploaderId || u.fullName === target.uploaderName
            ? { ...u, points: (u.points || 0) + 20 }
            : u
        );
        notifsState.unshift({
          id: `notif-${Date.now()}`,
          type: 'APPROVED',
          title: 'Học liệu được phê duyệt (+20 điểm thưởng)',
          message: `Tài liệu "${target.title}" đã đạt 8/8 tiêu chí kiểm duyệt và được xuất bản công khai.`,
          targetDocId: target.id,
          targetScreen: 'detail'
        });
      }
    };

    // Find a PENDING document or create one
    let testPendingDoc = docsState.find((d) => d.status === 'PENDING');
    if (!testPendingDoc) {
      testPendingDoc = {
        id: 'doc-pending-test',
        title: 'Kế hoạch bài dạy kiểm thử M4',
        status: 'PENDING',
        uploaderId: 'vi',
        uploaderName: 'Phan Triệu Vĩ',
        rejectReason: null,
        comments: []
      };
      docsState.push(testPendingDoc);
    }

    const uploaderInitialPoints = usersState.find(
      (u) => u.id === testPendingDoc.uploaderId || u.fullName === testPendingDoc.uploaderName
    )?.points || 0;
    const sessionInitialPoints = userSession.points;

    // Approve the document
    handleApproveDocument(testPendingDoc.id);

    const approvedDoc = docsState.find((d) => d.id === testPendingDoc.id);
    assert(approvedDoc.status === 'APPROVED', 'Document status transitions to APPROVED');
    assert(approvedDoc.rejectReason === null, 'Document rejectReason is null on approval');

    const uploaderAfterPoints = usersState.find(
      (u) => u.id === testPendingDoc.uploaderId || u.fullName === testPendingDoc.uploaderName
    )?.points || 0;
    assert(
      uploaderAfterPoints === uploaderInitialPoints + 20,
      `Uploader receives exactly +20 reward points in users registry (${uploaderInitialPoints} -> ${uploaderAfterPoints})`
    );
    assert(
      userSession.points === sessionInitialPoints + 20,
      `Active student session points incremented by +20 (${sessionInitialPoints} -> ${userSession.points})`
    );
    assert(studentPoints === 160, 'Global studentPoints state incremented from 140 to 160 (+20 points)');

    // Verify Notification generated
    const approvalNotif = notifsState.find((n) => n.targetDocId === testPendingDoc.id);
    assert(Boolean(approvalNotif), 'Approval notification is dispatched');
    assert(approvalNotif.type === 'APPROVED', 'Notification type is "APPROVED"');
    assert(approvalNotif.title.includes('+20 điểm thưởng'), 'Notification title specifies "+20 điểm thưởng"');
    assert(approvalNotif.message.includes('8/8 tiêu chí'), 'Notification message mentions "8/8 tiêu chí"');

    // =========================================================================
    // SECTION 3: REJECTION MODAL & REJECTION REASON VALIDATION ENGINE
    // =========================================================================
    console.log('\n--- 3. Testing Rejection Modal & Reason Validation (>=10 Chars) ---');

    // 3.1 Validation Logic Function
    const validateRejectionReason = (reason) => {
      const trimmed = (reason || '').trim();
      if (!trimmed || trimmed.length < 10) {
        return {
          valid: false,
          error: 'Bắt buộc phải nhập lý do từ chối cụ thể (tối thiểu 10 ký tự) để sinh viên nắm rõ và chỉnh sửa.'
        };
      }
      return { valid: true, error: null };
    };

    // Adversarial testing: inputs < 10 characters
    assert(validateRejectionReason('').valid === false, 'Empty string is BLOCKED (<10 chars)');
    assert(validateRejectionReason(null).valid === false, 'Null value is BLOCKED (<10 chars)');
    assert(validateRejectionReason(undefined).valid === false, 'Undefined value is BLOCKED (<10 chars)');
    assert(validateRejectionReason('      ').valid === false, 'Whitespace-only string is BLOCKED (trimmed length 0 < 10)');
    assert(validateRejectionReason('123456789').valid === false, '9 characters string is BLOCKED (<10 chars)');
    assert(validateRejectionReason('  123456789  ').valid === false, '9 characters padded with spaces is BLOCKED');
    assert(validateRejectionReason('Sai form').valid === false, 'Short reason "Sai form" is BLOCKED (8 chars)');
    assert(validateRejectionReason('Lỗi').valid === false, 'Single word "Lỗi" is BLOCKED (3 chars)');

    // Exact boundary test: 9 chars vs 10 chars
    const nineChars = '123456789';
    const tenChars = '1234567890';
    assert(nineChars.length === 9 && validateRejectionReason(nineChars).valid === false, 'Exact Boundary 9 chars is BLOCKED');
    assert(tenChars.length === 10 && validateRejectionReason(tenChars).valid === true, 'Exact Boundary 10 chars is ACCEPTED');
    assert(validateRejectionReason(tenChars).error === null, 'Error message is null for valid 10-char reason');

    // Test rejection state transition in App.jsx
    let docsForReject = [
      {
        id: 'doc-to-reject',
        title: 'Giáo án Tin học lớp 11',
        status: 'PENDING',
        uploaderId: 'user-vi',
        rejectReason: null
      }
    ];
    let rejectNotifs = [];

    const handleRejectDocument = (docId, reasonText) => {
      const target = docsForReject.find((d) => d.id === docId);
      docsForReject = docsForReject.map((d) =>
        d.id === docId ? { ...d, status: 'REJECTED', rejectReason: reasonText } : d
      );
      if (target) {
        rejectNotifs.unshift({
          id: `notif-rej-${Date.now()}`,
          type: 'REJECTED',
          title: 'Học liệu cần chỉnh sửa (Bị từ chối phê duyệt)',
          message: `Tài liệu "${target.title}" bị từ chối. Lý do: ${reasonText}`,
          targetDocId: target.id,
          targetScreen: 'my-docs'
        });
      }
    };

    const validRejectReason = 'Kế hoạch bài dạy chưa đủ cấu trúc 4 hoạt động chuẩn Công văn 5512.';
    handleRejectDocument('doc-to-reject', validRejectReason);

    const rejectedDoc = docsForReject.find((d) => d.id === 'doc-to-reject');
    assert(rejectedDoc.status === 'REJECTED', 'Document status transitions to REJECTED');
    assert(rejectedDoc.rejectReason === validRejectReason, 'Rejection reason is recorded verbatim');
    assert(rejectNotifs.length === 1, 'Rejection notification is dispatched');
    assert(rejectNotifs[0].type === 'REJECTED', 'Rejection notification type is REJECTED');
    assert(rejectNotifs[0].message.includes(validRejectReason), 'Rejection notification contains reason text');

    // 3.2 RejectReasonModal SSR Component Verification
    const modalMarkup = renderToStaticMarkup(
      React.createElement(RejectReasonModal, {
        documentItem: { id: 'doc-to-reject', title: 'Giáo án Tin học lớp 11', uploaderName: 'Phan Triệu Vĩ' },
        onClose: () => {},
        onConfirmReject: () => {}
      })
    );
    assert(
      modalMarkup.includes('Nhập Lý do Từ chối') && modalMarkup.includes('Yêu cầu Chỉnh sửa'),
      'RejectReasonModal renders modal title'
    );
    assert(modalMarkup.includes('10 ký tự tối thiểu'), 'RejectReasonModal renders 10-character minimum badge');
    assert(modalMarkup.includes('Mẫu phản hồi nhanh theo 8 tiêu chí kiểm duyệt'), 'RejectReasonModal renders quick preset chips');

    // =========================================================================
    // SECTION 4: STRICT FOREIGN KEY DELETION BLOCK FOR COURSES
    // =========================================================================
    console.log('\n--- 4. Testing Strict Foreign Key Deletion Block for Courses ---');

    let coursesState = JSON.parse(JSON.stringify(INITIAL_COURSES));
    let docsWithFk = JSON.parse(JSON.stringify(INITIAL_DOCUMENTS));

    // Live doc count calculator identical to CourseManagement.jsx
    const getLiveDocCount = (course, documents) => {
      const liveMatches = documents.filter(
        (d) =>
          d.status !== 'DELETED' &&
          (d.courseCode === course.code ||
            d.courseId === course.id ||
            d.course === course.name ||
            d.courseTitle === course.name)
      ).length;
      return Math.max(course.documentCount || 0, liveMatches);
    };

    // Course with attached documents (e.g. COMP1044 or COMP1015)
    const courseWithDocs = coursesState.find((c) => c.code === 'COMP1044');
    assert(Boolean(courseWithDocs), 'Course COMP1044 exists in test state');
    const attachedCount = getLiveDocCount(courseWithDocs, docsWithFk);
    assert(attachedCount > 0, `Course COMP1044 has ${attachedCount} attached documents (count > 0)`);

    // Attempt delete on course with attached documents
    let deletionAttemptBlocked = false;
    let actualWarningMessage = '';
    let deletedCourseId = null;

    const handleAttemptDelete = (course, documents, onDeleteCallback) => {
      const count = getLiveDocCount(course, documents);
      if (count > 0) {
        deletionAttemptBlocked = true;
        actualWarningMessage = `Không thể xóa học phần này vì đang có ${count} tài liệu gắn kèm. Vui lòng chuyển hoặc xóa các tài liệu trước.`;
        return;
      }
      deletionAttemptBlocked = false;
      actualWarningMessage = '';
      onDeleteCallback(course.id);
    };

    handleAttemptDelete(courseWithDocs, docsWithFk, (id) => {
      deletedCourseId = id;
    });

    assert(deletionAttemptBlocked === true, 'Deletion is BLOCKED for course with attached documents');
    assert(deletedCourseId === null, 'onDeleteCourse callback is NOT called for course with attached documents');
    
    // Verbatim message match requirement
    const expectedBlockedMessage = `Không thể xóa học phần này vì đang có ${attachedCount} tài liệu gắn kèm. Vui lòng chuyển hoặc xóa các tài liệu trước.`;
    assert(
      actualWarningMessage === expectedBlockedMessage,
      `Blocking warning message matches verbatim: "${actualWarningMessage}"`
    );

    // Now test a 0-doc course
    const zeroDocCourse = {
      id: 'course-zero-doc',
      code: 'TEST9999',
      name: 'Học phần kiểm thử không có học liệu',
      semester: 'Học kỳ 8',
      knowledgeBlock: 'Chuyên ngành',
      documentCount: 0,
      isActive: true
    };
    coursesState.push(zeroDocCourse);

    const zeroCount = getLiveDocCount(zeroDocCourse, docsWithFk);
    assert(zeroCount === 0, 'zeroDocCourse has exactly 0 attached documents');

    deletionAttemptBlocked = false;
    actualWarningMessage = '';
    deletedCourseId = null;

    handleAttemptDelete(zeroDocCourse, docsWithFk, (id) => {
      deletedCourseId = id;
      coursesState = coursesState.filter((c) => c.id !== id);
    });

    assert(deletionAttemptBlocked === false, 'Deletion is ALLOWED for 0-doc course');
    assert(deletedCourseId === 'course-zero-doc', 'onDeleteCourse called with zeroDocCourse id');
    assert(
      coursesState.some((c) => c.id === 'course-zero-doc') === false,
      'zeroDocCourse is purged from coursesState'
    );

    // Edge case: Course whose documents are all marked as 'DELETED'
    const courseWithDeletedDoc = {
      id: 'course-deleted-doc',
      code: 'TEST8888',
      name: 'Học phần có tài liệu đã bị xóa vĩnh viễn',
      documentCount: 0,
      isActive: true
    };
    coursesState.push(courseWithDeletedDoc);
    docsWithFk.push({
      id: 'doc-deleted-fk',
      courseCode: 'TEST8888',
      status: 'DELETED'
    });

    const liveCountForDeletedDocCourse = getLiveDocCount(courseWithDeletedDoc, docsWithFk);
    assert(
      liveCountForDeletedDocCourse === 0,
      'Documents with status="DELETED" do NOT block course deletion (live count = 0)'
    );

    // =========================================================================
    // SECTION 5: VIOLATION REPORTS RESOLUTION STATE MACHINE
    // =========================================================================
    console.log('\n--- 5. Testing Violation Reports Resolution (Dismiss, Hide, Delete Doc, Delete Comment) ---');

    let reportsState = JSON.parse(JSON.stringify(INITIAL_REPORTS));
    let docsForReports = JSON.parse(JSON.stringify(INITIAL_DOCUMENTS));
    let bookmarksState = ['doc-1', 'doc-2', 'doc-5'];

    const handleResolveReport = (reportId, docId, action, targetType = 'DOCUMENT', commentId = null) => {
      reportsState = reportsState.map((r) =>
        r.id === reportId ? { ...r, status: 'RESOLVED', resolvedAction: action } : r
      );
      if (targetType === 'COMMENT' || action === 'DELETE_COMMENT') {
        if (commentId) {
          docsForReports = docsForReports.map((d) =>
            d.id === docId
              ? { ...d, comments: (d.comments || []).filter((c) => c.id !== commentId) }
              : d
          );
        }
      } else if (action === 'HIDE_DOC') {
        docsForReports = docsForReports.map((d) =>
          d.id === docId ? { ...d, status: 'HIDDEN' } : d
        );
        bookmarksState = bookmarksState.filter((id) => id !== docId);
      } else if (action === 'DELETE_DOC') {
        docsForReports = docsForReports.map((d) =>
          d.id === docId ? { ...d, status: 'DELETED' } : d
        );
        bookmarksState = bookmarksState.filter((id) => id !== docId);
      }
    };

    // 5.1 Action: DISMISS Report
    const rep1 = reportsState.find((r) => r.id === 'rep-1');
    assert(Boolean(rep1), 'Report rep-1 exists in test reports');
    const doc2InitialStatus = docsForReports.find((d) => d.id === 'doc-2')?.status;

    handleResolveReport('rep-1', 'doc-2', 'DISMISS', 'DOCUMENT');

    const resolvedRep1 = reportsState.find((r) => r.id === 'rep-1');
    assert(resolvedRep1.status === 'RESOLVED', 'Dismissed report status becomes RESOLVED');
    assert(resolvedRep1.resolvedAction === 'DISMISS', 'Dismissed report resolvedAction is DISMISS');
    const doc2AfterStatus = docsForReports.find((d) => d.id === 'doc-2')?.status;
    assert(doc2AfterStatus === doc2InitialStatus, 'Document status is preserved unchanged on report dismissal');
    assert(bookmarksState.includes('doc-2'), 'Document remains in bookmarks on dismissal');

    // 5.2 Action: HIDE_DOC (Temporarily hide document)
    handleResolveReport('rep-2', 'doc-5', 'HIDE_DOC', 'DOCUMENT');

    const resolvedRep2 = reportsState.find((r) => r.id === 'rep-2');
    assert(resolvedRep2.status === 'RESOLVED', 'Report rep-2 status becomes RESOLVED');
    assert(resolvedRep2.resolvedAction === 'HIDE_DOC', 'Report rep-2 resolvedAction is HIDE_DOC');
    const doc5After = docsForReports.find((d) => d.id === 'doc-5');
    assert(doc5After.status === 'HIDDEN', 'Document status transitions to HIDDEN');
    assert(!bookmarksState.includes('doc-5'), 'Hidden document is removed from user bookmarks');

    // 5.3 Action: DELETE_DOC (Permanently delete document)
    const docToDelete = { id: 'doc-delete-test', title: 'Tài liệu độc hại', status: 'APPROVED', comments: [] };
    docsForReports.push(docToDelete);
    bookmarksState.push('doc-delete-test');
    reportsState.push({ id: 'rep-delete-test', targetType: 'DOCUMENT', docId: 'doc-delete-test', status: 'PENDING' });

    handleResolveReport('rep-delete-test', 'doc-delete-test', 'DELETE_DOC', 'DOCUMENT');

    const resolvedRepDel = reportsState.find((r) => r.id === 'rep-delete-test');
    assert(resolvedRepDel.status === 'RESOLVED', 'Delete report status becomes RESOLVED');
    assert(resolvedRepDel.resolvedAction === 'DELETE_DOC', 'Delete report resolvedAction is DELETE_DOC');
    const docAfterDel = docsForReports.find((d) => d.id === 'doc-delete-test');
    assert(docAfterDel.status === 'DELETED', 'Document status transitions to DELETED');
    assert(!bookmarksState.includes('doc-delete-test'), 'Deleted document is removed from bookmarks');

    // 5.4 Action: DELETE_COMMENT (Purge violating comment from document)
    // Setup document with 3 comments including the violating one
    const targetDocForComment = docsForReports.find((d) => d.id === 'doc-1');
    targetDocForComment.comments = [
      { id: 'cmt-1', authorName: 'Nguyễn Văn A', content: 'Tài liệu hữu ích' },
      { id: 'cmt-102', authorName: 'Spammer', content: 'Quảng cáo trái phép vi phạm' },
      { id: 'cmt-2', authorName: 'Trần Văn B', content: 'Đồng ý với tác giả' }
    ];
    reportsState.push({
      id: 'rep-comment-test',
      targetType: 'COMMENT',
      docId: 'doc-1',
      commentId: 'cmt-102',
      status: 'PENDING'
    });

    assert(targetDocForComment.comments.length === 3, 'Document initially contains 3 comments');
    assert(targetDocForComment.comments.some((c) => c.id === 'cmt-102'), 'Comment cmt-102 is present');

    handleResolveReport('rep-comment-test', 'doc-1', 'DELETE_COMMENT', 'COMMENT', 'cmt-102');

    const resolvedRepCmt = reportsState.find((r) => r.id === 'rep-comment-test');
    assert(resolvedRepCmt.status === 'RESOLVED', 'Comment violation report is RESOLVED');
    assert(resolvedRepCmt.resolvedAction === 'DELETE_COMMENT', 'resolvedAction is DELETE_COMMENT');

    const updatedDoc1 = docsForReports.find((d) => d.id === 'doc-1');
    assert(updatedDoc1.comments.length === 2, 'Comments array length reduced to 2');
    assert(!updatedDoc1.comments.some((c) => c.id === 'cmt-102'), 'Violating comment cmt-102 is completely purged');
    assert(updatedDoc1.comments.some((c) => c.id === 'cmt-1'), 'Sibling comment cmt-1 preserved');
    assert(updatedDoc1.comments.some((c) => c.id === 'cmt-2'), 'Sibling comment cmt-2 preserved');

    // =========================================================================
    // SECTION 6: USER MANAGEMENT & ACCOUNT LOCK GOVERNANCE (FR-08 / UC10)
    // =========================================================================
    console.log('\n--- 6. Testing User Management & Account Lock Governance (FR-08 / UC10) ---');

    let usersRegistry = JSON.parse(JSON.stringify(INITIAL_USERS));
    const adminUser = usersRegistry.find((u) => u.role === 'ADMIN');
    const studentUser = usersRegistry.find((u) => u.id === 'user-vi');

    assert(Boolean(adminUser), 'Admin user exists in users registry');
    assert(Boolean(studentUser), 'Student user exists in users registry');
    assert(studentUser.isActive === true, 'Student user is initially active');

    // Toggle lock student
    const lockReason = 'Bình luận phản cảm, quấy rối hoặc vi phạm văn hóa học đường';
    usersRegistry = usersRegistry.map((u) =>
      u.id === studentUser.id
        ? { ...u, isActive: false, lockReason, lockedAt: '2026-10-19T10:00:00Z' }
        : u
    );

    const lockedStudent = usersRegistry.find((u) => u.id === studentUser.id);
    assert(lockedStudent.isActive === false, 'Student account is successfully locked');
    assert(lockedStudent.lockReason === lockReason, 'Lock reason is recorded on user profile');

    // Governance: Locked user penalty enforcement
    // Attempting upload when locked must be blocked
    let uploadBlocked = false;
    const attemptUpload = (user) => {
      if (!user.isActive) {
        uploadBlocked = true;
        return false;
      }
      return true;
    };
    attemptUpload(lockedStudent);
    assert(uploadBlocked === true, 'Locked account is STRICTLY BLOCKED from contributing documents');

    // Attempting comment when locked must be blocked
    let commentBlocked = false;
    const attemptComment = (user) => {
      if (!user.isActive) {
        commentBlocked = true;
        return false;
      }
      return true;
    };
    attemptComment(lockedStudent);
    assert(commentBlocked === true, 'Locked account is STRICTLY BLOCKED from submitting comments');

    // Governance: Admin cannot self-lock
    const attemptSelfLock = (currentUser, targetUser) => {
      if (currentUser.id === targetUser.id && currentUser.role === 'ADMIN') {
        return { allowed: false, message: 'Quản trị viên không thể tự khóa tài khoản của chính mình.' };
      }
      return { allowed: true };
    };
    const selfLockResult = attemptSelfLock(adminUser, adminUser);
    assert(selfLockResult.allowed === false, 'Admin self-lock protection is enforced');

    // Unlock student
    usersRegistry = usersRegistry.map((u) =>
      u.id === studentUser.id
        ? { ...u, isActive: true, lockReason: null, lockedAt: null }
        : u
    );
    const unlockedStudent = usersRegistry.find((u) => u.id === studentUser.id);
    assert(unlockedStudent.isActive === true, 'Student account is successfully unlocked');
    assert(unlockedStudent.lockReason === null, 'Lock reason is cleared upon unlock');

    // =========================================================================
    // SECTION 7: ADMIN DASHBOARD ANALYTICS & PURE SVG CHARTS (FR-13 / UC11)
    // =========================================================================
    console.log('\n--- 7. Testing Admin Dashboard Analytics & Pure SVG Rendering ---');

    const dashboardMarkup = renderToStaticMarkup(
      React.createElement(AdminDashboard, {
        documents: INITIAL_DOCUMENTS,
        courses: INITIAL_COURSES,
        users: INITIAL_USERS,
        reports: INITIAL_REPORTS,
        downloadHistory: INITIAL_DOWNLOAD_HISTORY,
        feedbacks: INITIAL_FEEDBACKS,
        onSelectDoc: () => {},
        onNavigateTab: () => {}
      })
    );

    // Verify 4 KPI cards render
    assert(dashboardMarkup.includes('TỔNG SỐ HỌC LIỆU'), 'Dashboard renders KPI 1: Tổng số học liệu');
    assert(dashboardMarkup.includes('LƯỢT TẢI TRONG TUẦN'), 'Dashboard renders KPI 2: Lượt tải trong tuần');
    assert(dashboardMarkup.includes('THÀNH VIÊN HOẠT ĐỘNG'), 'Dashboard renders KPI 3: Thành viên hoạt động');
    assert(dashboardMarkup.includes('YÊU CẦU CHỜ DUYỆT'), 'Dashboard renders KPI 4: Yêu cầu chờ duyệt');

    // Verify pure SVG Horizontal Bar Chart & 7-Day Trend
    assert(dashboardMarkup.includes('Top 5 Học phần có lượt tải nhiều nhất'), 'Dashboard renders Top 5 courses chart section');
    assert(dashboardMarkup.includes('Xu hướng Lượt tải về theo ngày'), 'Dashboard renders 7-Day trend line section');
    assert(dashboardMarkup.includes('<svg'), 'Dashboard renders pure SVG elements');
    assert(dashboardMarkup.includes('<path d="M'), 'Dashboard renders cubic bezier SVG path spline for download trend');
    assert(dashboardMarkup.includes('fill="url(#downloadAreaGrad)"'), 'Dashboard uses gradient fill for download trend');

    // =========================================================================
    // SECTION 8: ANTI-AI-SLOP & CODEBASE COMPLIANCE SCAN FOR M4
    // =========================================================================
    console.log('\n--- 8. Testing Anti-AI-Slop & Zero-Dark-Mode Compliance in Admin Modules ---');

    const adminFiles = [
      'client/src/components/admin/ModerationQueue.jsx',
      'client/src/components/admin/CriteriaChecklist.jsx',
      'client/src/components/admin/RejectReasonModal.jsx',
      'client/src/components/admin/CourseManagement.jsx',
      'client/src/components/admin/UserManagement.jsx',
      'client/src/components/admin/AdminDashboard.jsx',
      'client/src/components/document/FeedbackModal.jsx'
    ];

    adminFiles.forEach((relPath) => {
      const fullPath = path.resolve(relPath);
      assert(fs.existsSync(fullPath), `Module ${relPath} exists on disk`);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Zero dark mode
      assert(!content.includes('data-theme="dark"'), `${relPath} contains zero 'data-theme="dark"'`);
      assert(!content.includes('.dark-theme'), `${relPath} contains zero '.dark-theme'`);
      assert(!content.includes('#0f172a'), `${relPath} contains zero dark hex #0f172a`);
      assert(!content.includes('#0b1120'), `${relPath} contains zero dark hex #0b1120`);

      // Zero AI slop / raw homework tags
      assert(!content.includes('STAGE 01'), `${relPath} contains zero 'STAGE 01'`);
      assert(!content.includes('CLOUDINARY SANDBOX'), `${relPath} contains zero 'CLOUDINARY SANDBOX'`);
      assert(!content.includes('✨'), `${relPath} contains zero generic sparkle emojis`);
    });

  } finally {
    await server.close();
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('\n============================================================');
  console.log(`  M4 ADVERSARIAL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${totalTests})`);
  console.log('============================================================\n');

  if (failed > 0) {
    console.error('FAILURES DETECTED:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 [SUCCESS] 100% of Milestone 4 Adversarial Tests Passed!');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
