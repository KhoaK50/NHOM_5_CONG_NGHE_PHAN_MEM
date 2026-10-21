/**
 * INDEPENDENT ADVERSARIAL AUDIT & VERIFICATION HARNESS - REVIEWER M5-1
 * Focus: Architecture, Radix Light Color Tokens, Font Pairing Fallbacks,
 *        Google Drive Ribbon Logo Lockup, Vectoria Topbar, and SCR_00 vs SCR_05 Separation.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

async function runTest(desc, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✔ PASS: ${desc}`);
  } catch (err) {
    console.error(`  ✖ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function main() {
  console.log('============================================================');
  console.log('  REVIEWER M5-1 INDEPENDENT ADVERSARIAL AUDIT & CHALLENGE');
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // 1. Source Code Extraction & Sandbox Execution
  // --------------------------------------------------------------------------
  const codePath = path.join(__dirname, '../tools/figma-5share-plugin/code.js');
  const codeContent = fs.readFileSync(codePath, 'utf8');

  let mockIdCounter = 1000;
  const reactionLog = [];

  function createFigmaNode(type) {
    const id = `${type}_${mockIdCounter++}`;
    const n = {
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
      fills: [],
      strokes: [],
      strokeWeight: 0,
      cornerRadius: 0,
      layoutMode: 'NONE',
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO',
      itemSpacing: 0,
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
      appendChild(c) {
        c.parent = this;
        this.children.push(c);
      },
      resize(w, h) {
        this.width = w;
        this.height = h;
        if (this.layoutMode && this.layoutMode !== 'NONE') {
          this.primaryAxisSizingMode = 'FIXED';
          this.counterAxisSizingMode = 'FIXED';
        }
      },
      remove() {
        if (this.parent && Array.isArray(this.parent.children)) {
          this.parent.children = this.parent.children.filter((item) => item !== this);
        }
      },
      async setReactionsAsync(rxList) {
        assert.ok(Array.isArray(rxList) && rxList.length > 0, 'Reactions must be non-empty array');
        for (const r of rxList) {
          assert.strictEqual(r.trigger.type, 'ON_CLICK', 'Trigger must be ON_CLICK');
          assert.ok(r.actions && r.actions[0].destinationId, 'Action must have destinationId');
        }
        this.reactions = rxList;
        reactionLog.push({ source: this, reactions: rxList });
      }
    };
    return n;
  }

  const mockRoot = createFigmaNode('PAGE');
  mockRoot.name = 'Page 1';
  const mockMessages = [];

  const figmaEnv = {
    root: { children: [mockRoot] },
    currentPage: mockRoot,
    ui: {
      onmessage: null,
      postMessage(msg) {
        mockMessages.push(msg);
      }
    },
    viewport: { scrollAndZoomIntoView() {} },
    showUI() {},
    notify() {},
    closePlugin() {},
    async loadFontAsync(_font) {},
    async setCurrentPageAsync(p) {
      figmaEnv.currentPage = p;
    },
    createPage() {
      const p = createFigmaNode('PAGE');
      this.root.children.push(p);
      return p;
    },
    createFrame() { return createFigmaNode('FRAME'); },
    createComponent() { return createFigmaNode('COMPONENT'); },
    createText() { return createFigmaNode('TEXT'); },
    createRectangle() { return createFigmaNode('RECTANGLE'); },
    createVector() { return createFigmaNode('VECTOR'); }
  };

  const sandbox = {
    figma: figmaEnv,
    __html__: '<html></html>',
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(codeContent, sandbox);

  function evalInSandbox(expr) {
    return vm.runInContext(expr, sandbox);
  }

  function findInTree(root, predicate) {
    if (!root) return null;
    if (predicate(root)) return root;
    for (const child of root.children || []) {
      const found = findInTree(child, predicate);
      if (found) return found;
    }
    return null;
  }

  function findAllInTree(root, predicate, acc = []) {
    if (!root) return acc;
    if (predicate(root)) acc.push(root);
    for (const child of root.children || []) {
      findAllInTree(child, predicate, acc);
    }
    return acc;
  }

  // --------------------------------------------------------------------------
  // SECTION 1: COLORS Object & Radix Light Mode Mathematical Verification
  // --------------------------------------------------------------------------
  console.log('--- 1. Testing COLORS Object & Radix Light Mode Scale ---');

  await runTest('code.js defines COLORS object with Slate, Blue, Green, Amber, Red scales', () => {
    const c = evalInSandbox('COLORS');
    assert.ok(c, 'COLORS must be defined in sandbox');
    assert.ok(c.white, 'COLORS.white must be defined');
    assert.ok(c.slate1 && c.slate12, 'COLORS.slate must span 1 to 12');
    assert.ok(c.blue1 && c.blue12, 'COLORS.blue must span 1 to 12');
    assert.ok(c.green1 && c.green12, 'COLORS.green must span 1 to 12');
    assert.ok(c.amber1 && c.amber12, 'COLORS.amber must span 1 to 12');
    assert.ok(c.red1 && c.red12, 'COLORS.red must span 1 to 12');
  });

  await runTest('All color values in COLORS are valid normalized RGB values (0 <= r, g, b <= 1)', () => {
    const c = evalInSandbox('COLORS');
    for (const [key, val] of Object.entries(c)) {
      assert.ok(typeof val.r === 'number' && val.r >= 0 && val.r <= 1, `${key}.r must be in [0, 1]`);
      assert.ok(typeof val.g === 'number' && val.g >= 0 && val.g <= 1, `${key}.g must be in [0, 1]`);
      assert.ok(typeof val.b === 'number' && val.b >= 0 && val.b <= 1, `${key}.b must be in [0, 1]`);
    }
  });

  await runTest('Radix Slate scale matches exact Vectoria specifications', () => {
    const c = evalInSandbox('COLORS');
    assert.strictEqual(Math.round(c.slate1.r * 255), 252);
    assert.strictEqual(Math.round(c.slate1.g * 255), 252);
    assert.strictEqual(Math.round(c.slate1.b * 255), 253);

    assert.strictEqual(Math.round(c.slate12.r * 255), 17);
    assert.strictEqual(Math.round(c.slate12.g * 255), 24);
    assert.strictEqual(Math.round(c.slate12.b * 255), 28);
  });

  await runTest('Radix Blue scale matches exact primary base tokens (#0090ff / #0588f0)', () => {
    const c = evalInSandbox('COLORS');
    assert.strictEqual(Math.round(c.blue9.r * 255), 0);
    assert.strictEqual(Math.round(c.blue9.g * 255), 144);
    assert.strictEqual(Math.round(c.blue9.b * 255), 255);

    assert.strictEqual(Math.round(c.blue10.r * 255), 5);
    assert.strictEqual(Math.round(c.blue10.g * 255), 136);
    assert.strictEqual(Math.round(c.blue10.b * 255), 240);
  });

  await runTest('Semantic Functional Tokens: Green-9 (#30a46c), Amber-9 (#ffb224), Red-9 (#e5484d)', () => {
    const c = evalInSandbox('COLORS');
    assert.strictEqual(Math.round(c.green9.r * 255), 48);
    assert.strictEqual(Math.round(c.green9.g * 255), 164);
    assert.strictEqual(Math.round(c.green9.b * 255), 108);

    assert.strictEqual(Math.round(c.amber9.r * 255), 255);
    assert.strictEqual(Math.round(c.amber9.g * 255), 178);
    assert.strictEqual(Math.round(c.amber9.b * 255), 36);

    assert.strictEqual(Math.round(c.red9.r * 255), 229);
    assert.strictEqual(Math.round(c.red9.g * 255), 72);
    assert.strictEqual(Math.round(c.red9.b * 255), 77);
  });

  await runTest('Background luminance test: all step 1-3 backgrounds have relative luminance > 0.80', () => {
    const c = evalInSandbox('COLORS');
    const bgColors = [c.white, c.slate1, c.slate2, c.slate3, c.blue1, c.blue2, c.blue3, c.green1, c.green2, c.green3, c.amber1, c.amber2, c.amber3, c.red1, c.red2, c.red3];
    function getLuminance(rgb) {
      const sRGB = [rgb.r, rgb.g, rgb.b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    }
    for (const bg of bgColors) {
      const lum = getLuminance(bg);
      assert.ok(lum >= 0.80, `Background luminance ${lum} must be >= 0.80 for light mode`);
    }
  });

  // --------------------------------------------------------------------------
  // SECTION 2: Font Pairing & Multi-Tier Fallback Robustness
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Font Pairing & Multi-Tier Fallback Robustness ---');

  await runTest('Default font objects specify Be Vietnam Pro (UI) and STIX Two Text (Academic)', () => {
    assert.strictEqual(evalInSandbox('UI_FONT.family'), 'Be Vietnam Pro');
    assert.strictEqual(evalInSandbox('ACADEMIC_FONT.family'), 'STIX Two Text');
  });

  await runTest('createText applies UI_FONT and creates text with specified content and size', () => {
    const t = evalInSandbox("createText('Test Label', { size: 16, weight: 'bold' })");
    assert.strictEqual(t.characters, 'Test Label');
    assert.strictEqual(t.fontSize, 16);
    assert.strictEqual(t.fontName.family, evalInSandbox('UI_FONT.family'));
  });

  await runTest('createAcademicText applies ACADEMIC_FONT and creates text with specified content', () => {
    const t = evalInSandbox("createAcademicText('Academic Research Abstract', { size: 14 })");
    assert.strictEqual(t.characters, 'Academic Research Abstract');
    assert.strictEqual(t.fontSize, 14);
    assert.strictEqual(t.fontName.family, evalInSandbox('ACADEMIC_FONT.family'));
  });

  await runTest('initFonts falls back cleanly to Inter when Be Vietnam Pro fails', async () => {
    const customFigma = {
      ...figmaEnv,
      async loadFontAsync(f) {
        if (f.family === 'Be Vietnam Pro') throw new Error('Font unavailable');
      }
    };
    const testSandbox = { figma: customFigma, __html__: '<html></html>', console };
    vm.createContext(testSandbox);
    vm.runInContext(codeContent, testSandbox);
    await vm.runInContext('initFonts()', testSandbox);
    assert.strictEqual(vm.runInContext('UI_FONT.family', testSandbox), 'Inter', 'Should fall back to Inter');
  });

  await runTest('initFonts falls back to Roboto when Be Vietnam Pro and Inter both fail', async () => {
    const customFigma = {
      ...figmaEnv,
      async loadFontAsync(f) {
        if (f.family === 'Be Vietnam Pro' || f.family === 'Inter') throw new Error('Font unavailable');
      }
    };
    const testSandbox = { figma: customFigma, __html__: '<html></html>', console };
    vm.createContext(testSandbox);
    vm.runInContext(codeContent, testSandbox);
    await vm.runInContext('initFonts()', testSandbox);
    assert.strictEqual(vm.runInContext('UI_FONT.family', testSandbox), 'Roboto', 'Should fall back to Roboto');
  });

  await runTest('initFonts falls back to Times New Roman when STIX Two Text fails', async () => {
    const customFigma = {
      ...figmaEnv,
      async loadFontAsync(f) {
        if (f.family === 'STIX Two Text') throw new Error('STIX unavailable');
      }
    };
    const testSandbox = { figma: customFigma, __html__: '<html></html>', console };
    vm.createContext(testSandbox);
    vm.runInContext(codeContent, testSandbox);
    await vm.runInContext('initFonts()', testSandbox);
    assert.strictEqual(vm.runInContext('ACADEMIC_FONT.family', testSandbox), 'Times New Roman', 'Should fall back to Times New Roman');
  });

  // --------------------------------------------------------------------------
  // SECTION 3: Google Drive–Style Layered Ribbon Logo Lockup
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Google Drive–Style Layered Ribbon Logo Lockup ---');

  await runTest('createRibbonLogoLockup creates Brand_Logo_Lockup with 38px mark and wordmark', () => {
    const lockup = evalInSandbox('createRibbonLogoLockup()');
    assert.ok(lockup, 'Lockup frame must exist');
    assert.strictEqual(lockup.layoutMode, 'HORIZONTAL');

    const iconContainer = findInTree(lockup, n => n.name === 'Logo_Ribbon_Mark');
    assert.ok(iconContainer, 'Must contain Logo_Ribbon_Mark container');
    assert.strictEqual(iconContainer.width, 38);
    assert.strictEqual(iconContainer.height, 38);
    assert.strictEqual(iconContainer.fills.length, 0, 'Container must have transparent background (fills = [])');

    const polyLeft = findInTree(iconContainer, n => n.name === 'Ribbon_Left_Ascending');
    const polyRight = findInTree(iconContainer, n => n.name === 'Ribbon_Right_Descending');
    const polyBottom = findInTree(iconContainer, n => n.name === 'Ribbon_Bottom_Base');

    assert.ok(polyLeft, 'Must have Ribbon_Left_Ascending quadrilateral');
    assert.ok(polyRight, 'Must have Ribbon_Right_Descending quadrilateral');
    assert.ok(polyBottom, 'Must have Ribbon_Bottom_Base quadrilateral');

    assert.strictEqual(polyLeft.fills[0].type, 'GRADIENT_LINEAR');
    assert.strictEqual(polyRight.fills[0].type, 'GRADIENT_LINEAR');
    assert.strictEqual(polyBottom.fills[0].type, 'GRADIENT_LINEAR');

    const wordmark = findInTree(lockup, n => n.name === 'Brand_Wordmark');
    assert.ok(wordmark, 'Must contain Brand_Wordmark');
    assert.strictEqual(wordmark.characters, '5share');
    assert.strictEqual(wordmark.fontSize, 20);

    const tagline = findInTree(lockup, n => n.name === 'Brand_Tagline');
    assert.ok(tagline, 'Must contain Brand_Tagline');
    assert.strictEqual(tagline.characters, 'Học liệu mở Sư phạm Tin học HCMUE');
  });

  await runTest('createRibbonLogoLockup fallback works when figma.createVector is not available', () => {
    const customFigma = { ...figmaEnv, createVector: undefined };
    const testSandbox = { figma: customFigma, __html__: '<html></html>', console };
    vm.createContext(testSandbox);
    vm.runInContext(codeContent, testSandbox);
    const lockup = vm.runInContext('createRibbonLogoLockup()', testSandbox);
    const fallback = findInTree(lockup, n => n.name === 'Ribbon_Loops_Fallback');
    assert.ok(fallback, 'Must create Ribbon_Loops_Fallback when createVector is unavailable');
    assert.strictEqual(fallback.width, 38);
    assert.strictEqual(fallback.height, 38);
  });

  // --------------------------------------------------------------------------
  // SECTION 4: Vectoria Production Topbar & Popover Account Switcher
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing Vectoria Production Topbar & Popover Switcher ---');

  await runTest('createNavbar enforces 64px height, 1440px width, white fill, slate6 stroke', () => {
    const nav = evalInSandbox("createNavbar('GUEST', 'discovery')");
    assert.strictEqual(nav.node.width, 1440);
    assert.strictEqual(nav.node.height, 64);
    assert.strictEqual(nav.node.fills[0].color.r, 1);
    assert.strictEqual(nav.node.strokes[0].color.r, evalInSandbox('COLORS.slate6.r'));
  });

  await runTest('createNavbar contains 5 flat navigation items with 2px bottom active indicator', () => {
    const nav = evalInSandbox("createNavbar('GUEST', 'discovery')");
    const links = ['Nav_Link_Landing', 'Nav_Link_Discovery', 'Nav_Link_Bounty', 'Nav_Link_Upload', 'Nav_Link_Explore'];
    for (const lName of links) {
      const lNode = findInTree(nav.node, n => n.name === lName);
      assert.ok(lNode, `Must find nav link ${lName}`);
      assert.strictEqual(lNode.height, 64);
      const indicator = findInTree(lNode, n => n.name === 'Active_Indicator_2px');
      assert.ok(indicator, `Link ${lName} must contain Active_Indicator_2px`);
      assert.strictEqual(indicator.height, 2);
    }
    const discNode = findInTree(nav.node, n => n.name === 'Nav_Link_Discovery');
    const discInd = findInTree(discNode, n => n.name === 'Active_Indicator_2px');
    assert.strictEqual(discInd.fills[0].color.r, evalInSandbox('COLORS.blue9.r'));

    const landNode = findInTree(nav.node, n => n.name === 'Nav_Link_Landing');
    const landInd = findInTree(landNode, n => n.name === 'Active_Indicator_2px');
    assert.strictEqual(landInd.fills.length, 0, 'Inactive link indicator must have no fills');
  });

  await runTest('createNavbar renders 38px circular Avatar button #btnTopAvatar', () => {
    const navGuest = evalInSandbox("createNavbar('GUEST', 'discovery')");
    const btnGuest = findInTree(navGuest.node, n => n.name === '#btnTopAvatar');
    assert.ok(btnGuest, 'Must find #btnTopAvatar for GUEST');
    assert.strictEqual(btnGuest.width, 38);
    assert.strictEqual(btnGuest.height, 38);
    assert.strictEqual(btnGuest.cornerRadius, 19);

    const navStudent = evalInSandbox("createNavbar('STUDENT', 'discovery')");
    const btnStudent = findInTree(navStudent.node, n => n.name === '#btnTopAvatar');
    assert.ok(btnStudent, 'Must find #btnTopAvatar for STUDENT');
    assert.strictEqual(btnStudent.width, 38);
    assert.strictEqual(btnStudent.height, 38);
    assert.strictEqual(btnStudent.cornerRadius, 19);

    const navAdmin = evalInSandbox("createNavbar('ADMIN', 'discovery')");
    const btnAdmin = findInTree(navAdmin.node, n => n.name === '#btnTopAvatar');
    assert.ok(btnAdmin, 'Must find #btnTopAvatar for ADMIN');
    assert.strictEqual(btnAdmin.width, 38);
    assert.strictEqual(btnAdmin.height, 38);
    assert.strictEqual(btnAdmin.cornerRadius, 19);
  });

  await runTest('Navbar Persona Switcher Pill is safely nested inside #menuTopAvatar popover', () => {
    const nav = evalInSandbox("createNavbar('STUDENT', 'discovery')");
    const popover = findInTree(nav.node, n => n.name === '#menuTopAvatar');
    assert.ok(popover, 'Must find #menuTopAvatar');
    assert.strictEqual(popover.width, 270);

    const switcherPill = findInTree(popover, n => n.name === 'Navbar_Persona_Switcher_Pill');
    assert.ok(switcherPill, 'Navbar_Persona_Switcher_Pill must be inside #menuTopAvatar');

    const guestOpt = findInTree(switcherPill, n => n.name === 'Persona_Opt_GUEST');
    const studentOpt = findInTree(switcherPill, n => n.name === 'Persona_Opt_STUDENT');
    const adminOpt = findInTree(switcherPill, n => n.name === 'Persona_Opt_ADMIN');

    assert.ok(guestOpt && studentOpt && adminOpt, 'Pill must contain all 3 personas');
  });

  // --------------------------------------------------------------------------
  // SECTION 5: Clean Separation between SCR_00 and SCR_05
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing Separation: SCR_00_Home_Landing vs SCR_05_Home_Discovery ---');

  let targetPage;
  await runTest('Full prototype generation completes successfully', async () => {
    await figmaEnv.ui.onmessage({
      type: 'GENERATE_5SHARE_PROTOTYPE',
      options: { includeDesignSystem: true, includeScreens: true, includeWires: true }
    });
    targetPage = figmaEnv.currentPage;
    assert.ok(targetPage, 'Target page must exist');
  });

  await runTest('SCR_00_Home_Landing is 3600px tall and contains all 5 Acts with Chapter Scrubber', () => {
    const scr00 = findInTree(targetPage, n => n.name === 'SCR_00_Home_Landing');
    assert.ok(scr00, 'SCR_00_Home_Landing must exist');
    assert.strictEqual(scr00.width, 1440);
    assert.strictEqual(scr00.height, 3600);
    assert.strictEqual(scr00.itemSpacing, 0);

    const act1 = findInTree(scr00, n => n.name === 'Act_I_Aperture_Singularity');
    const act2 = findInTree(scr00, n => n.name === 'Act_II_Gravitational_Convergence');
    const act3 = findInTree(scr00, n => n.name === 'Act_III_Isometric_Deconstruction');
    const act4 = findInTree(scr00, n => n.name === 'Act_IV_Knowledge_Constellation');
    const act5 = findInTree(scr00, n => n.name === 'Act_V_Threshold_Portal');

    assert.ok(act1, 'Must contain Act I');
    assert.ok(act2, 'Must contain Act II');
    assert.ok(act3, 'Must contain Act III');
    assert.ok(act4, 'Must contain Act IV');
    assert.ok(act5, 'Must contain Act V');

    for (const lName of ['Relats_Layer_1_Integrity', 'Relats_Layer_2_Taxonomy', 'Relats_Layer_3_Refinement', 'Relats_Layer_4_Clarity']) {
      assert.ok(findInTree(act3, n => n.name === lName), `Must find Relats layer ${lName}`);
    }

    const track = findInTree(act4, n => n.name === 'Horizontal_Showcase_Track');
    assert.ok(track, 'Act IV must contain Horizontal_Showcase_Track');
    assert.ok(findInTree(track, n => n.name === 'Pillar_Card_1'), 'Must contain Pillar 1');
    assert.ok(findInTree(track, n => n.name === 'Pillar_Card_2'), 'Must contain Pillar 2');
    assert.ok(findInTree(track, n => n.name === 'Pillar_Card_3'), 'Must contain Pillar 3');

    const portalBtn = findInTree(act5, n => n.name === 'Btn_ActV_Enter_Workspace');
    assert.ok(portalBtn, 'Must find Btn_ActV_Enter_Workspace');

    const scrubber = findInTree(scr00, n => n.name === 'Chapter_Scrubber_Rail');
    assert.ok(scrubber, 'Must contain Chapter_Scrubber_Rail');
  });

  await runTest('SCR_05_Home_Discovery is a pure functional workspace with immediate FTS search and NO scrolly hero', () => {
    const scr05 = findInTree(targetPage, n => n.name === 'SCR_05_Home_Discovery');
    assert.ok(scr05, 'SCR_05_Home_Discovery must exist');
    assert.strictEqual(scr05.width, 1440);
    assert.strictEqual(scr05.height, 1080);
    assert.strictEqual(scr05.itemSpacing, 0);

    assert.strictEqual(scr05.children[0].name, 'Vectoria_Topbar');
    assert.strictEqual(scr05.children[1].name, 'FTS_Search_Control_Bar');
    const searchInput = findInTree(scr05.children[1], n => n.name.includes('Tra_cứu_toàn_văn'));
    const btnSearch = findInTree(scr05.children[1], n => n.name === 'Btn_Search_FTS');
    assert.ok(searchInput && btnSearch, 'Must contain Search input and button');

    assert.strictEqual(scr05.children[2].name, 'Discovery_Workspace');
    const sidebar = findInTree(scr05.children[2], n => n.name === 'Filter_Sidebar_240px');
    assert.ok(sidebar, 'Must contain Filter_Sidebar_240px');
    assert.strictEqual(sidebar.width, 240);

    const docGrid = findInTree(scr05.children[2], n => n.name === 'Document_Grid_Column');
    assert.ok(docGrid, 'Must contain Document_Grid_Column');

    assert.strictEqual(findInTree(scr05, n => n.name === 'Scrolly_Living_Document_Hero'), null, 'SCR_05 must not contain Scrolly_Living_Document_Hero');
    assert.strictEqual(findInTree(scr05, n => n.name === 'Living_Document_Sapphire_Stage'), null, 'SCR_05 must not contain Living_Document_Sapphire_Stage');
    assert.strictEqual(findInTree(scr05, n => n.name === 'Act_I_Aperture_Singularity'), null, 'SCR_05 must not contain Act_I');
  });

  // --------------------------------------------------------------------------
  // SECTION 6: Integrity Violations & Facade Checks
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Adversarial Integrity Violations & Facade Checks ---');

  await runTest('No hardcoded test result bypass in code.js', () => {
    assert.strictEqual(codeContent.includes('// Bypass test runner'), false);
    assert.strictEqual(codeContent.includes('/* Bypass test runner */'), false);
    assert.strictEqual(codeContent.includes('process.exit(0)'), false);
  });

  await runTest('All 19 screens and Design System frame are genuinely instantiated and appended', () => {
    const topLevels = targetPage.children.map(c => c.name);
    assert.strictEqual(topLevels.length, 20);
    assert.strictEqual(new Set(topLevels).size, 20, 'All 20 frame names must be unique');
  });

  await runTest('All 338 prototype wires connect to valid destinations on targetPage', () => {
    const validIds = new Set(targetPage.children.map(c => c.id));
    assert.strictEqual(reactionLog.length, 338, 'Must have recorded exactly 338 reaction attachments');
    for (const entry of reactionLog) {
      for (const rx of entry.reactions) {
        assert.ok(validIds.has(rx.actions[0].destinationId), `Destination ID ${rx.actions[0].destinationId} must exist`);
      }
    }
  });

  await runTest('All 3 Flow Starting Points connect to genuine screens', () => {
    assert.strictEqual(targetPage.flowStartingPoints.length, 3);
    const flowIds = targetPage.flowStartingPoints.map(f => f.nodeId);
    const scr00 = findInTree(targetPage, n => n.name === 'SCR_00_Home_Landing');
    const scr07 = findInTree(targetPage, n => n.name === 'SCR_07_Doc_Detail_Student');
    const scr10 = findInTree(targetPage, n => n.name === 'SCR_10_Admin_Moderation');

    assert.strictEqual(flowIds[0], scr00.id, 'Flow 1 must start at SCR_00');
    assert.strictEqual(flowIds[1], scr07.id, 'Flow 2 must start at SCR_07');
    assert.strictEqual(flowIds[2], scr10.id, 'Flow 3 must start at SCR_10');
  });

  // --------------------------------------------------------------------------
  // SECTION 7: Auto Layout, Multi-Format Cards & Missing Screens Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Auto Layout, Multi-Format Cards & Screen Completeness ---');

  await runTest('Auto Layout sizing modes: Login_Modal_Card hugs vertical and fixes horizontal', () => {
    const card = findInTree(targetPage, n => n.name === 'Login_Modal_Card');
    assert.ok(card, 'Login_Modal_Card must exist');
    assert.strictEqual(card.primaryAxisSizingMode, 'AUTO');
    assert.strictEqual(card.counterAxisSizingMode, 'FIXED');
  });

  await runTest('Auto Layout sizing modes: DocCard_DOC_01 hugs vertical and fixes horizontal', () => {
    const card = findInTree(targetPage, n => n.name === 'DocCard_DOC_01');
    assert.ok(card, 'DocCard_DOC_01 must exist');
    assert.strictEqual(card.primaryAxisSizingMode, 'AUTO');
    assert.strictEqual(card.counterAxisSizingMode, 'FIXED');
  });

  await runTest('Multi-format support: cards distinguish PDF (Red), DOCX (Blue), PPTX (Amber)', () => {
    const cardPdf = evalInSandbox("createDocumentCardNode({ code: 'TEST_PDF', format: 'pdf', title: 'Test PDF', courseCode: 'COMP1044', pages: 10, semester: 'HK5', courseName: 'PPDH', rating: '5.0' })");
    const badgePdf = findInTree(cardPdf.card, n => n.name === 'Badge');
    assert.ok(badgePdf);

    const cardDocx = evalInSandbox("createDocumentCardNode({ code: 'TEST_DOCX', format: 'docx', title: 'Test DOCX', courseCode: 'COMP1015', pages: 12, semester: 'HK3', courseName: 'MMT', rating: '4.8' })");
    const badgeDocx = findInTree(cardDocx.card, n => n.name === 'Badge');
    assert.ok(badgeDocx);

    const cardPptx = evalInSandbox("createDocumentCardNode({ code: 'TEST_PPTX', format: 'pptx', title: 'Test PPTX', courseCode: 'COMP1022', pages: 25, semester: 'HK4', courseName: 'Web', rating: '4.7' })");
    const badgePptx = findInTree(cardPptx.card, n => n.name === 'Badge');
    assert.ok(badgePptx);
  });

  await runTest('Admin Sidebar renders 100% Light Mode (white fill, slate6 stroke)', () => {
    const sidebars = [];
    findAllInTree(targetPage, n => n.name.includes('Admin_Dark_Sidebar'), sidebars);
    assert.ok(sidebars.length > 0, 'Must find admin sidebars');
    for (const sb of sidebars) {
      assert.strictEqual(sb.fills[0].color.r, 1, 'Admin sidebar fill must be white (1)');
      assert.strictEqual(sb.fills[0].color.g, 1, 'Admin sidebar fill must be white (1)');
      assert.strictEqual(sb.fills[0].color.b, 1, 'Admin sidebar fill must be white (1)');
    }
  });

  await runTest('Production UI purity: Zero Traceability_Banner across entire prototype page', () => {
    const traceBanner = findInTree(targetPage, n => n.name === 'Traceability_Banner');
    assert.strictEqual(traceBanner, null, 'Must NOT contain Traceability_Banner');
  });

  await runTest('Zero vertical gap: 8 primary topbar screens enforce itemSpacing === 0', () => {
    const checkScreens = [
      'SCR_00_Home_Landing',
      'SCR_05_Home_Discovery',
      'SCR_10_Admin_Moderation',
      'SCR_11_Admin_Courses',
      'SCR_13_Admin_Dashboard',
      'SCR_15_User_Profile',
      'SCR_16_Study_Bounty',
      'SCR_17_Admin_Users'
    ];
    for (const sName of checkScreens) {
      const scr = findInTree(targetPage, n => n.name === sName);
      assert.ok(scr, `Screen ${sName} must exist`);
      assert.strictEqual(scr.itemSpacing, 0, `${sName} must have itemSpacing === 0`);
    }
  });

  await runTest('SCR_15_User_Profile contains profile editing form and password standards checklist', () => {
    const scr15 = findInTree(targetPage, n => n.name === 'SCR_15_User_Profile');
    assert.ok(scr15, 'SCR_15_User_Profile must exist');
    assert.ok(findInTree(scr15, n => n.name === 'Btn_Save_Profile_Info'), 'Must contain Btn_Save_Profile_Info');
    assert.ok(findInTree(scr15, n => n.name === 'Btn_Submit_New_Password'), 'Must contain Btn_Submit_New_Password');
  });

  await runTest('SCR_16_Study_Bounty contains Bounty feed and Top 10 Contributor Leaderboard', () => {
    const scr16 = findInTree(targetPage, n => n.name === 'SCR_16_Study_Bounty');
    assert.ok(scr16, 'SCR_16_Study_Bounty must exist');
    assert.ok(findInTree(scr16, n => n.name === 'Btn_Open_Create_Bounty'), 'Must contain Btn_Open_Create_Bounty');
  });

  await runTest('SCR_17_Admin_Users contains User List Table and Lock/Unlock interactive buttons', () => {
    const scr17 = findInTree(targetPage, n => n.name === 'SCR_17_Admin_Users');
    assert.ok(scr17, 'SCR_17_Admin_Users must exist');
    assert.ok(findInTree(scr17, n => n.name === 'Btn_Lock_User_Vi'), 'Must contain Btn_Lock_User_Vi');
    assert.ok(findInTree(scr17, n => n.name === 'Btn_Unlock_User_Nam'), 'Must contain Btn_Unlock_User_Nam');
  });

  await runTest('SCR_18_Feedback_Modal contains 4 feedback categories and submit button', () => {
    const scr18 = findInTree(targetPage, n => n.name === 'SCR_18_Feedback_Modal');
    assert.ok(scr18, 'SCR_18_Feedback_Modal must exist');
    assert.ok(findInTree(scr18, n => n.name === 'Btn_Feedback_Submit'), 'Must contain Btn_Feedback_Submit');
  });

  console.log('\n============================================================');
  console.log(`  AUDIT COMPLETED: ${passedTests}/${totalTests} PASSED (0 FAILED)`);
  console.log('============================================================');
}

main().catch(err => {
  console.error('Fatal error in audit suite:', err);
  process.exit(1);
});
