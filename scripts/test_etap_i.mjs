// Smoke test Etapu I po migracjach
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const client = new Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq',
    database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});
await client.connect();

console.log('\n=== TEST RPC gmp_get_next_steps ===\n');

// Pobierz dowolną aktywną sprawę z planem rat (overdue)
const { rows: cases } = await client.query(`
    SELECT c.id, c.case_number, c.assigned_to,
           COUNT(pi.*) FILTER (WHERE pi.status = 'overdue') AS overdue_count
    FROM gmp_cases c
    LEFT JOIN gmp_payment_installments pi ON pi.case_id = c.id
    WHERE c.status = 'aktywna'
    GROUP BY c.id, c.case_number, c.assigned_to
    HAVING COUNT(pi.*) FILTER (WHERE pi.status = 'overdue') > 0
    LIMIT 3
`);

console.log(`Znaleziono ${cases.length} spraw aktywnych z zaległymi ratami\n`);

for (const c of cases) {
    process.stdout.write(`Test ${c.case_number}: `);
    const { rows: result } = await client.query(`SELECT gmp_get_next_steps($1, $2) AS steps`,
        [c.id, c.assigned_to]);
    const steps = result[0].steps;
    console.log(`${steps?.length || 0} kroków`);
    if (steps?.length) {
        steps.forEach(s => console.log(`  [P${s.priority}] ${s.icon} — ${s.label}`));
    }
}

console.log('\n=== TEST gmp_upcoming_installments view ===\n');
const { rows: upcoming } = await client.query(`SELECT COUNT(*) AS total FROM gmp_upcoming_installments`);
console.log(`Zbliżające się raty (14 dni): ${upcoming[0].total}`);

if (Number(upcoming[0].total) > 0) {
    const { rows: top5 } = await client.query(`
        SELECT case_number, first_name, last_name, amount, due_date, days_until_due, urgency
        FROM gmp_upcoming_installments LIMIT 5
    `);
    console.table(top5);
}

console.log('\n=== TEST applyConditionalModules — sprawdzenie czy buildCaseUiContext znajdzie kategorie ===\n');
const { rows: catTest } = await client.query(`
    SELECT c.id, c.case_number, c.party_type, c.kind, c.category,
           cat.pawel_group, cat.label AS category_label
    FROM gmp_cases c
    LEFT JOIN gmp_case_categories cat ON cat.code = c.category
    WHERE c.status = 'aktywna'
    LIMIT 5
`);
console.table(catTest);

console.log('\n=== Final stats ===\n');
const { rows: final } = await client.query(`
    SELECT
        (SELECT COUNT(*) FROM gmp_cases) AS total_cases,
        (SELECT COUNT(*) FROM gmp_cases WHERE category IS NULL) AS cases_no_category,
        (SELECT COUNT(*) FROM gmp_case_categories WHERE pawel_group IS NOT NULL) AS categories_with_pawel_group,
        (SELECT COUNT(*) FROM gmp_case_categories WHERE is_active) AS categories_active,
        (SELECT COUNT(*) FROM gmp_crm_appointments WHERE employer_id IS NOT NULL) AS appts_with_employer,
        (SELECT COUNT(*) FROM gmp_crm_appointments) AS total_appts
`);
console.table(final);

await client.end();
