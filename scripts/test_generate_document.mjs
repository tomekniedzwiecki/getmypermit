// Test edge function generate-document
// Wymaga: użytkownika w gmp_staff + auth.users (zaloguj się przez magic link albo użyj istniejącego)
// Dla testów: utworzymy tymczasowy JWT używając service_role key i admin auth API

import 'dotenv/config';
import fs from 'fs/promises';
import pg from 'pg';

const SUPA = process.env.SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;

const client = new pg.Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 5432, user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});
await client.connect();

// 1. Znajdź dowolnego user'a w auth + powiązanego staffa
const { rows: staffRows } = await client.query(`
    SELECT s.id AS staff_id, s.full_name, s.user_id, s.email
    FROM gmp_staff s
    WHERE s.is_active = TRUE AND s.user_id IS NOT NULL
    LIMIT 1
`);
if (!staffRows.length) {
    console.log('Brak active staff z user_id. Test wymaga istniejącego usera.');
    process.exit(1);
}
const staff = staffRows[0];
console.log(`Test user: ${staff.full_name} (${staff.email}) staff_id=${staff.staff_id}`);

// 2. Wygeneruj magic link / wymień na access token (admin API)
const magicResp = await fetch(`${SUPA}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + SVC, 'apikey': SVC, 'Content-Type': 'application/json' },
    body: JSON.stringify({
        type: 'magiclink',
        email: staff.email,
    }),
});
const magic = await magicResp.json();
console.log('Magic link generated:', magic.user?.email || magic.error);

// 3. Pobierz dowolną aktywną sprawę (z klientem) do testu
const { rows: cases } = await client.query(`
    SELECT c.id, c.case_number, c.category
    FROM gmp_cases c
    WHERE c.status = 'aktywna' AND c.client_id IS NOT NULL
    LIMIT 1
`);
if (!cases.length) {
    console.log('Brak aktywnych spraw z klientem');
    process.exit(1);
}
const testCase = cases[0];
console.log(`Test case: ${testCase.case_number} (id=${testCase.id})`);

// 4. Pobierz template_id dla 'karta_przyjecia'
const { rows: tpls } = await client.query(`
    SELECT id, name, kind FROM gmp_document_templates
    WHERE kind = 'karta_przyjecia' AND is_active = TRUE LIMIT 1
`);
const tpl = tpls[0];
console.log(`Test template: ${tpl.name} (id=${tpl.id})`);

await client.end();

// 5. Przygotuj user JWT przez admin API: createSession + token
// Uwaga: Supabase nie ma bezpośredniego "give me access token for user" przez admin.
// Workaround: używamy service_role key bezpośrednio jako Authorization
// (nie idealne dla testu A3, ale wystarcza do testu render flow)

console.log('\n=== Test 1: Render karty przyjęcia (z service_role auth) ===');
const t0 = Date.now();
const resp = await fetch(`${SUPA}/functions/v1/generate-document`, {
    method: 'POST',
    headers: {
        Authorization: 'Bearer ' + SVC,  // service_role — sprawdza JWT, nie user
        apikey: ANON,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        case_id: testCase.id,
        template_id: tpl.id,
    }),
});
const elapsed = Date.now() - t0;
console.log(`HTTP ${resp.status} in ${elapsed}ms`);

const result = await resp.json().catch(() => null);
console.log('Response:', JSON.stringify(result, null, 2));

if (result?.download_url) {
    const dlResp = await fetch(result.download_url);
    const buf = await dlResp.arrayBuffer();
    await fs.writeFile('test_karta_przyjecia.docx', new Uint8Array(buf));
    console.log(`✓ Saved test_karta_przyjecia.docx (${buf.byteLength} bytes)`);
}
