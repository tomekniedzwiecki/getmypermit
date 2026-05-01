# Redesign GetMyPermit CRM v3 — paczka dla Claude Design

Paczka bazuje na dojrzałym design systemie z siostrzanego produktu **Getmypermit MOC v2** (panel pracodawcy compliance), zaadaptowanym pod CRM kancelarii: **akcent zmieniony z indigo na teal**, nawigacja przemapowana z perspektywy HR pracodawcy na perspektywę zespołu kancelarii, dorzucone komponenty CRM-specific (kanban, case-detail 2-col, sekcje A-H elektronicznego złożenia, bulk action bar).

## Co tu jest

| Plik | Co to jest | Kiedy używasz |
|---|---|---|
| [design-system.css](design-system.css) | Kompletny CSS (~1700 linii): tokens, ~30 sekcji komponentów. Editorial type stack, slate-blue + ivory paleta, teal akcent, inset highlight trick, RiskDial, DistBar, Alert day-badge, kanban, collapsible (sekcje A-H), case-detail 2-col, drawer + modal, timeline, calendar, stepper, banner z italic serif. | Załączasz raz do pierwszego messagea w nowej sesji Claude Design |
| [MASTER-PROMPT.md](MASTER-PROMPT.md) | Brief: filozofia „Calm CRM", editorial type stack, lista klas, mapa 19 ekranów (Tier S→A→B→C→D→E), polskie sample data (Mariia Petrenko, Polmlek, GMP-2026-00001, prawnicy), workflow współpracy. | Wklejasz jako pierwszy message w nowej sesji Claude Design |
| [README.md](README.md) | Ten plik | Twoja instrukcja |
| [Getmypermit - MOC (1)/](Getmypermit%20-%20MOC%20(1)/) | **Referencja źródłowa** — pełen projekt MOC v2 (HTML + JSX + CSS + screenshoty + brief klienta). Nie ruszać, używać do porównań i pomysłów. | Tylko reading |

## Co skopiowane 1:1 z MOC v2

- Cały design system CSS (tokens, komponenty) — fundament
- Filozofia editorial: 4 fonty (Inter Tight + Inter + Instrument Serif italic + JetBrains Mono), inset highlight trick na kartach, slate-blue + ivory tilt, hierarchy through whitespace not borders
- Komponenty: HeroStat (84px display number z radial-glow), Card, Pill, Kpi, RiskDial (SVG circular 156px), DistBar (segmented z legendą), StatusBarograph (2 paski stacked), AlertDayBadge (kalendarzowy badge X dni), Banner (4 kinds z `<em>` italic flourish), Timeline (gradient line + markery), Stepper, Calendar, FilterBar, FormFields
- Optical sizing, tabular nums, font-feature-settings stylistic alternates

## Co zaadaptowane pod CRM kancelarii

- **Akcent: teal `#0d9488`** zamiast indigo `#4f46e5` (MOC). Hover `#0f766e`, soft `#f0fdfa`, soft-2 `#ccfbf1`, text `#115e59`. Compliance/legal vibe, odróżnia produkty.
- **Brand mark gradient** automatycznie używa nowego accent → teal → teal-700.
- **Selection color** zmieniony na teal soft-2.
- **Radial gradient body** na teal (zamiast indigo).
- **Nav grupy** przemapowane: Praca / Kalendarz / Kartoteki / System (zamiast Przegląd / Cudzoziemcy / Łańcuch dostawców / Kancelaria / System z MOC).
- **Persona w userCard**: prawnik z kancelarii (Anna Kowalska, Prawnik · GMP) zamiast HR Manager.
- **Mock data**: numery spraw GMP-2026-XXXXX, etapy spraw kancelarii, klienci-cudzoziemcy zamiast pracowników firmy.
- **PlanCard usunięty** ze sidebar footer (CRM to internal tool, nie SaaS tier).
- **TweaksPanel runtime usunięty** (robimy docelową wersję bez accent switchera).

## Co dorzucone (nie ma w MOC v2)

- `.kanban` + `.kanban-column` + `.kanban-card` — drag-drop board dla 7 etapów spraw (overflow-x scroll)
- `.case-detail` (grid 1fr/360px) + `.case-rail` (sticky right) — 2-kolumnowy layout karty sprawy
- `.collapsible.open|.done|.active` z `.marker` (literka A-H), `.ttl`, `.meta`, `.chev` — dla 8 sekcji elektronicznego złożenia
- `.modal` + `.modal-overlay` + `.modal-header h3 + .modal-body + .modal-footer` (w MOC był tylko drawer)
- `.bulk-bar` — sticky bottom bar pojawiający się gdy ≥1 wiersz zaznaczony w tabeli (dark fg, white text, rounded)
- `.menu` + `.menu-item.danger` + `.shortcut` — dropdown menu (kontekstowe akcje w tabelach)
- `.tooltip`
- `.toast-stack > .toast.ok|.warn|.danger`
- `.sk-line | .sk-text | .sk-title | .sk-block | .sk-circle` — skeleton loading states
- `.seg > button.active` — segmented control (np. dla viewu list/grid, density toggle)
- `.case-detail` responsywny breakpoint na 1280px (rail spada pod treść)

## Workflow w Claude Design (jedna długa sesja)

1. **Otwórz Claude Design** (claude.ai → Projects → Design) i utwórz nowy projekt: „GetMyPermit CRM v3".
2. **Pierwszy message w sesji:**
   - Wklej całą zawartość [MASTER-PROMPT.md](MASTER-PROMPT.md)
   - Załącz [design-system.css](design-system.css) jako plik (drag & drop do messagea)
   - Wyślij
3. **Pierwsza odpowiedź Claude'a** — potwierdza że zrozumiał, w 5-6 zdaniach. **Nie buduje jeszcze artifactu** (poinstruowałem go).
4. **Drugi message:** „OK, zaczynamy. Zbuduj Shell + Dashboard."
   - Claude wygeneruje pierwszy artifact — jeden plik HTML z osadzonym CSS, React + Babel standalone (jak panel-v2.html z MOC, którego widziałeś)
   - Otworzy się w panelu po prawej, z live preview
5. **Iteracja po pierwszym ekranie:**
   - Klikasz po ekranie, widzisz hover states, modale, kanban, drawer
   - Jeśli coś nie pasuje: „Hero stat ma być węższy", „Timeline ma być na 3 elementy nie 6", „Sidebar item Praca ma badge 247"
   - Claude regeneruje artifact, preview się odświeża
6. **Akceptacja → następny ekran:**
   - „OK, ten jest dobry. Teraz zrób Cases list."
   - Claude pamięta cały kontekst — używa tych samych klas, tej samej palety, tych samych imion klientów (Mariia Petrenko, Oleksandr Kovalenko, …)
7. **Powtarzasz** dla wszystkich 19 ekranów (Tier S → A → B → C → D → E)
8. **Eksport:** gdy wszystko zaakceptowane, klikasz Export w Claude Design → dostajesz zip z plikami

## Po eksporcie — wracasz do mnie (deweloper Claude w Cursor)

Powiesz: „mam export z Claude Design". Wtedy:
1. Wyciągam tokens i komponenty z exportu do `getmypermit/crm/components/layout-v2.css` (zastępuje obecne 48 KB).
2. Per stronę przepisuję markup w obecnych plikach `dashboard.html`, `cases.html`, `case.html`, ... z nowymi klasami `.btn-primary`, `.card`, `.kpi-row`, `.kanban` itd.
3. Feature flag (`?v2=1` w URL) — możesz porównać stary i nowy widok side-by-side per ekran.
4. Po Twoim OK na każdy ekran — push do brancha → Vercel deploy → przepięcie aliasu dla `crm.getmypermit.pl` (i drugiej domeny).
5. e2e audit (`scripts/e2e_full_audit.mjs`) po każdym ekranie — wymóg z Twoich preferencji.

## Zakres MVP

Domyślnie celujemy w **Tier S + Tier A** (6 ekranów: Shell, Dashboard, Cases list, Case detail, Kanban, Tasks). To 70% wartości, 30% pracy. Reszta (28 ekranów Tier B-E) zrobi się szybciej, bo dziedziczy wzór.

Jeśli zrobisz wszystkie 19 ekranów w Claude Design w jednej sesji — super, eksportujemy całość. Jeśli zatrzymasz się po 6 — też dobrze, wdrażamy MVP, dorabiamy resztę później osobnymi sesjami.

## Kluczowe decyzje już zapisane w briefie

- **Akcent CRM:** **teal `#0d9488`** (compliance/legal vibe; MOC zostaje na indigo)
- **Surface palette:** `#f5f6f8` bg (cool gray), `#ffffff` cards, `#fafafb` sidebar, `#fbfbfd` nested wells
- **Body radial-gradient glow** w teal (subtle ambiance)
- **Density:** comfortable (56px row), z opcją compact (46px) przez `body.density-compact`
- **Theme:** light-only (brak dark mode w v3)
- **Fonts:** Inter Tight (display, opsz 32-84) + Inter (body) + Instrument Serif italic (mikro-akcenty) + JetBrains Mono (numerics, tnum)
- **Icons:** Phosphor v2.1.1 (regular + bold + fill)
- **Brak:** gradientów na buttonach, glassmorphism, heavy shadows, neon accentów, plan-tier system (CRM to internal tool)

## Jak zmienić coś w designie globalnie (w trakcie sesji)

Jeśli po pierwszym ekranie zechcesz:
- **Zmienić akcent** (np. z teal na deep blue): „Zmień `--accent` na `#1e40af`, hover `#1e3a8a`, soft `#eff6ff`, soft-2 `#dbeafe`, text `#1e3a8a`. Wszystkie ekrany się zaktualizują."
- **Zmienić density domyślną**: „Wiersz tabeli z 56px na 48px, padding td z 14px na 12px."
- **Dodać nowy komponent** („potrzebujemy mini-kalendarza w sidebar"): „Dodaj komponent `.mini-cal` do design system. 7-kolumnowy grid 6×7, dni jako kropki, dzisiaj zaakcentowany teal."

Zasada: **wszystkie zmiany robisz przez modyfikację design system, nie inline.** Jak zatwierdzisz finalny design, mam JEDEN plik CSS do wymiany w produkcji.

## Co jeśli Claude Design nie umie czegoś?

- **Wykresy w Analytics** — Claude Design narysuje SVG mock; w produkcji podmienię na Chart.js lub Recharts (mniej ważne na etapie designu)
- **Drag & drop w Kanban** — w prototypie wystarczy `cursor: grab/grabbing` + hover state; w produkcji dorobię logikę
- **Cmd+K command palette** — może być statyczny modal w prototypie; w produkcji dorobię fuzzy search
- **Logo getmypermit** — używaj `<div class="brand-mark">G</div>` (gradient teal). Prawdziwe logo (które masz w Supabase Storage) podmienię na końcu
