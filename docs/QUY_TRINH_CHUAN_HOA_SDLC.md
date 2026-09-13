# TÀI LIỆU QUY TRÌNH CHUẨN HÓA PHÁT TRIỂN PHẦN MỀM
## SOFTWARE DEVELOPMENT LIFE CYCLE (SDLC) SPECIFICATION
**Dự án:** Hệ thống Quản lý và Chia sẻ Tài liệu Học tập (5share)  
**Tiêu chuẩn tham chiếu:** ISO/IEC/IEEE 12207:2017 & ISO/IEC/IEEE 29148:2018  
**Phương pháp luận:** Agile/Scrum kết hợp Kiến trúc phân tầng (3-Tier Layered Architecture)

---

### MỤC LỤC
1. TỔNG QUAN VÀ NGUYÊN TẮC CỐT LÕI
2. KHUNG QUY TRÌNH TỔNG THỂ (LIFECYCLE ARCHITECTURE)
3. PHA 1: KỸ NGHỆ YÊU CẦU (REQUIREMENTS ENGINEERING)
4. PHA 2: THIẾT KẾ HỆ THỐNG VÀ DỮ LIỆU (SYSTEM & DATA DESIGN)
5. PHA 3: HIỆN THỰC HÓA VÀ XÂY DỰNG MÃ NGUỒN (CONSTRUCTION & IMPLEMENTATION)
6. PHA 4: KIỂM CHỨNG VÀ THẨM ĐỊNH (VERIFICATION & VALIDATION)
7. PHA 5: ĐÓNG GÓI, TRIỂN KHAI VÀ DEVOPS (DEPLOYMENT & RELEASE)
8. PHA 6: TỔNG KẾT VÀ BÀN GIAO KỸ THUẬT (REVIEW & HANDOVER)
9. MA TRẬN TRUY VẾT VÀ TIÊU CHUẨN NGHIỆM THU (TRACEABILITY & DEFINITION OF DONE)

---

## 1. TỔNG QUAN VÀ NGUYÊN TẮC CỐT LÕI

Tài liệu này quy định quy trình chuẩn hóa phát triển phần mềm áp dụng cho dự án 5share. Toàn bộ các hoạt động từ thu thập yêu cầu đến triển khai sản phẩm thực tế được xây dựng dựa trên nguyên tắc tách biệt mối quan tâm (Separation of Concerns - SoC), đảm bảo khả năng kiểm thử độc lập, tính toàn vẹn dữ liệu và khả năng truy vết hai chiều (Bidirectional Traceability).

### Các nguyên tắc kỹ thuật bắt buộc:
1. **Kiến trúc phân tầng nghiêm ngặt (Strict Layering):** Tầng Trình diễn (Presentation) không được phép truy cập trực tiếp Tầng Dữ liệu (Data Layer); mọi giao tiếp phải đi qua Tầng Nghiệp vụ (Business Logic).
2. **Hợp đồng giao tiếp bất biến (Immutable API Contract):** Giao diện lập trình ứng dụng (REST API) phải được định nghĩa chuẩn xác trước khi triển khai đồng thời ở hai phía Client và Server.
3. **Quản lý cấu hình tập trung (Configuration Management):** Kiểm soát toàn bộ mã nguồn, sơ đồ thiết kế và tài liệu thông qua hệ thống kiểm soát phiên bản (VCS), thực thi bảo vệ nhánh chính và bình duyệt mã nguồn (Code Review).
4. **An toàn ngay từ thiết kế (Security by Design):** Kiểm tra tính hợp lệ dữ liệu tại cả hai đầu Client/Server, kiểm tra kiểu tệp nhị phân nghiêm ngặt và mã hóa dữ liệu nhạy cảm theo tiêu chuẩn công nghiệp.

---

## 2. KHUNG QUY TRÌNH TỔNG THỂ

Quy trình phát triển tuân thủ mô hình lặp và tăng dần (Iterative and Incremental), phân định thành 6 pha tuần tự logic:

```
┌──────────────────────────────┐
│ 1. KỸ NGHỆ YÊU CẦU           │ -> Đầu ra: Tài liệu SRS (FR / NFR)
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ 2. THIẾT KẾ HỆ THỐNG & DỮ LIỆU│ -> Đầu ra: Sơ đồ UML, ERD 3NF, API Spec
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ 3. HIỆN THỰC HÓA MÃ NGUỒN    │ -> Đầu ra: Source Code, Unit Test, Git PR
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ 4. KIỂM CHỨNG & THẨM ĐỊNH    │ -> Đầu ra: Test Execution Report, Bug Log
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ 5. TRIỂN KHAI & DEVOPS       │ -> Đầu ra: Production URL, TLS/SSL, Edge CDN
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│ 6. ĐÁNH GIÁ & BÀN GIAO       │ -> Đầu ra: Traceability Matrix, Defense Script
└──────────────────────────────┘
```

---

## 3. PHA 1: KỸ NGHỆ YÊU CẦU (REQUIREMENTS ENGINEERING)

### 3.1. Mục tiêu kỹ thuật
Chuyển hóa nhu cầu vận hành của môi trường học tập thành tập hợp các yêu cầu kỹ thuật có thể đo lường, kiểm chứng và phân cấp độ ưu tiên theo chuẩn IEEE 29148.

### 3.2. Hoạt động thực thi
1. **Phân tích tác nhân (Actor Analysis):**
   * *Khách vãng lai (Guest):* Người dùng chưa xác thực, có quyền đọc giới hạn và tra cứu công khai.
   * *Sinh viên (User):* Người dùng đã xác thực danh tính học thuật, có quyền khai thác tài liệu, tương tác xã hội và đăng tải tài nguyên.
   * *Quản trị viên (Admin):* Người dùng có quyền lực quản trị cao nhất, kiểm soát hàng đợi phê duyệt, phân cấp danh mục môn học và giám sát an toàn nội dung.
2. **Phân tích Yêu cầu Chức năng (Functional Requirements - FR):**
   Bóc tách nghiệp vụ thành 15 mã yêu cầu độc lập (FR-01 đến FR-15), mỗi yêu cầu xác định rõ đầu vào, xử lý nội tại và đầu ra.
3. **Phân tích Yêu cầu Phi chức năng (Non-Functional Requirements - NFR):**
   * *Hiệu năng (Performance):* Thời gian phản hồi API $\le 500$ms đối với truy vấn đọc, thời gian kết xuất trang đầu tài liệu $\le 2$ giây.
   * *Bảo mật (Security):* Mật khẩu mã hóa bằng thuật toán băm chậm (bcrypt/argon2 với salt rounds $\ge 10$); kiểm tra MIME-type nhị phân (magic bytes) ngăn chặn thực thi mã độc; cơ chế xác thực không lưu trạng thái (Stateless JWT).
   * *Khả dụng (Usability & Compatibility):* Giao diện đáp ứng (Responsive) trên độ phân giải từ 360px (di động) đến 1920px (máy tính).
   * *Giới hạn tài nguyên (Constraints):* Tệp đăng tải định dạng PDF, kích thước tối đa 25MB/tệp.

### 3.3. Chuẩn đầu ra (Deliverables)
* Tài liệu Đặc tả Yêu cầu Phần mềm (Software Requirements Specification - SRS).
* Bảng danh mục 15 Functional Requirements và 5 Non-Functional Requirements.

### 3.4. Tiêu chí hoàn thành (Exit Criteria)
* Toàn bộ các bên liên quan thống nhất về ranh giới nghiệp vụ; không còn yêu cầu mơ hồ hoặc mâu thuẫn kỹ thuật.

---

## 4. PHA 2: THIẾT KẾ HỆ THỐNG VÀ DỮ LIỆU (SYSTEM & DATA DESIGN)

### 4.1. Mục tiêu kỹ thuật
Chuyển hóa tài liệu SRS thành các bản vẽ kiến trúc, mô hình dữ liệu quan hệ đạt chuẩn chuẩn hóa, đặc tả giao diện và hợp đồng API.

### 4.2. Hoạt động thực thi
1. **Thiết kế Kiến trúc Hệ thống (System Architecture):**
   * Áp dụng mô hình **3-Tier Layered Architecture**:
     * *Presentation Tier (Client):* Độc lập, giao tiếp phi đồng bộ qua HTTP/HTTPS.
     * *Application Tier (Server):* Phân rã theo mô hình `Controller -> Service -> Repository`.
     * *Data Tier (Storage):* Phân tách lưu trữ cơ sở dữ liệu quan hệ (PostgreSQL) và dịch vụ tệp phi cấu trúc (Cloud Storage).
2. **Thiết kế Cơ sở Dữ liệu (Data Modeling - ERD):**
   * Thiết kế lược đồ dữ liệu đạt chuẩn chuẩn hóa 3NF (Third Normal Form) nhằm loại bỏ dị thường khi cập nhật, thêm và xóa.
   * Định nghĩa 7 bảng thực thể: `users`, `categories`, `documents`, `bookmarks`, `upvotes`, `comments`, `notifications`.
   * Thiết lập ràng buộc toàn vẹn: Khóa chính (Primary Key), Khóa ngoại (Foreign Key) với chính sách `ON DELETE CASCADE` hoặc `ON DELETE RESTRICT` phù hợp, đánh chỉ mục (Index) trên các trường truy vấn tần suất cao (`category_id`, `status`, `uploader_id`).
3. **Mô hình hóa Hành vi và Cấu trúc (UML Modeling):**
   * *Use Case Diagram:* Thể hiện ranh giới hệ thống, tác nhân và mối quan hệ `<<include>>`, `<<extend>>`.
   * *Activity Diagram:* Mô hình hóa máy trạng thái kiểm duyệt tài liệu (`PENDING -> APPROVED / REJECTED`) có rẽ nhánh điều kiện và gửi thông báo phản hồi.
   * *Sequence Diagram:* Đặc tả tương tác tuần tự theo thời gian giữa các đối tượng trong hai luồng nghiệp vụ cốt lõi: Đăng tải tệp và Phê duyệt nội dung.
4. **Đặc tả Hợp đồng Giao tiếp (API Contract Specification):**
   * Định nghĩa chuẩn RESTful cho toàn bộ endpoints: Đường dẫn tài nguyên (URI số nhiều), Phương thức HTTP chuẩn (`GET`, `POST`, `PUT`, `DELETE`), Mã trạng thái chuẩn (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`).
5. **Thiết kế Cấu trúc Giao diện (Wireframe Design):**
   * Xây dựng sơ đồ khung xương (Wireframe) cho 5 màn hình lõi: Trang chủ/Tra cứu, Trình đọc PDF trực tuyến, Biểu mẫu đăng tải, Danh mục lưu trữ cá nhân, Bảng điều khiển kiểm duyệt của Quản trị viên.

### 4.3. Chuẩn đầu ra (Deliverables)
* Sơ đồ Kiến trúc phân tầng 3 lớp.
* Sơ đồ Quan hệ Thực thể (ERD) và Từ điển Dữ liệu (Data Dictionary).
* Bộ sơ đồ UML (Use Case, Activity, Sequence Diagrams).
* Tài liệu Thiết kế API (API Specifications).
* Bộ Wireframes giao diện người dùng.

### 4.4. Tiêu chí hoàn thành (Exit Criteria)
* Lược đồ CSDL được chuẩn hóa đầy đủ; bảng thiết kế API bao phủ 100% các yêu cầu chức năng (FR).

---

## 5. PHA 3: HIỆN THỰC HÓA VÀ XÂY DỰNG MÃ NGUỒN (CONSTRUCTION & IMPLEMENTATION)

### 5.1. Mục tiêu kỹ thuật
Chuyển hóa các bản vẽ kỹ thuật thành mã nguồn chạy được, đảm bảo tính mô-đun hóa, khả năng bảo trì và tuân thủ tiêu chuẩn lập trình.

### 5.2. Hoạt động thực thi
1. **Thiết lập Môi trường và Kiểm soát Mã nguồn (VCS & Branching):**
   * Áp dụng mô hình **Git Feature Branching Workflow**:
     * Nhánh `main`: Nhánh môi trường sản xuất, khóa quyền đẩy trực tiếp (Protected Branch).
     * Nhánh `feature/*`: Nhánh phát triển tính năng độc lập, bắt buộc tích hợp qua Pull Request (PR).
2. **Hiện thực hóa Tầng Dữ liệu (Data Layer Construction):**
   * Khởi tạo lược đồ cơ sở dữ liệu qua kịch bản Migration tự động.
   * Xây dựng các lớp truy cập dữ liệu (Data Access Object / Repository Pattern) đảm bảo kiểm soát câu truy vấn an toàn, loại bỏ triệt để lỗ hổng SQL Injection thông qua Parameterized Queries.
3. **Hiện thực hóa Tầng Nghiệp vụ (Business Layer Construction):**
   * Triển khai module Xác thực & Ủy quyền (Authentication & Authorization): Cấp phát và xác minh JWT Token, cơ chế bảo mật Middleware kiểm tra quyền truy cập theo vai trò (RBAC).
   * Triển khai Module xử lý tệp: Tiếp nhận luồng dữ liệu (Multipart Stream), kiểm tra Magic Bytes (xác thực tệp PDF thực tế), điều phối tải lên dịch vụ lưu trữ đám mây an toàn.
   * Triển khai Module kiểm duyệt và Máy trạng thái: Xử lý thay đổi trạng thái tài liệu và tự động kích hoạt tạo bản ghi thông báo (Notification Dispatcher).
4. **Hiện thực hóa Tầng Trình diễn (Presentation Layer Construction):**
   * Xây dựng Single Page Application (SPA), tổ chức cấu trúc Component theo nguyên lý Atomic Design hoặc Feature-based.
   * Tích hợp thành phần kết xuất PDF chuyên dụng (PDF Viewer Engine) hỗ trợ phân trang, thu phóng và tải trước (Pre-fetching).
   * Quản lý trạng thái giao diện tập trung, xử lý trạng thái chờ (Loading Skeleton), trạng thái rỗng (Empty State) và thông báo lỗi trực quan.

### 5.3. Chuẩn đầu ra (Deliverables)
* Mã nguồn Frontend và Backend hoàn chỉnh, sạch sẽ (Clean Code).
* Kịch bản Database Migrations.
* Lịch sử Git commits chuẩn hóa (Semantic Commit Messages: `feat:`, `fix:`, `refactor:`).

### 5.4. Tiêu chí hoàn thành (Exit Criteria)
* Toàn bộ mã nguồn biên dịch thành công không có lỗi cú pháp hoặc cảnh báo nghiêm trọng; 100% mã nguồn được hợp nhất vào nhánh chính thông qua quá trình bình duyệt mã (Code Review).

---

## 6. PHA 4: KIỂM CHỨNG VÀ THẨM ĐỊNH (VERIFICATION & VALIDATION)

### 6.1. Mục tiêu kỹ thuật
Thực hiện đánh giá có hệ thống nhằm chứng minh phần mềm được xây dựng đúng theo thiết kế (Verification) và thỏa mãn đầy đủ mục tiêu vận hành (Validation).

### 6.2. Hoạt động thực thi
1. **Kiểm thử Đơn vị (Unit Testing):**
   * Viết kịch bản kiểm thử tự động cho các hàm nghiệp vụ độc lập: hàm kiểm tra kích thước và định dạng tệp, thuật toán mã hóa mật khẩu, hàm kiểm tra quyền truy cập.
2. **Kiểm thử Tích hợp (Integration Testing):**
   * Kiểm tra giao tiếp giữa Tầng Nghiệp vụ và Cơ sở dữ liệu: Kiểm tra tính toàn vẹn của giao dịch (Transaction Integrity), đảm bảo không xảy ra trạng thái mồ côi (Orphan Records) khi tạo tài liệu kèm thông báo.
   * Kiểm tra kết nối ngoại vi: Kiểm tra khả năng tải tệp lên và truy xuất URL từ Cloud Storage.
3. **Kiểm thử Hệ thống từ đầu đến cuối (End-to-End / System Testing):**
   * Thực thi các ca kiểm thử (Test Cases) bao phủ toàn bộ chu trình sống của tài liệu:
     * Kịch bản 1: *Đăng ký tài khoản -> Xác thực đăng nhập -> Tìm kiếm theo môn học -> Đọc trực tuyến -> Tải về*.
     * Kịch bản 2: *Sinh viên tải lên tệp PDF -> Tài liệu vào hàng đợi (Pending) -> Quản trị viên duyệt -> Sinh viên nhận thông báo phê duyệt -> Tài liệu hiển thị công khai*.
     * Kịch bản 3: *Quản trị viên từ chối tài liệu -> Sinh viên nhận thông báo kèm lý do phản hồi*.
4. **Kiểm thử Bảo mật và Ranh giới (Security & Boundary Testing):**
   * Kiểm thử giả lập tải lên tệp độc hại (tệp giả mạo đuôi `.pdf` nhưng nội dung là mã thực thi).
   * Kiểm thử tấn công vượt quyền (IDOR: sinh viên cố tình gọi API xóa tài liệu của người khác).
   * Kiểm thử phân trang và tải trọng dữ liệu lớn.

### 6.3. Chuẩn đầu ra (Deliverables)
* Tài liệu Kế hoạch Kiểm thử (Test Plan) và Bộ ca kiểm thử (Test Cases).
* Báo cáo Kết quả Thực thi Kiểm thử (Test Execution Report) và Nhật ký Xử lý Lỗi (Bug Log).

### 6.4. Tiêu chí hoàn thành (Exit Criteria)
* 100% các ca kiểm thử mức nghiêm trọng (Critical/High) được giải quyết; hệ thống không phát sinh lỗi làm ngắt quãng luồng nghiệp vụ chính.

---

## 7. PHA 5: ĐÓNG GÓI, TRIỂN KHAI VÀ DEVOPS (DEPLOYMENT & RELEASE)

### 7.1. Mục tiêu kỹ thuật
Tự động hóa quá trình đóng gói và triển khai ứng dụng từ kho mã nguồn lên hạ tầng đám mây sẵn sàng phục vụ người dùng thực tế với tính khả dụng cao.

### 7.2. Hoạt động thực thi
1. **Tự động hóa Tích hợp và Triển khai (CI/CD Pipeline):**
   * Cấu hình luồng kiểm tra tự động khi phát sinh Pull Request: Tự động chạy quy trình kiểm tra mã nguồn (Linter), chạy bộ kiểm thử đơn vị và biên dịch thử nghiệm (Build Check).
   * Cấu hình triển khai tự động (Continuous Deployment) khi mã nguồn được hợp nhất vào nhánh `main`.
2. **Cung ứng và Phân tách Hạ tầng (Infrastructure Provisioning):**
   * *Frontend Host:* Triển khai lên mạng lưới phân phối biên toàn cầu (Edge CDN), tối ưu hóa thời gian tải trang tĩnh và tự động hóa kết xuất các tài nguyên giao diện.
   * *Backend Host:* Triển khai lên nền tảng dịch vụ web (PaaS/Container) độc lập, quản lý biến môi trường (.env) an toàn, tách biệt hoàn toàn thông tin bảo mật khỏi mã nguồn công khai.
   * *Managed Database:* Triển khai hệ quản trị PostgreSQL trên hạ tầng điện toán đám mây, cấu hình kết nối bảo mật (SSL connection string) và chính sách sao lưu tự động.
3. **Cấu hình Phân giải Tên miền và Bảo mật Truyền tải (DNS & TLS Configuration):**
   * Thiết lập bản ghi định danh CNAME/A record kết nối tên miền chính thức đến cụm máy chủ máy chủ phân phối.
   * Kích hoạt và kiểm định chứng chỉ mã hóa đường truyền TLS/HTTPS 256-bit, đảm bảo toàn bộ phiên làm việc của người dùng được mã hóa an toàn từ đầu cuối đến đầu cuối (End-to-End Encryption).

### 7.3. Chuẩn đầu ra (Deliverables)
* Kịch bản tự động hóa CI/CD.
* Hệ thống Production vận hành trực tuyến có chứng chỉ bảo mật TLS/HTTPS hợp lệ.
* Nhật ký triển khai (Deployment Logs) không chứa lỗi vận hành.

### 7.4. Tiêu chí hoàn thành (Exit Criteria)
* Hệ thống có thể truy cập ổn định qua tên miền chính thức; toàn bộ các endpoints API trên môi trường Production giao tiếp thông suốt với Client.

---

## 8. PHA 6: TỔNG KẾT VÀ BÀN GIAO KỸ THUẬT (REVIEW & HANDOVER)

### 8.1. Mục tiêu kỹ thuật
Đánh giá độ hoàn thiện kỹ thuật so với các cam kết ban đầu, đóng gói toàn bộ hồ sơ kỹ nghệ và chuẩn bị quy trình bảo vệ trước hội đồng chuyên môn.

### 8.2. Hoạt động thực thi
1. **Xây dựng Ma trận Truy vết Yêu cầu (Requirements Traceability Matrix - RTM):**
   * Lập bảng đối chiếu hai chiều: Mỗi mã yêu cầu `FR` phải tương ứng với 1 `Use Case`, 1 tập hợp `API Endpoints`, 1 tập hợp `Source Files` và tối thiểu 1 `Test Case`. Đảm bảo không có tính năng nào bị bỏ quên hoặc phát triển dư thừa ngoài phạm vi.
2. **Đánh giá Nợ Kỹ thuật (Technical Debt Assessment):**
   * Lập danh mục các điểm hạn chế về mặt kiến trúc cần cải tiến trong tương lai: cơ chế lưu đệm (Caching với Redis), chuyển đổi tệp phi đồng bộ (Background Worker Queue), chỉ mục tìm kiếm toàn văn nâng cao (Elasticsearch).
3. **Đóng gói Hồ sơ Kỹ thuật:**
   * Hoàn thiện Báo cáo Đồ án Tổng kết (Word/PDF) chuẩn văn phong khoa học.
   * Xây dựng Tài liệu Hướng dẫn Vận hành và Kịch bản Kiểm thử Nghiệm thu (User Acceptance Script).

### 8.3. Chuẩn đầu ra (Deliverables)
* Ma trận Truy vết Yêu cầu (RTM) hoàn chỉnh.
* Báo cáo Tổng kết Đồ án môn học.
* Bản trình chiếu (Slide) thuyết minh kỹ thuật và Kịch bản minh họa luồng phần mềm (Live Demo Script).

### 8.4. Tiêu chí hoàn thành (Exit Criteria)
* Toàn bộ hồ sơ kỹ thuật được bàn giao đầy đủ; sản phẩm vượt qua các tiêu chí đánh giá trong Rubric môn học.

---

## 9. MA TRẬN TRUY VẾT VÀ TIÊU CHUẨN NGHIỆM THU TỔNG THỂ

| Pha kỹ nghệ | Đầu vào (Inputs) | Hoạt động cốt lõi | Đầu ra kỹ thuật (Deliverables) | Tiêu chuẩn nghiệm thu (DoD) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Kỹ nghệ Yêu cầu** | Khung CTĐT Sư phạm Tin học, Mục tiêu hệ thống | Thu thập, phân tích, phân loại FR & NFR | Tài liệu SRS, Danh mục FR-01 -> FR-15 | 100% yêu cầu được định danh, không mâu thuẫn nghiệp vụ |
| **2. Thiết kế Hệ thống** | Tài liệu SRS | Mô hình hóa UML, chuẩn hóa ERD 3NF, Thiết kế API & Wireframe | Bản vẽ Kiến trúc 3 tầng, ERD, Sơ đồ UML, API Specs, Wireframes | Lược đồ DB chuẩn hóa 3NF; API bao phủ 100% FR |
| **3. Hiện thực hóa** | Thiết kế ERD, API Specs, Bộ quy tắc AGENTS.md | Lập trình 3 tầng (React, Express, PostgreSQL), quản lý Git PR | Source Code, Kịch bản DB Migration, Clean Commits | 100% code biên dịch không lỗi; qua bình duyệt mã (Code Review) |
| **4. Kiểm chứng** | Source Code, Yêu cầu NFR, Kịch bản nghiệp vụ | Kiểm thử Unit, Integration, E2E và Bảo mật | Test Cases, Test Execution Report, Bug Log | 0 lỗi nghiêm trọng (Critical); 100% luồng chính thành công |
| **5. Triển khai** | Build Artifacts, Tài khoản Cloud, Domain | Thiết lập CI/CD, Edge CDN, PaaS Host, DNS & TLS | Production URL, Chứng chỉ TLS/HTTPS, Deployment Logs | Hệ thống hoạt động 24/7 trên tên miền chính thức |
| **6. Đánh giá & Bàn giao** | Toàn bộ hồ sơ các pha 1 -> 5 | Lập ma trận RTM, đánh giá nợ kỹ thuật, đóng gói báo cáo | Ma trận RTM, Báo cáo Tổng kết, Slide & Kịch bản Demo | Đạt 100% tiêu chí Rubric đánh giá đồ án cuối kỳ |
