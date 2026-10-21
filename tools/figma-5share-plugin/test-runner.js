/**
 * Kiểm thử tự động toàn diện cho bộ Figma Plugin 5Share (`tools/figma-5share-plugin/code.js`)
 * và các quy tắc nghiệp vụ cốt lõi trên Frontend (`client/src/utils/fileHasher.js`, `client/src/data/mockData.js`):
 * 1. Tạo đầy đủ 19 màn hình (`SCR_00` đến `SCR_18`) + `00_Design_System_Components` bằng Native Figma Nodes
 * 2. Mọi dây nối Prototype qua `await node.setReactionsAsync(...)` đều trỏ tới `destinationId` hợp lệ
 * 3. Khởi tạo đủ 3 `flowStartingPoints` cho 3 Actor (Guest, Student, Admin)
 * 4. Kiểm thử các trường hợp biên (Edge Cases) của UC07/UC08:
 *    - Đầu vào rỗng (null/undefined)
 *    - Sai định dạng đuôi tệp (.exe, .docx)
 *    - Vượt ngưỡng dung lượng (> 25MB) và đúng biên (25MB)
 *    - Giả mạo chữ ký nhị phân Magic Bytes (MZ thay vì %PDF-)
 *    - Trùng mã băm SHA-256 với tài liệu đã tồn tại trong CSDL
 *    - Tệp PDF hợp lệ và duy nhất
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

let idCounter = 1;
const allNodesById = new Map();
const allReactions = [];

function createMockNode(type) {
  const id = `${type}_${idCounter++}`;
  const node = {
    id,
    type,
    name: type,
    width: 100,
    height: 40,
    x: 0,
    y: 0,
    children: [],
    reactions: [],
    parent: null,
    appendChild(child) {
      child.parent = this;
      this.children.push(child);
    },
    resize(w, h) {
      this.width = w;
      this.height = h;
      // Mô phỏng đúng hành vi của Figma Plugin API thật: gọi resize() sau khi bật Auto Layout sẽ reset cả 2 trục về 'FIXED'
      if (this.layoutMode) {
        this.primaryAxisSizingMode = 'FIXED';
        this.counterAxisSizingMode = 'FIXED';
      }
    },
    remove() {
      if (this.parent && Array.isArray(this.parent.children)) {
        this.parent.children = this.parent.children.filter((c) => c !== this);
      }
    },
    async setReactionsAsync(reactionsList) {
      if (!Array.isArray(reactionsList) || reactionsList.length === 0) {
        throw new Error('Reactions list must be a non-empty array');
      }
      for (const r of reactionsList) {
        if (!r.trigger || r.trigger.type !== 'ON_CLICK') {
          throw new Error('Invalid trigger type');
        }
        if (!Array.isArray(r.actions) || !r.actions[0].destinationId) {
          throw new Error('Missing destinationId in reaction action');
        }
      }
      this.reactions = reactionsList;
      allReactions.push({ sourceId: this.id, sourceName: this.name, reactions: reactionsList });
    }
  };
  allNodesById.set(id, node);
  return node;
}

const rootPage = createMockNode('PAGE');
rootPage.name = 'Page 1';

const messagesToUi = [];

const figmaMock = {
  root: {
    children: [rootPage]
  },
  currentPage: rootPage,
  ui: {
    onmessage: null,
    postMessage(msg) {
      messagesToUi.push(msg);
    }
  },
  viewport: {
    scrollAndZoomIntoView() {}
  },
  showUI() {},
  notify() {},
  closePlugin() {},
  async loadFontAsync() {},
  async setCurrentPageAsync(p) {
    this.currentPage = p;
  },
  createPage() {
    const p = createMockNode('PAGE');
    this.root.children.push(p);
    return p;
  },
  createFrame() {
    return createMockNode('FRAME');
  },
  createComponent() {
    return createMockNode('COMPONENT');
  },
  createText() {
    return createMockNode('TEXT');
  },
  createRectangle() {
    return createMockNode('RECTANGLE');
  },
  createVector() {
    return createMockNode('VECTOR');
  },
  createImage(bytes) {
    assert.ok(bytes && typeof bytes.byteLength === 'number' && bytes.byteLength > 0, 'createImage requires non-empty Uint8Array');
    return { hash: 'img_hash_' + (idCounter++) };
  },
  createNodeFromSvg(svgStr) {
    assert.ok(typeof svgStr === 'string' && svgStr.includes('<svg'), 'createNodeFromSvg requires valid SVG string');
    const svgFrame = createMockNode('FRAME');
    svgFrame.svgContent = svgStr;
    return svgFrame;
  }
};

function findNodeByName(root, targetName) {
  if (root.name === targetName) return root;
  for (const child of root.children || []) {
    const found = findNodeByName(child, targetName);
    if (found) return found;
  }
  return null;
}

async function runTests() {
  // 1. Kiểm thử Figma Plugin (code.js)
  const codePath = path.join(__dirname, 'code.js');
  const codeContent = fs.readFileSync(codePath, 'utf8');

  const sandbox = {
    figma: figmaMock,
    __html__: '<html></html>',
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(codeContent, sandbox);

  assert.strictEqual(typeof figmaMock.ui.onmessage, 'function', 'figma.ui.onmessage must be a function');

  // 1a. Kiểm thử tùy chọn includeScreens: false (chỉ tạo Design System)
  await figmaMock.ui.onmessage({
    type: 'GENERATE_5SHARE_PROTOTYPE',
    options: {
      includeDesignSystem: true,
      includeScreens: false,
      includeWires: false
    }
  });
  const dsOnlyPage = figmaMock.currentPage;
  assert.strictEqual(dsOnlyPage.children.length, 1, 'When includeScreens is false, only 00_Design_System_Components should be created');
  assert.strictEqual(dsOnlyPage.children[0].name, '00_Design_System_Components');

  // 1b. Kiểm thử tạo đầy đủ 19 màn hình + Design System + Dây nối Prototype
  messagesToUi.length = 0;
  allReactions.length = 0;

  await figmaMock.ui.onmessage({
    type: 'GENERATE_5SHARE_PROTOTYPE',
    options: {
      includeDesignSystem: true,
      includeScreens: true,
      includeWires: true
    }
  });

  const completeMsg = messagesToUi.find((m) => m.type === 'GENERATION_COMPLETE');
  const errorMsg = messagesToUi.find((m) => m.type === 'GENERATION_ERROR');

  assert.strictEqual(errorMsg, undefined, 'Plugin should not emit GENERATION_ERROR');
  assert.ok(completeMsg, 'Plugin must emit GENERATION_COMPLETE');

  const targetPage = figmaMock.currentPage;
  const topLevelNames = targetPage.children.map((c) => c.name);

  const expectedFrames = [
    '00_Design_System_Components',
    'SCR_00_Home_Landing',
    'SCR_01_Auth_Login',
    'SCR_02_Auth_Register',
    'SCR_03_Notification_Dropdown',
    'SCR_04_Report_Modal',
    'SCR_05_Home_Discovery',
    'SCR_06_Doc_Detail_Guest',
    'SCR_07_Doc_Detail_Student',
    'SCR_08_Upload_Document',
    'SCR_09_Upload_Hash_Validation',
    'SCR_10_Admin_Moderation',
    'SCR_11_Admin_Courses',
    'SCR_12_Student_MyDocs',
    'SCR_13_Admin_Dashboard',
    'SCR_14_Student_Bookmarks',
    'SCR_15_User_Profile',
    'SCR_16_Study_Bounty',
    'SCR_17_Admin_Users',
    'SCR_18_Feedback_Modal'
  ];

  for (const name of expectedFrames) {
    assert.ok(topLevelNames.includes(name), `Missing expected top-level frame: ${name}`);
    if (name.startsWith('SCR_')) {
      const scrNode = findNodeByName(targetPage, name);
      const exactRender = findNodeByName(scrNode, 'Web_Exact_Viewport_Render');
      assert.ok(exactRender, `${name} must contain Web_Exact_Viewport_Render for 100% pixel-exact Web Local rendering`);
      assert.strictEqual(exactRender.layoutPositioning, 'ABSOLUTE', `${name} Web_Exact_Viewport_Render must use ABSOLUTE positioning`);
      assert.ok(exactRender.children.length >= 1, `${name} Web_Exact_Viewport_Render must have >= 1 vertical image tile`);
      for (const tile of exactRender.children) {
        assert.ok(Array.isArray(tile.fills) && tile.fills[0] && tile.fills[0].type === 'IMAGE' && tile.fills[0].imageHash, `${name} tile must have IMAGE fill with valid imageHash`);
      }
    }
  }

  // Kiểm tra Auto Layout sizing modes không bị resize() ghi đè sai
  const navMenuLinks = findNodeByName(targetPage, 'Nav_Menu_Links');
  assert.ok(navMenuLinks, 'Must find Nav_Menu_Links in Topbar');
  assert.strictEqual(navMenuLinks.primaryAxisSizingMode, 'AUTO', 'Nav_Menu_Links must use AUTO primaryAxisSizingMode so tabs never clip at 100px');

  const loginCard = findNodeByName(targetPage, 'Login_Modal_Card');
  assert.ok(loginCard, 'Must find Login_Modal_Card');
  assert.strictEqual(loginCard.primaryAxisSizingMode, 'AUTO', 'Vertical card without explicit height must hug contents (AUTO)');
  assert.strictEqual(loginCard.counterAxisSizingMode, 'FIXED', 'Vertical card with explicit width must have FIXED counterAxisSizingMode');

  const docCard = findNodeByName(targetPage, 'DocCard_DOC_01');
  assert.ok(docCard, 'Must find DocCard_DOC_01');
  assert.strictEqual(docCard.primaryAxisSizingMode, 'AUTO', 'DocCard must hug contents vertically (AUTO)');
  assert.strictEqual(docCard.counterAxisSizingMode, 'FIXED', 'DocCard must have FIXED width');

  // Kiểm tra các nút tương tác quan trọng đều đã được nối dây Prototype
  for (const btnName of [
    'Btn_Student_Download_PDF',
    'Notif_Item_Comment',
    'Btn_Admin_Hide_Report',
    'Btn_Search_FTS',
    'Persona_Opt_GUEST',
    'Persona_Opt_STUDENT',
    'Persona_Opt_ADMIN',
    'Admin_Nav_Item_dashboard',
    'Admin_Nav_Item_moderation',
    'Admin_Nav_Item_courses',
    'Admin_Nav_Item_explore',
    'Btn_ActV_Enter_Workspace',
    'Btn_Open_Feedback_Modal',
    'Nav_Link_Feedback',
    'Tree_Course_Node_COMP1044',
    'Tree_Course_Node_COMP1010',
    'Tree_Course_Node_COMP1818',
    'Tree_Course_Node_EDUC2801'
  ]) {
    const btnNode = findNodeByName(targetPage, btnName);
    assert.ok(btnNode, `Must find interactive node ${btnName}`);
    assert.ok(btnNode.reactions && btnNode.reactions.length > 0, `${btnName} must have prototype reactions wired`);
  }

  // Kiểm tra đồng bộ Production UI (Scrollytelling Hero, 240px Sidebar, Interactive Curriculum Tree Map, Mini A4 Sheet, 70/30 Reader, Inline Strip, Admin Dark Sidebar, Red Pending Badge)
  for (const prodNodeName of [
    'Navbar_Persona_Switcher_Pill',
    'Dream_Thoughts_Visual_Banner',
    'Study_Room_3D_Backdrop',
    'Scrolly_Living_Document_Hero',
    'Living_Document_Sapphire_Stage',
    'Five_Categories_Visual_Columns',
    'Vortex_Crystal_Centerpiece',
    'Kinetic_Brand_Stage_Lockup',
    'Filter_Sidebar_240px',
    'SaaS_Context_Header',
    'Interactive_Curriculum_Tree_Map',
    'Orthogonal_PCB_Wires_HK1_to_HK2',
    'Orthogonal_PCB_Wires_HK4_to_HK5',
    'Curriculum_Official_Legend_Bar',
    'Graduation_Conditions_3_Bars',
    'Vectoria_DocType_Tabs',
    'Doc_Mini_A4_Sheet_Stage',
    'Folio_Eyebrow_Row',
    'Guest_Page4_Blurred_Preview_And_Unlock_Card',
    'Student_70Pct_A4_Reader_Stage',
    'Student_30Pct_Sticky_Sidebar',
    'Inline_Verification_Strip',
    'Live_8_Criteria_Checklist',
    'Admin_Dark_Sidebar',
    'Admin_Pending_Red_Badge',
    'Split_Review_Left_PDF_Preview',
    'Ribbon_3D_Blade_Left_Cobalt',
    'Kinetic_Digit_5',
    'Side_Cat_All',
    'Select_Control_Box',
    'Wire_Orthogonal_Bus_Active_Blue',
    'Guest_PDF_Toolbar',
    'Top_Courses_Bar_Chart_Card',
    'Weekly_Downloads_Trend_Chart_Card'
  ]) {
    const prodNode = findNodeByName(targetPage, prodNodeName);
    assert.ok(prodNode, `Must find Production UI node ${prodNodeName}`);
  }

  // Kiểm tra các khung màn hình chính không có khoảng hở dư thừa giữa Navbar và phần thân (itemSpacing === 0)
  for (const scrName of [
    'SCR_00_Home_Landing',
    'SCR_05_Home_Discovery',
    'SCR_10_Admin_Moderation',
    'SCR_11_Admin_Courses',
    'SCR_13_Admin_Dashboard',
    'SCR_15_User_Profile',
    'SCR_16_Study_Bounty',
    'SCR_17_Admin_Users'
  ]) {
    const scrNode = findNodeByName(targetPage, scrName);
    assert.ok(scrNode, `Must find screen ${scrName}`);
    assert.strictEqual(scrNode.itemSpacing, 0, `${scrName} must have itemSpacing === 0 so Navbar and workspace fit cleanly`);
  }

  // Đảm bảo không còn thanh bài tập Traceability_Banner trên các màn hình Production UI
  const traceBannerNode = findNodeByName(targetPage, 'Traceability_Banner');
  assert.strictEqual(traceBannerNode, null, 'Production UI must not render homework Traceability_Banner');

  const screenIds = new Set(targetPage.children.map((c) => c.id));
  for (const item of allReactions) {
    const destId = item.reactions[0].actions[0].destinationId;
    assert.ok(screenIds.has(destId), `Reaction on ${item.sourceName} points to unknown screen ID ${destId}`);
  }

  assert.strictEqual(targetPage.flowStartingPoints.length, 3, 'Must have 3 Actor flowStartingPoints');

  // 2. Kiểm thử Edge Cases của module băm SHA-256 & Magic Bytes (`client/src/utils/fileHasher.js`)
  const fileHasherModule = await import('../../client/src/utils/fileHasher.js');
  const mockDataModule = await import('../../client/src/data/mockData.js');

  const { verifyPdfFileAndHash, computeDeterministicHexHash } = fileHasherModule;
  const { INITIAL_DOCUMENTS, USE_CASE_MATRIX, EIGHT_MODERATION_CRITERIA, TEAM_MEMBERS } = mockDataModule;

  assert.strictEqual(USE_CASE_MATRIX.length, 13, 'Must have exactly 13 Use Cases (UC01-UC13)');
  assert.strictEqual(EIGHT_MODERATION_CRITERIA.length, 8, 'Must have exactly 8 Moderation Criteria');
  assert.strictEqual(TEAM_MEMBERS.length, 5, 'Must have 5 team members (Khoa, Trâm, Vĩ, Danh, Đạt)');

  for (const doc of INITIAL_DOCUMENTS) {
    assert.match(doc.fileHash, /^[0-9a-f]{64}$/, `Document ${doc.id} must have a valid 64-char hex SHA-256 hash`);
  }

  // Edge Case A: Null input
  const resNull = await verifyPdfFileAndHash(null, INITIAL_DOCUMENTS);
  assert.strictEqual(resNull.isValid, false);
  assert.strictEqual(resNull.stageFailed, 'FILE_MISSING');

  // Edge Case B: Sai định dạng đuôi tệp (.exe) hoặc sai MIME type
  const resWrongExt = await verifyPdfFileAndHash({ name: 'malware.exe', size: 1024 }, INITIAL_DOCUMENTS);
  assert.strictEqual(resWrongExt.isValid, false);
  assert.strictEqual(resWrongExt.stageFailed, 'EXTENSION');

  const resWrongMime = await verifyPdfFileAndHash(
    { name: 'disguised.pdf', size: 2048, type: 'application/x-msdownload' },
    INITIAL_DOCUMENTS
  );
  assert.strictEqual(resWrongMime.isValid, false);
  assert.strictEqual(resWrongMime.stageFailed, 'EXTENSION');

  // Edge Case B2: Tệp rỗng 0 byte
  const resZeroByte = await verifyPdfFileAndHash({ name: 'empty.pdf', size: 0 }, INITIAL_DOCUMENTS);
  assert.strictEqual(resZeroByte.isValid, false);
  assert.strictEqual(resZeroByte.stageFailed, 'EMPTY_FILE');

  // Edge Case C: Vượt quá 25MB (25.1 MB)
  const resTooLarge = await verifyPdfFileAndHash(
    { name: 'big_slide.pdf', size: Math.round(25.1 * 1024 * 1024) },
    INITIAL_DOCUMENTS
  );
  assert.strictEqual(resTooLarge.isValid, false);
  assert.strictEqual(resTooLarge.stageFailed, 'SIZE_LIMIT');

  // Edge Case D: Đúng biên 25.0 MB (Hợp lệ)
  const resBoundary25Mb = await verifyPdfFileAndHash(
    { name: 'boundary_25mb.pdf', size: 25 * 1024 * 1024 },
    INITIAL_DOCUMENTS
  );
  assert.strictEqual(resBoundary25Mb.isValid, true);
  assert.match(resBoundary25Mb.sha256Hash, /^[0-9a-f]{64}$/);

  // Edge Case E: Giả mạo chữ ký nhị phân Magic Bytes
  const resFakeMagic = await verifyPdfFileAndHash(
    { name: 'fake_renamed.pdf', size: 1024 * 500, presetMagic: 'INVALID_EXE' },
    INITIAL_DOCUMENTS
  );
  assert.strictEqual(resFakeMagic.isValid, false);
  assert.strictEqual(resFakeMagic.stageFailed, 'MAGIC_BYTES');

  // Edge Case F: Trùng mã băm SHA-256 với tài liệu đã tồn tại
  const resDuplicate = await verifyPdfFileAndHash(
    {
      name: 'copy_of_doc1.pdf',
      size: 2048 * 1024,
      presetHash: INITIAL_DOCUMENTS[0].fileHash
    },
    INITIAL_DOCUMENTS
  );
  assert.strictEqual(resDuplicate.isValid, false);
  assert.strictEqual(resDuplicate.isDuplicate, true);
  assert.strictEqual(resDuplicate.stageFailed, 'DUPLICATE_HASH');

  // Edge Case G: ArrayBuffer thực tế chứa %PDF-1.7
  const realPdfBytes = new TextEncoder().encode('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n');
  const resRealBuffer = await verifyPdfFileAndHash(
    {
      name: 'real_buffer_test.pdf',
      size: realPdfBytes.byteLength,
      async arrayBuffer() {
        return realPdfBytes.buffer;
      }
    },
    INITIAL_DOCUMENTS
  );
  assert.strictEqual(resRealBuffer.isValid, true);
  assert.strictEqual(resRealBuffer.magicBytesOk, true);
  assert.match(resRealBuffer.sha256Hash, /^[0-9a-f]{64}$/);
  assert.match(computeDeterministicHexHash('test'), /^[0-9a-f]{64}$/);

  console.log(`✅ [PASS] Verified ${expectedFrames.length} top-level Native Frames (${expectedFrames.length - 1} screens + 1 Design System) & Auto Layout sizing modes.`);
  console.log(`✅ [PASS] Verified ${allReactions.length} Prototype wires via setReactionsAsync (including Download, Comment Notif, and Hide Report buttons).`);
  console.log(`✅ [PASS] Verified ${targetPage.flowStartingPoints.length} Actor Flow Starting Points & includeScreens=false option.`);
  console.log(`✅ [PASS] Verified all 9 Edge Cases for UC07/UC08 (Null, Wrong Ext, Wrong MIME, 0-Byte Empty, >25MB, 25MB Boundary, Fake Magic Bytes, Duplicate SHA-256, Real %PDF- Buffer).`);
}

runTests().catch((err) => {
  console.error('❌ [FAIL]', err);
  process.exit(1);
});
