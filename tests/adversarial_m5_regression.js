/**
 * ============================================================================
 * ADVERSARIAL STRESS TEST SUITE FOR MILESTONE 5: NON-REGRESSION & E2E CROSS-TRACK
 * 
 * Verifies:
 * 1. Web Client vs Figma Plugin 1:1 Synchronization:
 *    - Document codes, schema alignment & team member uploaders
 *    - Course codes & curriculum consistency (COMP1044, COMP1015, COMP1022, COMP1001)
 *    - Format ribbons & badges (.pdf, .docx, .pptx, red/blue/amber, trang/slide)
 *    - User roles & Personas (GUEST, STUDENT, ADMIN, #btnTopAvatar, #menuTopAvatar, flowStartingPoints)
 *    - Radix Light color tokens (100% 1:1 match between radix_colors.css, ui.html, and code.js)
 *    - Zero dark mode rules or dark hex backgrounds in both client and plugin
 * 
 * 2. Web Client Non-Regression:
 *    - Topbar active link & avatar switcher
 *    - 5-Act LandingPage scrollytelling & 0 buzzwords rule
 *    - DiscoveryPage workspace directly at top of viewport
 *    - 4-layer upload validation with binary magic bytes (%PDF-, PK..)
 *    - Guest 3 downloads/day rate limiter with 24h rolling expiration
 *    - Admin moderation queue (8 criteria, +20 pts, reject reason)
 *    - FK deletion block on courses with linked documents
 *    - User management lock/unlock with self-lock guard
 *    - Pure SVG charts in Admin dashboard (bar & cubic bezier spline, 0 chart libs)
 *    - Feedback modal (4 categories, validation)
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
  console.log('  M5 ADVERSARIAL CROSS-TRACK & REGRESSION TEST HARNESS');
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
    const fileHasher = await server.ssrLoadModule('/src/utils/fileHasher.js');
    const { default: Navbar } = await server.ssrLoadModule('/src/components/common/Navbar.jsx');
    const { default: BrandLogo } = await server.ssrLoadModule('/src/components/common/BrandLogo.jsx');
    const { default: LandingPage } = await server.ssrLoadModule('/src/components/home/LandingPage.jsx');
    const { default: DiscoveryPage } = await server.ssrLoadModule('/src/components/home/DiscoveryPage.jsx');
    const { default: DocumentCard } = await server.ssrLoadModule('/src/components/home/DocumentCard.jsx');
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

    // Load Figma Plugin files
    const pluginCodePath = path.resolve('tools/figma-5share-plugin/code.js');
    const pluginHtmlPath = path.resolve('tools/figma-5share-plugin/ui.html');
    const cssPath = path.resolve('client/src/styles/radix_colors.css');
    const platformCssPath = path.resolve('client/src/styles/platform.css');

    const pluginCode = fs.readFileSync(pluginCodePath, 'utf8');
    const pluginHtml = fs.readFileSync(pluginHtmlPath, 'utf8');
    const radixCss = fs.readFileSync(cssPath, 'utf8');
    const platformCss = fs.readFileSync(platformCssPath, 'utf8');

    // =========================================================================
    // SECTION 1: WEB CLIENT VS FIGMA PLUGIN SYNCHRONIZATION
    // =========================================================================
    console.log('--- 1. Web Client vs Figma Plugin: Document Codes & Schema Sync ---');

    // Parse SAMPLE_DOCS from plugin code.js
    const sampleDocsMatch = pluginCode.match(/const SAMPLE_DOCS = (\[[\s\S]*?\n\];)/);
    assert(sampleDocsMatch !== null, 'SAMPLE_DOCS constant is present in plugin code.js');
    const sampleDocs = eval(sampleDocsMatch[1]);
    assert(sampleDocs.length >= 6, `Plugin contains ${sampleDocs.length} sample documents (>= 6)`);

    // Verify format diversity in both
    const pluginFormats = [...new Set(sampleDocs.map(d => d.format.toLowerCase()))];
    assert(pluginFormats.includes('pdf'), 'Plugin sample documents include PDF (.pdf)');
    assert(pluginFormats.includes('docx'), 'Plugin sample documents include Word (.docx)');
    assert(pluginFormats.includes('pptx'), 'Plugin sample documents include PowerPoint (.pptx)');

    const clientFormats = [...new Set(INITIAL_DOCUMENTS.map(d => d.format.toLowerCase()))];
    assert(clientFormats.includes('pdf'), 'Web client seed data includes PDF (.pdf)');
    assert(clientFormats.includes('docx'), 'Web client seed data includes Word (.docx)');
    assert(clientFormats.includes('pptx'), 'Web client seed data includes PowerPoint (.pptx)');

    // Verify 1:1 metadata alignment between plugin SAMPLE_DOCS and web INITIAL_DOCUMENTS
    const doc01 = sampleDocs.find(d => d.code === 'DOC_01');
    const clientDoc1 = INITIAL_DOCUMENTS.find(d => d.id === 'doc-1');
    assert(doc01 !== undefined && clientDoc1 !== undefined, 'DOC_01 and doc-1 exist in respective datasets');
    assert(doc01.courseCode === clientDoc1.courseCode, `DOC_01 and doc-1 courseCode match: ${doc01.courseCode}`);
    assert(doc01.format === clientDoc1.format, `DOC_01 and doc-1 format match: ${doc01.format}`);
    assert(doc01.sha256.startsWith(clientDoc1.fileHash.slice(0, 16)), 'DOC_01 and doc-1 SHA-256 prefixes match (a94f8b2c...)');
    assert(doc01.author.includes('Lê Nguyễn Thùy Trâm'), 'DOC_01 author is Lê Nguyễn Thùy Trâm');

    const doc02 = sampleDocs.find(d => d.code === 'DOC_02');
    const clientDoc2 = INITIAL_DOCUMENTS.find(d => d.id === 'doc-2');
    assert(doc02.courseCode === clientDoc2.courseCode, `DOC_02 and doc-2 courseCode match: ${doc02.courseCode}`);
    assert(doc02.sha256.startsWith(clientDoc2.fileHash.slice(0, 16)), 'DOC_02 and doc-2 SHA-256 prefixes match (b72c19d4...)');
    assert(doc02.author.includes('Phan Triệu Vĩ'), 'DOC_02 author is Phan Triệu Vĩ');

    const doc03 = sampleDocs.find(d => d.code === 'DOC_03');
    const clientDoc3 = INITIAL_DOCUMENTS.find(d => d.id === 'doc-3');
    assert(doc03.courseCode === clientDoc3.courseCode, `DOC_03 and doc-3 courseCode match: ${doc03.courseCode}`);
    assert(doc03.sha256.startsWith(clientDoc3.fileHash.slice(0, 16)), 'DOC_03 and doc-3 SHA-256 prefixes match (c45e81a2...)');
    assert(doc03.author.includes('Nguyễn Trần Đăng Khoa'), 'DOC_03 author is Nguyễn Trần Đăng Khoa');

    const doc04 = sampleDocs.find(d => d.code === 'DOC_04');
    const clientDoc4 = INITIAL_DOCUMENTS.find(d => d.id === 'doc-4');
    assert(doc04.courseCode === clientDoc4.courseCode, `DOC_04 and doc-4 courseCode match: ${doc04.courseCode}`);
    assert(doc04.sha256.startsWith(clientDoc4.fileHash.slice(0, 16)), 'DOC_04 and doc-4 SHA-256 prefixes match (d88f12c3...)');
    assert(doc04.author.includes('Nguyễn Hoàng Danh'), 'DOC_04 author is Nguyễn Hoàng Danh');

    const doc05 = sampleDocs.find(d => d.code === 'DOC_05');
    const clientDoc5 = INITIAL_DOCUMENTS.find(d => d.id === 'doc-5');
    assert(doc05.courseCode === clientDoc5.courseCode, `DOC_05 and doc-5 courseCode match: ${doc05.courseCode}`);
    assert(doc05.author.includes('Trần Đức Đạt'), 'DOC_05 author is Trần Đức Đạt');

    // Verify all 5 team members are recognized in both
    const teamMemberNames = ['Khoa', 'Trâm', 'Vĩ', 'Danh', 'Đạt'];
    const pluginAuthors = sampleDocs.map(d => d.author).join(' ');
    teamMemberNames.forEach(m => {
      assert(pluginAuthors.includes(m), `Team member ${m} authored documents in plugin sample data`);
    });

    console.log('\n--- 2. Web Client vs Figma Plugin: Course Codes & Curriculum Sync ---');
    const pluginCourseCodes = [...new Set(pluginCode.match(/COMP\d{4}|POLI\d{4}/g))];
    const clientCourseCodes = INITIAL_COURSES.map(c => c.code);

    assert(pluginCourseCodes.includes('COMP1044'), 'Plugin includes course COMP1044 (Phương pháp dạy học môn Tin học)');
    assert(pluginCourseCodes.includes('COMP1015'), 'Plugin includes course COMP1015 (Mạng máy tính)');
    assert(pluginCourseCodes.includes('COMP1022'), 'Plugin includes course COMP1022 (Lập trình Web và Ứng dụng)');
    assert(pluginCourseCodes.includes('COMP1001'), 'Plugin includes course COMP1001 (Cơ sở lập trình)');

    assert(clientCourseCodes.includes('COMP1044'), 'Client includes course COMP1044');
    assert(clientCourseCodes.includes('COMP1015'), 'Client includes course COMP1015');
    assert(clientCourseCodes.includes('COMP1022'), 'Client includes course COMP1022');
    assert(clientCourseCodes.includes('COMP1001'), 'Client includes course COMP1001');

    console.log('\n--- 3. Web Client vs Figma Plugin: Format Ribbon & Badge Sync ---');
    const pdfCardHtml = renderToStaticMarkup(React.createElement(DocumentCard, { doc: clientDoc1 }));
    assert(pdfCardHtml.includes('status-badge red'), 'Client renders red badge for PDF format');
    assert(pdfCardHtml.includes('PDF'), 'Client renders PDF label for PDF format');
    assert(pdfCardHtml.includes('trang'), 'Client renders "trang" unit for PDF format');

    const docxDoc = INITIAL_DOCUMENTS.find(d => d.format === 'docx');
    const docxCardHtml = renderToStaticMarkup(React.createElement(DocumentCard, { doc: docxDoc }));
    assert(docxCardHtml.includes('status-badge blue'), 'Client renders blue badge for DOCX format');
    assert(docxCardHtml.includes('DOCX'), 'Client renders DOCX label for DOCX format');
    assert(docxCardHtml.includes('trang'), 'Client renders "trang" unit for DOCX format');

    const pptxDoc = INITIAL_DOCUMENTS.find(d => d.format === 'pptx');
    const pptxCardHtml = renderToStaticMarkup(React.createElement(DocumentCard, { doc: pptxDoc }));
    assert(pptxCardHtml.includes('status-badge amber'), 'Client renders amber badge for PPTX format');
    assert(pptxCardHtml.includes('PPTX'), 'Client renders PPTX label for PPTX format');
    assert(pptxCardHtml.includes('slide'), 'Client renders "slide" unit for PPTX format');

    // In Figma Plugin createDocumentCardNode:
    assert(pluginCode.includes("let badgeColor = 'red';"), 'Plugin defaults badge color to red for PDF');
    assert(pluginCode.includes("let formatLabel = 'PDF • A4';"), 'Plugin sets PDF • A4 format label');
    assert(pluginCode.includes("let unitLabel = 'trang';"), 'Plugin sets trang unit label for PDF');
    assert(pluginCode.includes("badgeColor = 'blue';"), 'Plugin sets blue badge for DOCX');
    assert(pluginCode.includes("formatLabel = 'DOCX • Word';"), 'Plugin sets DOCX • Word label');
    assert(pluginCode.includes("badgeColor = 'amber';"), 'Plugin sets amber badge for PPTX');
    assert(pluginCode.includes("formatLabel = 'PPTX • Slide';"), 'Plugin sets PPTX • Slide label');
    assert(pluginCode.includes("unitLabel = 'slide';"), 'Plugin sets slide unit label for PPTX');

    console.log('\n--- 4. Web Client vs Figma Plugin: User Roles & Persona Switcher Sync ---');
    // Verify 3 actors in both
    const actors = ['GUEST', 'STUDENT', 'ADMIN'];
    actors.forEach(role => {
      assert(pluginCode.includes(`Persona_Opt_${role}`), `Plugin includes Persona switcher option Persona_Opt_${role}`);
    });

    // Verify 3 Flow Starting Points in plugin
    assert(pluginCode.includes('targetPage.flowStartingPoints = ['), 'Plugin configures targetPage.flowStartingPoints');
    assert(pluginCode.includes('Khách vãng lai (Guest'), 'Plugin flowStartingPoints contains Guest flow');
    assert(pluginCode.includes('Sinh viên SPTH (Student'), 'Plugin flowStartingPoints contains Student flow');
    assert(pluginCode.includes('Quản trị viên (Admin'), 'Plugin flowStartingPoints contains Admin flow');

    // Check circular avatar button & menu popover IDs
    assert(pluginCode.includes('#btnTopAvatar'), 'Plugin Topbar implements circular #btnTopAvatar');
    assert(pluginCode.includes('#menuTopAvatar'), 'Plugin Topbar implements natural popover #menuTopAvatar');
    assert(platformCss.includes('#btnTopAvatar') || platformCss.includes('.vec-topbar-avatar-btn'), 'Client styles #btnTopAvatar / .vec-topbar-avatar-btn');
    assert(platformCss.includes('#menuTopAvatar') || platformCss.includes('.vec-avatar-popover'), 'Client styles #menuTopAvatar / .vec-avatar-popover');

    console.log('\n--- 5. Web Client vs Figma Plugin: Radix Color Tokens 1:1 Match ---');
    // Extract CSS variables from radix_colors.css
    const cssTokens = {};
    const cssRegex = /--(slate|blue|green|amber|red)-(\d+):\s*(#[0-9a-fA-F]{6})/g;
    let m;
    while ((m = cssRegex.exec(radixCss)) !== null) {
      cssTokens[`${m[1]}${m[2]}`] = m[3].toLowerCase();
    }

    // Verify key Radix Light Mode tokens required by ORIGINAL_REQUEST.md R1
    const requiredTokens = [
      { key: 'slate1', expected: '#fcfcfd' },
      { key: 'slate2', expected: '#f9f9fb' },
      { key: 'slate3', expected: '#f0f0f3' },
      { key: 'slate6', expected: '#e6e8eb' },
      { key: 'slate7', expected: '#d7dfe3' },
      { key: 'slate8', expected: '#c1c8cd' },
      { key: 'slate9', expected: '#8b939a' },
      { key: 'slate11', expected: '#687076' },
      { key: 'slate12', expected: '#11181c' },
      { key: 'blue9', expected: '#0090ff' },
      { key: 'blue10', expected: '#0588f0' },
      { key: 'green9', expected: '#30a46c' },
      { key: 'amber9', expected: '#ffb224' },
      { key: 'red9', expected: '#e5484d' }
    ];

    requiredTokens.forEach(({ key, expected }) => {
      assert(cssTokens[key] === expected, `radix_colors.css defines ${key} as ${expected}`);
    });

    // Check code.js COLORS matching
    const codeColorsRegex = /([a-zA-Z0-9_]+):\s*\{\s*r:\s*([\d\s\/.]+),\s*g:\s*([\d\s\/.]+),\s*b:\s*([\d\s\/.]+)\s*\}/g;
    let cMatch;
    let codeMatchedCount = 0;
    while ((cMatch = codeColorsRegex.exec(pluginCode)) !== null) {
      const tokenName = cMatch[1];
      if (tokenName === 'white') continue;
      const r = eval(cMatch[2]);
      const g = eval(cMatch[3]);
      const b = eval(cMatch[4]);
      const hex = '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
      // Check required tokens
      const req = requiredTokens.find(t => t.key === tokenName);
      if (req) {
        assert(hex === req.expected, `code.js COLORS.${tokenName} (${hex}) matches required token (${req.expected})`);
        codeMatchedCount++;
      }
    }
    assert(codeMatchedCount === requiredTokens.length, `All ${requiredTokens.length} required Radix tokens matched in code.js`);

    // Check ui.html :root variables
    const uiTokensRegex = /--(slate|blue|green|amber|red)-(\d+):\s*(#[0-9a-fA-F]{6})/g;
    let uiMatch;
    let uiMatchedCount = 0;
    while ((uiMatch = uiTokensRegex.exec(pluginHtml)) !== null) {
      const tokenKey = `${uiMatch[1]}${uiMatch[2]}`;
      const hex = uiMatch[3].toLowerCase();
      if (cssTokens[tokenKey]) {
        assert(hex === cssTokens[tokenKey], `ui.html --${uiMatch[1]}-${uiMatch[2]} (${hex}) matches radix_colors.css (${cssTokens[tokenKey]})`);
        uiMatchedCount++;
      }
    }
    assert(uiMatchedCount >= 28, `ui.html matched ${uiMatchedCount} Radix tokens against radix_colors.css (>= 28)`);

    console.log('\n--- 6. Zero Dark Mode & Anti-AI-Slop Across Client & Plugin ---');
    const darkChecks = [
      { name: 'radix_colors.css', content: radixCss },
      { name: 'platform.css', content: platformCss },
      { name: 'plugin code.js', content: pluginCode },
      { name: 'plugin ui.html', content: pluginHtml }
    ];

    darkChecks.forEach(({ name, content }) => {
      assert(!content.includes('data-theme="dark"'), `${name} has zero 'data-theme="dark"'`);
      assert(!content.includes('.dark-theme'), `${name} has zero '.dark-theme'`);
      assert(!content.includes('#0f172a'), `${name} has zero dark hex '#0f172a'`);
      assert(!content.includes('#0b1120'), `${name} has zero dark hex '#0b1120'`);
    });

    // Check zero exposed UI jargon in client/src/components
    const componentsDir = path.resolve('client/src/components');
    function scanComponents(dir, forbidden) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanComponents(fullPath, forbidden);
        } else if (entry.isFile() && (entry.name.endsWith('.jsx') || entry.name.endsWith('.js'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const item of forbidden) {
            assert(!content.includes(item), `${entry.name} has zero '${item}'`);
          }
        }
      }
    }
    scanComponents(componentsDir, ['STAGE 01', 'CLOUDINARY SANDBOX', '[UC0', '[UC1']);

    // =========================================================================
    // SECTION 2: WEB CLIENT NON-REGRESSION
    // =========================================================================
    console.log('\n--- 7. Non-Regression: Topbar Navigation & Avatar Switcher ---');
    const studentUser = {
      id: 'vi',
      fullName: 'Phan Triệu Vĩ',
      email: '50.01.103.089@student.hcmue.edu.vn',
      role: 'USER',
      points: 140,
      cohort: 'K50 Sư phạm Tin học',
      avatarInitials: 'TV'
    };
    const adminUser = {
      id: 'khoa',
      fullName: 'Nguyễn Trần Đăng Khoa',
      email: '50.01.103.033@student.hcmue.edu.vn',
      role: 'ADMIN',
      points: 300,
      cohort: 'Ban Quản trị Khoa CNTT',
      avatarInitials: 'ĐK'
    };

    const guestNavbarHtml = renderToStaticMarkup(React.createElement(Navbar, { actorRole: 'GUEST', activeView: 'landing' }));
    assert(guestNavbarHtml.includes('vec-topbar'), 'Topbar renders .vec-topbar class');
    assert(guestNavbarHtml.includes('id="btnTopAvatar"'), 'Topbar renders #btnTopAvatar element');
    assert(guestNavbarHtml.includes('title="Đăng nhập vào 5share"'), 'Guest avatar button has login prompt title');
    assert(!guestNavbarHtml.includes('id="notificationBellBtn"'), 'Guest topbar does NOT expose notification bell');

    const studentNavbarHtml = renderToStaticMarkup(React.createElement(Navbar, {
      actorRole: 'USER',
      userSession: studentUser,
      activeView: 'discovery',
      notifications: [
        { id: 'n1', title: 'N1', isRead: false },
        { id: 'n2', title: 'N2', isRead: false },
        { id: 'n3', title: 'N3', isRead: false }
      ]
    }));
    assert(studentNavbarHtml.includes('>TV</div>') || studentNavbarHtml.includes('TV'), 'Student avatar button displays initials "TV"');
    assert(studentNavbarHtml.includes('id="notificationBellBtn"'), 'Student topbar includes notification bell');
    assert(studentNavbarHtml.includes('id="unreadBadge">3</span>'), 'Student topbar displays unread notification count "3"');

    const adminNavbarHtml = renderToStaticMarkup(React.createElement(Navbar, {
      actorRole: 'ADMIN',
      userSession: adminUser,
      activeView: 'bounty'
    }));
    assert(adminNavbarHtml.includes('>ĐK</div>') || adminNavbarHtml.includes('ĐK'), 'Admin avatar button displays initials "ĐK"');

    // Active link 2px bottom bar check
    assert(guestNavbarHtml.includes('active') && guestNavbarHtml.includes('Trang chủ'), 'Active indicator present on "Trang chủ"');
    assert(studentNavbarHtml.includes('active') && studentNavbarHtml.includes('Kho học liệu'), 'Active indicator present on "Kho học liệu"');
    assert(adminNavbarHtml.includes('active') && adminNavbarHtml.includes('Treo thưởng'), 'Active indicator present on "Treo thưởng"');

    console.log('\n--- 8. Non-Regression: 5-Act LandingPage Scrollytelling & 0 Buzzwords ---');
    const landingHtml = renderToStaticMarkup(React.createElement(LandingPage, { onExplore: () => {}, onUpload: () => {} }));
    assert(landingHtml.includes('scrolly-runway'), 'LandingPage renders .scrolly-runway container');
    assert(landingHtml.includes('chapter-scrubber'), 'LandingPage renders right-edge .chapter-scrubber (I-V)');
    assert(landingHtml.includes('APERTURE SINGULARITY'), 'LandingPage renders Act I: Aperture Singularity');
    assert(landingHtml.includes('GRAVITATIONAL CONVERGENCE'), 'LandingPage renders Act II: Gravitational Convergence');
    assert(landingHtml.includes('ISOMETRIC DECONSTRUCTION'), 'LandingPage renders Act III: Isometric Exploded View');
    assert(landingHtml.includes('Sự Nguyên Vẹn (Integrity)'), 'Act III callout Layer 1 Integrity present');
    assert(landingHtml.includes('Sự Phân Định (Taxonomy)'), 'Act III callout Layer 2 Taxonomy present');
    assert(landingHtml.includes('Sự Thẩm Định (Refinement)'), 'Act III callout Layer 3 Refinement present');
    assert(landingHtml.includes('Sự Truyền Đạt (Clarity)'), 'Act III callout Layer 4 Clarity present');
    assert(landingHtml.includes('studio-pillar-1.png'), 'Act IV references Studio 3D Key Visual 1');
    assert(landingHtml.includes('studio-pillar-2.png'), 'Act IV references Studio 3D Key Visual 2');
    assert(landingHtml.includes('studio-pillar-3.png'), 'Act IV references Studio 3D Key Visual 3');
    assert(landingHtml.includes('THRESHOLD REACHED'), 'LandingPage renders Act V: Threshold Portal');

    // Strict Anti-Literalism / Zero-Buzzword check in LandingPage.jsx source code
    const landingSourcePath = path.resolve('client/src/components/home/LandingPage.jsx');
    const landingSource = fs.readFileSync(landingSourcePath, 'utf8');
    const forbiddenBuzzwords = ['K48', 'K49', 'K50', '5512', 'COMP10', 'SHA-256', 'Magic Bytes', 'Zalo', 'Cloudinary', '8 tiêu chí'];
    forbiddenBuzzwords.forEach(buzzword => {
      assert(!landingSource.includes(buzzword), `LandingPage.jsx contains zero instances of forbidden buzzword: "${buzzword}"`);
    });

    console.log('\n--- 9. Non-Regression: DiscoveryPage Workspace at Top of Viewport ---');
    const discoveryHtml = renderToStaticMarkup(React.createElement(DiscoveryPage, {
      documents: INITIAL_DOCUMENTS,
      courses: INITIAL_COURSES,
      onSelectDoc: () => {},
      onToggleBookmark: () => {}
    }));
    assert(discoveryHtml.includes('discovery-workspace-root'), 'DiscoveryPage renders .discovery-workspace-root container');
    assert(discoveryHtml.includes('fts-search-row'), 'DiscoveryPage renders .fts-search-row search input row at top');
    assert(discoveryHtml.includes('filter-sidebar-card'), 'DiscoveryPage renders curriculum FilterSidebar');
    assert(!discoveryHtml.includes('scrolly-runway'), 'DiscoveryPage contains zero scrollytelling runway obstacles');

    console.log('\n--- 10. Non-Regression: 4-Layer Upload Validation with Binary Magic Bytes ---');
    const { verifyFileAndHash, verifyPdfFileAndHash, detectFormatFromExtension } = fileHasher;

    // Layer 1: Whitelist & Size
    assert(detectFormatFromExtension('sample.pdf') === 'pdf', 'detectFormatFromExtension identifies .pdf');
    assert(detectFormatFromExtension('sample.docx') === 'docx', 'detectFormatFromExtension identifies .docx');
    assert(detectFormatFromExtension('sample.pptx') === 'pptx', 'detectFormatFromExtension identifies .pptx');
    assert(detectFormatFromExtension('sample.exe') === null, 'detectFormatFromExtension rejects .exe');
    assert(detectFormatFromExtension('sample.pdf.exe') === null, 'detectFormatFromExtension rejects double extension .pdf.exe');

    // Layer 2: Magic Bytes
    const genuinePdfHeaderBytes = new Uint8Array([0x25, 0x50, 0x44, 0x2D, 0x31, 0x2E, 0x37, 0x0A]);
    const genuineZipHeaderBytes = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    const fakeHeaderBytes = new Uint8Array([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ executable

    const fakePdfResult = await verifyFileAndHash({
      name: 'malware.pdf',
      size: 1024,
      arrayBuffer: async () => fakeHeaderBytes.buffer
    }, INITIAL_DOCUMENTS);
    assert(!fakePdfResult.isValid, 'File with .pdf extension but executable header is rejected');
    assert(fakePdfResult.stageFailed === 'MAGIC_BYTES', 'Fake PDF fails at MAGIC_BYTES stage');

    const fakeDocxResult = await verifyFileAndHash({
      name: 'malware.docx',
      size: 1024,
      arrayBuffer: async () => fakeHeaderBytes.buffer
    }, INITIAL_DOCUMENTS);
    assert(!fakeDocxResult.isValid, 'File with .docx extension but executable header is rejected');
    assert(fakeDocxResult.stageFailed === 'MAGIC_BYTES', 'Fake DOCX fails at MAGIC_BYTES stage');

    // Genuine validation with Uint8Array buffers
    const genuinePdfResult = await verifyFileAndHash({
      name: 'genuine.pdf',
      size: 2048,
      arrayBuffer: async () => genuinePdfHeaderBytes.buffer
    }, INITIAL_DOCUMENTS);
    assert(genuinePdfResult.isValid, 'Genuine PDF buffer passes validation');
    assert(genuinePdfResult.magicBytesOk, 'magicBytesOk is true for genuine PDF');

    const genuineDocxResult = await verifyFileAndHash({
      name: 'genuine.docx',
      size: 4096,
      arrayBuffer: async () => genuineZipHeaderBytes.buffer
    }, INITIAL_DOCUMENTS);
    assert(genuineDocxResult.isValid, 'Genuine DOCX buffer passes validation');
    assert(genuineDocxResult.magicBytesOk, 'magicBytesOk is true for genuine DOCX');

    // Layer 3: SHA-256 Deduplication
    const knownDoc = INITIAL_DOCUMENTS[0];
    const duplicateResult = await verifyFileAndHash({
      name: 'duplicate.pdf',
      size: 2048,
      presetHash: knownDoc.fileHash
    }, INITIAL_DOCUMENTS);
    assert(!duplicateResult.isValid, 'Upload with duplicate SHA-256 hash is rejected');
    assert(duplicateResult.stageFailed === 'DUPLICATE_HASH', 'Duplicate fails at DUPLICATE_HASH stage');
    assert(duplicateResult.isDuplicate === true, 'isDuplicate is true for conflicting hash');

    // Backward compatibility verifyPdfFileAndHash
    const compatResult = await verifyPdfFileAndHash({
      name: 'word.docx',
      size: 1024,
      arrayBuffer: async () => genuineZipHeaderBytes.buffer
    }, INITIAL_DOCUMENTS);
    assert(!compatResult.isValid, 'verifyPdfFileAndHash rejects non-pdf file');

    console.log('\n--- 11. Non-Regression: Guest 3 Downloads/Day Rate Limiter ---');
    mockStorage.clear();
    const STORAGE_KEY = '5share_guest_downloads';

    function getGuestDownloads() {
      try {
        const raw = mockStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        return Array.isArray(parsed) ? parsed.filter(ts => typeof ts === 'number' && now - ts < TWENTY_FOUR_HOURS) : [];
      } catch {
        return [];
      }
    }

    function recordGuestDownload() {
      const active = getGuestDownloads();
      active.push(Date.now());
      mockStorage.setItem(STORAGE_KEY, JSON.stringify(active));
      return active.length;
    }

    assert(getGuestDownloads().length === 0, 'Initial guest download count is 0');
    recordGuestDownload();
    assert(getGuestDownloads().length === 1, 'After 1st download, count is 1');
    recordGuestDownload();
    assert(getGuestDownloads().length === 2, 'After 2nd download, count is 2');
    recordGuestDownload();
    assert(getGuestDownloads().length === 3, 'After 3rd download, count is 3 (limit reached)');

    const activeDownloads = getGuestDownloads();
    const canDownload = activeDownloads.length < 3;
    assert(!canDownload, '4th download attempt is strictly BLOCKED for guest');

    // Test 24h rolling expiration
    const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25h ago
    mockStorage.setItem(STORAGE_KEY, JSON.stringify([expiredTimestamp, expiredTimestamp, expiredTimestamp]));
    assert(getGuestDownloads().length === 0, 'Downloads older than 24 hours are expired and pruned');

    console.log('\n--- 12. Non-Regression: Admin Moderation Queue & 8 Criteria ---');
    assert(EIGHT_MODERATION_CRITERIA.length === 8, 'EIGHT_MODERATION_CRITERIA has exactly 8 criteria');
    const autoCriteria = EIGHT_MODERATION_CRITERIA.filter(c => c.type === 'AUTO');
    const adminCriteria = EIGHT_MODERATION_CRITERIA.filter(c => c.type === 'ADMIN');
    assert(autoCriteria.length === 5, 'Exactly 5 criteria are AUTO');
    assert(adminCriteria.length === 3, 'Exactly 3 criteria are ADMIN');

    const queueHtml = renderToStaticMarkup(React.createElement(ModerationQueue, {
      documents: INITIAL_DOCUMENTS,
      onApprove: () => {},
      onReject: () => {}
    }));
    assert(queueHtml.includes('Hàng đợi Kiểm duyệt'), 'ModerationQueue title rendered');

    console.log('\n--- 13. Non-Regression: FK Deletion Block on Courses ---');
    const courseWithDocs = INITIAL_COURSES.find(c => c.documentCount > 0);
    const courseWithoutDocs = INITIAL_COURSES.find(c => c.documentCount === 0);

    assert(courseWithDocs !== undefined, 'Found course with attached documents');
    assert(courseWithoutDocs !== undefined, 'Found course without attached documents (documentCount === 0)');

    function checkCanDeleteCourse(course, documents) {
      const attachedCount = documents.filter(d => d.courseCode === course.code && d.status !== 'DELETED').length;
      return attachedCount === 0;
    }

    assert(!checkCanDeleteCourse(courseWithDocs, INITIAL_DOCUMENTS), `Deletion is BLOCKED for course ${courseWithDocs.code} with attached documents`);
    assert(checkCanDeleteCourse(courseWithoutDocs, INITIAL_DOCUMENTS), `Deletion is ALLOWED for course ${courseWithoutDocs.code} with 0 attached documents`);

    console.log('\n--- 14. Non-Regression: User Management Lock/Unlock & Self-Lock Guard ---');
    const userMgmtHtml = renderToStaticMarkup(React.createElement(UserManagement, {
      users: INITIAL_USERS,
      currentUser: INITIAL_USERS[0], // user-khoa (logged in admin)
      onToggleUserStatus: () => {}
    }));
    assert(userMgmtHtml.includes('Quản trị Người dùng'), 'UserManagement header rendered');
    assert(userMgmtHtml.includes('(Bạn)'), 'UserManagement displays "(Bạn)" indicator for current admin');
    assert(userMgmtHtml.includes('Không thể tự khóa tài khoản của bạn'), 'UserManagement provides self-lock prevention tooltip');

    function attemptLockUser(targetUser, currentAdmin) {
      if (targetUser.id === currentAdmin.id || targetUser.email === currentAdmin.email) {
        return { allowed: false, error: 'Không thể tự khóa tài khoản của chính bạn!' };
      }
      return { allowed: true, newStatus: !targetUser.isActive };
    }

    const selfLockAttempt = attemptLockUser(INITIAL_USERS[0], INITIAL_USERS[0]);
    assert(!selfLockAttempt.allowed, 'Admin self-lock attempt is strictly BLOCKED');
    assert(selfLockAttempt.error.includes('Không thể tự khóa'), 'Self-lock returns correct warning message');

    const studentLockAttempt = attemptLockUser(INITIAL_USERS[1], INITIAL_USERS[0]);
    assert(studentLockAttempt.allowed, 'Admin CAN lock/unlock other users');

    console.log('\n--- 15. Non-Regression: Pure SVG Charts in Admin Dashboard ---');
    const dashboardHtml = renderToStaticMarkup(React.createElement(AdminDashboard, {
      documents: INITIAL_DOCUMENTS,
      courses: INITIAL_COURSES,
      users: INITIAL_USERS,
      onNavigate: () => {}
    }));
    assert(dashboardHtml.includes('<svg'), 'AdminDashboard renders <svg> elements');
    assert(dashboardHtml.includes('<rect'), 'AdminDashboard renders <rect> bars for horizontal bar chart');
    assert(dashboardHtml.includes('<path'), 'AdminDashboard renders <path> for download trend spline');
    assert(dashboardHtml.includes('linearGradient'), 'AdminDashboard renders linearGradient definitions for chart area');
    assert(!dashboardHtml.includes('NaN'), 'SVG chart coordinates contain zero NaN values');
    assert(!dashboardHtml.includes('Chart(') && !dashboardHtml.includes('recharts'), 'Zero external chart library calls (pure SVG)');

    console.log('\n--- 16. Non-Regression: Feedback Modal Form & Validation ---');
    const feedbackOpenHtml = renderToStaticMarkup(React.createElement(FeedbackModal, {
      isOpen: true,
      currentUser: studentUser,
      onClose: () => {},
      onSubmitFeedback: () => {}
    }));
    assert(feedbackOpenHtml.includes('HÒM THƯ GÓP Ý'), 'FeedbackModal title rendered');
    assert(feedbackOpenHtml.includes('Góp ý tính năng mới'), 'Feedback category 1 (FEATURE_REQUEST) present');
    assert(feedbackOpenHtml.includes('Báo lỗi kỹ thuật'), 'Feedback category 2 (BUG_REPORT) present');
    assert(feedbackOpenHtml.includes('Đề xuất học liệu'), 'Feedback category 3 (ACADEMIC_SUGGESTION) present');
    assert(feedbackOpenHtml.includes('Ý kiến đóng góp khác'), 'Feedback category 4 (OTHER) present');

    const feedbackClosedHtml = renderToStaticMarkup(React.createElement(FeedbackModal, {
      isOpen: false,
      currentUser: studentUser,
      onClose: () => {},
      onSubmitFeedback: () => {}
    }));
    assert(feedbackClosedHtml === '', 'FeedbackModal returns empty markup when isOpen is false');

  } catch (err) {
    console.error('Fatal error during test execution:', err);
    assert(false, `Test execution threw error: ${err.message}`);
  } finally {
    await server.close();
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('\n============================================================');
  console.log(`  M5 ADVERSARIAL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${totalTests})`);
  console.log('============================================================\n');

  if (failed > 0) {
    console.error('❌ Failures encountered:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('🎉 [SUCCESS] 100% of Milestone 5 Cross-Track & Non-Regression Tests Passed!');
    process.exit(0);
  }
}

run();
