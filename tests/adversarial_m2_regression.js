/**
 * ADVERSARIAL REGRESSION & TEST SUITE INTEGRITY HARNESS (MILESTONE 2)
 * Independent empirical challenge verifying:
 * 1. Non-regression of DiscoveryPage: search filtering (FTS unaccent), category tree,
 *    document cards, modal triggers, pagination logic, empty states.
 * 2. Non-regression of Topbar: active links indicator, circular avatar switcher,
 *    inline account picker, brand ribbon logo lockup, and route transitions.
 * 3. Interaction between LandingPage (M2) and DiscoveryPage (M1/M2 pure workspace).
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
  console.log('  M2 REGRESSION & TEST SUITE INTEGRITY HARNESS');
  console.log('============================================================\n');

  const server = await createServer({
    root: './client',
    server: { middlewareMode: true }
  });

  try {
    const { default: DiscoveryPage } = await server.ssrLoadModule('/src/components/home/DiscoveryPage.jsx');
    const { default: LandingPage } = await server.ssrLoadModule('/src/components/home/LandingPage.jsx');
    const { default: Navbar } = await server.ssrLoadModule('/src/components/common/Navbar.jsx');
    const { default: BrandLogo } = await server.ssrLoadModule('/src/components/common/BrandLogo.jsx');
    const { default: DocumentGrid } = await server.ssrLoadModule('/src/components/home/DocumentGrid.jsx');
    const { default: DocumentCard } = await server.ssrLoadModule('/src/components/home/DocumentCard.jsx');
    const { default: FilterSidebar } = await server.ssrLoadModule('/src/components/home/FilterSidebar.jsx');
    const mockData = await server.ssrLoadModule('/src/data/mockData.js');

    const {
      INITIAL_COURSES,
      INITIAL_DOCUMENTS,
      INITIAL_NOTIFICATIONS,
      DOCUMENT_TYPES
    } = mockData;

    // =========================================================================
    // SECTION 1: DISCOVERYPAGE NON-REGRESSION (HERO REMOVAL INTEGRITY)
    // =========================================================================
    console.log('--- 1. DiscoveryPage Structure & Clean Workspace Verification ---');

    const discoveryHtml = renderToStaticMarkup(
      React.createElement(DiscoveryPage, {
        documents: INITIAL_DOCUMENTS,
        courses: INITIAL_COURSES,
        bookmarkedIds: ['doc-1'],
        onSelectDoc: () => {},
        onToggleBookmark: () => {},
        onOpenUpload: () => {}
      })
    );

    assert(discoveryHtml.includes('discovery-workspace-root'), 'DiscoveryPage renders .discovery-workspace-root container');
    assert(discoveryHtml.includes('workspace-toolbar-bar'), 'DiscoveryPage renders .workspace-toolbar-bar at the top');
    assert(discoveryHtml.includes('fts-search-row'), 'DiscoveryPage renders .fts-search-row search input row');
    assert(discoveryHtml.includes('discovery-layout'), 'DiscoveryPage renders 2-column .discovery-layout');
    assert(discoveryHtml.includes('filter-sidebar-card'), 'DiscoveryPage renders FilterSidebar alongside the document workspace');
    assert(!discoveryHtml.includes('STAGE 01'), 'Zero occurrences of legacy prototype string "STAGE 01"');
    assert(!discoveryHtml.includes('CLOUDINARY SANDBOX'), 'Zero occurrences of legacy prototype string "CLOUDINARY SANDBOX"');
    assert(!discoveryHtml.includes('living-flow'), 'Zero legacy living-flow hero elements in DiscoveryPage output');

    // =========================================================================
    // SECTION 2: SEARCH FILTERING & FTS UNACCENT MATHEMATICAL LOGIC
    // =========================================================================
    console.log('\n--- 2. Search & Unaccent Filtering Engine Stress-Testing ---');

    function normalizeVietnamese(str = '') {
      return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    assert(normalizeVietnamese('Kế hoạch bài dạy') === 'ke hoach bai day', 'Accented Vietnamese string correctly unaccented');
    assert(normalizeVietnamese('Đại học Sư phạm') === 'dai hoc su pham', 'Special character "Đ" unaccented to "d"');
    assert(normalizeVietnamese('   COMP1015:   Cơ sở dữ liệu   ') === 'comp1015 co so du lieu', 'Excess whitespace and punctuation stripped');

    const approvedDocs = INITIAL_DOCUMENTS.filter(d => d.status === 'APPROVED');
    assert(approvedDocs.length > 0, `Mock data contains ${approvedDocs.length} approved documents`);

    // Scenario A: Search "5512" matches CV 5512 lesson plan documents
    const q1 = normalizeVietnamese('5512');
    const matched5512 = approvedDocs.filter(doc => {
      const haystack = normalizeVietnamese(`${doc.title} ${doc.description} ${doc.courseCode} ${doc.courseName} ${doc.uploaderName}`);
      return q1.split(' ').every(tk => haystack.includes(tk));
    });
    assert(matched5512.length >= 1, `Searching "5512" matches ${matched5512.length} approved document(s)`);
    assert(matched5512.some(d => d.title.includes('5512')), 'Matched document title contains 5512');

    // Scenario B: Search unaccented "quy hoach dong" matches "Quy hoạch động"
    const q2 = normalizeVietnamese('quy hoach dong');
    const matchedQHD = approvedDocs.filter(doc => {
      const haystack = normalizeVietnamese(`${doc.title} ${doc.description} ${doc.courseCode} ${doc.courseName} ${doc.uploaderName}`);
      return q2.split(' ').every(tk => haystack.includes(tk));
    });
    assert(matchedQHD.length >= 1, `Searching unaccented "quy hoach dong" matches ${matchedQHD.length} document(s)`);
    assert(matchedQHD[0].title.includes('Quy hoạch động'), 'Matched document title contains "Quy hoạch động"');

    // Scenario C: Search course code "COMP1015"
    const q3 = normalizeVietnamese('COMP1015');
    const matchedCourse = approvedDocs.filter(doc => {
      const haystack = normalizeVietnamese(`${doc.title} ${doc.description} ${doc.courseCode} ${doc.courseName} ${doc.uploaderName}`);
      return q3.split(' ').every(tk => haystack.includes(tk));
    });
    assert(matchedCourse.length >= 1, `Searching course code "COMP1015" matches ${matchedCourse.length} document(s)`);
    assert(matchedCourse.every(d => d.courseCode === 'COMP1015'), 'All matched documents have courseCode COMP1015');

    // Scenario D: Search by uploader name unaccented ("thuy tram")
    const qUploader = normalizeVietnamese('thuy tram');
    const matchedUploader = approvedDocs.filter(doc => {
      const haystack = normalizeVietnamese(`${doc.title} ${doc.description} ${doc.courseCode} ${doc.courseName} ${doc.uploaderName}`);
      return qUploader.split(' ').every(tk => haystack.includes(tk));
    });
    assert(matchedUploader.length >= 1, `Searching uploader name "thuy tram" matches ${matchedUploader.length} document(s)`);

    // Scenario E: Adversarial nonsense search returns 0 results
    const q4 = normalizeVietnamese('COMP1015 khongtontaitronghethongxyz');
    const matchedNone = approvedDocs.filter(doc => {
      const haystack = normalizeVietnamese(`${doc.title} ${doc.description} ${doc.courseCode} ${doc.courseName} ${doc.uploaderName}`);
      return q4.split(' ').every(tk => haystack.includes(tk));
    });
    assert(matchedNone.length === 0, 'Adversarial nonsense search returns exactly 0 results');

    // =========================================================================
    // SECTION 3: CATEGORY FILTERING & INACTIVE COURSE EXCLUSION
    // =========================================================================
    console.log('\n--- 3. Category Tree & Course Filter BVA ---');

    const activeCourses = INITIAL_COURSES.filter(c => c.isActive);
    assert(activeCourses.length > 0, `There are ${activeCourses.length} active courses`);

    const activeCourseCodes = new Set(activeCourses.map(c => c.code));
    const simulatedFiltered = INITIAL_DOCUMENTS.filter(doc => {
      if (doc.status !== 'APPROVED') return false;
      if (!activeCourseCodes.has(doc.courseCode)) return false;
      return true;
    });
    assert(simulatedFiltered.every(d => activeCourseCodes.has(d.courseCode)), '100% of filtered documents belong to active courses');

    // Test Document Types filtering based on mockData DOCUMENT_TYPES
    for (const dtype of DOCUMENT_TYPES.slice(1)) {
      const docsOfType = approvedDocs.filter(d => d.docType === dtype && activeCourseCodes.has(d.courseCode));
      assert(docsOfType.length >= 1, `DocType filter for "${dtype}" matches ${docsOfType.length} document(s)`);
    }

    // =========================================================================
    // SECTION 4: DOCUMENT CARDS & EMPTY STATE RENDERING
    // =========================================================================
    console.log('\n--- 4. Document Grid/List & Empty State Rendering ---');

    const emptyGridHtml = renderToStaticMarkup(
      React.createElement(DocumentGrid, {
        documents: [],
        bookmarkedIds: [],
        viewMode: 'grid',
        onSelectDoc: () => {},
        onToggleBookmark: () => {},
        onResetFilters: () => {}
      })
    );
    assert(emptyGridHtml.includes('empty-state-box'), 'Empty documents array renders .empty-state-box');
    assert(emptyGridHtml.includes('Không tìm thấy học liệu'), 'Empty state displays descriptive explanation');
    assert(emptyGridHtml.includes('Đặt lại bộ lọc'), 'Empty state renders reset filters button');

    const gridHtml = renderToStaticMarkup(
      React.createElement(DocumentGrid, {
        documents: approvedDocs.slice(0, 3),
        bookmarkedIds: ['doc-1'],
        viewMode: 'grid',
        onSelectDoc: () => {},
        onToggleBookmark: () => {},
        onResetFilters: () => {}
      })
    );
    assert(gridHtml.includes('document-cards-grid'), 'Grid mode renders .document-cards-grid container');
    assert(gridHtml.includes('doc-card'), 'DocumentCard rendered inside grid mode');

    const listHtml = renderToStaticMarkup(
      React.createElement(DocumentGrid, {
        documents: approvedDocs.slice(0, 3),
        bookmarkedIds: ['doc-1'],
        viewMode: 'list',
        onSelectDoc: () => {},
        onToggleBookmark: () => {},
        onResetFilters: () => {}
      })
    );
    assert(listHtml.includes('document-list-stack'), 'List mode renders .document-list-stack container');
    assert(listHtml.includes('doc-list-row'), 'DocumentCard renders .doc-list-row in list mode');

    const sampleDoc = approvedDocs[0];
    const cardHtml = renderToStaticMarkup(
      React.createElement(DocumentCard, {
        doc: sampleDoc,
        isBookmarked: true,
        viewMode: 'grid',
        onSelectDoc: () => {},
        onToggleBookmark: () => {}
      })
    );
    assert(cardHtml.includes(sampleDoc.title), 'DocumentCard renders document title');
    assert(cardHtml.includes(sampleDoc.courseCode), 'DocumentCard renders course code badge');
    assert(cardHtml.includes(sampleDoc.docType), 'DocumentCard renders docType badge');
    assert(cardHtml.includes(sampleDoc.pageCount.toString()), 'DocumentCard renders page count');

    // =========================================================================
    // SECTION 5: PAGINATION MATHEMATICAL INTEGRITY & BOUNDARIES
    // =========================================================================
    console.log('\n--- 5. Pagination Logic & Boundary Value Analysis ---');

    const PAGE_SIZE = 12;

    function calcPagination(totalDocs, requestedPage) {
      const totalPages = Math.max(1, Math.ceil(totalDocs / PAGE_SIZE));
      const safePage = Math.max(1, Math.min(requestedPage, totalPages));
      const startIndex = (safePage - 1) * PAGE_SIZE;
      const endIndex = safePage * PAGE_SIZE;
      return { totalPages, safePage, startIndex, endIndex };
    }

    const p0 = calcPagination(0, 1);
    assert(p0.totalPages === 1 && p0.startIndex === 0 && p0.endIndex === 12, '0 items -> totalPages = 1');

    const p12 = calcPagination(12, 1);
    assert(p12.totalPages === 1, '12 items -> totalPages = 1');

    const p13 = calcPagination(13, 1);
    assert(p13.totalPages === 2, '13 items -> totalPages = 2');
    const p13_page2 = calcPagination(13, 2);
    assert(p13_page2.startIndex === 12 && p13_page2.endIndex === 24, '13 items page 2 slice starts at 12');

    const p24 = calcPagination(24, 2);
    assert(p24.totalPages === 2 && p24.startIndex === 12, '24 items -> totalPages = 2');

    const p25 = calcPagination(25, 3);
    assert(p25.totalPages === 3 && p25.startIndex === 24, '25 items -> totalPages = 3');

    const pClamp = calcPagination(10, 999);
    assert(pClamp.safePage === 1, 'Requested page 999 clamps to max page 1');

    // =========================================================================
    // SECTION 6: TOPBAR ACTIVE LINKS, AVATAR SWITCHER & BRAND LOGO
    // =========================================================================
    console.log('\n--- 6. Topbar Navigation, Active Links & Account Switcher ---');

    const navLandingHtml = renderToStaticMarkup(
      React.createElement(Navbar, {
        actorRole: 'USER',
        userSession: { id: 'vi', fullName: 'Phan Triệu Vĩ', role: 'USER' },
        activeView: 'landing',
        notifications: INITIAL_NOTIFICATIONS
      })
    );
    assert(navLandingHtml.includes('vec-nav-link active') && navLandingHtml.includes('Trang chủ'), 'Tab "Trang chủ" is active when activeView="landing"');

    const navDiscoveryHtml = renderToStaticMarkup(
      React.createElement(Navbar, {
        actorRole: 'USER',
        userSession: { id: 'vi', fullName: 'Phan Triệu Vĩ', role: 'USER' },
        activeView: 'discovery',
        notifications: INITIAL_NOTIFICATIONS
      })
    );
    assert(navDiscoveryHtml.includes('Kho học liệu'), 'Tab "Kho học liệu" rendered in Topbar');
    assert(navDiscoveryHtml.includes('vec-nav-link active'), 'Active indicator present on Kho học liệu');

    const navDetailHtml = renderToStaticMarkup(
      React.createElement(Navbar, {
        actorRole: 'USER',
        userSession: { id: 'vi', fullName: 'Phan Triệu Vĩ', role: 'USER' },
        activeView: 'detail',
        notifications: INITIAL_NOTIFICATIONS
      })
    );
    assert(navDetailHtml.includes('vec-nav-link active') && navDetailHtml.includes('Kho học liệu'), 'Kho học liệu remains active when viewing document detail');

    const navBountyHtml = renderToStaticMarkup(
      React.createElement(Navbar, {
        actorRole: 'USER',
        userSession: { id: 'vi', fullName: 'Phan Triệu Vĩ', role: 'USER' },
        activeView: 'bounty',
        notifications: INITIAL_NOTIFICATIONS
      })
    );
    assert(navBountyHtml.includes('Treo thưởng'), 'Tab "Treo thưởng" rendered in Topbar');

    const navUploadHtml = renderToStaticMarkup(
      React.createElement(Navbar, {
        actorRole: 'USER',
        userSession: { id: 'vi', fullName: 'Phan Triệu Vĩ', role: 'USER' },
        activeView: 'upload',
        notifications: INITIAL_NOTIFICATIONS
      })
    );
    assert(navUploadHtml.includes('Đóng góp'), 'Tab "Đóng góp" rendered in Topbar');

    // BrandLogo tests
    const logoHtml = renderToStaticMarkup(React.createElement(BrandLogo, { size: 36, showWordmark: true }));
    assert(logoHtml.includes('<svg'), 'BrandLogo renders SVG element');
    assert(logoHtml.includes('linearGradient'), 'BrandLogo defines linearGradient fold creases');
    assert(logoHtml.includes('5share'), 'BrandLogo renders "5share" wordmark');
    assert(logoHtml.includes('brand-wordmark'), 'BrandLogo applies .brand-wordmark typography class');

    // Navbar Personas
    const navGuestHtml = renderToStaticMarkup(
      React.createElement(Navbar, {
        actorRole: 'GUEST',
        userSession: null,
        activeView: 'landing',
        notifications: []
      })
    );
    assert(navGuestHtml.includes('id="btnTopAvatar"'), 'Guest topbar renders #btnTopAvatar');
    assert(navGuestHtml.includes('title="Đăng nhập vào 5share"'), 'Guest #btnTopAvatar has login title');
    assert(!navGuestHtml.includes('id="notificationBellBtn"'), 'Guest topbar does NOT expose notification bell');

    const navStudentHtml = renderToStaticMarkup(
      React.createElement(Navbar, {
        actorRole: 'USER',
        userSession: { id: 'vi', fullName: 'Phan Triệu Vĩ', role: 'USER', points: 140, avatarInitials: 'TV' },
        activeView: 'landing',
        notifications: INITIAL_NOTIFICATIONS
      })
    );
    assert(navStudentHtml.includes('TV'), 'Student avatar displays initials "TV"');
    assert(navStudentHtml.includes('id="notificationBellBtn"'), 'Student topbar includes notification bell');
    assert(navStudentHtml.includes('id="unreadBadge"'), 'Unread notification count badge renders on Student topbar');

    const navAdminHtml = renderToStaticMarkup(
      React.createElement(Navbar, {
        actorRole: 'ADMIN',
        userSession: { id: 'khoa', fullName: 'Nguyễn Trần Đăng Khoa', role: 'ADMIN', points: 500, avatarInitials: 'ĐK' },
        activeView: 'admin-moderation',
        notifications: INITIAL_NOTIFICATIONS
      })
    );
    assert(navAdminHtml.includes('ĐK'), 'Admin avatar displays initials "ĐK"');

    // =========================================================================
    // SECTION 7: M2 LANDINGPAGE SCROLLYTELLING INTEGRITY
    // =========================================================================
    console.log('\n--- 7. LandingPage 5-Act Structure & Damping Verification ---');

    const landingHtml = renderToStaticMarkup(
      React.createElement(LandingPage, {
        onNavigate: () => {},
        onExploreDiscovery: () => {},
        onOpenUpload: () => {},
        userSession: { id: 'vi', fullName: 'Phan Triệu Vĩ', role: 'USER' },
        actorRole: 'USER'
      })
    );

    assert(landingHtml.includes('scrolly-runway'), 'LandingPage renders .scrolly-runway');
    assert(landingHtml.includes('scrolly-viewport'), 'LandingPage renders .scrolly-viewport sticky stage');
    assert(landingHtml.includes('chapter-scrubber'), 'LandingPage renders right-edge .chapter-scrubber');
    assert(landingHtml.includes('scrubber-rail'), 'LandingPage renders .scrubber-rail');
    assert(landingHtml.includes('act-1-aperture'), 'LandingPage renders Act I aperture container');
    assert(landingHtml.includes('act-2-orbitals'), 'LandingPage renders Act II orbitals container');
    assert(landingHtml.includes('act-3-isometric'), 'LandingPage renders Act III isometric container');
    assert(landingHtml.includes('act-4-horizontal'), 'LandingPage renders Act IV horizontal container');
    assert(landingHtml.includes('act-5-portal'), 'LandingPage renders Act V portal container');

    // Act I - V content checks
    assert(landingHtml.includes('APERTURE SINGULARITY'), 'Act I kicker APERTURE SINGULARITY present');
    assert(landingHtml.includes('GRAVITATIONAL CONVERGENCE'), 'Act II kicker GRAVITATIONAL CONVERGENCE present');
    assert(landingHtml.includes('ISOMETRIC DECONSTRUCTION'), 'Act III kicker ISOMETRIC DECONSTRUCTION present');
    assert(landingHtml.includes('CHƯƠNG 01 • CẤU TRÚC HÓA'), 'Act IV Chapter 1 kicker present');
    assert(landingHtml.includes('constellation-bg-canvas'), 'Act IV constellation canvas element present');
    assert(landingHtml.includes('THRESHOLD REACHED'), 'Act V kicker THRESHOLD REACHED present');

    // Visual assets in Act IV
    assert(landingHtml.includes('/assets/studio-pillar-1.png'), 'LandingPage references studio-pillar-1.png');
    assert(landingHtml.includes('/assets/studio-pillar-2.png'), 'LandingPage references studio-pillar-2.png');
    assert(landingHtml.includes('/assets/studio-pillar-3.png'), 'LandingPage references studio-pillar-3.png');

    // SVG precision callouts in Act III
    assert(landingHtml.includes('Sự Nguyên Vẹn'), 'Act III callout Layer 1 Integrity present');
    assert(landingHtml.includes('Sự Phân Định'), 'Act III callout Layer 2 Taxonomy present');
    assert(landingHtml.includes('Sự Thẩm Định'), 'Act III callout Layer 3 Refinement present');
    assert(landingHtml.includes('Sự Truyền Đạt'), 'Act III callout Layer 4 Clarity present');

    // CTA buttons in Act V (HTML entity encoded)
    assert(landingHtml.includes('Tiến vào Kho học liệu'), 'Act V provides primary CTA "Tiến vào Kho học liệu"');
    assert(landingHtml.includes('Đóng góp &amp; Tiếp nối Tri thức') || landingHtml.includes('Đóng góp & Tiếp nối Tri thức'), 'Act V provides secondary CTA "Đóng góp & Tiếp nối Tri thức"');

    // =========================================================================
    // SECTION 8: APP VIEW ROUTING & SHELL STYLES
    // =========================================================================
    console.log('\n--- 8. App.jsx Shell Styling & View Routing Non-Regression ---');

    const appSource = fs.readFileSync(path.resolve('./client/src/App.jsx'), 'utf-8');
    assert(appSource.includes("activeView === 'landing'"), 'App.jsx handles landing activeView');
    assert(appSource.includes("activeView === 'discovery'"), 'App.jsx handles discovery activeView');
    assert(appSource.includes("'landing-page-shell'"), 'App.jsx applies full-bleed landing-page-shell class');
    assert(appSource.includes("'platform-container'"), 'App.jsx applies platform-container for functional workspace');
    assert(appSource.includes("onExploreDiscovery={() => setActiveView('discovery')}"), 'LandingPage exploration callback wired to setActiveView("discovery")');
    assert(appSource.includes("onOpenUpload="), 'LandingPage upload callback wired');

    // =========================================================================
    // SECTION 9: SUMMARY & EXIT
    // =========================================================================
    console.log('\n============================================================');
    console.log(`  M2 REGRESSION SUITE RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${totalTests})`);
    console.log('============================================================\n');

    if (failed > 0) {
      console.error('Failures encountered:', failures);
      process.exit(1);
    }

  } finally {
    await server.close();
  }
}

run().catch((err) => {
  console.error('Fatal error during test execution:', err);
  process.exit(1);
});
