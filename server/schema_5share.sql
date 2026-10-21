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
