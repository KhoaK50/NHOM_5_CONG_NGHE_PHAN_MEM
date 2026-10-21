# BỘ FIGMA PLUGIN NỘI BỘ 5SHARE (`tools/figma-5share-plugin/`)

> **Đề tài:** Hệ thống Quản lý và Chia sẻ Tài liệu Học tập cho Sinh viên ngành Sư phạm Tin học (**5Share**) – Khoa CNTT, Trường ĐH Sư phạm TP.HCM (HCMUE)  
> **Học phần:** Nhập môn Công nghệ Phần mềm (`2611COMP104406`) – GVHD: ThS. Lê Thanh Thoại  
> **Nhóm thực hiện (Nhóm 5):** Nguyễn Trần Đăng Khoa (Nhóm trưởng), Lê Nguyễn Thùy Trâm, Phan Triệu Vĩ, Nguyễn Hoàng Danh, Trần Đức Đạt.

---

## 1. Mục đích & Giá trị Kỹ thuật

1. **100% Native Figma Nodes (Tuyệt đối không dùng ảnh chụp màn hình):**
   - Toàn bộ 19 màn hình + 1 bảng Design System, modal, thẻ học liệu, bảng dữ liệu và biểu đồ được tạo trực tiếp bằng `figma.createFrame()`, `figma.createComponent()`, `figma.createText()`, `figma.createRectangle()` với cấu hình **Auto Layout (`HORIZONTAL` / `VERTICAL`)** chuẩn mực.
   - Giảng viên và chuyên gia có thể bấm vào từng phần tử văn bản, từng nút bấm, từng thẻ học liệu trên Figma để kiểm tra cấu trúc layer, padding, spacing và màu sắc Radix Light Mode.
2. **Hệ màu 100% Radix Light Mode & Font Kép Học thuật:**
   - Sử dụng bảng mã màu chuẩn Radix Colors Light Mode (`--slate-1` đến `--slate-12`, `--blue-1` đến `--blue-12`, `--green`, `--amber`, `--red`). Tuyệt đối không dùng màu nền tối (Zero dark backgrounds).
   - Cặp phông chữ chuyên nghiệp: `'Be Vietnam Pro'` cho UI/Topbar/Điều hướng và `'STIX Two Text'` cho văn bản học thuật/A4 Reader.
3. **Biểu tượng Dải Ruy Băng Lớp Kiểu Google Drive & Vectoria Topbar:**
   - Logo Lockup 3 mảnh tứ giác gấp nếp liên tục với dải gradient Sapphire/Cobalt/Cyan trên nền trong suốt và chữ `5share` thẳng đứng.
   - Vectoria Topbar 64px cố định, vạch chỉ báo active 2px, nút Avatar tròn 38px (`#btnTopAvatar`) và menu popover trượt đổi tài khoản tự nhiên (`#menuTopAvatar`).
4. **Tách rời Landing Page 5 Hồi & Kho học liệu thuần túy:**
   - `SCR_00_Home_Landing`: Hành trình Scrollytelling 5 Hồi chuẩn điện ảnh (Khởi nguyên, Hội tụ, Bóc tách Relats, Băng chuyền Tam trụ, Cổng ngưỡng thực nghiệm) kèm thanh Scrubber La Mã mép phải.
   - `SCR_05_Home_Discovery`: Không gian tra cứu thuần túy mở ngay đỉnh màn hình, thanh tìm kiếm FTS, bộ lọc định dạng (.pdf/.docx/.pptx), cây danh mục 240px và lưới học liệu đa định dạng.
5. **Tự động nối toàn bộ dây Prototype màu xanh (`await node.setReactionsAsync(...)`):**
   - Thiết lập tự động hơn **170+ dây nối tương tác Prototype** (`ON_CLICK` $\rightarrow$ `NAVIGATE` với hiệu ứng `SMART_ANIMATE` và `DISSOLVE`), bao phủ 10 cụm tương tác nghiệp vụ trên toàn bộ 19 màn hình.
   - Tự động khởi tạo **03 Điểm bắt đầu luồng trình chiếu (`flowStartingPoints`)** đại diện cho 3 Actor:
     - **Luồng 1 (Khách vãng lai - Guest):** `SCR_00_Home_Landing` $\rightarrow$ `SCR_05_Home_Discovery` $\rightarrow$ `SCR_06_Doc_Detail_Guest` (Khóa mờ trang 4) $\rightarrow$ `SCR_01_Auth_Login`.
     - **Luồng 2 (Sinh viên - Student):** `SCR_07_Doc_Detail_Student` $\rightarrow$ `SCR_08_Upload_Document` $\rightarrow$ `SCR_12_Student_MyDocs` $\rightarrow$ `SCR_15_User_Profile` $\rightarrow$ `SCR_16_Study_Bounty`.
     - **Luồng 3 (Quản trị viên - Admin):** `SCR_10_Admin_Moderation` (Checklist 8 tiêu chí) $\rightarrow$ `SCR_11_Admin_Courses` $\rightarrow$ `SCR_17_Admin_Users` (Khóa/Mở tài khoản) $\rightarrow$ `SCR_13_Admin_Dashboard`.

---

## 2. Hướng dẫn 3 Bước Chạy Plugin trong Figma Desktop App

1. **Bước 1 – Nạp Manifest vào Figma Desktop:**
   - Mở ứng dụng **Figma Desktop App** và mở file thiết kế của nhóm.
   - Trên thanh menu trên cùng, chọn **`Plugins`** $\rightarrow$ **`Development`** $\rightarrow$ **`Import plugin from manifest...`**.
   - Trỏ tới đường dẫn file: `tools/figma-5share-plugin/manifest.json`.
2. **Bước 2 – Bấm 1 nút Khởi tạo:**
   - Chạy plugin từ menu **`Plugins`** $\rightarrow$ **`Development`** $\rightarrow$ **`5Share - HCMUE Auto UI & Prototype Generator (13 UC)`**.
   - Nhấn nút **"Khởi tạo Toàn bộ 13 Use Cases (19 Màn hình) & Dây nối Prototype"**.
3. **Bước 3 – Trình chiếu Prototype (Present):**
   - Chuyển sang tab **`Prototype`** (góc trên bên phải của Figma) để quan sát toàn bộ hệ thống dây nối màu xanh giữa 19 màn hình.
   - Nhấn nút **`Present` (biểu tượng ▶)** để chạy thử nghiệm tương tác trực tiếp của cả 3 tác nhân.

---

## 3. Danh mục 20 Native Frames (19 Màn hình + 1 Design System)

| Mã Frame | Phân hệ Chức năng | FR tương ứng | UC tương ứng | Phụ trách | Nội dung Thiết kế Chi tiết |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `00_Design_System_Components` | Bảng Design System | Chung | Chung | Khoa | Bộ màu Radix Light chuẩn (1–12), Typography Be Vietnam Pro & STIX Two Text, Components gốc (Buttons, Status Badges, Course Tags) |
| `SCR_00_Home_Landing` | Landing Page Scrollytelling | R2 | Khám phá | Khoa | 5-Act Director's Cut (Aperture, Gravitational Convergence, Isometric Relats, Horizontal Track, Threshold Portal, Chapter Scrubber I-V) |
| `SCR_01_Auth_Login` | Xác thực người dùng | FR-01 | UC01 | Khoa | Đăng nhập Email/Mật khẩu, Google OAuth 2.0, Quên mật khẩu |
| `SCR_02_Auth_Register` | Đăng ký tài khoản | FR-01 | UC02 | Trâm | Đăng ký tài khoản Sinh viên SPTH, điều khoản quy chế, kiểm tra mật khẩu an toàn |
| `SCR_03_Notification_Dropdown` | Thông báo thời gian thực | FR-02 | UC03 | Trâm | Popover Chuông thông báo, Unread badge đỏ, các loại thông báo phê duyệt, từ chối, bình luận |
| `SCR_04_Report_Modal` | Báo cáo vi phạm | FR-11 | UC04 | Trâm | Modal Báo cáo tài liệu vi phạm bản quyền / nội dung không chính xác kèm mô tả |
| `SCR_05_Home_Discovery` | Kho học liệu (Workspace) | FR-03, FR-04 | UC05 | Vĩ | Không gian làm việc mở ngay đỉnh viewport: FTS Search bar, bộ lọc định dạng, cây danh mục 240px, thẻ tài liệu đa phương thức (.pdf/.docx/.pptx) |
| `SCR_06_Doc_Detail_Guest` | Xem trước Khách (Reader) | FR-05, FR-13 | UC06 | Vĩ | Đọc thử 3 trang đầu, Khóa mờ từ trang 4 kèm CTA Đăng nhập, chặn tải xuống vượt hạn mức |
| `SCR_07_Doc_Detail_Student` | Đọc toàn văn Sinh viên | FR-05, FR-10 | UC06, UC13 | Vĩ, Đạt | Bố cục 70/30 Reader: Toàn văn tài liệu, Tải xuống `.pdf`, Lưu Bookmark, Chấm 1–5 sao & Bình luận học thuật có tự xóa |
| `SCR_08_Upload_Document` | Tải lên học liệu | FR-06 | UC07 | Vĩ | Kéo thả tệp (.pdf, .docx, .pptx) $\le 25\text{MB}$ + Biểu mẫu Metadata chuẩn Sư phạm Tin học (CV 5512, Đề thi, Slide) |
| `SCR_09_Upload_Hash_Validation` | Kiểm thử 4 tầng bảo mật | FR-06 | UC08 | Danh | Quét nhị phân Magic Bytes (%PDF- / PK..), băm SHA-256 64 ký tự hex đối chiếu trùng lặp |
| `SCR_10_Admin_Moderation` | Thẩm định kiểm duyệt | FR-07 | UC09 | Danh | Hàng đợi PENDING chia đôi: Cột trái PDF Preview CV 5512, Cột phải Bảng kiểm 8 tiêu chí kiểm duyệt + Lý do từ chối |
| `SCR_11_Admin_Courses` | Quản lý danh mục CTĐT | FR-08 | UC10 | Danh | Quản lý khối kiến thức, học kỳ và học phần CTĐT (`COMP1015`, `COMP1044`, `COMP1022`,...) kèm chặn xóa cứng khi có tài liệu |
| `SCR_12_Student_MyDocs` | Tài liệu của tôi | FR-09 | UC11 | Đạt | Quản lý tài liệu đã tải lên với 3 trạng thái PENDING / APPROVED / REJECTED kèm lý do từ chối & nút tải lại |
| `SCR_13_Admin_Dashboard` | Bảng điều khiển quản trị | FR-13 | UC11 | Đạt | 4 thẻ KPI, biểu đồ cột Top 5 môn học tải nhiều nhất, biểu đồ đường xu hướng tải xuống tuần |
| `SCR_14_Student_Bookmarks` | Tủ tài liệu cá nhân | FR-09 | UC12 | Đạt | Danh sách học liệu đã lưu (Bookmarks) để tra cứu nhanh |
| `SCR_15_User_Profile` | Hồ sơ cá nhân & Bảo mật | FR-02 | UC03 | Vĩ | 5 Tab hồ sơ (Thông tin, Đổi mật khẩu, Tài liệu, Tủ lưu, Lịch sử tải), huy hiệu K50 SPTH, bảng kiểm 6 tiêu chuẩn mật khẩu |
| `SCR_16_Study_Bounty` | Sàn treo thưởng & BXH | FR-12 | FR-12 | Đạt | 2 cột: Cột trái Feed yêu cầu tìm tài liệu có thưởng điểm, Cột phải Bảng Vàng Top 10 Cống Hiến kèm huân chương Top 1–3 |
| `SCR_17_Admin_Users` | Quản lý Người dùng | FR-08 | UC10 | Khoa | Bảng danh bạ tài khoản sinh viên/admin, 4 thẻ KPI, tìm kiếm, nút Khóa / Mở khóa (`is_active`) kèm hộp thoại xác nhận |
| `SCR_18_Feedback_Modal` | Hòm thư góp ý hệ thống | FR-11 | UC04 | Trâm | Hộp thoại góp ý với 4 danh mục (Tính năng mới, Báo lỗi, Đề xuất học liệu, Khác), form nhập liệu và nút gửi |

---

## 4. Kiểm thử Tự động Headless (`test-runner.js`)

Plugin đi kèm bộ kiểm thử tự động toàn diện không cần mở Figma:
```bash
node tools/figma-5share-plugin/test-runner.js
```
Bộ kiểm thử xác thực:
- 100% Native Frames (20 frames: 19 màn hình + Design System)
- Khẳng định Auto Layout sizing modes (AUTO / FIXED)
- Khẳng định không có khoảng hở thừa (`itemSpacing === 0` trên các màn hình chính)
- Khẳng định hơn 170+ dây nối Prototype xanh (`setReactionsAsync`) trỏ đến `destinationId` hợp lệ
- Khẳng định 3 Flow Starting Points cho 3 Actor
- Khẳng định 9 trường hợp biên (Edge Cases) của module thẩm định tệp nhị phân và mã băm SHA-256.
