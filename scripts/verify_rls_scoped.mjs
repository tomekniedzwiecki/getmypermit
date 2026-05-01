import 'dotenv/config';
import pgPkg from 'pg';
const c = new pgPkg.Client({ host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432, user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
await c.connect();

// Pobierz auth.users.id dla Tomka i konta testowego
const tomek = await c.query(`SELECT u.id AS uid FROM auth.users u JOIN gmp_staff s ON s.user_id = u.id WHERE s.email = 'tomekniedzwiecki@gmail.com'`);
const test = await c.query(`SELECT u.id AS uid FROM auth.users u JOIN gmp_staff s ON s.user_id = u.id WHERE s.email = 'test@test.pl'`);

console.log('Tomek auth.uid:', tomek.rows[0]?.uid);
console.log('Test auth.uid:', test.rows[0]?.uid);

async function asUser(uid, role, label) {
  console.log(`\n=== ${label} (uid=${uid?.slice(0,8)}..., role=${role}) ===`);
  await c.query("BEGIN");
  await c.query(`SET LOCAL ROLE authenticated`);
  await c.query(`SELECT set_config('request.jwt.claims', $1, true)`,
    [JSON.stringify({ sub: uid, role: 'authenticated' })]);

  for (const tbl of ['gmp_cases','gmp_clients','gmp_documents','gmp_payments']) {
    try {
      const r = await c.query(`SELECT count(*) FROM ${tbl}`);
      console.log(`  ${tbl}: ${r.rows[0].count} widocznych`);
    } catch (e) {
      console.log(`  ${tbl}: ERROR ${e.message.slice(0,60)}`);
    }
  }
  await c.query("ROLLBACK");
}

await asUser(tomek.rows[0]?.uid, 'owner', 'Tomek (owner)');
await asUser(test.rows[0]?.uid, 'staff', 'konto testowe (staff)');
// Test: nieistniejący user
await asUser('00000000-0000-0000-0000-000000000000', 'unknown', 'NIEZNANY user');

await c.end();
