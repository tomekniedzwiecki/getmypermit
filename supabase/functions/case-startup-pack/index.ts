// case-startup-pack — wywoływana z Wizarda po utworzeniu sprawy
// Generuje pakiet dokumentów startowych (auto_in_startup_pack=TRUE templates)
// Pawel v3.2 § II-C.5
//
// Sygnatura POST:
//   { case_id: string }
// Response:
//   { generated: [{ template_kind, document_id, file_name }], skipped: [{ template_kind, reason }] }

import { createClient } from "npm:@supabase/supabase-js@2";

interface PackRequest { case_id: string; }

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

    // A3 — Security: weryfikacja user JWT (NIE service_role)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(
        SUPA_URL,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Parse request
    let body: PackRequest;
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { case_id } = body;
    if (!case_id) {
        return new Response(JSON.stringify({ error: "case_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pobierz sprawę
    const { data: caseData, error: csErr } = await supabase
        .from("gmp_cases")
        .select("id, case_number, party_type, kind, category, employer_id, status")
        .eq("id", case_id)
        .maybeSingle();

    if (csErr || !caseData) {
        return new Response(JSON.stringify({ error: "Case not found", details: csErr?.message }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pobierz auto_in_startup_pack templates
    const { data: templates, error: tplErr } = await supabase
        .from("gmp_document_templates")
        .select("id, name, kind, auto_for_categories, auto_for_kinds, auto_for_party_types, auto_in_startup_pack")
        .eq("is_active", true)
        .eq("auto_in_startup_pack", true)
        .order("sort_order");

    if (tplErr) {
        return new Response(JSON.stringify({ error: "Templates fetch failed", details: tplErr.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Filtruj wg kategorii / kind / party_type
    const eligible = (templates || []).filter(t => {
        if (t.auto_for_categories?.length && !t.auto_for_categories.includes(caseData.category)) return false;
        if (t.auto_for_kinds?.length && !t.auto_for_kinds.includes(caseData.kind)) return false;
        if (t.auto_for_party_types?.length && !t.auto_for_party_types.includes(caseData.party_type)) return false;
        // Pomiń pelnomocnictwo_pracodawca jeśli brak employer_id
        if (t.kind === 'pelnomocnictwo_pracodawca' && !caseData.employer_id) return false;
        if (t.kind === 'instrukcja_pracodawca' && !caseData.employer_id) return false;
        if (t.kind === 'lista_dokumentow_pracodawca' && !caseData.employer_id) return false;
        if (t.kind === 'zgoda_przekazywania_statusu' && !caseData.employer_id) return false;
        return true;
    });

    const generated: any[] = [];
    const skipped: any[] = [];

    for (const tpl of eligible) {
        // A8: race guard już jest w generate-document, nie powtarzamy

        try {
            const resp = await fetch(`${SUPA_URL}/functions/v1/generate-document`, {
                method: "POST",
                headers: {
                    Authorization: authHeader,  // propaguj user JWT
                    apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ case_id, template_id: tpl.id }),
            });

            const result = await resp.json();
            if (result.document_id) {
                generated.push({
                    template_kind: tpl.kind,
                    document_id: result.document_id,
                    file_name: result.file_name,
                    render_ms: result.render_ms,
                });
            } else if (result.status === "missing_fields") {
                skipped.push({ template_kind: tpl.kind, reason: "missing_fields", details: result.missing_fields });
            } else if (result.status === "recent_duplicate") {
                skipped.push({ template_kind: tpl.kind, reason: "recent_duplicate" });
            } else {
                skipped.push({ template_kind: tpl.kind, reason: "error", details: result.error || `HTTP ${resp.status}` });
            }
        } catch (e) {
            skipped.push({ template_kind: tpl.kind, reason: "exception", details: String(e) });
        }
    }

    // B4: 1 zbiorcza notyfikacja zamiast N osobnych
    try {
        await supabase.rpc("gmp_notify_admins", {
            p_kind: "case_created",
            p_title: `Pakiet startowy wygenerowany: ${caseData.case_number || case_id.slice(0, 8)}`,
            p_body: `Wygenerowano ${generated.length} dokumentów (${generated.map(g => g.template_kind).join(", ")}). Pominięto ${skipped.length}.`,
            p_link: `/crm/case.html?id=${case_id}`,
            p_icon: "ph-file-plus",
            p_severity: "info",
            p_source_type: "case",
            p_source_id: case_id,
            p_dedupe: `case-startup-${case_id}`,
        });
    } catch { /* non-blocking */ }

    return new Response(JSON.stringify({
        case_id,
        generated,
        skipped,
        total_ms: Date.now() - startedAt,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
