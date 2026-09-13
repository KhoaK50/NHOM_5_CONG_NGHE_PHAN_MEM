# DỰ ÁN: HỆ THỐNG QUẢN LÝ VÀ CHIA SẺ TÀI LIỆU HỌC TẬP CHO SINH VIÊN NGÀNH SƯ PHẠM TIN HỌC

## 1. Bối cảnh dự án
- Tên dự án: 5share
- Mục tiêu: Nền tảng chia sẻ, tra cứu, xem trước và đánh giá tài liệu học tập (định dạng PDF) bám sát chương trình đào tạo ngành Sư phạm Tin học - ĐH Sư phạm TP.HCM (HCMUE).
- Đối tượng sử dụng: Khách (Guest), Sinh viên (User), Quản trị viên (Admin).

## 2. Quy chuẩn kiến trúc & Công nghệ (BẮT BUỘC TUÂN THỦ)
- **Kiến trúc:** Mô hình phân tầng 3 lớp (3-Tier Layered Architecture) kết hợp RESTful API.
- **Frontend:**
  - Framework: ReactJS (Vite) + Tailwind CSS.
  - Trình đọc PDF trực tuyến: Thư viện PDF Viewer (@react-pdf-viewer/core hoặc PDF.js).
  - Responsive 100% cho cả Desktop và Mobile.
- **Backend:**
  - Runtime & Framework: Node.js (ExpressJS) viết theo mô hình phân tầng: Controllers -> Services -> Data Access.
  - Xác thực & Phân quyền: JWT (Token-based Authentication) phân quyền Role: USER, ADMIN.
- **Cơ sở dữ liệu:** PostgreSQL.
- **Lưu trữ tệp tin:** Cloudinary (Lưu trữ và phân phối tệp PDF, trả về URL an toàn).
- **Triển khai & Vận hành:** Vercel (Frontend), Render (Backend), Custom Domain (.io.vn).

## 3. Quy ước đặt tên & Mã nguồn (Naming Conventions)
- **Cơ sở dữ liệu:** Tên bảng là snake_case số nhiều (`users`, `documents`, `categories`), tên cột là snake_case (`file_url`, `uploader_id`).
- **Code TypeScript/JavaScript:** Biến và hàm dùng `camelCase`, Class/Component dùng `PascalCase`.
- **API URL:** Chữ thường, kebab-case, số nhiều: `/api/documents`, `/api/categories`, `/api/admin/pending`.

## 4. Quy trình làm việc với Git
- KHÔNG commit trực tiếp lên nhánh `main`.
- Mọi tính năng phải tạo nhánh riêng: `feature/<ten-tinh-nang>`.
- Tạo Pull Request (PR) để nhóm trưởng review và merge vào `main`.
