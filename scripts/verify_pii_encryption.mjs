import 'dotenv/config';
import pgPkg from 'pg';
const c = new pgPkg.Client({ host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432, user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres', password: process.env.SUPABASE_DB_PASSWORD, ssl: { rejectUnauthorized: false } });
await c.connect();

console.log('=== Test 1: zaszyfrowany blob nie jest czytelny ===');
const r1 = await c.query("SELECT pesel_encrypted FROM gmp_clients WHERE pesel_encrypted IS NOT NULL LIMIT 1");
const blob = r1.rows[0]?.pesel_encrypted;
console.log('  blob (hex):', blob?.toString('hex').slice(0, 60) + '...');
console.log('  contains plain PESEL?', blob?.toString('utf8').match(/[0-9]{11}/)?.[0] || 'NO');

console.log('\n=== Test 2: encrypt + decrypt round-trip (jako postgres) ===');
const r2 = await c.query("SELECT public.gmp_encrypt_pii('12345678901') AS enc");
console.log('  encrypted:', r2.rows[0].enc?.toString('hex').slice(0, 50) + '...');
// Decrypt jako postgres - powinien działać bo jako superuser auth.uid() jest NULL
// ale RLS check w gmp_decrypt_pii wymaga staff
try {
  const r3 = await c.query("SELECT public.gmp_decrypt_pii($1) AS dec", [r2.rows[0].enc]);
  console.log('  decrypted (postgres role):', r3.rows[0].dec, '— NIE powinno działać bez staff check!');
} catch (e) {
  console.log('  postgres bez staff blocked:', e.code, '(', e.message?.slice(0, 80), ')');
}

console.log('\n=== Test 3: jako Tomek (manager+) ===');
const tomek = await c.query("SELECT u.id FROM auth.users u JOIN gmp_staff s ON s.user_id=u.id WHERE s.email='tomekniedzwiecki@gmail.com'");
await c.query("BEGIN");
await c.query("SET LOCAL ROLE authenticated");
await c.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: tomek.rows[0].id, role: 'authenticated' })]);
try {
  const r4 = await c.query("SELECT id, pesel_decrypted FROM gmp_clients_with_pii WHERE pesel_encrypted IS NOT NULL LIMIT 3");
  console.log('  Tomek widzi:', r4.rows.map(x => ({ id: x.id.slice(0, 8), pesel: x.pesel_decrypted })));
} catch (e) {
  console.log('  ERROR:', e.message);
}
await c.query("ROLLBACK");

console.log('\n=== Test 4: jako staff testowy (powinien widzieć tylko swoich) ===');
const test = await c.query("SELECT u.id FROM auth.users u JOIN gmp_staff s ON s.user_id=u.id WHERE s.email='test@test.pl'");
await c.query("BEGIN");
await c.query("SET LOCAL ROLE authenticated");
await c.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: test.rows[0].id, role: 'authenticated' })]);
try {
  const r5 = await c.query("SELECT count(*) AS visible FROM gmp_clients_with_pii");
  console.log('  staff widzi clients:', r5.rows[0].visible);
} catch (e) {
  console.log('  ERROR:', e.message);
}
await c.query("ROLLBACK");

console.log('\n=== Test 5: gmp_client_set_pesel walidacja ===');
await c.query("BEGIN");
await c.query("SET LOCAL ROLE authenticated");
await c.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: tomek.rows[0].id, role: 'authenticated' })]);
const someClient = await c.query("SELECT id FROM gmp_clients LIMIT 1");
try {
  await c.query("SELECT public.gmp_client_set_pesel($1, 'BAD')", [someClient.rows[0].id]);
  console.log('  bad PESEL FAIL!');
} catch (e) {
  console.log('  bad PESEL blocked:', e.code, '(', e.message?.slice(0, 60), ')');
}
try {
  await c.query("SELECT public.gmp_client_set_pesel($1, '99999999999')", [someClient.rows[0].id]);
  console.log('  valid PESEL OK');
  // Verify zaszyfrowane
  const r6 = await c.query("SELECT pesel_encrypted FROM gmp_clients WHERE id=$1", [someClient.rows[0].id]);
  console.log('  encrypted blob saved:', r6.rows[0].pesel_encrypted ? 'YES' : 'NO');
} catch (e) {
  console.log('  valid PESEL FAIL:', e.message);
}
await c.query("ROLLBACK");

await c.end();
