// Smoke test connection + run audit raport
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

const REGIONS_TO_TRY = [
    // Pooler — recommended (ipv4 friendly)
    { name: 'pooler-eu-central-1-session', host: 'aws-0-eu-central-1.pooler.supabase.com', port: 5432, user: 'postgres.gfwsdrbywgmceateubyq' },
    { name: 'pooler-eu-central-1-tx',      host: 'aws-0-eu-central-1.pooler.supabase.com', port: 6543, user: 'postgres.gfwsdrbywgmceateubyq' },
    { name: 'pooler-eu-west-1-session',    host: 'aws-0-eu-west-1.pooler.supabase.com',    port: 5432, user: 'postgres.gfwsdrbywgmceateubyq' },
    // Direct — często ipv6 only
    { name: 'direct',                      host: 'db.gfwsdrbywgmceateubyq.supabase.co',     port: 5432, user: 'postgres' },
];

async function tryConnect() {
    for (const r of REGIONS_TO_TRY) {
        const cfg = {
            host: r.host, port: r.port, user: r.user,
            database: 'postgres',
            password: process.env.SUPABASE_DB_PASSWORD,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 8000,
        };
        const client = new Client(cfg);
        try {
            await client.connect();
            const { rows } = await client.query('SELECT current_database() AS db, current_user AS user, version() AS v');
            console.log(`✓ Connected via ${r.name}:`, rows[0].db, rows[0].user);
            return client;
        } catch (e) {
            console.log(`✗ ${r.name}: ${e.code || e.message}`);
            try { await client.end(); } catch {}
        }
    }
    throw new Error('Wszystkie połączenia zawiodły');
}

const client = await tryConnect();

console.log('\n==================== AUDIT RAPORT ====================\n');

async function run(label, sql) {
    console.log(`\n--- ${label} ---`);
    try {
        const { rows } = await client.query(sql);
        console.table(rows);
    } catch (e) {
        console.log('ERROR:', e.message);
    }
}

await run('1.1 Sprawy per status', `SELECT status, COUNT(*)::int AS n FROM gmp_cases GROUP BY status ORDER BY n DESC`);
await run('1.2 Sprawy per kind',   `SELECT kind, COUNT(*)::int AS n FROM gmp_cases GROUP BY kind ORDER BY n DESC NULLS LAST`);
await run('1.3 Sprawy per party_type', `SELECT party_type, COUNT(*)::int AS n FROM gmp_cases GROUP BY party_type ORDER BY n DESC NULLS LAST`);

await run('2.1 Brakujące pola krytyczne', `
    SELECT 'kind=NULL' AS field, COUNT(*) FILTER (WHERE kind IS NULL)::int AS n,
           COUNT(*)::int AS total,
           ROUND(COUNT(*) FILTER (WHERE kind IS NULL)::numeric / NULLIF(COUNT(*),0) * 100, 1) AS pct
    FROM gmp_cases
    UNION ALL SELECT 'category=NULL', COUNT(*) FILTER (WHERE category IS NULL)::int, COUNT(*)::int,
           ROUND(COUNT(*) FILTER (WHERE category IS NULL)::numeric / NULLIF(COUNT(*),0) * 100, 1) FROM gmp_cases
    UNION ALL SELECT 'case_type ale NULL category', COUNT(*) FILTER (WHERE category IS NULL AND case_type IS NOT NULL)::int, COUNT(*)::int,
           ROUND(COUNT(*) FILTER (WHERE category IS NULL AND case_type IS NOT NULL)::numeric / NULLIF(COUNT(*),0) * 100, 1) FROM gmp_cases
    UNION ALL SELECT 'submission_method=NULL', COUNT(*) FILTER (WHERE submission_method IS NULL)::int, COUNT(*)::int,
           ROUND(COUNT(*) FILTER (WHERE submission_method IS NULL)::numeric / NULLIF(COUNT(*),0) * 100, 1) FROM gmp_cases
    UNION ALL SELECT 'date_accepted=NULL', COUNT(*) FILTER (WHERE date_accepted IS NULL)::int, COUNT(*)::int,
           ROUND(COUNT(*) FILTER (WHERE date_accepted IS NULL)::numeric / NULLIF(COUNT(*),0) * 100, 1) FROM gmp_cases
    UNION ALL SELECT 'legal_stay_end_date=NULL', COUNT(*) FILTER (WHERE legal_stay_end_date IS NULL)::int, COUNT(*)::int,
           ROUND(COUNT(*) FILTER (WHERE legal_stay_end_date IS NULL)::numeric / NULLIF(COUNT(*),0) * 100, 1) FROM gmp_cases
`);

await run('3.1 Top 30 case_type (gdzie category=NULL) — DO MAPPINGU', `
    SELECT case_type, COUNT(*)::int AS n
    FROM gmp_cases WHERE category IS NULL AND case_type IS NOT NULL
    GROUP BY case_type ORDER BY n DESC LIMIT 30
`);

await run('3.2 Wartości case_type które MAJĄ category — kontrola spójności', `
    SELECT case_type, category, COUNT(*)::int AS n
    FROM gmp_cases WHERE case_type IS NOT NULL AND category IS NOT NULL
    GROUP BY case_type, category ORDER BY n DESC LIMIT 30
`);

await run('4.1 Lista istniejących kategorii', `
    SELECT code, label, group_label, is_active, sort_order FROM gmp_case_categories ORDER BY sort_order, code
`);

await run('4.2 Sprawy z category nieistniejącą w gmp_case_categories (orphan)', `
    SELECT c.category, COUNT(*)::int AS n
    FROM gmp_cases c LEFT JOIN gmp_case_categories cat ON cat.code = c.category
    WHERE c.category IS NOT NULL AND cat.code IS NULL
    GROUP BY c.category ORDER BY n DESC
`);

await run('5.1 Sprawy z submission_method=elektronicznie', `
    SELECT submission_method, COUNT(*)::int AS n FROM gmp_cases
    WHERE submission_method IS NOT NULL GROUP BY submission_method ORDER BY n DESC
`);

await run('6.1 Pracodawcy z >=2 sprawami (kandydaci do auto-grupy)', `
    SELECT e.id, e.name, e.nip, COUNT(c.id)::int AS spraw_count
    FROM gmp_employers e JOIN gmp_cases c ON c.employer_id = e.id
    GROUP BY e.id, e.name, e.nip HAVING COUNT(c.id) >= 2
    ORDER BY COUNT(c.id) DESC LIMIT 20
`);

await run('7.1 Views/Functions używające gmp_tasks (NOT NULL handling)', `
    SELECT n.nspname || '.' || c.relname AS object_name,
           CASE c.relkind WHEN 'v' THEN 'view' WHEN 'm' THEN 'matview' ELSE c.relkind::text END AS kind
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('v', 'm') AND n.nspname = 'public'
      AND pg_get_viewdef(c.oid) LIKE '%gmp_tasks%'
    ORDER BY object_name
`);

await run('8.1 Profil zaufany — czy plaintext (Pre-condition 2)', `
    SELECT
        COUNT(*)::int AS total,
        COUNT(trusted_profile_password)::int AS with_password,
        COUNT(*) FILTER (WHERE trusted_profile_password IS NOT NULL
                         AND length(trusted_profile_password) BETWEEN 4 AND 50)::int AS likely_plaintext
    FROM gmp_trusted_profile_credentials
`);

await client.end();
console.log('\n=== Audit zakończony. ===\n');
