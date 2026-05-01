-- Tier 2 #8: Soft-delete na 6 głównych tabelach.
-- Zamiast hard DELETE — UPDATE deleted_at = now(). Audit trail zachowany.
-- Cron post-launch: purge rekordy z deleted_at < now() - interval '30 days' (przedtem trzeba zweryfikować że to OK z RODO retention policy).

-- Dodanie kolumn deleted_at, deleted_by na 6 entity tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['gmp_cases','gmp_clients','gmp_employers','gmp_documents','permit_leads','gmp_appointments'])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at timestamptz', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_by uuid', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_deleted_at ON public.%I (deleted_at) WHERE deleted_at IS NOT NULL', t, t);
  END LOOP;
END $$;

-- RPC do soft-delete
CREATE OR REPLACE FUNCTION public.gmp_soft_delete(p_table text, p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_count int;
  v_allowed text[] := ARRAY['gmp_cases','gmp_clients','gmp_employers','gmp_documents','permit_leads','gmp_appointments'];
BEGIN
  IF NOT (p_table = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Table % not in soft-delete whitelist', p_table USING ERRCODE = '22023';
  END IF;
  SELECT id INTO v_staff_id FROM gmp_staff WHERE user_id = auth.uid();
  EXECUTE format('UPDATE public.%I SET deleted_at = now(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL', p_table)
    USING v_staff_id, p_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Audit
  INSERT INTO gmp_audit_log (staff_id, action, entity_type, entity_id, severity, metadata)
  VALUES (v_staff_id, 'soft_delete', p_table, p_id, 'warning', jsonb_build_object('table', p_table));

  RETURN v_count > 0;
END;
$$;

-- RPC restore (cofnięcie soft-delete)
CREATE OR REPLACE FUNCTION public.gmp_restore(p_table text, p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  v_count int;
  v_allowed text[] := ARRAY['gmp_cases','gmp_clients','gmp_employers','gmp_documents','permit_leads','gmp_appointments'];
  v_role text;
BEGIN
  IF NOT (p_table = ANY (v_allowed)) THEN
    RAISE EXCEPTION 'Table % not in whitelist', p_table USING ERRCODE = '22023';
  END IF;
  SELECT id, role INTO v_staff_id, v_role FROM gmp_staff WHERE user_id = auth.uid();
  IF v_role NOT IN ('owner','admin','manager') THEN
    RAISE EXCEPTION 'Restore wymaga roli manager/admin/owner' USING ERRCODE = '42501';
  END IF;
  EXECUTE format('UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1', p_table)
    USING p_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO gmp_audit_log (staff_id, action, entity_type, entity_id, severity, metadata)
  VALUES (v_staff_id, 'restore_from_trash', p_table, p_id, 'info', jsonb_build_object('table', p_table));

  RETURN v_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.gmp_soft_delete(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gmp_restore(text, uuid) TO authenticated;

COMMENT ON FUNCTION public.gmp_soft_delete IS 'Soft-delete: UPDATE deleted_at=now() + audit log. Tier 2 fix 2026-05-02.';
