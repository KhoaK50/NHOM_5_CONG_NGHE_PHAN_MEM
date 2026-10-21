# KIẾN TRÚC HẠ TẦNG KIỂM THỬ ĐẦU-CUỐI (E2E TEST INFRASTRUCTURE SPECIFICATION)
## DỰ ÁN: 5SHARE — NỀN TẢNG CHIA SẺ HỌC LIỆU SƯ PHẠM TIN HỌC (HCMUE)
**Mã tài liệu:** `TEST_INFRA.md`  
**Phiên bản:** 1.0.0 (Chuẩn hóa Traceability 100% với SRS v2.1 & PROJECT.md)  
**Kiến trúc kiểm thử:** Opaque-Box (Hộp mờ/Hộp đen độc lập) theo Phương pháp luận 4 Tầng (4-Tier Testing Methodology)  
**Tập lệnh kiểm thử:** `node tests/e2e/runner.js`

---

## 1. TỔNG QUAN HẠ TẦNG VÀ NGUYÊN TẮC THIẾT KẾ (DESIGN PRINCIPLES)

Bộ kiểm thử đầu-cuối (E2E Test Suite) của 5Share được thiết kế nhằm thẩm định độc lập toàn bộ 13 Yêu cầu Chức năng (FR-01 đến FR-13 / UC01 đến UC13) mà không phụ thuộc vào chi tiết cài đặt nội bộ (Opaque-Box / Black-Box Testing).

### Các nguyên tắc cốt lõi:
1. **Tính độc lập & Cách ly (Isolation & Independence):** Mỗi ca kiểm thử tự khởi tạo fixture, ngữ cảnh phiên và trạng thái dữ liệu riêng; không phụ thuộc vào thứ tự thực thi của các ca khác.
2. **Xác thực Đầu ra Chuẩn tắc (Authoritative Expected Output):** Mọi kết quả mong đợi đều được truy xuất trực tiếp từ các tài liệu chuẩn:
   - Tài liệu đặc tả hệ thống: `docs/SRS_CHI_TIET_HE_THONG_5SHARE.md` (v2.1)
   - Kế hoạch tái thiết lập & Hợp đồng giao diện: `PROJECT.md`
   - Báo cáo phân tích hiện trạng & Ma trận 8 tiêu chí kiểm duyệt: `docs/chuong1.tex` & `docs/chuong2/`
   - Tiêu chuẩn mật mã học: Thuật toán SHA-256 (RFC 6234), Chữ ký nhị phân Magic Bytes (%PDF- `25 50 44 2D`, PK.. `50 4B 03 04`).
3. **Thực thi Nhẹ & Không phụ thuộc Bên ngoài (Headless Self-Contained Runner):** Toàn bộ bộ test chạy trực tiếp bằng Node.js v18+ mà không cần khởi động trình duyệt nặng nề hay máy chủ bên thứ ba, đảm bảo tốc độ thực thi trong vài giây trên mọi môi trường CI/CD.

---

## 2. PHƯƠNG PHÁP LUẬN KIỂM THỬ 4 TẦNG (4-TIER METHODOLOGY)

```
┌────────────────────────────────────────────────────────────────────────┐
│ TẦNG 4: Real-World Workloads & Application Scenarios (≥ 7 kịch bản)    │
│ - Luồng trải nghiệm hoàn chỉnh của người dùng thực tế                  │
│ - Mô phỏng vòng đời học liệu từ đóng góp -> duyệt -> tải -> báo cáo   │
├────────────────────────────────────────────────────────────────────────┤
│ TẦNG 3: Pairwise Combinations & Cross-Feature Interactions (≥ 13 ca)   │
│ - Tương tác đa chiều giữa các phân hệ: Auth + Upload + Moderation      │
│ - Ràng buộc khóa ngoại, trừ ví điểm thưởng, kiểm soát quyền truy cập  │
├────────────────────────────────────────────────────────────────────────┤
│ TẦNG 2: Boundary Value Analysis (BVA) & Corner Cases (≥ 65 ca)         │
│ - Kiểm thử các giá trị biên: 0 byte, 25MB, 25MB + 1 byte, 3 lượt tải  │
│ - Token hết hạn, mật khẩu 7 ký tự, 0 sao, 6 sao, xóa bình luận người khác│
├────────────────────────────────────────────────────────────────────────┤
│ TẦNG 1: Feature Coverage (Category-Partition Method) (≥ 65 ca)         │
│ - Phân vùng tương đương (Equivalence Partitioning) cho từng chức năng  │
│ - Tối thiểu 5 ca kiểm thử chuẩn tắc cho mỗi FR (13 FRs × 5 = 65 ca)    │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1. Tầng 1: Phân vùng tương đương (Category-Partition Method)
- **Mục tiêu:** Kiểm tra đường dẫn chính (Happy Path) và các phân vùng dữ liệu hợp lệ/không hợp lệ tiêu chuẩn của từng chức năng đơn lẻ.
- **Quy mô:** $\ge 5$ ca cho mỗi yêu cầu chức năng $\times 13\text{ FR} = \ge 65\text{ ca}$.

### 2.2. Tầng 2: Phân tích giá trị biên (Boundary Value Analysis - BVA) & Trường hợp dị biệt (Corner Cases)
- **Mục tiêu:** Thử thách hệ thống ở các ngưỡng biên cực hạn (Min - 1, Min, Normal, Max, Max + 1), các tệp rỗng, tràn số, chuỗi ký tự đặc biệt, token quá hạn thời gian.
- **Quy mô:** $\ge 5$ ca cho mỗi yêu cầu chức năng $\times 13\text{ FR} = \ge 65\text{ ca}$.

### 2.3. Tầng 3: Tổ hợp tương tác chéo phân hệ (Pairwise & Cross-Feature Interactions)
- **Mục tiêu:** Đảm bảo tính nhất quán của trạng thái hệ thống khi nhiều chức năng tác động qua lại lẫn nhau (State Transition Consistency).
- **Quy mô:** $\ge 13$ ca kiểm thử tổ hợp liên kết giữa các cặp FR.

### 2.4. Tầng 4: Kịch bản ứng dụng thế giới thực (Real-World Application Scenarios)
- **Mục tiêu:** Tái hiện 100% các hành vi sử dụng thực tế của Khách (Guest), Sinh viên (User), và Quản trị viên (Admin) qua chuỗi hành động đa bước (Multi-step end-to-end flows).
- **Quy mô:** $\ge 7$ kịch bản hoàn chỉnh từ đầu đến cuối.

**Tổng số ca kiểm thử tối thiểu yêu cầu:** $\ge 150\text{ test cases}$.  
**Tổng số ca kiểm thử thực tế được cài đặt:** **153 test cases**.

---

## 3. BẢNG TRUY VẾT MA TRẬN 13 YÊU CẦU CHỨC NĂNG (TRACEABILITY MATRIX)

| Mã FR | Tên chức năng | Use Case | Tầng 1 (Partition) | Tầng 2 (BVA) | Tầng 3 (Cross) | Tầng 4 (Scenarios) | Tổng ca |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **FR-01** | Xác thực & Quản lý phiên | UC01, UC02 | 5 ca | 5 ca | 2 ca | Scenarios 1, 2 | 12 ca |
| **FR-02** | Hồ sơ cá nhân & Bảo mật | UC03 | 5 ca | 5 ca | 1 ca | Scenarios 1, 7 | 11 ca |
| **FR-03** | Cấu trúc Danh mục Học thuật | Khung CTĐT | 5 ca | 5 ca | 1 ca | Scenario 6 | 11 ca |
| **FR-04** | Tìm kiếm FTS & Lọc Đa tiêu chí | UC05 | 5 ca | 5 ca | 2 ca | Scenarios 1, 5 | 12 ca |
| **FR-05** | Xem chi tiết & Reader Trực tuyến | UC06 | 5 ca | 5 ca | 1 ca | Scenarios 2, 5 | 11 ca |
| **FR-06** | Đóng góp học liệu & 4 Tầng Phòng thủ | UC07, UC08 | 5 ca | 5 ca | 2 ca | Scenarios 1, 3, 5, 7 | 14 ca |
| **FR-07** | Hàng đợi Kiểm duyệt 8 Tiêu chí | UC09 | 5 ca | 5 ca | 2 ca | Scenarios 1, 3, 4 | 12 ca |
| **FR-08** | Quản trị Khóa học & Khóa Tài khoản | UC10 | 5 ca | 5 ca | 2 ca | Scenarios 6, 7 | 12 ca |
| **FR-09** | Tủ sách Cá nhân & Trạng thái Đóng góp| UC11, UC12 | 5 ca | 5 ca | 1 ca | Scenarios 1, 4 | 11 ca |
| **FR-10** | Đánh giá Sao & Bình luận Học thuật | UC13 | 5 ca | 5 ca | 1 ca | Scenario 5 | 11 ca |
| **FR-11** | Báo cáo Vi phạm & Hòm thư Góp ý | UC04 | 5 ca | 5 ca | 1 ca | Scenarios 4, 7 | 11 ca |
| **FR-12** | Treo thưởng Học liệu & Bảng xếp hạng| Gamification | 5 ca | 5 ca | 2 ca | Scenario 3 | 12 ca |
| **FR-13** | Giới hạn Khách Tải & Dashboard Quản trị | UC12, UC11 | 5 ca | 5 ca | 2 ca | Scenarios 2, 6 | 12 ca |
| **TỔNG** | **13 Phân hệ Chức năng** | **13 UCs** | **65 ca** | **65 ca** | **15 ca** | **8 ca** | **153 ca** |

---

## 4. CHI TIẾT CÁC PHÂN PHÒNG KIỂM THỬ (TEST SPECIFICATIONS)

### 4.1. FR-01: Xác thực người dùng & Quản lý phiên (UC01, UC02)
- **Tier 1:** Đăng ký tài khoản hợp lệ; Đăng nhập đúng mật khẩu cấp token JWT; Đăng nhập sai mật khẩu trả lỗi 401; Luồng quên mật khẩu sinh token reset 15 phút; Phân quyền RBAC chính xác cho GUEST/STUDENT/ADMIN.
- **Tier 2:** Email sai định dạng (thiếu @, tên miền sai cú pháp); Mật khẩu ngắn dưới 8 ký tự; Mật khẩu thiếu ký tự hoa hoặc ký tự số; Token reset mật khẩu quá hạn 15 phút bị từ chối; Token giả mạo/sai chữ ký bị chặn truy cập.

### 4.2. FR-02: Quản lý hồ sơ cá nhân & Bảo mật (UC03)
- **Tier 1:** Cập nhật thông tin họ tên thành công; Cập nhật khóa học sinh viên hợp lệ; Cập nhật URL ảnh đại diện; Đổi mật khẩu thành công khi xác thực mật khẩu cũ; Tính toán đúng số lượng thông báo chưa đọc trên Header.
- **Tier 2:** Khóa học không đúng định dạng (ngoài K48-K52); Đổi mật khẩu khi mật khẩu cũ bị sai; Mật khẩu mới trùng hoàn toàn mật khẩu cũ; Xác nhận mật khẩu mới không khớp; Đánh dấu đã đọc thông báo không tồn tại.

### 4.3. FR-03: Cấu trúc Danh mục Học thuật Sư phạm Tin
- **Tier 1:** Xác nhận cấu trúc 4 Khối kiến thức chuẩn (Đại cương, Cơ sở ngành, Chuyên ngành, Nghiệp vụ Sư phạm); Truy vấn môn học theo học kỳ; Phân loại 4 nhóm học liệu; Ánh xạ chính xác mã môn học (COMP1044, COMP1015, COMP1022); Kiểm tra tính toàn vẹn số tín chỉ (Credits).
- **Tier 2:** Truy vấn khối kiến thức không tồn tại trả mảng rỗng; Môn học trùng mã code bị chặn tạo mới; Môn học có số tín chỉ âm bị từ chối; Học kỳ ngoài phạm vi (Học kỳ 7+); Tìm kiếm môn học theo chuỗi rỗng.

### 4.4. FR-04: Tra cứu & Bộ lọc tài liệu đa tiêu chí (UC05)
- **Tier 1:** Tìm kiếm FTS có dấu ("Kế hoạch bài dạy"); Chuẩn hóa unaccent không dấu ("ke hoach bai day"); Lọc tài liệu theo định dạng .pdf; Lọc kết hợp Khối kiến thức + Học kỳ; Phân trang chuẩn 12 tài liệu/trang.
- **Tier 2:** Từ khóa tìm kiếm chứa ký tự đặc biệt SQL Injection (`' OR 1=1 --`); Từ khóa dài bất thường (> 256 ký tự); Lọc theo định dạng không hỗ trợ (.mp4); Offset phân trang vượt quá tổng số tài liệu; Tìm kiếm không có kết quả trả về `totalResults = 0` và mảng rỗng.

### 4.5. FR-05: Xem chi tiết & Xem trước trực tuyến (UC06)
- **Tier 1:** Tải metadata chi tiết tài liệu kèm lượt xem/tải; Tăng biến đếm `viewCount` khi xem chi tiết; Chế độ đọc PDF cho Sinh viên (toàn văn trang 1..N); Sinh URL Google Docs Viewer nhúng Iframe cho .docx/.pptx; Sinh đường dẫn sao chép chia sẻ chuẩn tắc (`/documents/:id`).
- **Tier 2:** Khách vãng lai bị khóa từ trang 4 trở đi (chỉ cho phép trang 1, 2, 3); Khách yêu cầu trang 0 hoặc số âm bị chặn; Yêu cầu xem tài liệu không tồn tại trả lỗi 404; Yêu cầu tài liệu chưa được duyệt (`PENDING`) bởi Khách bị từ chối; Tệp tin thiếu URL xem trước xử lý ngoại lệ an toàn.

### 4.6. FR-06: Đóng góp tài liệu học tập & 4 Tầng Phòng thủ (UC07, UC08)
- **Tier 1:** Tiếp nhận tệp PDF hợp lệ kèm chữ ký `%PDF-`; Tiếp nhận tệp DOCX hợp lệ kèm chữ ký `PK\x03\x04`; Tiếp nhận tệp PPTX hợp lệ kèm chữ ký `PK\x03\x04`; Tính toán mã băm SHA-256 chuẩn xác 64 ký tự hex; Khởi tạo tài liệu ở trạng thái `PENDING`.
- **Tier 2:** Tệp không có tệp tin (null/undefined) bị chặn ở Tầng 1; Tệp sai đuôi (.exe, .zip) bị chặn ở Tầng 1; Tệp rỗng 0-byte bị chặn ở Tầng 1; Tệp vượt quá 25MB (25.1MB) bị chặn ở Tầng 1; Tệp giả mạo đổi đuôi (chữ ký MZ của EXE) bị chặn ở Tầng 2; Tệp trùng mã băm SHA-256 bị chặn ở Tầng 3.

### 4.7. FR-07: Hàng duyệt kiểm duyệt tài liệu (Admin Moderation) (UC09)
- **Tier 1:** Lọc danh sách tài liệu chờ duyệt `status = 'PENDING'`; Kiểm tra đủ 8 tiêu chí kiểm duyệt chất lượng; Phê duyệt tài liệu chuyển sang `APPROVED`; Tự động cộng +20 điểm thưởng cho tác giả tải lên; Sinh thông báo chúc mừng vào chuông thông báo của tác giả.
- **Tier 2:** Phê duyệt tài liệu đã ở trạng thái `APPROVED` bị chặn; Từ chối tài liệu mà không nhập lý do (`reject_reason` rỗng) bị chặn; Tài liệu vi phạm tiêu chí bắt buộc (TC01-TC06) không thể được duyệt; Người dùng không có quyền Admin thực hiện duyệt bị lỗi 403; Trạng thái từ chối `REJECTED` ghi nhận chính xác lý do phản hồi.

### 4.8. FR-08: Quản trị Danh mục & Quản lý Người dùng (UC10)
- **Tier 1:** Thêm mới môn học vào chương trình đào tạo; Chỉnh sửa thông tin môn học; Danh sách người dùng hiển thị đầy đủ thông tin; Tìm kiếm người dùng theo tên hoặc email; Khóa tài khoản người dùng (`is_active = false`).
- **Tier 2:** Xóa môn học đang có tài liệu liên kết bị CHẶN bởi ràng buộc Khóa ngoại (Referential Integrity); Xóa môn học không có tài liệu thành công; Khóa tài khoản đang bị khóa (Idempotency); Mở khóa tài khoản thành công; Tài khoản bị khóa không thể thực hiện thao tác tải lên hay bình luận.

### 4.9. FR-09: Kho tài liệu cá nhân (My Library) (UC11, UC12)
- **Tier 1:** Thêm tài liệu vào danh sách Yêu thích (Bookmark); Xóa tài liệu khỏi danh sách Bookmark; Lọc danh sách tài liệu do chính mình đóng góp; Hiển thị tài liệu đang chờ duyệt trong Tủ cá nhân; Hiển thị tài liệu đã được duyệt công khai.
- **Tier 2:** Thêm trùng bookmark cho cùng một tài liệu không sinh bản ghi thừa (Idempotency); Xóa bookmark không tồn tại trả kết quả an toàn; Sinh viên không xem được tài liệu PENDING của sinh viên khác trong Tủ cá nhân; Hiển thị đúng lý do từ chối cho tài liệu `REJECTED`; Danh sách rỗng khi người dùng chưa có tài liệu nào.

### 4.10. FR-10: Đánh giá chất lượng & Bình luận trao đổi (UC13)
- **Tier 1:** Gửi đánh giá sao từ 1 đến 5 sao; Tính toán điểm trung bình sao `AVG(stars)` chính xác; Gửi bình luận học thuật mới; Hiển thị danh sách bình luận theo thời gian mới nhất; Tác giả tự xóa bình luận của chính mình thành công.
- **Tier 2:** Đánh giá sao ngoài phạm vi (0 sao hoặc 6 sao) bị từ chối; Người dùng đánh giá lại tài liệu thì cập nhật số sao cũ, không tăng số lượt đánh giá; Bình luận rỗng hoặc toàn khoảng trắng bị từ chối; Sinh viên không thể xóa bình luận của sinh viên khác (Lỗi 403 Forbidden); Admin có quyền xóa bình luận vi phạm của bất kỳ ai.

### 4.11. FR-11: Báo cáo vi phạm & Hòm thư góp ý (UC04)
- **Tier 1:** Gửi báo cáo vi phạm tài liệu với lý do chuẩn; Hiển thị danh sách báo cáo trong hàng đợi Admin; Admin phê chuẩn báo cáo và ẩn/xóa tài liệu vi phạm; Admin bác bỏ báo cáo sai lệch; Người dùng gửi phản hồi qua Hòm thư góp ý thành công.
- **Tier 2:** Báo cáo với lý do không thuộc danh mục chuẩn bị từ chối; Báo cáo tài liệu không tồn tại bị từ chối; Người dùng báo cáo trùng lặp cùng một tài liệu khi chưa xử lý bị cảnh báo; Góp ý hệ thống thiếu nội dung mô tả bị từ chối; Người không phải Admin cố gắng xử lý báo cáo bị chặn.

### 4.12. FR-12: Điểm tích lũy & Treo thưởng tài liệu (Study Bounty)
- **Tier 1:** Khởi tạo điểm thưởng chào mừng (+50 điểm khi kích hoạt); Tạo yêu cầu treo thưởng tài liệu (Bounty) thành công; Trừ số điểm treo thưởng từ ví của người tạo; Thành viên khác nộp tài liệu giải thưởng và được duyệt; Chuyển điểm thưởng sang người nộp và đổi trạng thái `FULFILLED`; Bảng xếp hạng Top 10 sắp xếp chính xác theo điểm tích lũy giảm dần.
- **Tier 2:** Tạo yêu cầu treo thưởng vượt quá số dư ví điểm hiện có bị từ chối; Số điểm treo thưởng bằng 0 hoặc âm bị từ chối; Tự giải thưởng bounty do chính mình tạo bị từ chối; Hủy yêu cầu treo thưởng khi chưa ai nộp hoàn lại điểm vào ví; Giới hạn hiển thị đúng 10 thành viên hàng đầu trong Leaderboard.

### 4.13. FR-13: Quản lý luồng tải xuống & Bảng thống kê (UC12, UC11)
- **Tier 1:** Khách vãng lai tải tệp lượt 1, 2, 3 thành công; Tăng biến đếm `downloadCount` khi tải tệp; Sinh viên đã đăng nhập tải tệp không giới hạn; Thống kê tổng số tài liệu, lượt xem, lượt tải trên Dashboard; Thống kê phân bố học liệu theo môn học.
- **Tier 2:** Khách vãng lai tải lượt thứ 4 trong ngày bị CHẶN triệt để (Rate Limit 3 downloads/day); Lượt tải thứ 4 hiển thị thông báo yêu cầu đăng nhập tài khoản sinh viên; Tải tệp không tồn tại xử lý lỗi 404; Rate limit tự động làm mới sau khi chu kỳ 24 giờ kết thúc; Thống kê tỷ lệ phần trăm các môn học đạt tổng 100%.

---

## 5. TỔNG HỢP 8 KỊCH BẢN THẾ GIỚI THỰC (TIER 4 REAL-WORLD SCENARIOS)

1. **Scenario 1: Hành trình Sinh viên mới gia nhập & Đóng góp học liệu đầu tay**
   - Đăng ký tài khoản -> Nhận +50 điểm khởi đầu -> Cập nhật thông tin khóa học K50 -> Đóng góp Giáo án mẫu Tin học 10 (.pdf) -> Vượt qua 4 tầng kiểm tra -> Admin kiểm duyệt 8 tiêu chí -> Phê duyệt -> Nhận +20 điểm (Tổng 70 điểm) -> Nhận thông báo chuông -> Tài liệu xuất hiện trên Kho học liệu công khai.
2. **Scenario 2: Chuyển đổi Khách vãng lai sang Sinh viên qua hàng rào Đọc thử & Giới hạn tải**
   - Khách xem trước tài liệu -> Đọc mượt trang 1, 2, 3 -> Trang 4 bị làm mờ kèm nút Mở khóa -> Khách bấm Tải tệp 3 lần trong ngày -> Lần tải thứ 4 bị chặn bởi Rate Limiter -> Khách tiến hành Đăng nhập tài khoản Sinh viên -> Trở lại đọc toàn văn không giới hạn trang -> Tải tệp gốc thành công.
3. **Scenario 3: Nền kinh tế Tri thức: Treo thưởng Tài liệu (Study Bounty) & Vinh danh Bảng vàng**
   - Sinh viên A cần Đề thi Mạng máy tính hiếm -> Tạo Bounty treo thưởng 40 điểm -> Điểm ví A trừ từ 100 xuống 60 -> Sinh viên B tìm thấy đề thi và nộp giải thưởng -> Admin thẩm định tệp -> Phê duyệt -> Ví B được cộng 40 điểm thưởng -> Bounty đổi trạng thái FULFILLED -> B cập nhật thứ hạng trên Top 10 Leaderboard.
4. **Scenario 4: Chu trình Bảo vệ Liêm chính Học thuật & Xử lý Báo cáo Vi phạm**
   - Tài liệu có nội dung sai lệch được sinh viên phát hiện -> Sinh viên gửi Báo cáo vi phạm kèm mô tả chi tiết -> Báo cáo chuyển vào hàng đợi Admin -> Admin xem toàn văn đối chiếu tiêu chí bản quyền & học thuật -> Admin chọn "Ẩn/Xóa tài liệu" -> Tài liệu bị gỡ khỏi Kho học liệu công khai -> Trạng thái trong Tủ sách cá nhân của tác giả chuyển sang REJECTED kèm lý do vi phạm.
5. **Scenario 5: Vòng đời Học liệu Đa định dạng (.docx/.pptx) & Tương tác Cộng đồng**
   - Giảng viên/Sinh viên tải lên Slide bài giảng điện tử (.pptx) -> Kiểm tra Magic Bytes nhị phân `PK..` thành công -> Tìm kiếm toàn văn FTS unaccent tìm thấy bài giảng -> Nhúng xem trước qua Google Docs Viewer Iframe -> Người dùng sao chép liên kết chia sẻ -> Thành viên khác để lại đánh giá 5★ và bình luận chuyên môn -> Điểm trung bình sao cập nhật chính xác.
6. **Scenario 6: Cập nhật Khung Chương trình Đào tạo & Bảo vệ Toàn vẹn Khóa ngoại (FK Block)**
   - Admin truy cập trang Quản lý Môn học -> Cố gắng xóa môn "Phương pháp dạy học môn Tin học" đang có 4 học liệu gắn liền -> Hệ thống phát hiện ràng buộc toàn vẹn và CHẶN xóa môn học -> Admin chuyển trạng thái môn sang tạm ngừng hoặc tạo môn học mới không có tài liệu -> Thao tác xóa môn học rỗng thành công.
7. **Scenario 7: Cách ly Người dùng Vi phạm Quy chuẩn & Hòm thư Góp ý Hệ thống**
   - Người dùng spam cố tình đổi đuôi tệp thực thi độc hại (.exe đổi thành .pdf) -> Hệ thống chặn ở Tầng 2 Magic Bytes -> Người dùng tiếp tục spam báo cáo sai sự thật -> Admin khóa tài khoản (`is_active = false`) -> Người dùng bị khóa không thể thực hiện bất kỳ thao tác nào -> Người dùng gửi phản hồi qua Hòm thư góp ý phân trần và đề nghị mở lại tài khoản.
8. **Scenario 8: Chu trình Khôi phục Mật khẩu & Quản lý Phiên Bảo mật Đa thiết bị**
   - Người dùng quên mật khẩu -> Gửi yêu cầu reset -> Nhận token thời hạn 15 phút -> Thử nhập mật khẩu yếu (<8 ký tự) bị từ chối -> Đặt mật khẩu mới an toàn -> Token cũ hết hiệu lực ngay lập tức -> Đăng nhập lại với mật khẩu mới -> Cấp mới JWT Token 24h.

---

## 6. HƯỚNG DẪN THỰC THI KIỂM THỬ (TEST EXECUTION INSTRUCTIONS)

### Lệnh chạy chính thức:
```bash
node tests/e2e/runner.js
```

### Các tùy chọn tham số dòng lệnh (CLI Flags):
- Chạy chi tiết từng ca kiểm thử:
  ```bash
  node tests/e2e/runner.js --verbose
  ```
- Chỉ chạy riêng một Tầng kiểm thử:
  ```bash
  node tests/e2e/runner.js --tier=1
  node tests/e2e/runner.js --tier=2
  node tests/e2e/runner.js --tier=3
  node tests/e2e/runner.js --tier=4
  ```
- Chỉ chạy riêng một Yêu cầu Chức năng (FR):
  ```bash
  node tests/e2e/runner.js --fr=06
  node tests/e2e/runner.js --fr=07
  ```

### Tiêu chí Đạt chuẩn (Pass Criteria):
- **Tất cả các ca kiểm thử (153/153) phải trả về PASS.**
- **Exit code của tiến trình bằng 0 (`process.exit(0)`).**
- **Không có bất kỳ cảnh báo ngoại lệ unhandled promise rejection nào.**
