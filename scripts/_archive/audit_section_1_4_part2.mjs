// Druga część audytu: weryfikacja anomalii znalezionych w part1
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
function head(t) { console.log('\n=== ' + t); }
await c.connect();

head('A) gmp_checklist_definitions — schema');
console.table(await q(`SELECT column_name, data_type FROM information_schema.columns
                       WHERE table_name='gmp_checklist_definitions' ORDER BY ordinal_position`));

head('B) gmp_default_fees — istnieje?');
console.table(await q(`SELECT to_regclass('public.gmp_default_fees') AS exists`));
// Sprawdź alternatywne nazwy
console.table(await q(`SELECT table_name FROM information_schema.tables
                       WHERE table_schema='public'
                         AND (table_name LIKE '%fee%' OR table_name LIKE '%oplat%' OR table_name LIKE '%default%')
                       ORDER BY table_name`));

head('C) Pkt 19 — kontrola po wartości enum (nie LIKE)');
console.table(await q(`SELECT kind, COUNT(*) FROM gmp_cases
                       WHERE kind = 'kontrola_legalnosci_pobytu_pracy' GROUP BY kind`));
console.table(await q(`SELECT kind::text, COUNT(*) FROM gmp_cases
                       WHERE kind::text LIKE 'kontrola%' GROUP BY kind`));

head('D) Mapping: kategorie cases → pawel_group (top 30 kategorii)');
console.table(await q(`SELECT c.category, cat.pawel_group, COUNT(*) AS n
                       FROM gmp_cases c
                       LEFT JOIN gmp_case_categories cat ON cat.code = c.category
                       GROUP BY c.category, cat.pawel_group
                       ORDER BY n DESC LIMIT 30`));

head('E) Liczba kategorii bez pawel_group');
console.table(await q(`SELECT COUNT(*) FROM gmp_case_categories WHERE pawel_group IS NULL`));
console.table(await q(`SELECT code, label, pawel_group FROM gmp_case_categories
                       WHERE pawel_group IS NULL ORDER BY code`));

head('F) submission_method NULL — czy to OK?');
console.table(await q(`SELECT
                         status, COUNT(*) FILTER (WHERE submission_method IS NULL) AS null_method,
                         COUNT(*) AS total
                       FROM gmp_cases GROUP BY status ORDER BY total DESC`));

head('G) stage NULL — czy to OK (sprawy zakończone?)');
console.table(await q(`SELECT
                         status, COUNT(*) FILTER (WHERE stage IS NULL) AS null_stage,
                         COUNT(*) AS total
                       FROM gmp_cases GROUP BY status ORDER BY total DESC`));

head('H) Kategorie z NULL pawel_group → ile spraw');
console.table(await q(`SELECT cat.code, COUNT(c.id) AS cases_count
                       FROM gmp_case_categories cat
                       LEFT JOIN gmp_cases c ON c.category = cat.code
                       WHERE cat.pawel_group IS NULL
                       GROUP BY cat.code ORDER BY cases_count DESC`));

head('I) Tabela gmp_case_completeness — istnieje?');
console.table(await q(`SELECT to_regclass('public.gmp_case_completeness') AS exists,
                              c.relkind FROM pg_class c
                       WHERE c.relname='gmp_case_completeness'`));

head('J) gmp_case_dashboard_kpi (E6) — istnieje?');
console.table(await q(`SELECT to_regclass('public.gmp_case_dashboard_kpi') AS exists`));

head('K) Pre-condition 3 — views z gmp_tasks: LEFT vs INNER?');
const viewDefs = await q(`SELECT viewname, pg_get_viewdef('public.'||viewname||'') AS def
                          FROM pg_views WHERE schemaname='public'
                            AND definition ILIKE '%gmp_tasks%'`);
viewDefs.forEach(v => {
    console.log('--- view:', v.viewname);
    const def = (v.def || '').toLowerCase();
    const usesInner = def.includes('inner join') && def.includes('gmp_tasks');
    const usesLeft  = def.includes('left join') && def.includes('gmp_tasks');
    const usesRaw   = def.includes('from gmp_tasks') || def.includes('from public.gmp_tasks');
    console.log('   inner join gmp_tasks:', usesInner, '| left join gmp_tasks:', usesLeft, '| from gmp_tasks:', usesRaw);
});

head('L) Pkt 4 — czy przykładowe sprawy individual mają wypełnione employer_id?');
console.table(await q(`SELECT COUNT(*) FILTER (WHERE party_type='individual' AND employer_id IS NOT NULL) AS contradictions,
                              COUNT(*) FILTER (WHERE party_type='employer' AND employer_id IS NULL) AS employer_no_id,
                              COUNT(*) AS total FROM gmp_cases`));

head('M) Pkt 5 — czy pole stage_progress / kanban data jest wypełnione?');
console.table(await q(`SELECT column_name FROM information_schema.columns
                       WHERE table_name='gmp_cases' AND column_name LIKE '%stage%' ORDER BY column_name`));

head('N) Sprawdzenie czy "wniosek_zlozony" stage istnieje (plan template wspomina)');
console.table(await q(`SELECT enumlabel FROM pg_enum
                       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='gmp_case_stage')
                         AND enumlabel ILIKE '%wniosek%'`));

head('O) Pkt 8 — czy enum gmp_e_submission_step ma 10 wartości');
console.table(await q(`SELECT enumlabel FROM pg_enum
                       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='gmp_e_submission_step')
                       ORDER BY enumsortorder`));

await c.end();
console.log('\n✓ DONE part2');
