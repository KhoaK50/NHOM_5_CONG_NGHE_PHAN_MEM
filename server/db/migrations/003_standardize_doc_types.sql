-- Migration 003: Standardize doc_type to Option A (5 official core types)
-- 1. Migrate legacy TAI_LIEU_THAM_KHAO to GIAO_TRINH
UPDATE public.documents
SET doc_type = 'GIAO_TRINH'
WHERE doc_type = 'TAI_LIEU_THAM_KHAO';

-- 2. Drop existing CHECK constraint
ALTER TABLE public.documents
DROP CONSTRAINT IF EXISTS documents_doc_type_check;

-- 3. Add standardized 5-type CHECK constraint
ALTER TABLE public.documents
ADD CONSTRAINT documents_doc_type_check
CHECK (doc_type IN ('KHBD_5512', 'SLIDE_BAI_GIANG', 'DE_THI_DAP_AN', 'DO_AN_MAU', 'GIAO_TRINH'));
