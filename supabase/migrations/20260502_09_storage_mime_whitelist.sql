-- MAJ-NEW-1: storage MIME whitelist na intake-docs i documents.
-- Przed: allowed_mime_types=NULL = anon może uploadować .exe/.html/.svg z embedded JS.
-- Po: tylko obrazy + PDF (intake klient: paszport/zdjęcia/umowa). Documents: + Word/Excel.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/webp',
    'application/pdf'
]
WHERE id = 'intake-docs';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
],
file_size_limit = COALESCE(file_size_limit, 26214400)  -- 25MB default
WHERE id = 'documents';
