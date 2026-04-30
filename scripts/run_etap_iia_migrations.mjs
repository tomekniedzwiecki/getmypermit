// Wykonaj migracje Etapu II-A
import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const { Client } = pg;
const MIG_DIR = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..', 'supabase', 'migrations');

const MIGRATIONS = [
    '20260507_01_document_status_enum.sql',
    '20260507_02_documents_status_columns.sql',
    '20260507_03_template_kinds_enum.sql',
    '20260507_04_templates_extend.sql',
    '20260507_05_storage_buckets.sql',
];

const client = new Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 5432, user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});
await client.connect();
console.log('✓ Connected\n');

async function alreadyApplied(filename) {
    if (filename.includes('document_status_enum')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_type WHERE typname = 'gmp_document_status'`);
        return rows.length > 0;
    }
    if (filename.includes('documents_status_columns')) {
        const { rows } = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'gmp_documents' AND column_name = 'status'`);
        return rows.length > 0;
    }
    if (filename.includes('template_kinds_enum')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_type WHERE typname = 'gmp_document_template_kind'`);
        return rows.length > 0;
    }
    if (filename.includes('templates_extend')) {
        const { rows } = await client.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'gmp_document_templates' AND column_name = 'kind'`);
        return rows.length > 0;
    }
    if (filename.includes('storage_buckets')) {
        const { rows } = await client.query(`SELECT 1 FROM storage.buckets WHERE id = 'case-documents'`);
        return rows.length > 0;
    }
    return false;
}

let applied = 0, skipped = 0, errors = 0;

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
        await client.query(sql);
        console.log('✓ OK');
        applied++;
    } catch (e) {
        console.log(`✗ FAIL: ${e.message}`);
        errors++;
        break;
    }
}

console.log(`\n=== Podsumowanie: applied=${applied}, skipped=${skipped}, errors=${errors} ===\n`);

if (errors === 0) {
    console.log('--- Weryfikacja II-A ---\n');

    const checks = [
        { label: 'gmp_document_status enum', sql: `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'gmp_document_status' ORDER BY enumsortorder` },
        { label: 'gmp_documents new columns', sql: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'gmp_documents' AND column_name IN ('status', 'sent_at', 'signed_at', 'signed_by_party') ORDER BY column_name` },
        { label: 'gmp_document_template_kind enum (count)', sql: `SELECT COUNT(*)::int AS n FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'gmp_document_template_kind'` },
        { label: 'gmp_document_templates new columns', sql: `SELECT column_name FROM information_schema.columns WHERE table_name = 'gmp_document_templates' AND column_name IN ('kind', 'auto_for_categories', 'version', 'updated_at') ORDER BY column_name` },
        { label: 'gmp_document_generation_log table', sql: `SELECT COUNT(*)::int AS row_count FROM gmp_document_generation_log` },
        { label: 'gmp_sanitize_audit_jsonb function', sql: `SELECT proname FROM pg_proc WHERE proname = 'gmp_sanitize_audit_jsonb'` },
        { label: 'storage buckets', sql: `SELECT id, public, file_size_limit FROM storage.buckets WHERE id IN ('case-documents', 'document-templates')` },
        { label: 'document_generated activity_type', sql: `SELECT 1 AS exists FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'gmp_activity_type' AND e.enumlabel = 'document_generated'` },
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
