// generate-employer-report — Etap VI.E2
// Generuje raport DOCX legalności pracowników danego pracodawcy.
//
// Sygnatura POST: { employer_id: string }
// Response: { ok, document_id, download_url, file_name }
//
// Raport zawiera:
//   - Header: nazwa pracodawcy, NIP, data raportu
//   - Tabela pracowników: nazwisko, narodowość, podstawa pracy, data od/do, status (zielony/żółty/czerwony)
//   - Podsumowanie: zielony X / żółty Y / czerwony Z
//   - Podpis: data + miejscowość

import { createClient } from "npm:@supabase/supabase-js@2";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, HeadingLevel, WidthType, BorderStyle } from "npm:docx@9.0.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ReportRequest { employer_id: string; }

const STATUS_LABELS: Record<string, string> = {
    zielony: "🟢 OK",
    zolty: "🟡 Kończy się ≤30 dni",
    czerwony: "🔴 Przeterminowany",
    brak: "⚪ Brak danych",
};

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
    const supabase = createClient(SUPA_URL, Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body: ReportRequest = await req.json().catch(() => ({} as ReportRequest));
    if (!body.employer_id) {
        return new Response(JSON.stringify({ error: "employer_id required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pobierz dane pracodawcy
    const { data: emp, error: empErr } = await supabase.from("gmp_employers")
        .select("id, name, nip, contact_person, contact_phone, contact_email")
        .eq("id", body.employer_id).single();
    if (empErr || !emp) {
        return new Response(JSON.stringify({ error: "Pracodawca nie znaleziony" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pobierz sprawy + work_legality + clients
    const { data: cases } = await supabase.from("gmp_cases")
        .select(`
            id, case_number, status, kind, legal_stay_status, legal_stay_end_date,
            client:gmp_clients(first_name, last_name, nationality, pesel),
            work_legality:gmp_case_work_legality(work_basis, work_start_date, work_end_date, work_status, work_notes)
        `)
        .eq("employer_id", body.employer_id)
        .in("status", ["aktywna", "zlecona"]);

    const rows = (cases || []).filter(c => c.client);

    // Statystyki
    const stats = { zielony: 0, zolty: 0, czerwony: 0, brak: 0 };
    rows.forEach(r => {
        const wl = Array.isArray(r.work_legality) ? r.work_legality[0] : r.work_legality;
        const status = wl?.work_status || r.legal_stay_status || "brak";
        stats[status as keyof typeof stats] = (stats[status as keyof typeof stats] || 0) + 1;
    });

    const today = new Date().toLocaleDateString("pl-PL");

    // === Generowanie DOCX ===
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: "RAPORT LEGALNOŚCI PRACY",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Pracodawca: ", bold: true }),
                        new TextRun({ text: emp.name }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "NIP: ", bold: true }),
                        new TextRun({ text: emp.nip || "—" }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Osoba kontaktowa: ", bold: true }),
                        new TextRun({ text: emp.contact_person || "—" }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Data raportu: ", bold: true }),
                        new TextRun({ text: today }),
                    ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: "Podsumowanie statusów",
                    heading: HeadingLevel.HEADING_2,
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `🟢 Zielony (OK): ${stats.zielony}`, color: "047857" }),
                        new TextRun({ text: "    " }),
                        new TextRun({ text: `🟡 Żółty (≤30 dni): ${stats.zolty}`, color: "B45309" }),
                        new TextRun({ text: "    " }),
                        new TextRun({ text: `🔴 Czerwony (przeterminowany): ${stats.czerwony}`, color: "B91C1C" }),
                        new TextRun({ text: "    " }),
                        new TextRun({ text: `⚪ Brak danych: ${stats.brak}`, color: "525252" }),
                    ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    text: `Lista pracowników (${rows.length})`,
                    heading: HeadingLevel.HEADING_2,
                }),
                buildTable(rows),
                new Paragraph({ text: "" }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Raport wygenerowany automatycznie przez system GetMyPermit CRM. ", italics: true, size: 18 }),
                        new TextRun({ text: `Data: ${today}`, italics: true, size: 18 }),
                    ],
                    alignment: AlignmentType.RIGHT,
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    const fileName = `raport_legalnosc_${emp.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase().slice(0, 40)}_${Date.now()}.docx`;
    const storagePath = `employer_reports/${body.employer_id}/${fileName}`;

    // Upload do storage (bucket case-documents — bez case_id, jako employer report)
    const { error: upErr } = await supabase.storage.from("case-documents")
        .upload(storagePath, buffer, {
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            upsert: false,
        });
    if (upErr) {
        console.warn("[generate-employer-report] storage upload error:", upErr);
        // Fallback: zwróć base64 bez storage
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        return new Response(JSON.stringify({
            ok: true, fallback: true, file_name: fileName, file_base64: base64,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Signed URL (60 min)
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

function buildTable(rows: any[]): Table {
    const headerRow = new TableRow({
        children: ["Nazwisko i imię", "Narodowość", "Podstawa pracy", "Data od", "Data do", "Status"]
            .map(h => new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })],
                shading: { fill: "1F2937" },
            })),
    });
    const dataRows = rows.map(r => {
        const wl = Array.isArray(r.work_legality) ? r.work_legality[0] : r.work_legality;
        const status = wl?.work_status || r.legal_stay_status || "brak";
        const cl = r.client;
        return new TableRow({
            children: [
                cellText(`${cl.last_name} ${cl.first_name}`, 20),
                cellText(cl.nationality || "—", 18),
                cellText(wl?.work_basis || "—", 18),
                cellText(wl?.work_start_date || "—", 18),
                cellText(wl?.work_end_date || r.legal_stay_end_date || "—", 18),
                cellText(STATUS_LABELS[status] || status, 18),
            ],
        });
    });
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows],
    });
}

function cellText(text: string, size: number): TableCell {
    return new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: text || "—", size })] })],
    });
}
