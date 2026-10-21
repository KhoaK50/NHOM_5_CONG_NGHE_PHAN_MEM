# Project: 5Share Platform Rebuild (Vectoria Academic SaaS)

## Architecture
- **Framework & Libraries**: React 19 + Vite, Tailwind CSS with Vectoria Semantic Radix CSS tokens, Lucide React icons.
- **Visual Design System**: 100% Radix Light Mode (`radix_colors.css`), Google Drive–style Layered Ribbon Logo Lockup (`BrandLogo.jsx` + standalone SVG assets), Vectoria Production Topbar (`.vec-topbar`) with circular 38px Avatar button (`#btnTopAvatar`) and inline slide-in Account Switcher (`#menuTopAvatar`).
- **Typography**: `--font-ui: 'Be Vietnam Pro'` (Headings, Topbar, Controls), `--font-academic: 'STIX Two Text'` (Document previews, reader, search inputs).
- **Core Separation**:
  - `Trang chủ` (`LandingPage.jsx`): 5-Act Director's Cut Abstract Scrollytelling (zero literal report/homework buzzwords, 3D studio lighting & perspective stage, smooth inertial scroll damping `lerp` 0.06–0.08, Chapter Scrubber `I–V`).
  - `Kho học liệu` (`DiscoveryPage.jsx`): Pure, zero-friction functional workspace opening at viewport top (Curriculum sidebar, Search bar, Multi-criteria filter, Document grid).
- **Data & Security**: 4-Layer Upload Defense (`fileHasher.js` with Whitelist, $\le 25\text{MB}$, Binary Magic Bytes for PDF/DOCX/PPTX, SHA-256 deduplication), Guest rate limits (3 downloads/day, 3-page preview lock), Student full access, Admin governance.
- **Synchronized Figma Plugin**: `tools/figma-5share-plugin/` generating 100% Native Figma Nodes, Auto Layout, full Prototype reaction wiring across Guest, Student, and Admin flows, verified via `test-runner.js`.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | 100% Radix Light Tokens | Exact Radix Light tokens (`--slate-1` to `--slate-12`, `--blue-9`, `--green-9`, `--amber-9`, `--red-9`), purge all dark mode rules | M1 | Survey / `ORIGINAL_REQUEST.md` R1 |
| 2 | Typography Pairing | UI: `Be Vietnam Pro`, Academic: `STIX Two Text`, font loading in `index.html` | M1 | Survey / `ORIGINAL_REQUEST.md` R1 |
| 3 | Google Drive–Style Logo Lockup | Interlocking ribbon loops with smooth fold gradients on transparent bg + upright `5share` wordmark; favicon & SVG exports | M1 | Survey / `ORIGINAL_REQUEST.md` R1 |
| 4 | Production Vectoria Topbar | Flat `.vec-topbar` with active bottom bar, notification bell, circular 38px avatar button `#btnTopAvatar` | M1 | Survey / `ORIGINAL_REQUEST.md` R1 |
| 5 | Inline Account Switcher | Popover `#menuTopAvatar` with slide-in account switcher for Guest, Student, Admin; purge exposed role pill | M1 | Survey / `ORIGINAL_REQUEST.md` R1 |
| 6 | Act I: Aperture & Depth Dive | 3 depth layers (bokeh, sapphire/cyan rings, depth text) + Camera Portal Dive (0% → 20%) | M2 | Survey / `ORIGINAL_REQUEST.md` R2 |
| 7 | Act II: Orbital Convergence | Scattered manuscript slabs spiral along elliptical orbits into unified Master Folio (20% → 45%) | M2 | Survey / `ORIGINAL_REQUEST.md` R2 |
| 8 | Act III: Isometric Exploded View | 45° isometric 4-layer separation (Integrity, Taxonomy, Refinement, Clarity) with SVG callout hairlines (45% → 70%) | M2 | Survey / `ORIGINAL_REQUEST.md` R2 |
| 9 | Act IV: Horizontal Showcase Track | Horizontal translation over 3D constellation with Studio Key Visuals `/assets/studio-pillar-*.png` (70% → 90%) | M2 | Survey / `ORIGINAL_REQUEST.md` R2 |
| 10 | Act V: Threshold Portal | Serene daylight, ribbon trajectories reunite, editorial portal into Workspace & Upload (90% → 100%) | M2 | Survey / `ORIGINAL_REQUEST.md` R2 |
| 11 | Chapter Scrubber & Lerp Damping | Right-edge scrubber `I–V` with percentage `00% → 100%`, smooth inertial scroll damping `lerp 0.06–0.08` | M2 | Survey / `ORIGINAL_REQUEST.md` R2 |
| 12 | Anti-Literalism Compliance | Strict zero homework/report jargon (`COMP1044`, `K48`, `5512`, `SHA-256`, `Magic Bytes`, etc.) on `Trang chủ` | M2 | Survey / `ORIGINAL_REQUEST.md` R2 |
| 13 | Pure Functional Workspace | `Kho học liệu` (`UC05`) opens directly at top of viewport without hero obstruction | M2 | Survey / `ORIGINAL_REQUEST.md` R2 |
| 14 | Auth Subsystem (FR-01 / UC01-02) | Login, Register, Forgot Password, Reset Password, Google SSO | M3 | Survey / SRS FR-01 |
| 15 | Personal Profile & Security (FR-02 / UC03) | `/profile` page: edit full name, cohort, avatar upload, password change, points & contribution history | M3 | Survey / SRS FR-02 |
| 16 | 2-Level Category Tree (FR-03) | Knowledge blocks, semesters, courses navigation in sidebar | M3 | Survey / SRS FR-03 |
| 17 | Multi-Format Search & Filter (FR-04 / UC05) | FTS `unaccent` search + multi-criteria filter supporting `.pdf`, `.docx`, `.pptx` | M3 | Survey / SRS FR-04 |
| 18 | Online Multi-Format Reader (FR-05 / UC06) | PDF.js A4 view (Guest 3-page blur lock vs Student full view), Google Docs Viewer for DOCX/PPTX, Copy Share Link | M3 | Survey / SRS FR-05 |
| 19 | 4-Layer Upload Validation (FR-06 / UC07-08) | Format whitelist, $\le 25\text{MB}$, Magic Bytes (`%PDF-`, `PK..`), SHA-256 deduplication | M3 | Survey / SRS FR-06 |
| 20 | Guest Rate Limit & Downloads (FR-13 / UC12) | Guest max 3 downloads/day in localStorage vs Student unlimited downloads | M3 | Survey / SRS FR-13 |
| 21 | Study Bounty Board & Leaderboard (FR-12) | Dedicated page/section: post bounty requests with points, Top 10 contributor leaderboard | M3 | Survey / SRS FR-12 |
| 22 | My Library (FR-09 / UC11-12) | Bookmarks management and user contributions tracking with status (Pending/Approved/Rejected + reason) | M3 | Survey / SRS FR-09 |
| 23 | Rating & Academic Comments (FR-10 / UC13) | 1–5 Star rating with average score + academic comments with author self-delete | M3 | Survey / SRS FR-10 |
| 24 | Violation Reporting & Feedback (FR-11 / UC04) | Violation Report Modal + System Feedback Box (`Hòm thư góp ý`) | M4 | Survey / SRS FR-11 |
| 25 | Admin Moderation Queue (FR-07 / UC09) | 8-criteria checklist, full preview, Approve (+20 pts & notif), Reject (reason & notif) | M4 | Survey / SRS FR-07 |
| 26 | Admin Course & Category CRUD (FR-08 / UC10) | Category tree management, block deletion if courses have attached documents | M4 | Survey / SRS FR-08 |
| 27 | Admin User Management (FR-08 / UC10) | User list, search by name/email, toggle active/locked status (`is_active`) | M4 | Survey / SRS FR-08 |
| 28 | Admin Violation Resolution (FR-11 / UC09) | Admin resolution of user violation reports (Hide/Delete doc or Dismiss report) | M4 | Survey / SRS FR-11 |
| 29 | Admin Analytics Dashboard (FR-13 / UC11) | KPI cards, Top Courses bar chart, Weekly Download Trend line chart in Light Mode | M4 | Survey / SRS FR-13 |
| 30 | Figma Native Nodes & Light Mode | 100% Native Frames/AutoLayout/TextNodes, Radix Light colors, zero dark backgrounds in `tools/figma-5share-plugin/` | M5 | Survey / `ORIGINAL_REQUEST.md` R4 |
| 31 | Figma Ribbon Logo & Vectoria Topbar | Layered ribbon logo lockup + Vectoria Topbar with circular avatar button in Figma | M5 | Survey / `ORIGINAL_REQUEST.md` R4 |
| 32 | Figma 5-Act Landing & Pure Workspace | Separate `SCR_00_Home_Landing` from `SCR_05_Home_Discovery` in Figma plugin | M5 | Survey / `ORIGINAL_REQUEST.md` R4 |
| 33 | Figma Full FR Coverage & Missing Screens | Add `/profile`, User Management, Bounty Board, Feedback Modal, DOCX/PPTX support in Figma | M5 | Survey / `ORIGINAL_REQUEST.md` R4 |
| 34 | Figma Prototype Reactions & Test Runner | Complete prototype wiring (`setReactionsAsync`) for Guest/Student/Admin, test-runner exit 0 | M5 | Survey / `ORIGINAL_REQUEST.md` R4 |
| 35 | E2E Testing Suite (Tiers 1–4) | Independent opaque-box test runner covering all 13 FRs with $\ge 11 \times N$ test cases | E2E Track | Project Pattern / SRS |
| 36 | Production Verification & Hardening | `npm run lint` and `npm run build` exit 0, Tier 5 adversarial coverage hardening | M6 | Survey / Acceptance Criteria 4 |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Vectoria Design System, Brand Identity & Production Topbar | Radix Light tokens, Be Vietnam Pro + STIX Two Text, Google Drive–style ribbon logo lockup, SVG assets, production `.vec-topbar` with circular 38px Avatar `#btnTopAvatar` and slide-in `#menuTopAvatar` account switcher, zero dark mode, zero dev bars | None | DONE |
| M2 | 5-Act Director's Cut Scrollytelling Landing vs Pure Workspace | Standalone `LandingPage.jsx` (5 acts, 3D lighting & stage, smooth lerp damping, right-edge scrubber, zero literal report jargon) + clean zero-friction `Kho học liệu` workspace (`DiscoveryPage.jsx`) | M1 | DONE |
| M3 | Student Ecosystem & Multi-Format Document Pipeline | `/profile` page, multi-format `.pdf`/`.docx`/`.pptx` search & filter, 4-layer upload validation with Magic Bytes & SHA-256, Online Reader with Guest 3-page lock & Google Docs Viewer, Guest 3 downloads/day, Study Bounty & Leaderboard, My Library, Rating & Comments | M1, M2 | DONE |
| M4 | Admin Governance, System Feedback & Analytics | Admin Moderation Queue (8 criteria), Course CRUD, Admin User Management (`is_active` lock/unlock), Violation Reports & System Feedback Box (`Hòm thư góp ý`), Admin Analytics with Weekly Trend chart, Light Admin Layout | M1 | DONE |
| M5 | Synchronized Internal Figma Plugin | Update `code.js`, `ui.html`, `test-runner.js` to 100% Radix Light mode, Ribbon Logo Lockup, Vectoria Topbar, 5-Act Landing, Pure Workspace, all missing screens, prototype reaction wiring, passing test runner | M1, M2, M3, M4 | DONE |
| M6 | Final Verification & Adversarial Coverage Hardening | Pass 100% E2E test suite (Tiers 1–4), `npm run lint` & `npm run build` exit 0, Tier 5 adversarial testing & coverage audit | M2, M3, M4, M5, TEST_READY | DONE |

### Parallel Track: E2E Testing Track
- **Owner**: E2E Testing Track Sub-orchestrator
- **Scope**: Requirement-driven opaque-box test runner covering Tiers 1–4 across all 13 FRs. Publishes `TEST_READY.md`.
- **Status**: DONE (154/154 passed, TEST_READY.md published)

---

## Code Layout

```
client/
├── public/
│   ├── assets/
│   │   ├── studio-pillar-1.png   (Studio 3D Key Visual - Pillar 1)
│   │   ├── studio-pillar-2.png   (Studio 3D Key Visual - Pillar 2)
│   │   └── studio-pillar-3.png   (Studio 3D Key Visual - Pillar 3)
│   ├── favicon.svg               (5Share Interlocking Ribbon Favicon)
│   ├── logo.svg                  (Standalone Ribbon Logo Mark)
│   └── logo-lockup.svg           (Horizontal Ribbon Mark + 5share Wordmark)
├── src/
│   ├── components/
│   │   ├── admin/
│   │   │   ├── AdminDashboard.jsx       (KPI cards, course bar chart, weekly download line chart)
│   │   │   ├── CourseManagement.jsx     (Course & category CRUD with deletion blocking)
│   │   │   ├── ModerationQueue.jsx      (8-criteria moderation checklist & queue)
│   │   │   └── UserManagement.jsx       (Search users, lock/unlock is_active)
│   │   ├── auth/
│   │   │   └── AuthSubsystem.jsx        (Login, Register, Forgot Password, Reset Password, Google SSO)
│   │   ├── bounty/
│   │   │   └── BountyBoard.jsx          (Study Bounty Board & Top 10 Contributor Leaderboard)
│   │   ├── common/
│   │   │   ├── BrandLogo.jsx            (Google Drive–style ribbon fold gradients + upright wordmark)
│   │   │   └── Navbar.jsx               (Vectoria .vec-topbar, #btnTopAvatar, #menuTopAvatar switcher)
│   │   ├── document/
│   │   │   ├── DocumentDetail.jsx       (Document metadata, preview embed, download flow)
│   │   │   ├── PdfPreviewViewer.jsx     (PDF A4 reader, Guest 3-page blur lock, DOCX/PPTX viewer, Share link)
│   │   │   ├── RatingComments.jsx       (1–5 star rating, academic comments with self-delete)
│   │   │   ├── ReportModal.jsx          (Violation report modal)
│   │   │   └── FeedbackModal.jsx        (System feedback box - Hòm thư góp ý)
│   │   ├── home/
│   │   │   ├── LandingPage.jsx          (5-Act Director's Cut Abstract Scrollytelling, lerp, scrubber)
│   │   │   ├── DiscoveryPage.jsx        (Pure functional Kho học liệu workspace)
│   │   │   ├── DocumentCard.jsx         (Document card preview)
│   │   │   └── FilterSidebar.jsx        (2-level category sidebar, multi-format filter)
│   │   ├── profile/
│   │   │   ├── UserProfile.jsx          (Personal profile, cohort, avatar, password change, history)
│   │   │   ├── MyDocuments.jsx          (User uploaded documents with status and reject reasons)
│   │   │   └── SavedBookmarks.jsx       (Bookmarked documents library)
│   │   └── upload/
│   │       ├── UploadModal.jsx          (4-layer upload modal for PDF/DOCX/PPTX)
│   │       └── Sha256Verifier.jsx       (Binary magic bytes & cryptographic hash display)
│   ├── data/
│   │   └── mockData.js                  (Comprehensive academic seed data)
│   ├── styles/
│   │   ├── radix_colors.css             (100% Radix Light mode tokens, zero dark mode overrides)
│   │   ├── platform.css                 (Vectoria UI layout, topbar, cards, stages)
│   │   └── scrollytelling.css           (5-Act perspective stage, scrubber, animations)
│   ├── utils/
│   │   └── fileHasher.js                (4-layer validation: Whitelist, <=25MB, Magic bytes, SHA-256)
│   ├── App.jsx                          (View routing, global session state, topbar integration)
│   └── main.jsx
tools/
└── figma-5share-plugin/
    ├── manifest.json
    ├── package.json
    ├── ui.html                          (Plugin control UI)
    ├── code.js                          (100% Native Figma Node generator & prototype reaction wiring)
    └── test-runner.js                   (Headless verification test harness)
```

---

## Interface Contracts

### 1. Brand & Session Context Contract (`Navbar.jsx` ↔ `App.jsx`)
- **Active Navigation Items**:
  - `'landing'`: Trang chủ (5-Act Abstract Scrollytelling)
  - `'discovery'`: Kho học liệu (Pure Workspace)
  - `'bounty'`: Treo thưởng & Bảng xếp hạng
  - `'my-docs'`: Kho tài liệu cá nhân
  - `'admin'`: Bảng điều khiển quản trị (Admin only)
- **Session Persona**:
  - `user`: `{ id, name, email, role: 'GUEST' | 'STUDENT' | 'ADMIN', points, avatar, cohort }`
  - `onSwitchAccount(role)`: Switches active session immediately between saved profiles without page reload.
  - `onLogout()`: Clears active session to Guest.

### 2. Multi-Format File Validation Contract (`fileHasher.js`)
- **Function Signature**:
  ```javascript
  export async function verifyFileAndHash(file) -> Promise<{
    isValid: boolean,
    stageFailed: null | 'FILE_MISSING' | 'EXTENSION' | 'EMPTY_FILE' | 'SIZE_LIMIT' | 'MAGIC_BYTES' | 'DUPLICATE_HASH',
    errorMessage?: string,
    fileType: 'pdf' | 'docx' | 'pptx',
    sizeBytes: number,
    sha256Hash: string,
    magicBytesHex: string
  }>
  ```
- **Rules**:
  - Extensions allowed: `.pdf`, `.docx`, `.pptx`.
  - Max size: $25 \times 1024 \times 1024$ bytes.
  - Magic Bytes:
    - PDF: `%PDF-` (`25 50 44 2D`)
    - DOCX/PPTX: `PK\x03\x04` (`50 4B 03 04`)
  - SHA-256: 64-char lowercase hexadecimal string computed via Web Crypto API.

### 3. Guest Rate Limit Contract (`DownloadAction.jsx`)
- **Key in `localStorage`**: `'5share_guest_download_log'` -> JSON array of timestamps `[number, ...]`.
- **Policy**: Max 3 downloads per rolling 24-hour window. If $\ge 3$, blocks download and prompts login modal.

### 4. Admin User Management Contract (`UserManagement.jsx`)
- **State**:
  - `users`: Array of `{ id, name, email, role, cohort, points, isActive, createdAt }`.
  - `toggleUserStatus(userId)`: Flips `isActive` boolean.
  - Block locked users from uploading, commenting, or authenticating.
