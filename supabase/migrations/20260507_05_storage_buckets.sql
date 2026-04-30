-- ============================================================================
-- Etap II-A — § II-A.3 — Storage buckets dla dokumentów
-- ============================================================================
-- UWAGA: bucket 'document-templates' już istnieje (utworzony przy spike).
-- Tutaj tylko bucket 'case-documents' + RLS policies.
-- ============================================================================

-- bucket: case-documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'case-documents', 'case-documents', false, 26214400,  -- 25 MB
    ARRAY[
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
        'image/png',
        'image/jpeg'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS dla document-templates (utworzony wcześniej, dodajemy policies)
DROP POLICY IF EXISTS "staff_read_templates" ON storage.objects;
CREATE POLICY "staff_read_templates"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'document-templates' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_write_templates" ON storage.objects;
CREATE POLICY "admin_write_templates"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'document-templates' AND
        EXISTS (SELECT 1 FROM gmp_staff
                WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

DROP POLICY IF EXISTS "admin_update_templates" ON storage.objects;
CREATE POLICY "admin_update_templates"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'document-templates' AND
        EXISTS (SELECT 1 FROM gmp_staff
                WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

DROP POLICY IF EXISTS "admin_delete_templates" ON storage.objects;
CREATE POLICY "admin_delete_templates"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'document-templates' AND
        EXISTS (SELECT 1 FROM gmp_staff
                WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- RLS dla case-documents
DROP POLICY IF EXISTS "staff_all_case_documents" ON storage.objects;
CREATE POLICY "staff_all_case_documents"
    ON storage.objects FOR ALL
    USING (bucket_id = 'case-documents' AND auth.uid() IS NOT NULL)
    WITH CHECK (bucket_id = 'case-documents' AND auth.uid() IS NOT NULL);
