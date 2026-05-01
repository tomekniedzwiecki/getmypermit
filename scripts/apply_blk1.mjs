// Apply BLK-1 w transakcji: ALTER VIEW + verify (anon REST get 0 rows on each view) + commit/rollback.
import 'dotenv/config';
import pgPkg from 'pg';
import fs from 'fs';

const URL = 'https://gfwsdrbywgmceateubyq.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd3NkcmJ5d2dtY2VhdGV1YnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mzg1MjksImV4cCI6MjA5MjAxNDUyOX0.Qnn4MbtfApJ8sVwkpXNqNoHCBcGymS2U04kRLIVRta0';

const VIEWS = [
  'gmp_case_alerts', 'gmp_case_assignees_view', 'gmp_case_balance', 'gmp_case_completeness',
  'gmp_case_dashboard_kpi', 'gmp_case_finance', 'gmp_case_tags_view', 'gmp_collection_overview',
  'gmp_employer_inaction_alerts', 'gmp_invoice_finance', 'gmp_leads_overview', 'gmp_live_activity',
  'gmp_staff_effectiveness', 'gmp_staff_tasks_monthly', 'gmp_upcoming_installments',
];

const c = new pgPkg.Client({ host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432, user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
await c.connect();

console.log('=== BLK-1: BEFORE migration — anon test on each view ===');
const before = {};
for (const v of VIEWS) {
  const r = await fetch(`${URL}/rest/v1/${v}?select=*&limit=1`, { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } });
  const j = await r.json();
  before[v] = { status: r.status, rows: Array.isArray(j) ? j.length : -1, err: j?.code };
}
console.table(before);

// Pick 2 views with most leakage to compare row counts after
const sql = fs.readFileSync('supabase/migrations/20260502_06_views_security_invoker.sql', 'utf8');

console.log('\n=== Applying migration in transaction ===');
await c.query('BEGIN');
try {
  await c.query(sql);
  console.log('  DDL OK, verifying anon access...');

  // Verify (still inside transaction visibility — but Supabase REST connects through pooler,
  // so it sees the COMMITTED state of public schema. We'll verify after COMMIT.
  await c.query('COMMIT');
  console.log('  COMMIT done.');
} catch (e) {
  await c.query('ROLLBACK');
  console.error('MIGRATION FAILED:', e.message);
  await c.end();
  process.exit(1);
}

console.log('\n=== BLK-1: AFTER migration — anon test on each view ===');
const after = {};
let totalLeaks = 0;
for (const v of VIEWS) {
  const r = await fetch(`${URL}/rest/v1/${v}?select=*&limit=1`, { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } });
  const j = await r.json();
  const rows = Array.isArray(j) ? j.length : -1;
  after[v] = { status: r.status, rows, err: j?.code };
  if (rows > 0) totalLeaks++;
}
console.table(after);

console.log('\n=== Summary ===');
console.log('Views tested:', VIEWS.length);
console.log('Anon leaks BEFORE:', Object.values(before).filter(x => x.rows > 0).length, 'of', VIEWS.length);
console.log('Anon leaks AFTER:', totalLeaks, 'of', VIEWS.length);

await c.end();
process.exit(totalLeaks > 0 ? 2 : 0);
