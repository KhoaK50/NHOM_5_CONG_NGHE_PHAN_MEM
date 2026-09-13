# 5share - Hệ thống Quản lý và Chia sẻ Tài liệu Học tập
> **Đơn vị:** Khoa Công nghệ Thông tin - Trường Đại học Sư phạm TP.HCM (HCMUE)  
> **Học phần:** Công nghệ Phần mềm (2611COMP104406) - Nhóm 5  
> **Tên miền sản xuất:** [5share.vectoria.io.vn](https://5share.vectoria.io.vn) | [5share.vercel.app](https://5share.vercel.app)

---

## 1. Giới thiệu dự án
**5share** là nền tảng web phục vụ số hóa quy trình lưu trữ, tra cứu, đọc trực tuyến và chia sẻ tài liệu học tập (định dạng PDF) bám sát chương trình đào tạo của ngành Sư phạm Tin học. Hệ thống giải quyết tình trạng phân tán tài liệu học tập, đồng thời thiết lập quy trình kiểm duyệt chất lượng nghiêm ngặt trước khi phát hành đến cộng đồng sinh viên.

## 2. Kiến trúc & Công nghệ (Tech Stack)
Hệ thống được thiết kế theo **Mô hình kiến trúc phân tầng 3 lớp (3-Tier Layered Architecture)**:

* **Tầng Trình diễn (Frontend):** ReactJS (Vite), Tailwind CSS, PDF Viewer Engine. Triển khai trên **Vercel Edge Network**.
* **Tầng Nghiệp vụ (Backend):** Node.js (ExpressJS), RESTful API, Stateless JWT Authentication & RBAC. Triển khai trên **Render Web Service**.
* **Tầng Dữ liệu (Database & Storage):**
  * Cơ sở dữ liệu quan hệ: **PostgreSQL** (chuẩn hóa 3NF).
  * Lưu trữ tệp tin: **Cloudinary** (Object Storage qua API an toàn).
* **Quản lý dự án:** Jira Software (`FSH`) theo phương pháp luận Agile/Scrum.

## 3. Cấu trúc thư mục (Repository Structure)
```text
NHOM_5_CONG_NGHE_PHAN_MEM/
├── client/          # Mã nguồn ứng dụng Frontend (ReactJS + Vite)
├── server/          # Mã nguồn dịch vụ Backend (Node.js + ExpressJS)
├── docs/            # Hồ sơ tài liệu kỹ nghệ phần mềm
│   ├── QUY_TRINH_CHUAN_HOA_SDLC.md
│   ├── lo-trinh-phan-tich-thiet-ke.md
│   └── huong-dan-truc-quan-san-pham-thiet-ke.md
├── AGENTS.md        # Quy chuẩn kiến trúc & nguyên tắc AI pair-programming
├── LICENSE          # Giấy phép nguồn mở MIT
└── README.md
```

## 4. Tài liệu kỹ thuật
* [Quy trình chuẩn hóa phát triển phần mềm (SDLC)](./docs/QUY_TRINH_CHUAN_HOA_SDLC.md)
* [Lộ trình phân tích & Thiết kế hệ thống](./docs/lo-trinh-phan-tich-thiet-ke.md)
* [Hướng dẫn trực quan các sơ đồ UML & ERD](./docs/huong-dan-truc-quan-san-pham-thiet-ke.md)

## 5. Giấy phép (License)
Dự án được phát hành theo giấy phép [MIT License](./LICENSE).
