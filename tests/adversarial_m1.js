/**
 * ADVERSARIAL STRESS TEST SUITE FOR MILESTONE 1
 * Targets: BrandLogo, Vectoria Topbar, #btnTopAvatar, #menuTopAvatar, Account Switcher
 */
import { createServer } from '../client/node_modules/vite/dist/node/index.js';
import React from '../client/node_modules/react/index.js';
import { renderToStaticMarkup } from '../client/node_modules/react-dom/server.node.js';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    results.push({ status: 'PASS', message });
    console.log(`  ✔ PASS: ${message}`);
  } else {
    failed++;
    results.push({ status: 'FAIL', message });
    console.error(`  ✖ FAIL: ${message}`);
  }
}

async function run() {
  console.log('\n============================================================');
  console.log('  M1 ADVERSARIAL CHALLENGE TEST HARNESS');
  console.log('============================================================\n');

  // Start Vite SSR Dev Server
  const server = await createServer({
    root: './client',
    server: { middlewareMode: true }
  });

  try {
    // -------------------------------------------------------------------------
    // 1. BRANDLOGO COMPONENT DEEP CHALLENGE
    // -------------------------------------------------------------------------
    console.log('--- 1. Testing BrandLogo.jsx Component ---');
    const { default: BrandLogo } = await server.ssrLoadModule('/src/components/common/BrandLogo.jsx');

    // Test 1.1: Default Render
    const markupDefault = renderToStaticMarkup(React.createElement(BrandLogo, {}));
    assert(markupDefault.includes('<svg width="36" height="36" viewBox="0 0 48 48" fill="none"'), 'Default SVG dimensions are 36x36 with viewBox 0 0 48 48 and fill="none"');
    assert(markupDefault.includes('linearGradient id="'), 'SVG contains linearGradient definitions with ID prefix');
    assert(markupDefault.includes('-left') && markupDefault.includes('-right'), 'SVG defines directional left and right ribbon gradients');
    assert(markupDefault.includes('-crease-top') && markupDefault.includes('-crease-bottom'), 'SVG defines genuine gradient fold creases (top and bottom)');

    // Test 1.2: Interlocking Ribbon Geometry & Crease Stops
    assert(markupDefault.includes('#0a2a66') && markupDefault.includes('#0090ff'), 'Left loop gradient contains Sapphire Navy (#0a2a66) to Luminous Blue (#0090ff)');
    assert(markupDefault.includes('#07224f') && markupDefault.includes('#00c7fe'), 'Right loop gradient contains Deep Indigo (#07224f) to Electric Cyan (#00c7fe)');
    assert(markupDefault.includes('stop-color="#020c1e" stop-opacity="0.42"'), 'Fold creases use contact shadow gradient stop #020c1e with opacity 0.42');
    assert(markupDefault.includes('d="M 26 16.5 A 11 11 0 0 0 21.5 13.5"'), 'Top crease arc aligns with radius 11 intersection');
    assert(markupDefault.includes('d="M 22 31.5 A 11 11 0 0 0 26.5 34.5"'), 'Bottom crease arc aligns with radius 11 intersection');
    assert(markupDefault.includes('d="M 18 13 A 11 11 0 0 1 27.53 18.5"'), 'Top crossing overpass sweeps cleanly over right loop');
    assert(markupDefault.includes('d="M 30 35 A 11 11 0 0 1 20.47 29.5"'), 'Bottom crossing overpass sweeps cleanly over left loop');

    // Test 1.3: Absence of White Cutout Gaps and Heavy Drop Shadows
    assert(!markupDefault.includes('stroke="white"') && !markupDefault.includes('stroke="#fff"') && !markupDefault.includes('stroke="#ffffff"'), 'SVG contains ZERO white cutout stroke hacks');
    assert(!markupDefault.includes('<filter') && !markupDefault.includes('feDropShadow'), 'SVG uses pure directional fold gradients without heavy raster drop shadows');
    assert(!markupDefault.includes('<rect width="100%"') && !markupDefault.includes('background-color'), 'SVG background is 100% transparent (no background rect)');

    // Test 1.4: Wordmark Typography
    assert(markupDefault.includes('5share</span>'), 'Wordmark renders upright "5share" text');
    assert(markupDefault.includes('Be Vietnam Pro'), 'Wordmark uses Be Vietnam Pro typography');
    assert(markupDefault.includes('var(--slate-12, #11181c)'), 'Wordmark color is Radix slate-12 (#11181c)');

    // Test 1.5: Props showWordmark = false
    const markupNoWordmark = renderToStaticMarkup(React.createElement(BrandLogo, { showWordmark: false }));
    assert(!markupNoWordmark.includes('5share'), 'When showWordmark=false, wordmark text is not rendered');

    // Test 1.6: Custom Size Scaling
    const markupSize48 = renderToStaticMarkup(React.createElement(BrandLogo, { size: 48 }));
    assert(markupSize48.includes('width="48" height="48"'), 'Custom size 48 scales SVG width and height to 48');
    assert(markupSize48.includes('font-size:29px'), 'Custom size 48 calculates proportional font size 29px (48 * 0.61)');

    // Test 1.7: Multi-Instance ID Collision Isolation
    const MultiBrandTree = () => React.createElement('div', null,
      React.createElement(BrandLogo, { size: 36 }),
      React.createElement(BrandLogo, { size: 24 }),
      React.createElement(BrandLogo, { size: 48 })
    );
    const multiMarkup = renderToStaticMarkup(React.createElement(MultiBrandTree));
    const leftMatches = [...multiMarkup.matchAll(/id="([^"]+-left)"/g)].map(m => m[1]);
    const uniqueLeftIds = new Set(leftMatches);
    assert(leftMatches.length === 3 && uniqueLeftIds.size === 3, `Multi-instance rendering generates unique IDs without collision (${uniqueLeftIds.size}/3 unique)`);

    // -------------------------------------------------------------------------
    // 2. STANDALONE SVG ASSETS IN CLIENT/PUBLIC
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Standalone SVG Assets (public/) ---');
    const logoSvg = fs.readFileSync('./client/public/logo.svg', 'utf8');
    const lockupSvg = fs.readFileSync('./client/public/logo-lockup.svg', 'utf8');
    const faviconSvg = fs.readFileSync('./client/public/favicon.svg', 'utf8');

    assert(logoSvg.includes('viewBox="0 0 48 48"') && logoSvg.includes('fill="none"'), 'public/logo.svg has transparent viewBox 0 0 48 48');
    assert(logoSvg.includes('logo-crease-top') && logoSvg.includes('logo-crease-bottom'), 'public/logo.svg has top and bottom fold crease gradients');
    assert(!logoSvg.includes('stroke="#fff"') && !logoSvg.includes('stroke="white"'), 'public/logo.svg contains zero white gap strokes');

    assert(lockupSvg.includes('viewBox="0 0 156 44"'), 'public/logo-lockup.svg has horizontal viewBox 0 0 156 44');
    assert(lockupSvg.includes('>5share</text>') && lockupSvg.includes('Be Vietnam Pro'), 'public/logo-lockup.svg contains upright 5share wordmark in Be Vietnam Pro');
    assert(!lockupSvg.includes('stroke="#fff"'), 'public/logo-lockup.svg contains zero white gap strokes');

    assert(faviconSvg.includes('viewBox="0 0 48 48"') && faviconSvg.includes('fav-crease-top'), 'public/favicon.svg has interlocking ribbon fold crease favicon');

    // -------------------------------------------------------------------------
    // 3. NAVBAR TOPBAR & AVATAR BUTTON
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Navbar.jsx Topbar & Avatar Button ---');
    const { default: Navbar } = await server.ssrLoadModule('/src/components/common/Navbar.jsx');

    // Test 3.1: Guest Persona Render
    const guestMarkup = renderToStaticMarkup(React.createElement(Navbar, {
      actorRole: 'GUEST',
      userSession: null,
      activeView: 'discovery'
    }));
    assert(guestMarkup.includes('class="vec-topbar" id="appHeader"'), 'Renders .vec-topbar with #appHeader');
    assert(guestMarkup.includes('id="btnTopAvatar"'), 'Renders 38px circular #btnTopAvatar');
    assert(guestMarkup.includes('title="Đăng nhập vào 5share"'), 'Guest avatar button title is "Đăng nhập vào 5share"');
    assert(!guestMarkup.includes('id="notificationBellBtn"'), 'Guest does NOT have notification bell button');
    assert(!guestMarkup.includes('Chế độ xem vai trò'), 'Zero exposed dev toolbar or segmented role switcher in DOM');

    // Test 3.2: Student Persona Render
    const studentUser = {
      id: 'vi',
      fullName: 'Phan Triệu Vĩ',
      email: 'vi.phantrieu.k50@hcmue.edu.vn',
      role: 'USER',
      points: 140,
      avatarInitials: 'TV'
    };
    const studentMarkup = renderToStaticMarkup(React.createElement(Navbar, {
      actorRole: 'USER',
      userSession: studentUser,
      activeView: 'discovery',
      notifications: [
        { id: 'n1', title: 'Test Notif', isRead: false },
        { id: 'n2', title: 'Test Notif 2', isRead: false }
      ]
    }));
    assert(studentMarkup.includes('title="Tài khoản: Phan Triệu Vĩ"'), 'Student avatar button title reflects user name');
    assert(studentMarkup.includes('>TV</div>'), 'Student avatar button displays initials "TV"');
    assert(studentMarkup.includes('id="notificationBellBtn"'), 'Student HAS notification bell button');
    assert(studentMarkup.includes('id="unreadBadge">2</span>'), 'Unread notification count badge renders "2"');

    // Test 3.3: Admin Persona Render
    const adminUser = {
      id: 'khoa',
      fullName: 'Nguyễn Trần Đăng Khoa',
      email: 'admin.khoacntt@hcmue.edu.vn',
      role: 'ADMIN',
      points: 500,
      avatarInitials: 'ĐK'
    };
    const adminMarkup = renderToStaticMarkup(React.createElement(Navbar, {
      actorRole: 'ADMIN',
      userSession: adminUser,
      activeView: 'admin-moderation',
      pendingCount: 4
    }));
    assert(adminMarkup.includes('title="Tài khoản: Nguyễn Trần Đăng Khoa"'), 'Admin avatar button title reflects admin name');
    assert(adminMarkup.includes('>ĐK</div>'), 'Admin avatar button displays initials "ĐK"');

    // -------------------------------------------------------------------------
    // 4. NOTIFICATION BADGE BOUNDARY VALUE ANALYSIS
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Notification Badge BVA ---');
    // 4.1: Zero unread -> badge must NOT render
    const zeroNotifMarkup = renderToStaticMarkup(React.createElement(Navbar, {
      actorRole: 'USER',
      userSession: studentUser,
      notifications: [{ id: 'n1', isRead: true }]
    }));
    assert(!zeroNotifMarkup.includes('id="unreadBadge"'), 'When all notifications are read, #unreadBadge is omitted');

    // 4.2: Boundary: 9 unread -> renders "9"
    const notifs9 = Array.from({ length: 9 }, (_, i) => ({ id: `n${i}`, isRead: false }));
    const markup9 = renderToStaticMarkup(React.createElement(Navbar, {
      actorRole: 'USER',
      userSession: studentUser,
      notifications: notifs9
    }));
    assert(markup9.includes('id="unreadBadge">9</span>'), 'When 9 unread notifications, badge renders exactly "9"');

    // 4.3: Boundary: 10 unread -> renders "9+"
    const notifs10 = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, isRead: false }));
    const markup10 = renderToStaticMarkup(React.createElement(Navbar, {
      actorRole: 'USER',
      userSession: studentUser,
      notifications: notifs10
    }));
    assert(markup10.includes('id="unreadBadge">9+</span>'), 'When 10 unread notifications, badge renders "9+"');

    // 4.4: High count: 99 unread -> renders "9+"
    const notifs99 = Array.from({ length: 99 }, (_, i) => ({ id: `n${i}`, isRead: false }));
    const markup99 = renderToStaticMarkup(React.createElement(Navbar, {
      actorRole: 'USER',
      userSession: studentUser,
      notifications: notifs99
    }));
    assert(markup99.includes('id="unreadBadge">9+</span>'), 'When 99 unread notifications, badge renders "9+"');

    // -------------------------------------------------------------------------
    // 5. ACTIVE TAB INDICATOR VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Active Tab Indicator (2px bottom bar) ---');
    const tabs = [
      { view: 'landing', label: 'Trang chủ' },
      { view: 'discovery', label: 'Kho học liệu' },
      { view: 'detail', label: 'Kho học liệu (detail preservation)' },
      { view: 'bounty', label: 'Treo thưởng' },
      { view: 'upload', label: 'Đóng góp' }
    ];

    for (const { view, label } of tabs) {
      const tabMarkup = renderToStaticMarkup(React.createElement(Navbar, {
        actorRole: 'USER',
        userSession: studentUser,
        activeView: view
      }));

      if (view === 'landing') {
        assert(tabMarkup.includes('vec-nav-link active"><span>Trang chủ</span>'), `Active tab '${view}' (${label}) has active class`);
      } else if (view === 'discovery' || view === 'detail') {
        assert(tabMarkup.includes('vec-nav-link active"><svg') && tabMarkup.includes('<span>Kho học liệu</span>'), `Active tab '${view}' (${label}) has active class`);
      } else if (view === 'bounty') {
        assert(tabMarkup.includes('vec-nav-link active"><svg') && tabMarkup.includes('<span>Treo thưởng</span>'), `Active tab '${view}' (${label}) has active class`);
      } else if (view === 'upload') {
        assert(tabMarkup.includes('vec-nav-link active"><svg') && tabMarkup.includes('<span>Đóng góp</span>'), `Active tab '${view}' (${label}) has active class`);
      }
    }

    // -------------------------------------------------------------------------
    // 6. CSS ARCHITECTURE & ZERO DARK THEME PURGE VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing CSS Architecture & Dark Purge ---');
    const radixCss = fs.readFileSync('./client/src/styles/radix_colors.css', 'utf8');
    const platformCss = fs.readFileSync('./client/src/styles/platform.css', 'utf8');

    assert(!radixCss.includes('[data-theme="dark"]') && !radixCss.includes('dark-theme'), 'radix_colors.css has zero dark mode overrides');
    assert(!platformCss.includes('[data-theme="dark"]') && !platformCss.includes('dark-theme'), 'platform.css has zero dark mode overrides');
    assert(platformCss.includes('.vec-topbar'), 'platform.css defines .vec-topbar');
    assert(platformCss.includes('.vec-nav-link.active::after'), 'platform.css defines 2px active bottom bar (::after)');
    assert(platformCss.includes('#btnTopAvatar') || platformCss.includes('.vec-topbar-avatar-btn'), 'platform.css defines 38px circular avatar button');
    assert(platformCss.includes('.vec-avatar-popover'), 'platform.css defines 260px profile popover');
    assert(platformCss.includes('.vec-switch-account-panel'), 'platform.css defines inline slide-in account switcher panel');
    assert(platformCss.includes('@keyframes vecFadeSlideIn'), 'platform.css defines smooth slide-in animation for account switcher');

    // -------------------------------------------------------------------------
    // 7. ACCOUNT SWITCHER INLINE LOGIC & PRESET ROLES
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Account Switcher Presets & Edge Cases ---');
    const navbarSrc = fs.readFileSync('./client/src/components/common/Navbar.jsx', 'utf8');

    // Verify 3 Presets exist: Student (Phan Triệu Vĩ), Admin (Nguyễn Trần Đăng Khoa), Guest
    assert(navbarSrc.includes("'student-vi'") && navbarSrc.includes('Phan Triệu Vĩ'), 'Navbar defines preset Student account Phan Triệu Vĩ');
    assert(navbarSrc.includes("'admin-khoa'") && navbarSrc.includes('Nguyễn Trần Đăng Khoa'), 'Navbar defines preset Admin account Nguyễn Trần Đăng Khoa');
    assert(navbarSrc.includes("'guest-persona'") && navbarSrc.includes('Khách vãng lai'), 'Navbar defines preset Guest account Khách vãng lai');

    // Verify Role Switching Mechanism
    assert(navbarSrc.includes('onSwitchActorRole(acc.actorRole || acc.role)'), 'handleSelectAccount triggers onSwitchActorRole callback');
    assert(navbarSrc.includes('setIsAccountPickerOpen(false)') && navbarSrc.includes('setIsAvatarOpen(false)'), 'Selecting an account dismisses picker and popover');

    // Verify Guest Access Gate
    assert(navbarSrc.includes("if (isGuest && ['upload', 'my-docs', 'bookmarks', 'profile'].includes(viewId))"), 'Guest navigation to protected views is gated and redirects to login');

    // Verify Click Outside Logic
    assert(navbarSrc.includes("document.addEventListener('mousedown', handleClickOutside)"), 'Click outside mousedown listener is bound to document');
    assert(navbarSrc.includes("document.removeEventListener('mousedown', handleClickOutside)"), 'Click outside listener is cleaned up on unmount');

    // -------------------------------------------------------------------------
    // 8. FORBIDDEN STRINGS SCAN (AI SLOP & DARK MODE PURGE)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Testing Anti-AI-Slop & Zero-Dark-Mode Grep Scan ---');
    const m1DeliverableFiles = [
      './client/src/components/common/BrandLogo.jsx',
      './client/src/components/common/Navbar.jsx',
      './client/src/styles/radix_colors.css',
      './client/src/styles/platform.css',
      './client/index.html'
    ];

    const forbiddenPatterns = [
      { name: 'data-theme="dark"', regex: /data-theme=["']dark["']/i },
      { name: 'dark-theme class', regex: /dark-theme/i },
      { name: 'onToggleTheme handler', regex: /onToggleTheme/i },
      { name: 'admin-dark-sidebar class', regex: /admin-dark-sidebar/i },
      { name: 'Exposed role bar string ("Chế độ xem vai trò")', regex: /Chế độ xem vai trò/i },
      { name: 'Exposed dev role bar "[Khách | Sinh viên | Quản trị]"', regex: /\[Khách\s*\|\s*Sinh viên/i },
      { name: 'Raw homework jargon "STAGE 01"', regex: /STAGE\s*01/i },
      { name: 'Raw homework jargon "CLOUDINARY SANDBOX"', regex: /CLOUDINARY\s*SANDBOX/i },
      { name: 'Exposed dev prefix "G5-FR"', regex: /G5-FR/i }
    ];

    for (const pattern of forbiddenPatterns) {
      let matchFound = null;
      for (const filePath of m1DeliverableFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (pattern.regex.test(content)) {
          matchFound = filePath;
          break;
        }
      }
      assert(!matchFound, `M1 Deliverables: Zero occurrences of '${pattern.name}' in M1 files (${m1DeliverableFiles.length} files checked)`);
    }

    // -------------------------------------------------------------------------
    // 9. BRANDLOGO EXTREME SIZES STRESS TEST (Zero / Negative / Large)
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Testing BrandLogo Extreme Sizes & Edge Cases ---');
    const markupSize10 = renderToStaticMarkup(React.createElement(BrandLogo, { size: 10 }));
    assert(!markupSize10.includes('NaN'), 'size=10 generates valid SVG with NO NaN values');

    const markupSize200 = renderToStaticMarkup(React.createElement(BrandLogo, { size: 200 }));
    assert(!markupSize200.includes('NaN'), 'size=200 generates valid SVG with NO NaN values');
    assert(markupSize200.includes('width="200" height="200"'), 'size=200 scales correctly to 200x200');

    // Test with special className
    const markupCustomClass = renderToStaticMarkup(React.createElement(BrandLogo, { className: 'custom-adversarial-class' }));
    assert(markupCustomClass.includes('custom-adversarial-class'), 'Custom className is injected into outer container');

    console.log('\n============================================================');
    console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

  } finally {
    await server.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
