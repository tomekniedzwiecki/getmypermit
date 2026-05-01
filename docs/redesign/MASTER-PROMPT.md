# GetMyPermit CRM v3 — Brief dla Claude Design

> **Instrukcja dla użytkownika (Tomek):** Wklej zawartość tego pliku jako PIERWSZY message w nowej sesji w Claude Design. Razem z plikiem `design-system.css` jako załącznikiem. Po pierwszej odpowiedzi (potwierdzenie) zamawiasz kolejne ekrany pojedynczymi promptami.

---

## 1. Kontekst projektu

Projektujesz panel CRM dla **GetMyPermit** — kancelarii prawnej w Polsce, która prowadzi sprawy legalizacji pobytu cudzoziemców (zezwolenia na pobyt czasowy/stały, zezwolenia na pracę, karty pobytu, odwołania). System ma na żywo **4400+ aktywnych spraw** i obsługuje zespół **10–15 prawników, asystentów, managerów**.

**Cel:** redesign na poziomie **Stripe Dashboard / Linear / Vercel / Notion** — światowy poziom UX/UI. Senior designer ze Stripe ma powiedzieć „nic bym tu nie poprawił". Ma być lekko, czytelnie, nowocześnie. Nowy design to także **rebranding wizualny** — odejście od dark-default w stronę jasnego, świeżego, editorial vibe.

**To nie ma wyglądać jak generyczny SaaS template ani jak corporate enterprise software.** Ma wyglądać jak dojrzały produkt zbudowany przez zespół który dba o detale.

**Powiązany produkt:** Getmypermit MOC (panel pracodawcy compliance) używa siostrzanego design systemu z akcentem **indigo**. CRM kancelarii (ten projekt) używa akcentu **teal** żeby odróżnić oba produkty wizualnie.

---

## 2. Filozofia designu — "Calm CRM"

**Cztery zasady, których nie łamiesz:**

1. **Hierarchia przez whitespace, nie przez borders.** Borders są w `rgba(11,16,32,0.04–0.10)` — prawie niewidoczne hairlines. Karty definiowane przez `inset 0 0 0 1px rgba(255,255,255,0.6)` (light-mode highlight trick) + soft layered shadow, nie przez hard border.
2. **Jeden akcent — TEAL `#0d9488` — używany dla AKCJI, nie dla dekoracji.** Wszystko inne to skala szarości slate-blue. Risk żyje na osobnej semantycznej palecie (ok/warn/danger/info), NIGDY na brand color.
3. **Editorial typography.** 4 fonty pełniące różne role — display dla nagłówków i liczb, body dla treści, serif italic dla mikro-akcentów, mono dla numerów/IDków/kwot.
4. **Optical sizing, tabular nums, pretty wraps.** `font-variation-settings: 'opsz' XX`, `font-feature-settings: 'tnum' 1`, `text-wrap: balance/pretty`. Te detale podnoszą poziom z „dobrego" do „senior-grade".

**Decyzje strukturalne:**
- **Light-first.** Slate-blue + ivory tilt — `--bg: #f5f6f8` (cool gray), `--surface: #ffffff`, `--sidebar: #fafafb`. Body ma subtelny `radial-gradient` glow z accent color. Brak dark mode w v3 (jedyna wersja).
- **Density medium-comfortable** (56px wiersz tabeli) z opcją `body.density-compact` (46px). Prawnicy mogą sobie zwęzić.
- **Sidebar 264px** light, sticky, label-led nav (ikona + label + opcjonalny mono badge).
- **Topbar 60px sticky** z `backdrop-filter: blur(14px) saturate(160%)` — lekko mleczna warstwa nad treścią.
- **Page max-width 1480px** wycentrowany, padding 36/40/80px.
- **Phosphor Icons** (CDN: `@phosphor-icons/web@2.1.1`) — `regular` dla menu, `bold` dla actions, `fill` dla ikon w stanach OK/warn/danger.

---

## 3. Editorial type stack

```
--font-display: 'Inter Tight', 'Inter', system-ui, sans-serif;
   → Nagłówki .h-page (32px), .h-section (16px), KPI values (28-84px).
   → Optical sizing 'opsz' 32-84.
   → Letter-spacing -0.022em do -0.04em.

--font-sans: 'Inter', system-ui, sans-serif;
   → Body, buttons, table content, form inputs.
   → 13-14px regular/medium.

--font-serif: 'Instrument Serif', Georgia, serif;
   → MIKRO-akcenty italic — w eyebrow, banner.b-msg, narrative paragraphs,
     subtitle pod KPI hero. Używane SPARINGLY — nie dla nagłówków,
     a dla pojedynczych słów/fraz w prozie.

--font-mono: 'JetBrains Mono', ui-monospace, monospace;
   → Numery spraw GMP-2026-XXXXX, PESEL, NIP, kwoty PLN, daty,
     liczby w tabelach, badges count, timestampy w timeline.
   → Tabular nums, font-feature-settings 'tnum' 1.
```

**Sygnatura senior-grade:** `<em class="font-serif">italic flourish</em>` w środku zwykłego paragrafu — np. „Wynik compliance bazuje na *kompletności dokumentów*, świeżości weryfikacji i braku zaległości." Tylko 1-2 słowa per paragraf, nigdy całe zdanie.

---

## 4. Design tokens — używaj WYŁĄCZNIE klas z `design-system.css`

Załączony plik `design-system.css` zawiera kompletny system: tokens (CSS variables), reset, typography, layout shell, sidebar, topbar, buttons, cards, hero-stat, KPI, pills, status-bg, tables, drawer, modal, tabs, kanban, collapsible (sekcje A-H), risk-dial, dist-bar, alerts (z day-badge), banners, stepper, forms, calendar, timeline, menu, tooltip, toast, skeleton, segmented, scrollbar, utilities.

**NIE wymyślaj własnych kolorów, spacingów, fontów ani radii.** Jeśli czegoś brakuje (np. nowy typ wykresu, custom widget) — powiedz mi to przed budowaniem ekranu, dorzucimy do systemu spójnie. **Wspólnie utrzymujemy design system, nie odchodzimy w prawo per ekran.**

**Najważniejsze klasy do zapamiętania:**
- Layout: `.app`, `.sidebar`, `.topbar`, `.main`, `.page`, `.page-header`
- Kolory akcji: `var(--accent)` teal, `var(--accent-soft)`, `var(--accent-text)`
- Kolory ryzyka: `var(--ok|warn|danger|info)` (+`-bg`, `-text`, `-border`, `-soft`)
- Buttony: `.btn .btn-primary | .btn-secondary | .btn-ghost | .btn-danger`, modyfikatory `.btn-sm | .btn-lg | .btn-icon`
- Karty: `.card`, `.card.elevated`, `.card-header h3` + `.sub`, `.card-body`, `.card-body.flush`
- Hero: `.hero-stat` z `.left .number / .narrative` i `.right .hero-stat-grid .cell`
- KPI: `.kpi-row > .kpi`, `.kpi-icon.ok|warn|danger|info`, `.kpi-value.ok|...`, `.kpi-foot`
- Pills/statusy: `.pill .ok|.warn|.danger|.info|.gray|.accent`, `.dot`, `.mono`
- Status barograph: `.status-bg > .row > .lbl + .bar.green|.yellow|.red|.gray + .val`
- Tabele: `.table thead th`, `.table tbody tr`, `.name-cell .avatar .flag .nm .sm`, `.cell-stack .primary .secondary`, `.id-cell`, `.num`
- Bulk: `.bulk-bar .count .actions`
- Drawer: `.drawer-overlay`, `.drawer (.narrow | .wide) > .drawer-header + .tabs.in-drawer + .drawer-body`
- Modal: `.modal-overlay`, `.modal (.lg | .xl) > .modal-header h3 + .modal-body + .modal-footer`
- Tabs: `.tabs > .tab.active` + `.count`
- Drawer summary (right rail): `.drawer-summary > .row .lbl + .v`
- **Case detail** (specyficzne CRM): `.case-detail` (grid 1fr/360px) + `.case-rail` (sticky right)
- **Collapsible** (sekcje A-H): `.collapsible.open|.done|.active > .collapsible-head + .collapsible-body`, w head: `.marker + .ttl + .meta + .chev`
- **Kanban**: `.kanban > .kanban-column > .kanban-column-head + .kanban-list > .kanban-card > .meta + .ttl + .sub + .foot`
- Alerty: `.alert-row > .alert-day-badge.overdue|.warn (.num + .lbl) + .a-title + .a-meta`
- Risk dial: `.risk-dial > svg + .center > .num + .lbl`
- Dist bar: `.dist-bar > .seg.green|.yellow|.red|.gray|.accent` + `.dist-legend > .dl-item > .sw + strong`
- Banner: `.banner.warn|.danger|.info|.ok|.accent` + `.b-body > .b-title + .b-msg` (z `<em>` italic)
- Stepper: `.stepper > .step.active|.done > .num + .lbl` + `.step-divider`
- Forms: `.field > label + input/select/textarea + .help/.err`
- Filtry: `.filter-bar > .chip.active` + `.search-input > input + .ph`
- Definition list: `.dl > dt + dd (.mono)`
- Timeline: `.timeline > .tl-item > .tl-marker.ok|.warn|.danger|.info + .tl-time + .tl-title + .tl-sub`
- Calendar: `.cal > .cal-head + .cal-day.today|.muted > .dnum + .dots > .dot.danger|.warn|.info`
- Menu: `.menu > .menu-item.danger + .shortcut`, `.menu-divider`
- Empty: `.empty > .ph + .em + .body`
- Toast: `.toast-stack > .toast.ok|.warn|.danger > .ph + .t-title + .t-body`
- Skeleton: `.sk-line | .sk-text | .sk-title | .sk-block | .sk-circle`
- Segmented: `.seg > button.active`

---

## 5. Mapa ekranów (priorytet — robimy w tej kolejności)

### Tier S — Shell (master layout, dziedziczy każdy ekran)
0. **Sidebar + Topbar + Page header** — fundament. Routing przez React state. Cztery grupy nav:
   - **Praca:** Dashboard, Leady, Sprawy, Kanban, Zadania, Alerty
   - **Kalendarz:** Spotkania, Kolejka wniosków
   - **Kartoteki:** Klienci, Pracodawcy, Grupy, Prawnicy, Szablony, Pomoc
   - **System:** Ustawienia (na dole)
   - Brand: gradient teal mark „G" + „Getmypermit / Panel kancelarii"
   - User card w stopce: „Anna Kowalska / Prawnik · GMP" + caret menu

### Tier A — Daily workflow (must-have MVP)
1. **Dashboard** — pulpit. Hero stat z liczbą aktywnych spraw + narrative w prozie z `<em>` flourish. KPI row 4-cell (sprawy aktywne / na czas / wymagają uwagi / przeterminowane). Rozkład etapów (`dist-bar` 7-segmentowy: weryfikacja/złożenie/osobiste/po osobistym/oczek/zakończenie/odwołanie). RiskDial (% spraw bez przekroczenia deadline = compliance kancelarii). Alerty wymagające reakcji (alert-row z day-badge). Ostatnia aktywność (timeline, ostatnie zmiany w sprawach).
2. **Cases list** — master lista spraw. `filter-bar` z chipami (Wszystkie / Aktywne / Do złożenia / Po osobistym / Oczek. decyzji / Odwołania / Zakończone / Zarchiwizowane) + global search. `table` z kolumnami: nr (id-cell mono), klient (name-cell z avatar+flag+sm: PESEL+narodowość), pracodawca, etap (pill.accent + day count), prawnik (avatar), płatność (status-bg dwurzędowy: wniosek+honorarium), ostatnia zmiana (cell-stack). Bulk select → `bulk-bar` sticky bottom z liczbą + akcjami.
3. **Case detail** — najtrudniejszy ekran. Layout `.case-detail` (1fr / 360px). Lewa kolumna `tabs` (Przegląd / Dokumenty / Elektroniczne złożenie / Płatności / Notatki / Historia). Prawa kolumna `case-rail` z `drawer-summary` „O sprawie" (klient / pracodawca / zespół / kluczowe daty / stan / akcje). Sekcja **Elektroniczne złożenie** — 8 `collapsible` sekcji A-H (A. Min. dokumenty / B. Profil zaufany / C. Ankieta / D. Opłaty / E. Spotkanie / F. Załącznik nr 1 / G. Złożenie + UPO / H. Raporty). Każda z `.marker` (literka A-H) + status (`.done` zielony marker, `.active` teal).
4. **Kanban** — drag-drop board. 7 kolumn (etapów). `.kanban-card` z meta (nr sprawy mono + dni w etapie), ttl (nazwisko klienta), sub (typ sprawy + flag), foot (avatar prawnika + pill status płatności).
5. **Tasks** — TODO list zespołu. Grupowanie po dniu (Dziś / Jutro / Ten tydzień / Przeterminowane). Inline edit deadline + assignee. Checkbox per zadanie. Sticky filter (pokaż tylko moje / cały zespół).

### Tier B — Kartoteki
6. **Clients list + detail** — kartoteka cudzoziemców (4400+). `table` z columns: nazwisko, PESEL (mono), data ur., narodowość (flag), telefon, email, liczba spraw, ostatnia aktywność. Detail (drawer `.wide`): tabs (Profil / Dokumenty osobiste / Sprawy / Płatności / Notatki). Top: hero z avatar 64px + `.h-page` + meta-line ze statusem dokumentu pobytowego (`status-bg`).
7. **Employers list + detail** — firmy. Lista: nazwa, NIP (mono), branża, liczba pracowników, ostatnia faktura (cell-stack: data + kwota mono). Detail: hero z liczbą zatrudnionych cudzoziemców + RiskDial (% z aktualnym pobytem). Tabs (Profil / Pracownicy / Sprawy / Faktury / Legalność).
8. **Staff** — zespół. Karty pracowników z avatar 56px + KPI per osoba (sprawy w toku, na czas, śr. czas zamknięcia). Sortowanie po performance.
9. **Groups** — grupy spraw (rodziny, projekty). Drzewko + lista członków grupy.

### Tier C — Finanse
10. **Payments** — rejest płatności. Filtry chipów (Do opłaty / Klient przekazał / Kancelaria opłaciła / Opłacono / Sporne). `.table` z kolumnami: data, sprawa (id mono → klient), typ (pill: wniosek/karta/honorarium), kwota (num mono), status. Sumy w stopce.
11. **Receivables** — windykacja. Aging buckets jako 4 KPI cards (do 30 dni / 30-60 / 60-90 / >90). `dist-bar` ogólny. Tabela przeterminowanych z dniami opóźnienia (day-badge `.overdue`).
12. **Invoices** — faktury (na pracodawcę / na klienta). Tabela z numerem mono, kontrahentem, kwotą netto/brutto/VAT, statusem opłaty. Quick actions (Wystaw / Wyślij / Pobierz PDF).
13. **Analytics** — BI dashboard. 3-4 wykresy SVG (mock — w produkcji Chart.js): success rate (%), średni czas sprawy, przychód MoM (line chart), rozkład typów spraw (donut). KPI cards z deltami YoY.

### Tier D — Admin
14. **Admin** — panel właściciela (Paweł). Pulse (KPI globalne), Staff management (lista z performance), Risk alerts (sprawy w czerwonym), Finance aggregate (przychód, marża), Audit log (timeline).
15. **Templates** — szablony DOCX. Lista szablonów z versioning, ostatnia edycja, liczba użyć. Modal preview.
16. **Automations** — workflow triggers. Lista cron jobs i automatycznych emaili. Banner-like aktywne / wstrzymane.
17. **Alerts** — pulpit bezczynności (sprawy bez ruchu >X dni). Lista `alert-row` z day-badge `.warn` lub `.overdue`.

### Tier E — Public/auxiliary
18. **Login** — auth screen z 2FA TOTP. Wycentrowane card max-w 420px na pełnoekranowym subtelnym gradient. Brand mark u góry + form.
19. **Intake form** — publiczny formularz dla klienta (poza shellem). Stepper 5 kroków + responsive form.

---

## 6. Real-world content — wszystko po polsku

**Statusy spraw:** `lead`, `zlecona`, `aktywna`, `zakończona`, `archiwum`

**Etapy (stages) — 7 wartości:**
weryfikacja dokumentów → złożenie wniosku → osobiste stawiennictwo → po osobistym → oczekiwanie na decyzję → zakończenie → odwołanie

**Role w zespole:** owner, admin, manager, lawyer (prawnik), assistant (asystent), staff

**Typy spraw (kind):**
- Pobyt czasowy + praca (najczęstszy, ~60%)
- Pobyt rezydenta UE
- Pobyt stały
- Zezwolenie na pracę typ A
- Zaproszenie
- Karta Polaka
- Odwołanie

**Typy płatności i kwoty:**
- Opłata wniosku: 340 PLN / 440 PLN / 640 PLN
- Opłata za kartę pobytu: 50 PLN
- Honorarium kancelarii: 1500–4000 PLN

**Numery spraw:** format `GMP-2026-00001` (prefix-rok-numer 5-cyfrowy)

**Przykładowi klienci (cudzoziemcy) — pełna lista do mockowania tabel:**
| Imię i nazwisko | Narodowość | Flaga | Ur. | Zawód |
|---|---|---|---|---|
| Mariia Petrenko | Ukraina | 🇺🇦 | 1992-03-14 | kucharka |
| Oleksandr Kovalenko | Ukraina | 🇺🇦 | 1988-07-22 | kierowca C+E |
| Nguyen Van An | Wietnam | 🇻🇳 | 1985-11-09 | restauracja |
| Aslan Berdyev | Turkmenistan | 🇹🇲 | 1990-02-28 | IT |
| Davit Sargsyan | Armenia | 🇦🇲 | 1995-06-10 | budowlaniec |
| Iryna Bondarenko | Ukraina | 🇺🇦 | 1986-09-03 | pielęgniarka |
| Mohammad Nazari | Afganistan | 🇦🇫 | 1991-12-15 | magazynier |
| Lakshmi Ramanan | Indie | 🇮🇳 | 1989-04-19 | software |
| Adebayo Okafor | Nigeria | 🇳🇬 | 1994-08-07 | studia |
| Volodymyr Shevchenko | Ukraina | 🇺🇦 | 1981-10-25 | spawacz |
| Andrii Tkachenko | Ukraina | 🇺🇦 | 1993-05-11 | logistyka |
| Phan Thi Lan | Wietnam | 🇻🇳 | 1990-01-03 | manicure |

**Przykładowi pracodawcy (firmy):**
- Polmlek Sp. z o.o. — NIP `7011234567` — Mleczarstwo
- Castorama Polska Sp. z o.o. — NIP `5252109856` — Handel detaliczny
- Małopolska Hodowla Roślin — NIP `6790015587` — Rolnictwo
- TransLogistics 24 Sp. z o.o. — NIP `5213765432` — Transport
- Atrium Hotel Kraków — NIP `6762456789` — Hotelarstwo
- BudMaster Wschód — NIP `7392145678` — Budownictwo
- Dolina Smaków Catering — NIP `9512387654` — Gastronomia

**Przykładowi prawnicy / staff:**
- Anna Kowalska — prawnik (lawyer)
- Paweł Nowak — owner
- Kasia Wiśniewska — asystent (assistant)
- Marek Lewandowski — prawnik (lawyer)
- Tomasz Dąbrowski — manager
- Joanna Zielińska — asystent

**Przykładowe PESEL** (do mock content): `92031412345`, `88072287654`, `85110909876`
**Przykładowe NIP:** `7011234567`, `5252109856`, `6790015587`

---

## 7. Stany ekranów (każdy ekran z listą / treścią)

Każdy ekran z listą / treścią pokaż w trzech wariantach:
1. **Z danymi** — realistyczna ilość: 12-25 wierszy w tabeli, 6-9 kart per kolumna kanban, 4-7 alertów na dashboard.
2. **Pusty (empty)** — komponent `.empty` z ikoną Phosphor 32px, headline z `.em` italic serif, body `.body`, single CTA secondary.
3. **Loading (skeleton)** — komponenty `.sk-text`, `.sk-block`, `.sk-circle` w miejscu wierszy/kart.

Plus stany inputów: default, focus, error, disabled.

---

## 8. Interakcje (każdy ekran ma być klikalny)

- Sidebar items przełączają widok główny (React state, bez reload).
- Filter chips togglują (visual state).
- Tabs w case detail i kartach klienta przełączają sekcje.
- Buttony „Nowa sprawa", „Dodaj klienta", „Edytuj" otwierają modal lub drawer.
- Co najmniej 1 modal per ekran z formą (np. „Nowa sprawa" — modal `.lg` z 5 polami + footer z dwoma buttonami).
- Co najmniej 1 drawer per master list (case / client / employer detail w drawer.wide).
- Hover states na wierszach tabel, kartach, kanban-card (transform + shadow).
- Kanban: cursor: grab/grabbing.
- Cmd+K w topbar otwiera modal command palette (lista sugestii).
- Bulk select w tabelach: zaznaczenie ≥1 wiersza pokazuje `.bulk-bar` sticky bottom.

---

## 9. Workflow naszej współpracy

1. **Teraz (pierwsza odpowiedź):** potwierdź że zrozumiałeś brief w 5-6 zdaniach. **Nie buduj jeszcze artifactu.**
2. **Drugi message ode mnie:** „OK, zaczynamy. Zbuduj Shell + Dashboard." Ty generujesz pierwszy artifact (jeden plik HTML z osadzonym CSS i React via Babel standalone, jak panel v2 MOC).
3. **Iteracja na pierwszym ekranie:** klikam, oglądam, mówię „przesuń sidebar", „zwiększ liczby w hero", „dodaj alert w kolorze warn" — Ty modyfikujesz ten sam artifact.
4. **Akceptacja → następny ekran:** „OK, ten jest dobry. Teraz zrób Cases list." Ty pamiętasz cały design system z punktu 4, używasz tych samych komponentów, tej samej palety, tych samych imion klientów.
5. **Powtarzamy** dla wszystkich 19 ekranów (Tier S → A → B → C → D → E).
6. **Eksport:** gdy wszystko zaakceptowane, eksportuję projekt z Claude Design → wracam do swojego dewelopera, on wdraża do plików produkcyjnych.

---

## 10. Co potwierdzasz w pierwszej odpowiedzi (5-6 zdań)

- Że zrozumiałeś filozofię „Calm CRM" — light-first, slate-blue + ivory, jeden akcent **teal `#0d9488`**, hierarchia przez whitespace.
- Że będziesz używać editorial type stack: Inter Tight + Inter + Instrument Serif italic + JetBrains Mono.
- Że będziesz używać **wyłącznie klas z `design-system.css`** — bez wymyślania własnych kolorów, spacingów, fontów.
- Że content będzie polski, z realnymi danymi z punktu 6 (Mariia Petrenko, Polmlek, GMP-2026-00001, prawnicy Anna Kowalska / Paweł Nowak / itd.).
- Że pierwszy ekran do zbudowania to **Shell + Dashboard**, generowany jako pojedynczy plik HTML z osadzonym CSS i React (Babel standalone) — analogicznie do struktury panel-v2.html z MOC.
- Czekasz na sygnał startu i nie generujesz jeszcze artifactu.
