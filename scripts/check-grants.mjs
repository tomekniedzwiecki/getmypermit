import pg from 'pg';
import 'dotenv/config';
const { Client } = pg;
const c = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
  user: `postgres.${process.env.SUPABASE_PROJECT_REF}`,
  password: process.env.SUPABASE_DB_PASSWORD, database: 'postgres',
  ssl: { rejectUnauthorized: false },
});
await c.connect();
const { rows } = await c.query(`
  SELECT grantee, privilege_type FROM information_schema.role_table_grants
  WHERE table_schema='public' AND table_name='permit_leads'
    AND grantee IN ('anon','authenticated')
  ORDER BY grantee, privilege_type
`);
console.log('Grants on permit_leads:');
rows.forEach(r => console.log(`  ${r.grantee}: ${r.privilege_type}`));
await c.end();
