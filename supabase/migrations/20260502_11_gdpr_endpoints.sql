-- CRIT-2: GDPR endpoints (export/anonymize/erasure).
-- 3 RPC dla obsługi żądań RODO art. 15 (dostęp), art. 17 (zapomnienie), pseudonimizacja.

-- RPC 1: Export - art. 15 RODO (right to access)
-- Zwraca pełen dump danych klienta jako jsonb
CREATE OR REPLACE FUNCTION public.gmp_gdpr_export_client(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_role text;
  v_result jsonb;
BEGIN
  SELECT id, role INTO v_staff_id, v_role FROM gmp_staff WHERE user_id = auth.uid();
  IF v_role NOT IN ('owner','admin','manager') THEN
    RAISE EXCEPTION 'GDPR export wymaga roli manager/admin/owner' USING ERRCODE = '42501';
  END IF;

  v_result := jsonb_build_object(
    'export_metadata', jsonb_build_object(
      'exported_at', now(),
      'exported_by_staff_id', v_staff_id,
      'client_id', p_client_id,
      'gdpr_article', 'Art. 15 RODO',
      'system_version', '2026-05-02'
    ),
    'client', (SELECT row_to_json(c) FROM gmp_clients c WHERE id = p_client_id),
    'cases', (SELECT coalesce(jsonb_agg(row_to_json(cs)), '[]'::jsonb) FROM gmp_cases cs WHERE client_id = p_client_id),
    'documents', (SELECT coalesce(jsonb_agg(row_to_json(d)), '[]'::jsonb) FROM gmp_documents d WHERE case_id IN (SELECT id FROM gmp_cases WHERE client_id = p_client_id)),
    'payments', (SELECT coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb) FROM gmp_payments p WHERE case_id IN (SELECT id FROM gmp_cases WHERE client_id = p_client_id)),
    'appointments', (SELECT coalesce(jsonb_agg(row_to_json(a)), '[]'::jsonb) FROM gmp_appointments a WHERE client_id = p_client_id),
    'audit_log', (SELECT coalesce(jsonb_agg(row_to_json(al)), '[]'::jsonb) FROM gmp_audit_log al WHERE entity_id = p_client_id OR entity_id IN (SELECT id FROM gmp_cases WHERE client_id = p_client_id))
  );

  -- Audit eksportu
  INSERT INTO gmp_audit_log (staff_id, action, entity_type, entity_id, severity, metadata)
  VALUES (v_staff_id, 'gdpr_export', 'gmp_clients', p_client_id, 'warning',
          jsonb_build_object('article', 'Art. 15 RODO', 'export_size_bytes', length(v_result::text)));

  RETURN v_result;
END;
$$;

-- RPC 2: Anonymize - pseudonimizacja zachowując audit trail
-- Zostawia rekordy ale zastępuje PII fake/hash
CREATE OR REPLACE FUNCTION public.gmp_gdpr_anonymize_client(p_client_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_role text;
  v_anon_suffix text := substr(md5(p_client_id::text), 1, 8);
  v_anon_hash text := 'ANON_' || v_anon_suffix;
BEGIN
  SELECT id, role INTO v_staff_id, v_role FROM gmp_staff WHERE user_id = auth.uid();
  IF v_role NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'Anonymize wymaga roli admin/owner (operacja nieodwracalna)' USING ERRCODE = '42501';
  END IF;

  -- Zastąp PII bezpiecznymi placeholderami; zachowaj id + relacje
  UPDATE gmp_clients SET
    first_name = v_anon_hash,
    last_name = v_anon_hash,
    full_name_normalized = v_anon_hash,
    pesel = NULL,
    phone = NULL,
    email = NULL,
    nationality = NULL,
    birth_date = NULL,
    notes = '[ANONYMIZED ' || now()::text || ']',
    updated_at = now()
  WHERE id = p_client_id;

  -- Audit log: zachowaj fakt anonimizacji
  INSERT INTO gmp_audit_log (staff_id, action, entity_type, entity_id, severity, metadata)
  VALUES (v_staff_id, 'gdpr_anonymize', 'gmp_clients', p_client_id, 'critical',
          jsonb_build_object('article', 'Art. 17 RODO (pseudonimizacja)', 'anon_hash', v_anon_hash));

  RETURN jsonb_build_object(
    'anonymized', true,
    'client_id', p_client_id,
    'anon_hash', v_anon_hash,
    'anonymized_at', now()
  );
END;
$$;

-- RPC 3: Erase - hard delete (art. 17 RODO right to be forgotten - PEŁNE usunięcie)
-- Soft-delete najpierw (30 dni grace period), potem cron purge
CREATE OR REPLACE FUNCTION public.gmp_gdpr_erase_client(p_client_id uuid, p_confirm_text text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_role text;
  v_case_count int;
BEGIN
  SELECT id, role INTO v_staff_id, v_role FROM gmp_staff WHERE user_id = auth.uid();
  IF v_role NOT IN ('owner','admin') THEN
    RAISE EXCEPTION 'Erase wymaga roli admin/owner' USING ERRCODE = '42501';
  END IF;
  IF p_confirm_text != 'TAK_USUWAM_NA_STALE' THEN
    RAISE EXCEPTION 'Wymagane jawne potwierdzenie. Wywołaj z p_confirm_text=TAK_USUWAM_NA_STALE' USING ERRCODE = '22023';
  END IF;

  -- Soft-delete client + powiązane sprawy (30-dniowy grace period)
  UPDATE gmp_clients SET deleted_at = now(), deleted_by = v_staff_id WHERE id = p_client_id;
  UPDATE gmp_cases SET deleted_at = now(), deleted_by = v_staff_id WHERE client_id = p_client_id;
  GET DIAGNOSTICS v_case_count = ROW_COUNT;

  INSERT INTO gmp_audit_log (staff_id, action, entity_type, entity_id, severity, metadata)
  VALUES (v_staff_id, 'gdpr_erase_initiated', 'gmp_clients', p_client_id, 'critical',
          jsonb_build_object('article', 'Art. 17 RODO (right to be forgotten)',
                             'cases_soft_deleted', v_case_count,
                             'grace_period_days', 30,
                             'hard_delete_after', (now() + interval '30 days')::text));

  RETURN jsonb_build_object(
    'erase_initiated', true,
    'client_id', p_client_id,
    'cases_soft_deleted', v_case_count,
    'hard_delete_after', now() + interval '30 days',
    'note', 'Soft-delete wykonane. Hard-delete za 30 dni przez cron. Restore możliwy w tym okresie przez gmp_restore.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.gmp_gdpr_export_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gmp_gdpr_anonymize_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gmp_gdpr_erase_client(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.gmp_gdpr_export_client IS 'CRIT-2 fix 2026-05-02: GDPR Art. 15 export. Wymaga manager+. Audit każdy eksport.';
COMMENT ON FUNCTION public.gmp_gdpr_anonymize_client IS 'CRIT-2 fix 2026-05-02: pseudonimizacja - zostawia audit trail, usuwa PII. Wymaga admin+.';
COMMENT ON FUNCTION public.gmp_gdpr_erase_client IS 'CRIT-2 fix 2026-05-02: GDPR Art. 17 erasure. Soft-delete + 30 dni grace + hard-delete przez cron.';
