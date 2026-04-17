import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;
const client = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 5432,
  user: `postgres.${process.env.SUPABASE_PROJECT_REF}`,
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const { rows } = await client.query(`
  SELECT tablename, policyname, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname='public' AND tablename='permit_leads'
  ORDER BY cmd, policyname
`);
console.log('Policies on permit_leads:');
rows.forEach(r => console.log(`  [${r.cmd}] ${r.policyname} | roles=${r.roles} | check=${r.with_check}`));

// Also check if RLS is forced
const { rows: rls } = await client.query(`
  SELECT relname, relrowsecurity, relforcerowsecurity
  FROM pg_class WHERE relname='permit_leads'
`);
console.log('\nRLS state:', rls);

await client.end();
