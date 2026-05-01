import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const { Client } = pg;
const MIG_DIR = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..', 'supabase', 'migrations');

const MIGRATIONS = [
    '20260603_01_groups_enum.sql',
    '20260603_02_groups_tables.sql',
    '20260603_03_documents_tasks_group_link.sql',
    '20260603_04_auto_employer_groups.sql',
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
    if (filename.includes('groups_enum')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_type WHERE typname = 'gmp_case_group_type'`);
        return rows.length > 0;
    }
    if (filename.includes('groups_tables')) {
        const { rows } = await client.query(
            `SELECT 1 FROM information_schema.tables WHERE table_name = 'gmp_case_groups'`
        );
        return rows.length > 0;
    }
    if (filename.includes('documents_tasks_group_link')) {
        const { rows } = await client.query(
            `SELECT 1 FROM information_schema.columns WHERE table_name = 'gmp_documents' AND column_name = 'group_id'`
        );
        return rows.length > 0;
    }
    if (filename.includes('auto_employer_groups')) {
        // Idempotent (NOT EXISTS / ON CONFLICT) — zawsze wykonuj
        return false;
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
        { label: 'gmp_case_group_type values', sql: `SELECT enumlabel FROM pg_enum WHERE enumtypid = 'gmp_case_group_type'::regtype ORDER BY enumsortorder` },
        { label: 'gmp_case_groups (count + sample)', sql: `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE type = 'pracodawca')::int AS pracodawcy, COUNT(*) FILTER (WHERE type = 'rodzina')::int AS rodziny FROM gmp_case_groups` },
        { label: 'top 5 pracodawca grupy (po liczbie spraw)', sql: `SELECT g.name, g.id, COUNT(m.case_id)::int AS cases FROM gmp_case_groups g LEFT JOIN gmp_case_group_members m ON m.group_id = g.id WHERE g.type = 'pracodawca' GROUP BY g.id, g.name ORDER BY cases DESC LIMIT 5` },
        { label: 'gmp_documents.group_id column', sql: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'gmp_documents' AND column_name IN ('case_id', 'group_id')` },
        { label: 'gmp_tasks.group_id column', sql: `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'gmp_tasks' AND column_name IN ('case_id', 'group_id')` },
        { label: 'CHECK constraints', sql: `SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname IN ('chk_doc_case_or_group', 'chk_task_case_or_group')` },
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
