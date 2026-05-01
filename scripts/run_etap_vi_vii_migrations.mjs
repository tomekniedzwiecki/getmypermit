import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const { Client } = pg;
const MIG_DIR = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..', 'supabase', 'migrations');

const MIGRATIONS = [
    '20260610_01_legal_status_enum.sql',
    '20260610_02_legal_stay_status.sql',
    '20260610_03_work_legality_table.sql',
    '20260610_04_dashboard_kpi_legal.sql',
    '20260610_05_legal_status_cron.sql',
    '20260615_01_automation_flows.sql',
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
    if (filename.includes('legal_status_enum')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_type WHERE typname = 'gmp_legal_status'`);
        return rows.length > 0;
    }
    if (filename.includes('legal_stay_status')) {
        const { rows } = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'gmp_cases' AND column_name = 'legal_stay_status'`);
        return rows.length > 0;
    }
    if (filename.includes('work_legality_table')) {
        const { rows } = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'gmp_case_work_legality'`);
        return rows.length > 0;
    }
    if (filename.includes('dashboard_kpi_legal')) {
        // Sprawdź czy view ma kolumnę legal_red
        const { rows } = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'gmp_case_dashboard_kpi' AND column_name = 'legal_red'`);
        return rows.length > 0;
    }
    if (filename.includes('legal_status_cron')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_proc WHERE proname = 'gmp_recalc_legal_status_all'`);
        return rows.length > 0;
    }
    if (filename.includes('automation_flows')) {
        const { rows } = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'gmp_automation_flows'`);
        return rows.length > 0;
    }
    return false;
}

let applied = 0, skipped = 0, errors = 0;

for (const m of MIGRATIONS) {
    const sql = await fs.readFile(path.join(MIG_DIR, m), 'utf-8');
    process.stdout.write(`▸ ${m} ... `);
    if (await alreadyApplied(m)) { console.log('SKIP'); skipped++; continue; }
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
        { label: 'gmp_legal_status enum', sql: `SELECT enumlabel FROM pg_enum WHERE enumtypid = 'gmp_legal_status'::regtype ORDER BY enumsortorder` },
        { label: 'gmp_cases.legal_stay_status (rozkład)', sql: `SELECT COALESCE(legal_stay_status::text, 'NULL') AS status, COUNT(*)::int AS n FROM gmp_cases GROUP BY 1 ORDER BY n DESC` },
        { label: 'gmp_case_work_legality table', sql: `SELECT COUNT(*)::int AS rows FROM gmp_case_work_legality` },
        { label: 'gmp_case_dashboard_kpi (legal cols)', sql: `SELECT * FROM gmp_case_dashboard_kpi` },
        { label: 'pg_cron job legal_status_nightly', sql: `SELECT jobname, schedule FROM cron.job WHERE jobname = 'gmp_legal_status_nightly'` },
        { label: 'automation_flows / steps / executions', sql: `SELECT 'flows' AS t, COUNT(*)::int AS n FROM gmp_automation_flows UNION ALL SELECT 'steps', COUNT(*)::int FROM gmp_automation_steps UNION ALL SELECT 'executions', COUNT(*)::int FROM gmp_automation_executions` },
        { label: 'automation enums', sql: `SELECT typname FROM pg_type WHERE typname LIKE 'gmp_automation_%' ORDER BY typname` },
        { label: 'automation triggers', sql: `SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE 'trg_automation_%'` },
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
