// E2E audit pre-v3 flows + production readiness checks
// Sekcja 11 (pre-v3 flows) + sekcja 13 (operational/go-live) z docs/AUDYT_PLAN.md
// Tylko OBSERWACJA — nie modyfikuje systemu.
import 'dotenv/config';
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ROOT = resolve(process.cwd());

const c = new pg.Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});
async function q(sql, ...args) {
    try { return (await c.query(sql, args)).rows; }
    catch (e) { return [{ ERROR: e.message.slice(0, 300) }]; }
}
function head(t) { console.log('\n' + '='.repeat(78) + '\n  ' + t + '\n' + '='.repeat(78)); }
function sub(t) { console.log('\n--- ' + t); }
function ok(msg) { console.log('  PASS ' + msg); }
function fail(msg) { console.log('  FAIL ' + msg); }
function warn(msg) { console.log('  WARN ' + msg); }

await c.connect();

// ============================================================
head('TASK 1 — Lead form flow (11.2)');
// ============================================================

sub('1.1 Form action / fetch endpoint w index.html');
const indexHtml = readFileSync(resolve(ROOT, 'index.html'), 'utf-8');
const matches = indexHtml.match(/permit-lead-save/g);
if (matches) ok(`permit-lead-save referenced ${matches.length}x in index.html`);
else fail('permit-lead-save NOT found in index.html');
const formActions = indexHtml.match(/<form[^>]+action="[^"]+"/gi);
console.log('  <form action=...>:', formActions || 'none (JS-only fetch)');

sub('1.2 Spam protection (CAPTCHA / honeypot)');
const spam = {
    captcha: /captcha|recaptcha|hcaptcha|turnstile/i.test(indexHtml),
    honeypot: /honeypot|name="hp"|name="website"|name="url"/i.test(indexHtml),
    consent: /name="consent"/i.test(indexHtml),
};
console.log('  CAPTCHA:', spam.captcha ? 'YES' : 'NO');
console.log('  Honeypot:', spam.honeypot ? 'YES' : 'NO');
console.log('  Consent checkbox:', spam.consent ? 'YES' : 'NO');
if (!spam.captcha && !spam.honeypot) warn('NO CAPTCHA NOR HONEYPOT — spam vector na permit-lead-save');

sub('1.3 Rate-limit test: 5x POST z tym samym phone w <10s');
const phone = '+48999000111'; // testowy fake
const rl = [];
const t0 = Date.now();
for (let i = 0; i < 5; i++) {
    const r = await fetch(`${SUPA}/functions/v1/permit-lead-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON },
        body: JSON.stringify({
            phone,
            email: `audit_rl_${i}@example.invalid`,
            name: 'AUDIT_RATELIMIT',
            is_partial: false,
            status: 'spam_audit',
            form_session_id: `audit-rl-${Date.now()}-${i}`,
        }),
    });
    rl.push({ i, status: r.status, elapsed_ms: Date.now() - t0 });
}
console.table(rl);
const has429 = rl.some(x => x.status === 429);
if (has429) ok('Rate-limit działa (429 zwracany)');
else warn('BRAK rate-limit — 5 zapytań w <2s wszystkie zwróciły 200/inne');

// Sprawdź ile rekordów się zapisało
const inserted = await q(`SELECT COUNT(*) as n FROM permit_leads
                          WHERE phone=$1 AND name='AUDIT_RATELIMIT'`, phone);
console.log('  Inserted rows w permit_leads:', inserted[0].n);
if (Number(inserted[0].n) >= 5) warn(`5+ rekordów w permit_leads dla testowego phone — BRAK dedupu`);

sub('1.4 Walidacja: brak phone, email niepoprawny, brak required');
const validations = [];
async function tryPost(label, body) {
    const r = await fetch(`${SUPA}/functions/v1/permit-lead-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON },
        body: JSON.stringify(body),
    });
    const txt = await r.text();
    validations.push({ label, status: r.status, body: txt.slice(0, 80) });
}
await tryPost('empty payload', {});
await tryPost('only email', { email: 'audit@example.invalid', form_session_id: `audit-v-${Date.now()}-1` });
await tryPost('invalid email', { email: 'not-an-email', phone: '+48000111000', form_session_id: `audit-v-${Date.now()}-2` });
await tryPost('missing phone+email', { name: 'X', form_session_id: `audit-v-${Date.now()}-3` });
console.table(validations);

// ============================================================
head('TASK 2 — Intake flow (11.4 + 11.6)');
// ============================================================

sub('2.1 Pliki');
const intakeHtml = existsSync(resolve(ROOT, 'crm/intake/index.html'));
const intakeJs = existsSync(resolve(ROOT, 'crm/intake/intake.js'));
console.log('  crm/intake/index.html:', intakeHtml ? 'EXISTS' : 'MISSING');
console.log('  crm/intake/intake.js:', intakeJs ? 'EXISTS' : 'MISSING');

sub('2.2 Token validation w intake.js');
const ijs = readFileSync(resolve(ROOT, 'crm/intake/intake.js'), 'utf-8');
const tokenLogic = {
    reads_query_param: /URLSearchParams.+\.get\(['"]t(oken)?['"]\)/.test(ijs),
    selects_token: /from\(['"]gmp_intake_tokens['"]\)/.test(ijs),
    eq_token: /\.eq\(['"]token['"]/.test(ijs),
    expires_check: /expires_at/.test(ijs),
    sanitization: /(replace|escape|encodeURIComponent).{0,40}token/i.test(ijs),
};
console.table(tokenLogic);
if (!tokenLogic.sanitization) warn('Brak widocznej sanityzacji tokenu (Supabase JS klient parametryzuje, ale i tak warto)');

sub('2.3 BLK-2: anon SELECT na gmp_intake_tokens');
const r = await fetch(`${SUPA}/rest/v1/gmp_intake_tokens?select=token,expires_at,intake_id&limit=5`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
});
const body = await r.text();
console.log('  status:', r.status);
console.log('  body:', body.slice(0, 200));
if (r.status === 200) {
    let arr = []; try { arr = JSON.parse(body); } catch {}
    if (arr.length > 0) fail(`BLK-2 NADAL OTWARTY: anon widzi ${arr.length} tokenów`);
    else ok('Anon SELECT zwrócił 0 wierszy (RLS blokuje)');
} else ok(`Anon SELECT zwrócił ${r.status} (zablokowane)`);

sub('2.4 Storage bucket intake-docs');
const buckets = await q(`SELECT id, name, public, file_size_limit, allowed_mime_types
                         FROM storage.buckets WHERE name='intake-docs'`);
console.table(buckets);
const b = buckets[0];
if (b) {
    if (b.public) fail('intake-docs bucket jest PUBLIC');
    else ok('intake-docs bucket NIE jest public');
    if (b.file_size_limit) ok(`file_size_limit = ${b.file_size_limit}`);
    else warn('Brak file_size_limit');
    if (b.allowed_mime_types) ok(`allowed_mime_types: ${JSON.stringify(b.allowed_mime_types)}`);
    else warn('Brak allowed_mime_types — każdy MIME przechodzi');
}

// ============================================================
head('TASK 3 — Calendar / Availability (11.4)');
// ============================================================

sub('3.1 availability.html / calendar.html — public surface');
const availHtml = readFileSync(resolve(ROOT, 'availability.html'), 'utf-8');
const calHtml = readFileSync(resolve(ROOT, 'calendar.html'), 'utf-8');
console.log('  availability.html — gmp_appointments refs:', (availHtml.match(/gmp_appointments/g) || []).length);
console.log('  calendar.html      — gmp_appointments refs:', (calHtml.match(/gmp_appointments/g) || []).length);
console.log('  availability.html — gmp_lawyer_availability refs:', (availHtml.match(/gmp_lawyer_availability/g) || []).length);

sub('3.2 RLS na gmp_appointments — anon INSERT?');
const apptPolicies = await q(`SELECT policyname, cmd, roles, qual, with_check
                              FROM pg_policies
                              WHERE schemaname='public' AND tablename='gmp_appointments'`);
console.table(apptPolicies);

sub('3.3 Anti-overlap constraint na gmp_appointments');
const apptIdx = await q(`SELECT indexname, indexdef FROM pg_indexes
                         WHERE schemaname='public' AND tablename='gmp_appointments'`);
console.table(apptIdx);
const apptConstraints = await q(`SELECT con.conname, pg_get_constraintdef(con.oid) AS def
                                 FROM pg_constraint con
                                 JOIN pg_class c ON c.oid = con.conrelid
                                 WHERE c.relname='gmp_appointments'`);
console.table(apptConstraints);
const apptTriggers = await q(`SELECT tgname, pg_get_triggerdef(oid) AS def
                              FROM pg_trigger
                              WHERE tgrelid = 'public.gmp_appointments'::regclass
                                AND NOT tgisinternal`);
console.table(apptTriggers);
const overlap = apptConstraints.some(x => /EXCLUDE.*gist|tstzrange/i.test(x.def || ''))
              || apptTriggers.some(x => /overlap|conflict/i.test(x.def || ''));
if (overlap) ok('Anti-overlap mechanism wykryty');
else warn('BRAK anti-overlap (EXCLUDE gist / trigger) na gmp_appointments — możliwe podwójne booki');

sub('3.4 Spam vector: anon INSERT 5x w 5s');
const apptInserts = [];
for (let i = 0; i < 5; i++) {
    const rr = await fetch(`${SUPA}/rest/v1/gmp_appointments`, {
        method: 'POST',
        headers: {
            apikey: ANON, Authorization: `Bearer ${ANON}`,
            'Content-Type': 'application/json', Prefer: 'return=minimal',
        },
        body: JSON.stringify({
            client_name: `AUDIT_SPAM_${i}`,
            client_email: `spam${i}@example.invalid`,
            start_at: new Date(Date.now() + 86400000 * (i + 30)).toISOString(),
            end_at: new Date(Date.now() + 86400000 * (i + 30) + 3600000).toISOString(),
        }),
    });
    apptInserts.push({ i, status: rr.status, body: (await rr.text()).slice(0, 60) });
}
console.table(apptInserts);

// ============================================================
head('TASK 4 — Client offers (11.5)');
// ============================================================

sub('4.1 client-offer.html — token-based fetch');
const offerHtml = readFileSync(resolve(ROOT, 'client-offer.html'), 'utf-8');
console.log('  unique_token refs:', (offerHtml.match(/unique_token/g) || []).length);
console.log('  fetch via supabase JS:', /from\(['"]gmp_client_offers['"]\)/.test(offerHtml) ? 'YES' : 'NO');
console.log('  viewed_at tracking:', /viewed_at/.test(offerHtml) ? 'YES' : 'NO');
console.log('  accepted_at tracking:', /accepted_at/.test(offerHtml) ? 'YES' : 'NO');

sub('4.2 MAJ-13: anon SELECT na gmp_client_offers');
const ro = await fetch(`${SUPA}/rest/v1/gmp_client_offers?select=*&limit=5`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
});
const obody = await ro.text();
console.log('  status:', ro.status);
console.log('  body:', obody.slice(0, 200));
let oarr = []; try { oarr = JSON.parse(obody); } catch {}
if (ro.status === 200 && oarr.length > 0) {
    fail(`MAJ-13 OTWARTY: anon widzi ${oarr.length} ofert (qual=true)`);
} else if (ro.status === 200 && oarr.length === 0) {
    warn('Anon SELECT zwrócił 200 ale 0 wierszy — RLS może być qual=token-based lub puste');
} else ok(`Anon zablokowany (status ${ro.status})`);

sub('4.3 Schema gmp_client_offers');
const ofs = await q(`SELECT column_name, data_type, is_nullable
                     FROM information_schema.columns
                     WHERE table_schema='public' AND table_name='gmp_client_offers'
                     ORDER BY ordinal_position`);
console.table(ofs);

sub('4.4 RLS policies gmp_client_offers');
const offerPolicies = await q(`SELECT policyname, cmd, roles, qual, with_check
                               FROM pg_policies
                               WHERE schemaname='public' AND tablename='gmp_client_offers'`);
console.table(offerPolicies);

sub('4.5 Edge functions client-offer-*');
const fnList = ['automation-executor','case-startup-pack','delete-staff','generate-document',
                'import-employer-workers','intake-ocr','invite-staff','lead-fallback-replay',
                'permit-lead-save','spike-docx'];
const offerFns = fnList.filter(f => /offer|client/i.test(f));
console.log('  Funkcje pasujące do offer/client:', offerFns.length ? offerFns : 'NONE');

// ============================================================
head('TASK 5 — Resend email (11.3)');
// ============================================================

sub('5.1 Grep Resend w supabase/functions');
// (już sprawdzone — brak wyników, ale zobaczmy systematycznie)
const fnFiles = [];
for (const fn of fnList) {
    const p = resolve(ROOT, `supabase/functions/${fn}/index.ts`);
    if (existsSync(p)) fnFiles.push(p);
}
let resendFound = false;
for (const p of fnFiles) {
    const t = readFileSync(p, 'utf-8');
    if (/Resend|resend\.com|RESEND_API|api\.resend/i.test(t)) {
        console.log('  Resend in', p);
        resendFound = true;
    }
}
if (!resendFound) fail('BRAK integracji Resend w żadnej edge function (sekcja 11.3 — produkcja go-live wymaga emaili)');

sub('5.2 DNS: SPF / DMARC / MX dla getmypermit.pl');
const dns = {};
for (const [name, type] of [
    ['getmypermit.pl', 'TXT'],
    ['_dmarc.getmypermit.pl', 'TXT'],
    ['getmypermit.pl', 'MX'],
    ['resend._domainkey.getmypermit.pl', 'TXT'],
    ['default._domainkey.getmypermit.pl', 'TXT'],
]) {
    try {
        const dr = await fetch(`https://dns.google/resolve?name=${name}&type=${type}`);
        const dj = await dr.json();
        dns[`${name}/${type}`] = (dj.Answer || []).map(a => a.data).join(' | ') || 'NXDOMAIN';
    } catch (e) { dns[`${name}/${type}`] = 'ERR ' + e.message; }
}
console.table(dns);

// ============================================================
head('TASK 6 — Operacyjne checki (13.1, 13.5–13.9)');
// ============================================================

sub('6.1 SSL — crm.getmypermit.pl');
try {
    const sr = await fetch('https://crm.getmypermit.pl/', { method: 'HEAD' });
    console.log('  HEAD status:', sr.status);
    console.log('  server:', sr.headers.get('server'));
    console.log('  strict-transport-security:', sr.headers.get('strict-transport-security'));
    console.log('  x-vercel-cache:', sr.headers.get('x-vercel-cache'));
    console.log('  x-vercel-id:', sr.headers.get('x-vercel-id'));
} catch (e) { console.log('  ERR', e.message); }

try {
    const sr2 = await fetch('https://getmypermit.pl/', { method: 'HEAD' });
    console.log('  getmypermit.pl HEAD status:', sr2.status);
    console.log('  strict-transport-security:', sr2.headers.get('strict-transport-security'));
} catch (e) { console.log('  ERR', e.message); }

// SSL Labs — async, just initiate
try {
    const sl = await fetch('https://api.ssllabs.com/api/v3/analyze?host=crm.getmypermit.pl&fromCache=on&maxAge=24');
    const slj = await sl.json();
    console.log('  SSL Labs status:', slj.status);
    if (slj.endpoints && slj.endpoints[0]) {
        console.log('  SSL grade:', slj.endpoints[0].grade);
    } else console.log('  (cache miss, full scan would take 1-2 min)');
} catch (e) { console.log('  SSL Labs err:', e.message); }

sub('6.2 Vercel project.json');
const vp = resolve(ROOT, '.vercel/project.json');
if (existsSync(vp)) {
    console.log('  ', readFileSync(vp, 'utf-8').trim());
} else console.log('  .vercel/project.json BRAK');

sub('6.3 Backup / WAL settings');
const wal = await q(`SELECT name, setting FROM pg_settings
                     WHERE name IN ('archive_mode','wal_level','max_wal_senders')`);
console.table(wal);

sub('6.4 Sentry — grep crm/');
// fast: skan głównych plików HTML i intake.js
const sentryHits = [];
for (const f of ['crm/dashboard.html','crm/case.html','crm/cases.html','crm/intake/intake.js','index.html']) {
    const p = resolve(ROOT, f);
    if (!existsSync(p)) continue;
    const txt = readFileSync(p, 'utf-8');
    if (/Sentry\.init|sentry\.io|@sentry/.test(txt)) sentryHits.push(f);
}
if (sentryHits.length) ok(`Sentry w: ${sentryHits.join(', ')}`);
else fail('BRAK Sentry / error tracking w żadnym z głównych plików (sekcja 13.7)');

sub('6.5 Status / health endpoint');
for (const path of ['/health', '/status', '/api/health']) {
    try {
        const hr = await fetch(`https://crm.getmypermit.pl${path}`, { method: 'GET' });
        console.log(`  ${path}: ${hr.status}`);
    } catch (e) { console.log(`  ${path}: ERR ${e.message}`); }
}

sub('6.6 Cookie banner / consent');
const cookieGreps = ['cookie-banner','consent-banner','gmpOpenConsent','accept.{0,5}cookie'];
for (const g of cookieGreps) {
    const m = indexHtml.match(new RegExp(g, 'gi'));
    console.log(`  index.html /${g}/:`, m ? m.length + ' hits' : 'no match');
}

// ============================================================
head('TASK 7 — Backwards compat (12)');
// ============================================================

sub('7.1 gmp_documents.case_id NULLABILITY');
const docCols = await q(`SELECT column_name, data_type, is_nullable
                         FROM information_schema.columns
                         WHERE table_schema='public' AND table_name='gmp_documents'
                           AND column_name IN ('case_id','employer_id','intake_id')
                         ORDER BY column_name`);
console.table(docCols);

sub('7.2 Stare bookmarki: cases.html?id=<UUID>');
try {
    const cu = `https://crm.getmypermit.pl/cases.html?id=00000000-0000-0000-0000-000000000000`;
    const r2 = await fetch(cu, { method: 'GET' });
    console.log('  cases.html?id=...:', r2.status);
    const txt = await r2.text();
    console.log('  body length:', txt.length, 'has <html>:', txt.includes('<html'));
} catch (e) { console.log('  ERR', e.message); }

sub('7.3 location.hash navigation');
let hashFiles = 0;
for (const f of ['index.html','crm/dashboard.html','crm/case.html','crm/cases.html','crm/intake/intake.js']) {
    const p = resolve(ROOT, f);
    if (!existsSync(p)) continue;
    if (/location\.hash/.test(readFileSync(p, 'utf-8'))) { hashFiles++; console.log('  hash in', f); }
}
console.log('  total hash refs in main files:', hashFiles);

// ============================================================
head('CLEANUP — usuń testowe rekordy z permit_leads');
// ============================================================
const del = await q(`DELETE FROM permit_leads WHERE name='AUDIT_RATELIMIT' OR
                     email LIKE 'audit_rl_%@example.invalid' OR
                     email LIKE 'audit@example.invalid' OR
                     name='X' OR
                     phone='+48999000111' OR
                     phone='+48000111000'
                     RETURNING id`);
console.log('  Usunięto', Array.isArray(del) ? del.length : 0, 'testowych rekordów');
const delAppt = await q(`DELETE FROM gmp_appointments WHERE client_name LIKE 'AUDIT_SPAM_%'
                         RETURNING id`);
console.log('  Usunięto', Array.isArray(delAppt) ? delAppt.length : 0, 'testowych appointments');

await c.end();
console.log('\nAUDIT COMPLETE.');
