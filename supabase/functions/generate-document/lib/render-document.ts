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
// 6. PEŁNOMOCNICTWO PRACODAWCY do załącznika nr 1 (Etap II-C)
// ============================================================================
function renderPelnomocnictwoPracodawca(ctx: any): Document {
    const children: Paragraph[] = [
        h1("PEŁNOMOCNICTWO"),
        emptyParagraph(),
        p(ctx.today_pl || formatDatePl(new Date()), { align: AlignmentType.RIGHT }),
        emptyParagraph(),

        new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: "Pracodawca: ", bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: ctx.employer_name || "—", bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: ", NIP ", size: SIZE, font: FONT }),
                new TextRun({ text: ctx.employer_nip || "—", bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: ", z siedzibą pod adresem ", size: SIZE, font: FONT }),
                new TextRun({ text: ctx.employer_address || "—", size: SIZE, font: FONT }),
            ],
        }),

        p("niniejszym udziela Kancelarii GetMyPermit pełnomocnictwa do:"),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "wypełnienia w imieniu Pracodawcy załącznika nr 1 do wniosku o udzielenie zezwolenia na pobyt czasowy i pracę cudzoziemca;", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "podpisania załącznika nr 1 w imieniu Pracodawcy;", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "reprezentowania Pracodawcy w zakresie powiązania ze sprawą cudzoziemca przed organami administracji publicznej.", size: SIZE, font: FONT })]}),
        emptyParagraph(),

        new Paragraph({
            children: [
                new TextRun({ text: "Sprawa cudzoziemca: ", bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: ctx.full_client_name || "—", size: SIZE, font: FONT }),
                new TextRun({ text: " (numer sprawy ", size: SIZE, font: FONT }),
                new TextRun({ text: ctx.case_number || "—", bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: ").", size: SIZE, font: FONT }),
            ],
        }),
        emptyParagraph(),

        p("Pełnomocnictwo jest ważne do czasu zakończenia sprawy lub jego pisemnego cofnięcia."),
        emptyParagraph(), emptyParagraph(),

        p("___________________________", { align: AlignmentType.RIGHT, italic: true }),
        p("(podpis czytelny — osoba uprawniona do reprezentowania Pracodawcy)",
            { align: AlignmentType.RIGHT, italic: true, size: SIZE_SMALL }),
    ];
    return makeDoc("Pełnomocnictwo pracodawcy " + (ctx.employer_name || ""), children);
}

// ============================================================================
// 7. INSTRUKCJA DLA PRACODAWCY (zał. nr 1)
// ============================================================================
function renderInstrukcjaPracodawca(ctx: any): Document {
    const children: Paragraph[] = [
        h1("INSTRUKCJA DLA PRACODAWCY"),
        emptyParagraph(),
        pBold("Numer sprawy", ctx.case_number),
        pBold("Cudzoziemiec", ctx.full_client_name),
        pBold("Pracodawca", ctx.employer_name),
        pBold("Data", ctx.today_pl || formatDatePl(new Date())),
        emptyParagraph(),

        h2("Załącznik nr 1 do wniosku o pobyt czasowy i pracę"),
        new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({
                text: "Szanowni Państwo, w związku z prowadzeniem sprawy " +
                      "o udzielenie zezwolenia na pobyt czasowy i pracę dla cudzoziemca " +
                      (ctx.full_client_name || "") + " konieczne jest dostarczenie kompletnego " +
                      "i poprawnie wypełnionego załącznika nr 1.",
                size: SIZE, font: FONT,
            })],
        }),

        h2("Wymagane dane w załączniku nr 1"),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Cz. I — dane Pracodawcy zgodne z KRS/CEIDG (NIP, REGON, siedziba);", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Cz. III.1 — stanowisko (musi być zwolnione z informacji starosty lub posiadać informację starosty);", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Cz. III.2 — miejsce wykonywania pracy (konkretny adres);", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: 'Cz. III.3 — podstawa prawna: "UMOWA O PRACĘ" lub "UMOWA ZLECENIE";', size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: 'Cz. III.4 — wymiar czasu pracy: "1/1 CAŁY ETAT" lub "40 GODZ. / TYDZIEŃ";', size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Cz. III.5 — wynagrodzenie: minimum krajowa, np. \"4666 zł / miesiąc brutto\";", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Cz. III.7 — okres OD: data podpisania załącznika; okres DO: minimum 5 lat;", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Podpis na str. 6 — czytelny imieniem i nazwiskiem, zgodny z reprezentacją w KRS/CEIDG.", size: SIZE, font: FONT })]}),
        emptyParagraph(),

        h2("Dwie ścieżki podpisania"),
        p("Wariant A (preferowany): podpisuję pełnomocnictwo dla Kancelarii — Kancelaria wypełnia i podpisuje załącznik za mnie.", { bold: true }),
        p("Wariant B: podpisuję załącznik osobiście — Kancelaria koordynuje termin z cudzoziemcem."),
        emptyParagraph(),

        p("W razie pytań prosimy o kontakt z opiekunem sprawy w Kancelarii GetMyPermit.",
            { italic: true, size: SIZE_SMALL }),
    ];
    return makeDoc("Instrukcja dla pracodawcy " + (ctx.employer_name || ""), children);
}

// ============================================================================
// 8. LISTA DOKUMENTÓW DLA KLIENTA (per kategoria, z checklist sprawy)
// ============================================================================
function renderListaDokumentowKlient(ctx: any): Document {
    const checklists: any[] = ctx.checklists || [];

    const children: (Paragraph | Table)[] = [
        h1("LISTA WYMAGANYCH DOKUMENTÓW"),
        h1("(do dostarczenia przez Klienta)", AlignmentType.CENTER),
        emptyParagraph(),
        pBold("Klient", ctx.full_client_name),
        pBold("Numer sprawy", ctx.case_number),
        pBold("Kategoria", ctx.category_label),
        pBold("Data", ctx.today_pl || formatDatePl(new Date())),
        emptyParagraph(),

        p("Szanowni Państwo, prosimy o dostarczenie poniższych dokumentów. " +
          "Każdy dokument prosimy przynieść w oryginale (lub uwierzytelnionej kopii) " +
          "oraz wykonać 1 kopię dla Kancelarii.", { italic: true }),
        emptyParagraph(),
    ];

    // Pokaż TYLKO sekcję 'dokumenty_wymagane' lub fallback braki_merytoryczne (dla pc_praca itp.)
    const relevantSections = ["dokumenty_wymagane", "braki_merytoryczne"];
    const visible = checklists.filter(c => relevantSections.includes(c.section) && !c.parent_label);

    if (visible.length === 0) {
        children.push(p("(brak skonfigurowanej listy dla tej kategorii — skontaktuj się z opiekunem)", { italic: true }));
    } else {
        for (const item of visible) {
            children.push(new Paragraph({
                spacing: { before: 60, after: 30 },
                children: [
                    new TextRun({ text: "□ ", bold: true, size: SIZE, font: FONT }),
                    new TextRun({ text: item.label, size: SIZE, font: FONT }),
                ],
            }));
            if (item.helper_text) {
                children.push(new Paragraph({
                    indent: { left: convertInchesToTwip(0.4) },
                    children: [new TextRun({ text: item.helper_text, italics: true, size: SIZE_SMALL, font: FONT, color: "666666" })],
                }));
            }
        }
    }

    children.push(emptyParagraph(), emptyParagraph());
    children.push(p("Prosimy o dostarczenie kompletu dokumentów w jednym egzemplarzu. " +
        "W razie wątpliwości prosimy o kontakt z opiekunem sprawy.", { italic: true, size: SIZE_SMALL }));

    return makeDoc("Lista dokumentów (klient) " + (ctx.case_number || ""), children);
}

// ============================================================================
// 9. LISTA DOKUMENTÓW DLA PRACODAWCY
// ============================================================================
function renderListaDokumentowPracodawca(ctx: any): Document {
    const children: (Paragraph | Table)[] = [
        h1("LISTA DOKUMENTÓW PRACODAWCY"),
        emptyParagraph(),
        pBold("Pracodawca", ctx.employer_name),
        pBold("NIP", ctx.employer_nip),
        pBold("Sprawa cudzoziemca", ctx.full_client_name + " (" + (ctx.case_number || "—") + ")"),
        pBold("Data", ctx.today_pl || formatDatePl(new Date())),
        emptyParagraph(),

        p("Szanowni Państwo, w związku z prowadzeniem sprawy o pobyt czasowy i pracę " +
          "dla cudzoziemca prosimy o dostarczenie:", { italic: true }),
        emptyParagraph(),

        h2("Dokumenty rejestrowe Pracodawcy"),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "aktualny odpis z KRS / wpis CEIDG (max 3 mies.);", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "potwierdzenie nadania NIP / REGON;", size: SIZE, font: FONT })]}),
        emptyParagraph(),

        h2("Dokumenty dotyczące zatrudnienia"),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Załącznik nr 1 do wniosku — wypełniony i podpisany (patrz: Instrukcja dla Pracodawcy);", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "informacja starosty o braku możliwości zaspokojenia potrzeb kadrowych (jeśli dotyczy);", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "umowa o pracę / zlecenie — szkic do akceptacji cudzoziemca;", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "zaświadczenie o niezaleganiu w opłatach ZUS (max 1 mies.);", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "zaświadczenie o niezaleganiu w podatkach z US (max 3 mies.).", size: SIZE, font: FONT })]}),
        emptyParagraph(),

        h2("Pełnomocnictwo (Wariant A)"),
        p("Jeśli wybierają Państwo Wariant A — Kancelaria podpisuje załącznik nr 1 — " +
          "prosimy o dostarczenie pełnomocnictwa (osobny dokument)."),
        emptyParagraph(),

        p("W razie pytań prosimy o kontakt z opiekunem sprawy.",
            { italic: true, size: SIZE_SMALL }),
    ];
    return makeDoc("Lista dokumentów (pracodawca) " + (ctx.employer_name || ""), children);
}

// ============================================================================
// 10. ZGODA NA PRZEKAZYWANIE STATUSU SPRAWY PRACODAWCY (RODO)
// ============================================================================
function renderZgodaPrzekazywaniaStatusu(ctx: any): Document {
    const children: Paragraph[] = [
        h1("ZGODA NA PRZEKAZYWANIE INFORMACJI"),
        h1("O STATUSIE SPRAWY PRACODAWCY", AlignmentType.CENTER),
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
                new TextRun({ text: ", niniejszym wyrażam zgodę, aby Kancelaria GetMyPermit przekazywała mojemu pracodawcy ", size: SIZE, font: FONT }),
                new TextRun({ text: ctx.employer_name || "—", bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: " (NIP ", size: SIZE, font: FONT }),
                new TextRun({ text: ctx.employer_nip || "—", bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: ") informacje o statusie mojej sprawy pobytowej numer ", size: SIZE, font: FONT }),
                new TextRun({ text: ctx.case_number || "—", bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: ", w szczególności:", size: SIZE, font: FONT }),
            ],
        }),

        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "datę przyjęcia sprawy do prowadzenia;", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "datę i sposób złożenia wniosku;", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "informacje o brakach formalnych i sposobach ich uzupełnienia;", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "datę osobistego stawiennictwa w urzędzie;", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "datę i wynik decyzji urzędu.", size: SIZE, font: FONT })]}),
        emptyParagraph(),

        p("Zgoda jest dobrowolna i może być w każdej chwili pisemnie cofnięta. " +
          "Cofnięcie zgody nie wpływa na zgodność z prawem przetwarzania, którego dokonano przed jej cofnięciem.",
          { italic: true, size: SIZE_SMALL }),

        p("Administratorem danych osobowych jest Kancelaria GetMyPermit. " +
          "Szczegółowe informacje o przetwarzaniu danych dostępne w Polityce Prywatności na stronie kancelarii.",
          { italic: true, size: SIZE_SMALL }),
        emptyParagraph(), emptyParagraph(),

        p("___________________________", { align: AlignmentType.RIGHT, italic: true }),
        p("(podpis czytelny cudzoziemca)", { align: AlignmentType.RIGHT, italic: true, size: SIZE_SMALL }),
    ];
    return makeDoc("Zgoda RODO przekazywanie statusu " + (ctx.full_client_name || ""), children);
}

// ============================================================================
// 11. RAPORT PO ZŁOŻENIU — dla klienta (Etap III pkt 10.H)
// ============================================================================
function renderRaportKlient(ctx: any): Document {
    const submitted = ctx.case?.date_submitted || ctx.today;
    const upoNumber = ctx.upo_number || ctx.case?.znak_sprawy || "—";

    const children: Paragraph[] = [
        h1("RAPORT — WNIOSEK ZŁOŻONY"),
        emptyParagraph(),
        p(ctx.today_pl || formatDatePl(new Date()), { align: AlignmentType.RIGHT, italic: true, size: SIZE_SMALL }),
        emptyParagraph(),

        new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: "Szanowny(-a) ", size: SIZE, font: FONT }),
                new TextRun({ text: ctx.full_client_name || "Kliencie", bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: ",", size: SIZE, font: FONT }),
            ],
        }),

        p("Z przyjemnością informujemy, że Pana/Pani wniosek został złożony elektronicznie."),
        emptyParagraph(),

        h2("Szczegóły złożenia"),
        pBold("Numer sprawy", ctx.case_number),
        pBold("Kategoria", ctx.category_label),
        pBold("Data złożenia", formatDatePl(submitted)),
        pBold("Metoda", "Elektronicznie (przez Profil Zaufany)"),
        pBold("Numer UPO", upoNumber),
        emptyParagraph(),

        h2("Co dalej"),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Urząd potwierdzi przyjęcie wniosku — UPO już zostało wygenerowane i znajduje się w dokumentach sprawy.", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Następnym krokiem może być wezwanie na osobiste stawiennictwo (pobranie odcisków palców) lub wezwanie do uzupełnienia dokumentów.", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "O każdym dalszym kroku informujemy bezzwłocznie.", size: SIZE, font: FONT })]}),
        emptyParagraph(),

        h2("Status legalności pobytu"),
        p("Wniosek złożony w terminie zapewnia legalność pobytu do czasu wydania decyzji (art. 108 § 1 kodeksu postępowania administracyjnego)."),
        emptyParagraph(), emptyParagraph(),

        p("Z poważaniem,", { italic: true }),
        p("Kancelaria GetMyPermit", { italic: true, bold: true }),
    ];
    return makeDoc("Raport — wniosek złożony " + (ctx.case_number || ""), children);
}

// ============================================================================
// 12. RAPORT PO ZŁOŻENIU — dla pracodawcy (RODO: tylko za zgodą klienta)
// ============================================================================
function renderRaportPracodawca(ctx: any): Document {
    const submitted = ctx.case?.date_submitted || ctx.today;
    const upoNumber = ctx.upo_number || ctx.case?.znak_sprawy || "—";

    const children: Paragraph[] = [
        h1("RAPORT STATUSU SPRAWY"),
        emptyParagraph(),
        p(ctx.today_pl || formatDatePl(new Date()), { align: AlignmentType.RIGHT, italic: true, size: SIZE_SMALL }),
        emptyParagraph(),

        new Paragraph({
            spacing: { after: 200 },
            children: [
                new TextRun({ text: "Dla: ", bold: true, size: SIZE, font: FONT }),
                new TextRun({ text: ctx.employer_name || "—", size: SIZE, font: FONT }),
                new TextRun({ text: " (NIP " + (ctx.employer_nip || "—") + ")", size: SIZE_SMALL, italics: true, font: FONT }),
            ],
        }),

        p("Niniejszy raport jest przekazywany na podstawie podpisanej zgody cudzoziemca na przekazywanie informacji o statusie sprawy pobytowej."),
        emptyParagraph(),

        h2("Sprawa cudzoziemca"),
        pBold("Imię i nazwisko", ctx.full_client_name),
        pBold("Numer sprawy", ctx.case_number),
        pBold("Kategoria", ctx.category_label),
        emptyParagraph(),

        h2("Status złożenia"),
        pBold("Data złożenia wniosku", formatDatePl(submitted)),
        pBold("Metoda", "Elektronicznie"),
        pBold("UPO wygenerowane", "Tak (numer: " + upoNumber + ")"),
        pBold("Status", "Wniosek złożony — oczekuje na dalsze czynności urzędu"),
        emptyParagraph(),

        h2("Status legalności pobytu i pracy"),
        p("Wniosek złożony w terminie. Pobyt cudzoziemca jest legalny do czasu wydania decyzji (art. 108 § 1 k.p.a.)."),
        p("Pracownik może legalnie wykonywać pracę na warunkach z załącznika nr 1.", { bold: true }),
        emptyParagraph(),

        h2("Następne kroki"),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Możliwe wezwanie na osobiste stawiennictwo (pobranie odcisków palców).", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "Możliwe wezwanie do uzupełnienia dokumentów.", size: SIZE, font: FONT })]}),
        new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: "O każdym istotnym wydarzeniu informujemy niezwłocznie.", size: SIZE, font: FONT })]}),
        emptyParagraph(), emptyParagraph(),

        p("Z poważaniem,", { italic: true }),
        p("Kancelaria GetMyPermit", { italic: true, bold: true }),
        emptyParagraph(),

        p("Niniejszy raport został przygotowany na podstawie pisemnej zgody cudzoziemca z dnia podpisania zgody RODO na przekazywanie informacji o statusie sprawy pracodawcy.",
            { italic: true, size: SIZE_SMALL }),
    ];
    return makeDoc("Raport pracodawcy " + (ctx.case_number || ""), children);
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
    // Etap II-C — pc_praca specific
    "pelnomocnictwo_pracodawca": renderPelnomocnictwoPracodawca,
    "instrukcja_pracodawca": renderInstrukcjaPracodawca,
    "lista_dokumentow_klient": renderListaDokumentowKlient,
    "lista_dokumentow_pracodawca": renderListaDokumentowPracodawca,
    "zgoda_przekazywania_statusu": renderZgodaPrzekazywaniaStatusu,
    // Etap III — raporty po złożeniu
    "raport_po_zlozeniu_klient": renderRaportKlient,
    "raport_po_zlozeniu_pracodawca": renderRaportPracodawca,
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
