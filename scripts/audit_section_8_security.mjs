// Security audit (sekcja 8 z AUDYT_PLAN.md)
// Testy: anonymous access, audit log sanitization, RODO, IDOR
import 'dotenv/config';
import pg from 'pg';

const SUPA = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service-role connection (read-only audit)
const c = new pg.Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});
async function q(sql) {
    try { return (await c.query(sql)).rows; }
    catch (e) { return [{ ERROR: e.message.slice(0, 200) }]; }
}
function head(t) { console.log('\n' + '='.repeat(78) + '\n  ' + t + '\n' + '='.repeat(78)); }
function sub(t) { console.log('\n--- ' + t); }

await c.connect();

// ============================================================
head('SEKCJA 8.1 — RLS COVERAGE');
// ============================================================

sub('8.1.1 RLS enabled per table');
const rls = await q(`SELECT c.relname,
                            c.relrowsecurity AS rls_on,
                            (SELECT COUNT(*) FROM pg_policies WHERE tablename = c.relname AND schemaname='public') AS policies
                     FROM pg_class c
                     WHERE c.relnamespace = 'public'::regnamespace
                       AND c.relkind = 'r' AND c.relname LIKE 'gmp_%'
                     ORDER BY c.relname`);
const noRls = rls.filter(r => !r.rls_on);
const noPolicies = rls.filter(r => Number(r.policies) === 0);
console.log(`  RLS enabled: ${rls.length - noRls.length}/${rls.length}`);
console.log(`  RLS DISABLED:`, noRls.map(r => r.relname).join(', ') || 'NONE');
console.log(`  0 policies:`, noPolicies.map(r => r.relname).join(', ') || 'NONE');

sub('8.1.2 RLS na storage buckets');
console.table(await q(`SELECT id, name, public, file_size_limit, allowed_mime_types
                       FROM storage.buckets ORDER BY name`));

sub('8.1.3 Policies summary per tabela (top 10)');
console.table(await q(`SELECT tablename,
                              COUNT(*) AS n_policies,
                              array_agg(DISTINCT cmd) AS cmds,
                              bool_or(roles = '{anon}' OR 'anon' = ANY(roles)) AS has_anon_policy
                       FROM pg_policies
                       WHERE schemaname='public' AND tablename LIKE 'gmp_%'
                       GROUP BY tablename
                       ORDER BY n_policies DESC LIMIT 10`));

sub('8.1.4 Policies pozwalające ANON');
console.table(await q(`SELECT tablename, policyname, cmd, roles, qual, with_check
                       FROM pg_policies
                       WHERE schemaname='public'
                         AND ('anon' = ANY(roles) OR 'public' = ANY(roles))
                       ORDER BY tablename`));

// ============================================================
head('SEKCJA 8.1.1 — ANONYMOUS ACCESS TEST (przez REST API)');
// ============================================================

async function testAnonSelect(table) {
    try {
        const r = await fetch(`${SUPA}/rest/v1/${table}?select=*&limit=1`, {
            headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
        });
        const body = await r.text();
        let count = 0;
        if (r.ok) {
            try { count = JSON.parse(body).length; } catch {}
        }
        return { status: r.status, body_preview: body.slice(0, 80), rows: count };
    } catch (e) {
        return { status: 'ERR', body_preview: String(e).slice(0, 80) };
    }
}

const sensitiveTables = [
    'gmp_cases', 'gmp_clients', 'gmp_audit_log', 'gmp_trusted_profile_credentials',
    'gmp_payments', 'gmp_invoices', 'gmp_documents', 'gmp_employers',
    'gmp_e_submission_status', 'gmp_credentials_access_log',
    'gmp_intake_tokens', 'permit_leads', 'gmp_staff'
];

sub('Anon SELECT test (oczekiwanie: 401/403 lub 0 rows)');
const anonResults = [];
for (const t of sensitiveTables) {
    const r = await testAnonSelect(t);
    anonResults.push({ table: t, ...r });
}
console.table(anonResults);

// ============================================================
head('SEKCJA 8.4 — AUDIT LOG SANITIZATION TEST');
// ============================================================

sub('8.4.1 Czy funkcja gmp_sanitize_audit_jsonb jest podpięta jako trigger?');
const sanitizeTriggers = await q(`SELECT tgname, c.relname AS tbl, p.proname AS fn
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE NOT tg.tgisinternal
      AND (p.proname ILIKE '%sanitize%' OR p.proname ILIKE '%audit%')`);
console.table(sanitizeTriggers);
console.log('  Wniosek:', sanitizeTriggers.length === 0 ? '❌ ŻADEN sanitize trigger nie jest podpięty' : `✓ ${sanitizeTriggers.length} triggerów audit/sanitize`);

sub('8.4.2 Test danych: szukam PESEL/passport w audit_log');
// PESEL format: 11 cyfr; passport: różne formaty
const peselSearch = await q(`SELECT COUNT(*) AS rows_with_pesel_pattern
    FROM gmp_audit_log
    WHERE meta::text ~ '\\m\\d{11}\\M' OR diff::text ~ '\\m\\d{11}\\M'`);
console.log('  Audit log entries z 11-cyfrowym pattern (możliwy PESEL):', peselSearch[0]);

const passwordSearch = await q(`SELECT COUNT(*) AS rows_with_password_field
    FROM gmp_audit_log
    WHERE meta::text ILIKE '%password%' OR meta::text ILIKE '%hasla%'
       OR diff::text ILIKE '%password%' OR diff::text ILIKE '%hasla%'`);
console.log('  Audit log entries z słowem "password":', passwordSearch[0]);

sub('8.4.3 Sample audit_log entry (sprawdź czy meta zawiera plaintext)');
console.table(await q(`SELECT action, table_name, created_at, jsonb_pretty(meta) AS meta_sample
                       FROM gmp_audit_log
                       WHERE action='UPDATE' AND table_name='gmp_clients'
                       ORDER BY created_at DESC LIMIT 2`));

// ============================================================
head('SEKCJA 8.5 — RODO/GDPR');
// ============================================================

sub('8.5.1 Consents na gmp_clients — kolumna istnieje?');
console.table(await q(`SELECT column_name, data_type FROM information_schema.columns
                       WHERE table_name='gmp_clients'
                         AND (column_name ILIKE '%consent%' OR column_name ILIKE '%rodo%' OR column_name ILIKE '%gdpr%')`));

sub('8.5.2 Soft delete patterns — kolumny deleted_at?');
const softDel = await q(`SELECT table_name, column_name FROM information_schema.columns
                        WHERE table_name LIKE 'gmp_%' AND column_name IN ('deleted_at', 'is_deleted', 'archived_at')
                        ORDER BY table_name`);
console.log('  Tabele z soft-delete kolumnami:', softDel.length);
console.table(softDel);

sub('8.5.3 RPC dla GDPR (export/erasure)');
console.table(await q(`SELECT proname FROM pg_proc
                       WHERE proname ILIKE '%gdpr%' OR proname ILIKE '%export%client%'
                          OR proname ILIKE '%forget%' OR proname ILIKE '%anonymize%'
                          OR proname ILIKE '%erase%' OR proname ILIKE '%right_to%'`));

sub('8.5.4 PESEL pseudonimizacja — szukam funkcji/views');
console.table(await q(`SELECT viewname FROM pg_views WHERE schemaname='public'
                       AND (definition ILIKE '%pesel%mask%' OR definition ILIKE '%substring%pesel%')`));

// ============================================================
head('SEKCJA 8.9 — PERMISSIONS PER ROLE');
// ============================================================

sub('8.9.1 Ról w systemie (gmp_staff.role enum)');
console.table(await q(`SELECT enumlabel FROM pg_enum
                       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='gmp_staff_role')
                       ORDER BY enumsortorder`));
console.table(await q(`SELECT role, COUNT(*) FROM gmp_staff GROUP BY role ORDER BY 2 DESC`));

sub('8.9.2 Policies per rola (admin/owner/staff)');
console.table(await q(`SELECT
    SUM(CASE WHEN qual ILIKE '%role%admin%' OR with_check ILIKE '%role%admin%' THEN 1 ELSE 0 END) AS admin_specific,
    SUM(CASE WHEN qual ILIKE '%role%owner%' OR with_check ILIKE '%role%owner%' THEN 1 ELSE 0 END) AS owner_specific,
    COUNT(*) AS total_policies
   FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'gmp_%'`));

// ============================================================
head('SEKCJA 8.10 — INPUT VALIDATION DB-SIDE');
// ============================================================

sub('8.10.1 CHECK constraints na PESEL/NIP');
console.table(await q(`SELECT con.conname, c.relname AS tbl, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
    WHERE con.contype='c'
      AND (pg_get_constraintdef(con.oid) ILIKE '%pesel%' OR pg_get_constraintdef(con.oid) ILIKE '%nip%')`));

sub('8.10.2 Email/phone validation w bazie?');
console.table(await q(`SELECT con.conname, c.relname AS tbl, pg_get_constraintdef(con.oid) AS def
    FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
    WHERE con.contype='c'
      AND (pg_get_constraintdef(con.oid) ILIKE '%email%' OR pg_get_constraintdef(con.oid) ILIKE '%phone%')`));

// ============================================================
head('SEKCJA 8.11 — BACKUP / SUPABASE CONFIG');
// ============================================================

sub('8.11.1 Pg version + extensions');
console.table(await q(`SELECT extname, extversion FROM pg_extension ORDER BY extname`));
console.table(await q(`SELECT version()`));

sub('8.11.2 Czy są replication slots / wal_level?');
console.table(await q(`SHOW wal_level`).catch(() => [{ ERROR: 'no perms' }]));

await c.end();

// ============================================================
head('SEKCJA 8.6 — SECRETS GREP (filesystem)');
// ============================================================
const fs = await import('fs');
const path = await import('path');

function* walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        if (f.name === 'node_modules' || f.name === '.git' || f.name === 'dist' || f.name.startsWith('.')) continue;
        const p = path.join(dir, f.name);
        if (f.isDirectory()) yield* walk(p);
        else yield p;
    }
}

const secretPatterns = [
    /eyJ[A-Za-z0-9-_=]{20,}/,  // JWT
    /sb_secret_[A-Za-z0-9-_]+/,
    /sk_live_[A-Za-z0-9]+/,
    /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?eyJ/,
    /service_role_key.*=.*eyJ/,
];

sub('Skanuję pliki .ts/.js/.html/.json/.md w getmypermit/');
const root = '.';
let scanned = 0, found = [];
for (const file of walk(root)) {
    if (!/\.(ts|js|mjs|html|json|md|env|toml)$/.test(file)) continue;
    if (file.includes('package-lock')) continue;
    if (file.includes('_archive')) continue;
    scanned++;
    let content;
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const pat of secretPatterns) {
        const m = content.match(pat);
        if (m) {
            // Skip jeśli jest komentarz/example
            if (file.endsWith('.env')) continue;  // .env jest gitignored — OK
            found.push({ file, match: m[0].slice(0, 50) });
        }
    }
}
console.log(`  Scanned ${scanned} files. Found ${found.length} potential secrets:`);
console.table(found.slice(0, 20));

console.log('\n✓ DONE security audit');
