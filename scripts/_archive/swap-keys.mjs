// Podmienia stary URL+anon key na nowe we wszystkich plikach HTML
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import 'dotenv/config';

const ROOT = join(import.meta.dirname, '..');

const OLD_URL = process.env.OLD_SUPABASE_URL;
const NEW_URL = process.env.SUPABASE_URL;
const NEW_ANON = process.env.SUPABASE_ANON_KEY;
const OLD_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4bWF2d2t3bmZ1cGhqcWJlbHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NjQyNTUsImV4cCI6MjA4NDM0MDI1NX0.XeR0Fc7OFn6YbNJrOKTBEj36JtmLISZTM87y4ai9340';

const files = readdirSync(ROOT).filter(f => extname(f) === '.html');
let total = 0;
for (const f of files) {
  const path = join(ROOT, f);
  const src = readFileSync(path, 'utf8');
  let out = src.replaceAll(OLD_URL, NEW_URL).replaceAll(OLD_ANON, NEW_ANON);
  if (out !== src) {
    writeFileSync(path, out);
    const changes = (src.match(new RegExp(OLD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
                  + (src.match(new RegExp(OLD_ANON.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    console.log(`${f}: podmieniono ${changes} wystapien`);
    total += changes;
  }
}
console.log(`\nRazem: ${total} wystapien w ${files.length} plikach HTML`);
