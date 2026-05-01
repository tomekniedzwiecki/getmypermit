# GetMyPermit CRM v3 — interaktywny prototyp

Klikany prototyp redesignu w czystym HTML + React (przez Babel standalone). Bazuje na `../design-system.css` z paczki redesign.

## Jak uruchomić

`Panel.html` ładuje `<script type="text/babel" src="components/...jsx">` przez Babel standalone. Aby to zadziałało, **musisz uruchomić lokalny serwer** (file:// nie zadziała — CORS).

**Najprostsze opcje:**

```bash
# Python (jeśli masz)
cd /c/repos_tn/getmypermit/docs/redesign/crm-prototype
python -m http.server 8000

# Node
npx serve

# Albo: VS Code → instaluj „Live Server" → prawym na Panel.html → Open with Live Server
```

Otwórz `http://localhost:8000/Panel.html` (lub jakikolwiek port).

## Struktura

```
crm-prototype/
├── Panel.html              # entry point + App + routing
├── data.js                 # pełen mock CRM (sprawy, klienci, pracodawcy, staff, alerty, ...)
├── components/
│   ├── Primitives.jsx      # Card, Pill, Kpi, Banner, RiskDial, DistBar, HeroStat, Timeline, Avatar, Collapsible, Empty, AlertRow, PageHeader, StatusPill
│   ├── Sidebar.jsx         # Praca / Kalendarz / Kartoteki / Finanse / System
│   ├── Modals.jsx          # NewCase (wizard 5 krokow), NewClient, CommandPalette (Cmd+K)
│   ├── CaseDrawer.jsx      # Detail sprawy: 6 tabów + 8 sekcji A-H elektronicznego złożenia
│   ├── ClientDrawer.jsx
│   └── EmployerDrawer.jsx
└── screens/
    ├── Dashboard.jsx       # hero stat + KPI + dist-bar + agenda + alerty + timeline + zespol
    ├── CasesList.jsx       # filter chips + table + bulk-bar
    ├── Kanban.jsx          # 7 kolumn etapów
    ├── Tasks.jsx           # grupowanie po terminie + segmented Moje/Zespół
    ├── Leads.jsx, LeadsPipeline.jsx
    ├── Alerts.jsx, Calendar.jsx, Submissions.jsx
    ├── ClientsList.jsx, EmployersList.jsx
    ├── Groups.jsx, Staff.jsx, Templates.jsx
    ├── Payments.jsx, Receivables.jsx, Invoices.jsx, Analytics.jsx
    ├── Admin.jsx, Automations.jsx
    └── Login.jsx, Intake.jsx
```

## Co działa

- **Routing** sidebar ↔ ekran (React state, bez reload)
- **Cmd+K** → command palette (modal z fuzzy search po sprawach + ekranach)
- **Drawer** dla sprawy / klienta / pracodawcy (klik w wiersz tabeli)
- **Tabs** w drawer (Przegląd / Elektroniczne złożenie / Dokumenty / Płatności / Notatki / Historia)
- **Collapsible** dla 8 sekcji A-H w case detail
- **Filter chips** w listach (cases, alerts, payments)
- **Bulk select** w Cases list → sticky bulk-bar na dole
- **Modale**: Nowa sprawa (5-krokowy wizard), Dodaj klienta
- **Hover states** na wszystkich tabelach, kartach kanban

## Co NIE działa (świadomie, prototyp)

- Drag & drop w kanban (cursor jest `grab`, ale fizycznie nie przenosi — w produkcji dorobię)
- Zapisywanie zmian (każda forma jest „read-only" — symuluje)
- Wykresy w Analytics (proste SVG mock)
- Real auth (Login screen pokazuje formularz, ale nie loguje)

## Iteracja

Edytuj plik `.jsx`, zapisz, odśwież przeglądarkę. Babel re-kompiluje w locie.

Cały design jest sterowany przez `../design-system.css` — zmiana CSS variable na początku tego pliku (np. `--accent`) propaguje na wszystkie ekrany.

## Cofnięcie

Cały folder jest izolowany. Cofnięcie = `rm -rf crm-prototype/` lub `git reset --hard <commit>` do baseline (commit `61991f2` to stan z paczką ale bez prototypu).
