// Audyt sekcji 1 (Wymagania Pawła) + sekcji 4 (Pre-conditions) z AUDYT_PLAN.md
// Read-only — żadnych modyfikacji DB
import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});

async function q(sql, params) {
    try {
        const r = await c.query(sql, params);
        return { ok: true, rows: r.rows };
    } catch (e) {
        return { ok: false, error: e.message, rows: [{ ERROR: e.message.slice(0, 120) }] };
    }
}

function header(t) { console.log('\n' + '='.repeat(78) + '\n  ' + t + '\n' + '='.repeat(78)); }
function sub(t)    { console.log('\n--- ' + t); }

await c.connect();
console.log('✓ Connected to prod (gfwsdrbywgmceateubyq)');

// ============================================================
header('SEKCJA 1.1 — FILOZOFIA / ZASADY NADRZĘDNE');
// ============================================================

sub('1.1.1 Każdy cudzoziemiec = własna sprawa (gmp_cases)');
let r = await q(`SELECT COUNT(*) AS total_cases FROM gmp_cases`);
console.log('  Total cases:', r.rows[0]);
r = await q(`SELECT COUNT(DISTINCT case_id) AS uniq_in_groups,
                    COUNT(*) AS total_memberships
             FROM gmp_case_group_members`);
console.log('  Group members:', r.rows[0]);
r = await q(`SELECT case_id, COUNT(*) AS group_count
             FROM gmp_case_group_members
             GROUP BY case_id HAVING COUNT(*) > 1
             LIMIT 5`);
console.log('  Cases w wielu grupach (sample):', r.rows.length, 'znaleziono');
if (r.rows.length) console.log('    np.:', r.rows[0]);

sub('1.1.2 Conditional UI helper');
// Sprawdzamy obecność helpera w plikach (nie DB)
const fs = await import('fs');
const path = await import('path');
const helperPath = path.join('crm', 'components', 'conditional-modules.js');
const helperExists = fs.existsSync(helperPath);
console.log('  conditional-modules.js exists:', helperExists);

sub('1.1.3 Workflow "Co teraz" — RPC');
r = await q(`SELECT proname FROM pg_proc WHERE proname='gmp_get_next_steps' LIMIT 1`);
console.log('  RPC gmp_get_next_steps:', r.rows.length ? '✓ exists' : '✗ MISSING');
const nextStepFile = path.join('crm', 'components', 'next-step.js');
console.log('  next-step.js exists:', fs.existsSync(nextStepFile));

sub('1.1.4 Audyt PDF per kategoria — checklist seeds + audit template');
r = await q(`SELECT COUNT(*) AS defs, COUNT(DISTINCT category) AS cats
             FROM gmp_checklist_definitions`);
console.log('  Checklist definitions:', r.rows[0]);
r = await q(`SELECT COUNT(*) AS templates
             FROM gmp_document_templates
             WHERE kind = 'audit_checklist'`);
console.log('  Templates kind=audit_checklist:', r.rows[0]);

sub('1.1.5 Backfill istniejących danych — żadna sprawa NULL kind/category');
r = await q(`SELECT COUNT(*) FILTER (WHERE kind IS NULL) AS kind_null,
                    COUNT(*) FILTER (WHERE category IS NULL) AS category_null,
                    COUNT(*) AS total
             FROM gmp_cases`);
console.log('  Cases NULL counts:', r.rows[0]);

// ============================================================
header('SEKCJA 1.2 — MAPPING DANYCH');
// ============================================================

sub('1.2.1 Mapping 7 grup Pawła → gmp_case_categories.pawel_group');
r = await q(`SELECT pawel_group, COUNT(*) AS n
             FROM gmp_case_categories
             GROUP BY pawel_group ORDER BY n DESC NULLS LAST`);
console.log('  pawel_group breakdown:');
console.table(r.rows);

sub('1.2.2 Liczba spraw per pawel_group (joinem)');
r = await q(`SELECT cat.pawel_group, COUNT(c.id) AS n_cases
             FROM gmp_cases c
             LEFT JOIN gmp_case_categories cat ON cat.code = c.category
             GROUP BY cat.pawel_group ORDER BY n_cases DESC NULLS LAST`);
console.log('  Cases per pawel_group:');
console.table(r.rows);

sub('1.2.3 Tabela gmp_case_role_assignments + role enum');
r = await q(`SELECT to_regclass('public.gmp_case_role_assignments') AS exists`);
console.log('  Tabela exists:', r.rows[0].exists);
r = await q(`SELECT enumlabel FROM pg_enum
             WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='gmp_case_role')
             ORDER BY enumsortorder`);
console.log('  Role enum values:', r.rows.map(x => x.enumlabel));
r = await q(`SELECT COUNT(*) AS total, COUNT(DISTINCT role) AS roles_used,
                    COUNT(DISTINCT case_id) AS cases_with_roles
             FROM gmp_case_role_assignments`);
console.log('  Wpisów w tabeli:', r.rows[0]);

sub('1.2.4 Mapping etapów Pawła → gmp_case_stage');
r = await q(`SELECT enumlabel FROM pg_enum
             WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='gmp_case_stage')
             ORDER BY enumsortorder`);
console.log('  gmp_case_stage values:');
console.log('   ', r.rows.map(x => x.enumlabel).join(', '));

const expectedStages = [
    'weryfikacja_dokumentow', 'uzupelnienie_dokumentow', 'gotowa_do_zlozenia',
    'zlozenie_wniosku', 'oczekiwanie_na_osobiste', 'po_osobistym',
    'wezwanie', 'oczekiwanie_na_decyzje', 'odwolanie', 'zakonczenie'
];
const actualStages = r.rows.map(x => x.enumlabel);
const missing = expectedStages.filter(e => !actualStages.includes(e));
console.log('  Brakujące (z roadmapy):', missing.length ? missing : 'BRAK');

// ============================================================
header('SEKCJA 1.3 — PUNKTY 1-19 DOKUMENTU PAWŁA');
// ============================================================

sub('Pkt 3 — Kategorie sprawy (7 grup): COUNT cases NULL category');
r = await q(`SELECT COUNT(*) FILTER (WHERE category IS NULL) AS null_cat,
                    COUNT(*) AS total FROM gmp_cases`);
console.log('  cases.category NULL:', r.rows[0]);

sub('Pkt 4 — Conditional UI');
console.log('  Helper:', helperExists ? '✓ exists' : '✗ MISSING');
// Test SQL: sprawdź czy są sprawy różnych typów (do testu UI)
r = await q(`SELECT party_type, COUNT(*) AS n FROM gmp_cases GROUP BY party_type`);
console.log('  Cases per party_type:');
console.table(r.rows);
r = await q(`SELECT submission_method, COUNT(*) AS n FROM gmp_cases GROUP BY submission_method`);
console.log('  Cases per submission_method:');
console.table(r.rows);

sub('Pkt 5/11 — Etapy workflow (sprawdzone w 1.2.4)');
r = await q(`SELECT stage, COUNT(*) AS n FROM gmp_cases GROUP BY stage ORDER BY n DESC`);
console.log('  Cases per stage:');
console.table(r.rows);

sub('Pkt 8 — Elektroniczne złożenie');
r = await q(`SELECT to_regclass('public.gmp_e_submission_status') AS tbl,
                    to_regclass('public.gmp_e_submission_attachments') AS tbl_att`);
console.log('  Tables:', r.rows[0]);
r = await q(`SELECT COUNT(*) AS rows_status FROM gmp_e_submission_status`);
console.log('  e_submission_status rows:', r.rows[0]);
r = await q(`SELECT COUNT(*) AS elektronicznie FROM gmp_cases WHERE submission_method='elektronicznie'`);
console.log('  Cases elektronicznie:', r.rows[0]);
r = await q(`SELECT COUNT(*) AS coverage FROM gmp_e_submission_status ess
             JOIN gmp_cases c ON c.id = ess.case_id
             WHERE c.submission_method='elektronicznie'`);
console.log('  Coverage (status × elektronicznie):', r.rows[0]);

sub('Pkt 9 — Dane proceduralne');
r = await q(`SELECT column_name FROM information_schema.columns
             WHERE table_name='gmp_cases'
             AND (column_name LIKE 'date_%' OR column_name LIKE '%_status'
                  OR column_name='decision_outcome' OR column_name='decision_outcome_notes')
             ORDER BY column_name`);
console.log('  gmp_cases procedural columns:');
console.log('   ', r.rows.map(x => x.column_name).join(', '));

sub('Pkt 10 — Opłaty (default fees + sekcje)');
r = await q(`SELECT to_regclass('public.gmp_default_fees') AS exists`);
console.log('  gmp_default_fees:', r.rows[0]);
r = await q(`SELECT * FROM gmp_default_fees LIMIT 20`).catch(() => ({ ok: false }));
if (r.ok) console.table(r.rows);

sub('Pkt 11 — Legalność pobytu/pracy');
r = await q(`SELECT to_regclass('public.gmp_case_work_legality') AS exists`);
console.log('  gmp_case_work_legality:', r.rows[0]);
r = await q(`SELECT enumlabel FROM pg_enum
             WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='gmp_legal_status')
             ORDER BY enumsortorder`);
console.log('  gmp_legal_status enum:', r.rows.map(x => x.enumlabel));
r = await q(`SELECT column_name FROM information_schema.columns
             WHERE table_name='gmp_cases' AND column_name LIKE 'legal_%'
             ORDER BY column_name`);
console.log('  gmp_cases.legal_* columns:', r.rows.map(x => x.column_name));
r = await q(`SELECT legal_stay_status, COUNT(*) FROM gmp_cases GROUP BY legal_stay_status ORDER BY 2 DESC NULLS LAST`);
console.log('  legal_stay_status breakdown:');
console.table(r.rows);

sub('Pkt 12 — Role w sprawie (sprawdzone w 1.2.3)');

sub('Pkt 13 — Pracodawca jako grupa (Etap V)');
r = await q(`SELECT to_regclass('public.gmp_case_groups') AS tbl,
                    to_regclass('public.gmp_case_group_members') AS members`);
console.log('  Tables:', r.rows[0]);
r = await q(`SELECT type, COUNT(*) AS n FROM gmp_case_groups GROUP BY type ORDER BY 2 DESC`);
console.log('  Groups per type:');
console.table(r.rows);
r = await q(`SELECT COUNT(*) FROM gmp_case_groups WHERE type='pracodawca'`);
console.log('  Groups type=pracodawca:', r.rows[0]);

sub('Pkt 14 — Wspólne zadania grupy (gmp_tasks.group_id NULLABLE z CHECK)');
r = await q(`SELECT column_name, is_nullable
             FROM information_schema.columns
             WHERE table_name='gmp_tasks' AND column_name IN ('case_id','group_id')`);
console.table(r.rows);
r = await q(`SELECT con.conname, pg_get_constraintdef(con.oid) AS def
             FROM pg_constraint con
             JOIN pg_class cls ON cls.oid = con.conrelid
             WHERE cls.relname='gmp_tasks' AND con.contype='c'`);
console.log('  CHECK constraints on gmp_tasks:');
console.table(r.rows);
r = await q(`SELECT COUNT(*) FILTER (WHERE group_id IS NOT NULL) AS group_tasks,
                    COUNT(*) FILTER (WHERE case_id IS NOT NULL) AS case_tasks,
                    COUNT(*) FILTER (WHERE case_id IS NULL AND group_id IS NULL) AS orphans
             FROM gmp_tasks`);
console.log('  gmp_tasks coverage:', r.rows[0]);

sub('Pkt 19 — Kontrola legalności (NEW)');
r = await q(`SELECT enumlabel FROM pg_enum
             WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='gmp_case_kind')
             AND enumlabel ILIKE 'kontrola%'`);
console.log('  gmp_case_kind values matching kontrola:', r.rows.map(x => x.enumlabel));
r = await q(`SELECT COUNT(*) FROM gmp_cases WHERE kind ILIKE 'kontrola%'`);
console.log('  Cases with kontrola kind:', r.rows[0]);

// ============================================================
header('SEKCJA 4 — PRE-CONDITIONS');
// ============================================================

sub('Pre-condition 1 — Test data + audit raport (Etap 0.5)');
r = await q(`SELECT COUNT(*) AS total FROM gmp_cases`);
console.log('  Total cases (audit prod):', r.rows[0]);
r = await q(`SELECT COUNT(*) AS test_cases FROM gmp_cases
             WHERE case_number ILIKE 'TEST/%' OR case_number ILIKE '%PAWEL%'`);
console.log('  Test cases (markery):', r.rows[0]);

sub('Pre-condition 2 — PZ encryption (KRYTYCZNE)');
r = await q(`SELECT to_regclass('public.gmp_trusted_profile_credentials') AS exists`);
console.log('  Tabela exists:', r.rows[0]);
r = await q(`SELECT COUNT(*) AS rows FROM gmp_trusted_profile_credentials`).catch(() => ({ ok: false }));
if (r.ok) console.log('  Liczba wpisów:', r.rows[0]);
// Sprawdź kolumny — czy są _encrypted (BYTEA)?
r = await q(`SELECT column_name, data_type FROM information_schema.columns
             WHERE table_name='gmp_trusted_profile_credentials'
             ORDER BY ordinal_position`);
console.log('  Kolumny:');
console.table(r.rows);
// Czy pgsodium zainstalowane?
r = await q(`SELECT extname, extversion FROM pg_extension WHERE extname IN ('pgsodium','supabase_vault')`);
console.log('  Extensions zaszyfrowane:', r.rows.length ? r.rows : 'BRAK pgsodium/supabase_vault');

sub('Pre-condition 3 — gmp_tasks.case_id NULLABLE (sprawdzone w pkt 14)');
r = await q(`SELECT viewname FROM pg_views
             WHERE schemaname='public'
               AND definition ILIKE '%gmp_tasks%'
             ORDER BY viewname`);
console.log('  Views referencing gmp_tasks:', r.rows.map(x => x.viewname));

// ============================================================
header('PODSUMOWANIE — sanity check liczbowy');
// ============================================================
r = await q(`
    SELECT
        (SELECT COUNT(*) FROM gmp_cases) AS cases,
        (SELECT COUNT(*) FROM gmp_clients) AS clients,
        (SELECT COUNT(*) FROM gmp_employers) AS employers,
        (SELECT COUNT(*) FROM gmp_case_categories) AS categories,
        (SELECT COUNT(*) FROM gmp_case_groups) AS groups,
        (SELECT COUNT(*) FROM gmp_checklist_definitions) AS chk_defs,
        (SELECT COUNT(*) FROM gmp_case_checklists) AS chk_instances,
        (SELECT COUNT(*) FROM gmp_documents) AS documents,
        (SELECT COUNT(*) FROM gmp_document_templates) AS doc_templates,
        (SELECT COUNT(*) FROM gmp_e_submission_status) AS e_sub_statuses,
        (SELECT COUNT(*) FROM gmp_case_role_assignments) AS role_assignments,
        (SELECT COUNT(*) FROM gmp_case_work_legality) AS work_legality
`);
console.table(r.rows);

await c.end();
console.log('\n✓ DONE');
