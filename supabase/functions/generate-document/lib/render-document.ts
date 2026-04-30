// render-document.ts — programatyczne generowanie DOCX przez npm:docx
// Gwarancja: poprawny XML zgodny ze specyfikacją OOXML, czytelny w Word/Google Docs/LibreOffice
//
// Użycie:
//   import { renderDocument, hasCustomRenderer } from "./lib/render-document.ts";
//   if (hasCustomRenderer(kind)) buffer = await renderDocument(kind, ctx);

import {
    Document, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle, Packer,
    convertInchesToTwip, ShadingType, PageOrientation,
} from "npm:docx@9.0.3";

const FONT = "Calibri";
const SIZE = 22;       // 11pt (half-points)
const SIZE_H1 = 36;    // 18pt
const SIZE_H2 = 28;    // 14pt
const SIZE_SMALL = 18; // 9pt

// ============================================================================
// HELPERS — drobne komponenty wielokrotnego użytku
// ============================================================================

function p(text: string, opts: { bold?: boolean; italic?: boolean; size?: number; align?: any } = {}): Paragraph {
    return new Paragraph({
        alignment: opts.align,
        children: [new TextRun({
            text: text || "",
            bold: opts.bold, italics: opts.italic,
            size: opts.size || SIZE, font: FONT,
        })],
    });
}

function pBold(label: string, value: string): Paragraph {
    return new Paragraph({
        children: [
            new TextRun({ text: label + ": ", bold: true, size: SIZE, font: FONT }),
            new TextRun({ text: value || "—", size: SIZE, font: FONT }),
        ],
    });
}

function h1(text: string, align: any = AlignmentType.CENTER): Paragraph {
    return new Paragraph({
        heading: HeadingLevel.HEADING_1, alignment: align,
        spacing: { before: 200, after: 200 },
        children: [new TextRun({ text, bold: true, size: SIZE_H1, font: FONT })],
    });
}

function h2(text: string): Paragraph {
    return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text, bold: true, size: SIZE_H2, font: FONT })],
    });
}

function emptyParagraph(): Paragraph {
    return new Paragraph({ children: [new TextRun({ text: "", size: SIZE, font: FONT })] });
}

function formatDatePl(d: any): string {
    if (!d) return "—";
    try {
        const date = typeof d === "string" ? new Date(d) : d;
        if (isNaN(date.getTime())) return String(d);
        const months = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    } catch { return String(d); }
}

function formatMoney(v: any): string {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (isNaN(n)) return String(v);
    return n.toFixed(2).replace(".", ",") + " zł";
}

// Tworzy dokument z domyślnymi marginesami i ustawia metadane
function makeDoc(title: string, paragraphs: (Paragraph | Table)[]): Document {
    return new Document({
        creator: "Kancelaria GetMyPermit CRM",
        title,
        description: title,
        styles: {
            default: {
                document: { run: { font: FONT, size: SIZE } },
            },
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: convertInchesToTwip(0.8), bottom: convertInchesToTwip(0.8),
                        left: convertInchesToTwip(0.9), right: convertInchesToTwip(0.9),
                    },
                },
            },
            children: paragraphs,
        }],
    });
}

// ============================================================================
// 1. KARTA PRZYJĘCIA SPRAWY
// ============================================================================
function renderKartaPrzyjecia(ctx: any): Document {
    const children: (Paragraph | Table)[] = [
        h1("KARTA PRZYJĘCIA SPRAWY"),
        emptyParagraph(),
        pBold("Numer sprawy", ctx.case_number),
        pBold("Data przyjęcia", ctx.today_pl || formatDatePl(new Date())),
        emptyParagraph(),

        h2("Dane cudzoziemca"),
        pBold("Imię i nazwisko", ctx.full_client_name),
        pBold("Data urodzenia", formatDatePl(ctx.client_birth_date)),
        pBold("Obywatelstwo", ctx.client_nationality),
        pBold("Telefon", ctx.client_phone),
        pBold("E-mail", ctx.client_email),
        pBold("PESEL", ctx.client_pesel),
        emptyParagraph(),

        h2("Dane sprawy"),
        pBold("Kategoria", ctx.category_label),
        pBold("Tryb sprawy", ctx.kind_label),
        pBold("Pracodawca", ctx.employer_name),
        emptyParagraph(),

        h2("Opłaty planowane"),
        pBold("Wynagrodzenie kancelarii", formatMoney(ctx.fee_amount)),
        pBold("Opłata administracyjna", formatMoney(ctx.admin_fee_amount)),
        pBold("Opłata za kartę pobytu", formatMoney(ctx.stamp_fee_amount)),
        emptyParagraph(), emptyParagraph(),

        p("Podpis pracownika kancelarii: ___________________________", { italic: true }),
        emptyParagraph(),
        p("Podpis klienta: ___________________________", { italic: true }),
    ];
    return makeDoc("Karta przyjęcia sprawy " + (ctx.case_number || ""), children);
}

// ============================================================================
// 2. HARMONOGRAM PŁATNOŚCI (z TABELĄ rat — poprawnie strukturyzowaną)
// ============================================================================
function renderHarmonogramPlatnosci(ctx: any): Document {
    const installments: any[] = ctx.installments || [];

    const children: (Paragraph | Table)[] = [
        h1("HARMONOGRAM PŁATNOŚCI"),
        emptyParagraph(),
        pBold("Numer sprawy", ctx.case_number),
        pBold("Klient", ctx.full_client_name),
        pBold("Data", ctx.today_pl || formatDatePl(new Date())),
        emptyParagraph(),

        h2("Podsumowanie"),
        pBold("Liczba rat", String(installments.length)),
        pBold("Łączna kwota wynagrodzenia",
            formatMoney(installments.reduce((s, i) => s + Number(i.amount || 0), 0) || ctx.fee_amount)),
        emptyParagraph(),
    ];

    if (installments.length > 0) {
        children.push(h2("Szczegółowy harmonogram"));
        // Tabela rat
        const headerCells = ["Lp.", "Kwota", "Termin", "Status"].map(t => new TableCell({
            children: [p(t, { bold: true })],
            shading: { type: ShadingType.CLEAR, fill: "E8E8E8", color: "auto" },
            width: { size: 25, type: WidthType.PERCENTAGE },
        }));
        const rows: TableRow[] = [new TableRow({ children: headerCells, tableHeader: true })];

        for (const inst of installments) {
            const status = inst.status === "paid" ? "Opłacona"
                : inst.status === "overdue" ? "Zaległa"
                : inst.status === "pending" ? "Oczekuje"
                : inst.status || "—";
            rows.push(new TableRow({
                children: [
                    new TableCell({ children: [p(String(inst.installment_number || ""))] }),
                    new TableCell({ children: [p(formatMoney(inst.amount))] }),
                    new TableCell({ children: [p(formatDatePl(inst.due_date))] }),
                    new TableCell({ children: [p(status)] }),
                ],
            }));
        }

        children.push(new Table({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
                left: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
                right: { style: BorderStyle.SINGLE, size: 4, color: "888888" },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
                insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
            },
        }));
    } else {
        children.push(p("(brak ustawionego planu rat)", { italic: true }));
    }

    children.push(emptyParagraph(), emptyParagraph());
    children.push(p("Wpłaty prosimy realizować na konto kancelarii zgodnie z fakturą.", { italic: true }));
    return makeDoc("Harmonogram płatności " + (ctx.case_number || ""), children);
}

// ============================================================================
// 3. PEŁNOMOCNICTWO KLIENTA (PL)
// ============================================================================
function renderPelnomocnictwoKlient(ctx: any): Document {
    const children: Paragraph[] = [
        h1("PEŁNOMOCNICTWO"),
        emptyParagraph(),
        p(ctx.today_pl || formatDatePl(new Date()), { align: AlignmentType.RIGHT }),
        emptyParagraph(),

        new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: "Ja, niżej podpisany(-a) ", size: SIZE, font: FONT }),
                new TextRun({ text: ctx.full_client_name || "—", bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: ", urodzony(-a) ", size: SIZE, font: FONT }),
                new TextRun({ text: formatDatePl(ctx.client_birth_date), bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: ", obywatelstwa ", size: SIZE, font: FONT }),
                new TextRun({ text: ctx.client_nationality || "—", bold: true, size: SIZE, font: FONT }),
                new TextRun({
                    text: ", niniejszym udzielam pełnomocnictwa Kancelarii GetMyPermit do reprezentowania mnie w sprawie pobytowej ",
                    size: SIZE, font: FONT,
                }),
                new TextRun({ text: ctx.case_number || "—", bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: " (kategoria: ", size: SIZE, font: FONT }),
                new TextRun({ text: ctx.category_label || "—", bold: true, size: SIZE, font: FONT }),
                new TextRun({
                    text: ") przed właściwymi organami administracji publicznej Rzeczypospolitej Polskiej.",
                    size: SIZE, font: FONT,
                }),
            ],
        }),

        p("Pełnomocnictwo obejmuje w szczególności:"),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "składanie wniosków, pism, dokumentów i oświadczeń;", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "odbiór decyzji, postanowień i pism;", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "zapoznanie z aktami sprawy;", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "ustanawianie pełnomocnika substytucyjnego.", size: SIZE, font: FONT })]}),
        emptyParagraph(),

        p("Pełnomocnictwo jest ważne do czasu zakończenia sprawy lub jego pisemnego cofnięcia."),
        emptyParagraph(), emptyParagraph(),

        p("___________________________", { align: AlignmentType.RIGHT, italic: true }),
        p("(podpis czytelny mocodawcy)", { align: AlignmentType.RIGHT, italic: true, size: SIZE_SMALL }),
    ];
    return makeDoc("Pełnomocnictwo " + (ctx.full_client_name || ""), children);
}

// ============================================================================
// 4. INSTRUKCJA DLA KLIENTA
// ============================================================================
function renderInstrukcjaKlient(ctx: any): Document {
    const children: Paragraph[] = [
        h1("INSTRUKCJA DLA KLIENTA"),
        emptyParagraph(),
        pBold("Numer sprawy", ctx.case_number),
        pBold("Klient", ctx.full_client_name),
        pBold("Kategoria sprawy", ctx.category_label),
        pBold("Data", ctx.today_pl || formatDatePl(new Date())),
        emptyParagraph(),

        h2("Co należy przygotować"),
        new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({
                text: "Szanowny Kliencie, w związku z prowadzeniem Twojej sprawy prosimy o przygotowanie następujących dokumentów. " +
                      "Szczegółowa lista wymaganych dokumentów dla kategorii sprawy " +
                      (ctx.category_label || "") + " jest dostępna w systemie CRM (zakładka Checklista karty sprawy).",
                size: SIZE, font: FONT,
            })],
        }),

        p("Dokumenty podstawowe (zawsze wymagane):", { bold: true }),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "ważny paszport (oryginał + kopie wszystkich zapisanych stron);", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "4 aktualne fotografie biometryczne (3,5 × 4,5 cm);", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: `dowód uiszczenia opłaty administracyjnej (${formatMoney(ctx.admin_fee_amount)});`, size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: `dowód uiszczenia opłaty za kartę pobytu (${formatMoney(ctx.stamp_fee_amount)});`, size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "podpisane pełnomocnictwo dla kancelarii.", size: SIZE, font: FONT })]}),
        emptyParagraph(),

        h2("Kontakt"),
        p("W razie pytań prosimy o kontakt z opiekunem sprawy:"),
        pBold("Twój e-mail", ctx.client_email),
        pBold("Twój telefon", ctx.client_phone),
        emptyParagraph(),

        p("Niniejsza instrukcja ma charakter informacyjny i nie zastępuje pełnej listy wymaganych dokumentów dla danej kategorii sprawy.",
            { italic: true, size: SIZE_SMALL }),
    ];
    return makeDoc("Instrukcja dla klienta " + (ctx.full_client_name || ""), children);
}

// ============================================================================
// 5. AUDYT SPRAWY (Checklista pogrupowana po sekcjach)
// ============================================================================
const SECTION_LABELS: Record<string, string> = {
    "braki_formalne": "BRAKI FORMALNE",
    "braki_merytoryczne": "BRAKI MERYTORYCZNE",
    "dokumenty_wymagane": "WYMAGANE DOKUMENTY",
    "obliczenia_srodkow": "OBLICZENIA ŚRODKÓW",
    "elektroniczne_zlozenie_minimum": "MINIMUM DLA E-ZŁOŻENIA",
};

const STATUS_MARK: Record<string, string> = {
    "done": "[V]",
    "pending": "[ ]",
    "n_a": "[-]",
    "blocked": "[!]",
};

function renderAuditChecklist(ctx: any): Document {
    const checklists: any[] = ctx.checklists || [];

    const children: (Paragraph | Table)[] = [
        h1("AUDYT SPRAWY"),
        emptyParagraph(),
        pBold("Numer sprawy", ctx.case_number),
        pBold("Klient", ctx.full_client_name),
        pBold("Kategoria", ctx.category_label),
        pBold("Tryb sprawy", ctx.kind_label),
        pBold("Pracodawca", ctx.employer_name),
        pBold("Data audytu", ctx.today_pl || formatDatePl(new Date())),
        emptyParagraph(),

        p("Status pozycji: [V] zrobione | [ ] do zrobienia | [-] nie dotyczy | [!] zablokowane",
            { italic: true, size: SIZE_SMALL }),
        emptyParagraph(),
    ];

    if (checklists.length === 0) {
        children.push(p("(brak pozycji w checkliście)", { italic: true }));
    } else {
        // Grupowanie po section
        const grouped: Record<string, any[]> = {};
        for (const item of checklists) {
            const s = item.section || "inne";
            if (!grouped[s]) grouped[s] = [];
            grouped[s].push(item);
        }

        for (const [section, items] of Object.entries(grouped)) {
            children.push(h2(SECTION_LABELS[section] || section.toUpperCase()));

            // Topowe + dziecięce per parent_label
            const byParent: Record<string, any[]> = {};
            const topLevel: any[] = [];
            for (const it of items) {
                if (it.parent_label) {
                    if (!byParent[it.parent_label]) byParent[it.parent_label] = [];
                    byParent[it.parent_label].push(it);
                } else {
                    topLevel.push(it);
                }
            }

            for (const it of topLevel) {
                const mark = STATUS_MARK[it.status] || "[ ]";
                const opt = it.is_required === false ? "  (opcjonalne)" : "";

                // Główny paragraf z item
                children.push(new Paragraph({
                    spacing: { before: 60, after: 30 },
                    children: [
                        new TextRun({ text: mark + " ", bold: true, size: SIZE, font: FONT }),
                        new TextRun({ text: it.label, size: SIZE, font: FONT }),
                        new TextRun({ text: opt, size: SIZE_SMALL, italics: true, font: FONT }),
                    ],
                }));

                if (it.helper_text) {
                    children.push(new Paragraph({
                        indent: { left: convertInchesToTwip(0.4) },
                        children: [new TextRun({ text: it.helper_text, italics: true, size: SIZE_SMALL, font: FONT, color: "666666" })],
                    }));
                }
                if (it.notes) {
                    children.push(new Paragraph({
                        indent: { left: convertInchesToTwip(0.4) },
                        children: [
                            new TextRun({ text: "Notatka: ", bold: true, size: SIZE_SMALL, font: FONT, color: "BB7700" }),
                            new TextRun({ text: it.notes, size: SIZE_SMALL, font: FONT, color: "BB7700" }),
                        ],
                    }));
                }

                // Sub-items (parent_label === it.label)
                const subs = byParent[it.label] || [];
                for (const sub of subs) {
                    const subMark = STATUS_MARK[sub.status] || "[ ]";
                    children.push(new Paragraph({
                        indent: { left: convertInchesToTwip(0.5) },
                        spacing: { before: 30, after: 30 },
                        children: [
                            new TextRun({ text: subMark + " ", bold: true, size: SIZE, font: FONT }),
                            new TextRun({ text: sub.label, size: SIZE, font: FONT }),
                        ],
                    }));
                    if (sub.notes) {
                        children.push(new Paragraph({
                            indent: { left: convertInchesToTwip(0.9) },
                            children: [
                                new TextRun({ text: "Notatka: ", bold: true, size: SIZE_SMALL, font: FONT, color: "BB7700" }),
                                new TextRun({ text: sub.notes, size: SIZE_SMALL, font: FONT, color: "BB7700" }),
                            ],
                        }));
                    }
                }
            }
            children.push(emptyParagraph());
        }
    }

    children.push(emptyParagraph());
    children.push(p("———————————————————", { align: AlignmentType.CENTER }));
    children.push(p("Audyt sporządzony przez Kancelarię GetMyPermit.", { italic: true, align: AlignmentType.CENTER, size: SIZE_SMALL }));

    return makeDoc("Audyt sprawy " + (ctx.case_number || ""), children);
}

// ============================================================================
// PUBLIC API
// ============================================================================
const RENDERERS: Record<string, (ctx: any) => Document> = {
    "karta_przyjecia": renderKartaPrzyjecia,
    "harmonogram_platnosci": renderHarmonogramPlatnosci,
    "pelnomocnictwo_klient": renderPelnomocnictwoKlient,
    "instrukcja_klient": renderInstrukcjaKlient,
    "audit_checklist": renderAuditChecklist,
};

export function hasCustomRenderer(kind: string): boolean {
    return kind in RENDERERS;
}

export async function renderDocument(kind: string, ctx: any): Promise<Uint8Array> {
    const renderer = RENDERERS[kind];
    if (!renderer) throw new Error(`No custom renderer for kind: ${kind}`);
    const doc = renderer(ctx);
    const buffer = await Packer.toBuffer(doc);
    return new Uint8Array(buffer);
}
