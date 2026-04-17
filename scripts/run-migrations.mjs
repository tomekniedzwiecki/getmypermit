// Uruchamia migracje schema na NOWYM projekcie Supabase
// Laczy sie bezposrednio z Postgres przez pg (pooler)

import pg from 'pg';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

const MIGRATIONS_ORDER = [
  join(__dirname, '..', 'supabase-migration.sql'),        // permit_leads
  join(MIGRATIONS_DIR, '20260412_lawyers_calendar_offers.sql'),
  join(MIGRATIONS_DIR, '20260413_availability_appointments.sql'),
  // Pomijamy test_data i sample_availability - prawdziwe dane zaimportujemy z starego projektu
];

const ref = process.env.SUPABASE_PROJECT_REF;
const pwd = process.env.SUPABASE_DB_PASSWORD;
if (!ref || !pwd) {
  console.error('Brak SUPABASE_PROJECT_REF lub SUPABASE_DB_PASSWORD w .env');
  process.exit(1);
}

// Probuje kilka endpointow po kolei (session pooler najbardziej uniwersalny)
const CANDIDATES = [
  { label: 'Session Pooler eu-central-1', host: `aws-0-eu-central-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
  { label: 'Session Pooler eu-central-2', host: `aws-1-eu-central-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
  { label: 'Session Pooler eu-west-1', host: `aws-0-eu-west-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
  { label: 'Session Pooler us-east-1', host: `aws-0-us-east-1.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
  { label: 'Direct db.*.supabase.co', host: `db.${ref}.supabase.co`, port: 5432, user: 'postgres' },
];

async function tryConnect() {
  for (const c of CANDIDATES) {
    const client = new Client({
      host: c.host,
      port: c.port,
      user: c.user,
      password: pwd,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 7000,
    });
    try {
      console.log(`-> Proba: ${c.label} (${c.host})...`);
      await client.connect();
      console.log(`   OK polaczono przez: ${c.label}`);
      return client;
    } catch (err) {
      console.log(`   BLAD: ${err.code || err.message}`);
      try { await client.end(); } catch {}
    }
  }
  throw new Error('Nie udalo sie polaczyc z zadnym endpointem Supabase Postgres');
}

async function main() {
  const client = await tryConnect();
  try {
    for (const file of MIGRATIONS_ORDER) {
      console.log(`\n>>> Uruchamiam: ${file}`);
      const sql = readFileSync(file, 'utf8');
      try {
        await client.query(sql);
        console.log('    OK');
      } catch (err) {
        console.error(`    BLAD: ${err.message}`);
        throw err;
      }
    }
    // Sprawdz liczbe tabel
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public'
        AND (table_name LIKE 'gmp_%' OR table_name='permit_leads')
      ORDER BY table_name
    `);
    console.log('\n=== Tabele w nowym projekcie ===');
    rows.forEach(r => console.log(`  - ${r.table_name}`));
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
