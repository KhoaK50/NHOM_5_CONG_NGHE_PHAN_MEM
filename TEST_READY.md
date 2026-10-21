# BÁO CÁO CÔNG BỐ SẴN SÀNG KIỂM THỬ ĐẦU-CUỐI (TEST READY REPORT)
## DỰ ÁN: 5SHARE — NỀN TẢNG CHIA SẺ HỌC LIỆU SƯ PHẠM TIN HỌC (HCMUE)
**Trạng thái kiểm thử:** 🟢 **TEST_READY — 100% PASS**  
**Tập lệnh kiểm thử:** `node tests/e2e/runner.js`  
**Thời gian thực thi:** ~20 ms (Headless Self-Contained Runner)  
**Tổng số ca kiểm thử:** **154 / 154 Ca kiểm thử đạt chuẩn (0 lỗi, 0 cảnh báo)**

---

## 1. TỔNG QUAN KẾT QUẢ KIỂM THỬ THEO 4 TẦNG (4-TIER SUMMARY)

Bộ kiểm thử đầu-cuối tự động (E2E Test Suite) được thiết kế theo kiến trúc hộp mờ độc lập (Opaque-Box Testing), bám sát 100% tài liệu đặc tả SRS v2.1 (`docs/SRS_CHI_TIET_HE_THONG_5SHARE.md`) và Hợp đồng tái thiết kế (`PROJECT.md`):

| Tầng kiểm thử | Tên phương pháp luận | Số ca yêu cầu | Số ca thực tế | Kết quả | Tỷ lệ đạt |
|:---|:---|:---:|:---:|:---:|:---:|
| **Tier 1** | **Feature Coverage** (Category-Partition Method) | $\ge 65$ | **66** | `✔ PASS` | **100%** |
| **Tier 2** | **Boundary Value Analysis** (BVA) & Corner Cases | $\ge 65$ | **65** | `✔ PASS` | **100%** |
| **Tier 3** | **Pairwise Combinations** & Cross-Feature Interactions | $\ge 13$ | **15** | `✔ PASS` | **100%** |
| **Tier 4** | **Real-World Application Scenarios** (Multi-step Flows) | $\ge 7$ | **8** | `✔ PASS` | **100%** |
| **TỔNG CỘNG** | **Toàn bộ 4 Tầng Kiểm thử Đầu-Cuối** | **$\ge 150$** | **154** | `✔ PASS` | **100%** |

---

## 2. MA TRẬN ĐỘ BAO PHỦ 13 YÊU CẦU CHỨC NĂNG (FR TRACEABILITY MATRIX)

Toàn bộ 13 Yêu cầu Chức năng (Functional Requirements) và 13 Ca sử dụng (Use Cases) của Đồ án Công nghệ Phần mềm đã được kiểm thử độc lập:

| Mã FR | Tên phân hệ chức năng | Use Case | Số ca test | Trạng thái |
|:---|:---|:---:|:---:|:---:|
| **FR-01** | Xác thực người dùng & Quản lý phiên (JWT, Register, Login, Reset Token, RBAC) | UC01, UC02 | **13 ca** | `✔ PASS` |
| **FR-02** | Quản lý hồ sơ cá nhân & Bảo mật (Update Name, Cohort K48-K52, Avatar, Password, Chuông Notif) | UC03 | **10 ca** | `✔ PASS` |
| **FR-03** | Cấu trúc Danh mục Học thuật Sư phạm Tin (4 Khối kiến thức, 6 Học kỳ, Khung CTĐT) | Khung CTĐT | **10 ca** | `✔ PASS` |
| **FR-04** | Tra cứu & Bộ lọc đa tiêu chí (FTS unaccent không dấu, Lọc .pdf/.docx/.pptx, Phân trang 12/trang) | UC05 | **10 ca** | `✔ PASS` |
| **FR-05** | Xem chi tiết & Trình đọc trực tuyến (Khách khóa trang 4 vs SV đọc full, Google Docs Viewer) | UC06 | **12 ca** | `✔ PASS` |
| **FR-06** | Đóng góp học liệu & 4 Tầng Phòng thủ (.pdf/.docx/.pptx, $\le 25\text{MB}$, Magic Bytes, SHA-256) | UC07, UC08 | **14 ca** | `✔ PASS` |
| **FR-07** | Hàng đợi kiểm duyệt 8 tiêu chí (Pending Queue, 8 Tiêu chí, Duyệt +20 điểm, Từ chối kèm lý do) | UC09 | **11 ca** | `✔ PASS` |
| **FR-08** | Quản trị Danh mục & Quản lý Người dùng (Chặn xóa môn có tài liệu FK Block, Khóa/Mở tài khoản) | UC10 | **15 ca** | `✔ PASS` |
| **FR-09** | Kho tài liệu cá nhân (My Library: Bookmark Yêu thích, Tài liệu của tôi PENDING/APPROVED/REJECTED) | UC11, UC12 | **11 ca** | `✔ PASS` |
| **FR-10** | Đánh giá chất lượng & Bình luận trao đổi (Đánh giá 1–5 sao, Tính điểm trung bình, Xóa bình luận) | UC13 | **11 ca** | `✔ PASS` |
| **FR-11** | Báo cáo vi phạm & Hòm thư góp ý (Báo cáo vi phạm chuẩn, Admin Ẩn/Bác bỏ, Góp ý hệ thống) | UC04 | **12 ca** | `✔ PASS` |
| **FR-12** | Treo thưởng học liệu (Study Bounty) & Bảng xếp hạng (+50 điểm chào mừng, Trừ ví tạm giữ, Top 10) | Gamification | **13 ca** | `✔ PASS` |
| **FR-13** | Quản lý lượt tải & Dashboard Quản trị (Khách giới hạn 3 lượt/ngày, Sinh viên tải tự do, KPI Analytics) | UC12, UC11 | **12 ca** | `✔ PASS` |

---

## 3. DANH SÁCH 8 KỊCH BẢN THẾ GIỚI THỰC ĐÃ KIỂM CHỨNG (TIER 4)

1. **Kịch bản 01 (`T4_SCEN_01`):** Hành trình Sinh viên mới gia nhập, hoàn thiện hồ sơ nhận +50 điểm, upload giáo án PDF qua 4 tầng kiểm tra, Admin thẩm định 8 tiêu chí và duyệt, tác giả nhận +20 điểm (tổng 70) và tài liệu xuất bản công khai.
2. **Kịch bản 02 (`T4_SCEN_02`):** Chuyển đổi Khách vãng lai sang Sinh viên: Đọc mượt mà trang 1-3, trang 4 bị khóa; tải 3 tệp chạm trần 3 lượt/ngày; lần tải thứ 4 bị chặn; Khách đăng ký tài khoản Sinh viên; mở khóa toàn văn và tải tệp tự do.
3. **Kịch bản 03 (`T4_SCEN_03`):** Nền kinh tế tri thức Study Bounty: Sinh viên A treo thưởng 50 điểm (trừ ví 140 xuống 90); Sinh viên B upload đúng tài liệu giải thưởng; Admin duyệt; B nhận điểm thưởng chuyển giao; Bảng xếp hạng Top 10 cập nhật B lên vị trí số 1.
4. **Kịch bản 04 (`T4_SCEN_04`):** Bảo vệ liêm chính học thuật: Sinh viên phát hiện tài liệu sai lệch gửi Báo cáo vi phạm; Admin kiểm duyệt hàng đợi báo cáo; chọn "Ẩn/Xóa tài liệu"; tài liệu bị gỡ khỏi kho công khai và tác giả nhận phản hồi trong Tủ sách cá nhân.
5. **Kịch bản 05 (`T4_SCEN_05`):** Vòng đời học liệu đa định dạng (.docx/.pptx): Upload bài giảng PowerPoint có chữ ký nhị phân `PK..`; tìm kiếm FTS không dấu; xem trực tuyến qua Google Docs Viewer iframe; chia sẻ liên kết; cộng đồng đánh giá 5★ và để lại bình luận.
6. **Kịch bản 06 (`T4_SCEN_06`):** Cập nhật CTĐT & Ràng buộc toàn vẹn khóa ngoại (FK Block): Admin cố xóa môn COMP1015 đang có tài liệu liên kết bị hệ thống chặn triệt để; Admin tạo môn học mới rỗng và thao tác xóa môn rỗng thành công.
7. **Kịch bản 07 (`T4_SCEN_07`):** Cách ly người dùng vi phạm: Kẻ xấu đổi đuôi tệp EXE thành .pdf bị chặn ở Tầng 2 Magic Bytes; Admin khóa tài khoản (`isActive = false`); người dùng bị chặn toàn bộ thao tác và gửi phản hồi qua Hòm thư góp ý.
8. **Kịch bản 08 (`T4_SCEN_08`):** Chu trình khôi phục mật khẩu & Quản lý phiên: Người dùng quên mật khẩu nhận token 15 phút; thử mật khẩu yếu bị chặn; đặt mật khẩu mới an toàn; token cũ bị hủy; đăng nhập mật khẩu mới nhận JWT 24h.

---

## 4. HƯỚNG DẪN CHẠY KIỂM THỬ

### Lệnh thực thi toàn bộ:
```bash
node tests/e2e/runner.js
```

### Các tùy chọn nâng cao:
```bash
# Xem chi tiết từng ca kiểm thử thành công:
node tests/e2e/runner.js --verbose

# Chạy riêng từng tầng kiểm thử:
node tests/e2e/runner.js --tier=1   # 66 ca Feature Coverage
node tests/e2e/runner.js --tier=2   # 65 ca Boundary Value Analysis
node tests/e2e/runner.js --tier=3   # 15 ca Cross-Feature Combinations
node tests/e2e/runner.js --tier=4   # 8 ca Real-World Scenarios

# Chạy riêng theo mã yêu cầu chức năng (FR):
node tests/e2e/runner.js --fr=06   # Chạy 14 ca của FR-06 (Upload & 4 Tầng Phòng thủ)
node tests/e2e/runner.js --fr=07   # Chạy 11 ca của FR-07 (Admin Moderation & 8 Tiêu chí)
```

---

## 5. KẾT LUẬN & CHỮ KÝ PHÊ DUYỆT

Bộ kiểm thử đầu-cuối tự động (E2E Test Suite) được đóng gói hoàn chỉnh tại thư mục `tests/e2e/`, vận hành độc lập, ổn định và tự động xác thực toàn bộ các luồng nghiệp vụ của hệ thống 5Share.

- **Mã nguồn kiểm thử:** `tests/e2e/runner.js`, `tests/e2e/domain.js`, `tests/e2e/fixtures.js`, `tests/e2e/harness.js`, `tests/e2e/tier1_features.js`, `tests/e2e/tier2_boundaries.js`, `tests/e2e/tier3_combinations.js`, `tests/e2e/tier4_scenarios.js`.
- **Đặc tả kiến trúc kiểm thử:** `TEST_INFRA.md`.
- **Tình trạng:** Sẵn sàng nghiệm thu và tích hợp vào quy trình CI/CD.
