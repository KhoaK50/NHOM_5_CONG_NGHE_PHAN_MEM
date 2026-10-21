/**
 * ADVERSARIAL STRESS TEST SUITE FOR MILESTONE 5: FIGMA PLUGIN NODE ARCHITECTURE & BOUNDARIES
 * 
 * Challenger: M5 Challenger 1 (Plugin Node Architecture & Boundary Challenger)
 * Scope:
 * 1. Stress-test Figma mock node creation: verify all 20 frames exist and have exact correct dimensions.
 * 2. Verify primaryAxisSizingMode on Auto Layout vertical containers (Login_Modal_Card, DocCard_DOC_01)
 *    is strictly AUTO (hug contents), not reset to FIXED.
 * 3. Verify counterAxisSizingMode is FIXED.
 * 4. Verify itemSpacing === 0 on all 8 main workspace screens with Topbar.
 * 5. Stress-test prototype reaction destinations: assert 100% of wires point to valid existing frame IDs (zero dangling destinations).
 * 6. Stress-test persona switching triggers: assert clicking Persona_Opt_GUEST, Persona_Opt_STUDENT, Persona_Opt_ADMIN correctly transitions between screens.
 * 7. Stress-test Act V Portal CTA: assert Btn_ActV_Enter_Workspace transitions from Landing (SCR_00) to Discovery (SCR_05).
 * 8. Stress-test Feedback Modal trigger: assert Btn_Open_Feedback_Modal opens SCR_18.
 * 9. Additional boundary stress tests:
 *    - Flow Starting Points (Guest -> SCR_00, Student -> SCR_07, Admin -> SCR_10).
 *    - Light Mode color palette assertions on frames and cards (zero dark background canvas).
 *    - Deep traversal reaction validation across the entire node tree.
 *    - Multi-run idempotency & memory leak stress.
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assertTest(condition, description, detail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✔ PASS: ${description}`);
  } else {
    failedTests++;
    failures.push({ description, detail });
    console.error(`  ✖ FAIL: ${description}${detail ? ` (${detail})` : ''}`);
  }
}

// ============================================================================
// ADVERSARIAL FIGMA API MOCK FACTORY
// ============================================================================
function createAdversarialFigmaEnvironment() {
  let idCounter = 1;
  const allNodesById = new Map();
  const allReactions = [];
  const messagesToUi = [];

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
      primaryAxisAlignItems: 'MIN',
      counterAxisAlignItems: 'MIN',
      layoutAlign: 'INHERIT',
      layoutGrow: 0,

      appendChild(child) {
        if (!child) throw new Error('Cannot append null child');
        if (child.parent) {
          child.parent.children = child.parent.children.filter((c) => c !== child);
        }
        child.parent = this;
        this.children.push(child);
      },

      resize(w, h) {
        this.width = w;
        this.height = h;
        // Hostile / Strict Figma Engine Simulation:
        // In real Figma Plugin API, calling resize() on a node AFTER layoutMode is set
        // forcibly resets both axes to 'FIXED' mode.
        if (this.layoutMode && this.layoutMode !== 'NONE') {
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
          throw new Error('setReactionsAsync: reactionsList must be a non-empty array');
        }
        for (const r of reactionsList) {
          if (!r.trigger || r.trigger.type !== 'ON_CLICK') {
            throw new Error(`setReactionsAsync: invalid trigger ${JSON.stringify(r.trigger)}`);
          }
          if (!Array.isArray(r.actions) || r.actions.length === 0) {
            throw new Error('setReactionsAsync: reaction actions must be non-empty array');
          }
          for (const act of r.actions) {
            if (!act.destinationId) {
              throw new Error('setReactionsAsync: action missing destinationId');
            }
          }
        }
        this.reactions = reactionsList;
        allReactions.push({ sourceId: this.id, sourceName: this.name, sourceNode: this, reactions: reactionsList });
      }
    };

    allNodesById.set(id, node);
    return node;
  }

  const rootPage = createMockNode('PAGE');
  rootPage.name = 'Initial Page';

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
    }
  };

  return {
    figmaMock,
    allNodesById,
    allReactions,
    messagesToUi
  };
}

// Deep node finder helper
function findNodesByName(root, targetName) {
  const matches = [];
  function recurse(node) {
    if (!node) return;
    if (node.name === targetName) {
      matches.push(node);
    }
    for (const child of node.children || []) {
      recurse(child);
    }
  }
  recurse(root);
  return matches;
}

function findSingleNodeByName(root, targetName) {
  const matches = findNodesByName(root, targetName);
  return matches.length > 0 ? matches[0] : null;
}

// Deep collect all reactions recursively
function collectAllReactionsRecursively(root) {
  const collected = [];
  function recurse(node) {
    if (!node) return;
    if (node.reactions && node.reactions.length > 0) {
      for (const reaction of node.reactions) {
        collected.push({
          sourceId: node.id,
          sourceName: node.name,
          sourceNode: node,
          reaction
        });
      }
    }
    for (const child of node.children || []) {
      recurse(child);
    }
  }
  recurse(root);
  return collected;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function runAdversarialM5PluginTests() {
  console.log('\n============================================================');
  console.log('  CHALLENGER M5-1: FIGMA PLUGIN ARCHITECTURE & BOUNDARIES');
  console.log('============================================================\n');

  const codePath = path.resolve(__dirname, '../tools/figma-5share-plugin/code.js');
  assertTest(fs.existsSync(codePath), 'Figma plugin code.js file exists at tools/figma-5share-plugin/code.js');
  const codeContent = fs.readFileSync(codePath, 'utf8');

  // Initialize adversarial environment
  const env = createAdversarialFigmaEnvironment();
  const sandbox = {
    figma: env.figmaMock,
    __html__: '<html><body id="plugin-ui"></body></html>',
    console
  };

  vm.createContext(sandbox);
  try {
    vm.runInContext(codeContent, sandbox);
    assertTest(typeof env.figmaMock.ui.onmessage === 'function', 'Plugin successfully evaluates and registers figma.ui.onmessage handler');
  } catch (err) {
    assertTest(false, 'Plugin code evaluation threw an uncaught error', err.stack);
    return;
  }

  // Execute full prototype generation
  console.log('\n--- 1. Executing Full 5Share Prototype Generation ---');
  await env.figmaMock.ui.onmessage({
    type: 'GENERATE_5SHARE_PROTOTYPE',
    options: {
      includeDesignSystem: true,
      includeScreens: true,
      includeWires: true
    }
  });

  const completion = env.messagesToUi.find((m) => m.type === 'GENERATION_COMPLETE');
  const error = env.messagesToUi.find((m) => m.type === 'GENERATION_ERROR');

  assertTest(!error, 'Plugin did NOT emit any GENERATION_ERROR', error ? error.error : '');
  assertTest(!!completion, 'Plugin emitted GENERATION_COMPLETE event');

  const targetPage = env.figmaMock.currentPage;
  assertTest(
    targetPage && targetPage.name.includes('5Share') && targetPage.name.includes('19 M'),
    `Target page created with valid name "${targetPage ? targetPage.name : 'none'}"`
  );

  // ==========================================================================
  // SECTION 1: STRESS-TEST ALL 20 FRAMES & EXACT DIMENSIONS
  // ==========================================================================
  console.log('\n--- 2. Stress-Testing All 20 Frames & Exact Dimensions ---');

  const EXPECTED_20_FRAMES = [
    { name: '00_Design_System_Components', width: 1440, counterSizing: 'FIXED', primarySizing: 'AUTO' },
    { name: 'SCR_00_Home_Landing', width: 1440, height: 3600, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_01_Auth_Login', width: 1440, height: 900, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_02_Auth_Register', width: 1440, height: 940, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_03_Notification_Dropdown', width: 1440, height: 900, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_04_Report_Modal', width: 1440, height: 900, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_05_Home_Discovery', width: 1440, height: 1080, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_06_Doc_Detail_Guest', width: 1440, height: 920, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_07_Doc_Detail_Student', width: 1440, height: 980, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_08_Upload_Document', width: 1440, height: 960, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_09_Upload_Hash_Validation', width: 1440, height: 900, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_10_Admin_Moderation', width: 1440, height: 940, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_11_Admin_Courses', width: 1440, height: 920, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_12_Student_MyDocs', width: 1440, height: 920, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_13_Admin_Dashboard', width: 1440, height: 960, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_14_Student_Bookmarks', width: 1440, height: 920, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_15_User_Profile', width: 1440, height: 1020, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_16_Study_Bounty', width: 1440, height: 1080, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_17_Admin_Users', width: 1440, height: 960, counterSizing: 'FIXED', primarySizing: 'FIXED' },
    { name: 'SCR_18_Feedback_Modal', width: 1440, height: 900, counterSizing: 'FIXED', primarySizing: 'FIXED' }
  ];

  const topLevelFramesByName = new Map();
  for (const child of targetPage.children) {
    topLevelFramesByName.set(child.name, child);
  }

  assertTest(
    topLevelFramesByName.size === 20,
    `Top-level frame count is exactly 20 (Found: ${topLevelFramesByName.size})`,
    `Frames: ${[...topLevelFramesByName.keys()].join(', ')}`
  );

  for (const exp of EXPECTED_20_FRAMES) {
    const frame = topLevelFramesByName.get(exp.name);
    assertTest(!!frame, `Frame "${exp.name}" exists at top level of page`);
    if (frame) {
      assertTest(frame.width === exp.width, `Frame "${exp.name}" width is ${exp.width}px (actual: ${frame.width})`);
      if (exp.height !== undefined) {
        assertTest(frame.height === exp.height, `Frame "${exp.name}" height is ${exp.height}px (actual: ${frame.height})`);
      } else {
        assertTest(frame.primaryAxisSizingMode === 'AUTO', `Frame "${exp.name}" hugs contents vertically with primaryAxisSizingMode === 'AUTO'`);
      }
      assertTest(frame.children.length > 0, `Frame "${exp.name}" has children (actual: ${frame.children.length})`);
    }
  }

  // ==========================================================================
  // SECTION 2: AUTO LAYOUT SIZING MODES (AUTO / HUG vs FIXED)
  // ==========================================================================
  console.log('\n--- 3. Verifying Auto Layout Sizing Modes (AUTO/Hug vs FIXED) ---');

  // Test Login_Modal_Card
  const loginModalCard = findSingleNodeByName(targetPage, 'Login_Modal_Card');
  assertTest(!!loginModalCard, 'Found Login_Modal_Card node in targetPage');
  if (loginModalCard) {
    assertTest(
      loginModalCard.primaryAxisSizingMode === 'AUTO',
      `Login_Modal_Card primaryAxisSizingMode is strictly 'AUTO' (hug contents), NOT 'FIXED' (actual: ${loginModalCard.primaryAxisSizingMode})`
    );
    assertTest(
      loginModalCard.counterAxisSizingMode === 'FIXED',
      `Login_Modal_Card counterAxisSizingMode is strictly 'FIXED' (actual: ${loginModalCard.counterAxisSizingMode})`
    );
    assertTest(loginModalCard.width === 440, `Login_Modal_Card fixed width is 440px (actual: ${loginModalCard.width})`);
    assertTest(loginModalCard.layoutMode === 'VERTICAL', `Login_Modal_Card layoutMode is VERTICAL (actual: ${loginModalCard.layoutMode})`);
  }

  // Test DocCard_DOC_01
  const docCardDoc01 = findSingleNodeByName(targetPage, 'DocCard_DOC_01');
  assertTest(!!docCardDoc01, 'Found DocCard_DOC_01 node in targetPage');
  if (docCardDoc01) {
    assertTest(
      docCardDoc01.primaryAxisSizingMode === 'AUTO',
      `DocCard_DOC_01 primaryAxisSizingMode is strictly 'AUTO' (hug contents), NOT 'FIXED' (actual: ${docCardDoc01.primaryAxisSizingMode})`
    );
    assertTest(
      docCardDoc01.counterAxisSizingMode === 'FIXED',
      `DocCard_DOC_01 counterAxisSizingMode is strictly 'FIXED' (actual: ${docCardDoc01.counterAxisSizingMode})`
    );
    assertTest(docCardDoc01.width === 340, `DocCard_DOC_01 fixed width is 340px (actual: ${docCardDoc01.width})`);
    assertTest(docCardDoc01.layoutMode === 'VERTICAL', `DocCard_DOC_01 layoutMode is VERTICAL (actual: ${docCardDoc01.layoutMode})`);
  }

  // Test Feedback_Modal_Card
  const feedbackModalCard = findSingleNodeByName(targetPage, 'Feedback_Modal_Card');
  assertTest(!!feedbackModalCard, 'Found Feedback_Modal_Card node in targetPage');
  if (feedbackModalCard) {
    assertTest(
      feedbackModalCard.primaryAxisSizingMode === 'AUTO',
      `Feedback_Modal_Card primaryAxisSizingMode is strictly 'AUTO' (actual: ${feedbackModalCard.primaryAxisSizingMode})`
    );
    assertTest(
      feedbackModalCard.counterAxisSizingMode === 'FIXED',
      `Feedback_Modal_Card counterAxisSizingMode is strictly 'FIXED' (actual: ${feedbackModalCard.counterAxisSizingMode})`
    );
  }

  // Counter axis sizing mode check across all top-level frames
  for (const exp of EXPECTED_20_FRAMES) {
    const frame = topLevelFramesByName.get(exp.name);
    if (frame) {
      assertTest(
        frame.counterAxisSizingMode === 'FIXED',
        `Top-level frame "${exp.name}" counterAxisSizingMode is 'FIXED' (actual: ${frame.counterAxisSizingMode})`
      );
    }
  }

  // ==========================================================================
  // SECTION 3: TOPBAR ITEM SPACING === 0 ON ALL 8 MAIN WORKSPACE SCREENS
  // ==========================================================================
  console.log('\n--- 4. Verifying itemSpacing === 0 on 8 Main Workspace Screens with Topbar ---');

  const MAIN_WORKSPACE_SCREENS_8 = [
    'SCR_00_Home_Landing',
    'SCR_05_Home_Discovery',
    'SCR_10_Admin_Moderation',
    'SCR_11_Admin_Courses',
    'SCR_13_Admin_Dashboard',
    'SCR_15_User_Profile',
    'SCR_16_Study_Bounty',
    'SCR_17_Admin_Users'
  ];

  for (const scrName of MAIN_WORKSPACE_SCREENS_8) {
    const scr = topLevelFramesByName.get(scrName);
    assertTest(!!scr, `Workspace screen "${scrName}" exists`);
    if (scr) {
      assertTest(
        scr.itemSpacing === 0,
        `Screen "${scrName}" has itemSpacing === 0 (actual: ${scr.itemSpacing}) - guarantees zero gap below Topbar`
      );
      // Verify first child is indeed the Topbar Navbar
      const firstChild = scr.children[0];
      assertTest(
        firstChild && firstChild.name === 'Vectoria_Topbar',
        `Screen "${scrName}" first child is 'Vectoria_Topbar' (actual: ${firstChild ? firstChild.name : 'none'})`
      );
    }
  }

  // ==========================================================================
  // SECTION 4: STRESS-TEST PROTOTYPE REACTION DESTINATIONS (ZERO DANGLING DESTINATIONS)
  // ==========================================================================
  console.log('\n--- 5. Stress-Testing Prototype Wire Destinations (Zero Dangling Pointers) ---');

  const allTopLevelIds = new Set(targetPage.children.map((c) => c.id));
  const deepReactions = collectAllReactionsRecursively(targetPage);

  assertTest(
    env.allReactions.length === 338,
    `Total prototype reaction wire count across all nodes is exactly 338 (actual: ${env.allReactions.length})`
  );

  assertTest(
    deepReactions.length >= 290,
    `Deep unique reaction nodes attached in targetPage tree is >= 290 (actual: ${deepReactions.length})`
  );

  let danglingCount = 0;
  const danglingDetails = [];

  for (const item of env.allReactions) {
    const action = item.reactions[0].actions[0];
    const destId = action.destinationId;
    if (!allTopLevelIds.has(destId)) {
      danglingCount++;
      danglingDetails.push({
        source: `${item.sourceName} (${item.sourceId})`,
        danglingDestId: destId
      });
    }
    // Verify trigger is strictly ON_CLICK
    assertTest(
      item.reactions[0].trigger && item.reactions[0].trigger.type === 'ON_CLICK',
      `Reaction on "${item.sourceName}" trigger is ON_CLICK`
    );
  }

  assertTest(
    danglingCount === 0,
    `Prototype reactions: exactly ZERO dangling destinations across all 338 wires (Dangling: ${danglingCount})`,
    danglingDetails.slice(0, 5).map((d) => `${d.source} -> ${d.danglingDestId}`).join('; ')
  );

  // ==========================================================================
  // SECTION 5: STRESS-TEST PERSONA SWITCHING TRIGGERS
  // ==========================================================================
  console.log('\n--- 6. Stress-Testing Persona Switching Triggers ---');

  const scr05 = topLevelFramesByName.get('SCR_05_Home_Discovery');
  const scr07 = topLevelFramesByName.get('SCR_07_Doc_Detail_Student');
  const scr10 = topLevelFramesByName.get('SCR_10_Admin_Moderation');

  assertTest(!!scr05 && !!scr07 && !!scr10, 'Reference screens SCR_05, SCR_07, SCR_10 exist for persona targets');

  const guestTriggers = findNodesByName(targetPage, 'Persona_Opt_GUEST');
  const studentTriggers = findNodesByName(targetPage, 'Persona_Opt_STUDENT');
  const adminTriggers = findNodesByName(targetPage, 'Persona_Opt_ADMIN');

  assertTest(guestTriggers.length >= 10, `Found >= 10 Persona_Opt_GUEST buttons across navbars (Found: ${guestTriggers.length})`);
  assertTest(studentTriggers.length >= 10, `Found >= 10 Persona_Opt_STUDENT buttons across navbars (Found: ${studentTriggers.length})`);
  assertTest(adminTriggers.length >= 10, `Found >= 10 Persona_Opt_ADMIN buttons across navbars (Found: ${adminTriggers.length})`);

  let guestAllCorrect = true;
  for (const btn of guestTriggers) {
    if (!btn.reactions || btn.reactions.length === 0 || btn.reactions[0].actions[0].destinationId !== scr05.id) {
      guestAllCorrect = false;
      break;
    }
  }
  assertTest(guestAllCorrect, '100% of Persona_Opt_GUEST triggers correctly transition to SCR_05_Home_Discovery');

  let studentAllCorrect = true;
  for (const btn of studentTriggers) {
    if (!btn.reactions || btn.reactions.length === 0 || btn.reactions[0].actions[0].destinationId !== scr07.id) {
      studentAllCorrect = false;
      break;
    }
  }
  assertTest(studentAllCorrect, '100% of Persona_Opt_STUDENT triggers correctly transition to SCR_07_Doc_Detail_Student');

  let adminAllCorrect = true;
  for (const btn of adminTriggers) {
    if (!btn.reactions || btn.reactions.length === 0 || btn.reactions[0].actions[0].destinationId !== scr10.id) {
      adminAllCorrect = false;
      break;
    }
  }
  assertTest(adminAllCorrect, '100% of Persona_Opt_ADMIN triggers correctly transition to SCR_10_Admin_Moderation');

  // ==========================================================================
  // SECTION 6: STRESS-TEST ACT V PORTAL CTA TRANSITIONS
  // ==========================================================================
  console.log('\n--- 7. Stress-Testing Act V Portal CTA Transitions ---');

  const scr00 = topLevelFramesByName.get('SCR_00_Home_Landing');
  const scr08 = topLevelFramesByName.get('SCR_08_Upload_Document');

  assertTest(!!scr00, 'SCR_00_Home_Landing exists');
  const btnActVDiscovery = findSingleNodeByName(scr00, 'Btn_ActV_Enter_Workspace');
  assertTest(!!btnActVDiscovery, 'Found Btn_ActV_Enter_Workspace inside SCR_00_Home_Landing');

  if (btnActVDiscovery) {
    assertTest(
      btnActVDiscovery.reactions && btnActVDiscovery.reactions.length > 0,
      'Btn_ActV_Enter_Workspace has prototype reactions attached'
    );
    const destId = btnActVDiscovery.reactions[0].actions[0].destinationId;
    assertTest(
      destId === scr05.id,
      `Btn_ActV_Enter_Workspace transitions to SCR_05_Home_Discovery (dest: ${destId}, expected: ${scr05.id})`
    );
  }

  const btnActVContribute = findSingleNodeByName(scr00, 'Btn_ActV_Contribute');
  assertTest(!!btnActVContribute, 'Found Btn_ActV_Contribute inside SCR_00_Home_Landing');
  if (btnActVContribute && scr08) {
    const destId = btnActVContribute.reactions[0].actions[0].destinationId;
    assertTest(
      destId === scr08.id,
      `Btn_ActV_Contribute transitions to SCR_08_Upload_Document (dest: ${destId}, expected: ${scr08.id})`
    );
  }

  // ==========================================================================
  // SECTION 7: STRESS-TEST FEEDBACK MODAL TRIGGER
  // ==========================================================================
  console.log('\n--- 8. Stress-Testing Feedback Modal Trigger & Return Paths ---');

  const scr18 = topLevelFramesByName.get('SCR_18_Feedback_Modal');
  assertTest(!!scr18, 'SCR_18_Feedback_Modal exists');

  const btnOpenFeedback = findSingleNodeByName(scr07, 'Btn_Open_Feedback_Modal');
  assertTest(!!btnOpenFeedback, 'Found Btn_Open_Feedback_Modal inside SCR_07_Doc_Detail_Student');

  if (btnOpenFeedback && scr18) {
    assertTest(
      btnOpenFeedback.reactions && btnOpenFeedback.reactions.length > 0,
      'Btn_Open_Feedback_Modal has prototype reactions attached'
    );
    const destId = btnOpenFeedback.reactions[0].actions[0].destinationId;
    assertTest(
      destId === scr18.id,
      `Btn_Open_Feedback_Modal transitions to SCR_18_Feedback_Modal (dest: ${destId}, expected: ${scr18.id})`
    );
  }

  // Check Feedback Modal Return Buttons
  if (scr18) {
    const btnCancelFeedback = findSingleNodeByName(scr18, 'Btn_Feedback_Cancel');
    assertTest(!!btnCancelFeedback, 'Found Btn_Feedback_Cancel inside SCR_18');
    if (btnCancelFeedback && scr07) {
      const cancelDestId = btnCancelFeedback.reactions[0].actions[0].destinationId;
      assertTest(
        cancelDestId === scr07.id,
        `Btn_Feedback_Cancel returns back to SCR_07_Doc_Detail_Student (dest: ${cancelDestId}, expected: ${scr07.id})`
      );
    }

    const btnSubmitFeedback = findSingleNodeByName(scr18, 'Btn_Feedback_Submit');
    assertTest(!!btnSubmitFeedback, 'Found Btn_Feedback_Submit inside SCR_18');
    if (btnSubmitFeedback && scr05) {
      const submitDestId = btnSubmitFeedback.reactions[0].actions[0].destinationId;
      assertTest(
        submitDestId === scr05.id,
        `Btn_Feedback_Submit navigates back to SCR_05_Home_Discovery (dest: ${submitDestId}, expected: ${scr05.id})`
      );
    }
  }

  // ==========================================================================
  // SECTION 8: ADDITIONAL ADVERSARIAL STRESS: FLOW STARTING POINTS & LIGHT MODE
  // ==========================================================================
  console.log('\n--- 9. Stress-Testing Actor Flow Starting Points & Light Mode Compliance ---');

  assertTest(
    Array.isArray(targetPage.flowStartingPoints) && targetPage.flowStartingPoints.length === 3,
    `Target page defines exactly 3 Actor flowStartingPoints (Found: ${targetPage.flowStartingPoints ? targetPage.flowStartingPoints.length : 0})`
  );

  if (Array.isArray(targetPage.flowStartingPoints)) {
    const guestFlow = targetPage.flowStartingPoints.find((f) => f.name.toLowerCase().includes('khách') || f.name.includes('Guest'));
    const studentFlow = targetPage.flowStartingPoints.find((f) => f.name.toLowerCase().includes('sinh viên') || f.name.includes('Student'));
    const adminFlow = targetPage.flowStartingPoints.find((f) => f.name.toLowerCase().includes('quản trị') || f.name.includes('Admin'));

    assertTest(!!guestFlow && guestFlow.nodeId === scr00.id, 'Guest flowStartingPoint begins at SCR_00_Home_Landing');
    assertTest(!!studentFlow && studentFlow.nodeId === scr07.id, 'Student flowStartingPoint begins at SCR_07_Doc_Detail_Student');
    assertTest(!!adminFlow && adminFlow.nodeId === scr10.id, 'Admin flowStartingPoint begins at SCR_10_Admin_Moderation');
  }

  // Light Mode Color Compliance on all 20 frames
  let allFramesLightMode = true;
  for (const exp of EXPECTED_20_FRAMES) {
    const frame = topLevelFramesByName.get(exp.name);
    if (frame && frame.fills && frame.fills[0] && frame.fills[0].color) {
      const { r, g, b } = frame.fills[0].color;
      // Radix slate1 or white has r, g, b > 0.9
      if (r < 0.85 || g < 0.85 || b < 0.85) {
        allFramesLightMode = false;
        console.error(`Frame ${exp.name} fill is dark: r=${r}, g=${g}, b=${b}`);
      }
    }
  }
  assertTest(allFramesLightMode, 'All 20 top-level frames have genuine Light Mode backgrounds (r, g, b > 0.85, zero dark canvases)');

  // ==========================================================================
  // SECTION 9: IDEMPOTENCY / MULTI-GENERATION STRESS
  // ==========================================================================
  console.log('\n--- 10. Stress-Testing Multi-Generation Idempotency ---');
  try {
    await env.figmaMock.ui.onmessage({
      type: 'GENERATE_5SHARE_PROTOTYPE',
      options: {
        includeDesignSystem: true,
        includeScreens: true,
        includeWires: true
      }
    });
    assertTest(true, 'Repeated invocation of GENERATE_5SHARE_PROTOTYPE completes without exception or unhandled rejection');
  } catch (err) {
    assertTest(false, 'Repeated invocation crashed', err.message);
  }

  // ==========================================================================
  // FINAL SCORECARD
  // ==========================================================================
  console.log('\n============================================================');
  console.log(`  M5-1 ADVERSARIAL SCORECARD: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    console.error('FAILURES SUMMARY:');
    failures.forEach((f, idx) => {
      console.error(`  ${idx + 1}. ${f.description}: ${f.detail}`);
    });
    process.exit(1);
  } else {
    console.log('🎉 100% ADVERSARIAL TESTS PASSED FOR MILESTONE 5!');
    process.exit(0);
  }
}

runAdversarialM5PluginTests().catch((err) => {
  console.error('FATAL ADVERSARIAL HARNESS ERROR:', err);
  process.exit(1);
});
