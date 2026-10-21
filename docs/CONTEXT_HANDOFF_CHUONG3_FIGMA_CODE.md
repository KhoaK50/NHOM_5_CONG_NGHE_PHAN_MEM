# BÀN GIAO NGỮ CẢNH DỰ ÁN 5SHARE (TỪ CHƯƠNG 1 & CHƯƠNG 2 SANG GIAI ĐOẠN THIẾT KẾ FIGMA & CODE)

## 1. Thông tin chung của Dự án
- **Tên đề tài:** Hệ thống Quản lý và Chia sẻ Tài liệu Học tập cho Sinh viên ngành Sư phạm Tin học (**5Share**) – Khoa CNTT, Trường ĐH Sư phạm TP.HCM (HCMUE).
- **Lớp học phần:** Nhập môn Công nghệ Phần mềm (`2611COMP104406`) – GVHD: ThS. Lê Thanh Thoại.
- **Nhóm thực hiện (Nhóm 5):**
  1. Nguyễn Trần Đăng Khoa (`50.01.103.033`) – Nhóm trưởng
  2. Nguyễn Hoàng Danh (`50.01.103.009`)
  3. Trần Đức Đạt (`50.01.103.010`)
  4. Lê Nguyễn Thùy Trâm (`50.01.103.076`)
  5. Phan Triệu Vĩ (`50.01.103.089`)
- **Tài liệu đã hoàn thành trong repo:**
  - Chương 1 (Lab 03): `docs/chuong1/`
  - Chương 2 (Lab 04): `docs/chuong2/` (gồm đầy đủ 13 bảng đặc tả Use Case chuẩn 9 trường, 2 Activity Diagram `AD1`/`AD2`, 1 BPMN 2.0 vòng đời tài liệu, Use Case tổng quan & phân rã).

---

## 2. Nền tảng Nghiệp vụ Cốt lõi (Bắt buộc đồng bộ 100% giữa Báo cáo, Figma và Code)

### 2.1. Ba Tác nhân (Actors)
1. **Khách vãng lai (Guest):** Chưa đăng nhập. Được xem danh mục, tìm kiếm/lọc tài liệu `APPROVED` (`UC05`), xem trước tối đa **3 trang đầu** của file PDF (`UC06`, khóa từ trang 4 kèm banner yêu cầu đăng nhập). Bấm *Tải về*, *Bookmark* hoặc *Upload* sẽ bật **Modal yêu cầu đăng nhập (`UC01`)**.
2. **Sinh viên (Student / `role = 'USER'`):** Kế thừa quyền của Guest; đọc toàn văn (`Full PDF Preview` - `UC06`), tải file `.pdf` gốc & lưu vào *Tủ tài liệu cá nhân (Bookmark)* (`UC12`), đóng góp học liệu mới (`UC07`), theo dõi tiến trình kiểm duyệt (`PENDING`/`APPROVED`/`REJECTED`) và lượt xem/tải trong mục *Tài liệu của tôi* (`UC11`), đánh giá 1–5 sao & bình luận học thuật (`UC13`), báo cáo tài liệu vi phạm (`UC04`), xem chuông thông báo (`UC03`).
3. **Quản trị viên (Admin / `role = 'ADMIN'`):** Dùng tài khoản cấp sẵn đăng nhập (`UC01`); thẩm định hàng đợi tài liệu `PENDING` theo **8 tiêu chí** để *Phê duyệt (`APPROVED`)* hoặc *Từ chối (`REJECTED` kèm lý do bắt buộc `reject_reason`)*, xử lý các báo cáo vi phạm (`HIDDEN`/`DELETED`) (`UC09`); quản lý danh mục môn học theo CTĐT (Thêm/Sửa/Ẩn, chặn xóa cứng môn đang có tài liệu) (`UC10`); xem *Admin Dashboard* thống kê lượt xem, lượt tải, tỷ lệ tài liệu theo môn học (`UC11` / `G5-FR12`).

### 2.2. Danh sách 13 Use Case (`UC01` – `UC13`) & Ánh xạ 13 FR (`G5-FR01` – `G5-FR13`)
| Mã UC | Tên Use Case | Mã FR | Thành viên phụ trách | Màn hình / Thành phần UI tương ứng |
| :---: | :--- | :---: | :---: | :--- |
| **UC01** | Đăng nhập hệ thống | `G5-FR03` | Khoa | Modal / Trang Đăng nhập (Email + Mật khẩu, Quên mật khẩu, Google OAuth) |
| **UC02** | Đăng ký tài khoản | `G5-FR03` | Trâm | Modal / Trang Đăng ký tài khoản sinh viên |
| **UC03** | Xem thông báo hệ thống | `G5-FR11` | Trâm | Dropdown Chuông thông báo trên Header (Unread badge đỏ, Đánh dấu đã đọc) |
| **UC04** | Báo cáo tài liệu vi phạm | `G5-FR10` | Trâm | Modal Báo cáo vi phạm (Chọn nhóm lý do + Mô tả chi tiết) |
| **UC05** | Tìm kiếm và lọc tài liệu | `G5-FR01` | Vĩ | Trang chủ & Khám phá học liệu (Thanh FTS + Bộ lọc Khối kiến thức, Học kỳ, Môn học, Loại tài liệu + Phân trang 12 thẻ/trang) |
| **UC06** | Xem trước tài liệu (Preview) | `G5-FR02`, `G5-FR03` | Vĩ | Trang Chi tiết tài liệu & Khung đọc PDF trực tuyến (Chế độ Guest khóa từ trang 4 vs. Chế độ Sinh viên đọc toàn văn) |
| **UC07** | Đóng góp tài liệu | `G5-FR05`, `G5-FR06` | Vĩ | Trang / Modal Đóng góp học liệu (Kéo thả `.pdf` <= 25MB + Điền Metadata: Tiêu đề, Môn học, Loại học liệu CV 5512/Đề thi/Slide, Mô tả) |
| **UC08** | Kiểm tra tài liệu trùng lặp | `G5-FR13` | Danh | Trạng thái kiểm tra kỹ thuật (`Magic Bytes %PDF-`, băm `SHA-256` đối chiếu `documents.file_hash`) & Cảnh báo trùng tệp trên màn hình Upload |
| **UC09** | Kiểm duyệt tài liệu | `G5-FR07`, `G5-FR10` | Danh | Trang Admin Kiểm duyệt (Tab Hàng đợi `PENDING` với checklist 8 tiêu chí + Modal nhập lý do từ chối + Tab Xử lý báo cáo vi phạm) |
| **UC10** | Quản lý danh mục môn học | `G5-FR08` | Danh | Trang Admin Quản lý môn học (Bảng danh mục Mã HP, Tên môn, Tín chỉ, Khối kiến thức, Học kỳ + Modal Thêm/Sửa + Nút Tạm ẩn/Kích hoạt) |
| **UC11** | Theo dõi trạng thái & Thống kê | `G5-FR06`, `G5-FR12` | Đạt | (1) Trang Cá nhân Sinh viên: *Tài liệu của tôi* (Tab `PENDING`/`APPROVED`/`REJECTED` kèm lý do từ chối & lượt xem/tải); (2) Trang *Admin Dashboard* (Biểu đồ thống kê theo Tuần/Tháng/Toàn thời gian) |
| **UC12** | Tải tài liệu & Lưu Bookmark | `G5-FR04` | Đạt | Nút Tải xuống `.pdf` (tăng `download_count`) & Nút Lưu vào Tủ cá nhân (`Bookmark` + Tab *Tủ tài liệu đã lưu*) |
| **UC13** | Đánh giá và bình luận | `G5-FR09` | Đạt | Khu vực Chấm điểm 1–5 sao (tính `AVG(rating)`) & Khung Bình luận học thuật dưới Trang Chi tiết tài liệu |

---

## 3. Yêu cầu Kỹ thuật Đặc biệt về Quy trình Figma & Code
1. **Vấn đề thực tế cần giải quyết:**
   - Giảng viên kiểm tra rất gắt việc các nhóm "code trước rồi chụp ảnh màn hình dán lên Figma giả làm thiết kế", và bắt buộc trên Figma **phải có đầy đủ Prototype (dây nối tương tác)** giữa các màn hình.
   - Các thành viên trong nhóm không rành kỹ thuật cài đặt MCP phức tạp, nên mọi thứ cần được thiết lập tự động, gọn nhẹ do Nhóm trưởng (Khoa) điều phối.
2. **Giải pháp Kiến trúc cần triển khai trong Workspace này:**
   - **Bước 1 – Xây dựng một Figma Plugin nội bộ (`tools/figma-5share-plugin/`) sử dụng Figma Plugin API:**
     - Tạo trực tiếp **100% Native Figma Nodes** (`FrameNode`, `AutoLayout`, `TextNode`, `ComponentNode`, `RectangleNode`, `VectorNode`) cho hệ thống Design System và toàn bộ **11–13 màn hình chuẩn của 5Share** (tuyệt đối không dùng ảnh chụp màn hình).
     - Sử dụng hàm **`await node.setReactionsAsync(...)`** của Figma Plugin API để **tự động nối toàn bộ dây Prototype xanh (`ON_CLICK` $\rightarrow$ `NAVIGATE` / `OVERLAY` / `SWAP`, hiệu ứng `SMART_ANIMATE`)** giữa tất cả các nút bấm và các màn hình trên Figma.
   - **Bước 2 – Đồng bộ 100% với Code Web (Frontend React + Tailwind CSS & Backend Node/Express/PostgreSQL):**
     - Đảm bảo giao diện trên code Web và bộ Frame trên Figma khớp nhau 100% về bố cục, màu sắc, nội dung dữ liệu mẫu (Kế hoạch bài dạy Công văn 5512, Đề thi Mạng máy tính `COMP1015`, Slide PTCT môn Tin học...) và luồng tương tác của 13 Use Case.
