import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const { Client } = pg;
const MIG_DIR = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..', 'supabase', 'migrations');

const MIGRATIONS = [
    '20260527_01_decision_outcome_enum.sql',
    '20260527_02_procedural_fields.sql',
    '20260527_03_completeness_view.sql',
    '20260527_04_procedural_remind_trigger.sql',
    '20260527_05_dashboard_kpi_view.sql',
];

const client = new Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});
await client.connect();
console.log('✓ Connected\n');

async function alreadyApplied(filename) {
    if (filename.includes('decision_outcome_enum')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_type WHERE typname = 'gmp_decision_outcome'`);
        return rows.length > 0;
    }
    if (filename.includes('procedural_fields')) {
        const { rows } = await client.query(
            `SELECT 1 FROM information_schema.columns WHERE table_name = 'gmp_cases' AND column_name = 'date_decision'`
        );
        return rows.length > 0;
    }
    if (filename.includes('completeness_view')) {
        const { rows } = await client.query(
            `SELECT 1 FROM pg_views WHERE viewname = 'gmp_case_completeness'`
        );
        return rows.length > 0;
    }
    if (filename.includes('procedural_remind_trigger')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_proc WHERE proname = 'gmp_remind_procedural_data'`);
        return rows.length > 0;
    }
    if (filename.includes('dashboard_kpi_view')) {
        const { rows } = await client.query(
            `SELECT 1 FROM pg_views WHERE viewname = 'gmp_case_dashboard_kpi'`
        );
        return rows.length > 0;
    }
    return false;
}

let applied = 0, skipped = 0, errors = 0;

for (const m of MIGRATIONS) {
    const sql = await fs.readFile(path.join(MIG_DIR, m), 'utf-8');
    process.stdout.write(`▸ ${m} ... `);

    if (await alreadyApplied(m)) {
        console.log('SKIP');
        skipped++; continue;
    }
    try {
        await client.query(sql);
        console.log('✓ OK');
        applied++;
    } catch (e) {
        console.log(`✗ FAIL: ${e.message}`);
        errors++;
        break;
    }
}

console.log(`\n=== applied=${applied}, skipped=${skipped}, errors=${errors} ===\n`);

if (errors === 0) {
    const checks = [
        { label: 'gmp_decision_outcome enum values', sql: `SELECT enumlabel FROM pg_enum WHERE enumtypid = 'gmp_decision_outcome'::regtype ORDER BY enumsortorder` },
        { label: 'gmp_cases new columns', sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'gmp_cases' AND column_name IN ('date_fingerprints','date_summon','date_decision','decision_outcome','decision_outcome_notes','braki_formalne_status','odciski_status','oplata_status') ORDER BY column_name` },
        { label: 'gmp_case_completeness sample', sql: `SELECT case_id, completeness_percent FROM gmp_case_completeness LIMIT 3` },
        { label: 'gmp_case_dashboard_kpi', sql: `SELECT * FROM gmp_case_dashboard_kpi` },
        { label: 'trigger trg_remind_procedural_data', sql: `SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'trg_remind_procedural_data'` },
    ];

    for (const c of checks) {
        try {
            const { rows } = await client.query(c.sql);
            console.log(`\n[${c.label}]`); console.table(rows);
        } catch (e) { console.log(`[${c.label}] ERR:`, e.message); }
    }
}

await client.end();
process.exit(errors === 0 ? 0 : 1);
