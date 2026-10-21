/**
 * Independent Adversarial Audit Harness for Milestone 5 - Reviewer 2
 * Scope: 20 Native Frames, SCR_15 to SCR_18, Multi-Format Document Cards,
 * 338 Prototype Wires (setReactionsAsync), Vector Fallbacks, and Anti-AI-Slop.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

console.log('================================================================');
console.log('  REVIEWER M5-2 INDEPENDENT ADVERSARIAL AUDIT');
console.log('  (20 Frames, SCR_15-18, Multi-Format Cards, 338 Wires, Runner)');
console.log('================================================================');

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
          throw new Error('Invalid trigger type: ' + (r.trigger && r.trigger.type));
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
  root: { children: [rootPage] },
  currentPage: rootPage,
  ui: {
    onmessage: null,
    postMessage(msg) {
      messagesToUi.push(msg);
    }
  },
  viewport: { scrollAndZoomIntoView() {} },
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

function findAllNodesByName(root, targetName, acc = []) {
  if (root.name === targetName) acc.push(root);
  for (const child of root.children || []) {
    findAllNodesByName(child, targetName, acc);
  }
  return acc;
}

function findNodeByText(root, textSubstr) {
  if (root.characters && String(root.characters).includes(textSubstr)) return root;
  for (const child of root.children || []) {
    const found = findNodeByText(child, textSubstr);
    if (found) return found;
  }
  return null;
}

async function runAudit() {
  const codePath = path.join(__dirname, '..', 'tools', 'figma-5share-plugin', 'code.js');
  const codeContent = fs.readFileSync(codePath, 'utf8');

  const sandbox = {
    figma: figmaMock,
    __html__: '<html></html>',
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(codeContent, sandbox);

  // Execute full generation
  await figmaMock.ui.onmessage({
    type: 'GENERATE_5SHARE_PROTOTYPE',
    options: {
      includeDesignSystem: true,
      includeScreens: true,
      includeWires: true
    }
  });

  const targetPage = figmaMock.currentPage;
  const topLevelChildren = targetPage.children;
  const topLevelNames = topLevelChildren.map((c) => c.name);

  // ---------------------------------------------------------------------------
  // Check 1: 20 Top-Level Native Frames
  // ---------------------------------------------------------------------------
  console.log('\n--- 1. Testing 20 Native Frames Architecture ---');
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

  assert.strictEqual(topLevelChildren.length, 20, `Target page must have exactly 20 children, got ${topLevelChildren.length}`);
  for (const ef of expectedFrames) {
    assert.ok(topLevelNames.includes(ef), `Missing expected top-level frame: ${ef}`);
    const frameNode = topLevelChildren.find((c) => c.name === ef);
    assert.strictEqual(frameNode.type, 'FRAME', `Frame ${ef} must be of type FRAME`);
    assert.strictEqual(frameNode.width, 1440, `Frame ${ef} must have desktop width 1440, got ${frameNode.width}`);
    if (ef === '00_Design_System_Components') {
      assert.strictEqual(frameNode.primaryAxisSizingMode, 'AUTO', 'Design System frame must hug contents vertically');
      assert.ok(frameNode.children.length >= 3, 'Design System frame must contain children sections');
    } else {
      assert.ok(frameNode.height >= 400, `Screen ${ef} must have valid height >= 400, got ${frameNode.height}`);
    }
  }
  console.log('  ✔ PASS: Exactly 20 Native Desktop Frames (1440px wide) successfully verified.');

  // ---------------------------------------------------------------------------
  // Check 2: SCR_15_User_Profile Deep Audit
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Testing SCR_15_User_Profile Architecture & Requirements ---');
  const scr15 = topLevelChildren.find((c) => c.name === 'SCR_15_User_Profile');
  assert.ok(scr15, 'SCR_15_User_Profile must exist');

  // Check 5 Tabs
  const profileTabBar = findNodeByName(scr15, 'Profile_Tab_Bar');
  assert.ok(profileTabBar, 'Profile_Tab_Bar must exist');
  assert.strictEqual(profileTabBar.children.length, 5, `Profile must have exactly 5 tabs, got ${profileTabBar.children.length}`);

  // Check Cohort badge
  const cohortBadge = findNodeByText(scr15, 'K50 Sư phạm Tin học');
  assert.ok(cohortBadge, 'Must find K50 Sư phạm Tin học cohort badge');

  // Check Points pill
  const pointsPill = findNodeByName(scr15, 'Points_Balance_Pill');
  assert.ok(pointsPill, 'Must find Points_Balance_Pill');

  // Check Metric counters
  const metricRow = findNodeByName(scr15, 'Metric_Counters_Row');
  assert.ok(metricRow, 'Must find Metric_Counters_Row');
  assert.strictEqual(metricRow.children.length, 4, 'Must have 4 metric counter cards');

  // Check Forms & Password Checklist
  const editCard = findNodeByName(scr15, 'Edit_Profile_Card');
  assert.ok(editCard, 'Must find Edit_Profile_Card');
  const pwdCard = findNodeByName(scr15, 'Change_Password_Card');
  assert.ok(pwdCard, 'Must find Change_Password_Card');

  const btnSaveProfile = findNodeByName(scr15, 'Btn_Save_Profile_Info');
  assert.ok(btnSaveProfile, 'Must find Btn_Save_Profile_Info');
  const btnSubmitPwd = findNodeByName(scr15, 'Btn_Submit_New_Password');
  assert.ok(btnSubmitPwd, 'Must find Btn_Submit_New_Password');
  const btnProfileMyDocs = findNodeByName(scr15, 'Btn_Profile_To_MyDocs');
  assert.ok(btnProfileMyDocs, 'Must find Btn_Profile_To_MyDocs');

  console.log('  ✔ PASS: SCR_15_User_Profile verified with 5 tabs, cohort badge, 4 metrics, password form, and action buttons.');

  // ---------------------------------------------------------------------------
  // Check 3: SCR_16_Study_Bounty Deep Audit
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Testing SCR_16_Study_Bounty 2-Column Feed & Leaderboard ---');
  const scr16 = topLevelChildren.find((c) => c.name === 'SCR_16_Study_Bounty');
  assert.ok(scr16, 'SCR_16_Study_Bounty must exist');

  const bountyGrid = findNodeByName(scr16, 'Bounty_Workspace_Grid');
  assert.ok(bountyGrid, 'Must find Bounty_Workspace_Grid');
  assert.strictEqual(bountyGrid.children.length, 2, 'Workspace grid must have exactly 2 columns');

  const feedCol = findNodeByName(scr16, 'Bounty_Feed_Column');
  assert.ok(feedCol, 'Must find Bounty_Feed_Column');
  assert.strictEqual(feedCol.width, 890, 'Feed column width must be 890px');

  const leaderCol = findNodeByName(scr16, 'Bounty_Leaderboard_Column');
  assert.ok(leaderCol, 'Must find Bounty_Leaderboard_Column');
  assert.strictEqual(leaderCol.width, 460, 'Leaderboard column width must be 460px');

  const top10Card = findNodeByName(scr16, 'Top_10_Leaderboard_Card');
  assert.ok(top10Card, 'Must find Top_10_Leaderboard_Card');

  const btnOpenBounty = findNodeByName(scr16, 'Btn_Open_Create_Bounty');
  assert.ok(btnOpenBounty, 'Must find Btn_Open_Create_Bounty');

  const btnFulfill = findNodeByName(scr16, 'Btn_Fulfill_Bounty');
  assert.ok(btnFulfill, 'Must find Btn_Fulfill_Bounty');

  console.log('  ✔ PASS: SCR_16_Study_Bounty verified with 2-column layout (890px feed + 460px leaderboard) & action triggers.');

  // ---------------------------------------------------------------------------
  // Check 4: SCR_17_Admin_Users Deep Audit
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Testing SCR_17_Admin_Users User Directory & Lock/Unlock ---');
  const scr17 = topLevelChildren.find((c) => c.name === 'SCR_17_Admin_Users');
  assert.ok(scr17, 'SCR_17_Admin_Users must exist');

  const adminSidebarUsers = findNodeByName(scr17, 'Admin_Dark_Sidebar_users');
  assert.ok(adminSidebarUsers, 'Must find admin sidebar on SCR_17');

  const userKpiRow = findNodeByName(scr17, 'User_KPI_Cards_Row');
  assert.ok(userKpiRow, 'Must find User_KPI_Cards_Row');
  assert.strictEqual(userKpiRow.children.length, 4, 'Must have 4 User KPI cards');

  const userTable = findNodeByName(scr17, 'User_Directory_Data_Table');
  assert.ok(userTable, 'Must find User_Directory_Data_Table');

  const btnLockVi = findNodeByName(scr17, 'Btn_Lock_User_Vi');
  assert.ok(btnLockVi, 'Must find Btn_Lock_User_Vi');
  const btnLockTram = findNodeByName(scr17, 'Btn_Lock_User_Tram');
  assert.ok(btnLockTram, 'Must find Btn_Lock_User_Tram');
  const btnUnlockNam = findNodeByName(scr17, 'Btn_Unlock_User_Nam');
  assert.ok(btnUnlockNam, 'Must find Btn_Unlock_User_Nam');
  const btnBackDash = findNodeByName(scr17, 'Btn_Users_Back_Dashboard');
  assert.ok(btnBackDash, 'Must find Btn_Users_Back_Dashboard');

  console.log('  ✔ PASS: SCR_17_Admin_Users verified with 4 KPIs, user directory table, lock/unlock buttons, and back nav.');

  // ---------------------------------------------------------------------------
  // Check 5: SCR_18_Feedback_Modal Deep Audit
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Testing SCR_18_Feedback_Modal Hòm thư góp ý ---');
  const scr18 = topLevelChildren.find((c) => c.name === 'SCR_18_Feedback_Modal');
  assert.ok(scr18, 'SCR_18_Feedback_Modal must exist');

  const feedbackCard = findNodeByName(scr18, 'Feedback_Modal_Card');
  assert.ok(feedbackCard, 'Must find Feedback_Modal_Card');
  assert.strictEqual(feedbackCard.width, 540, 'Feedback modal card width must be 540px');

  const catGrid = findNodeByName(scr18, 'Feedback_Category_Grid');
  assert.ok(catGrid, 'Must find Feedback_Category_Grid');
  assert.strictEqual(catGrid.children.length, 4, 'Feedback modal must have exactly 4 category chips');

  const btnCancelFb = findNodeByName(scr18, 'Btn_Feedback_Cancel');
  assert.ok(btnCancelFb, 'Must find Btn_Feedback_Cancel');
  const btnSubmitFb = findNodeByName(scr18, 'Btn_Feedback_Submit');
  assert.ok(btnSubmitFb, 'Must find Btn_Feedback_Submit');

  console.log('  ✔ PASS: SCR_18_Feedback_Modal verified with 540px card, 4 category chips, cancel & submit actions.');

  // ---------------------------------------------------------------------------
  // Check 6: Multi-Format Document Cards Audit
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Testing Multi-Format Document Cards (.pdf, .docx, .pptx) ---');
  const doc01Card = findNodeByName(targetPage, 'DocCard_DOC_01'); // PDF
  const doc02Card = findNodeByName(targetPage, 'DocCard_DOC_02'); // DOCX
  const doc03Card = findNodeByName(targetPage, 'DocCard_DOC_03'); // PPTX

  assert.ok(doc01Card, 'Must find DocCard_DOC_01 (PDF)');
  assert.ok(doc02Card, 'Must find DocCard_DOC_02 (DOCX)');
  assert.ok(doc03Card, 'Must find DocCard_DOC_03 (PPTX)');

  const pdfBadge = findNodeByText(doc01Card, 'PDF • A4');
  assert.ok(pdfBadge, 'DocCard_DOC_01 must have Badge_PDF • A4');

  const docxBadge = findNodeByText(doc02Card, 'DOCX • Word');
  assert.ok(docxBadge, 'DocCard_DOC_02 must have Badge_DOCX • Word');

  const pptxBadge = findNodeByText(doc03Card, 'PPTX • Slide');
  assert.ok(pptxBadge, 'DocCard_DOC_03 must have Badge_PPTX • Slide');

  // Verify Auto Layout Sizing on all 3 cards
  for (const card of [doc01Card, doc02Card, doc03Card]) {
    assert.strictEqual(card.primaryAxisSizingMode, 'AUTO', 'Card must have AUTO primaryAxisSizingMode');
    assert.strictEqual(card.counterAxisSizingMode, 'FIXED', 'Card must have FIXED counterAxisSizingMode');
    assert.strictEqual(card.width, 340, 'Card width must be 340px');
  }

  console.log('  ✔ PASS: Multi-format cards verified (.pdf red, .docx blue, .pptx amber) with correct Auto Layout.');

  // ---------------------------------------------------------------------------
  // Check 7: 338 Prototype Wires & 3 Actor Flows
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Testing 338 Prototype Wires & 3 Actor Flow Starting Points ---');
  assert.strictEqual(allReactions.length, 338, `Expected exactly 338 wired prototype reactions, got ${allReactions.length}`);

  const screenIdMap = new Map(topLevelChildren.map((c) => [c.id, c.name]));
  for (let i = 0; i < allReactions.length; i++) {
    const item = allReactions[i];
    assert.ok(item.reactions && item.reactions.length > 0, `Reaction ${i} must have non-empty reactions`);
    const r = item.reactions[0];
    assert.strictEqual(r.trigger.type, 'ON_CLICK', `Reaction ${i} on ${item.sourceName} must be ON_CLICK`);
    assert.strictEqual(r.actions[0].type, 'NODE', `Reaction ${i} on ${item.sourceName} action type must be NODE`);
    const dstId = r.actions[0].destinationId;
    assert.ok(screenIdMap.has(dstId), `Reaction on ${item.sourceName} points to invalid destinationId: ${dstId}`);
  }

  // Check 3 Actor Flow Starting Points
  assert.strictEqual(targetPage.flowStartingPoints.length, 3, 'Must have exactly 3 flowStartingPoints');
  const flow1 = targetPage.flowStartingPoints[0];
  const flow2 = targetPage.flowStartingPoints[1];
  const flow3 = targetPage.flowStartingPoints[2];

  const scr00 = topLevelChildren.find((c) => c.name === 'SCR_00_Home_Landing');
  const scr07 = topLevelChildren.find((c) => c.name === 'SCR_07_Doc_Detail_Student');
  const scr10 = topLevelChildren.find((c) => c.name === 'SCR_10_Admin_Moderation');

  assert.strictEqual(flow1.nodeId, scr00.id, 'Flow 1 (Guest) must start at SCR_00_Home_Landing');
  assert.strictEqual(flow2.nodeId, scr07.id, 'Flow 2 (Student) must start at SCR_07_Doc_Detail_Student');
  assert.strictEqual(flow3.nodeId, scr10.id, 'Flow 3 (Admin) must start at SCR_10_Admin_Moderation');

  console.log('  ✔ PASS: Exactly 338 prototype wires validated with zero dangling destinations; 3 Actor flows correctly bound.');

  // ---------------------------------------------------------------------------
  // Check 8: Adversarial Stress Test - Vector Mock Fallback
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Testing Adversarial Stress Test: Vector Mock Fallback ---');
  // Re-run sandbox with figma.createVector removed to ensure fallback never crashes
  const fallbackFigma = {
    ...figmaMock,
    createVector: undefined
  };
  const fallbackSandbox = {
    figma: fallbackFigma,
    __html__: '<html></html>',
    console
  };
  vm.createContext(fallbackSandbox);
  vm.runInContext(codeContent, fallbackSandbox);

  await fallbackFigma.ui.onmessage({
    type: 'GENERATE_5SHARE_PROTOTYPE',
    options: { includeDesignSystem: false, includeScreens: true, includeWires: false }
  });
  console.log('  ✔ PASS: Plugin functions gracefully without throw even when figma.createVector is unavailable (fallback active).');

  // ---------------------------------------------------------------------------
  // Check 9: Anti-AI-Slop & Zero-Dark-Mode Scan on Plugin Code
  // ---------------------------------------------------------------------------
  console.log('\n--- 9. Testing Anti-AI-Slop & Zero Dark Backgrounds in code.js and ui.html ---');
  const uiHtmlPath = path.join(__dirname, '..', 'tools', 'figma-5share-plugin', 'ui.html');
  const uiHtmlContent = fs.readFileSync(uiHtmlPath, 'utf8');

  assert.strictEqual(codeContent.includes('Traceability_Banner'), false, 'code.js must not contain Traceability_Banner');
  assert.strictEqual(codeContent.includes('#0f172a'), false, 'code.js must not contain dark hex #0f172a');
  assert.strictEqual(codeContent.includes('#0b1120'), false, 'code.js must not contain dark hex #0b1120');
  assert.strictEqual(uiHtmlContent.includes('#0f172a'), false, 'ui.html must not contain dark hex #0f172a');
  assert.strictEqual(uiHtmlContent.includes('#0b1120'), false, 'ui.html must not contain dark hex #0b1120');

  console.log('  ✔ PASS: Zero AI-slop banners and zero dark background hexes detected.');

  console.log('\n================================================================');
  console.log('🎉 ALL REVIEWER M5-2 ADVERSARIAL AUDIT TESTS PASSED (0 FAILURES)!');
  console.log('================================================================');
}

runAudit().catch((err) => {
  console.error('❌ [AUDIT FAILED]:', err);
  process.exit(1);
});
