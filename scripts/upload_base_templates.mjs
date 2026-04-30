// Upload 4 podstawowe szablony DOCX do bucketu document-templates
// + insert do gmp_document_templates
import 'dotenv/config';
import fs from 'fs/promises';
import pg from 'pg';
import path from 'path';

const SUPA = process.env.SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEMPLATES_DIR = path.join(import.meta.dirname || path.dirname(new URL(import.meta.url).pathname), '..', 'docs', 'templates');

const TEMPLATES = [
    {
        file: 'karta_przyjecia.docx',
        name: 'Karta przyjęcia sprawy',
        kind: 'karta_przyjecia',
        sort_order: 1,
        auto_in_startup_pack: true,
        required_fields: ['case_number', 'full_client_name'],
    },
    {
        file: 'harmonogram_platnosci.docx',
        name: 'Harmonogram płatności',
        kind: 'harmonogram_platnosci',
        sort_order: 2,
        auto_in_startup_pack: true,
        required_fields: ['case_number'],
    },
    {
        file: 'pelnomocnictwo_klient_pl.docx',
        name: 'Pełnomocnictwo klienta (PL)',
        kind: 'pelnomocnictwo_klient',
        sort_order: 3,
        auto_in_startup_pack: true,
        required_fields: ['full_client_name', 'client_birth_date', 'client_nationality'],
        auto_for_party_types: ['individual'],
    },
    {
        file: 'instrukcja_klient.docx',
        name: 'Instrukcja dla klienta',
        kind: 'instrukcja_klient',
        sort_order: 4,
        auto_in_startup_pack: true,
        required_fields: ['full_client_name', 'category_label'],
        auto_for_party_types: ['individual'],
    },
];

// 1. Upload do storage
console.log('=== Upload szablonów do bucketu document-templates ===\n');
for (const t of TEMPLATES) {
    const filepath = path.join(TEMPLATES_DIR, t.file);
    const buf = await fs.readFile(filepath);
    const resp = await fetch(`${SUPA}/storage/v1/object/document-templates/${t.file}`, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + SVC,
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'x-upsert': 'true',
        },
        body: buf,
    });
    const ok = resp.ok ? '✓' : '✗';
    console.log(`${ok} ${t.file} (${buf.length} bytes) → HTTP ${resp.status}`);
}

// 2. Insert/update do gmp_document_templates
console.log('\n=== Insert/upsert do gmp_document_templates ===\n');
const client = new pg.Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    port: 5432, user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});
await client.connect();

for (const t of TEMPLATES) {
    // Sprawdź czy już istnieje (po kind)
    const { rows: existing } = await client.query(
        `SELECT id, version FROM gmp_document_templates WHERE kind = $1 AND name = $2 LIMIT 1`,
        [t.kind, t.name]
    );

    if (existing.length > 0) {
        // Update — version bump trigger się wywoła jeśli storage_path zmieniony
        await client.query(`
            UPDATE gmp_document_templates SET
                storage_path = $1, sort_order = $2, auto_in_startup_pack = $3,
                required_fields = $4, auto_for_party_types = $5,
                template_format = 'docx', is_active = TRUE
            WHERE id = $6
        `, [t.file, t.sort_order, t.auto_in_startup_pack, t.required_fields,
            t.auto_for_party_types || null, existing[0].id]);
        console.log(`↻ ${t.kind} (id=${existing[0].id}, v${existing[0].version})`);
    } else {
        const { rows: ins } = await client.query(`
            INSERT INTO gmp_document_templates (
                name, kind, storage_path, template_format, is_active,
                sort_order, auto_in_startup_pack, required_fields, auto_for_party_types
            ) VALUES ($1, $2, $3, 'docx', TRUE, $4, $5, $6, $7)
            RETURNING id, version
        `, [t.name, t.kind, t.file, t.sort_order, t.auto_in_startup_pack,
            t.required_fields, t.auto_for_party_types || null]);
        console.log(`+ ${t.kind} (id=${ins[0].id}, v${ins[0].version})`);
    }
}

console.log('\n=== Lista templatów aktywnych w bazie ===');
const { rows: all } = await client.query(`
    SELECT name, kind, storage_path, version, auto_in_startup_pack, auto_for_party_types
    FROM gmp_document_templates WHERE is_active = TRUE ORDER BY sort_order, name
`);
console.table(all);

await client.end();
console.log('\n✓ Done.');
