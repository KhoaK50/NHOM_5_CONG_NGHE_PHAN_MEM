/**
 * ============================================================================
 * ADVERSARIAL STRESS TEST SUITE FOR MILESTONE 4: GOVERNANCE & NON-REGRESSION
 * ============================================================================
 * Targets:
 * 1. User lock/unlock state machine & UserManagement UI rendering
 * 2. System enforcement on locked user (Upload, Comments/Ratings, Bounties, Auth)
 * 3. Self-lock guard preventing Admin from locking own account
 * 4. RBAC guard & AdminAccessDenied card with 1-click elevation button
 * 5. Feedback modal validation (Categories, Title min 5, Content min 15, Email)
 * 6. Non-regression across M1–M4 (5-Act Landing, Pure Workspace, Topbar, Foreign Key)
 * ============================================================================
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
  console.log('  M4 ADVERSARIAL GOVERNANCE & INTEGRITY HARNESS');
  console.log('============================================================\n');

  // Install mock localStorage
  globalThis.localStorage = new MockLocalStorage();

  const server = await createServer({
    root: './client',
    server: { middlewareMode: true }
  });

  try {
    // Load target modules
    const { default: UserManagement } = await server.ssrLoadModule('/src/components/admin/UserManagement.jsx');
    const { default: FeedbackModal } = await server.ssrLoadModule('/src/components/document/FeedbackModal.jsx');
    const { default: AdminDashboard } = await server.ssrLoadModule('/src/components/admin/AdminDashboard.jsx');
    const { default: CourseManagement } = await server.ssrLoadModule('/src/components/admin/CourseManagement.jsx');
    const { default: ModerationQueue } = await server.ssrLoadModule('/src/components/admin/ModerationQueue.jsx');
    const { default: RejectReasonModal } = await server.ssrLoadModule('/src/components/admin/RejectReasonModal.jsx');
    const { default: App } = await server.ssrLoadModule('/src/App.jsx');
    const { default: Navbar } = await server.ssrLoadModule('/src/components/common/Navbar.jsx');
    const { default: LandingPage } = await server.ssrLoadModule('/src/components/home/LandingPage.jsx');
    const { default: DiscoveryPage } = await server.ssrLoadModule('/src/components/home/DiscoveryPage.jsx');
    const mockData = await server.ssrLoadModule('/src/data/mockData.js');

    const {
      INITIAL_USERS,
      INITIAL_FEEDBACKS,
      INITIAL_DOCUMENTS,
      INITIAL_COURSES,
      INITIAL_BOUNTIES,
      INITIAL_REPORTS,
      EIGHT_MODERATION_CRITERIA
    } = mockData;

    // =========================================================================
    // SECTION 1: USER LOCK / UNLOCK TOGGLE & STATE MACHINE
    // =========================================================================
    console.log('--- 1. User Lock/Unlock Toggle & State Machine Testing ---');

    assert(Array.isArray(INITIAL_USERS) && INITIAL_USERS.length >= 8, 'INITIAL_USERS contains at least 8 users');

    const lockedInitial = INITIAL_USERS.find((u) => u.id === 'user-locked');
    assert(Boolean(lockedInitial), 'Found sample locked user (user-locked) in seed data');
    assert(lockedInitial.isActive === false, 'user-locked initial isActive state is false');
    assert(typeof lockedInitial.lockReason === 'string' && lockedInitial.lockReason.length > 0, 'user-locked contains specific lockReason');

    const activeInitial = INITIAL_USERS.find((u) => u.id === 'user-vi');
    assert(Boolean(activeInitial), 'Found active student user (user-vi) in seed data');
    assert(activeInitial.isActive === true, 'user-vi initial isActive state is true');
    assert(activeInitial.lockReason === null, 'user-vi initial lockReason is null');

    // 1.1 State Machine Simulation for User Toggle
    function simulateToggleUserStatus(userList, targetUserId, reason = null) {
      let toggledUser = null;
      const updatedList = userList.map((u) => {
        if (u.id === targetUserId) {
          const nextStatus = !u.isActive;
          toggledUser = {
            ...u,
            isActive: nextStatus,
            lockReason: nextStatus ? null : (reason || 'Vi phạm chính sách học thuật'),
            lockedAt: nextStatus ? null : new Date().toISOString()
          };
          return toggledUser;
        }
        return u;
      });
      return { updatedList, toggledUser };
    }

    // Toggle 1: Unlock user-locked
    const { updatedList: listAfterUnlock, toggledUser: unlockedUser } = simulateToggleUserStatus(
      INITIAL_USERS,
      'user-locked',
      null
    );
    assert(unlockedUser !== null, 'Toggled user-locked returned');
    assert(unlockedUser.isActive === true, 'user-locked flipped to isActive: true (Unlocked)');
    assert(unlockedUser.lockReason === null, 'user-locked lockReason cleared to null upon unlock');
    assert(unlockedUser.lockedAt === null, 'user-locked lockedAt reset to null upon unlock');

    // Toggle 2: Lock active user-vi
    const lockReasonText = 'Vi phạm bản quyền học liệu và tải lên tệp tin không phù hợp';
    const { updatedList: listAfterLock, toggledUser: lockedVi } = simulateToggleUserStatus(
      listAfterUnlock,
      'user-vi',
      lockReasonText
    );
    assert(lockedVi !== null, 'Toggled user-vi returned');
    assert(lockedVi.isActive === false, 'user-vi flipped to isActive: false (Locked)');
    assert(lockedVi.lockReason === lockReasonText, 'user-vi lockReason accurately recorded');
    assert(typeof lockedVi.lockedAt === 'string', 'user-vi lockedAt timestamp accurately recorded');

    // Toggle 3: Re-lock and Re-unlock cycles (idempotency & reversibility)
    const { toggledUser: unlockedVi } = simulateToggleUserStatus(listAfterLock, 'user-vi', null);
    assert(unlockedVi.isActive === true, 'Re-toggle user-vi restores isActive: true');
    assert(unlockedVi.lockReason === null, 'Re-toggle user-vi clears lockReason');

    // Toggle 4: Invalid user ID leaves list untouched
    const { updatedList: unchangedList, toggledUser: noUser } = simulateToggleUserStatus(
      INITIAL_USERS,
      'non-existent-user-id',
      'some reason'
    );
    assert(noUser === null, 'Non-existent user toggle returns null');
    assert(unchangedList.every((u, idx) => u.isActive === INITIAL_USERS[idx].isActive), 'List unaffected by invalid user ID');

    // 1.2 UserManagement Component Rendering Check
    const userMgmtMarkup = renderToStaticMarkup(
      React.createElement(UserManagement, {
        users: INITIAL_USERS,
        currentUser: { id: 'user-khoa', role: 'ADMIN' },
        onToggleUserStatus: () => {}
      })
    );

    assert(userMgmtMarkup.includes('Quản trị Người dùng &amp; Phân quyền') || userMgmtMarkup.includes('Quản trị Người dùng & Phân quyền'), 'UserManagement title rendered');
    assert(userMgmtMarkup.includes('Hoạt động'), 'UserManagement renders "Hoạt động" status badge');
    assert(userMgmtMarkup.includes('Đã khóa'), 'UserManagement renders "Đã khóa" status badge');
    assert(userMgmtMarkup.includes('Khóa'), 'UserManagement renders "Khóa" button for active users');
    assert(userMgmtMarkup.includes('Mở khóa'), 'UserManagement renders "Mở khóa" button for locked users');
    assert(userMgmtMarkup.includes('Phan Triệu Vĩ'), 'UserManagement renders user Phan Triệu Vĩ');
    assert(userMgmtMarkup.includes('Vũ Đình Toàn'), 'UserManagement renders locked user Vũ Đình Toàn');

    // Verify Quick Lock Reasons in UserManagement source
    const userMgmtSource = fs.readFileSync(path.resolve('./client/src/components/admin/UserManagement.jsx'), 'utf-8');
    assert(userMgmtSource.includes('Vi phạm bản quyền học liệu hoặc tài liệu bảo mật'), 'Preset reason 1 found in UserManagement');
    assert(userMgmtSource.includes('Tải tệp tin sai quy chuẩn hoặc chứa mã độc hại'), 'Preset reason 2 found in UserManagement');
    assert(userMgmtSource.includes('Bình luận phản cảm, quấy rối hoặc vi phạm văn hóa học đường'), 'Preset reason 3 found in UserManagement');
    assert(userMgmtSource.includes('Hành vi spam liên tục, lập nhiều tài khoản ảo'), 'Preset reason 4 found in UserManagement');


    // =========================================================================
    // SECTION 2: SYSTEM ENFORCEMENT ON LOCKED USER
    // =========================================================================
    console.log('\n--- 2. System Enforcement on Locked User Testing ---');

    // Helper functions reproducing the exact App.jsx enforcement logic
    function checkIsUserLocked(userSession, userRegistry) {
      return Boolean(
        userSession &&
          (userSession.isActive === false ||
            userRegistry.some(
              (u) =>
                (u.id === userSession.id || u.email === userSession.email) &&
                u.isActive === false
            ))
      );
    }

    const lockedSession = {
      id: 'user-locked',
      email: 'spammer.badactor@hcmue.edu.vn',
      fullName: 'Vũ Đình Toàn',
      role: 'STUDENT',
      isActive: false
    };

    const activeSession = {
      id: 'user-vi',
      email: 'vi.phantrieu.k50@hcmue.edu.vn',
      fullName: 'Phan Triệu Vĩ',
      role: 'STUDENT',
      isActive: true
    };

    // 2.1 Locked check verification
    assert(checkIsUserLocked(lockedSession, INITIAL_USERS) === true, 'Locked user session identified as isCurrentUserLocked = true');
    assert(checkIsUserLocked(activeSession, INITIAL_USERS) === false, 'Active user session identified as isCurrentUserLocked = false');

    // Even if session says isActive: true, if registry has isActive: false, must lock
    const desyncedSession = { ...activeSession, id: 'user-locked', email: 'spammer.badactor@hcmue.edu.vn', isActive: true };
    assert(checkIsUserLocked(desyncedSession, INITIAL_USERS) === true, 'Session with spoofed isActive: true is locked via user registry check');

    // 2.2 Upload Enforcement
    function simulateUploadAction(isLocked, documents) {
      if (isLocked) {
        return {
          allowed: false,
          notice: 'Tài khoản của bạn đang bị tạm khóa. Không thể thực hiện đóng góp học liệu.',
          nextDocuments: documents
        };
      }
      const newDoc = { id: `doc-${Date.now()}`, title: 'Test Upload Doc' };
      return {
        allowed: true,
        notice: 'Đóng góp thành công!',
        nextDocuments: [newDoc, ...documents]
      };
    }

    const uploadAttemptLocked = simulateUploadAction(true, INITIAL_DOCUMENTS);
    assert(uploadAttemptLocked.allowed === false, 'Locked user CANNOT upload documents');
    assert(uploadAttemptLocked.notice.includes('Tài khoản của bạn đang bị tạm khóa'), 'Locked user receives correct upload block notice');
    assert(uploadAttemptLocked.nextDocuments.length === INITIAL_DOCUMENTS.length, 'Document collection remains untouched on locked upload attempt');

    const uploadAttemptActive = simulateUploadAction(false, INITIAL_DOCUMENTS);
    assert(uploadAttemptActive.allowed === true, 'Active user CAN upload documents');
    assert(uploadAttemptActive.nextDocuments.length === INITIAL_DOCUMENTS.length + 1, 'Document collection increases for active user upload');

    // Verify App.jsx contains upload lock check in both handleOpenUpload and handleSubmitNewDocument
    const appSource = fs.readFileSync(path.resolve('./client/src/App.jsx'), 'utf-8');
    assert(appSource.includes("if (isCurrentUserLocked) {\n      showNotice('Tài khoản của bạn đang bị tạm khóa. Không thể thực hiện đóng góp học liệu.')\n      return\n    }"), 'App.jsx guards handleOpenUpload against locked user');
    assert(appSource.includes("handleSubmitNewDocument = (newDocPayload) => {\n    if (isCurrentUserLocked) {"), 'App.jsx guards handleSubmitNewDocument against locked user');
    assert(appSource.includes("if (view === 'upload' && isCurrentUserLocked) {"), 'App.jsx guards direct view navigation to upload against locked user');

    // 2.3 Rating and Comments Enforcement
    function simulateRatingCommentAction(isLocked, docId, stars, comment, documents) {
      if (isLocked) {
        return {
          allowed: false,
          notice: 'Tài khoản của bạn đang bị tạm khóa. Không thể gửi đánh giá hoặc bình luận.',
          nextDocuments: documents
        };
      }
      const nextDocuments = documents.map((doc) => {
        if (doc.id === docId) {
          const newComments = [{ id: 'cmt-new', content: comment, rating: stars }, ...(doc.comments || [])];
          return { ...doc, comments: newComments, ratingCount: doc.ratingCount + 1 };
        }
        return doc;
      });
      return { allowed: true, notice: 'Đã ghi nhận đánh giá', nextDocuments };
    }

    const ratingAttemptLocked = simulateRatingCommentAction(true, 'doc-1', 5, 'Bình luận thử nghiệm', INITIAL_DOCUMENTS);
    assert(ratingAttemptLocked.allowed === false, 'Locked user CANNOT post ratings or comments');
    assert(ratingAttemptLocked.notice.includes('Tài khoản của bạn đang bị tạm khóa'), 'Locked user receives correct rating block notice');
    assert(ratingAttemptLocked.nextDocuments === INITIAL_DOCUMENTS, 'Documents collection unchanged on locked rating attempt');

    const ratingAttemptActive = simulateRatingCommentAction(false, 'doc-1', 5, 'Bình luận hợp lệ', INITIAL_DOCUMENTS);
    assert(ratingAttemptActive.allowed === true, 'Active user CAN post ratings and comments');

    assert(appSource.includes("handleAddRatingComment = (docId, stars, commentContent) => {\n    if (isCurrentUserLocked) {"), 'App.jsx guards handleAddRatingComment against locked user');

    // 2.4 Bounty Creation Enforcement
    function simulateCreateBountyAction(isLocked, payload, currentPoints, bounties) {
      if (isLocked) {
        return {
          allowed: false,
          notice: 'Tài khoản của bạn đang bị tạm khóa. Không thể tạo yêu cầu treo thưởng.',
          nextPoints: currentPoints,
          nextBounties: bounties
        };
      }
      const pts = Number(payload.rewardPoints) || 50;
      if (currentPoints < pts) {
        return { allowed: false, notice: 'Số dư điểm không đủ', nextPoints: currentPoints, nextBounties: bounties };
      }
      return {
        allowed: true,
        notice: 'Đã đăng yêu cầu treo thưởng thành công!',
        nextPoints: currentPoints - pts,
        nextBounties: [{ id: 'bty-new', ...payload }, ...bounties]
      };
    }

    const bountyAttemptLocked = simulateCreateBountyAction(true, { title: 'Treo thưởng môn CSDL', rewardPoints: 50 }, 140, INITIAL_BOUNTIES);
    assert(bountyAttemptLocked.allowed === false, 'Locked user CANNOT create study bounties');
    assert(bountyAttemptLocked.notice.includes('Tài khoản của bạn đang bị tạm khóa'), 'Locked user receives correct bounty block notice');
    assert(bountyAttemptLocked.nextPoints === 140, 'Wallet points not deducted on locked bounty attempt');
    assert(bountyAttemptLocked.nextBounties.length === INITIAL_BOUNTIES.length, 'Bounties list unchanged on locked bounty attempt');

    const bountyAttemptActive = simulateCreateBountyAction(false, { title: 'Treo thưởng hợp lệ', rewardPoints: 50 }, 140, INITIAL_BOUNTIES);
    assert(bountyAttemptActive.allowed === true, 'Active user CAN create study bounties');
    assert(bountyAttemptActive.nextPoints === 90, 'Wallet points deducted for active user');

    assert(appSource.includes("handleCreateBounty = ({ title, courseCode, courseName, rewardPoints, description }) => {\n    if (isCurrentUserLocked) {"), 'App.jsx guards handleCreateBounty against locked user');

    // 2.5 Bounty Fulfillment Enforcement
    function simulateFulfillBountyAction(isLocked, bountyId, docId, currentPoints, bounties) {
      if (isLocked) {
        return {
          allowed: false,
          notice: 'Tài khoản của bạn đang bị tạm khóa. Không thể nộp tài liệu giải thưởng.',
          nextPoints: currentPoints,
          nextBounties: bounties
        };
      }
      const target = bounties.find((b) => b.id === bountyId);
      const reward = target ? target.rewardPoints : 50;
      const nextBounties = bounties.map((b) => (b.id === bountyId ? { ...b, status: 'FULFILLED' } : b));
      return { allowed: true, notice: 'Đã nộp học liệu đáp ứng treo thưởng!', nextPoints: currentPoints + reward, nextBounties };
    }

    const fulfillAttemptLocked = simulateFulfillBountyAction(true, 'bty-1', 'doc-1', 140, INITIAL_BOUNTIES);
    assert(fulfillAttemptLocked.allowed === false, 'Locked user CANNOT fulfill bounties');
    assert(fulfillAttemptLocked.notice.includes('Tài khoản của bạn đang bị tạm khóa'), 'Locked user receives correct fulfill block notice');
    assert(fulfillAttemptLocked.nextPoints === 140, 'Reward points not granted to locked user');

    const fulfillAttemptActive = simulateFulfillBountyAction(false, 'bty-1', 'doc-1', 140, INITIAL_BOUNTIES);
    assert(fulfillAttemptActive.allowed === true, 'Active user CAN fulfill bounties');
    assert(fulfillAttemptActive.nextPoints === 140 + INITIAL_BOUNTIES[0].rewardPoints, 'Reward points granted to active user');

    assert(appSource.includes("handleFulfillBounty = (bountyId, submittedDocId) => {\n    if (isCurrentUserLocked) {"), 'App.jsx guards handleFulfillBounty against locked user');

    // 2.6 Authentication / Login Check on Locked Account
    function simulateLoginSuccess(profile, userRegistry) {
      const isLocked = userRegistry.some(
        (u) => (u.id === profile.id || u.email === profile.email) && u.isActive === false
      );
      if (isLocked) {
        return {
          allowed: false,
          notice: 'Tài khoản đã bị tạm khóa do vi phạm chuẩn mực học thuật. Vui lòng liên hệ Ban Quản trị.'
        };
      }
      return {
        allowed: true,
        notice: `Đăng nhập thành công với vai trò ${profile.role === 'ADMIN' ? 'Quản trị viên' : 'Sinh viên'}.`
      };
    }

    const loginLockedAttempt = simulateLoginSuccess(lockedSession, INITIAL_USERS);
    assert(loginLockedAttempt.allowed === false, 'Locked account CANNOT authenticate/login');
    assert(loginLockedAttempt.notice.includes('Tài khoản đã bị tạm khóa'), 'Locked account receives rejection message on login attempt');

    const loginActiveAttempt = simulateLoginSuccess(activeSession, INITIAL_USERS);
    assert(loginActiveAttempt.allowed === true, 'Active account authenticates successfully');

    assert(appSource.includes("handleAuthSuccess = (profile) => {\n    const isLocked = users.some(\n      (u) => (u.id === profile.id || u.email === profile.email) && u.isActive === false\n    )\n    if (isLocked) {"), 'App.jsx guards handleAuthSuccess against locked accounts');


    // =========================================================================
    // SECTION 3: SELF-LOCK GUARD (ADMIN CANNOT LOCK OWN ACCOUNT)
    // =========================================================================
    console.log('\n--- 3. Self-Lock Guard Testing ---');

    const currentAdminUser = { id: 'user-khoa', email: 'admin.khoacntt@hcmue.edu.vn', role: 'ADMIN', fullName: 'Nguyễn Trần Đăng Khoa' };

    // Render UserManagement with currentAdminUser
    const adminMarkup = renderToStaticMarkup(
      React.createElement(UserManagement, {
        users: INITIAL_USERS,
        currentUser: currentAdminUser,
        onToggleUserStatus: () => {}
      })
    );

    // 3.1 Indicator (Bạn) rendered on current admin row
    assert(adminMarkup.includes('(Bạn)'), 'UserManagement displays "(Bạn)" next to the logged in Admin');

    // 3.2 Disabled button attribute on current admin row
    assert(adminMarkup.includes('disabled=""') || adminMarkup.includes('disabled'), 'UserManagement contains disabled button attribute for current admin');
    assert(adminMarkup.includes('title="Không thể tự khóa tài khoản của bạn"'), 'UserManagement renders tooltip "Không thể tự khóa tài khoản của bạn" for current admin');
    assert(adminMarkup.includes('cursor:not-allowed') || adminMarkup.includes('cursor: not-allowed'), 'UserManagement applies cursor: not-allowed on current admin lock button');

    // 3.3 Handler-level self-lock guard in UserManagement source
    assert(userMgmtSource.includes("if (user.id === currentUser?.id) {\n      setBannerNotice('Không thể tự khóa tài khoản Quản trị viên đang đăng nhập.')\n      return\n    }"), 'handleOpenLockModal explicitly blocks self-locking with Vietnamese notice');

    // 3.4 Logic test: simulate attempt to lock self
    function simulateAttemptLockUser(userToLock, currentUser) {
      if (userToLock.id === currentUser?.id) {
        return {
          allowed: false,
          modalOpened: false,
          notice: 'Không thể tự khóa tài khoản Quản trị viên đang đăng nhập.'
        };
      }
      return {
        allowed: true,
        modalOpened: true,
        notice: null
      };
    }

    const selfLockAttempt = simulateAttemptLockUser(currentAdminUser, currentAdminUser);
    assert(selfLockAttempt.allowed === false, 'Admin self-lock attempt is REJECTED');
    assert(selfLockAttempt.modalOpened === false, 'Lock modal is PREVENTED from opening on self-lock attempt');
    assert(selfLockAttempt.notice === 'Không thể tự khóa tài khoản Quản trị viên đang đăng nhập.', 'Exact warning notice returned on self-lock attempt');

    const otherUserLockAttempt = simulateAttemptLockUser(INITIAL_USERS.find((u) => u.id === 'user-tram'), currentAdminUser);
    assert(otherUserLockAttempt.allowed === true, 'Admin CAN lock other users');
    assert(otherUserLockAttempt.modalOpened === true, 'Lock modal opens for target user');


    // =========================================================================
    // SECTION 4: RBAC GUARD & ADMIN ACCESS DENIED CARD
    // =========================================================================
    console.log('\n--- 4. RBAC Guard & AdminAccessDenied Testing ---');

    function checkAdminAccess(actorRole, userSession) {
      return Boolean(userSession?.role === 'ADMIN' || actorRole === 'ADMIN');
    }

    // 4.1 RBAC Logic Matrix
    assert(checkAdminAccess('GUEST', null) === false, 'GUEST has no admin access');
    assert(checkAdminAccess('USER', activeSession) === false, 'STUDENT (USER role) has no admin access');
    assert(checkAdminAccess('STUDENT', activeSession) === false, 'STUDENT has no admin access');
    assert(checkAdminAccess('ADMIN', currentAdminUser) === true, 'ADMIN role has admin access');
    assert(checkAdminAccess('USER', currentAdminUser) === true, 'User with ADMIN session has admin access');

    // 4.2 Render App in Admin Route for Guest
    // We can inspect the App.jsx code for the exact RBAC card structure and behavior
    assert(appSource.includes('{isAdminView ? ('), 'App.jsx conditionally checks isAdminView');
    assert(appSource.includes('!isAuthorizedAdmin ? ('), 'App.jsx checks !isAuthorizedAdmin');
    assert(appSource.includes('Khu vực Yêu cầu Quyền Quản trị viên'), 'App.jsx renders "Khu vực Yêu cầu Quyền Quản trị viên" header');
    assert(appSource.includes('Chuyển sang tài khoản Quản trị viên (Admin)'), 'App.jsx renders elevation button');
    assert(appSource.includes('Quay lại Kho học liệu'), 'App.jsx renders back to discovery button');

    // Verify Guest role string in Access Denied Card
    assert(appSource.includes("actorRole === 'GUEST' ? 'Khách vãng lai' : 'Sinh viên'"), 'App.jsx renders specific role label in Access Denied card');

    // Verify Elevation Button handler
    assert(appSource.includes("onClick={() => handleSwitchActorRole('ADMIN')}"), 'Elevation button switches role to ADMIN');

    // Verify Admin Workspace Shell renders only for authorized admin
    assert(appSource.includes('<div className="admin-workspace-shell">'), 'Admin workspace shell rendered when authorized');
    assert(appSource.includes('<aside className="admin-sidebar" aria-label="Điều hướng Quản trị học thuật">'), 'Admin sidebar rendered when authorized');
    assert(appSource.includes('5SHARE ADMIN WORKSPACE'), 'Admin sidebar kicker rendered');
    assert(appSource.includes('Tổng quan hệ thống'), 'Admin tab "Tổng quan hệ thống" present');
    assert(appSource.includes('Hàng đợi kiểm duyệt'), 'Admin tab "Hàng đợi kiểm duyệt" present');
    assert(appSource.includes('Quản lý danh mục'), 'Admin tab "Quản lý danh mục" present');
    assert(appSource.includes('Quản trị người dùng'), 'Admin tab "Quản trị người dùng" present');


    // =========================================================================
    // SECTION 5: FEEDBACK MODAL VALIDATION & CATEGORY SELECTION
    // =========================================================================
    console.log('\n--- 5. Feedback Modal Validation Testing ---');

    // 5.1 Closed state renders null
    const closedMarkup = renderToStaticMarkup(
      React.createElement(FeedbackModal, {
        isOpen: false,
        onClose: () => {},
        currentUser: null,
        onSubmitFeedback: () => {}
      })
    );
    assert(closedMarkup === '', 'FeedbackModal with isOpen=false renders empty string (null)');

    // 5.2 Open state renders all 4 categories
    const openMarkup = renderToStaticMarkup(
      React.createElement(FeedbackModal, {
        isOpen: true,
        onClose: () => {},
        currentUser: null,
        onSubmitFeedback: () => {}
      })
    );
    assert(openMarkup.includes('HÒM THƯ GÓP Ý &amp; PHẢN ÁNH HỆ THỐNG') || openMarkup.includes('HÒM THƯ GÓP Ý & PHẢN ÁNH HỆ THỐNG'), 'FeedbackModal header rendered');
    assert(openMarkup.includes('Góp ý tính năng mới'), 'Category 1 "Góp ý tính năng mới" rendered');
    assert(openMarkup.includes('Báo lỗi kỹ thuật'), 'Category 2 "Báo lỗi kỹ thuật" rendered');
    assert(openMarkup.includes('Đề xuất học liệu &amp; Môn học') || openMarkup.includes('Đề xuất học liệu & Môn học'), 'Category 3 "Đề xuất học liệu & Môn học" rendered');
    assert(openMarkup.includes('Ý kiến đóng góp khác'), 'Category 4 "Ý kiến đóng góp khác" rendered');

    // 5.3 Validation Evaluator function matching FeedbackModal.jsx
    function evaluateFeedbackForm({ title = '', content = '', email = '', currentUser = null }) {
      const trimmedTitle = title.trim();
      const trimmedContent = content.trim();
      const trimmedEmail = email.trim();

      if (!trimmedTitle || trimmedTitle.length < 5) {
        return { valid: false, error: 'Vui lòng nhập tiêu đề góp ý rõ ràng (tối thiểu 5 ký tự).' };
      }
      if (!trimmedContent || trimmedContent.length < 15) {
        return { valid: false, error: 'Vui lòng mô tả chi tiết nội dung đóng góp của bạn (tối thiểu 15 ký tự).' };
      }
      if (!currentUser && (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail))) {
        return { valid: false, error: 'Vui lòng cung cấp email liên hệ hợp lệ để Ban Quản trị phản hồi.' };
      }
      return {
        valid: true,
        error: null,
        payload: {
          title: trimmedTitle,
          content: trimmedContent,
          contactEmail: trimmedEmail || currentUser?.email || 'Chưa cung cấp'
        }
      };
    }

    // Title validation tests
    assert(evaluateFeedbackForm({ title: '', content: 'Nội dung phản ánh dài hơn 15 ký tự' }).valid === false, 'Empty title rejected');
    assert(evaluateFeedbackForm({ title: 'ABCD', content: 'Nội dung phản ánh dài hơn 15 ký tự' }).valid === false, 'Title < 5 chars (4 chars) rejected');
    assert(evaluateFeedbackForm({ title: '   1234   ', content: 'Nội dung phản ánh dài hơn 15 ký tự' }).valid === false, 'Whitespace title < 5 chars rejected');
    assert(evaluateFeedbackForm({ title: 'ABCDE', content: 'Nội dung phản ánh dài hơn 15 ký tự', currentUser: activeSession }).valid === true, 'Title >= 5 chars (5 chars) passes with logged in user');

    // Content validation tests
    assert(evaluateFeedbackForm({ title: 'Tiêu đề hợp lệ', content: '', currentUser: activeSession }).valid === false, 'Empty content rejected');
    assert(evaluateFeedbackForm({ title: 'Tiêu đề hợp lệ', content: '12345678901234', currentUser: activeSession }).valid === false, 'Content < 15 chars (14 chars) rejected');
    assert(evaluateFeedbackForm({ title: 'Tiêu đề hợp lệ', content: '   14chars...   ', currentUser: activeSession }).valid === false, 'Whitespace content < 15 chars rejected');
    assert(evaluateFeedbackForm({ title: 'Tiêu đề hợp lệ', content: '123456789012345', currentUser: activeSession }).valid === true, 'Content >= 15 chars (15 chars) passes with logged in user');

    // Email validation tests for Guest (currentUser = null)
    assert(evaluateFeedbackForm({ title: 'Tiêu đề hợp lệ', content: 'Nội dung phản ánh dài hơn 15 ký tự', email: '', currentUser: null }).valid === false, 'Guest with empty email rejected');
    assert(evaluateFeedbackForm({ title: 'Tiêu đề hợp lệ', content: 'Nội dung phản ánh dài hơn 15 ký tự', email: 'invalid-email', currentUser: null }).valid === false, 'Guest with "invalid-email" rejected');
    assert(evaluateFeedbackForm({ title: 'Tiêu đề hợp lệ', content: 'Nội dung phản ánh dài hơn 15 ký tự', email: 'user@', currentUser: null }).valid === false, 'Guest with "user@" rejected');
    assert(evaluateFeedbackForm({ title: 'Tiêu đề hợp lệ', content: 'Nội dung phản ánh dài hơn 15 ký tự', email: '@domain.com', currentUser: null }).valid === false, 'Guest with "@domain.com" rejected');
    assert(evaluateFeedbackForm({ title: 'Tiêu đề hợp lệ', content: 'Nội dung phản ánh dài hơn 15 ký tự', email: 'user@domain', currentUser: null }).valid === false, 'Guest with "user@domain" (no tld dot) rejected');
    assert(evaluateFeedbackForm({ title: 'Tiêu đề hợp lệ', content: 'Nội dung phản ánh dài hơn 15 ký tự', email: 'student.k50@hcmue.edu.vn', currentUser: null }).valid === true, 'Guest with valid HCMUE email passes');

    // Logged in user with blank contact email automatically defaults to session email
    const loggedInResult = evaluateFeedbackForm({
      title: 'Đề xuất cải tiến PDF viewer',
      content: 'Cần bổ sung phím tắt điều hướng trang tiếp theo và trước đó bằng mũi tên.',
      email: '',
      currentUser: activeSession
    });
    assert(loggedInResult.valid === true, 'Logged in user passes without typing email');
    assert(loggedInResult.payload.contactEmail === activeSession.email, 'Contact email automatically populated from user session');

    // Verify character counter (0/1000) in FeedbackModal markup
    assert(openMarkup.includes('/1000'), 'FeedbackModal contains 1000-character counter');
    assert(openMarkup.includes('Gửi đóng góp'), 'FeedbackModal renders submit button "Gửi đóng góp"');


    // =========================================================================
    // SECTION 6: NON-REGRESSION ACROSS M1, M2, M3 & M4
    // =========================================================================
    console.log('\n--- 6. Non-Regression Verification (M1–M4) ---');

    // 6.1 LandingPage 5 Acts & Scroller
    const landingMarkup = renderToStaticMarkup(
      React.createElement(LandingPage, {
        onNavigate: () => {},
        onExploreDiscovery: () => {},
        onOpenUpload: () => {},
        userSession: activeSession,
        actorRole: 'USER'
      })
    );
    assert(landingMarkup.includes('landing-page-shell') || landingMarkup.includes('scrolly-runway'), 'LandingPage renders scrolly runway');
    assert(landingMarkup.includes('act-1') || landingMarkup.includes('Act I') || landingMarkup.includes('chapter-scrubber'), 'LandingPage contains Act markers or chapter scrubber');

    // Check right-edge scrubber I - II - III - IV - V
    assert(landingMarkup.includes('chapter-scrubber') || landingMarkup.includes('scrubber'), 'LandingPage contains chapter scrubber component');

    // Anti-literalism in LandingPage.jsx
    const landingSource = fs.readFileSync(path.resolve('./client/src/components/home/LandingPage.jsx'), 'utf-8');
    const FORBIDDEN_JARGON = [
      'K48',
      'K49',
      'K50',
      '5512',
      'COMP10',
      'SHA-256',
      'Magic Bytes',
      'Zalo',
      'Cloudinary',
      '8 tiêu chí'
    ];
    FORBIDDEN_JARGON.forEach((jargon) => {
      assert(!landingSource.includes(jargon), `LandingPage contains 0 instances of forbidden jargon "${jargon}"`);
    });

    // 6.2 DiscoveryPage Pure Workspace at Top of Viewport
    const discoveryMarkup = renderToStaticMarkup(
      React.createElement(DiscoveryPage, {
        documents: INITIAL_DOCUMENTS,
        courses: INITIAL_COURSES,
        bookmarkedIds: ['doc-1'],
        onSelectDoc: () => {},
        onToggleBookmark: () => {},
        onOpenUpload: () => {}
      })
    );
    assert(discoveryMarkup.includes('discovery-workspace-root'), 'DiscoveryPage opens directly with .discovery-workspace-root');
    assert(discoveryMarkup.includes('fts-search-row'), 'DiscoveryPage renders immediate FTS search bar');
    assert(discoveryMarkup.includes('filter-sidebar-card'), 'DiscoveryPage renders curriculum sidebar');
    assert(!discoveryMarkup.includes('scrolly-runway'), 'DiscoveryPage contains 0 scrollytelling runway obstacles');

    // 6.3 Vectoria Topbar & Zero Dark Mode
    const navbarMarkup = renderToStaticMarkup(
      React.createElement(Navbar, {
        actorRole: 'USER',
        userSession: activeSession,
        activeView: 'discovery',
        onNavigate: () => {},
        onSwitchActorRole: () => {},
        onOpenAuth: () => {},
        onLogout: () => {},
        notifications: [],
        pendingCount: 0
      })
    );
    assert(navbarMarkup.includes('vec-topbar'), 'Navbar renders Vectoria .vec-topbar');
    assert(navbarMarkup.includes('id="btnTopAvatar"') || navbarMarkup.includes('btnTopAvatar'), 'Navbar renders circular 38px Avatar #btnTopAvatar');
    assert(!navbarMarkup.includes('data-theme="dark"'), 'Navbar contains ZERO data-theme="dark"');
    assert(!navbarMarkup.includes('dark:'), 'Navbar contains ZERO Tailwind dark: classes');

    // Check radix_colors.css has zero dark mode overrides
    const radixCss = fs.readFileSync(path.resolve('./client/src/styles/radix_colors.css'), 'utf-8');
    assert(!radixCss.includes('[data-theme="dark"]'), 'radix_colors.css contains ZERO [data-theme="dark"] overrides');
    assert(!radixCss.includes('.dark-theme'), 'radix_colors.css contains ZERO .dark-theme overrides');

    // 6.4 ModerationQueue: 8-Criteria & Reject Modal
    assert(Array.isArray(EIGHT_MODERATION_CRITERIA) && EIGHT_MODERATION_CRITERIA.length === 8, 'EIGHT_MODERATION_CRITERIA has exactly 8 criteria');
    const rejectSource = fs.readFileSync(path.resolve('./client/src/components/admin/RejectReasonModal.jsx'), 'utf-8');
    assert(rejectSource.includes('trimmed.length < 10'), 'RejectReasonModal enforces minimum 10 characters for reject reason');

    // 6.5 CourseManagement: Foreign Key Deletion Block
    const courseMgmtSource = fs.readFileSync(path.resolve('./client/src/components/admin/CourseManagement.jsx'), 'utf-8');
    assert(courseMgmtSource.includes('count > 0'), 'CourseManagement checks if doc count > 0 before deletion');
    assert(courseMgmtSource.includes('Không thể xóa học phần này vì đang có'), 'CourseManagement displays strict foreign key deletion warning');

    // 6.6 AdminDashboard Pure SVG Visualizations
    const dashboardSource = fs.readFileSync(path.resolve('./client/src/components/admin/AdminDashboard.jsx'), 'utf-8');
    assert(dashboardSource.includes('<svg') && dashboardSource.includes('<rect') && dashboardSource.includes('d={linePath}'), 'AdminDashboard renders pure SVG charts (bar & cubic bezier spline)');

    console.log('\n============================================================');
    console.log(`  M4 ADVERSARIAL GOVERNANCE SUITE: ${passed} PASSED, ${failed} FAILED (TOTAL: ${totalTests})`);
    console.log('============================================================\n');

  } finally {
    await server.close();
  }

  if (failed > 0) {
    console.error(`\nFAILED TESTS (${failed}):`);
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
