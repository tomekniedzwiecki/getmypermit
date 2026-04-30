import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const { Client } = pg;
const MIG_DIR = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..', 'supabase', 'migrations');

const MIGRATIONS = [
    '20260514_01_pawel_case_roles_enums.sql',
    '20260514_02_pawel_case_roles_table.sql',
    '20260514_03_default_fees.sql',
    '20260514_04_startup_tasks_rpc.sql',
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
    if (filename.includes('case_roles_enums')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_type WHERE typname = 'gmp_case_role'`);
        return rows.length > 0;
    }
    if (filename.includes('case_roles_table')) {
        const { rows } = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'gmp_case_role_assignments'`);
        return rows.length > 0;
    }
    if (filename.includes('default_fees')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_proc WHERE proname = 'gmp_default_admin_fee'`);
        return rows.length > 0;
    }
    if (filename.includes('startup_tasks_rpc')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_proc WHERE proname = 'gmp_create_startup_tasks'`);
        return rows.length > 0;
    }
    return false;
}

let applied = 0, skipped = 0, errors = 0;

for (const m of MIGRATIONS) {
    const sql = await fs.readFile(path.join(MIG_DIR, m), 'utf-8');
    process.stdout.write(`▸ ${m} ... `);

    if (await alreadyApplied(m)) {
        console.log('SKIP (już wdrożone)');
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
        { label: 'gmp_case_role enum', sql: `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'gmp_case_role' ORDER BY enumsortorder` },
        { label: 'gmp_case_role_assignments table', sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'gmp_case_role_assignments' ORDER BY ordinal_position LIMIT 10` },
        { label: 'gmp_default_admin_fee — pobyt_praca', sql: `SELECT gmp_default_admin_fee('pobyt_praca') AS amount` },
        { label: 'gmp_default_admin_fee — pobyt_staly', sql: `SELECT gmp_default_admin_fee('pobyt_staly') AS amount` },
        { label: 'gmp_create_startup_tasks function', sql: `SELECT proname, pg_get_function_arguments(oid) AS args FROM pg_proc WHERE proname = 'gmp_create_startup_tasks'` },
    ];

    for (const c of checks) {
        try {
            const { rows } = await client.query(c.sql);
            console.log(`\n[${c.label}]`);
            console.table(rows);
        } catch (e) { console.log(`\n[${c.label}] ERROR: ${e.message}`); }
    }
}

await client.end();
process.exit(errors === 0 ? 0 : 1);
