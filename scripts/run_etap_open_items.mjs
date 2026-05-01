import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const { Client } = pg;
const MIG_DIR = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..', 'supabase', 'migrations');

const MIGRATIONS = [
    '20260620_01_automation_executor_cron.sql',
    '20260620_02_weekly_legality_reminders.sql',
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
    if (filename.includes('automation_executor_cron')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_proc WHERE proname = 'gmp_call_automation_executor'`);
        return rows.length > 0;
    }
    if (filename.includes('weekly_legality_reminders')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_proc WHERE proname = 'gmp_create_legality_reminders'`);
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
        { label: 'pg_net extension', sql: `SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_net'` },
        { label: 'cron jobs', sql: `SELECT jobname, schedule FROM cron.job WHERE jobname LIKE 'gmp_%' ORDER BY jobname` },
        { label: 'vault.secrets check (czy service_role_key jest)', sql: `SELECT name FROM vault.decrypted_secrets WHERE name = 'service_role_key'` },
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
