-- ============================================================================
-- LƯỢC ĐỒ CƠ SỞ DỮ LIỆU POSTGRESQL (SUPABASE / TABLEPLUS) - DỰ ÁN 5SHARE
-- Chuẩn hóa 100% theo Bảng Đặc tả Thực thể (14 Bảng - 4 Sự kiện Nghiệp vụ)
-- Bao gồm cấu hình GRANT tương thích chính sách mới của Supabase (30/10)
-- ============================================================================

BEGIN;

-- Kích hoạt extension hỗ trợ tìm kiếm tiếng Việt không dấu (Full-Text Search UC05)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- TAB 1: SỰ KIỆN TÀI KHOẢN, XÁC THỰC & TỦ TÀI LIỆU CÁ NHÂN
-- ============================================================================

-- 1. Thực thể mạnh: USERS (Người dùng / Tài khoản Sinh viên & Quản trị viên)
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    student_code VARCHAR(20) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL CHECK (email LIKE '%@%'),
    password_hash VARCHAR(255) NOT NULL,
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'local' CHECK (auth_provider IN ('local', 'google')),
    google_id VARCHAR(255) UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'ADMIN')),
    cohort VARCHAR(10) DEFAULT 'K50',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'locked', 'banned')),
    avatar_url VARCHAR(255) DEFAULT '/avatars/default.png',
    token_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Thực thể yếu (1--N USERS): LOGIN_HISTORY (Lịch sử đăng nhập)
CREATE TABLE IF NOT EXISTS public.login_history (
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_trusted BOOLEAN DEFAULT TRUE,
    ip_address VARCHAR(45),
    device_info VARCHAR(255),
    PRIMARY KEY (user_id, login_at)
);

-- 3. Thực thể yếu (1--N USERS): PASSWORD_RESET (Khôi phục mật khẩu)
CREATE TABLE IF NOT EXISTS public.password_reset (
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, token),
    CHECK (expires_at > created_at)
);

-- 4. Thực thể yếu (1--1 USERS): ACCOUNT_ACTIVATION (Xác thực kích hoạt tài khoản)
CREATE TABLE IF NOT EXISTS public.account_activation (
    user_id INT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    activation_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK (expires_at > created_at)
);

-- ============================================================================
-- TAB 2: SỰ KIỆN ĐÓNG GÓP, KIỂM TRA TRÙNG LẶP SHA-256 & KIỂM DUYỆT HỌC LIỆU
-- ============================================================================

-- 5. Thực thể mạnh: COURSES (Danh mục môn học / Học phần CTĐT SPTH - UC10)
CREATE TABLE IF NOT EXISTS public.courses (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(20) UNIQUE NOT NULL,
    course_name VARCHAR(150) NOT NULL,
    knowledge_block VARCHAR(50) NOT NULL CHECK (knowledge_block IN ('DAI_CUONG', 'CO_SO_NGANH', 'CHUYEN_NGANH', 'NGHIEP_VU_SU_PHAM')),
    credits SMALLINT NOT NULL DEFAULT 3 CHECK (credits BETWEEN 1 AND 10),
    semester SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 8),
    summary VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Thực thể mạnh trung tâm: DOCUMENTS (Tài liệu học tập - UC07, UC08, UC09)
CREATE TABLE IF NOT EXISTS public.documents (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    uploader_id INT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    reviewed_by INT REFERENCES public.users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    doc_type VARCHAR(40) NOT NULL CHECK (doc_type IN ('GIAO_TRINH', 'SLIDE_BAI_GIANG', 'DE_THI_DAP_AN', 'KHBD_5512', 'DO_AN_MAU', 'TAI_LIEU_THAM_KHAO')),
    academic_year VARCHAR(15) NOT NULL DEFAULT '2025-2026',
    lecturer_name VARCHAR(100),
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    preview_url VARCHAR(500),
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800),
    page_count INT NOT NULL DEFAULT 1 CHECK (page_count >= 1),
    file_hash CHAR(64) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN', 'DELETED')),
    reject_reason TEXT,
    total_views INT NOT NULL DEFAULT 0 CHECK (total_views >= 0),
    total_downloads INT NOT NULL DEFAULT 0 CHECK (total_downloads >= 0),
    rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (rating_avg >= 0.00 AND rating_avg <= 5.00),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Thực thể kết hợp (USERS - DOCUMENTS): BOOKMARKS (Tủ tài liệu cá nhân - UC12)
CREATE TABLE IF NOT EXISTS public.bookmarks (
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_id INT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    note VARCHAR(255),
    saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id, document_id)
);

-- 8. Thực thể yếu (N--1 DOCUMENTS): MODERATION_LOGS (Nhật ký lịch sử kiểm duyệt - UC09, UC11)
CREATE TABLE IF NOT EXISTS public.moderation_logs (
    document_id INT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    action_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor_id INT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL CHECK (new_status IN ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN', 'DELETED')),
    review_note TEXT,
    PRIMARY KEY (document_id, action_at)
);

-- ============================================================================
-- TAB 3: SỰ KIỆN TRA CỨU, XEM TRƯỚC 3 TRANG, ĐỌC TOÀN VĂN & TẢI TÀI LIỆU
-- ============================================================================

-- 9. Thực thể kết hợp (USERS - DOCUMENTS): USER_DOCUMENT_HISTORY (Lịch sử đọc & tiến độ trang)
CREATE TABLE IF NOT EXISTS public.user_document_history (
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_id INT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    last_read_page INT NOT NULL DEFAULT 1 CHECK (last_read_page >= 1),
    last_read_percent NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (last_read_percent >= 0.00 AND last_read_percent <= 100.00),
    download_count_by_user INT NOT NULL DEFAULT 0 CHECK (download_count_by_user >= 0),
    visited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, document_id)
);

-- 10. Thực thể yếu (N--1 DOCUMENTS): DOCUMENT_ACCESS_LOGS (Nhật ký lượt xem & tải phục vụ Dashboard UC11)
CREATE TABLE IF NOT EXISTS public.document_access_logs (
    id BIGSERIAL PRIMARY KEY,
    document_id INT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id INT REFERENCES public.users(id) ON DELETE SET NULL,
    action_type VARCHAR(25) NOT NULL CHECK (action_type IN ('PREVIEW_3_PAGES', 'VIEW_FULL_PDF', 'DOWNLOAD_FILE')),
    ip_address VARCHAR(45),
    accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TAB 4: SỰ KIỆN TƯƠNG TÁC HỌC THUẬT, BÁO CÁO VI PHẠM, THÔNG BÁO & QUẢN TRỊ WEB
-- ============================================================================

-- 11. Thực thể kết hợp (USERS - DOCUMENTS): RATINGS (Đánh giá điểm sao học liệu - UC13)
CREATE TABLE IF NOT EXISTS public.ratings (
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_id INT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    rated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, document_id)
);

-- 12. Thực thể mạnh có tự tham chiếu đệ quy: DOCUMENT_COMMENTS (Bình luận học thuật - UC13)
CREATE TABLE IF NOT EXISTS public.document_comments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_id INT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    parent_comment_id INT REFERENCES public.document_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(TRIM(content)) BETWEEN 2 AND 2000),
    upvote_count INT NOT NULL DEFAULT 0 CHECK (upvote_count >= 0),
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. Thực thể kết hợp (DOCUMENT_COMMENTS - USERS): COMMENT_UPVOTES (Bình chọn bình luận bổ ích)
CREATE TABLE IF NOT EXISTS public.comment_upvotes (
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    comment_id INT NOT NULL REFERENCES public.document_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, comment_id)
);

-- 14. Thực thể kết hợp (USERS - DOCUMENTS): DOCUMENT_REPORTS (Báo cáo tài liệu vi phạm - UC04, UC09)
CREATE TABLE IF NOT EXISTS public.document_reports (
    id SERIAL PRIMARY KEY,
    reporter_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    document_id INT NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    resolved_by INT REFERENCES public.users(id) ON DELETE SET NULL,
    reason_category VARCHAR(50) NOT NULL CHECK (reason_category IN ('SAI_KIEN_THUC', 'KHONG_CHUAN_5512', 'LOI_HIEN_THI_MO', 'SAI_MON_HOC', 'VI_PHAM_BAN_QUYEN', 'NOI_DUNG_RAC')),
    description TEXT NOT NULL,
    status VARCHAR(25) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED_HIDDEN', 'RESOLVED_DELETED', 'DISMISSED')),
    admin_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- 15. Thực thể yếu (N--1 USERS): NOTIFICATIONS (Thông báo hệ thống trên Chuông - UC03)
CREATE TABLE IF NOT EXISTS public.notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    related_document_id INT REFERENCES public.documents(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('DOC_APPROVED', 'DOC_REJECTED', 'DOC_HIDDEN', 'NEW_COMMENT', 'REPORT_RESOLVED', 'SYSTEM')),
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. Thực thể yếu (N--1 USERS): ADMIN_LOGS (Nhật ký thao tác Quản trị viên)
CREATE TABLE IF NOT EXISTS public.admin_logs (
    log_id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type VARCHAR(30) NOT NULL,
    entity_type VARCHAR(30) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action_details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CẤU HÌNH QUYỀN TRUY CẬP SUPABASE DATA API (Tương thích thay đổi ngày 30/10 của Supabase)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
    END IF;
END
$$;

COMMIT;


-- ============================================================================
-- DỮ LIỆU MẪU CHUẨN HÓA (SEED DATA) - DỰ ÁN 5SHARE (SPTH - HCMUE)
-- Khớp 100% với 16 bảng trong server/schema_5share.sql
-- ============================================================================

BEGIN;

-- 1. USERS (6 tài khoản: 5 thành viên Nhóm 5 + 1 tài khoản kiểm thử khóa)
INSERT INTO public.users (id, student_code, full_name, email, password_hash, auth_provider, google_id, role, cohort, status, avatar_url, token_version)
VALUES
  (1, '5001104001', 'Nguyễn Trần Đăng Khoa', 'khoantd.spth@hcmue.edu.vn', '$2b$10$5ShareHashAdminKhoa2026HCMUE999999999999999999999999', 'local', NULL, 'ADMIN', 'K50', 'active', '/avatars/khoa.png', 1),
  (2, '5001104002', 'Lê Nguyễn Thùy Trâm', 'tramlnt.spth@hcmue.edu.vn', '$2b$10$5ShareHashStudentTram2026HCMUE8888888888888888888888', 'local', NULL, 'STUDENT', 'K50', 'active', '/avatars/tram.png', 1),
  (3, '5001104003', 'Phan Triệu Vĩ', 'vipt.spth@hcmue.edu.vn', '$2b$10$5ShareHashStudentVi2026HCMUE777777777777777777777777', 'google', 'google-oauth2|5001104003', 'STUDENT', 'K50', 'active', '/avatars/vi.png', 1),
  (4, '5001104004', 'Nguyễn Hoàng Danh', 'danhnh.spth@hcmue.edu.vn', '$2b$10$5ShareHashStudentDanh2026HCMUE6666666666666666666666', 'local', NULL, 'STUDENT', 'K50', 'active', '/avatars/danh.png', 1),
  (5, '5001104005', 'Trần Đức Đạt', 'dattd.spth@hcmue.edu.vn', '$2b$10$5ShareHashStudentDat2026HCMUE55555555555555555555555', 'local', NULL, 'STUDENT', 'K50', 'active', '/avatars/dat.png', 1),
  (6, '4801104099', 'Trần Văn Nam', 'namtv.spth@hcmue.edu.vn', '$2b$10$5ShareHashStudentNam2026HCMUE44444444444444444444444', 'local', NULL, 'STUDENT', 'K48', 'locked', '/avatars/default.png', 2)
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.users', 'id'), (SELECT MAX(id) FROM public.users));

-- 2. LOGIN_HISTORY
INSERT INTO public.login_history (user_id, login_at, is_trusted, ip_address, device_info)
VALUES
  (1, CURRENT_TIMESTAMP - INTERVAL '2 hours', TRUE, '14.161.22.101', 'Chrome 130 / Windows 11 Pro'),
  (2, CURRENT_TIMESTAMP - INTERVAL '1 hour', TRUE, '113.161.78.45', 'Edge 130 / Windows 11'),
  (3, CURRENT_TIMESTAMP - INTERVAL '30 minutes', TRUE, '27.74.120.12', 'Safari 18 / macOS Sequoia'),
  (4, CURRENT_TIMESTAMP - INTERVAL '3 hours', TRUE, '115.78.10.22', 'Chrome 130 / Windows 10'),
  (5, CURRENT_TIMESTAMP - INTERVAL '4 hours', TRUE, '171.244.18.90', 'Firefox 132 / Ubuntu Linux')
ON CONFLICT DO NOTHING;

-- 3. PASSWORD_RESET
INSERT INTO public.password_reset (user_id, token, created_at, expires_at, is_used)
VALUES
  (2, 'rst_5share_k50_tram_9a8b7c6d5e4f3a2b1c0d', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day', TRUE),
  (4, 'rst_5share_k50_danh_1f2e3d4c5b6a79880011', CURRENT_TIMESTAMP - INTERVAL '10 minutes', CURRENT_TIMESTAMP + INTERVAL '50 minutes', FALSE)
ON CONFLICT DO NOTHING;

-- 4. ACCOUNT_ACTIVATION
INSERT INTO public.account_activation (user_id, activation_token, created_at, expires_at, is_used)
VALUES
  (1, 'act_khoa_5001104001', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '29 days', TRUE),
  (2, 'act_tram_5001104002', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '29 days', TRUE),
  (3, 'act_vi_5001104003', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '29 days', TRUE),
  (4, 'act_danh_5001104004', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '29 days', TRUE),
  (5, 'act_dat_5001104005', CURRENT_TIMESTAMP - INTERVAL '30 days', CURRENT_TIMESTAMP - INTERVAL '29 days', TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- 5. COURSES (Danh mục Học phần chuẩn CTĐT Sư phạm Tin học HCMUE)
INSERT INTO public.courses (id, course_code, course_name, knowledge_block, credits, semester, summary, is_active)
VALUES
  (1, 'COMP1010', 'Lập trình cơ bản', 'CO_SO_NGANH', 3, 1, 'Nhập môn tư duy thuật toán và lập trình C++ căn bản cho sinh viên SPTH.', TRUE),
  (2, 'COMP1013', 'Lập trình nâng cao', 'CO_SO_NGANH', 3, 2, 'Kỹ thuật đệ quy, con trỏ, cấu trúc dữ liệu cơ bản và STL trong C++.', TRUE),
  (3, 'COMP1016', 'Cấu trúc dữ liệu', 'CO_SO_NGANH', 3, 3, 'Danh sách liên kết, ngăn xếp, hàng đợi, cây nhị phân tìm kiếm, bảng băm và đồ thị.', TRUE),
  (4, 'COMP1018', 'Cơ sở dữ liệu', 'CO_SO_NGANH', 3, 4, 'Mô hình thực thể kết hợp ERD, đại số quan hệ, chuẩn hóa lược đồ 3NF/BCNF và ngôn ngữ SQL.', TRUE),
  (5, 'COMP1015', 'Nhập môn Mạng máy tính', 'CO_SO_NGANH', 3, 5, 'Mô hình OSI, TCP/IP, định tuyến IP, chia mạng con Subnetting và giao thức tầng ứng dụng.', TRUE),
  (6, 'COMP1401', 'Phân tích và thiết kế giải thuật', 'CO_SO_NGANH', 3, 4, 'Độ phức tạp thuật toán, Chia để trị, Quy hoạch động, Tham lam và Quay lui.', TRUE),
  (7, 'COMP1044', 'Nhập môn Công nghệ phần mềm', 'CHUYEN_NGANH', 3, 5, 'Quy trình SDLC, phân tích yêu cầu SRS, UML Use Case/BFD/DFD/ERD, thiết kế kiến trúc và kiểm thử.', TRUE),
  (8, 'COMP1701', 'Lý thuyết đồ thị và ứng dụng', 'CO_SO_NGANH', 3, 3, 'Đồ thị Euler, Hamilton, cây khung nhỏ nhất (Prim, Kruskal), đường đi ngắn nhất (Dijkstra, Bellman-Ford).', TRUE),
  (9, 'COMP1712', 'Học máy', 'CHUYEN_NGANH', 3, 6, 'Các thuật toán học có giám sát, không giám sát, cây quyết định, SVM và mạng nơ-ron nhân tạo.', TRUE),
  (10, 'EDUC2802', 'Giáo dục học', 'NGHIEP_VU_SU_PHAM', 4, 3, 'Lý luận dạy học và giáo dục đại cương trong nhà trường phổ thông.', TRUE),
  (11, 'COMP1818', 'Phương pháp dạy học Tin học', 'NGHIEP_VU_SU_PHAM', 3, 5, 'Thiết kế Kế hoạch bài dạy (KHBD) môn Tin học theo Công văn 5512 và Chương trình GDPT 2018.', TRUE),
  (12, 'COMP1819', 'Kiểm tra đánh giá trong giáo dục Tin học', 'NGHIEP_VU_SU_PHAM', 3, 6, 'Xây dựng ma trận đặc tả đề kiểm tra định kỳ môn Tin học phát triển phẩm chất và năng lực.', TRUE),
  (13, 'POLI2001', 'Triết học Mác – Lênin', 'DAI_CUONG', 3, 1, 'Chủ nghĩa duy vật biện chứng và chủ nghĩa duy vật lịch sử.', TRUE),
  (14, 'COMP1048', 'Khóa luận tốt nghiệp Sư phạm Tin học', 'CHUYEN_NGANH', 6, 8, 'Nghiên cứu khoa học giáo dục Tin học và phát triển hệ thống phần mềm hỗ trợ dạy học.', TRUE)
ON CONFLICT (id) DO UPDATE SET
  course_code = EXCLUDED.course_code,
  course_name = EXCLUDED.course_name,
  knowledge_block = EXCLUDED.knowledge_block,
  semester = EXCLUDED.semester;

SELECT setval(pg_get_serial_sequence('public.courses', 'id'), (SELECT MAX(id) FROM public.courses));

-- 6. DOCUMENTS (Học liệu SPTH đã thẩm định & đang chờ duyệt, kèm mã băm SHA-256 64 ký tự chuẩn)
INSERT INTO public.documents (
  id, course_id, uploader_id, reviewed_by, title, description, doc_type, academic_year,
  lecturer_name, file_name, file_url, preview_url, file_size_bytes, page_count, file_hash,
  status, reject_reason, total_views, total_downloads, rating_avg, reviewed_at
)
VALUES
  (
    1, 11, 2, 1,
    'Kế hoạch bài dạy (KHBD) Tin học 10 - Chủ đề F: Giải quyết vấn đề với sự trợ giúp của máy tính (Chuẩn Công văn 5512)',
    'Bộ giáo án/KHBD chi tiết môn Tin học 10 định hướng Khoa học máy tính (CS), thiết kế đủ 4 hoạt động học tập theo Công văn 5512/BGDĐT-GDTrH kèm phiếu học tập và rubric đánh giá.',
    'KHBD_5512', '2025-2026', 'TS. Nguyễn Văn Hùng',
    'KHBD_Tin10_ChuDeF_CongVan5512_HCMUE.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/KHBD_Tin10_ChuDeF_CongVan5512_HCMUE.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/preview_doc_01.pdf',
    2458624, 18, 'a1b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f801',
    'APPROVED', NULL, 420, 185, 4.90, CURRENT_TIMESTAMP - INTERVAL '10 days'
  ),
  (
    2, 3, 3, 1,
    'Giáo trình & Bộ đề luyện tập Cấu trúc dữ liệu và Giải thuật C++ (Cây AVL, Bảng băm, Đồ thị)',
    'Tài liệu tổng hợp lý thuyết cốt lõi kèm cài đặt mã nguồn C++ chuẩn cho Cây nhị phân cân bằng AVL, Bảng băm xử lý đụng độ và các thuật toán duyệt đồ thị BFS/DFS.',
    'GIAO_TRINH', '2025-2026', 'ThS. Lê Minh Tuấn',
    'GiaoTrinh_CTDL_GT_AVL_Hash_HCMUE.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/GiaoTrinh_CTDL_GT_AVL_Hash_HCMUE.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/preview_doc_02.pdf',
    4194304, 32, 'b2c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f80102',
    'APPROVED', NULL, 512, 234, 4.85, CURRENT_TIMESTAMP - INTERVAL '9 days'
  ),
  (
    3, 7, 1, 1,
    'Đặc tả Yêu cầu Phần mềm (SRS chuẩn IEEE 29148) & Bộ sơ đồ BFD, DFD, ERD mẫu môn Nhập môn Công nghệ Phần mềm',
    'Tài liệu hướng dẫn thực hành phân tích thiết kế hệ thống thông tin theo chuẩn IEEE 29148: Ma trận truy vết Use Case, phân rã BFD, DFD mức 0-1-2 và thiết kế lược đồ CSDL mức vật lý.',
    'DO_AN_MAU', '2025-2026', 'TS. Trần Hữu Quốc Thư',
    'Mau_BaoCao_SRS_BFD_DFD_ERD_COMP1044.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/Mau_BaoCao_SRS_BFD_DFD_ERD_COMP1044.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/preview_doc_03.pdf',
    3670016, 28, 'c3d4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8010203',
    'APPROVED', NULL, 640, 310, 5.00, CURRENT_TIMESTAMP - INTERVAL '8 days'
  ),
  (
    4, 4, 4, 1,
    'Chuyên đề Chuẩn hóa Cơ sở dữ liệu (1NF, 2NF, 3NF, BCNF) & Tối ưu hóa truy vấn PostgreSQL',
    'Tổng hợp phương pháp tìm bao đóng tập thuộc tính, phủ tối thiểu, kiểm tra phép tách bảo toàn thông tin và thực hành đánh chỉ mục GIN/B-Tree trên PostgreSQL.',
    'SLIDE_BAI_GIANG', '2025-2026', 'TS. Nguyễn Thị Hồng',
    'ChuyenDe_ChuanHoa_CSDL_PostgreSQL_COMP1018.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/ChuyenDe_ChuanHoa_CSDL_PostgreSQL_COMP1018.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/preview_doc_04.pdf',
    2883584, 24, 'd4e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f801020304',
    'APPROVED', NULL, 390, 176, 4.75, CURRENT_TIMESTAMP - INTERVAL '7 days'
  ),
  (
    5, 5, 5, 1,
    'Đề thi kết thúc học phần Nhập môn Mạng máy tính COMP1015 (Kèm đáp án chi tiết chia mạng con VLSM)',
    'Tuyển tập 05 đề thi kết thúc học phần Mạng máy tính tại ĐH Sư phạm TP.HCM kèm lời giải chi tiết bài toán chia Subnet VLSM, bảng định tuyến tĩnh và phân tích gói tin Wireshark.',
    'DE_THI_DAP_AN', '2025-2026', 'ThS. Phạm Quốc Bảo',
    'DeThi_DapAn_MangMayTinh_COMP1015_VLSM.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/DeThi_DapAn_MangMayTinh_COMP1015_VLSM.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/preview_doc_05.pdf',
    1966080, 14, 'e5f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f80102030405',
    'APPROVED', NULL, 530, 245, 4.80, CURRENT_TIMESTAMP - INTERVAL '6 days'
  ),
  (
    6, 6, 2, 1,
    'Tuyển tập 60 bài toán Quy hoạch động và Đệ quy quay lui trong C++ (Phân tích và Thiết kế Giải thuật)',
    'Phân loại các dạng bài Quy hoạch động kinh điển (Balo, Dãy con tăng dài nhất, Biến đổi xâu, Đường đi trên lưới) kèm phân tích độ phức tạp thời gian và không gian.',
    'TAI_LIEU_THAM_KHAO', '2025-2026', 'TS. Hoàng Văn Nam',
    'TuyenTap_60_BaiToan_QuyHoachDong_COMP1401.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/TuyenTap_60_BaiToan_QuyHoachDong_COMP1401.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/preview_doc_06.pdf',
    3145728, 24, 'f60718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f8010203040506',
    'APPROVED', NULL, 465, 210, 4.80, CURRENT_TIMESTAMP - INTERVAL '5 days'
  ),
  (
    7, 12, 3, NULL,
    'Ma trận & Bản đặc tả đề kiểm tra cuối kỳ I môn Tin học 11 theo định hướng Tin học ứng dụng (ICT)',
    'Hồ sơ xây dựng đề kiểm tra định kỳ gồm 4 mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao) bám sát Thông tư 22/2021/TT-BGDĐT.',
    'KHBD_5512', '2025-2026', 'TS. Nguyễn Văn Hùng',
    'MaTran_DacTa_DeKiemTra_Tin11_ICT.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/MaTran_DacTa_DeKiemTra_Tin11_ICT.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/preview_doc_07.pdf',
    1835008, 15, '0718293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f801020304050607',
    'PENDING', NULL, 12, 0, 0.00, NULL
  ),
  (
    8, 1, 4, 1,
    'Bản chụp nháp bài tập chuỗi ký tự C++ (Ảnh chụp thiếu trang)',
    'File tổng hợp nháp bài tập thực hành buổi 3.',
    'TAI_LIEU_THAM_KHAO', '2025-2026', 'ThS. Lê Minh Tuấn',
    'BanChup_Nhap_ChuoiKyTu_ThieuTrang.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/BanChup_Nhap_ChuoiKyTu_ThieuTrang.pdf',
    'https://res.cloudinary.com/demo/image/upload/v1/5share/preview_doc_08.pdf',
    1048576, 4, '18293a4b5c6d7e8f901a2b3c4d5e6f708192a3b4c5d6e7f80102030405060708',
    'REJECTED', 'Vi phạm Tiêu chí 3 & Tiêu chí 5: Bản chụp bị mờ, xoay ngang và thiếu lời giải từ câu 4 đến câu 10. Vui lòng xuất PDF rõ nét trước khi tải lên lại.',
    8, 0, 0.00, CURRENT_TIMESTAMP - INTERVAL '2 days'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  reject_reason = EXCLUDED.reject_reason,
  total_views = EXCLUDED.total_views,
  total_downloads = EXCLUDED.total_downloads,
  rating_avg = EXCLUDED.rating_avg;

SELECT setval(pg_get_serial_sequence('public.documents', 'id'), (SELECT MAX(id) FROM public.documents));

-- 7. BOOKMARKS
INSERT INTO public.bookmarks (user_id, document_id, note, saved_at, is_pinned)
VALUES
  (2, 3, 'Tài liệu mẫu cực chuẩn để làm báo cáo Chương 2 & Chương 3 môn CNPM', CURRENT_TIMESTAMP - INTERVAL '5 days', TRUE),
  (2, 2, 'Ôn thi giữa kỳ Cấu trúc dữ liệu phần Cây AVL', CURRENT_TIMESTAMP - INTERVAL '4 days', TRUE),
  (2, 4, 'Xem lại thuật toán tìm phủ tối thiểu và chuẩn 3NF', CURRENT_TIMESTAMP - INTERVAL '2 days', FALSE),
  (3, 1, 'Tham khảo cấu trúc 4 hoạt động KHBD Công văn 5512', CURRENT_TIMESTAMP - INTERVAL '3 days', TRUE),
  (4, 5, 'Luyện giải đề chia mạng con VLSM', CURRENT_TIMESTAMP - INTERVAL '1 day', FALSE)
ON CONFLICT (user_id, document_id) DO NOTHING;

-- 8. MODERATION_LOGS
INSERT INTO public.moderation_logs (document_id, action_at, actor_id, old_status, new_status, review_note)
VALUES
  (1, CURRENT_TIMESTAMP - INTERVAL '10 days', 1, 'PENDING', 'APPROVED', 'Đạt đủ 8/8 tiêu chí thẩm định học thuật SPTH. KHBD trình bày đúng chuẩn Công văn 5512.'),
  (2, CURRENT_TIMESTAMP - INTERVAL '9 days', 1, 'PENDING', 'APPROVED', 'Đạt 8/8 tiêu chí. Code C++ minh họa cây AVL chạy chính xác, trình bày LaTeX sạch sẽ.'),
  (3, CURRENT_TIMESTAMP - INTERVAL '8 days', 1, 'PENDING', 'APPROVED', 'Đạt 8/8 tiêu chí. Bộ sơ đồ BFD/DFD/ERD chuẩn ký pháp Gane & Sarson.'),
  (8, CURRENT_TIMESTAMP - INTERVAL '2 days', 1, 'PENDING', 'REJECTED', 'Không đạt tiêu chí độ nét và tính toàn vẹn nội dung.')
ON CONFLICT DO NOTHING;

-- 9. USER_DOCUMENT_HISTORY
INSERT INTO public.user_document_history (user_id, document_id, last_read_page, last_read_percent, download_count_by_user, visited_at)
VALUES
  (2, 1, 18, 100.00, 2, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
  (2, 3, 14, 50.00, 1, CURRENT_TIMESTAMP - INTERVAL '1 hour'),
  (3, 2, 32, 100.00, 3, CURRENT_TIMESTAMP - INTERVAL '3 hours'),
  (4, 4, 12, 50.00, 1, CURRENT_TIMESTAMP - INTERVAL '5 hours'),
  (5, 5, 10, 71.43, 1, CURRENT_TIMESTAMP - INTERVAL '6 hours')
ON CONFLICT (user_id, document_id) DO NOTHING;

-- 10. DOCUMENT_ACCESS_LOGS
INSERT INTO public.document_access_logs (id, document_id, user_id, action_type, ip_address, accessed_at)
VALUES
  (1, 1, NULL, 'PREVIEW_3_PAGES', '14.161.22.88', CURRENT_TIMESTAMP - INTERVAL '5 hours'),
  (2, 1, 2, 'VIEW_FULL_PDF', '113.161.78.45', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
  (3, 1, 2, 'DOWNLOAD_FILE', '113.161.78.45', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
  (4, 3, 3, 'VIEW_FULL_PDF', '27.74.120.12', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
  (5, 3, 3, 'DOWNLOAD_FILE', '27.74.120.12', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
  (6, 2, 4, 'VIEW_FULL_PDF', '115.78.10.22', CURRENT_TIMESTAMP - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.document_access_logs', 'id'), (SELECT MAX(id) FROM public.document_access_logs));

-- 11. RATINGS
INSERT INTO public.ratings (user_id, document_id, score, rated_at)
VALUES
  (2, 3, 5, CURRENT_TIMESTAMP - INTERVAL '5 days'),
  (3, 3, 5, CURRENT_TIMESTAMP - INTERVAL '4 days'),
  (4, 1, 5, CURRENT_TIMESTAMP - INTERVAL '4 days'),
  (5, 2, 5, CURRENT_TIMESTAMP - INTERVAL '3 days'),
  (3, 4, 5, CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT (user_id, document_id) DO NOTHING;

-- 12. DOCUMENT_COMMENTS
INSERT INTO public.document_comments (id, user_id, document_id, parent_comment_id, content, upvote_count, is_hidden, created_at)
VALUES
  (1, 3, 1, NULL, 'Giáo án thiết kế phần Hoạt động 2 (Hình thành kiến thức mới) rất rõ ràng, phiếu học tập giao nhiệm vụ đúng chuẩn Công văn 5512.', 14, FALSE, CURRENT_TIMESTAMP - INTERVAL '4 days'),
  (2, 2, 1, 1, 'Cảm ơn bạn Vĩ nhé! Mình có đính kèm thêm bảng Rubric đánh giá năng lực giải quyết vấn đề ở trang 16-18 đó.', 9, FALSE, CURRENT_TIMESTAMP - INTERVAL '3 days'),
  (3, 4, 3, NULL, 'Phần phân rã DFD mức 1 và bảng đặc tả thực thể chuẩn Vectoria giúp nhóm mình thống nhất khóa ngoại rất nhanh.', 19, FALSE, CURRENT_TIMESTAMP - INTERVAL '2 days'),
  (4, 5, 2, NULL, 'Code mẫu hàm xoay đơn và xoay kép của cây AVL ở trang 14 chạy mượt trên GCC 13, không bị rò rỉ bộ nhớ.', 11, FALSE, CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.document_comments', 'id'), (SELECT MAX(id) FROM public.document_comments));

-- 13. COMMENT_UPVOTES
INSERT INTO public.comment_upvotes (user_id, comment_id, created_at)
VALUES
  (1, 1, CURRENT_TIMESTAMP - INTERVAL '3 days'),
  (2, 1, CURRENT_TIMESTAMP - INTERVAL '3 days'),
  (4, 1, CURRENT_TIMESTAMP - INTERVAL '2 days'),
  (1, 3, CURRENT_TIMESTAMP - INTERVAL '1 day'),
  (2, 3, CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (user_id, comment_id) DO NOTHING;

-- 14. DOCUMENT_REPORTS
INSERT INTO public.document_reports (id, reporter_id, document_id, resolved_by, reason_category, description, status, admin_note, created_at, resolved_at)
VALUES
  (1, 4, 5, NULL, 'SAI_KIEN_THUC', 'Ở câu 3b trang 9 phần chia mạng con /26 có nhầm địa chỉ Broadcast của nhánh LAN 2 (đúng là .127 thay vì .126). Nhờ tác giả và Ban quản trị kiểm tra giúp.', 'PENDING', NULL, CURRENT_TIMESTAMP - INTERVAL '6 hours', NULL),
  (2, 3, 8, 1, 'LOI_HIEN_THI_MO', 'Tài liệu bị chụp nghiêng và thiếu mất 6 trang cuối.', 'RESOLVED_HIDDEN', 'Đã từ chối xuất bản và yêu cầu người đăng tải lại bản PDF gốc.', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.document_reports', 'id'), (SELECT MAX(id) FROM public.document_reports));

-- 15. NOTIFICATIONS
INSERT INTO public.notifications (id, user_id, related_document_id, type, title, message, is_read, created_at)
VALUES
  (1, 2, 1, 'DOC_APPROVED', 'Học liệu đã được phê duyệt (+20 điểm)', 'Tài liệu "KHBD Tin học 10 - Chủ đề F (Chuẩn Công văn 5512)" đã vượt qua 8 tiêu chí kiểm duyệt và hiển thị trên Kho học liệu.', FALSE, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
  (2, 4, 8, 'DOC_REJECTED', 'Hồ sơ đóng góp cần chỉnh sửa lại', 'Tài liệu "Bản chụp nháp bài tập chuỗi ký tự C++" bị từ chối: Bản chụp bị mờ và thiếu trang. Vui lòng cập nhật lại.', FALSE, CURRENT_TIMESTAMP - INTERVAL '1 day'),
  (3, 2, 1, 'NEW_COMMENT', 'Phản hồi học thuật mới từ Phan Triệu Vĩ', 'Phan Triệu Vĩ vừa để lại nhận xét chuyên môn trong tài liệu "KHBD Tin học 10 - Chủ đề F".', FALSE, CURRENT_TIMESTAMP - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.notifications', 'id'), (SELECT MAX(id) FROM public.notifications));

-- 16. ADMIN_LOGS
INSERT INTO public.admin_logs (log_id, admin_id, action_type, entity_type, entity_id, action_details, ip_address, created_at)
VALUES
  (1, 1, 'APPROVE_DOC', 'DOCUMENT', '1', '{"old_status":"PENDING","new_status":"APPROVED","reward_points":20,"criteria_passed":8}'::jsonb, '14.161.22.101', CURRENT_TIMESTAMP - INTERVAL '10 days'),
  (2, 1, 'REJECT_DOC', 'DOCUMENT', '8', '{"old_status":"PENDING","new_status":"REJECTED","reason":"Vi phạm Tiêu chí 3 & 5"}'::jsonb, '14.161.22.101', CURRENT_TIMESTAMP - INTERVAL '2 days'),
  (3, 1, 'LOCK_USER', 'USER', '6', '{"old_status":"active","new_status":"locked","reason":"Tài khoản đăng tải tệp sai quy định nhiều lần"}'::jsonb, '14.161.22.101', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (log_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.admin_logs', 'log_id'), (SELECT MAX(log_id) FROM public.admin_logs));

COMMIT;
