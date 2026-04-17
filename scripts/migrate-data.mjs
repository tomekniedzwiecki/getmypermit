// Kopiuje dane ze STAREGO projektu (yxmavwkwnfuphjqbelws) do NOWEGO (gfwsdrbywgmceateubyq)
// Eksport: REST API z service_role starego projektu
// Import:  REST API z service_role nowego projektu (omija RLS)

import 'dotenv/config';

const OLD_URL = process.env.OLD_SUPABASE_URL;
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY;
const NEW_URL = process.env.SUPABASE_URL;
const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error('Brak kluczy w .env');
  process.exit(1);
}

async function req(url, key, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options.method || 'GET'} ${url} -> ${res.status}: ${body.slice(0, 500)}`);
  }
  return res;
}

async function fetchAll(baseUrl, key, table) {
  // Pobierz wszystkie wiersze (1000 per page)
  const all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const res = await req(`${baseUrl}/rest/v1/${table}?select=*&order=created_at.asc.nullsfirst&limit=${pageSize}&offset=${from}`, key);
    const rows = await res.json();
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function insertBatch(baseUrl, key, table, rows) {
  if (rows.length === 0) return;
  // Insert w paczkach po 500
  const batchSize = 500;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await req(`${baseUrl}/rest/v1/${table}`, key, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(batch),
    });
  }
}

async function truncate(baseUrl, key, table) {
  // REST nie ma TRUNCATE - usuwamy wszystko DELETE
  await req(`${baseUrl}/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000`, key, {
    method: 'DELETE',
  });
}

// Kolejnosc wazna ze wzgledu na FK
const TABLES = [
  { name: 'gmp_lawyers', deps: [] },
  { name: 'gmp_offers', deps: [], clearFirst: true }, // migracja wstawila 4 domyslne oferty - trzeba wyczyscic
  { name: 'permit_leads', deps: ['gmp_lawyers', 'gmp_offers'] },
  { name: 'gmp_client_offers', deps: ['permit_leads', 'gmp_offers', 'gmp_lawyers'] },
  { name: 'gmp_calendar_events', deps: ['permit_leads', 'gmp_lawyers'] },
  { name: 'gmp_lawyer_availability', deps: ['gmp_lawyers'] },
  { name: 'gmp_lawyer_blocked_dates', deps: ['gmp_lawyers'] },
  { name: 'gmp_appointments', deps: ['gmp_lawyers', 'permit_leads'] },
];

async function main() {
  console.log('=== Migracja danych: STARY -> NOWY ===\n');

  const exportedCounts = {};
  const importedCounts = {};

  for (const { name, clearFirst } of TABLES) {
    process.stdout.write(`${name}: `);

    // 1. Export ze starego
    const rows = await fetchAll(OLD_URL, OLD_KEY, name);
    exportedCounts[name] = rows.length;
    process.stdout.write(`eksport ${rows.length} | `);

    if (rows.length === 0) {
      console.log('skip (puste)');
      continue;
    }

    // 2. Wyczysc nowy jesli trzeba (default data z migracji)
    if (clearFirst) {
      await truncate(NEW_URL, NEW_KEY, name);
      process.stdout.write('wyczyszczono | ');
    }

    // 3. Import do nowego
    await insertBatch(NEW_URL, NEW_KEY, name, rows);

    // 4. Zweryfikuj
    const res = await req(
      `${NEW_URL}/rest/v1/${name}?select=count`,
      NEW_KEY,
      { headers: { Prefer: 'count=exact', Range: '0-0' } }
    );
    const range = res.headers.get('content-range');
    const count = range ? parseInt(range.split('/')[1], 10) : -1;
    importedCounts[name] = count;
    console.log(`import OK (${count} wierszy w nowym)`);
  }

  console.log('\n=== PODSUMOWANIE ===');
  for (const t of TABLES) {
    const e = exportedCounts[t.name] || 0;
    const i = importedCounts[t.name] ?? e; // jesli puste - 0/0
    const ok = e === i ? 'OK' : 'NIEZGODNOSC';
    console.log(`  ${t.name.padEnd(28)} ${e.toString().padStart(4)} -> ${i.toString().padStart(4)} ${ok}`);
  }
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
