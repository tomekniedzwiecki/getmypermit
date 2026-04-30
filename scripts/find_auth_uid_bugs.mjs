import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD, ssl: {rejectUnauthorized: false}});
await c.connect();

console.log('=== Wszystkie kolumny FK na gmp_staff ===');
const r1 = await c.query(`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'gmp_staff'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
`);
console.table(r1.rows);

console.log('\n=== Funkcje przypisujące auth.uid() do pola (potencjalny bug) ===');
const r2 = await c.query(`
    SELECT proname, pg_get_functiondef(oid) AS def
    FROM pg_proc
    WHERE proname LIKE 'gmp_%'
      AND pg_get_functiondef(oid) ~ '=\\s*auth\\.uid\\(\\)'
`);
for (const row of r2.rows) {
    const lines = row.def.split('\n').filter(l => /=\s*auth\.uid\(\)/.test(l) && !l.trim().startsWith('--'));
    if (lines.length > 0) {
        console.log(`\n${row.proname}:`);
        lines.forEach(l => console.log('  ' + l.trim().substring(0, 200)));
    }
}

await c.end();
