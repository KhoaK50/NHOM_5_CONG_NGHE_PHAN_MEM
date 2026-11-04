-- Bổ sung loại học liệu chung mà không thay đổi dữ liệu hiện có.
ALTER TABLE public.documents
DROP CONSTRAINT IF EXISTS documents_doc_type_check;

ALTER TABLE public.documents
ADD CONSTRAINT documents_doc_type_check
CHECK (doc_type IN ('KHBD_5512', 'SLIDE_BAI_GIANG', 'DE_THI_DAP_AN', 'DO_AN_MAU', 'GIAO_TRINH', 'TAI_LIEU'));
