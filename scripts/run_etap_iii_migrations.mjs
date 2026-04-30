import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const { Client } = pg;
const MIG_DIR = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..', 'supabase', 'migrations');

const MIGRATIONS = [
    '20260520_01_e_submission_enums.sql',
    '20260520_02_e_submission_table.sql',
    '20260520_03_e_submission_trigger.sql',
    '20260520_04_after_submit_trigger.sql',
    '20260520_05_backfill_e_submission.sql',
    '20260520_06_signed_status_sync_trigger.sql',
    '20260520_07_enforce_employer_consent.sql',
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
    if (filename.includes('e_submission_enums')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_type WHERE typname = 'gmp_e_submission_step'`);
        return rows.length > 0;
    }
    if (filename.includes('e_submission_table')) {
        const { rows } = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'gmp_e_submission_status'`);
        return rows.length > 0;
    }
    if (filename.includes('e_submission_trigger')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_proc WHERE proname = 'gmp_ensure_e_submission_status'`);
        return rows.length > 0;
    }
    if (filename.includes('after_submit_trigger')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_proc WHERE proname = 'gmp_after_submit_update_case'`);
        return rows.length > 0;
    }
    if (filename.includes('backfill_e_submission')) {
        // Idempotent — zawsze wykonuj
        return false;
    }
    if (filename.includes('signed_status_sync')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_proc WHERE proname = 'gmp_sync_zalacznik_signed_status'`);
        return rows.length > 0;
    }
    if (filename.includes('enforce_employer_consent')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_proc WHERE proname = 'gmp_check_employer_consent'`);
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
        { label: 'gmp_e_submission_status table', sql: `SELECT COUNT(*)::int AS rows FROM gmp_e_submission_status` },
        { label: 'gmp_e_submission_attachments table', sql: `SELECT COUNT(*)::int AS rows FROM gmp_e_submission_attachments` },
        { label: 'enums', sql: `SELECT typname FROM pg_type WHERE typname LIKE 'gmp_%submission%' OR typname LIKE 'gmp_%zalacznik%' OR typname LIKE 'gmp_oplata%' ORDER BY typname` },
        { label: 'triggers', sql: `SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE '%e_subm%' OR trigger_name LIKE '%submit%' OR trigger_name LIKE '%zalacznik%' OR trigger_name LIKE '%employer_consent%' ORDER BY trigger_name` },
        { label: 'spraw elektronicznie po backfill', sql: `SELECT COUNT(*)::int AS n FROM gmp_e_submission_status` },
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
