-- BLK-1: 15 widoków public.gmp_* z security_invoker = on
-- Przed: views są SECURITY DEFINER (default w PG <15), działają z uprawnieniami właściciela (postgres),
--        więc anon ANON_KEY ma read na wszystkie wiersze (RLS bypass).
-- Po:    security_invoker = on -> view honoruje RLS querującego (anon, authenticated, service_role).
-- Rollback: ALTER VIEW <name> RESET (security_invoker)

ALTER VIEW public.gmp_case_alerts             SET (security_invoker = on);
ALTER VIEW public.gmp_case_assignees_view     SET (security_invoker = on);
ALTER VIEW public.gmp_case_balance            SET (security_invoker = on);
ALTER VIEW public.gmp_case_completeness       SET (security_invoker = on);
ALTER VIEW public.gmp_case_dashboard_kpi      SET (security_invoker = on);
ALTER VIEW public.gmp_case_finance            SET (security_invoker = on);
ALTER VIEW public.gmp_case_tags_view          SET (security_invoker = on);
ALTER VIEW public.gmp_collection_overview     SET (security_invoker = on);
ALTER VIEW public.gmp_employer_inaction_alerts SET (security_invoker = on);
ALTER VIEW public.gmp_invoice_finance         SET (security_invoker = on);
ALTER VIEW public.gmp_leads_overview          SET (security_invoker = on);
ALTER VIEW public.gmp_live_activity           SET (security_invoker = on);
ALTER VIEW public.gmp_staff_effectiveness     SET (security_invoker = on);
ALTER VIEW public.gmp_staff_tasks_monthly     SET (security_invoker = on);
ALTER VIEW public.gmp_upcoming_installments   SET (security_invoker = on);
