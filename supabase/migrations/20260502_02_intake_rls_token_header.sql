-- BLK-2 + BLK-3: anon dostep do gmp_intake_tokens / gmp_intake_documents wymaga
-- matching X-Intake-Token w nagłówku HTTP (PostgREST przekazuje request.headers).
-- Przed: anon SELECT zwracał wszystkie niewygasłe tokeny; anon CRUD na docs qual=true.
-- Po: bez prawidłowego tokena w nagłówku anon dostaje 0 rows.

-- BLK-2: gmp_intake_tokens
DROP POLICY IF EXISTS intake_anon_read ON public.gmp_intake_tokens;
DROP POLICY IF EXISTS intake_anon_update ON public.gmp_intake_tokens;

CREATE POLICY intake_anon_read ON public.gmp_intake_tokens
FOR SELECT TO anon
USING (
    expires_at > now()
    AND token IS NOT NULL
    AND token = (current_setting('request.headers', true)::json ->> 'x-intake-token')
);

CREATE POLICY intake_anon_update ON public.gmp_intake_tokens
FOR UPDATE TO anon
USING (
    expires_at > now()
    AND status = ANY (ARRAY['invited'::text, 'in_progress'::text])
    AND token = (current_setting('request.headers', true)::json ->> 'x-intake-token')
)
WITH CHECK (
    status = ANY (ARRAY['invited'::text, 'in_progress'::text, 'submitted'::text])
    AND token = (current_setting('request.headers', true)::json ->> 'x-intake-token')
);

COMMENT ON POLICY intake_anon_read ON public.gmp_intake_tokens IS
'BLK-2 fix 2026-05-02: anon SELECT wymaga matching X-Intake-Token header. Wcześniej qual=expires_at > now() zwracał wszystkie tokeny.';

-- BLK-3: gmp_intake_documents (3 polityki anon: SELECT/INSERT/DELETE)
DROP POLICY IF EXISTS intake_docs_anon_read ON public.gmp_intake_documents;
DROP POLICY IF EXISTS intake_docs_anon_insert ON public.gmp_intake_documents;
DROP POLICY IF EXISTS intake_docs_anon_delete ON public.gmp_intake_documents;

CREATE POLICY intake_docs_anon_read ON public.gmp_intake_documents
FOR SELECT TO anon
USING (
    intake_id IN (
        SELECT id FROM public.gmp_intake_tokens
        WHERE token = (current_setting('request.headers', true)::json ->> 'x-intake-token')
          AND expires_at > now()
    )
);

CREATE POLICY intake_docs_anon_insert ON public.gmp_intake_documents
FOR INSERT TO anon
WITH CHECK (
    intake_id IN (
        SELECT id FROM public.gmp_intake_tokens
        WHERE token = (current_setting('request.headers', true)::json ->> 'x-intake-token')
          AND expires_at > now()
          AND status = ANY (ARRAY['invited'::text, 'in_progress'::text])
    )
);

CREATE POLICY intake_docs_anon_delete ON public.gmp_intake_documents
FOR DELETE TO anon
USING (
    intake_id IN (
        SELECT id FROM public.gmp_intake_tokens
        WHERE token = (current_setting('request.headers', true)::json ->> 'x-intake-token')
          AND expires_at > now()
          AND status = ANY (ARRAY['invited'::text, 'in_progress'::text])
    )
);

COMMENT ON POLICY intake_docs_anon_read ON public.gmp_intake_documents IS
'BLK-3 fix 2026-05-02: anon SELECT joinuje z gmp_intake_tokens po X-Intake-Token header.';
