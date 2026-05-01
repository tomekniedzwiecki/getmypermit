-- Tier 2 #6: Storage download audit log.
-- Trigger BEFORE INSERT na storage.objects nie pomoże (to upload, nie download).
-- Zamiast tego: tabela log + RPC `gmp_log_storage_access(bucket, path, action)` która
-- jest wywoływana przed createSignedUrl. Plus: trigger na storage.objects loguje upload/delete.

CREATE TABLE IF NOT EXISTS public.gmp_storage_access_log (
    id bigserial PRIMARY KEY,
    staff_id uuid REFERENCES gmp_staff(id) ON DELETE SET NULL,
    bucket text NOT NULL,
    object_path text NOT NULL,
    action text NOT NULL CHECK (action IN ('signed_url', 'upload', 'delete', 'list')),
    object_size bigint,
    accessed_at timestamptz NOT NULL DEFAULT now(),
    user_agent text,
    ip_address text
);

CREATE INDEX IF NOT EXISTS idx_storage_access_staff_time ON public.gmp_storage_access_log (staff_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_access_bucket_time ON public.gmp_storage_access_log (bucket, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_access_path ON public.gmp_storage_access_log (object_path) WHERE bucket IN ('intake-docs', 'case-documents');

ALTER TABLE public.gmp_storage_access_log ENABLE ROW LEVEL SECURITY;

-- Tylko owner/admin może czytać logi
DROP POLICY IF EXISTS "Admins read storage access log" ON public.gmp_storage_access_log;
CREATE POLICY "Admins read storage access log" ON public.gmp_storage_access_log
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM gmp_staff
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- RPC do logowania (frontend wywołuje przed createSignedUrl)
CREATE OR REPLACE FUNCTION public.gmp_log_storage_access(
    p_bucket text,
    p_object_path text,
    p_action text DEFAULT 'signed_url'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff_id uuid;
BEGIN
    SELECT id INTO v_staff_id FROM gmp_staff WHERE user_id = auth.uid();

    INSERT INTO gmp_storage_access_log (staff_id, bucket, object_path, action, user_agent, ip_address)
    VALUES (
        v_staff_id,
        p_bucket,
        p_object_path,
        p_action,
        coalesce(current_setting('request.headers', true)::json->>'user-agent', NULL),
        coalesce(current_setting('request.headers', true)::json->>'cf-connecting-ip',
                 current_setting('request.headers', true)::json->>'x-forwarded-for',
                 NULL)
    );
END;
$$;

-- Trigger na storage.objects dla automatycznego logowania upload + delete
CREATE OR REPLACE FUNCTION public.gmp_storage_objects_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_staff_id uuid;
    v_action text;
BEGIN
    SELECT id INTO v_staff_id FROM gmp_staff WHERE user_id = auth.uid();
    v_action := CASE TG_OP WHEN 'INSERT' THEN 'upload' WHEN 'DELETE' THEN 'delete' ELSE lower(TG_OP) END;

    INSERT INTO gmp_storage_access_log (staff_id, bucket, object_path, action, object_size)
    VALUES (
        v_staff_id,
        coalesce(NEW.bucket_id, OLD.bucket_id),
        coalesce(NEW.name, OLD.name),
        v_action,
        coalesce((NEW.metadata->>'size')::bigint, NULL)
    );

    RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_gmp_storage_audit_insert ON storage.objects;
CREATE TRIGGER trg_gmp_storage_audit_insert
AFTER INSERT ON storage.objects
FOR EACH ROW
WHEN (NEW.bucket_id IN ('intake-docs', 'case-documents', 'documents', 'document-templates', 'lead-fallback', 'attachments'))
EXECUTE FUNCTION public.gmp_storage_objects_audit();

DROP TRIGGER IF EXISTS trg_gmp_storage_audit_delete ON storage.objects;
CREATE TRIGGER trg_gmp_storage_audit_delete
AFTER DELETE ON storage.objects
FOR EACH ROW
WHEN (OLD.bucket_id IN ('intake-docs', 'case-documents', 'documents', 'document-templates', 'lead-fallback', 'attachments'))
EXECUTE FUNCTION public.gmp_storage_objects_audit();

GRANT EXECUTE ON FUNCTION public.gmp_log_storage_access(text, text, text) TO authenticated;

COMMENT ON TABLE public.gmp_storage_access_log IS
'Tier 2 #6 fix 2026-05-02: audit każdego dostępu do storage. Triggery na upload/delete + RPC do log signed_url przed downloadem.';
