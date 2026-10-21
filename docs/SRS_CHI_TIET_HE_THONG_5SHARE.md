# TÀI LIỆU ĐẶC TẢ YÊU CẦU HỆ THỐNG (SRS) CHI TIẾT
## DỰ ÁN: 5SHARE - HỆ THỐNG QUẢN LÝ VÀ CHIA SẺ TÀI LIỆU HỌC TẬP CHO SINH VIÊN NGÀNH SƯ PHẠM TIN HỌC (HCMUE)

* **Môn học:** Công nghệ Phần mềm (Software Engineering)
* **Phiên bản:** 2.1 (Đồng bộ chuẩn hóa 100% với Google Sheet tab "Thống nhất")
* **Đơn vị:** Khoa Công nghệ Thông tin - Trường Đại học Sư phạm TP.HCM
* **Nhóm thực hiện:** Nhóm 5
  * **Khoa (Leader):** FR-01 + Kiến trúc tổng quan
  * **Trâm:** FR-02, FR-09, FR-11
  * **Danh:** FR-03, FR-07, FR-08
  * **Vĩ:** FR-04, FR-05, FR-06
  * **Đạt:** FR-10, FR-12, FR-13
* **Mục đích tài liệu:** Quy định chuẩn xác toàn bộ 13 yêu cầu chức năng, yêu cầu phi chức năng, kiến trúc an ninh bảo mật và ràng buộc hạ tầng Cloud miễn phí. Đảm bảo tính nhất quán (Traceability) giữa tài liệu, sơ đồ UML, mã nguồn và kịch bản kiểm thử (Test Cases).

---

## MỤC LỤC
1. Bối cảnh Hệ thống & Triết lý Thiết kế
2. Ràng buộc Hạ tầng & Kiến trúc Phần cứng (Free Cloud Limits)
3. Quy tắc An ninh Thông tin & Cơ chế Xử lý Tệp Đa tầng (4 Tầng Defense-in-Depth)
4. Bảng Ma trận 13 Yêu cầu Chức năng Chuẩn hóa (Khớp 100% Google Sheet)
5. Đặc tả Chi tiết Toàn bộ 13 Yêu cầu Chức năng (Functional Specifications)
6. Mô hình Dữ liệu Chuẩn hóa (ERD 9 Entities)
7. System Prompt Mẫu Dành Cho AI Assistants của Thành viên

---

## 1. BỐI CẢNH HỆ THỐNG & TRIẾT LÝ THIẾT KẾ

### 1.1. Bản chất Môn học Công nghệ Phần mềm
* Đồ án môn học Công nghệ Phần mềm đặt trọng tâm hàng đầu vào **Quy trình Phát triển Phần mềm (SDLC)**, **Tính truy vết (Traceability)** từ Tài liệu $\rightarrow$ Phân tích $\rightarrow$ Thiết kế $\rightarrow$ Mã nguồn $\rightarrow$ Kiểm thử.
* Tuyệt đối tránh xa "bệnh vẽ tính năng thương mại viển vông" (A.I. Slop) làm vượt quá năng lực hạ tầng miễn phí hoặc vượt quá giới hạn thời gian học kỳ.
* Tiêu chí cốt lõi: Hệ thống vận hành mượt mà, ổn định trên hạ tầng Cloud sinh viên miễn phí, bảo mật thực tế, mã nguồn chuẩn mực và có đầy đủ kịch bản kiểm thử (Test Cases).

### 1.2. Đối tượng Phục vụ & Bài toán Thực tế
* **Đối tượng phục vụ:** Giảng viên và Sinh viên ngành Sư phạm Tin học - ĐH Sư phạm TP.HCM (HCMUE).
* **Bài toán thực tế:** Tài liệu học tập (đề thi, giáo án mẫu, bài giảng điện tử, đồ án mẫu) bị phân tán rời rạc trên Zalo, Facebook, Google Drive cá nhân, thường xuyên bị trôi link, không có bộ lọc chuyên ngành SPTH và không ai kiểm soát chất lượng học thuật.
* **Giá trị cốt lõi của 5share:**
  1. Danh mục học thuật chuẩn hóa bám sát khung chương trình đào tạo Sư phạm Tin học.
  2. Hàng đợi kiểm duyệt học thuật (Admin Moderation) ngăn chặn tài liệu rác và đề thi sai lệch.
  3. Trình xem trước tài liệu trực tuyến an toàn (PDF.js + Google Docs Viewer Iframe) không tốn RAM máy chủ.
  4. Cơ chế điểm thưởng đóng góp, bảng xếp hạng (Gamification) và treo thưởng tài liệu (Study Bounty) kích thích tinh thần chia sẻ vì cộng đồng.

---

## 2. RÀNG BUỘC HẠ TẦNG & KIẾN TRÚC PHẦN CỨNG (FREE CLOUD LIMITS)

Toàn bộ hệ thống được thiết kế để vận hành 24/7 ổn định trên các nền tảng đám mây miễn phí:

| Thành phần | Nền tảng triển khai | Giới hạn phần cứng | Chiến lược kỹ thuật bắt buộc |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | Băng thông miễn phí | Ứng dụng Single Page Application (React + Vite), Tailwind CSS, Lucide Icons. Client-side caching. |
| **Backend API**| **Render Web Service**| RAM tối đa 512 MB, CPU chia sẻ, tự ngủ sau 15p | - Node.js Express REST API.<br/>- Ping định kỳ `/api/health` để giữ ấm server.<br/>- **CẤM** cài đặt Elasticsearch hoặc ClamAV (tránh lỗi tràn RAM OOM làm sập container).<br/>- Không duy trì kết nối WebSocket thường trực; dùng In-app notification lưu CSDL. |
| **Database** | **PostgreSQL (Supabase / Neon)** | 500 MB Storage, tối đa 60 kết nối đồng thời | - Sử dụng **PostgreSQL Full-Text Search (FTS)** + `unaccent` để tìm kiếm tiếng Việt.<br/>- Kết nối qua Connection Pool (tối đa 10 connections từ backend). |
| **Storage** | **Cloudinary** | 25 Credits miễn phí (~25GB lưu trữ/băng thông) | - Chỉ lưu trữ 3 định dạng: `.pdf`, `.docx`, `.pptx`.<br/>- Giới hạn kích thước file tải lên: $\le 25\text{MB}$.<br/>- Không cấp quota lưu trữ riêng tư kiểu Google Drive để chống cạn kiệt credits. |

---

## 3. QUY TẮC AN NINH THÔNG TIN & CƠ CHẾ XỬ LÝ TỆP ĐA TẦNG

Thay vì cài đặt phần mềm diệt virus nặng nề gây sập RAM 512MB của Render, 5share áp dụng mô hình **Phòng thủ Chiều sâu 4 Tầng (Defense-in-Depth)**:

```
[Người dùng Upload File]
         │
         ▼
┌────────────────────────────────────────────────────────┐
│ TẦNG 1: Danh sách Trắng & Giới hạn (Whitelist & Limit) │
│ - Chỉ chấp nhận đuôi mở rộng: .pdf, .docx, .pptx       │
│ - Chặn 100%: .exe, .bat, .sh, .zip, .rar, .doc, .ppt   │
│ - Dung lượng file: 100KB ≤ size ≤ 25MB                 │
└────────────────────────────────────────────────────────┘
         │ (Hợp lệ)
         ▼
┌────────────────────────────────────────────────────────┐
│ TẦNG 2: Xác thực Chữ ký Tệp Nhị phân (Magic Bytes)     │
│ - Đọc Header nhị phân (Buffer 8 bytes đầu) kiểm tra:   │
│   • PDF: bắt đầu bằng %PDF- (hex: 25 50 44 2D)         │
│   • DOCX/PPTX: bắt đầu bằng zip header PK.. (50 4B 03 04)│
│ - Ngăn chặn triệt để kỹ thuật đổi đuôi file mã độc.   │
└────────────────────────────────────────────────────────┘
         │ (Hợp lệ)
         ▼
┌────────────────────────────────────────────────────────┐
│ TẦNG 3: Băm mã Toàn vẹn & Chống Trùng lặp (SHA-256)   │
│ - Tính hash SHA-256 nội dung file bằng Node.js crypto  │
│ - So khớp sha256_hash trong PostgreSQL:                │
│   • Đã tồn tại -> Từ chối upload trùng lặp             │
│   • Chưa tồn tại -> Đẩy file lên Cloudinary an toàn    │
└────────────────────────────────────────────────────────┘
         │ (Upload Cloudinary thành công)
         ▼
┌────────────────────────────────────────────────────────┐
│ TẦNG 4: Kiểm duyệt & Đọc Cách ly (Sandbox Rendering)   │
│ - Trạng thái ban đầu = PENDING (Chờ Admin duyệt)       │
│ - Xem trước PDF qua thư viện PDF.js (chạy trong canvas)│
│ - Xem trước DOCX/PPTX nhúng Google Docs Viewer Iframe  │
│ - Trình duyệt người dùng cách ly hoàn toàn mã độc.     │
└────────────────────────────────────────────────────────┘
```

---

## 4. BẢNG MA TRẬN 13 YÊU CẦU CHỨC NĂNG CHUẨN HÓA

*(Đồng bộ 100% với Google Sheet tab "Thống nhất")*

| Mã FR | Tên chức năng | Đối tượng sử dụng | Đặc tả chi tiết theo Google Sheet | Độ ưu tiên | Người phụ trách | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **FR-01** | Xác thực người dùng & Quản lý phiên | Khách (Guest) | - Đăng ký bằng Email (hash bcrypt, gửi mail kích hoạt qua Nodemailer).<br/>- Đăng nhập tài khoản trường/cá nhân, hỗ trợ Google OAuth 2.0.<br/>- Cấp phát mã JWT (Access Token) quản lý phiên an toàn.<br/>- Luồng Quên mật khẩu: gửi link reset mật khẩu tạm thời qua email. | **Cao (P0)** | **Khoa** | Module Auth: `bcryptjs`, `jsonwebtoken`, `nodemailer`, `@react-oauth/google`. |
| **FR-02** | Quản lý hồ sơ cá nhân & Bảo mật | Sinh viên (User), Admin | - Xem và cập nhật thông tin cá nhân: Họ tên, ngày sinh, khóa học (K49, K50...), avatar.<br/>- Đổi mật khẩu tài khoản hiện tại (yêu cầu xác thực mật khẩu cũ).<br/>- Xem danh sách lịch sử đóng góp tài liệu và số điểm tích lũy hiện có.<br/>- **Tích hợp biểu tượng Chuông thông báo trên thanh Header:** hiển thị số lượng và danh sách thông báo chưa đọc (kết quả duyệt tài liệu, nhận điểm thưởng, phản hồi mới). | **Trung bình (P1)** | **Trâm** | Module Profile: Form validation, upload avatar qua Cloudinary. Bảng `notifications`. |
| **FR-03** | Cấu trúc Danh mục Học thuật Sư phạm Tin | Khách (Guest), Sinh viên (User), Admin | - Phân loại tài liệu theo Khối kiến thức: Đại cương, Cơ sở ngành, Chuyên ngành, Nghiệp vụ Sư phạm.<br/>- Phân loại theo Môn học SPTH (Phương pháp dạy học Tin, Lập trình Web, Kiến trúc máy tính...).<br/>- Phân loại theo Loại tài liệu: Đề thi/Đáp án, Giáo án mẫu, Slide bài giảng, Đồ án. | **Cao (P0)** | **Danh** | Bảng `categories`: cấu trúc danh mục 2 cấp (Group $\rightarrow$ Subject), ràng buộc khóa ngoại. |
| **FR-04** | Tra cứu & Bộ lọc tài liệu đa tiêu chí | Khách (Guest), Sinh viên (User) | - Tìm kiếm theo từ khóa (tiêu đề, mô tả, giảng viên).<br/>- Bộ lọc đa tiêu chí: Môn học, Khối kiến thức, Loại tài liệu, Định dạng (.pdf/.docx/.pptx), Độ phổ biến.<br/>- Gợi ý từ khóa tìm kiếm (Autocomplete). | **Cao (P0)** | **Vĩ** | **PostgreSQL Full-Text Search (FTS)** + `pg_trgm` + `unaccent`. |
| **FR-05** | Xem chi tiết & Xem trước trực tuyến (Preview) | Khách (Guest), Sinh viên (User) | - Hiển thị chi tiết metadata: tác giả, môn học, ngày đăng, lượt xem, lượt tải, đánh giá.<br/>- Trình đọc trực tuyến: file PDF render bằng **PDF.js**; file DOCX/PPTX nhúng qua **Google Docs Viewer Iframe**.<br/>- Cung cấp nút "Sao chép liên kết chia sẻ" (Copy Share Link). | **Cao (P0)** | **Vĩ** | Frontend: `react-pdf` / `pdfjs-dist` + Google Docs Viewer Iframe. Không ngốn RAM server. |
| **FR-06** | Đóng góp tài liệu học tập (Upload) | Sinh viên (User), Admin | - Tải lên file (.pdf, .docx, .pptx) dung lượng $\le$ 25MB.<br/>- Nhập metadata: Tiêu đề, Môn học (chọn từ danh mục), Mô tả, Thẻ tag.<br/>- Kiểm tra chữ ký file (Magic Bytes) và băm mã SHA-256 chống trùng.<br/>- Tài liệu sau upload tự động chuyển vào trạng thái `PENDING`. | **Cao (P0)** | **Vĩ** | `multer`, `file-type`, `crypto` (SHA-256), Cloudinary SDK. |
| **FR-07** | Hàng đợi kiểm duyệt tài liệu (Admin Moderation) | Quản trị viên (Admin) | - Xem danh sách toàn bộ tài liệu đang chờ duyệt (Pending Queue).<br/>- Xem trước nội dung file trực tiếp trên màn hình duyệt.<br/>- Thao tác **Phê duyệt (Approve)**: Chuyển trạng thái `APPROVED`, tài liệu xuất hiện trên kho chung, cộng +20 điểm cho tác giả.<br/>- Thao tác **Từ chối (Reject)**: Nhập lý do từ chối, gửi thông báo đến sinh viên. | **Cao (P0)** | **Danh** | Admin UI Queue, API duyệt tài liệu, trigger tạo bản ghi `notifications`. |
| **FR-08** | Quản trị Danh mục & Quản lý Người dùng | Quản trị viên (Admin) | - Thêm, sửa, xóa các danh mục Khối kiến thức, Môn học theo chương trình Sư phạm Tin.<br/>- Xem danh sách người dùng, tìm kiếm theo email/tên.<br/>- Khóa / Mở khóa tài khoản có hành vi vi phạm chuẩn mực học thuật. | **Cao (P0)** | **Danh** | Admin CRUD Controllers, RBAC Middleware (`role === 'admin'`). |
| **FR-09** | Kho tài liệu cá nhân (My Library) | Sinh viên (User) | - Đánh dấu tài liệu yêu thích (Bookmark / Lưu xem sau).<br/>- Tab "Tài liệu yêu thích": Xem danh sách và quản lý các tài liệu đã lưu.<br/>- Tab "Tài liệu của tôi": Quản lý danh sách tài liệu mình đã upload và trạng thái duyệt (Pending/Approved/Rejected). | **Trung bình (P1)** | **Trâm** | Bảng `bookmarks` (quan hệ N:N giữa Users và Documents). |
| **FR-10** | Đánh giá chất lượng & Bình luận trao đổi | Sinh viên (User) | - Đánh giá sao (1 đến 5 sao) cho tài liệu.<br/>- Viết nhận xét, bình luận trao đổi hỏi đáp học thuật dưới tài liệu.<br/>- Hiển thị điểm sao trung bình và số lượt đánh giá.<br/>- Cho phép tác giả hoặc người dùng xóa bình luận của chính mình. | **Trung bình (P1)** | **Đạt** | Bảng `ratings`, `comments`. Tính trung bình rating bằng SQL aggregate `AVG()`. |
| **FR-11** | Báo cáo vi phạm & Hòm thư góp ý | Sinh viên (User) $\rightarrow$ Admin | - Sinh viên gửi báo cáo tài liệu (chọn lý do: sai môn học, tài liệu rác, nội dung không phù hợp).<br/>- Người dùng gửi góp ý phản hồi về lỗi hệ thống.<br/>- Admin có màn hình tiếp nhận danh sách báo cáo, xem xét và xử lý (Xóa tài liệu / Bỏ qua). | **Trung bình (P1)** | **Trâm** | Module Reports & Feedback: Form modal ở client, bảng `reports` ở server. |
| **FR-12** | Điểm tích lũy & Treo thưởng tài liệu (Study Bounty) | Sinh viên (User) | - Cơ chế Gamification: Upload tài liệu được duyệt được cộng điểm thưởng (+20 điểm).<br/>- Tính năng "Treo thưởng tài liệu": Sinh viên đăng yêu cầu cần tài liệu/đề thi hiếm kèm số điểm thưởng trích từ ví.<br/>- Sinh viên khác upload đúng tài liệu giải thưởng sẽ nhận được số điểm đó.<br/>- **Hiển thị Bảng xếp hạng (Leaderboard) Top 10** thành viên đóng góp nhiều nhất trên Trang chủ để tạo động lực chia sẻ. | **Trung bình (P1)** | **Đạt** | Bảng `bounties`, xử lý cộng/trừ điểm nguyên tử (Atomic Database Transaction). |
| **FR-13** | Quản lý luồng tải xuống & Bảng thống kê | Khách (Guest), Sinh viên (User), Admin | - Xử lý tải file gốc (.pdf, .docx, .pptx). Khách bị giới hạn 3 lượt tải/ngày; Sinh viên đăng nhập được tải tự do (hoặc trừ điểm nếu là tài liệu VIP).<br/>- Thống kê Dashboard cho Admin: Biểu đồ tổng số tài liệu, lượt tải, lượt xem, top môn học được quan tâm nhất. | **Cao (P0)** | **Đạt** | Analytics Dashboard (thư viện `recharts` ở React), logic giới hạn lượt tải (Rate Limiter). |

---

## 5. ĐẶC TẢ CHI TIẾT TOÀN BỘ 13 YÊU CẦU CHỨC NĂNG

### FR-01: Xác thực người dùng & Quản lý phiên (Khoa)
* **Tác nhân:** Khách (Guest) $\rightarrow$ Cấp quyền Sinh viên (User) hoặc Admin.
* **Điều kiện tiên quyết:** Khách truy cập vào hệ thống 5share.
* **Luồng chính Đăng ký:**
  1. Người dùng nhập Email, Mật khẩu (tối thiểu 8 ký tự), Họ tên.
  2. Backend kiểm tra tính hợp lệ email và kiểm tra trùng lặp trong CSDL.
  3. Mật khẩu được băm bằng `bcrypt` (`saltRounds = 10`).
  4. Backend lưu thông tin vào bảng `users` với `is_active = false`, sinh token và gửi email kích hoạt qua Nodemailer.
  5. Người dùng click link xác thực $\rightarrow$ tài khoản chuyển sang `is_active = true`.
* **Luồng chính Đăng nhập:**
  1. Người dùng nhập Email/Mật khẩu hoặc chọn "Đăng nhập Google" (OAuth 2.0).
  2. Backend xác thực thông tin, nếu hợp lệ sẽ cấp mã JWT (hạn 24 giờ): `{ userId, email, role }`.
  3. Client lưu token vào LocalStorage/Cookie an toàn và tự động đính kèm header `Authorization: Bearer <token>` ở các request sau.
* **Luồng Quên mật khẩu:**
  1. Người dùng gửi yêu cầu với email đăng ký.
  2. Backend sinh mã reset token (hạn 15 phút), gửi đường dẫn đặt lại mật khẩu qua email.

---

### FR-02: Quản lý hồ sơ cá nhân & Bảo mật (Trâm)
* **Tác nhân:** Sinh viên (User), Quản trị viên (Admin).
* **Điều kiện tiên quyết:** Người dùng đã đăng nhập.
* **Luồng nghiệp vụ:**
  1. **Xem & Sửa thông tin:** Người dùng truy cập trang `/profile` để xem thông tin, chỉnh sửa họ tên, khóa học, tải lên ảnh đại diện (avatar) qua Cloudinary.
  2. **Đổi mật khẩu:** Nhập mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu mới. Backend so khớp `bcrypt.compare`, nếu đúng thì mã hóa mật khẩu mới và lưu vào CSDL.
  3. **Chuông thông báo (Notification Center):**
     * Biểu tượng hình chuông trên thanh Header hiển thị badge số lượng thông báo chưa đọc.
     * Khi click vào chuông: Gọi API `GET /api/notifications` hiển thị popover danh sách thông báo (Duyệt tài liệu, Được tặng điểm thưởng, Báo cáo vi phạm). Click vào thông báo sẽ đánh dấu `is_read = true` và điều hướng đến nội dung liên quan.

---

### FR-03: Cấu trúc Danh mục Học thuật Sư phạm Tin (Danh)
* **Tác nhân:** Khách (Guest), Sinh viên (User), Admin.
* **Luồng phân cấp 2 tầng:**
  * **Cấp 1 - Nhóm kiến thức (`group_name`):** Đại cương, Cơ sở ngành, Chuyên ngành, Nghiệp vụ Sư phạm.
  * **Cấp 2 - Môn học SPTH (`name`):** Phương pháp dạy học Tin học, Lập trình Web, Kiến trúc máy tính, Cơ sở dữ liệu...
  * **Loại tài liệu (`document_type`):** Đề thi & Đáp án, Giáo án mẫu, Slide bài giảng, Đồ án/Khóa luận.
* Người dùng có thể duyệt cây danh mục để lọc nhanh tài liệu theo kỳ học và khối kiến thức.

---

### FR-04: Tra cứu & Bộ lọc tài liệu đa tiêu chí (Vĩ)
* **Tác nhân:** Khách (Guest), Sinh viên (User).
* **Luồng tìm kiếm PostgreSQL Full-Text Search:**
  1. Người dùng nhập từ khóa vào ô tìm kiếm (hỗ trợ gõ tiếng Việt không dấu hoặc có dấu).
  2. Backend thực thi câu lệnh SQL FTS kết hợp hàm `unaccent`:
     ```sql
     SELECT id, title, description, file_url, format, download_count, view_count
     FROM documents
     WHERE status = 'APPROVED'
       AND (to_tsvector('simple', unaccent(title || ' ' || coalesce(description, ''))) @@ to_tsquery('simple', unaccent($1)))
       AND ($2::int IS NULL OR category_id = $2)
       AND ($3::text IS NULL OR format = $3)
     ORDER BY download_count DESC
     LIMIT 12 OFFSET $4;
     ```
  3. Trả về kết quả phân trang (Pagination: 12 tài liệu/trang) kèm bộ đếm tổng số kết quả.

---

### FR-05: Xem chi tiết & Xem trước trực tuyến (Vĩ)
* **Tác nhân:** Khách (Guest), Sinh viên (User).
* **Luồng hiển thị Sandbox an toàn:**
  1. Người dùng chọn tài liệu $\rightarrow$ Gọi API `GET /api/documents/:id`.
  2. Hệ thống tăng tự động `view_count` trong CSDL.
  3. Kiểm tra định dạng `format`:
     * **File PDF:** Hiển thị qua thư viện `react-pdf` (Mozilla PDF.js). Hỗ trợ nút phóng to/thu nhỏ, nhảy trang, xoay trang.
     * **File DOCX / PPTX:** Nhúng thẻ Iframe thông qua Google Docs Viewer:
       ```html
       <iframe src="https://docs.google.com/viewer?url={encodeURIComponent(file_url)}&embedded=true" class="w-full h-[650px] border-0 rounded-lg"></iframe>
       ```
  4. Hiển thị thông tin người đăng, môn học, ngày đăng, nút sao chép link chia sẻ, nút tải xuống và khu vực đánh giá/bình luận.

---

### FR-06: Đóng góp tài liệu học tập (Upload) (Vĩ)
* **Tác nhân:** Sinh viên (User đã đăng nhập).
* **Luồng kiểm tra 4 tầng an ninh:**
  1. Sinh viên điền Form (Tiêu đề, Chọn môn học, Mô tả, Thẻ tag, Chọn file).
  2. Client validate: Đuôi file thuộc `['.pdf', '.docx', '.pptx']`, dung lượng $\le 25\text{MB}$.
  3. Gửi Multipart Request lên API `POST /api/documents`.
  4. Backend đọc 8 bytes đầu của buffer để kiểm tra Magic Bytes nhị phân (`file-type`).
  5. Tính toán băm `sha256 = crypto.createHash('sha256').update(buffer).digest('hex')`.
  6. Kiểm tra `SELECT id FROM documents WHERE sha256_hash = $1`. Nếu trùng $\rightarrow$ Báo lỗi tệp đã tồn tại.
  7. Đẩy file lên Cloudinary, lưu bản ghi vào CSDL với `status = 'PENDING'`. Thông báo: *"Tài liệu đã được gửi và đang chờ Admin phê duyệt."*

---

### FR-07: Hàng đợi kiểm duyệt tài liệu (Danh)
* **Tác nhân:** Quản trị viên (Admin).
* **Luồng xử lý duyệt:**
  1. Admin truy cập `/admin/moderation` xem danh sách tài liệu `status = 'PENDING'`.
  2. Bấm xem trước toàn văn nội dung tệp trực tiếp trong sandbox viewer.
  3. **Nếu Phê duyệt (Approve):**
     * Chuyển `status = 'APPROVED'`.
     * Tự động cộng **+20 điểm thưởng** vào tài khoản của tác giả upload.
     * Tạo thông báo gửi đến chuông thông báo của sinh viên: *"Tài liệu [Tên tài liệu] của bạn đã được phê duyệt! Bạn nhận được +20 điểm thưởng."*
  4. **Nếu Từ chối (Reject):**
     * Admin nhập lý do từ chối (vd: file mờ, sai môn học, tài liệu trùng lặp).
     * Chuyển `status = 'REJECTED'`, lưu lý do vào `reject_reason`.
     * Tạo thông báo gửi đến sinh viên kèm lý do từ chối cụ thể.

---

### FR-08: Quản trị Danh mục & Quản lý Người dùng (Danh)
* **Tác nhân:** Quản trị viên (Admin).
* **Luồng chức năng:**
  1. **Quản lý Danh mục:** Admin thực hiện Thêm/Sửa/Xóa Khối kiến thức và Môn học. Ràng buộc không cho xóa môn học nếu đang có tài liệu liên kết.
  2. **Quản trị Người dùng:** Xem danh sách toàn bộ người dùng, tìm kiếm theo tên hoặc email. Có chức năng **Khóa tài khoản (Deactivate)** đối với người dùng spam hoặc tải lên nội dung phản cảm, và **Mở khóa tài khoản**.

---

### FR-09: Kho tài liệu cá nhân (My Library) (Trâm)
* **Tác nhân:** Sinh viên (User đã đăng nhập).
* **Luồng chức năng:**
  1. **Tài liệu yêu thích (Bookmarks):** Sinh viên bấm nút "Lưu yêu thích" tại trang chi tiết tài liệu. Hệ thống lưu bản ghi vào bảng `bookmarks`. Tại tab "Yêu thích", sinh viên có thể xem nhanh danh sách và xóa bookmark.
  2. **Tài liệu đã đóng góp:** Tab "Tài liệu của tôi" hiển thị danh sách toàn bộ tài liệu người dùng đã tải lên kèm trạng thái chi tiết (`PENDING`, `APPROVED`, `REJECTED`). Nếu bị từ chối, hiển thị rõ lý do do Admin ghi chú để sinh viên chỉnh sửa và nộp lại.

---

### FR-10: Đánh giá chất lượng & Bình luận trao đổi (Đạt)
* **Tác nhân:** Sinh viên (User đã đăng nhập).
* **Luồng đánh giá & Bình luận:**
  1. **Đánh giá sao:** Sinh viên chọn từ 1 đến 5 sao cho tài liệu. Hệ thống lưu vào bảng `ratings` (mỗi sinh viên chỉ đánh giá 1 lần/tài liệu, cho phép sửa số sao). Hệ thống tự động tính điểm sao trung bình bằng `AVG(stars)`.
  2. **Bình luận học thuật:** Sinh viên gửi nhận xét, đặt câu hỏi dưới tài liệu. Nội dung bình luận hiển thị theo dòng thời gian mới nhất.
  3. **Xóa bình luận:** Tác giả của bình luận có quyền tự xóa bình luận của chính mình (`DELETE /api/comments/:id` kiểm tra quyền sở hữu `user_id === current_user.id`).

---

### FR-11: Báo cáo vi phạm & Hòm thư góp ý (Trâm)
* **Tác nhân:** Sinh viên (User) $\rightarrow$ Tiếp nhận: Quản trị viên (Admin).
* **Luồng nghiệp vụ:**
  1. **Báo cáo tài liệu:** Khi phát hiện tài liệu có vấn đề (sai môn, scan quá mờ, vi phạm bản quyền), người dùng bấm nút "Báo cáo" $\rightarrow$ Chọn lý do và nhập mô tả chi tiết $\rightarrow$ Gửi lên hệ thống (lưu bảng `reports` với `status = 'PENDING'`).
  2. **Hòm thư góp ý:** Biểu mẫu gửi ý kiến đóng góp hoàn thiện hệ thống 5share.
  3. **Xử lý của Admin:** Admin vào mục `/admin/reports` xem danh sách báo cáo, xem tài liệu bị báo cáo và chọn hành động: "Ẩn/Xóa tài liệu" hoặc "Bác bỏ báo cáo".

---

### FR-12: Điểm tích lũy & Treo thưởng tài liệu (Study Bounty) (Đạt)
* **Tác nhân:** Sinh viên (User).
* **Cơ chế Gamification:**
  * Đăng ký tài khoản thành công: +50 điểm khởi đầu.
  * Tải lên tài liệu được Admin duyệt: +20 điểm/tài liệu.
* **Tính năng Treo thưởng tài liệu (Study Bounty):**
  1. Sinh viên có nhu cầu tìm đề thi hiếm/giáo án khó bấm "Tạo yêu cầu tài liệu", nhập tiêu đề, môn học và số điểm thưởng muốn treo (ví dụ: 50 điểm).
  2. Backend kiểm tra `user.points >= reward_points`, trừ điểm tạm giữ và lưu vào bảng `bounties` (`status = 'OPEN'`).
  3. Danh sách yêu cầu hiển thị tại "Bounty Board". Thành viên khác có tài liệu sẽ bấm "Nộp tài liệu cho yêu cầu này".
  4. Sau khi tài liệu được Admin duyệt hợp lệ $\rightarrow$ Điểm thưởng tự động chuyển sang tài khoản người đóng góp, trạng thái chuyển sang `FULFILLED`.
* **Bảng xếp hạng (Leaderboard):**
  * Hiển thị Top 10 sinh viên có điểm tích lũy đóng góp cao nhất trên Trang chủ để vinh danh và thúc đẩy phong trào chia sẻ.

---

### FR-13: Quản lý luồng tải xuống & Bảng thống kê (Đạt)
* **Tác nhân:** Khách (Guest), Sinh viên (User), Quản trị viên (Admin).
* **Luồng tải xuống an toàn:**
  1. **Khách vãng lai (Guest):** Giới hạn tối đa **3 lượt tải/ngày** dựa trên lưu IP Client / Browser Fingerprint. Hết lượt tải, hệ thống yêu cầu đăng nhập tài khoản sinh viên.
  2. **Sinh viên đã đăng nhập:** Được tải tự do không giới hạn các tài liệu học tập thông thường.
  3. Khi bấm tải xuống, hệ thống tăng biến đếm `download_count` và gọi Cloudinary trả về file stream đính kèm header `Content-Disposition: attachment; filename="..."`.
* **Dashboard Thống kê cho Quản trị viên:**
  * Admin truy cập `/admin/dashboard` xem báo cáo trực quan dựng bằng thư viện `recharts`:
    * Card tổng số tài liệu, tổng lượt xem, tổng lượt tải, tổng người dùng.
    * Biểu đồ cột: Top môn học có số lượng tài liệu đóng góp nhiều nhất.
    * Biểu đồ đường: Xu hướng lượt tải theo từng tuần trong học kỳ.

---

## 6. MÔ HÌNH DỮ LIỆU CHUẨN HÓA (ERD 9 ENTITIES)

Toàn bộ CSDL PostgreSQL được chuẩn hóa gồm **9 bảng quan hệ chặt chẽ**:

```
┌──────────────────┐       ┌──────────────────────┐       ┌──────────────────┐
│      users       │       │      documents       │       │    categories    │
├──────────────────┤       ├──────────────────────┤       ├──────────────────┤
│ id (UUID, PK)    │1─────n│ id (UUID, PK)        │n─────1│ id (INT, PK)     │
│ email (VARCHAR)  │       │ title (VARCHAR)      │       │ name (VARCHAR)   │
│ password_hash    │       │ description (TEXT)   │       │ group_name (ENUM)│
│ full_name        │       │ file_url (VARCHAR)   │       │ semester (INT)   │
│ avatar_url       │       │ format (VARCHAR)     │       └──────────────────┘
│ role (USER/ADMIN)│       │ file_size (INT)      │
│ points (INT)     │       │ sha256_hash (VARCHAR)│
│ is_active (BOOL) │       │ status (ENUM)        │
│ created_at       │       │ reject_reason (TEXT) │
└──────────────────┘       │ download_count (INT) │
         │1                │ view_count (INT)     │
         │                 │ uploader_id (FK)     │
         │                 │ category_id (FK)     │
         │                 │ created_at           │
         │                 └──────────────────────┘
         │                            │1
         │n                           │n
┌────────┴─────────┐       ┌──────────┴───────────┐       ┌──────────────────┐
│    bookmarks     │       │       comments       │       │     ratings      │
├──────────────────┤       ├──────────────────────┤       ├──────────────────┤
│ id (UUID, PK)    │       │ id (UUID, PK)        │       │ id (UUID, PK)    │
│ user_id (FK)     │       │ user_id (FK)         │       │ user_id (FK)     │
│ document_id (FK) │       │ document_id (FK)     │       │ document_id (FK) │
│ created_at       │       │ content (TEXT)       │       │ stars (1-5)      │
└──────────────────┘       │ created_at           │       │ created_at       │
                           └──────────────────────┘       └──────────────────┘
         │1
         │n
┌────────┴─────────┐       ┌──────────────────────┐       ┌──────────────────┐
│  notifications   │       │       bounties       │       │     reports      │
├──────────────────┤       ├──────────────────────┤       ├──────────────────┤
│ id (UUID, PK)    │       │ id (UUID, PK)        │       │ id (UUID, PK)    │
│ user_id (FK)     │       │ title (VARCHAR)      │       │ reporter_id (FK) │
│ title (VARCHAR)  │       │ description (TEXT)   │       │ document_id (FK) │
│ message (TEXT)   │       │ reward_points (INT)  │       │ reason (TEXT)    │
│ is_read (BOOL)   │       │ creator_id (FK)      │       │ status (ENUM)    │
│ link (VARCHAR)   │       │ fulfilled_doc_id(FK) │       │ created_at       │
│ created_at       │       │ status (OPEN/DONE)   │       └──────────────────┘
└──────────────────┘       │ created_at           │
                           └──────────────────────┘
```

---

## 7. SYSTEM PROMPT MẪU DÀNH CHO AI ASSISTANTS CỦA THÀNH VIÊN

> **Hướng dẫn cho các bạn thành viên (Khoa, Vĩ, Danh, Đạt, Trâm):**  
> Khi nhờ các công cụ AI (ChatGPT, Claude, Cursor, Antigravity) hỗ trợ viết code hoặc vẽ sơ đồ UML, các bạn hãy sao chép (copy) đoạn văn bản bên dưới và dán vào đầu đoạn chat để AI hiểu rõ ngữ cảnh dự án và không viết ra những tính năng sai kiến trúc!

```markdown
Bạn là Trợ lý Lập trình AI hỗ trợ phát triển dự án "5share - Hệ thống Quản lý và Chia sẻ Tài liệu Học tập cho Sinh viên ngành Sư phạm Tin học (HCMUE)".

ĐÂY LÀ ĐỒ ÁN MÔN CÔNG NGHỆ PHẦN MỀM. BẠN PHẢI TUÂN THỦ NGHIÊM NGẶT CÁC QUY TẮC SAU:
1. Tech Stack Bắt buộc:
   - Frontend: React (Vite) + Tailwind CSS + Lucide Icons (Triển khai trên Vercel).
   - Backend: Node.js + Express REST API (Triển khai trên Render gói Free - 512MB RAM).
   - Database: PostgreSQL (Supabase/Neon).
   - Storage: Cloudinary (Chỉ lưu trữ file PDF, DOCX, PPTX).

2. Ràng buộc Hạ tầng Bắt buộc:
   - TUYỆT ĐỐI KHÔNG dùng Elasticsearch hay MongoDB. Luôn dùng tính năng Full-Text Search (FTS) có sẵn của PostgreSQL.
   - TUYỆT ĐỐI KHÔNG dùng ClamAV quét virus. Bảo mật file bằng: Whitelist định dạng (.pdf, .docx, .pptx) + Kiểm tra Magic Bytes nhị phân + Băm mã SHA-256 chống trùng lặp.
   - Trình xem trước tài liệu: File PDF dùng thư viện PDF.js; File DOCX và PPTX nhúng Iframe Google Docs Viewer.
   - KHÔNG dùng Socket.io ngốn RAM; hệ thống dùng In-app notification lưu trong database PostgreSQL.
   - KHÔNG làm tính năng Google Drive riêng tư cấp quota 1GB (tránh tràn 25 Credits Cloudinary).

3. Quy chuẩn Mã nguồn & Trách nhiệm:
   - Code phải phân tầng rõ ràng (Routes -> Controllers -> Services/Models).
   - Mọi truy vấn CSDL phải dùng Parameterized Query ($1, $2) để chống SQL Injection.
   - Luôn viết code an toàn, kèm try/catch và mã lỗi HTTP chuẩn mực (200, 201, 400, 401, 403, 404, 500).
```

---
*Tài liệu này được phê chuẩn chính thức bởi Trưởng nhóm Khoa và là căn cứ đặc tả duy nhất cho toàn bộ mã nguồn của Nhóm 5.*
