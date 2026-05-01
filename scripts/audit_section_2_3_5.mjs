// Audyt sesji 2: sekcje 2 (DoD etapów), 3 (cross-checks), 5 (DB schema)
// Read-only, prod DB
import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});
async function q(sql) {
    try { return (await c.query(sql)).rows; }
    catch (e) { return [{ ERROR: e.message.slice(0, 200) }]; }
}
async function exists(name, kind = 'r') {
    // r=table, v=view, p=function, t=trigger, e=enum, i=index
    const map = {
        r: `SELECT to_regclass('public.${name}')::text AS x`,
        v: `SELECT to_regclass('public.${name}')::text AS x`,
        p: `SELECT proname AS x FROM pg_proc WHERE proname='${name}' LIMIT 1`,
        t: `SELECT tgname AS x FROM pg_trigger WHERE tgname='${name}' LIMIT 1`,
        e: `SELECT typname AS x FROM pg_type WHERE typname='${name}' AND typtype='e' LIMIT 1`,
        i: `SELECT indexname AS x FROM pg_indexes WHERE indexname='${name}' LIMIT 1`,
    };
    const r = await q(map[kind]);
    return r.length && r[0].x ? r[0].x : null;
}
function head(t) { console.log('\n' + '='.repeat(78) + '\n  ' + t + '\n' + '='.repeat(78)); }
function sub(t) { console.log('\n--- ' + t); }

await c.connect();
console.log('✓ Connected to prod\n');

// ============================================================
head('SEKCJA 2 — DOD ETAPÓW');
// ============================================================

sub('2.1 Etap 0.5 — Spike + audit');
const etap05 = {
    'Spike spike-docx': await exists('spike-docx', 'p').then(r => r ? '✓' : 'check edge fn'),
    'Audit raport prod (cases ≈ 4412)': (await q('SELECT COUNT(*) FROM gmp_cases'))[0]?.count,
    'Backfill mapping (cases NULL kind)': (await q('SELECT COUNT(*) FROM gmp_cases WHERE kind IS NULL'))[0]?.count,
};
console.table(etap05);

sub('2.2 Etap I — Fundament + nazewnictwo');
const etapI = {
    'enum kind=przejeta_do_dalszego_prowadzenia': (await q(`SELECT 1 FROM pg_enum WHERE enumlabel='przejeta_do_dalszego_prowadzenia'`)).length ? '✓' : '✗',
    'enum kind=kontrola_legalnosci_pobytu_pracy': (await q(`SELECT 1 FROM pg_enum WHERE enumlabel='kontrola_legalnosci_pobytu_pracy'`)).length ? '✓' : '✗',
    'enum stage=gotowa_do_zlozenia': (await q(`SELECT 1 FROM pg_enum WHERE enumlabel='gotowa_do_zlozenia'`)).length ? '✓' : '✗',
    'gmp_case_categories.pawel_group exists': (await q(`SELECT 1 FROM information_schema.columns WHERE table_name='gmp_case_categories' AND column_name='pawel_group'`)).length ? '✓' : '✗',
    'view gmp_upcoming_installments': await exists('gmp_upcoming_installments', 'v') ? '✓' : '✗',
    'gmp_crm_appointments.employer_id': (await q(`SELECT 1 FROM information_schema.columns WHERE table_name='gmp_crm_appointments' AND column_name='employer_id'`)).length ? '✓' : '✗',
    'RPC gmp_get_next_steps': await exists('gmp_get_next_steps', 'p') ? '✓' : '✗',
    'gmp_cases.kind_variant': (await q(`SELECT 1 FROM information_schema.columns WHERE table_name='gmp_cases' AND column_name='kind_variant'`)).length ? '✓' : '✗',
};
console.table(etapI);

sub('2.3 Etap II-A — Generator dokumentów');
const etapIIA = {
    'gmp_documents.status enum': (await q(`SELECT 1 FROM information_schema.columns WHERE table_name='gmp_documents' AND column_name='status'`)).length ? '✓' : '✗',
    'gmp_document_status enum': await exists('gmp_document_status', 'e') ? '✓' : '✗',
    'gmp_document_template_kind enum': await exists('gmp_document_template_kind', 'e') ? '✓' : '✗',
    'gmp_document_generation_log table': await exists('gmp_document_generation_log', 'r') ? '✓' : '✗',
    'gmp_document_templates.version': (await q(`SELECT 1 FROM information_schema.columns WHERE table_name='gmp_document_templates' AND column_name='version'`)).length ? '✓' : '✗',
    'gmp_document_templates row count': (await q('SELECT COUNT(*) FROM gmp_document_templates'))[0]?.count,
    'gmp_documents row count': (await q('SELECT COUNT(*) FROM gmp_documents'))[0]?.count,
    'audit_log entries (action=document_generated)': (await q(`SELECT COUNT(*) FROM gmp_audit_log WHERE action='document_generated' OR action ILIKE '%document%'`).then(r => r[0]?.count ?? r[0]?.ERROR?.slice(0, 30))),
};
console.table(etapIIA);

sub('2.3.1 Templates per kind (verify min 4 + audit_checklist)');
console.table(await q(`SELECT kind, COUNT(*) AS n FROM gmp_document_templates GROUP BY kind ORDER BY 2 DESC`));

sub('2.4 Etap II-B — Checklisty + audyt PDF');
const etapIIB = {
    'gmp_checklist_definitions count': (await q('SELECT COUNT(*) FROM gmp_checklist_definitions'))[0]?.count,
    'gmp_case_checklists count': (await q('SELECT COUNT(*) FROM gmp_case_checklists'))[0]?.count,
    'RPC gmp_instantiate_checklist': await exists('gmp_instantiate_checklist', 'p') ? '✓' : '✗',
    'gmp_checklist_status enum': await exists('gmp_checklist_status', 'e') ? '✓' : '✗',
    'A1: cases bez checklisty': (await q(`
        SELECT COUNT(*) FROM gmp_cases c
        WHERE NOT EXISTS (SELECT 1 FROM gmp_case_checklists ch WHERE ch.case_id = c.id)`))[0]?.count,
};
console.table(etapIIB);

sub('2.5 Etap II-C — Wizard + role + pakiet startowy');
const etapIIC = {
    'gmp_case_role_assignments table': await exists('gmp_case_role_assignments', 'r') ? '✓' : '✗',
    'gmp_case_role enum': await exists('gmp_case_role', 'e') ? '✓' : '✗',
    'gmp_case_role_party_type enum': await exists('gmp_case_role_party_type', 'e') ? '✓' : '✗',
    'RPC gmp_default_admin_fee': await exists('gmp_default_admin_fee', 'p') ? '✓' : '✗',
    'role_assignments rows': (await q('SELECT COUNT(*) FROM gmp_case_role_assignments'))[0]?.count,
};
console.table(etapIIC);

sub('2.6 Etap III — Elektroniczne złożenie');
const etapIII = {
    'gmp_e_submission_status table': await exists('gmp_e_submission_status', 'r') ? '✓' : '✗',
    'gmp_e_submission_attachments table': await exists('gmp_e_submission_attachments', 'r') ? '✓' : '✗',
    'gmp_e_submission_step enum (10 wartości)': (await q(`SELECT COUNT(*) FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='gmp_e_submission_step'`))[0]?.count,
    'gmp_e_submission_step_status enum': await exists('gmp_e_submission_step_status', 'e') ? '✓' : '✗',
    'gmp_oplata_status enum (7 wartości)': (await q(`SELECT COUNT(*) FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='gmp_oplata_status'`))[0]?.count,
    'gmp_zalacznik_nr_1_model enum (4 wartości)': (await q(`SELECT COUNT(*) FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='gmp_zalacznik_nr_1_model'`))[0]?.count,
    'A2: coverage e-submission_status × cases elektronicznie': (await q(`
        SELECT
            (SELECT COUNT(*) FROM gmp_cases WHERE submission_method='elektronicznie') AS cases_e,
            (SELECT COUNT(DISTINCT case_id) FROM gmp_e_submission_status) AS statuses_distinct`))[0],
};
console.table(etapIII);

sub('2.7 Etap IV — Procedural data');
const etapIV = {
    'gmp_decision_outcome enum (6 wartości)': (await q(`SELECT COUNT(*) FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='gmp_decision_outcome'`))[0]?.count,
    'view gmp_case_completeness': await exists('gmp_case_completeness', 'v') ? '✓' : '✗',
    'view gmp_case_dashboard_kpi': await exists('gmp_case_dashboard_kpi', 'v') ? '✓' : '✗',
    'gmp_cases.decision_outcome col': (await q(`SELECT 1 FROM information_schema.columns WHERE table_name='gmp_cases' AND column_name='decision_outcome'`)).length ? '✓' : '✗',
    'gmp_cases.date_decision col': (await q(`SELECT 1 FROM information_schema.columns WHERE table_name='gmp_cases' AND column_name='date_decision'`)).length ? '✓' : '✗',
    'cases z wypełnioną decyzją': (await q(`SELECT COUNT(*) FROM gmp_cases WHERE decision_outcome IS NOT NULL`))[0]?.count,
};
console.table(etapIV);

sub('2.8 Etap V — Pracodawcy/grupy/import');
const etapV = {
    'gmp_case_groups table': await exists('gmp_case_groups', 'r') ? '✓' : '✗',
    'gmp_case_group_members table': await exists('gmp_case_group_members', 'r') ? '✓' : '✗',
    'gmp_case_group_type enum (5 wartości)': (await q(`SELECT COUNT(*) FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='gmp_case_group_type'`))[0]?.count,
    'gmp_documents.group_id col': (await q(`SELECT 1 FROM information_schema.columns WHERE table_name='gmp_documents' AND column_name='group_id'`)).length ? '✓' : '✗',
    'gmp_tasks.group_id col': (await q(`SELECT 1 FROM information_schema.columns WHERE table_name='gmp_tasks' AND column_name='group_id'`)).length ? '✓' : '✗',
    'CHECK chk_task_case_or_group': (await q(`SELECT 1 FROM pg_constraint WHERE conname='chk_task_case_or_group'`)).length ? '✓' : '✗',
    'groups type=pracodawca count': (await q(`SELECT COUNT(*) FROM gmp_case_groups WHERE type='pracodawca'`))[0]?.count,
    'groups type=rodzina count': (await q(`SELECT COUNT(*) FROM gmp_case_groups WHERE type='rodzina'`))[0]?.count,
};
console.table(etapV);

sub('2.9 Etap VI — Legalność + Kanban');
const etapVI = {
    'gmp_legal_status enum': await exists('gmp_legal_status', 'e') ? '✓' : '✗',
    'gmp_legal_check_kind enum': await exists('gmp_legal_check_kind', 'e') ? '✓' : '✗',
    'gmp_case_work_legality table': await exists('gmp_case_work_legality', 'r') ? '✓' : '✗',
    'gmp_legal_status_snapshots table': await exists('gmp_legal_status_snapshots', 'r') ? '✓' : '✗',
    'gmp_cases.legal_stay_status col': (await q(`SELECT 1 FROM information_schema.columns WHERE table_name='gmp_cases' AND column_name='legal_stay_status'`)).length ? '✓' : '✗',
    'gmp_cases.legal_status_recomputed_at': (await q(`SELECT 1 FROM information_schema.columns WHERE table_name='gmp_cases' AND column_name='legal_status_recomputed_at'`)).length ? '✓' : '✗',
    'work_legality count': (await q('SELECT COUNT(*) FROM gmp_case_work_legality'))[0]?.count,
};
console.table(etapVI);

sub('2.10 Etap VII — Automatyzacje (MVP)');
const etapVII = {
    'gmp_automation_flows table': await exists('gmp_automation_flows', 'r') ? '✓' : '✗',
    'gmp_automation_steps table': await exists('gmp_automation_steps', 'r') ? '✓' : '✗',
    'gmp_automation_executions table': await exists('gmp_automation_executions', 'r') ? '✓' : '✗',
    'flows count': (await q('SELECT COUNT(*) FROM gmp_automation_flows').then(r => r[0]?.count ?? 'ERR'))?.toString?.() || 'ERR',
    'executions count': (await q('SELECT COUNT(*) FROM gmp_automation_executions').then(r => r[0]?.count ?? 'ERR'))?.toString?.() || 'ERR',
};
console.table(etapVII);

// ============================================================
head('SEKCJA 3 — CROSS-CHECKS');
// ============================================================

sub('3.1 Kategoria A — Bezpieczeństwo i RODO');
const A = {};
A['A1: Backfill checklist (cases bez checklisty)'] = (await q(`
    SELECT COUNT(*) FROM gmp_cases c
    WHERE NOT EXISTS (SELECT 1 FROM gmp_case_checklists WHERE case_id = c.id)`))[0]?.count;
A['A2: Backfill e-submission_status (cases elektronicznie bez statusu)'] = (await q(`
    SELECT COUNT(*) FROM gmp_cases c
    WHERE submission_method='elektronicznie'
      AND NOT EXISTS (SELECT 1 FROM gmp_e_submission_status WHERE case_id = c.id)`))[0]?.count;
// A3 — JWT verification (sprawdzimy w sekcji 6)
A['A3: edge functions JWT (sprawdzić w sekcji 6)'] = '→ section 6';
A['A4: Trigger spójności statusów docs (signed_status_sync)'] = (await q(`
    SELECT tgname FROM pg_trigger WHERE tgname ILIKE '%signed%' OR tgname ILIKE '%sync%doc%'`)).map(r => r.tgname).join(', ') || 'NIE ZNALEZIONO';
A['A5: Versioning szablonów (templates ze stejnym kind diff version)'] = (await q(`
    SELECT kind, COUNT(DISTINCT version) AS versions, COUNT(*) AS rows
    FROM gmp_document_templates GROUP BY kind HAVING COUNT(DISTINCT version) > 1`)).length ? '✓ multi-version found' : '⚠ all single-version';
A['A6: RPC gmp_get_next_steps'] = await exists('gmp_get_next_steps', 'p') ? '✓' : '✗';
A['A7: Trigger gmp_check_employer_consent'] = (await q(`SELECT tgname FROM pg_trigger WHERE tgname ILIKE '%employer_consent%'`)).length ? '✓' : '✗';
A['A8: case-startup-pack race guard (60s)'] = '→ section 6 (code review)';
console.table(A);

sub('3.2 Kategoria B — Spójność danych');
const B = {};
B['B1: ujednolicenie kategorii (cases NULL pawel_group przez join)'] = (await q(`
    SELECT COUNT(*) FROM gmp_cases c
    LEFT JOIN gmp_case_categories cat ON cat.code = c.category
    WHERE cat.pawel_group IS NULL AND c.category IS NOT NULL`))[0]?.count;
B['B2: default opłaty (RPC gmp_default_admin_fee dla pobyt_praca)'] =
    (await q(`SELECT gmp_default_admin_fee('pobyt_praca') AS fee`))[0]?.fee ?? 'ERR';
B['B3: gmp_payment_plans table'] = await exists('gmp_payment_plans', 'r') ? '✓' : '✗';
B['B4: trigger gmp_calc_balance'] = (await q(`SELECT tgname FROM pg_trigger WHERE tgname ILIKE '%calc_balance%' OR tgname ILIKE '%balance%'`)).length ? '✓' : '✗';
// B5 — performance, sekcja 9
B['B5: gmp_case_completeness performance'] = '→ section 9';
B['B6: PZ encryption status'] = 'sesja 1: ⏸ ODŁOŻONE (0 wpisów)';
B['B7: procedural daty'] = '✓ sekcja 1 sprawdzone';
B['B8: trigger after_submit_update_case'] = (await q(`SELECT tgname FROM pg_trigger WHERE tgname ILIKE '%after_submit%' OR tgname ILIKE '%submit_update%'`)).map(r => r.tgname).join(', ') || '✗';
B['B9: gmp_audit_sanitize trigger'] = (await q(`SELECT tgname FROM pg_trigger WHERE tgname ILIKE '%audit_sanitize%' OR tgname ILIKE '%sanitize%'`)).map(r => r.tgname).join(', ') || '✗';
B['B10: pracodawca tabs (sprawdzić w UI sekcji 7)'] = '→ section 7';
B['B11: gmp_tasks.group_id NULLABLE z CHECK'] = '✓ sekcja 1 sprawdzone';
B['B12: gmp_case_work_legality 1:1'] = '✓ sekcja 1 sprawdzone';
// B13 — indexy, niżej
B['B14: sekcja Co teraz'] = '✓ sekcja 1 sprawdzone';
console.table(B);

sub('3.2.1 B13 — krytyczne indexy');
const expectedIdx = [
    'idx_cases_status', 'idx_cases_stage', 'idx_cases_category', 'idx_cases_assigned_to',
    'idx_cases_employer_id', 'idx_cases_date_decision', 'idx_cases_decision_outcome',
    'idx_cases_legal_stay_status', 'idx_groups_type', 'idx_groups_employer',
    'idx_group_members_case', 'idx_documents_group', 'idx_documents_case_id',
    'idx_tasks_group', 'idx_tasks_case_id', 'idx_automation_executions_pending',
];
const idxRows = await q(`SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'idx_%'`);
const idxSet = new Set(idxRows.map(r => r.indexname));
const idxStatus = expectedIdx.map(idx => ({ idx, exists: idxSet.has(idx) ? '✓' : '✗' }));
console.table(idxStatus);
console.log(`  Total idx_* indexes on prod: ${idxRows.length}`);

sub('3.3 Kategoria C — Logika biznesowa');
const C = {};
C['C1: Wizard 5 ekranów'] = '→ section 7 (case-new.html)';
C['C2: Banner szkiców'] = '→ section 7 (cases.html)';
C['C3: view gmp_case_alerts (inactivity 14d/30d)'] = await exists('gmp_case_alerts', 'v') ? '✓' : '✗';
C['C4: gmp_employer_inaction_alerts'] = await exists('gmp_employer_inaction_alerts', 'v') ? '✓' : '✗';
C['C5: gmp_case_balance view'] = await exists('gmp_case_balance', 'v') ? '✓' : '✗';
C['C6: trigger gmp_remind_procedural_data'] = (await q(`SELECT tgname FROM pg_trigger WHERE tgname ILIKE '%procedural%' OR tgname ILIKE '%remind%'`)).map(r => r.tgname).join(', ') || '✗';
C['C7: view gmp_upcoming_installments'] = await exists('gmp_upcoming_installments', 'v') ? '✓' : '✗';
C['C8: collection_overview / collection_level'] = await exists('gmp_collection_overview', 'v') ? '✓ view' :
    ((await q(`SELECT 1 FROM information_schema.columns WHERE table_name='gmp_collections' AND column_name='collection_level'`)).length ? '✓ column' : '✗');
C['C9: aging buckets (receivables.html)'] = '→ section 7';
console.table(C);

sub('3.4 Kategoria D — Decyzje designerskie');
const D = {};
D['D1: gmp_decision_outcome enum (6 wartości)'] = (await q(`SELECT COUNT(*) FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='gmp_decision_outcome'`))[0]?.count;
D['D2: gmp_tasks NULLABLE + CHECK'] = '✓ sekcja 1';
D['D3: gmp_case_work_legality osobna 1:1'] = '✓ sekcja 1';
D['D4: gmp_audit_log dual-table'] = (await q(`SELECT to_regclass('public.gmp_audit_log')::text AS a, to_regclass('public.gmp_document_generation_log')::text AS b`))[0];
D['D5: gmp_case_completeness REGULAR view'] = (await q(`SELECT relkind FROM pg_class WHERE relname='gmp_case_completeness'`))[0]?.relkind;
D['D6: test data seed file'] = 'check supabase/seed/test_pawel_cases.sql';
console.table(D);

sub('3.5 Kategoria E — Dashboard / KPI');
const E = {};
E['E1: pg_cron gmp_weekly_work_legality_reminders'] = (await q(`SELECT jobname FROM cron.job WHERE jobname ILIKE '%legality%' OR jobname ILIKE '%legal%'`).then(r => r.map(x => x.jobname).join(', ') || '✗'));
E['E2: eksport PDF raportu legalności (employer.html)'] = '→ section 7';
E['E3: PESEL auto-fill (validators.js)'] = '→ section 7 (file)';
E['E4: dashboard kafelek Sukces decyzji 90 dni'] = '→ section 7 (dashboard.html)';
E['E5: filter Grupa w appointments.html'] = '→ section 7';
E['E6: view gmp_case_dashboard_kpi'] = await exists('gmp_case_dashboard_kpi', 'v') ? '✓' : '✗';
console.table(E);

// ============================================================
head('SEKCJA 5 — AUDYT DB');
// ============================================================

sub('5.1 Migracje (zliczamy w sekcji 5.1.1 niżej — wymaga fs scan)');

sub('5.2 Tabele i views — pełna lista gmp_*');
const tables = await q(`SELECT relkind, relname FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relname LIKE 'gmp_%'
      AND relkind IN ('r','v','m')
    ORDER BY relkind DESC, relname`);
const tablesByKind = tables.reduce((acc, r) => { (acc[r.relkind] = acc[r.relkind] || []).push(r.relname); return acc; }, {});
console.log(`  Tabele (r): ${tablesByKind.r?.length || 0}`);
console.log(`  Views (v): ${tablesByKind.v?.length || 0}`);
console.log(`  Materialized views (m): ${tablesByKind.m?.length || 0}`);
console.log(`  Tabele:`, tablesByKind.r?.join(', '));
console.log(`  Views:`, tablesByKind.v?.join(', '));
if (tablesByKind.m) console.log(`  MViews:`, tablesByKind.m?.join(', '));

sub('5.3 Triggery — wszystkie z public.gmp_*');
const triggers = await q(`
    SELECT tg.tgname, c.relname AS table_name, p.proname AS function_name
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE NOT tg.tgisinternal
      AND c.relname LIKE 'gmp_%'
    ORDER BY tg.tgname`);
console.log(`  Total triggers (gmp_*): ${triggers.length}`);
console.table(triggers);

sub('5.4 RLS — ile tabel ma RLS enabled');
const rlsTables = await q(`
    SELECT c.relname,
           c.relrowsecurity AS rls_on,
           c.relforcerowsecurity AS rls_force,
           (SELECT COUNT(*) FROM pg_policies WHERE tablename = c.relname) AS policy_count
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind = 'r'
      AND c.relname LIKE 'gmp_%'
    ORDER BY c.relname`);
const rlsOn = rlsTables.filter(r => r.rls_on);
const rlsOff = rlsTables.filter(r => !r.rls_on);
console.log(`  Tables with RLS ON: ${rlsOn.length}/${rlsTables.length}`);
console.log(`  RLS OFF (PROBLEMS):`, rlsOff.map(r => r.relname).join(', ') || 'NONE');
console.log(`  Tables with 0 policies (PROBLEMS):`, rlsTables.filter(r => r.policy_count === 0 || r.policy_count === '0').map(r => r.relname).join(', ') || 'NONE');

sub('5.5 pg_cron jobs');
const cronJobs = await q(`SELECT jobname, schedule, active, command FROM cron.job ORDER BY jobname`);
console.table(cronJobs.map(j => ({
    job: j.jobname,
    schedule: j.schedule,
    active: j.active,
    cmd: (j.command || '').slice(0, 80),
})));

sub('5.6 Indexy łącznie (gmp_* tabele)');
console.table(await q(`
    SELECT t.relname AS table_name, COUNT(i.indexname) AS index_count
    FROM pg_class t
    LEFT JOIN pg_indexes i ON i.tablename = t.relname AND i.schemaname='public'
    WHERE t.relnamespace='public'::regnamespace AND t.relkind='r' AND t.relname LIKE 'gmp_%'
    GROUP BY t.relname
    ORDER BY index_count DESC LIMIT 15`));

await c.end();
console.log('\n✓ DONE sesja 2 (DB-side audyt sekcji 2 + 3 + 5)');
