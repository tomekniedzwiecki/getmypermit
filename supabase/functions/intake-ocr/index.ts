// Edge function: OCR paszportu + umowy via OpenAI Vision
// Invoke: POST /functions/v1/intake-ocr
// Body: { intake_token: string, doc_type: 'passport'|'contract', storage_path: string }
// Returns: { extracted: { ...fields }, validation: { status, issues } }

import { createClient } from 'npm:@supabase/supabase-js@2';

const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PASSPORT_SCHEMA = {
    type: 'object',
    properties: {
        first_name: { type: 'string', description: 'Given name(s) as in passport' },
        last_name: { type: 'string' },
        birth_date: { type: 'string', description: 'YYYY-MM-DD' },
        gender: { type: 'string', enum: ['M', 'F', 'X'] },
        nationality: { type: 'string' },
        passport_number: { type: 'string' },
        passport_expiry: { type: 'string', description: 'YYYY-MM-DD' },
        passport_issuing: { type: 'string', description: 'ISO country code or name' },
        mrz_valid: { type: 'boolean', description: 'True if MRZ looks readable and consistent' },
    },
    required: ['first_name', 'last_name', 'passport_number'],
    additionalProperties: false,
};

const CONTRACT_SCHEMA = {
    type: 'object',
    properties: {
        employer_name: { type: 'string' },
        employer_nip: { type: 'string', description: '10 digits' },
        position: { type: 'string' },
        contract_type: { type: 'string', enum: ['employment', 'contract', 'specific', 'b2b', 'other'] },
        salary_gross: { type: 'number', description: 'Gross PLN per month' },
        contract_start: { type: 'string' },
        contract_end: { type: 'string', nullable: true },
        working_hours: { type: 'string', enum: ['full', 'part'] },
    },
    required: ['employer_name'],
    additionalProperties: false,
};

Deno.serve(async (req) => {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

    try {
        const { intake_token, doc_type, storage_path, doc_id } = await req.json();
        if (!intake_token || !storage_path) {
            return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // Verify intake exists and is valid
        const { data: intake } = await db.from('gmp_intake_tokens')
            .select('id, expires_at, status').eq('token', intake_token).maybeSingle();
        if (!intake || new Date(intake.expires_at) < new Date()) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // MAJ-CR-2 fix 2026-05-02: tylko aktywne intake mogą OCR-ować
        if (intake.status !== 'invited' && intake.status !== 'in_progress') {
            return new Response(JSON.stringify({ error: 'Intake not active', status: intake.status }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // MAJ-CR-1 fix 2026-05-02: storage_path MUSI zaczynać się od `${intake_token}/`,
        // inaczej atakujący ze swoim tokenem mógłby OCR-ować cudze paszporty.
        const expectedPrefix = `${intake_token}/`;
        if (!storage_path.startsWith(expectedPrefix) || storage_path.includes('..')) {
            return new Response(JSON.stringify({ error: 'storage_path not owned by token' }), { status: 403, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // Get signed URL for the storage object
        const { data: signed } = await db.storage.from('intake-docs').createSignedUrl(storage_path, 300);
        if (!signed?.signedUrl) {
            return new Response(JSON.stringify({ error: 'File not found' }), { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // Choose schema
        const schema = doc_type === 'passport' ? PASSPORT_SCHEMA : doc_type === 'contract' ? CONTRACT_SCHEMA : null;
        const instruction = doc_type === 'passport'
            ? 'Extract passport data from this image. Read the MRZ if visible. Return JSON matching schema. Dates as YYYY-MM-DD.'
            : 'Extract Polish employment contract data. NIP should be 10 digits. Salary is gross monthly in PLN.';

        if (!schema) {
            return new Response(JSON.stringify({ error: 'Unknown doc_type' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // Call OpenAI Vision
        const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${OPENAI_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are a document extractor. Return only JSON matching the provided schema.' },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: instruction },
                            { type: 'image_url', image_url: { url: signed.signedUrl, detail: 'high' } },
                        ],
                    },
                ],
                response_format: {
                    type: 'json_schema',
                    json_schema: { name: doc_type, schema, strict: true },
                },
                max_tokens: 600,
            }),
        });

        if (!oaiRes.ok) {
            const err = await oaiRes.text();
            return new Response(JSON.stringify({ error: 'OpenAI error', detail: err }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        const result = await oaiRes.json();
        let extracted = {};
        try {
            extracted = JSON.parse(result.choices[0].message.content);
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Parse error' }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        // Validation
        const issues: string[] = [];
        if (doc_type === 'passport') {
            if (extracted.passport_expiry) {
                const exp = new Date(extracted.passport_expiry);
                const now = new Date();
                const monthsDiff = (exp.getTime() - now.getTime()) / (30 * 86400000);
                if (exp < now) issues.push('PASSPORT_EXPIRED');
                else if (monthsDiff < 6) issues.push('PASSPORT_EXPIRES_SOON');
            }
            if (extracted.mrz_valid === false) issues.push('MRZ_UNREADABLE');
        }
        if (doc_type === 'contract') {
            if (extracted.employer_nip && !isValidNIP(extracted.employer_nip)) issues.push('NIP_INVALID');
            if (extracted.salary_gross && extracted.salary_gross < 4666) issues.push('SALARY_BELOW_MINIMUM');
        }

        const validation = { status: issues.length ? 'warning' : 'ok', issues };

        // Update document record
        if (doc_id) {
            await db.from('gmp_intake_documents').update({ ocr_data: extracted, validation }).eq('id', doc_id);
        }

        return new Response(JSON.stringify({ extracted, validation }), {
            headers: { ...cors, 'Content-Type': 'application/json' },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
});

// NIP checksum (Polish)
function isValidNIP(nip: string): boolean {
    const digits = nip.replace(/\D/g, '');
    if (digits.length !== 10) return false;
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * weights[i];
    return sum % 11 === parseInt(digits[9]);
}
