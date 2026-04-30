import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const { Client } = pg;
const MIG_DIR = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..', 'supabase', 'migrations');

const MIGRATIONS = [
    '20260512_01_checklist_status_enum.sql',
    '20260512_02_checklist_tables.sql',
    '20260512_03_checklist_rpc.sql',
    '20260513_01_checklist_seeds_all.sql',
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
    if (filename.includes('checklist_status_enum')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_type WHERE typname = 'gmp_checklist_status'`);
        return rows.length > 0;
    }
    if (filename.includes('checklist_tables')) {
        const { rows } = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'gmp_case_checklists'`);
        return rows.length > 0;
    }
    if (filename.includes('checklist_rpc')) {
        const { rows } = await client.query(`SELECT 1 FROM pg_proc WHERE proname = 'gmp_instantiate_checklist'`);
        return rows.length > 0;
    }
    if (filename.includes('checklist_seeds_all')) {
        const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM gmp_checklist_definitions`);
        return Number(rows[0].n) >= 200;  // 11 list × ~20 pozycji = ~250
    }
    return false;
}

let applied = 0, skipped = 0, errors = 0;

for (const m of MIGRATIONS) {
    const sql = await fs.readFile(path.join(MIG_DIR, m), 'utf-8');
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

console.log(`\n=== applied=${applied}, skipped=${skipped}, errors=${errors} ===\n`);

if (errors === 0) {
    const { rows: byCategory } = await client.query(`
        SELECT category_code, COUNT(*)::int AS n
        FROM gmp_checklist_definitions
        WHERE is_active = TRUE
        GROUP BY category_code
        ORDER BY n DESC
    `);
    console.log('Definicje per kategoria:');
    console.table(byCategory);

    const { rows: bySection } = await client.query(`
        SELECT section, COUNT(*)::int AS n
        FROM gmp_checklist_definitions
        GROUP BY section
        ORDER BY n DESC
    `);
    console.log('\nDefinicje per sekcja:');
    console.table(bySection);

    // Test instantiate dla pierwszej aktywnej sprawy z pobyt_praca
    const { rows: testCase } = await client.query(`
        SELECT id, case_number FROM gmp_cases
        WHERE category = 'pobyt_praca' AND status = 'aktywna' LIMIT 1
    `);
    if (testCase.length) {
        const { rows: result } = await client.query(
            `SELECT gmp_instantiate_checklist($1, FALSE) AS inserted`,
            [testCase[0].id]
        );
        console.log(`\nTest instantiate dla ${testCase[0].case_number}: dodano ${result[0].inserted} pozycji`);

        const { rows: cnt } = await client.query(
            `SELECT COUNT(*)::int AS n FROM gmp_case_checklists WHERE case_id = $1`,
            [testCase[0].id]
        );
        console.log(`Łączna liczba pozycji w sprawie: ${cnt[0].n}`);
    }
}

await client.end();
process.exit(errors === 0 ? 0 : 1);
