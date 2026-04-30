// Wykonaj migracje Etapu I po kolei, z weryfikacją.
// Każda migracja w osobnej transakcji (wymóg dla ALTER TYPE ENUM).
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const { Client } = pg;

const MIGRATIONS = [
    '20260501_01_extend_kind_enum.sql',
    '20260501_02_use_kind_enum.sql',
    '20260501_03_extend_stage_enum.sql',
    '20260501_04_categories_grouping.sql',
    '20260501_05_upcoming_installments_view.sql',
    '20260501_06_backfill_categories.sql',
    '20260501_07_appointments_employer.sql',
    '20260501_08_next_steps_rpc.sql',
];

const MIG_DIR = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..', 'supabase', 'migrations');

const client = new Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq',
    database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});
await client.connect();
console.log('✓ Connected\n');

async function alreadyApplied(filename) {
    // Heurystyki: sprawdź czy obiekty już istnieją
    if (filename.includes('extend_kind_enum')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'gmp_case_kind' AND e.enumlabel = 'przejeta_do_dalszego_prowadzenia' LIMIT 1`);
        return rows.length > 0;
    }
    if (filename.includes('use_kind_enum')) {
        const { rows } = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'gmp_cases' AND column_name = 'kind_variant'`);
        return rows.length > 0;
    }
    if (filename.includes('extend_stage_enum')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'gmp_case_stage' AND e.enumlabel = 'gotowa_do_zlozenia' LIMIT 1`);
        return rows.length > 0;
    }
    if (filename.includes('categories_grouping')) {
        const { rows } = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'gmp_case_categories' AND column_name = 'pawel_group'`);
        return rows.length > 0;
    }
    if (filename.includes('upcoming_installments_view')) {
        const { rows } = await client.query(`SELECT 1 FROM information_schema.views WHERE table_name = 'gmp_upcoming_installments'`);
        return rows.length > 0;
    }
    if (filename.includes('appointments_employer')) {
        const { rows } = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'gmp_crm_appointments' AND column_name = 'employer_id'`);
        return rows.length > 0;
    }
    if (filename.includes('next_steps_rpc')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_proc WHERE proname = 'gmp_get_next_steps'`);
        return rows.length > 0;
    }
    return false;  // 06 backfill — wykonujemy zawsze (idempotentne UPDATE)
}

let applied = 0;
let skipped = 0;
let errors = 0;

for (const m of MIGRATIONS) {
    const filepath = path.join(MIG_DIR, m);
    const sql = await fs.readFile(filepath, 'utf-8');

    process.stdout.write(`▸ ${m} ... `);

    if (await alreadyApplied(m)) {
        console.log('SKIP (już wdrożone)');
        skipped++;
        continue;
    }

    try {
        // Każda migracja w osobnej transakcji
        await client.query(sql);
        console.log('✓ OK');
        applied++;
    } catch (e) {
        console.log(`✗ FAIL: ${e.message}`);
        errors++;
        // STOP przy pierwszym błędzie
        break;
    }
}

console.log(`\n=== Podsumowanie: applied=${applied}, skipped=${skipped}, errors=${errors} ===\n`);

// Weryfikacja końcowa
if (errors === 0) {
    console.log('--- Weryfikacja stanu po migracjach ---\n');

    const checks = [
        { label: 'gmp_case_kind values', sql: `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'gmp_case_kind' ORDER BY enumlabel` },
        { label: 'gmp_case_stage gotowa_do_zlozenia', sql: `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'gmp_case_stage' AND enumlabel = 'gotowa_do_zlozenia'` },
        { label: 'pawel_group distribution', sql: `SELECT pawel_group, COUNT(*)::int AS n FROM gmp_case_categories WHERE is_active GROUP BY pawel_group ORDER BY n DESC` },
        { label: 'kind_variant column', sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'gmp_cases' AND column_name = 'kind_variant'` },
        { label: 'gmp_upcoming_installments view (sample 3)', sql: `SELECT case_number, installment_number, amount, due_date, days_until_due, urgency FROM gmp_upcoming_installments LIMIT 3` },
        { label: 'gmp_crm_appointments.employer_id', sql: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'gmp_crm_appointments' AND column_name = 'employer_id'` },
        { label: 'gmp_get_next_steps function', sql: `SELECT proname, pg_get_function_arguments(oid) AS args FROM pg_proc WHERE proname = 'gmp_get_next_steps'` },
        { label: 'category=NULL after backfill', sql: `SELECT COUNT(*)::int AS n FROM gmp_cases WHERE category IS NULL` },
        { label: 'New categories', sql: `SELECT code, label, pawel_group FROM gmp_case_categories WHERE code IN ('kontrola_legalnosci_zatrudnienia', 'zez_a')` },
    ];

    for (const c of checks) {
        try {
            const { rows } = await client.query(c.sql);
            console.log(`\n[${c.label}]`);
            console.table(rows);
        } catch (e) {
            console.log(`\n[${c.label}] ERROR: ${e.message}`);
        }
    }
}

await client.end();
process.exit(errors === 0 ? 0 : 1);
