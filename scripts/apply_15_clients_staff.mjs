// Aplikuje migrację 15 (staff może tworzyć/edytować klientów) w transakcji,
// z verify że (a) policies istnieją, (b) anon dalej nie widzi klientów (RLS sanity).
import 'dotenv/config';
import pgPkg from 'pg';
import fs from 'fs';

const URL = 'https://gfwsdrbywgmceateubyq.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd3NkcmJ5d2dtY2VhdGV1YnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mzg1MjksImV4cCI6MjA5MjAxNDUyOX0.Qnn4MbtfApJ8sVwkpXNqNoHCBcGymS2U04kRLIVRta0';

const c = new pgPkg.Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.gfwsdrbywgmceateubyq',
  database: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
});
await c.connect();

console.log('=== BEFORE: anon test (powinien dawać 0 wierszy / RLS) ===');
const r0 = await fetch(`${URL}/rest/v1/gmp_clients?select=id&limit=1`, {
  headers: { apikey: ANON, Authorization: 'Bearer ' + ANON },
});
const j0 = await r0.json();
console.log(`  status=${r0.status}, rows=${Array.isArray(j0) ? j0.length : 'err:' + JSON.stringify(j0)}`);

console.log('\n=== BEFORE: aktualne policies na gmp_clients ===');
const polBefore = await c.query(`
    SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_expr,
           pg_get_expr(polwithcheck, polrelid) AS check_expr
    FROM pg_policy WHERE polrelid = 'public.gmp_clients'::regclass
    ORDER BY polname
`);
console.table(polBefore.rows.map(p => ({ name: p.polname, cmd: p.polcmd })));

const sql = fs.readFileSync('supabase/migrations/20260502_15_clients_staff_can_create.sql', 'utf8');

console.log('\n=== Apply migracja 15 w transakcji ===');
await c.query('BEGIN');
try {
  await c.query(sql);
  console.log('  DDL OK');

  // Sanity 1: kolumna istnieje
  const col = await c.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='gmp_clients' AND column_name='created_by_staff_id'
  `);
  if (col.rows.length === 0) throw new Error('Kolumna created_by_staff_id nie powstała');
  console.log('  ✓ kolumna created_by_staff_id obecna');

  // Sanity 2: trigger istnieje
  const trg = await c.query(`
      SELECT 1 FROM pg_trigger
      WHERE tgrelid = 'public.gmp_clients'::regclass AND tgname = 'trg_gmp_clients_set_created_by'
  `);
  if (trg.rows.length === 0) throw new Error('Trigger nie powstał');
  console.log('  ✓ trigger trg_gmp_clients_set_created_by aktywny');

  // Sanity 3: 4 policies (select, insert, update, delete)
  const pols = await c.query(`
      SELECT polname, polcmd FROM pg_policy
      WHERE polrelid = 'public.gmp_clients'::regclass
      ORDER BY polname
  `);
  const expected = {
    gmp_clients_select_scoped: 'r',
    gmp_clients_insert_staff: 'a',
    gmp_clients_update_staff_scoped: 'w',
    gmp_clients_delete_manager: 'd',
  };
  const got = Object.fromEntries(pols.rows.map(p => [p.polname, p.polcmd]));
  for (const [name, cmd] of Object.entries(expected)) {
    if (got[name] !== cmd) throw new Error(`Policy ${name} (oczekiwane cmd=${cmd}) brakuje lub niewłaściwa: ${JSON.stringify(got[name])}`);
  }
  console.log('  ✓ 4 policies (select/insert/update/delete) na miejscu');

  // Stara policy "modify_manager" usunięta?
  if (got['gmp_clients_modify_manager']) throw new Error('Stara policy gmp_clients_modify_manager nadal istnieje');
  console.log('  ✓ stara policy gmp_clients_modify_manager usunięta');

  await c.query('COMMIT');
  console.log('  COMMIT OK');
} catch (e) {
  await c.query('ROLLBACK');
  console.error('MIGRATION FAILED:', e.message);
  await c.end();
  process.exit(1);
}

console.log('\n=== AFTER: anon test (security invariant — nadal 0 wierszy / RLS deny) ===');
const r1 = await fetch(`${URL}/rest/v1/gmp_clients?select=id&limit=1`, {
  headers: { apikey: ANON, Authorization: 'Bearer ' + ANON },
});
const j1 = await r1.json();
const rows1 = Array.isArray(j1) ? j1.length : -1;
console.log(`  status=${r1.status}, rows=${rows1}`);
if (rows1 > 0) {
  console.error('!!! ALARM: anon zaczął widzieć gmp_clients. Coś się rozjechało.');
  await c.end();
  process.exit(2);
}

console.log('\n=== AFTER: policies finalne ===');
const polAfter = await c.query(`
    SELECT polname, polcmd FROM pg_policy
    WHERE polrelid = 'public.gmp_clients'::regclass ORDER BY polname
`);
console.table(polAfter.rows);

await c.end();
console.log('\n✅ Migracja 15 zaaplikowana i zweryfikowana.');
