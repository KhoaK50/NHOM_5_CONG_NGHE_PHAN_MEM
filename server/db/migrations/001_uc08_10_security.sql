-- ============================================================================
-- MIGRATION BỔ SUNG CHO schema_5share.sql (5S-043) - KHÔNG ĐỔI MÔ HÌNH 14 THỰC THỂ
-- 1. Thêm users.contribution_score đã có trong Đặc tả Thực thể nhưng thiếu ở schema.
-- 2. Thu hồi quyền anon/authenticated và bật RLS: backend là lối truy cập duy nhất,
--    tránh Supabase Data API đọc được password_hash bằng khóa anon công khai.
-- Chạy lại nhiều lần vẫn an toàn.
-- ============================================================================

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS contribution_score INT NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_contribution_score_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_contribution_score_check CHECK (contribution_score >= 0);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_documents_status_created ON public.documents (status, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_course ON public.documents (course_id);
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON public.document_reports (status, created_at);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
  END IF;

  -- Chủ bảng (role backend) vẫn bỏ qua RLS; role khác bị từ chối vì không có policy nào.
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END
$$;

COMMIT;
