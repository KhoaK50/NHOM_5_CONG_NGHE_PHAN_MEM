# ĐẶC TẢ CHI TIẾT MÔ HÌNH THỰC THỂ KẾT HỢP (ERD) & TỪ ĐIỂN DỮ LIỆU (DATA DICTIONARY) – DỰ ÁN 5SHARE
*(Chuẩn tác phong Master Sheet Vectoria – Đồng bộ 100% với BFD Chương 1, 13 Use Case Chương 2 và 06 Kho dữ liệu DFD Chương 3)*

> **Tổng quan Kiến trúc Dữ liệu (Chuẩn 3NF – PostgreSQL):**
> Dựa trên toàn bộ 13 ca sử dụng (`UC01`–`UC13`), 13 yêu cầu chức năng (`G5-FR01`–`G5-FR13`) và 10 quy tắc nghiệp vụ (`BR01`–`BR10`), hệ thống **5Share** bao gồm:
> - **08 Bảng Thực thể Cốt lõi (Core Entities):** Đáp ứng trực tiếp các chức năng chính của người dùng.
> - **02 Bảng Thực thể Phát sinh (Emerging / Audit Entities):** Giải quyết triệt để bài toán lưu vết lịch sử kiểm duyệt nhiều lần (`UC09`, `UC11`) và thống kê biểu đồ lượt xem/tải theo thời gian thực trên Dashboard (`UC11`, `UC12`).
> - **Tổng cộng: 10 Bảng thực thể**, ánh xạ hoàn hảo vào **06 Kho dữ liệu (`D1`–`D6`)** trên sơ đồ DFD.

---

## PHẦN 1. BẢNG TỔNG HỢP PHÂN LOẠI THỰC THỂ (ENTITY CLASSIFICATION MATRIX)

| STT | Tên Thực thể (Vật lý / Logic) | Phân loại Thực thể (Lý thuyết ERD) | Kho DFD tương ứng | Các Use Case sử dụng | Lý do phân loại & Vai trò trong hệ thống |
| :-: | :--- | :--- | :-: | :--- | :--- |
| **01** | **`users`**<br>*(Người dùng)* | **Thực thể Mạnh**<br>*(Strong Entity)* | `D1` | `UC01`, `UC02`, `UC03`, `UC07`, `UC09`, `UC11`, `UC12`, `UC13` | Tồn tại hoàn toàn độc lập, có khóa chính riêng (`user_id`), không phụ thuộc sự tồn tại vào bất kỳ thực thể nào khác. Lưu trữ cả Sinh viên và Quản trị viên. |
| **02** | **`courses`**<br>*(Danh mục Môn học)* | **Thực thể Mạnh**<br>*(Strong Entity)* | `D2` | `UC05`, `UC07`, `UC10` | Thực thể danh mục nền tảng, tồn tại độc lập theo Khung Chương trình Đào tạo ngành Sư phạm Tin học (HCMUE). Có mã học phần riêng (`course_code`). |
| **03** | **`documents`**<br>*(Tài liệu Học tập)* | **Thực thể Mạnh Trung tâm**<br>*(Central Strong Entity)* | `D3` | `UC04` $\rightarrow$ `UC09`, `UC11` $\rightarrow$ `UC13` | Thực thể nghiệp vụ trung tâm của hệ thống, có định danh độc lập (`document_id`) và mã băm nội dung duy nhất (`file_hash` SHA-256). |
| **04** | **`bookmarks`**<br>*(Tủ tài liệu cá nhân)* | **Thực thể Kết hợp (Trung gian N–N)**<br>*(Associative Entity)* | `D4` | `UC11`, `UC12` | Sinh ra để phân rã mối quan hệ nhiều–nhiều ($N:M$) giữa `users` và `documents` khi sinh viên đánh dấu lưu tài liệu vào tủ cá nhân. |
| **05** | **`ratings`**<br>*(Đánh giá Điểm sao)* | **Thực thể Kết hợp có thuộc tính**<br>*(Attributed Associative Entity)* | `D5` | `UC13` | Phân rã mối quan hệ $N:M$ giữa `users` và `documents` trong hành vi chấm điểm chất lượng học liệu, mang thuộc tính điểm số `score (1..5)`. |
| **06** | **`comments`**<br>*(Bình luận Học thuật)* | **Thực thể Phụ thuộc & Tự tham chiếu**<br>*(Dependent & Recursive Entity)* | `D5` | `UC13` | Phụ thuộc ngữ cảnh vào `documents` (một người dùng có thể bình luận nhiều lần trên cùng 1 tài liệu) và có quan hệ tự tham chiếu (`parent_comment_id`) để trả lời bình luận. |
| **07** | **`reports`**<br>*(Báo cáo Vi phạm)* | **Thực thể Giao dịch / Kết hợp**<br>*(Transactional Associative Entity)* | `D6` | `UC04`, `UC09` | Ghi nhận giao dịch cảnh báo vi phạm giữa người báo cáo (`reporter_id`), tài liệu bị báo cáo (`document_id`) và quản trị viên xử lý (`resolved_by`). |
| **08** | **`notifications`**<br>*(Thông báo Hệ thống)* | **Thực thể Yếu / Phụ thuộc**<br>*(Weak / Dependent Entity)* | `D6` | `UC03`, `UC07`, `UC09`, `UC11`, `UC13` | Phụ thuộc hoàn toàn vào người nhận (`recipient_id` trong bảng `users`). Nếu tài khoản bị xóa thì thông báo của tài khoản đó cũng bị xóa theo (`CASCADE`). |
| **09** | **`moderation_logs`**<br>*(Nhật ký Kiểm duyệt)*<br>*(**Phát sinh 1**)* | **Thực thể Yếu (Lịch sử trạng thái)**<br>*(Weak / Audit History Entity)* | `D3` | `UC07`, `UC09`, `UC11` | **Bảng phát sinh bắt buộc cho vòng đời BPMN:** Lưu toàn bộ lịch sử các lần chuyển trạng thái (`PENDING` $\rightarrow$ `REJECTED` $\rightarrow$ `APPROVED` $\rightarrow$ `HIDDEN`) để không bị ghi đè mất lý do của các lần duyệt trước. |
| **10** | **`document_access_logs`**<br>*(Nhật ký Xem & Tải)*<br>*(**Phát sinh 2**)* | **Thực thể Nhật ký Sự kiện**<br>*(Event Log Entity)* | `D3` | `UC06`, `UC11`, `UC12` | **Bảng phát sinh cho Dashboard & Chống Spam:** Lưu từng lượt xem thử 3 trang, đọc toàn văn và tải xuống theo mốc thời gian (`accessed_at`) để vẽ biểu đồ thống kê theo tuần/tháng ở `UC11` và chống F5 tăng lượt xem ảo. |
