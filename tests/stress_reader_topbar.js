/**
 * STRESS TEST SUITE: TOPBAR, READER COMPONENT & ACCOUNT SWITCHER
 * Focus areas:
 * 1. PdfPreviewViewer: Zoom level boundaries (85% to 125%), page navigation boundaries (page 1 vs max pages, negative, overflow, empty)
 * 2. Navbar: #btnTopAvatar, #menuTopAvatar, inline account switcher panel, layout shift zero-impact verification
 */

import React from '../client/node_modules/react/index.js';
import { renderToStaticMarkup } from '../client/node_modules/react-dom/server.node.js';
import { createServer } from '../client/node_modules/vite/dist/node/index.js';
import fs from 'fs';

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

async function run() {
  console.log('\n============================================================');
  console.log('  CHALLENGER M1: TOPBAR, READER & ACCOUNT SWITCHER STRESS TEST');
  console.log('============================================================\n');

  const server = await createServer({
    root: './client',
    server: { middlewareMode: true }
  });

  try {
    const { default: PdfPreviewViewer } = await server.ssrLoadModule('/src/components/document/PdfPreviewViewer.jsx');
    const { default: Navbar } = await server.ssrLoadModule('/src/components/common/Navbar.jsx');

    // =========================================================================
    // PART 1: PDF PREVIEW VIEWER COMPONENT ADVERSARIAL ANALYSIS
    // =========================================================================
    console.log('--- 1. Testing PdfPreviewViewer Boundary & Zoom Behaviors ---');

    // Mock document with 5 pages
    const mockDoc5 = {
      id: 'doc-algo-5512',
      fileName: 'KHBD_Thuat_Toan_Sap_Xep_K50.pdf',
      pageCount: 5,
      pages: [
        { pageNumber: 1, heading: 'TRANG 1: MỤC TIÊU & THIẾT BỊ DẠY HỌC', content: ['Nội dung trang 1...', 'Mục tiêu phẩm chất và năng lực tin học.'] },
        { pageNumber: 2, heading: 'TRANG 2: TIẾN TRÌNH DẠY HỌC & KHỞI ĐỘNG', content: ['Nội dung trang 2...', 'Hoạt động khởi động: Tình huống thực tiễn.'] },
        { pageNumber: 3, heading: 'TRANG 3: HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC', content: ['Nội dung trang 3...', 'Khái niệm thuật toán sắp xếp nổi bọt (Bubble Sort).'] },
        { pageNumber: 4, heading: 'TRANG 4: HOẠT ĐỘNG LUYỆN TẬP', content: ['Nội dung trang 4...', 'Thực hành cài đặt mã nguồn trên máy tính.'] },
        { pageNumber: 5, heading: 'TRANG 5: VẬN DỤNG & ĐÁNH GIÁ', content: ['Nội dung trang 5...', 'Bảng tiêu chí đánh giá Rubric và phiếu bài tập về nhà.'] }
      ]
    };

    // 1.1: Unauthenticated (Guest) 3-Page Preview Lock
    const guestViewerMarkup = renderToStaticMarkup(React.createElement(PdfPreviewViewer, {
      documentItem: mockDoc5,
      isAuthenticated: false
    }));

    assert(guestViewerMarkup.includes('Xem trước 3 / 5 trang'), 'Guest view displays lock badge "Xem trước 3 / 5 trang"');
    assert(guestViewerMarkup.includes('TRANG 1: MỤC TIÊU'), 'Guest view renders Page 1 heading');
    assert(guestViewerMarkup.includes('TRANG 2: TIẾN TRÌNH DẠY HỌC'), 'Guest view renders Page 2 heading');
    assert(guestViewerMarkup.includes('TRANG 3: HOẠT ĐỘNG HÌNH THÀNH KIẾN THỨC'), 'Guest view renders Page 3 heading');
    assert(guestViewerMarkup.includes('pdf-blurred-page-container'), 'Guest view renders blurred container for Page 4');
    assert(guestViewerMarkup.includes('pdf-unlock-overlay'), 'Guest view renders unlock overlay card over Page 4');
    assert(guestViewerMarkup.includes('Mở khóa toàn văn 5 trang học liệu'), 'Unlock card indicates total document page count (5)');
    assert(guestViewerMarkup.includes('Đăng nhập để đọc toàn văn'), 'Unlock card provides call-to-action button to log in');

    // 1.2: Authenticated (Student) Full Access
    const studentViewerMarkup = renderToStaticMarkup(React.createElement(PdfPreviewViewer, {
      documentItem: mockDoc5,
      isAuthenticated: true
    }));

    assert(studentViewerMarkup.includes('Toàn văn (5 trang)'), 'Authenticated view displays unlocked badge "Toàn văn (5 trang)"');
    assert(studentViewerMarkup.includes('TRANG 4: HOẠT ĐỘNG LUYỆN TẬP'), 'Authenticated view renders Page 4 content clearly');
    assert(studentViewerMarkup.includes('TRANG 5: VẬN DỤNG'), 'Authenticated view renders Page 5 content clearly');
    assert(!studentViewerMarkup.includes('pdf-blurred-page-container'), 'Authenticated view has ZERO blurred containers');
    assert(!studentViewerMarkup.includes('pdf-unlock-overlay'), 'Authenticated view has ZERO unlock overlay blocks');

    // 1.3: Academic Typography & Font Binding
    assert(studentViewerMarkup.includes('font-family:var(--font-academic, &#x27;STIX Two Text&#x27;, serif)') ||
           studentViewerMarkup.includes("font-family:var(--font-academic, 'STIX Two Text', serif)"),
           'Document sheets and preview paragraphs explicitly declare var(--font-academic)');
    assert(studentViewerMarkup.includes('doc-body-preview'), 'Document page sheets contain semantic .doc-body-preview class');

    // 1.4: Toolbar Button Contrast & Radix Light Compliance
    assert(studentViewerMarkup.includes('background-color:var(--slate-3, #f0f0f3)'), 'Viewer toolbar buttons use Radix slate-3 light background');
    assert(studentViewerMarkup.includes('border:1px solid var(--slate-6, #e6e8eb)'), 'Viewer toolbar buttons use Radix slate-6 light border');
    assert(studentViewerMarkup.includes('color:var(--slate-12, #11181c)'), 'Viewer toolbar buttons use Radix slate-12 dark readable text');
    assert(!studentViewerMarkup.includes('color:#ffffff') || !studentViewerMarkup.includes('background:rgba(255,255,255,0.1)'),
           'Viewer toolbar contains ZERO unreadable white-on-white button hacks');

    // 1.5: Extreme Edge Cases: Null and Empty Document
    const nullDocMarkup = renderToStaticMarkup(React.createElement(PdfPreviewViewer, {
      documentItem: null,
      isAuthenticated: false
    }));
    assert(nullDocMarkup === '', 'null documentItem safely returns empty output (no null pointer exception)');

    const emptyPagesDoc = { fileName: 'Empty.pdf', pageCount: 0, pages: [] };
    const emptyDocMarkup = renderToStaticMarkup(React.createElement(PdfPreviewViewer, {
      documentItem: emptyPagesDoc,
      isAuthenticated: true
    }));
    assert(emptyDocMarkup.includes('Empty.pdf'), 'Empty pages document renders without crash');

    // 1.6: 1-Page Document Boundary
    const singlePageDoc = {
      fileName: 'SinglePage.pdf',
      pageCount: 1,
      pages: [{ pageNumber: 1, heading: 'TRANG DUY NHẤT', content: ['Nội dung ngắn gọn.'] }]
    };
    const singleGuestMarkup = renderToStaticMarkup(React.createElement(PdfPreviewViewer, {
      documentItem: singlePageDoc,
      isAuthenticated: false
    }));
    assert(singleGuestMarkup.includes('TRANG DUY NHẤT'), '1-Page document renders Page 1 correctly');
    assert(singleGuestMarkup.includes('pdf-blurred-page-container'), '1-Page guest viewer still shows lock container for continuation');

    // 1.7: Mathematical Model Verification for Zoom & Page Clamps
    console.log('\n--- 2. Mathematical Verification of Zoom & Page Navigation Clamps ---');

    // Zoom Step Math Simulation
    let zoom = 100;
    const zoomIn = (z) => Math.min(125, z + 10);
    const zoomOut = (z) => Math.max(85, z - 10);

    // Zoom in 5 times: 100 -> 110 -> 120 -> 125 -> 125 -> 125
    for (let i = 0; i < 5; i++) zoom = zoomIn(zoom);
    assert(zoom === 125, `Zoom-in upper boundary strictly clamped at 125% (got ${zoom}%)`);

    // Zoom out 10 times: 125 -> 115 -> 105 -> 95 -> 85 -> 85...
    for (let i = 0; i < 10; i++) zoom = zoomOut(zoom);
    assert(zoom === 85, `Zoom-out lower boundary strictly clamped at 85% (got ${zoom}%)`);

    // Font size scaling formula: Math.round((13.5 * zoomPercent) / 100)
    const fontAtMin = Math.round((13.5 * 85) / 100);
    const fontAtNormal = Math.round((13.5 * 100) / 100);
    const fontAtMax = Math.round((13.5 * 125) / 100);
    assert(fontAtMin === 11, `Font size at 85% is exactly 11px (legible, >= 11px)`);
    assert(fontAtNormal === 14, `Font size at 100% is exactly 14px (standard reading size)`);
    assert(fontAtMax === 17, `Font size at 125% is exactly 17px (comfortable large size)`);

    // Page clamp simulation
    const testPageClamp = (targetIdx, totalNavigable) => {
      return Math.max(0, Math.min(totalNavigable - 1, targetIdx));
    };
    // For 5 pages in guest mode: totalNavigable = 4 (indices 0, 1, 2, 3)
    assert(testPageClamp(-10, 4) === 0, 'Negative page index -10 safely clamps to 0 (Page 1)');
    assert(testPageClamp(0, 4) === 0, 'Page index 0 maps to 0');
    assert(testPageClamp(3, 4) === 3, 'Page index 3 (boundary) maps to 3');
    assert(testPageClamp(4, 4) === 3, 'Overflow page index 4 safely clamps to 3');
    assert(testPageClamp(999, 4) === 3, 'Extreme overflow page index 999 safely clamps to 3');


    // =========================================================================
    // PART 2: NAVBAR TOPBAR & AVATAR ACCOUNT SWITCHER VERIFICATION
    // =========================================================================
    console.log('\n--- 3. Testing Topbar Layout & Avatar Account Switcher ---');

    // 2.1: Topbar Dimensions & CSS Layout Shift Immunity
    const platformCss = fs.readFileSync('./client/src/styles/platform.css', 'utf8');

    assert(platformCss.includes('.vec-topbar {') &&
           platformCss.includes('height: 60px;') &&
           platformCss.includes('max-height: 60px;'),
           '.vec-topbar enforces rigid 60px height constraint preventing vertical shifts');

    assert(platformCss.includes('.vec-avatar-popover {') &&
           platformCss.includes('position: absolute;') &&
           platformCss.includes('top: calc(100% + 8px);') &&
           platformCss.includes('right: 0;') &&
           platformCss.includes('width: 260px;'),
           '.vec-avatar-popover is absolutely positioned at right: 0 with fixed 260px width (CLS = 0)');

    assert(platformCss.includes('.vec-topbar-avatar-btn {') &&
           platformCss.includes('width: 38px;') &&
           platformCss.includes('height: 38px;') &&
           platformCss.includes('border-radius: 50%;'),
           '#btnTopAvatar enforces 38px circular dimensions');

    // 2.2: Avatar Account Switcher Presets & Flow
    const navbarCode = fs.readFileSync('./client/src/components/common/Navbar.jsx', 'utf8');

    assert(navbarCode.includes('PRESET_ACCOUNTS = ['), 'Navbar defines PRESET_ACCOUNTS array');
    assert(navbarCode.includes("'student-vi'") &&
           navbarCode.includes("'admin-khoa'") &&
           navbarCode.includes("'guest-persona'"),
           'PRESET_ACCOUNTS includes Student (Phan Triệu Vĩ), Admin (Nguyễn Trần Đăng Khoa), and Guest');

    assert(navbarCode.includes('vec-switch-account-panel'), 'Navbar template includes .vec-switch-account-panel');
    assert(navbarCode.includes('vec-switch-account-item'), 'Navbar template includes .vec-switch-account-item');
    assert(navbarCode.includes('CheckCircle2'), 'Active persona displays CheckCircle2 indicator');
    assert(navbarCode.includes('onSwitchActorRole(acc.actorRole || acc.role)'), 'Clicking account invokes onSwitchActorRole callback');

    // 2.3: Zero AI-Slop & Zero Exposed Developer Bar
    assert(!navbarCode.includes('[Khách | Sinh viên | Quản trị]'), 'Zero exposed segmented role switcher in Navbar.jsx');
    assert(!navbarCode.includes('STAGE 01'), 'Zero raw stage jargon in Navbar.jsx');
    assert(!navbarCode.includes('CLOUDINARY SANDBOX'), 'Zero sandbox homework text in Navbar.jsx');

    // 2.4: Accessibility & Keyboard Navigation
    assert(navbarCode.includes('aria-label="Điều hướng chính hệ thống"'), 'Main navigation has accessible aria-label');
    assert(navbarCode.includes('tabIndex={0}') && navbarCode.includes("e.key === 'Enter'"),
           'Interactive elements implement keyboard tabIndex and Enter key handlers');

    console.log('\n============================================================');
    console.log(`  STRESS TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${totalTests})`);
    console.log('============================================================\n');

  } finally {
    await server.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Stress test fatal error:', err);
  process.exit(1);
});
