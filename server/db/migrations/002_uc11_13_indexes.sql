-- UC11–UC13: indexes for personal lists, published search results and activity logs.
CREATE INDEX IF NOT EXISTS idx_documents_uploader_status_created
  ON public.documents (uploader_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_approved_created
  ON public.documents (created_at DESC) WHERE status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_document_access_action_time
  ON public.document_access_logs (action_type, accessed_at DESC, document_id);

CREATE INDEX IF NOT EXISTS idx_document_comments_document_created
  ON public.document_comments (document_id, created_at DESC) WHERE is_hidden = FALSE;

CREATE INDEX IF NOT EXISTS idx_moderation_logs_latest
  ON public.moderation_logs (document_id, action_at DESC);
