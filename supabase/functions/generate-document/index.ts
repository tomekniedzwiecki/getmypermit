// generate-document — Edge function do renderowania DOCX z templatu
// Pawel v3.2 § II-A.4
//
// Stack:
//   - npm:docx-templates@4.15.0 + noSandbox: true (potwierdzono w spike-docx, render ~350ms)
//   - npm:@supabase/supabase-js (NIE jsr — używamy npm dla zgodności z docx-templates)
//   - User JWT verify (A3 — security)
//   - Race condition guard 60s (A8)
//   - Versioning template (A5)
//   - Audit log + sanitization (D1)
//
// Deploy:
//   npx supabase functions deploy generate-document --project-ref gfwsdrbywgmceateubyq
//   (--verify-jwt jest domyślne — nie używamy --no-verify-jwt)
//
// Sygnatura POST:
//   {
//     case_id: string,
//     template_id: string,
//     overrides?: Record<string, any>,
//     save_to_documents?: boolean       // default true
//   }
// Response:
//   200 { document_id, storage_path, download_url, file_name, render_ms, template_version }
//   200 { status: 'missing_fields', missing_fields: [...] }
//   400/401/404/500 { error, details? }

import { createClient } from "npm:@supabase/supabase-js@2";
import { createReport } from "npm:docx-templates@4.15.0";
import { buildCaseContext } from "./lib/build-context.ts";

interface GenerateRequest {
    case_id: string;
    template_id: string;
    overrides?: Record<string, any>;
    save_to_documents?: boolean;
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "POST only" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const startedAt = Date.now();

    // ============================================================
    // A3 — Security: weryfikacja user JWT (NIE service_role)
    // ============================================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized — brak Authorization header" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        {
            global: { headers: { Authorization: authHeader } },
            auth: { persistSession: false },
        }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Invalid token", details: userErr?.message }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============================================================
    // Parse request
    // ============================================================
    let body: GenerateRequest;
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { case_id, template_id, overrides = {}, save_to_documents = true } = body;
    if (!case_id || !template_id) {
        return new Response(JSON.stringify({ error: "case_id and template_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============================================================
    // 1. Fetch template
    // ============================================================
    const { data: template, error: tplErr } = await supabase
        .from("gmp_document_templates")
        .select("*")
        .eq("id", template_id)
        .eq("is_active", true)
        .maybeSingle();

    if (tplErr || !template) {
        return new Response(JSON.stringify({ error: "Template not found or inactive", template_id }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============================================================
    // A8 — Race condition guard: skip jeśli ten sam template generowany w 60s
    // ============================================================
    if (save_to_documents) {
        const since = new Date(Date.now() - 60000).toISOString();
        const { count: recentDup } = await supabase.from("gmp_documents")
            .select("id", { count: "exact", head: true })
            .eq("case_id", case_id)
            .eq("template_id", template_id)
            .gte("created_at", since);
        if ((recentDup || 0) > 0) {
            return new Response(JSON.stringify({
                status: "recent_duplicate",
                message: `Ten szablon był generowany dla tej sprawy w ostatnich 60s. Pominięto.`,
            }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
    }

    // ============================================================
    // 2. Download template DOCX from storage
    // ============================================================
    const { data: tplFile, error: dlErr } = await supabase.storage
        .from("document-templates")
        .download(template.storage_path);

    if (dlErr || !tplFile) {
        return new Response(JSON.stringify({
            error: "Template file missing from storage",
            details: dlErr?.message,
            storage_path: template.storage_path,
        }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const tplBuffer = new Uint8Array(await tplFile.arrayBuffer());

    // ============================================================
    // 3. Build context per case_id
    // ============================================================
    let ctx: any;
    try {
        ctx = await buildCaseContext(case_id, supabase);
    } catch (e) {
        return new Response(JSON.stringify({ error: "Build context failed", details: String(e) }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = { ...ctx, ...overrides };

    // ============================================================
    // 4. Validate required_fields
    // ============================================================
    const missing: string[] = [];
    for (const field of template.required_fields || []) {
        const value = field.split(".").reduce((o: any, k: string) => o?.[k], data);
        if (value === undefined || value === null || value === "") {
            missing.push(field);
        }
    }
    if (missing.length > 0 && !overrides.allow_missing) {
        return new Response(JSON.stringify({
            status: "missing_fields",
            missing_fields: missing,
            message: `Brakuje pól: ${missing.join(', ')}. Uzupełnij dane sprawy lub przekaż override.`,
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============================================================
    // 5. Render DOCX
    // ============================================================
    let report: Uint8Array;
    const renderStart = Date.now();
    try {
        report = await createReport({
            template: tplBuffer,
            data,
            cmdDelimiter: ["+++", "+++"],  // alternative delimiter — łatwiej w Word
            noSandbox: true,                // KLUCZOWE dla Deno
            failFast: false,
        });
    } catch (renderErr) {
        // Log błędu generacji
        await supabase.from("gmp_document_generation_log").insert({
            case_id, template_id,
            generated_by: user.id,
            status: "error",
            error_message: String(renderErr).slice(0, 500),
            parameters: { overrides, missing, template_version: template.version },
            duration_ms: Date.now() - startedAt,
        });
        return new Response(JSON.stringify({
            error: "Render failed",
            details: String(renderErr),
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const renderMs = Date.now() - renderStart;

    // ============================================================
    // 6. Upload do case-documents
    // ============================================================
    const safeKind = String(template.kind || "doc").replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `${Date.now()}-${safeKind}-${case_id.slice(0, 8)}.docx`;
    const path = `${case_id}/${filename}`;

    const { error: upErr } = await supabase.storage
        .from("case-documents")
        .upload(path, report, {
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            upsert: false,
        });

    if (upErr) {
        return new Response(JSON.stringify({
            error: "Upload failed",
            details: upErr.message,
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ============================================================
    // 7. Insert do gmp_documents
    // ============================================================
    let document_id: string | null = null;
    if (save_to_documents) {
        const { data: doc, error: docErr } = await supabase.from("gmp_documents").insert({
            case_id,
            name: `${template.name}.docx`,
            storage_path: path,
            mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            file_size: report.length,
            template_id,
            doc_type: template.kind,
            source: "generated",
            status: "ready",
        }).select("id").maybeSingle();

        if (docErr) {
            console.warn("[generate-document] Insert do gmp_documents:", docErr);
        }
        document_id = doc?.id ?? null;
    }

    // ============================================================
    // 8. Log + audit
    // ============================================================
    await supabase.from("gmp_document_generation_log").insert({
        case_id, template_id, document_id,
        generated_by: user.id,
        status: "success",
        parameters: { overrides, template_version: template.version },
        duration_ms: Date.now() - startedAt,
    });

    // Audit log via gmp_audit_log_add (jeśli istnieje)
    try {
        await supabase.rpc("gmp_audit_log_add", {
            p_action: "document_generated",
            p_entity_type: "document",
            p_entity_id: document_id,
            p_entity_label: template.name,
            p_severity: "info",
            p_metadata: { template_kind: template.kind, case_id, version: template.version },
        });
    } catch { /* opcjonalne — nie blokuje generacji */ }

    // Activity entry (jeśli enum ma document_generated)
    try {
        await supabase.from("gmp_case_activities").insert({
            case_id,
            activity_type: "document_generated",
            content: `Wygenerowano dokument: ${template.name}`,
            metadata: { template_kind: template.kind, document_id, version: template.version },
            created_by: user.id,
        });
    } catch { /* fallback: brak wartości enum */ }

    // ============================================================
    // 9. Signed URL (30 dni)
    // ============================================================
    const { data: urlData } = await supabase.storage
        .from("case-documents")
        .createSignedUrl(path, 30 * 86400);

    return new Response(JSON.stringify({
        document_id,
        storage_path: path,
        download_url: urlData?.signedUrl,
        file_name: filename,
        render_ms: renderMs,
        total_ms: Date.now() - startedAt,
        template_version: template.version,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
