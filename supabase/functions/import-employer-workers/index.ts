// import-employer-workers — Etap V.7
// Wczytaj CSV z pracownikami → upsert klientów + auto-grupa pracodawca
// Format CSV (header w pierwszym wierszu):
//   first_name,last_name,birth_date,nationality,phone,email,pesel,role_in_group
// Dedup: po pesel jeśli podany, inaczej po (last_name+first_name+birth_date)
//
// Sygnatura POST:
//   { employer_id: string, csv_data: string, create_draft_cases?: boolean }
// Response:
//   { created_clients, updated_clients, draft_cases, group_id, errors[] }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ImportRequest {
    employer_id: string;
    csv_data: string;
    create_draft_cases?: boolean;
}

interface RowData {
    first_name: string;
    last_name: string;
    birth_date?: string;
    nationality?: string;
    phone?: string;
    email?: string;
    pesel?: string;
    role_in_group?: string;
}

function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
            out.push(cur.trim()); cur = "";
        } else {
            cur += ch;
        }
    }
    out.push(cur.trim());
    return out;
}

function parseCsv(csv: string): RowData[] {
    const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/\s/g, "_"));
    const rows: RowData[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => { obj[h] = (cells[idx] || "").trim(); });
        if (obj.first_name && obj.last_name) {
            rows.push({
                first_name: obj.first_name,
                last_name: obj.last_name,
                birth_date: obj.birth_date || undefined,
                nationality: obj.nationality || undefined,
                phone: obj.phone || undefined,
                email: obj.email || undefined,
                pesel: obj.pesel || undefined,
                role_in_group: obj.role_in_group || obj.role || undefined,
            });
        }
    }
    return rows;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "POST only" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    const body: ImportRequest = await req.json().catch(() => ({} as ImportRequest));
    if (!body.employer_id || !body.csv_data) {
        return new Response(JSON.stringify({ error: "employer_id and csv_data required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Sprawdź pracodawcę
    const { data: emp, error: empErr } = await supabase.from("gmp_employers")
        .select("id, name").eq("id", body.employer_id).single();
    if (empErr || !emp) {
        return new Response(JSON.stringify({ error: "Pracodawca nie istnieje" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rows = parseCsv(body.csv_data);
    if (rows.length === 0) {
        return new Response(JSON.stringify({ error: "Pusty CSV lub błędne nagłówki (wymagane: first_name, last_name)" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pobierz lub utwórz grupę pracodawcy
    let { data: group } = await supabase.from("gmp_case_groups")
        .select("id").eq("employer_id", body.employer_id).eq("type", "pracodawca").maybeSingle();
    if (!group) {
        const { data: created, error: createErr } = await supabase.from("gmp_case_groups")
            .insert({ name: emp.name, type: "pracodawca", employer_id: body.employer_id, is_active: true })
            .select("id").single();
        if (createErr) {
            return new Response(JSON.stringify({ error: "Nie utworzono grupy: " + createErr.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        group = created;
    }

    // Pobierz staff record dla user (do created_by/added_by)
    const { data: staffRow } = await supabase.from("gmp_staff").select("id").eq("user_id", user.id).maybeSingle();
    const staffId = staffRow?.id || null;

    let createdClients = 0, updatedClients = 0, draftCases = 0;
    const errors: string[] = [];

    for (const r of rows) {
        try {
            // Dedup: po PESEL jeśli jest, inaczej po imię+nazwisko+data ur.
            let existing = null;
            if (r.pesel) {
                const { data } = await supabase.from("gmp_clients").select("id").eq("pesel", r.pesel).maybeSingle();
                existing = data;
            }
            if (!existing && r.birth_date) {
                const { data } = await supabase.from("gmp_clients")
                    .select("id")
                    .eq("first_name", r.first_name).eq("last_name", r.last_name).eq("birth_date", r.birth_date)
                    .maybeSingle();
                existing = data;
            }

            let clientId: string;
            if (existing) {
                // Update phone/email jeśli puste w bazie
                const { error: upErr } = await supabase.from("gmp_clients")
                    .update({
                        phone: r.phone || undefined,
                        email: r.email || undefined,
                        nationality: r.nationality || undefined,
                    })
                    .eq("id", existing.id);
                if (upErr) errors.push(`update ${r.last_name} ${r.first_name}: ${upErr.message}`);
                else updatedClients++;
                clientId = existing.id;
            } else {
                const { data: newCl, error: insErr } = await supabase.from("gmp_clients")
                    .insert({
                        first_name: r.first_name,
                        last_name: r.last_name,
                        birth_date: r.birth_date || null,
                        nationality: r.nationality || null,
                        phone: r.phone || null,
                        email: r.email || null,
                        pesel: r.pesel || null,
                    })
                    .select("id").single();
                if (insErr) {
                    errors.push(`insert ${r.last_name} ${r.first_name}: ${insErr.message}`);
                    continue;
                }
                clientId = newCl.id;
                createdClients++;
            }

            // Opcjonalnie: utwórz draft case (status=lead) z employer_id
            let caseIdForGroup: string | null = null;
            if (body.create_draft_cases) {
                const { data: existingCase } = await supabase.from("gmp_cases")
                    .select("id").eq("client_id", clientId).eq("employer_id", body.employer_id).limit(1).maybeSingle();
                if (existingCase) {
                    caseIdForGroup = existingCase.id;
                } else {
                    const { data: newCase, error: caseErr } = await supabase.from("gmp_cases")
                        .insert({
                            client_id: clientId,
                            employer_id: body.employer_id,
                            status: "lead",
                            party_type: "individual",
                            assigned_to: staffId,
                            created_by: staffId,
                        })
                        .select("id").single();
                    if (caseErr) errors.push(`new case ${r.last_name}: ${caseErr.message}`);
                    else { draftCases++; caseIdForGroup = newCase.id; }
                }
            } else {
                // Bez draft case — szukaj istniejącej sprawy z tym pracodawcą żeby dodać do grupy
                const { data: anyCase } = await supabase.from("gmp_cases")
                    .select("id").eq("client_id", clientId).eq("employer_id", body.employer_id).limit(1).maybeSingle();
                if (anyCase) caseIdForGroup = anyCase.id;
            }

            // Dodaj do grupy pracodawcy (idempotent)
            if (caseIdForGroup && group?.id) {
                await supabase.from("gmp_case_group_members")
                    .upsert(
                        { group_id: group.id, case_id: caseIdForGroup, role_in_group: r.role_in_group || "pracownik", added_by: staffId },
                        { onConflict: "group_id,case_id", ignoreDuplicates: true }
                    );
            }
        } catch (e) {
            errors.push(`row ${r.last_name}: ${(e as Error).message}`);
        }
    }

    return new Response(JSON.stringify({
        ok: true,
        employer_id: body.employer_id,
        group_id: group?.id,
        rows_processed: rows.length,
        created_clients: createdClients,
        updated_clients: updatedClients,
        draft_cases: draftCases,
        errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
