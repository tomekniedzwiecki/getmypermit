// generate-group-report — Etap V.5
// Raport zbiorczy DOCX dla grupy spraw (rodzina/pracodawca/projekt).
//
// Sygnatura POST: { group_id: string }
// Response: { ok, file_name, download_url, rows }

import { createClient } from "npm:@supabase/supabase-js@2";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, HeadingLevel, WidthType } from "npm:docx@9.0.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TYPE_LABELS: Record<string, string> = {
    pracodawca: "Pracodawca",
    rodzina: "Rodzina",
    projekt: "Projekt",
    rozliczenie_zbiorcze: "Rozliczenie zbiorcze",
    inna: "Inna",
};
const STATUS_LABELS: Record<string, string> = {
    lead: "Lead",
    zlecona: "Zlecona",
    aktywna: "Aktywna",
    zakonczona: "Zakończona",
    archiwum: "Archiwum",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "POST only" }),
            { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(SUPA_URL, Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return new Response(JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const groupId = body.group_id;
    if (!groupId) return new Response(JSON.stringify({ error: "group_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Pobierz grupę
    const { data: group, error: gErr } = await supabase.from("gmp_case_groups")
        .select("id, name, type, employer:gmp_employers!employer_id(id, name, nip), assigned:gmp_staff!assigned_to(full_name), notes")
        .eq("id", groupId).single();
    if (gErr || !group) return new Response(JSON.stringify({ error: "Grupa nie znaleziona" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Pobierz członków + sprawy + balans
    const { data: members } = await supabase.from("gmp_case_group_members")
        .select(`
            role_in_group,
            case:gmp_cases(
                id, case_number, status, stage, kind, znak_sprawy,
                date_decision, decision_outcome,
                client:gmp_clients(first_name, last_name, nationality)
            )
        `)
        .eq("group_id", groupId);

    const rows = (members || []).filter(m => m.case);

    // Balans per case
    const caseIds = rows.map((m: any) => m.case.id);
    let balanceMap: Record<string, any> = {};
    if (caseIds.length) {
        const { data: balances } = await supabase.from("gmp_case_balance")
            .select("case_id, total_planned, total_paid, balance_due, overdue_installments_count")
            .in("case_id", caseIds);
        (balances || []).forEach(b => { balanceMap[b.case_id] = b; });
    }

    const today = new Date().toLocaleDateString("pl-PL");

    // Statystyki
    const stats = { total: rows.length, aktywne: 0, zakonczone: 0, pozytywne: 0 };
    let sumPlanned = 0, sumPaid = 0, sumBalance = 0;
    rows.forEach((m: any) => {
        const c = m.case;
        if (c.status === "aktywna") stats.aktywne++;
        if (c.status === "zakonczona") stats.zakonczone++;
        if (c.decision_outcome === "pozytywna") stats.pozytywne++;
        const b = balanceMap[c.id];
        if (b) {
            sumPlanned += Number(b.total_planned || 0);
            sumPaid += Number(b.total_paid || 0);
            sumBalance += Number(b.balance_due || 0);
        }
    });

    // === DOCX ===
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: "RAPORT ZBIORCZY GRUPY",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "" }),
                kvLine("Nazwa grupy: ", group.name),
                kvLine("Typ: ", TYPE_LABELS[group.type] || group.type),
                ...(group.employer ? [kvLine("Pracodawca: ", `${group.employer.name}${group.employer.nip ? ` (NIP: ${group.employer.nip})` : ""}`)] : []),
                ...(group.assigned ? [kvLine("Opiekun: ", group.assigned.full_name)] : []),
                kvLine("Liczba spraw: ", String(rows.length)),
                kvLine("Data raportu: ", today),
                ...(group.notes ? [new Paragraph({ text: "" }), new Paragraph({ children: [new TextRun({ text: "Notatki: ", bold: true }), new TextRun({ text: group.notes })] })] : []),

                new Paragraph({ text: "" }),
                new Paragraph({ text: "Podsumowanie", heading: HeadingLevel.HEADING_2 }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Aktywne: ${stats.aktywne}`, color: "047857" }),
                        new TextRun({ text: "    " }),
                        new TextRun({ text: `Zakończone: ${stats.zakonczone}`, color: "525252" }),
                        new TextRun({ text: "    " }),
                        new TextRun({ text: `Pozytywne decyzje: ${stats.pozytywne}`, color: "047857", bold: true }),
                    ],
                }),

                ...(sumPlanned > 0 ? [
                    new Paragraph({ text: "" }),
                    new Paragraph({ text: "Rozliczenia zbiorcze", heading: HeadingLevel.HEADING_2 }),
                    new Paragraph({ children: [
                        new TextRun({ text: `Planowane: ${formatMoney(sumPlanned)}` }),
                        new TextRun({ text: "    " }),
                        new TextRun({ text: `Wpłacone: ${formatMoney(sumPaid)}`, color: "047857" }),
                        new TextRun({ text: "    " }),
                        new TextRun({ text: `Saldo: ${formatMoney(sumBalance)}`, color: sumBalance > 0 ? "B45309" : "047857", bold: true }),
                    ] }),
                ] : []),

                new Paragraph({ text: "" }),
                new Paragraph({ text: `Lista członków grupy (${rows.length})`, heading: HeadingLevel.HEADING_2 }),
                buildTable(rows, balanceMap),

                new Paragraph({ text: "" }),
                new Paragraph({
                    children: [new TextRun({ text: `Raport wygenerowany automatycznie. Data: ${today}`, italics: true, size: 18 })],
                    alignment: AlignmentType.RIGHT,
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `raport_grupa_${group.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase().slice(0, 40)}_${Date.now()}.docx`;
    const storagePath = `group_reports/${groupId}/${fileName}`;

    const { error: upErr } = await supabase.storage.from("case-documents")
        .upload(storagePath, buffer, {
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            upsert: false,
        });
    if (upErr) {
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        return new Response(JSON.stringify({
            ok: true, fallback: true, file_name: fileName, file_base64: base64,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: signed } = await supabase.storage.from("case-documents")
        .createSignedUrl(storagePath, 3600);

    return new Response(JSON.stringify({
        ok: true,
        file_name: fileName,
        storage_path: storagePath,
        download_url: signed?.signedUrl || null,
        rows: rows.length,
        stats,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

function kvLine(label: string, value: string): Paragraph {
    return new Paragraph({
        children: [
            new TextRun({ text: label, bold: true }),
            new TextRun({ text: value }),
        ],
    });
}

function buildTable(rows: any[], balanceMap: Record<string, any>): Table {
    const headerRow = new TableRow({
        children: ["Nazwisko i imię", "Rola", "Nr sprawy", "Etap", "Status", "Saldo"]
            .map(h => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })],
                shading: { fill: "1F2937" },
            })),
    });
    const dataRows = rows.map((m: any) => {
        const c = m.case;
        const cl = c.client;
        const b = balanceMap[c.id];
        return new TableRow({
            children: [
                cellText(cl ? `${cl.last_name} ${cl.first_name}` : "(bez klienta)"),
                cellText(m.role_in_group || "—"),
                cellText(c.case_number || "—"),
                cellText(c.stage || "—"),
                cellText(STATUS_LABELS[c.status] || c.status || "—"),
                cellText(b ? formatMoney(Number(b.balance_due || 0)) : "—"),
            ],
        });
    });
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows],
    });
}

function cellText(text: string): TableCell {
    return new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: text || "—", size: 18 })] })],
    });
}

function formatMoney(amount: number): string {
    return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(amount);
}
