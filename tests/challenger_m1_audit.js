/**
 * CHALLENGER M1 EMPIRICAL AUDIT HARNESS
 * Comprehensive adversarial verification of Light Mode, CSS Variables, Typography & Contrast
 */

import fs from 'fs';
import path from 'path';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const findings = [];

function recordResult(category, name, pass, detail) {
  totalTests++;
  if (pass) {
    passedTests++;
    console.log(`  [PASS] [${category}] ${name}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] [${category}] ${name}: ${detail}`);
    findings.push({ category, name, detail });
  }
}

// -----------------------------------------------------------------------------
// Helper: Calculate WCAG 2.1 Relative Luminance & Contrast Ratio
// -----------------------------------------------------------------------------
function hexToRgb(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function sRgbLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(v => {
    const val = v / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(hex1, hex2) {
  const l1 = sRgbLuminance(hexToRgb(hex1));
  const l2 = sRgbLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// -----------------------------------------------------------------------------
// 1. RECURSIVE FILE SEARCH & DARK THEME TOKEN AUDIT
// -----------------------------------------------------------------------------
function getAllFiles(dir, exts, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        getAllFiles(filePath, exts, fileList);
      }
    } else if (exts.includes(path.extname(file))) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

console.log('================================================================');
console.log('  CHALLENGER M1: EMPIRICAL AUDIT HARNESS');
console.log('================================================================\n');

// Target files
const srcFiles = getAllFiles('./client/src', ['.js', '.jsx', '.css']);
srcFiles.push('./client/index.html');

console.log(`Auditing ${srcFiles.length} client source files...`);

// 1.1: Stray data-theme, dark-theme, .dark class
console.log('\n--- 1. Adversarial Search: Dark Mode Rules & Classes ---');
for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative('./', file).replace(/\\/g, '/');

  // Skip vite.svg or assets
  if (relPath.includes('assets/vite.svg')) continue;

  if (content.includes('data-theme')) {
    recordResult('Dark Rule', `data-theme in ${relPath}`, false, `Found data-theme reference`);
  }
  if (content.includes('dark-theme')) {
    recordResult('Dark Rule', `dark-theme in ${relPath}`, false, `Found dark-theme reference`);
  }
  if (/\.dark\b/.test(content)) {
    recordResult('Dark Rule', `.dark class in ${relPath}`, false, `Found .dark class reference`);
  }
  if (/\bdark:/.test(content)) {
    recordResult('Dark Rule', `dark: modifier in ${relPath}`, false, `Found dark: prefix reference`);
  }
  if (content.includes('onToggleTheme') || content.includes('toggleTheme')) {
    recordResult('Dark Rule', `toggleTheme in ${relPath}`, false, `Found theme toggling reference`);
  }
}
recordResult('Dark Rule', 'Zero dark mode selectors/classes across all source files', failedTests === 0, 'No stray dark selectors');

// 1.2: Hardcoded dark background hexes
console.log('\n--- 2. Adversarial Search: Dark Hex Backgrounds (#0f172a, #0b1120) ---');
const darkHexMatches = [];
for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative('./', file).replace(/\\/g, '/');
  if (relPath.includes('assets/vite.svg')) continue;

  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/#0f172a|#0b1120|#020617/i.test(line)) {
      darkHexMatches.push({ file: relPath, line: idx + 1, text: line.trim() });
    }
  });
}

if (darkHexMatches.length > 0) {
  console.log(`Found ${darkHexMatches.length} occurrences of #0f172a / #0b1120 / #020617:`);
  darkHexMatches.forEach(m => {
    console.log(`  -> ${m.file}:${m.line} : ${m.text}`);
  });
}

// Classify dark hex matches: are any used as background in active client views?
const darkBackgrounds = darkHexMatches.filter(m => 
  /background|backgroundColor/i.test(m.text) && !m.text.startsWith('/*') && !m.text.startsWith('//')
);

if (darkBackgrounds.length > 0) {
  recordResult(
    'Dark Hex',
    'Dark background color inline or rule detected',
    false,
    `Found ${darkBackgrounds.length} dark background usages: ${darkBackgrounds.map(d => `${d.file}:${d.line}`).join(', ')}`
  );
} else {
  recordResult('Dark Hex', 'No dark background colors in source', true, 'Pure light backgrounds');
}

// -----------------------------------------------------------------------------
// 3. CSS VARIABLE INTEGRITY CHECK
// -----------------------------------------------------------------------------
console.log('\n--- 3. Stress-Testing CSS Variables Resolution ---');
const radixCss = fs.readFileSync('./client/src/styles/radix_colors.css', 'utf8');
const platformCss = fs.readFileSync('./client/src/styles/platform.css', 'utf8');

// Collect defined variables
const definedVars = new Set();
const varDefRegex = /(--[a-zA-Z0-9_-]+)\s*:/g;
let match;
while ((match = varDefRegex.exec(radixCss)) !== null) {
  definedVars.add(match[1]);
}
while ((match = varDefRegex.exec(platformCss)) !== null) {
  definedVars.add(match[1]);
}

// Find all var(--...) usages
const usedVars = new Map();
const varUseRegex = /var\(\s*(--[a-zA-Z0-9_-]+)(?:\s*,\s*([^)]+))?\s*\)/g;

for (const file of srcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative('./', file).replace(/\\/g, '/');
  let m;
  while ((m = varUseRegex.exec(content)) !== null) {
    const varName = m[1];
    const fallback = m[2] ? m[2].trim() : null;
    if (!usedVars.has(varName)) {
      usedVars.set(varName, []);
    }
    usedVars.get(varName).push({ file: relPath, fallback });
  }
}

console.log(`Defined custom properties: ${definedVars.size}`);
console.log(`Distinct var() references: ${usedVars.size}`);

const undefinedVars = [];
for (const [varName, occurrences] of usedVars.entries()) {
  if (!definedVars.has(varName)) {
    // If every occurrence has a fallback, it's safer, but still technically undeclared in :root
    const withoutFallback = occurrences.filter(o => !o.fallback);
    undefinedVars.push({ varName, count: occurrences.length, withoutFallback: withoutFallback.length, samples: occurrences.slice(0, 2) });
  }
}

if (undefinedVars.length > 0) {
  console.log(`Undefined CSS Variables found (${undefinedVars.length}):`);
  undefinedVars.forEach(u => {
    console.log(`  - ${u.varName} (used ${u.count} times, ${u.withoutFallback} without fallback)`);
  });
  // Check critical ones
  const criticalUndefined = undefinedVars.filter(u => u.withoutFallback > 0);
  if (criticalUndefined.length > 0) {
    recordResult('CSS Variables', 'Undefined CSS Variables without fallback', false, `${criticalUndefined.map(c => c.varName).join(', ')}`);
  } else {
    recordResult('CSS Variables', 'All undefined CSS variables have fallbacks', true, 'Safe fallbacks provided');
  }
} else {
  recordResult('CSS Variables', '100% of var() references resolve to defined tokens', true, 'Zero undefined tokens');
}

// -----------------------------------------------------------------------------
// 4. WCAG CONTRAST STRESS TESTING (LIGHT MODE)
// -----------------------------------------------------------------------------
console.log('\n--- 4. WCAG 2.1 Light Mode Contrast Ratios ---');
const contrastPairs = [
  { name: 'Primary Text on App Background', fg: '#11181c', bg: '#fcfcfd', minRatio: 4.5, level: 'AA' },
  { name: 'Primary Text on White Surface', fg: '#11181c', bg: '#ffffff', minRatio: 4.5, level: 'AA' },
  { name: 'Secondary Text on App Background', fg: '#687076', bg: '#fcfcfd', minRatio: 4.5, level: 'AA' },
  { name: 'Secondary Text on White Surface', fg: '#687076', bg: '#ffffff', minRatio: 4.5, level: 'AA' },
  { name: 'Primary Button Text (White) on Blue-9 Base', fg: '#ffffff', bg: '#0090ff', minRatio: 3.0, level: 'Large/Component' },
  { name: 'Primary Button Text (White) on Blue-10 Hover', fg: '#ffffff', bg: '#0588f0', minRatio: 3.0, level: 'Large/Component' },
  { name: 'Danger Button Text (White) on Red-9 Base', fg: '#ffffff', bg: '#e5484d', minRatio: 3.0, level: 'Large/Component' },
  { name: 'Success Text (Green-11) on Green-3 Pill', fg: '#18794e', bg: '#e6f8eb', minRatio: 4.5, level: 'AA' },
  { name: 'Warning Text (Amber-12) on Amber-3 Pill', fg: '#4f3422', bg: '#fff7c2', minRatio: 4.5, level: 'AA' },
  { name: 'Danger Text (Red-11) on Red-3 Pill', fg: '#cd2b31', bg: '#ffefef', minRatio: 4.5, level: 'AA' },
  { name: 'Info Text (Blue-12) on Blue-3 Pill', fg: '#113264', bg: '#e6f4fe', minRatio: 4.5, level: 'AA' }
];

for (const pair of contrastPairs) {
  const ratio = getContrastRatio(pair.fg, pair.bg);
  const pass = ratio >= pair.minRatio;
  recordResult(
    'Contrast',
    `${pair.name} (${pair.fg} on ${pair.bg}) -> ${ratio.toFixed(2)}:1 (Req >= ${pair.minRatio}:1 [${pair.level}])`,
    pass,
    `Ratio ${ratio.toFixed(2)}:1 is below ${pair.minRatio}:1`
  );
}

// -----------------------------------------------------------------------------
// 5. TYPOGRAPHY & FONT LINKAGE AUDIT
// -----------------------------------------------------------------------------
console.log('\n--- 5. Typography Pairing & Font Linkage Audit ---');
const indexHtml = fs.readFileSync('./client/index.html', 'utf8');

// 5.1 Google Fonts Preconnect
const hasGoogleFontsPreconnect = indexHtml.includes('rel="preconnect" href="https://fonts.googleapis.com"') &&
                                 indexHtml.includes('rel="preconnect" href="https://fonts.gstatic.com"');
recordResult('Typography', 'Google Fonts preconnect links present', hasGoogleFontsPreconnect, 'Missing fonts.googleapis.com or fonts.gstatic.com preconnect');

// 5.2 Google Fonts Stylesheet Link
const hasFontLink = indexHtml.includes('family=Be+Vietnam+Pro') && indexHtml.includes('family=STIX+Two+Text') && indexHtml.includes('display=swap');
recordResult('Typography', 'Be Vietnam Pro & STIX Two Text fonts loaded via Google Fonts with display=swap', hasFontLink, 'Missing font family or display=swap in index.html');

// 5.3 CSS Font Token Declarations
const hasFontTokens = radixCss.includes("--font-ui: 'Be Vietnam Pro'") && radixCss.includes("--font-academic: 'STIX Two Text'");
recordResult('Typography', 'CSS tokens --font-ui and --font-academic declared correctly', hasFontTokens, 'Missing or incorrect font token values');

// 5.4 Typography Hierarchy Applied in CSS
const hasFontHeading = radixCss.includes("h1, h2, h3, h4, h5, h6") && radixCss.includes("font-family: var(--font-ui)");
const hasAcademicClass = radixCss.includes(".academic-font") && radixCss.includes("font-family: var(--font-academic)");
recordResult('Typography', 'Headings and UI controls bound to --font-ui', hasFontHeading, 'Headings not mapped to --font-ui');
recordResult('Typography', 'Academic and document readers bound to --font-academic', hasAcademicClass, 'Academic classes not mapped to --font-academic');

// -----------------------------------------------------------------------------
// 6. BRAND ASSET SPECIFICATIONS
// -----------------------------------------------------------------------------
console.log('\n--- 6. Brand Logo & Favicon Assets ---');
const hasFaviconLink = indexHtml.includes('href="/favicon.svg"');
recordResult('Brand Asset', 'index.html links to /favicon.svg', hasFaviconLink, 'Missing /favicon.svg link');

const faviconExists = fs.existsSync('./client/public/favicon.svg');
const logoExists = fs.existsSync('./client/public/logo.svg');
const lockupExists = fs.existsSync('./client/public/logo-lockup.svg');
recordResult('Brand Asset', 'All 3 brand assets exist in client/public/', faviconExists && logoExists && lockupExists, 'Missing SVG assets');

// -----------------------------------------------------------------------------
// 7. SUMMARY & FINDINGS
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`  AUDIT HARNESS RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL ${totalTests})`);
console.log('================================================================');

if (findings.length > 0) {
  console.log('\nDetailed Findings:');
  findings.forEach(f => {
    console.log(`  - [${f.category}] ${f.name}: ${f.detail}`);
  });
}

// Exit code based on findings
process.exit(failedTests > 0 ? 1 : 0);
