// SPIKE: docx-templates na Deno (Supabase Edge Functions)
// Cel: zweryfikować że docx-templates@4.15.0 chodzi przez esm.sh + noSandbox: true
// Test: render templatu z 1 placeholderem + tabelą rat (10 wierszy) w <500ms CPU
//
// Po pomyślnym teście — ten function można usunąć (`npx supabase functions delete _spike-docx`)
//
// Deploy: npx supabase functions deploy _spike-docx --project-ref gfwsdrbywgmceateubyq
// Test:   curl -X POST <FUNCTION_URL> -H "Authorization: Bearer <ANON_KEY>" -H "Content-Type: application/json" \
//             -d '{"client_first_name":"Jan","client_last_name":"Kowalski"}' -o test_output.docx

// Próba 3: npm: import (Supabase node compatibility — od kwietnia 2024)
// docx-templates ma node:vm dla sandboxingu — używamy noSandbox: true żeby uniknąć
import { createReport } from "npm:docx-templates@4.15.0";

interface SpikeRequest {
    client_first_name?: string;
    client_last_name?: string;
    case_number?: string;
    template_url?: string;  // opcjonalnie — fetch własny template
}

const DEFAULT_TEMPLATE_URL = "https://yxmavwkwnfuphjqbelws.supabase.co/storage/v1/object/public/document-templates/_spike_test_template.docx";

Deno.serve(async (req) => {
    const startedAt = Date.now();

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
    }

    let body: SpikeRequest = {};
    try { body = await req.json(); } catch { /* allow empty body for default test */ }

    const data = {
        client: {
            first_name: body.client_first_name || "Jan",
            last_name: body.client_last_name || "Kowalski",
        },
        case_number: body.case_number || "TEST/2026/001",
        today: new Date().toISOString().split("T")[0],
        installments: Array.from({ length: 10 }, (_, i) => ({
            number: i + 1,
            amount: 500,
            due_date: `2026-${String(5 + i).padStart(2, "0")}-15`,
            status: i < 3 ? "paid" : "pending",
        })),
        full_client_name: `${body.client_first_name || "Jan"} ${body.client_last_name || "Kowalski"}`,
    };

    // 1. Fetch template
    const templateUrl = body.template_url || DEFAULT_TEMPLATE_URL;
    let templateBuffer: Uint8Array;
    try {
        const resp = await fetch(templateUrl);
        if (!resp.ok) {
            return new Response(JSON.stringify({
                error: "Template fetch failed",
                status: resp.status,
                url: templateUrl,
            }), { status: 502, headers: { "Content-Type": "application/json" } });
        }
        templateBuffer = new Uint8Array(await resp.arrayBuffer());
    } catch (e) {
        return new Response(JSON.stringify({
            error: "Template fetch exception",
            details: String(e),
        }), { status: 502, headers: { "Content-Type": "application/json" } });
    }

    // 2. Render
    let report: Uint8Array;
    const renderStart = Date.now();
    try {
        report = await createReport({
            template: templateBuffer,
            data,
            cmdDelimiter: ["+++", "+++"],  // alternative delimiter — łatwiej w Word/LibreOffice
            noSandbox: true,  // KLUCZOWE dla Deno (uniknięcie node:vm)
            failFast: false,
        });
    } catch (e) {
        return new Response(JSON.stringify({
            error: "Render failed",
            details: String(e),
            stack: e instanceof Error ? e.stack : undefined,
        }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    const renderMs = Date.now() - renderStart;

    // 3. Return DOCX
    return new Response(report, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": 'attachment; filename="spike_test.docx"',
            "X-Render-Ms": String(renderMs),
            "X-Total-Ms": String(Date.now() - startedAt),
            "X-Template-Size": String(templateBuffer.length),
            "X-Output-Size": String(report.length),
        },
    });
});
