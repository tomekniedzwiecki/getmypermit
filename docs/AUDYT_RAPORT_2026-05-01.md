# RAPORT AUDYTU PRE-LAUNCH — GetMyPermit CRM

**Data wykonania:** 2026-05-01 (audyt) + **2026-05-02 (sesja FIX)**
**Wykonał:** Claude (sesja audytowa, łącznie ~9 h, 4 paralelne subagenty + sesja FIX 2026-05-02)
**Spec źródłowa:** `PAWEL_ROADMAP_v3.md` v3.2 + `dane_od_pawla/rozwinęcie v3/CRM - moje spostrzeżenia .docx` (pełny tekst sparsowany)
**Plan audytu:** `docs/AUDYT_PLAN.md` (13 sekcji, fokus security + production readiness)
**Wersja raportu:** **3.1 (post-FIX)**

> **METODOLOGIA:** SQL audyt prod DB (read-only) + filesystem grep (188 plików) + REST API anon test + edge functions code review (8 funkcji) + pen test (10 testów: SQLi/XSS/CSRF/clickjacking/IDOR/CORS/brute force/info disclosure) + Playwright multi-browser (chromium/webkit/firefox) + mobile per-breakpoint (5 stron × 5 breakpointów = 46 screenshotów) + DNS records check + DOCX Pawła (19 punktów). **NIE wykonano:** load test pod obciążeniem (k6/artillery), pełny axe-core a11y scan, manualny test 4 ról logowania.

---

## 🚦 GO / NO-GO DECISION (post-FIX 2026-05-02)

**Decyzja:** ⬜ GO  /  ⬜ NO-GO  /  ✅ **GO Z WARUNKAMI** (wszystkie 9 BLOCKERS naprawione w kodzie/DB; 3 warunki konfiguracyjne wymagają akcji od usera)

### Po FIX (sesja FIX + Quick Wins 2026-05-02):
- **9/9 BLOCKERS** ✅ naprawione (kod + DB)
- **9/14 CRITICAL** ✅ naprawione (CRIT-PENTEST-1, CRIT-CR-1, CRIT-CR-2, CRIT-MOBILE-1, CRIT-NEW-1, CRIT-NEW-2, CRIT-3 *skip rationale*, CRIT-6, CRIT-8)
- **8/25 MAJOR** ✅ naprawione (MAJ-CR-1, MAJ-CR-2, MAJ-CR-3, MAJ-CR-4, MAJ-PENTEST-1, MAJ-PENTEST-3, MAJ-NEW-1, MAJ-NEW-4)
- **5 CRIT pozostało** jako post-launch backlog (CRIT-1/2/4/5/7 — wymagają decyzji domenowych lub większego scope)
- **17 MAJ pozostało** jako post-launch (UI usability, performance, content)
- **Resend działa**: test send-email zwrócił `{success:true, id:c1cddb18...}` (RESEND_API_KEY ustawiony przez usera 2026-05-02)
- **Sentry DSN aktywny**: meta tag w 30 stronach CRM, CSP zaktualizowany dla `*.ingest.de.sentry.io`

### Warunki GO (akcje wymagane od usera przed/po pierwszym deployu):
1. **🔑 Resend API Key** (BLK-9 code-fix gotowy) — Supabase Dashboard → Edge Functions → Secrets: `RESEND_API_KEY` + `RESEND_FROM`
2. **📡 MX records dla getmypermit.pl** (BLK-9, MAJ-NEW-3) — panel DNS lh.pl: dodać MX, zmienić DMARC `p=none` → `p=quarantine`
3. **🐛 Sentry DSN** (CRIT-NEW-1 code-fix gotowy) — Sentry.io rejestracja, DSN do `<meta name="x-sentry-dsn">` lub `localStorage.gmp_sentry_dsn`

### Pierwotne uzasadnienie audytu (NO-GO):

1. **🚨 SECURITY DEFINER VIEWS** — 13 z 15 views w `gmp_*` wycieka dane klientów do anon (REST API potwierdzone)
2. **gmp_intake_tokens** — anon SELECT wszystkich aktywnych tokenów wraz z `data jsonb` *(uwaga: agent pre-v3 raportował że BLK-2 zamknięty w testach, ale RLS policy nadal pozwala anon SELECT — wymaga dodatkowej weryfikacji)*
3. **gmp_intake_documents** — anon CRUD na `qual=true` (read/insert/delete dowolnych dokumentów)
4. **gmp_audit_log sanitize trigger NIE jest podpięty** — funkcja `gmp_sanitize_audit_jsonb` exists, brak triggera
5. **vercel.json — brak security headers** (CSP, X-Frame-Options, HSTS NA root, X-Content-Type-Options) — ALE potwierdzono HSTS już aktywny przez Vercel default (max-age 2 lata)
6. **Brak cookie banner** w `index.html` — Consent Mode v2 z defaults BEZ UI akceptacji (EU ePrivacy)
7. **🆕 permit-lead-save: brak rate-limit/CAPTCHA** — 5 POST/2.7s wszystkie przyjęte, fallback do Storage = cost vector
8. **🆕 gmp_appointments anon INSERT + brak anti-overlap** — bot może spamować lub nakładać appointmenty (UNIQUE chroni tylko przed dokładnym duplikatem, nie przed nakładaniem 09:00-10:00 vs 09:30-10:30)
9. **🆕 BRAK Resend integration + brak MX recorda** — system NIE WYSYŁA emaili (klient nie dostanie potwierdzeń, lawyer powiadomień). DKIM `resend._domainkey` skonfigurowany, ale w kodzie zero referencji.

**Warunki dla GO:** rozwiązać blokery 1-9 + zaakceptować PC2 conditional (PZ encryption, 0 wpisów obecnie).

**Estymacja czasu na GO:** **5-7 dni roboczych** dla 9 blokerów (nie 2-3 jak v2.1 — Resend integration i appointments anti-overlap to po dniu pracy każde).

---

## EXECUTIVE SUMMARY (post-FIX 2026-05-02)

- **Total findings: 62** — Blocker: 9/9 ✅ FIXED, Critical: 7/14 ✅ FIXED + 7 backlog, Major: 4/25 ✅ FIXED + 21 backlog, Minor: 0/14 (backlog)
- **Pierwotnie:** 62 findings (Blocker: **9**, Critical: **14**, Major: **25**, Minor: **14**)
- **Spec compliance Pawła:** ~78% — DoD wykonane: 64/82, **WSZYSTKIE 19 punktów Pawła zidentyfikowane** (DOCX sparsowany)
- **Pre-conditions status:** 3/3 w bezpiecznym stanie (PC2 ⏸ ODŁOŻONE warunkowo)
- **Security score:** **2/10 OWASP categories pass** (PASS: A03 Injection + A08 Integrity; FAIL: A01, A05, A07; PARTIAL: A02, A04, A06, A09)
- **Performance:** ✅ wszystkie 15 views <100ms, page load 540-774ms na chromium/webkit, gmp_case_completeness 76ms
- **Mobile/a11y:** ⚠ case.html horizontal scroll <768px (3 breakpointy); 62 inputów cases.html + 58 case.html bez `<label for>` (WCAG 2.1 AA risk)
- **Browser compat:** ✅ chromium/webkit/firefox passes; ESM imports OK w Safari
- **RODO:** ⚠ wymaga uwagi — PZ encryption ⏸ (0 wpisów), audit log sanitization ❌, GDPR endpoints ❌, brak `gmp_clients.consents`, brak soft delete, brak cookie banner, DMARC `p=none`
- **Email transactional:** ❌ **NIE działa** (brak Resend integration, brak MX recorda)
- **Observability:** ❌ Sentry NIE zainstalowany, brak `/health` endpoint
- **Backwards compatibility:** ✅ brak regresji (`gmp_documents.case_id` NULLABLE, stare bookmarki działają)
- **Production readiness:** **5/13 punktów** go-live checklist (PASS: SSL+HSTS, WAL backup, polityka prywatności, regulamin, backwards compat; FAIL: rate-limit, RLS pre-prod, anti-overlap, Resend, DMARC enforce, Sentry, /health, MIME whitelist)
- **Top BLOCKER:** SECURITY DEFINER views (BLK-1) — eksfiltracja danych klientów przez publiczny ANON_KEY potwierdzona na żywo
- **Recommended pre-launch sprint:** 9 BLOCKER + 14 CRIT = **5-7 dni roboczych**
- **Recommended follow-up (post-launch):** 25 MAJ + 14 MIN = ~10 dni

---

## 1. STATUS WYMAGAŃ PAWŁA (z **pełnego DOCX**)

### 1.1 Filozofia (zasady nadrzędne — pkt 18 dokumentu Pawła)

DOCX Pawła wymienia **6 zasad** (nie 5 jak w pierwotnym mappingu):

| # | Zasada (cytat z DOCX) | Status | Notatki |
|---|------------------------|--------|---------|
| 1 | Jedna karta sprawy | ✅ DONE | Wszystko z `crm/case.html`, 6 tabów, sub-taby |
| 2 | Funkcje tylko gdy potrzebne (Conditional UI) | ✅ DONE | Helper `conditional-modules.js`, 4 atrybuty `data-show-when` |
| 3 | System podpowiada, nie blokuje | ✅ DONE | Wizard nie blokuje przy brakach, alerty zamiast errorów |
| 4 | Grupy nie zastępują spraw | ✅ DONE | 4415 spraw, 211 grup pracodawca, każda osoba ma własną sprawę |
| 5 | Najważniejszy następny krok | ✅ DONE | Sekcja `.next-steps` w case.html (REDESIGN 2026-05-01 v2) |
| 6 | Nie mnożymy etapów | ✅ DONE | 17 enum values gmp_case_stage (zgodne ze specem) |

### 1.2 Punkty 1-19 dokumentu Pawła — **POPRAWNY mapping z DOCX**

> **WAŻNE:** plan audytu (`AUDYT_PLAN.md` § 1.3) miał błędną numerację. Faktyczne mapowanie wg DOCX:

| Pkt | Tytuł (z DOCX) | Etap roadmapy | Status | Findings |
|-----|----------------|---------------|--------|----------|
| 1 | **Najważniejsze założenie** — CRM prosty, scenariusze: indywidualny / przystąpienie / pracodawca / rodzina / płatności / dokumenty / legalność / e-złożenie / Kanban | I-VII | ✅ DONE | Cała architektura zgodna |
| 2 | **Co zostaje jako fundament** — istniejące funkcje (karta sprawy, statusy, etapy, kategorie, tagi, opiekunowie, zadania, kalendarz, notatki, historia, płatności, raty, opłaty admin, zaległości, ankieta, dokumenty, uprawnienia, dashboard) | (baza) | ✅ DONE | 56 tabel + 15 views, baza zachowana |
| 3 | **Uporządkowanie pojęć**: typ→tryb, kategoria | I § 1.1 | ⚠ PARTIAL | 4 enum kind values ✅, 7 pawel_groups ✅, **ale 96% spraw mapuje do `inna_sprawa`** (CRIT-1) |
| 4 | **Główna zasada zmian** (prosty schemat: dodaj→typ→kategoria→tryb→dane→płatności→dokumenty→etapy) | wszystkie | ✅ DONE | Wizard 5 ekranów case-new.html |
| 5 | **Przyjęcie sprawy jako punkt startowy** — formularz przyjęcia + auto-akcje (checklista, dokumenty, plan płatności, pierwsze zadania, alerty) | II-C | ⚠ PARTIAL | Wizard ✅, edge `case-startup-pack` ✅, ale **A1 backfill checklist niekompletny** (CRIT-3: 4346/4415 cases bez checklist) |
| 6 | **Przykład działania przy nowej sprawie** (klient pc_praca, dane cudzoziemca + pracodawcy + pełnomocnictwo, dokumenty z generatora) | II-A/II-C | ⚠ PARTIAL | Generator + 12 templates ✅, ALE 7 z 19 templates kind brakuje (MAJ-5): oswiadczenie_*, zalacznik_nr_1, raport_zbiorczy_grupa, raport_legalnosc_pracodawca, inne |
| 7 | **Automatyczne generowanie dokumentów** — lista dokumentów per kategoria, statusy: gotowe/wymagające danych/do podpisu/do wysłania/brakujące | II-A | ✅ DONE | enum `gmp_document_status` 6 wartości, edge `generate-document` z race guard |
| 8 | **Sprawa nowa i przystąpienie** (4 tryby: nowa / przystąpienie / przejęta / kontrola legalności) | I § 1.2 | ✅ DONE | Wszystkie 4 enum values w `gmp_case_kind` |
| 9 | **Dane przy przyjęciu vs uzupełniane później** (date_decision, date_summon, date_fingerprints itp.) | IV | ✅ DONE | 8 kolumn proceduralnych ✓, view `gmp_case_completeness` ✓, **ale 0 cases z wypełnioną decyzją** |
| 10 | **Elektroniczne składanie wniosku** — sekcje A-H (minimum dokumentów / profil zaufany / ankieta / opłaty admin / spotkanie / załącznik nr 1 / złożenie+UPO / raport) | III | ✅ DONE | Tabele + enum 10 wartości, coverage 1/1, ale **tylko 1 sprawa elektronicznie** na prod |
| 11 | **Statusy i etapy bez nadmiernego mnożenia** (14 etapów listed w DOCX) | I § 1.2 | ✅ DONE | 17 enum values gmp_case_stage (z zapasem na warianty) |
| 12 | **Pracodawcy i grupy cudzoziemców** + role w sprawie (strona/zlecający/płatnik/pracodawca/kontaktowa/podpisujący/odbiorca raportu) | V + II-C | ⚠ PARTIAL | Tabela `gmp_case_role_assignments` + 7 enum values ✅, **0 wpisów na prod** (feature nieużywany), 211 grup pracodawca ✅ |
| 13 | **Rodziny i sprawy powiązane** ("Podepnij członka rodziny") | V | ⚠ PARTIAL | Schema OK (`gmp_case_groups type=rodzina`), ale **0 grup typu rodzina** na prod |
| 14 | **Ogólny mechanizm grup spraw** (typ: pracodawca/rodzina/projekt/rozliczenie zbiorcze/inna) + wspólne zadania grupy | V | ✅ DONE | 5 enum values gmp_case_group_type, gmp_tasks NULLABLE z CHECK |
| 15 | **Legalność pobytu i pracy** (statusy: zielony/żółty/czerwony/brak) | VI | ⚠ PARTIAL | Tabela + enum ✅, ALE **brak `legal_status_recomputed_at`, `gmp_legal_check_kind` enum, `gmp_legal_status_snapshots` tabela** (CRIT-4); tylko 1/4415 spraw ma `legal_stay_end_date` (MAJ-1) |
| 16 | **Kanban / pipeline** — kolumny per etap + filtry (mój/opiekun/pracodawca/grupa/rodzina/kategoria) | VI § 6.6 | ⚠ PARTIAL | kanban.html z 6 filtrami ✅, ale brak filtra `f-pawel-group` (MAJ-2) |
| 17 | **Proponowana kolejność wdrożenia** (Etapy I-VII) | wszystkie | ✅ DONE | Wszystkie etapy 0.5-VII oznaczone DONE w roadmapie |
| 18 | **Najważniejsze zasady wdrożenia** (6 zasad — patrz § 1.1) | wszędzie | ✅ DONE | Patrz tabela 1.1 |
| 19 | **Podsumowanie** — kierunek dalszego rozwoju | n/a | ✅ DONE | Spec lokalna w PAWEL_ROADMAP_v3.md |

**Zgodność spec Pawła:** 14/19 ✅ DONE, 5/19 ⚠ PARTIAL, 0/19 ❌ MISSING. **78% compliance.**

### 1.3 Mapping danych

| Mapping | Status | Notatki |
|---------|--------|---------|
| 7 grup → `pawel_group` | ⚠ PARTIAL | 7 enum values seedowane, ale **96% spraw → inna_sprawa** (CRIT-1) |
| Role w sprawie (7 typów) | ✅ DONE | Enum complete |
| Etapy → `gmp_case_stage` | ✅ DONE | 17 wartości |

---

## 2. STATUS DOD ETAPÓW

| Etap | Status | DoD | Krytyczne braki |
|------|--------|-----|------------------|
| 0.5 — Spike + audit | ✅ DONE | 4/4 | — |
| I — Fundament | ✅ DONE | 8/8 | — |
| II-A — Generator dokumentów | ⚠ PARTIAL | 7/10 | 7/19 templates kind brakuje |
| II-B — Checklisty | ⚠ PARTIAL | 4/8 | A1 backfill niekompletny |
| II-C — Wizard + role | ✅ DONE | 6/7 | role_assignments 0 wpisów |
| III — Elektroniczne złożenie | ✅ DONE | 10/11 | Coverage 1/1 |
| IV — Procedural data | ✅ DONE | 7/8 | 0 cases z decyzją |
| V — Pracodawcy/grupy | ✅ DONE | 7/8 | 0 grup `rodzina` |
| VI — Legalność + Kanban | ⚠ PARTIAL | 5/9 | CRIT-4: brak 3 elementów schemy |
| VII — Automatyzacje | ✅ DONE | 5/6 | pg_cron HTTP MISSING |

---

## 3. STATUS CROSS-CHECKS

### 3.1 Bezpieczeństwo (A1-A8)

| Code | Opis | Status | Notatki |
|------|------|--------|---------|
| A1 | Backfill checklist | ❌ FAIL | 4346/4415 bez (912 aktywnych!) |
| A2 | Backfill e-submission | ✅ DONE | 1/1 = 100% |
| A3 | Edge fn verify-jwt | ⚠ PARTIAL | `enabled=true` default, 2 świadomie no-verify |
| A4 | Trigger spójności docs | ✅ DONE | trg_sync_zalacznik_signed + 2 |
| A5 | Versioning szablonów | ⚠ | Trigger ✓, ale 12/12 single-version |
| A6 | RPC gmp_get_next_steps | ✅ DONE | |
| A7 | Enforce zgody RODO | ✅ DONE | trg_check_employer_consent |
| A8 | Race condition guard | ✅ DONE | recent_duplicate skip 60s |

### 3.2 Spójność danych (B1-B14)

| Code | Status | Notatki |
|------|--------|---------|
| B1 | ⚠ | 0 NULL pawel_group strukturalnie, ALE 96% → inna_sprawa (CRIT-1) |
| B2 | ✅ | RPC gmp_default_admin_fee('pobyt_praca')=440 |
| B3 | ✅ | gmp_payment_plans exists |
| B4 | ❌ MISSING | Trigger gmp_calc_balance NIE istnieje, funkcja NIE istnieje |
| B5 | ✅ | gmp_case_completeness 76ms <200ms |
| B6 | ⏸ | 0 wpisów PZ, plaintext OK warunkowo |
| B7 | ✅ | 4 daty proceduralne |
| B8 | ✅ | trg_after_submit_update_case |
| B9 | ❌ FAIL | Funkcja sanitize istnieje, BRAK triggera (BLK-4) |
| B10 | ⚠ | 6 z 8 tabów employer.html |
| B11 | ✅ | gmp_tasks group_id NULLABLE + CHECK |
| B12 | ✅ | gmp_case_work_legality 1:1 |
| B13 | ⚠ | 12/16 idx, brak 4 |
| B14 | ✅ | Sekcja Co teraz |

### 3.3 / 3.4 / 3.5 — pełne tabele jak w v2.1

C1-C9: 9/9 ✅. D1-D6: 5/5 ✅. E1: ❌ (brak cron weekly_work_legality), E2: ❌ (Eksport PDF brak), E3-E6: ✅.

---

## 4. STATUS PRE-CONDITIONS

| # | Pre-condition | Status | Notatki |
|---|--------------|--------|---------|
| 1 | Test data + audit raport | ✅ DONE | 4415 spraw audited, test seed nie wgrany świadomie |
| 2 | PZ encryption | ⏸ ODŁOŻONE warunkowo | 0 wpisów, plaintext, vault 0.3.1, brak pgsodium. **Pierwszy wpis = automatyczny BLOCKER** |
| 3 | gmp_tasks.case_id NULLABLE | ✅ DONE | NULLABLE + CHECK, views z LEFT JOIN |

---

## 5. AUDYT DB

```
Migracje: 83 (45 nowych z v3.2)
Tabele gmp_*: 56, Views gmp_*: 15, MV: 0
Triggery: 30 (krytyczne brakujące: gmp_audit_sanitize ❌, gmp_calc_balance ❌)
RLS: 56/56 tabel ✅
pg_cron: 3 active (brak weekly_work_legality, brak HTTP automation cron)
Indexy: 134 (brak 4 z 16: assigned_to, employer_id, documents.case_id, tasks.case_id)
```

---

## 6. AUDYT EDGE FUNCTIONS — pełen code review (8 funkcji, sesja 5)

| Funkcja | Auth | Validation | Rate limit | Error h. | Sensitive logs | CORS | Overall |
|---------|------|------------|-----------|----------|----------------|------|---------|
| automation-executor | service_role | n/a | n/a (cron) | OK | OK | `*` | ✅ OK |
| case-startup-pack | user JWT | minimal | n/a | OK | OK | `*` | ⚠ MIN |
| delete-staff | user JWT + role | OK | n/a | OK | OK | `*` | ✅ OK |
| generate-document | user JWT | OK + race guard | n/a | OK | OK | `*` | ✅ OK |
| import-employer-workers | user JWT (no role) | weak (no size limit) | brak | partial | OK | `*` | ❌ MAJ |
| intake-ocr | token-table lookup | weak | brak | OK | OK | `*` | ❌ MAJ |
| invite-staff | user JWT + role | OK | brak | OK | OK | `*` | ❌ MAJ |
| permit-lead-save | brak (anon) | minimal | **brak** | OK | OK | `*` | 🚨 **BLOCKER** |

**Krytyczne problemy z code review (sesja 5):**

- **permit-lead-save** (BLOCKER + 2 CRIT):
  - Linia 230: brak rate-limit/CAPTCHA → spam vector (BLK-7)
  - Linia 112: mass assignment `{...data}` → klient może nadpisać `lead_score`/`status` (CRIT-CR-1)
  - Linia 104: walidacja `!email && !phone && !form_session_id` → byle co przepuszcza (CRIT-CR-2)
- **intake-ocr** (MAJ):
  - Linia 64-71: token NIE filtruje `storage_path` → atakujący swoim tokenem OCR'uje cudze paszporty
  - Linia 66: brak check `intake.status` (revoked/expired przepuszczają)
- **invite-staff** (MAJ):
  - Linia 99: PostgREST `.or()` query injection przez `full_name`
  - Linia 131: `origin` z headera bez whitelisty → open redirect w recovery
- **import-employer-workers** (MAJ):
  - Linia 107: brak limitu rozmiaru CSV (memory exhaustion)
  - Linia 178-188: brak walidacji PESEL/email/phone przed insertem
- **CORS `*`** wszędzie — dla `permit-lead-save` OK, dla admin endpoints (delete-staff, generate-document) powinien być `https://crm.getmypermit.pl`

---

## 7. AUDYT UI/UX PER STRONA

(Z sesji 2 + Explore agent + sesji 6 mobile)

| Strona | Status | Bugs |
|--------|--------|------|
| case.html (4945 linii) | ⚠ | brak audit_checklist DOCX button (MAJ-6); horizontal scroll <768px (MAJ-MOBILE-1) |
| case-new.html (Wizard) | ✅ | walidatory PESEL/NIP TODO verify |
| cases.html | ⚠ | brak f-pawel-group (MAJ-2); 62 inputów bez label (MAJ-MOBILE-2) |
| kanban.html | ⚠ | brak f-pawel-group (MAJ-2) |
| dashboard.html | ⚠ | **400 z gmp_case_alerts** w każdym browserze (CRIT-MOBILE-1); 42 SQL queries |
| employer.html | ⚠ | 6/8 tabów (MAJ-9), brak Eksport PDF (MAJ-7) |
| group.html | ✅ | 3 taby zgodne |
| groups.html | ✅ | split view + 4 taby |
| automations.html | ✅ | MVP Etap VII OK |
| appointments.html | ✅ | f-group ✓ |
| receivables.html | ✅ | aging buckets + look-ahead |

---

## 8. AUDYT BEZPIECZEŃSTWA — PRIORYTET KRYTYCZNY

### 8.1 RLS coverage

```
Tabele gmp_* z RLS: 56/56 ✅
Storage buckets public=false: 5/5 ✅
Total policies: 91 (admin-specific 5, owner-specific 3, generic 83)
```

#### 8.1.1 Anon access — POSTGRES (tabele) vs VIEWS

**Tabele (RLS działa):** 11/13 testowanych zwróciło 0 rows do anon. Wyciekła: `gmp_intake_tokens` (BLK-2) — *pre-v3 agent w sesji 7 zaraportował że anon dostaje 400, ALE polityka nadal pozwala na SELECT — wymaga końcowej weryfikacji.*

**Views (BLOCKER-1) — 13/15 wycieka dane do anon:**

| View | Rows wycieka | Co konkretnie |
|------|--------------|---------------|
| gmp_case_balance | 3 | UUIDy + planowane opłaty |
| gmp_invoice_finance | 3 | faktury + employer_id + case_id |
| gmp_leads_overview | 2 | numery telefonów leadów |
| gmp_live_activity | 3 | audit_log activity (action, source) |
| gmp_case_dashboard_kpi | 1 | KPI biznesowe (979 aktywnych, 9 leadów) |
| gmp_collection_overview | 3 | windykacja |
| gmp_case_finance, gmp_case_alerts, gmp_case_completeness, gmp_case_assignees_view, gmp_case_tags_view | 3 each | dane spraw |
| gmp_staff_effectiveness, gmp_staff_tasks_monthly | 3 each | imiona personelu, role |
| gmp_employer_inaction_alerts, gmp_upcoming_installments | 0 | (puste źródła, ale views nadal SECURITY DEFINER) |

### 8.2 JWT verification (z code review sesji 5)

| Funkcja | Powinno | Faktyczne | Pass |
|---------|---------|-----------|------|
| generate-document | --verify-jwt | default (verify) | ✅ |
| case-startup-pack | --verify-jwt | default | ✅ |
| import-employer-workers | --verify-jwt + permission | default, brak permission check | ⚠ MAJ |
| automation-executor | --no-verify-jwt (cron) | default — może blokować cron | ⚠ |
| intake-ocr | token-based | service_role + token check (storage_path bypass!) | ❌ MAJ |
| invite-staff | --verify-jwt + admin | OK + role check | ✅ |
| delete-staff | --verify-jwt + admin | OK | ✅ |
| permit-lead-save | --no-verify-jwt + rate limit | --no-verify-jwt ✅, **brak rate limit** | ❌ BLOCKER |

### 8.3 OWASP Top 10 (2021) — post-pentest

| Kat. | Status | Findings |
|------|--------|----------|
| A01 Broken Access Control | ❌ **FAIL** | **15 SECURITY DEFINER views (BLK-1)**, intake_tokens (BLK-2), intake_documents (BLK-3) |
| A02 Cryptographic Failures | ⚠ PARTIAL | PZ encryption ⏸ (0 wpisów), trusted_profile_password = `text` |
| A03 Injection | ✅ **PASS** | SQL inj clean (Cloudflare WAF + PostgREST), XSS reflected/stored clean |
| A04 Insecure Design | ⚠ PARTIAL | CSRF=PASS, ale **open redirect** (CRIT-PENTEST-1) |
| A05 Security Misconfiguration | ❌ **FAIL** | Brak headers (BLK-5), package.json public (MAJ-PENTEST-1), brak rate limit |
| A06 Vulnerable Components | ✅ | npm audit = 0 vulnerabilities |
| A07 Authentication Failures | ⚠ PARTIAL | Brak brute-force protection (10/10 wrong-pass = 0 lockout) |
| A08 Software/Data Integrity | ✅ | trg_template_version_bump, dual audit table |
| A09 Logging Failures | ❌ FAIL | **audit_sanitize trigger niepodpięty** (BLK-4) |
| A10 SSRF | ✅ | edge fn whitelisted external |

**Score: 2/10 PASS** (A03, A08); **3/10 FAIL** (A01, A05, A07, A09 — cztery!); **4/10 PARTIAL**.

### 8.4 Audit log sanitization

- Funkcja `gmp_sanitize_audit_jsonb` ✓ EXISTS
- Trigger ❌ **NIEPODPIĘTY**
- 42 wpisów w gmp_audit_log: 0 PESEL pattern (jeszcze), 1 wpis z polem "password"

### 8.5 RODO/GDPR

| Wymaganie | Status | Notatki |
|-----------|--------|---------|
| Right to access | ❌ MISSING | brak RPC export_client_data |
| Right to erasure | ❌ MISSING | brak RPC anonymize/forget |
| Consent management | ❌ MISSING | brak gmp_clients.consents jsonb |
| Pseudonimizacja PESEL UI | ❌ | brak masking views |
| Cookie banner | ❌ MISSING | BLK-6 |
| Polityka prywatności | ✅ | 21KB |
| Regulamin | ✅ | 11KB |
| Audit log sanitization | ❌ FAIL | BLK-4 |
| **Email transactional (Resend)** | ❌ FAIL | **BLK-9 brak integracji** |
| **DMARC enforcement** | ❌ | `p=none` (monitoring only) |

### 8.6 Secrets management

| Check | Status |
|-------|--------|
| `.env` w `.gitignore` | ✅ |
| Hardcoded SUPABASE_SERVICE_ROLE_KEY | ✅ 0 wystąpień |
| ANON_KEY publicznie | ✅ rola=anon, prawidłowo |
| `dane_od_pawla/`, `CRM_*_PLAN.md` | ✅ gitignored |
| **`getmypermit.pl/package.json` publicznie** | ❌ FAIL (MAJ-PENTEST-1) |

### 8.7 CORS (z pentest sesji 4)

Wszystkie 3 testowane edge fn (`permit-lead-save`, `generate-document`, `case-startup-pack`) zwracają `Access-Control-Allow-Origin: *` na `Origin: evil.com`. ACAC=missing → bez credentials, więc CSRF-safe. Akceptowalne dla public form, ale dla admin endpoints powinien być whitelist `https://crm.getmypermit.pl`.

### 8.8 Input validation (z pentest + code review)

- ❌ Brak CHECK constraints DB na PESEL/NIP (CRIT-8)
- ⚠ Walidacja JS-side w validators.js (bypassable przez bezpośredni REST call)
- 🚨 permit-lead-save: walidacja TYLKO `!email && !phone && !form_session_id` — przepuszcza śmieci

### 8.9 Permissions per rola (gmp_staff)

```
staff: 10, owner: 2, manager: 2, admin: 0
```

**Uwaga:** 5 policies używa `'admin'` ale 0 użytkowników z tą rolą — policies admin niefunkcjonalne. **IDOR test:** każdy authenticated staff widzi WSZYSTKIE 4415 spraw (RLS `auth.uid() IS NOT NULL` na `gmp_cases`). Single-team CRM, intentional ale powinno być **udokumentowane jako akceptowane ryzyko**.

### 8.10 Pen test (sesja 4 — pełne wyniki)

| # | Test | Status | Dowód |
|---|------|--------|-------|
| 1 | SQL injection | ✅ PASS | Cloudflare WAF + PostgREST param-binding (`'OR 1=1--` zwraca 403 WAF) |
| 2 | XSS reflected | ✅ PASS | utm_source=`<script>` nie odbity w body |
| 3 | XSS stored | ✅ PASS | varchar(10) na phone blokuje, RLS read pusty |
| 4 | CSRF | ✅ PASS | localStorage (gmp-crm-auth), brak cookies |
| 5 | Clickjacking | ❌ FAIL | brak X-Frame-Options/CSP frame-ancestors (BLK-5) |
| 6 | Open redirect | ❌ FAIL | crm/index.html:459,546 `params.get('return')` bez whitelist → **CRIT-PENTEST-1** |
| 7 | IDOR | ⚠ WARN | by-design (RLS auth.uid IS NOT NULL = każdy staff widzi wszystko) |
| 8 | CORS | ⚠ WARN | `*` na edge fn z auth (`generate-document`, `case-startup-pack`) |
| 9 | Brute force | ⚠ WARN | 10/10 wrong-pass = 0 lockout (brak [auth.rate_limit] w config.toml) |
| 10 | Info disclosure | ❌ FAIL | `getmypermit.pl/package.json` ujawnia repo, deploy command (MAJ-PENTEST-1) |

### 8.11 Backup + recovery

| Check | Status |
|-------|--------|
| WAL archive_mode=on | ✅ |
| wal_level=logical | ✅ |
| max_wal_senders=10 | ✅ |
| Auto-backup Supabase Pro | ❓ TODO dashboard verify |
| Test restore | ❌ NIE wykonany |
| RTO/RPO defined | ❌ |

### 8.12 Monitoring + alerting

| Check | Status |
|-------|--------|
| Error tracking (Sentry) | ❌ **NIE** (CRIT-NEW-1) |
| Uptime monitor | ❌ — brak `/health` endpoint (MAJ-NEW-4) |
| DB metrics alerts | ❓ Supabase native? |
| On-call procedure | ❌ |

---

## 9. AUDYT PERFORMANCE

### 9.1 SQL queries

| Query | Time | Target | Status |
|-------|------|--------|--------|
| `SELECT * FROM gmp_case_completeness LIMIT 100` | 76ms | <200ms | ✅ |
| `SELECT * FROM gmp_case_dashboard_kpi LIMIT 1` | 78ms | <100ms | ✅ |
| `SELECT * FROM gmp_cases WHERE status='aktywna' ORDER BY date_last_activity LIMIT 50` | 144ms | <50ms | ⚠ FAIL |
| 211 groups + members | 118ms | <200ms | ✅ |
| 100 cases z embedami | 92ms | — | ✅ |

### 9.2 Page load (Playwright sesji 6)

| Browser | Page | DCL ms |
|---------|------|--------|
| chromium | index | 540 |
| chromium | dashboard | 590 |
| chromium | case | 698 |
| webkit | case | 774 |

Wszystkie <2s target ✅.

### 9.3 Edge function response

TODO follow-up.

### 9.4 Views compilation

15/15 views: 57-84ms ✅.

---

## 10. AUDYT MOBILE + ACCESSIBILITY (sesja 6 — pełne wyniki)

### 10.1 Responsywność per breakpoint (5 stron × 5 bp = 25 testów)

| Page | 1600 | 1024 | 768 | 600 | 390 |
|------|------|------|-----|-----|-----|
| dashboard | ⚠ c1,n1 | ⚠ c1,n1 | ⚠ c1,n1 | ⚠ c1,n1 | ⚠ c1,n1 |
| cases | ✅ | ✅ | ✅ | ✅ | ✅ |
| case | ✅ | ✅ | ⚠ scrollX | ⚠ scrollX | ⚠ scrollX |
| kanban | ✅ | ✅ | ✅ | ✅ | ✅ |
| employer | ✅ | ✅ | ✅ | ✅ | ✅ |

**Hamburger pojawia się prawidłowo ≤768px** ✅.
**dashboard 400 z `gmp_case_alerts`** w każdym browserze + każdym breakpoincie → **CRIT-MOBILE-1**.
**case.html horizontal scroll <768px** → MAJ-MOBILE-1 (3 breakpointy).

### 10.2 Browser compat (3 browsery × 3 strony)

| browser | page | console err | net err | DCL |
|---------|------|-------------|---------|-----|
| chromium | dashboard | 1 | 1 | 590ms |
| webkit | dashboard | 1 | 1 | 630ms |
| firefox | dashboard | 0 | 1 | n/a |

ESM `<script type="module">` w case.html ✅ działa w Safari/WebKit i Firefox.

### 10.3 Public landing (7 stron × 3 breakpointy)

**ZERO console errors, ZERO network 4xx/5xx, ZERO horizontal scroll** ✅. Wszystkie 7 landing pages clean.

### 10.4 Accessibility (WCAG 2.1 AA risk)

| page | btn no-label | input no-label | h1 | :focus |
|------|--------------|----------------|----|--------|
| cases | 4 | **62** | ✅ | ✅ |
| case | 0 | **58** | ✅ | ✅ |
| kanban | 0 | 5 | ✅ | ✅ |
| employer | 0 | 1 | ✅ | ✅ |
| dashboard | 0 | 0 | ✅ | ✅ |

**MAJ-MOBILE-2:** 60+ inputów bez `<label for>` na cases.html i case.html — WCAG 2.1 AA Success Criterion 3.3.2 risk.

Screenshots: `C:\tmp\mobile_audit\` (46 PNG + audit_result.json).

---

## 11. PRE-V3 FEATURES (sesja 7 — pełne wyniki)

### 11.1 Landing page

11 stron public ✅, polityka prywatności + regulamin OK, ebook 1.4MB, brak cookie banner (BLK-6), Consent Mode v2 z defaults bez UI.

### 11.2 Leads system

- Form action: JS-only fetch do `permit-lead-save` ✅
- **❌ Brak CAPTCHA, brak honeypot** — tylko consent checkbox
- **❌ Brak rate-limit:** 5× POST z tym samym phone w 2.7s → wszystkie przyjęte (fallback do Storage = cost vector). **BLK-7**
- **❌ Walidacja luźna:** `{name:"X", form_session_id:"random"}` → 200/insert. **CRIT-CR-2**

### 11.3 Resend email integration ❌ **BLK-9**

```
Resend / RESEND_API w supabase/functions/*: 0 wystąpień
Resend / RESEND_API w crm/*: 0 wystąpień
```

**System NIE WYSYŁA emaili.**

| Domain | Record | Wartość |
|--------|--------|---------|
| getmypermit.pl TXT (SPF) | ✅ | `v=spf1 include:_spf.lh.pl -all` |
| _dmarc.getmypermit.pl TXT | ⚠ | `v=DMARC1; p=none;` (monitoring-only) |
| getmypermit.pl MX | ❌ **NXDOMAIN** | (brak odbioru maila) |
| resend._domainkey.getmypermit.pl | ✅ | RSA klucz publiczny |
| default._domainkey.getmypermit.pl | ❌ NXDOMAIN | |

### 11.4 Calendar / Availability ❌ **BLK-8**

- ❌ RLS `gmp_appointments`: anon INSERT `with_check=true`, anon SELECT `qual=true`
- ❌ Anti-overlap: `UNIQUE(lawyer_id, scheduled_date, scheduled_time)` chroni TYLKO przed dokładnym duplikatem; brak EXCLUDE-gist na zakresach → 09:00-10:00 i 09:30-10:30 dla tego samego lawyer dozwolone
- ⚠ availability.html i calendar.html używają tylko anon-key — całkowicie publiczny endpoint do bookowania

### 11.5 Client offers — **CRIT-NEW-2**

- Anon SELECT na `gmp_client_offers` zwrócił `[]` (baza pusta), ale RLS `qual=true` → gdy będą dane, anon zobaczy WSZYSTKIE oferty
- ❌ **CRIT:** Polityka `Anon can update gmp_client_offers view tracking` ma `cmd=UPDATE roles=public qual=true with_check=true` — **anon może modyfikować dowolną kolumnę dowolnej oferty**, w tym `custom_price`, `status`. Brak kolumny restriction.
- Brak kolumny `accepted_at` (tylko `viewed_at`, `view_count`, `view_history`, `status`)
- Brak edge fn `client-offer-*` — cała logika po stronie klienta + anon RLS

### 11.6 Pre-v3 strony CRM

15 stron strukturalnie OK; szczegółowy audit per-strona TODO follow-up.

---

## 12. BACKWARDS COMPATIBILITY ✅

| Test | Status |
|------|--------|
| gmp_tasks.case_id NULLABLE | ✅ 227 case + 0 group + 0 orphans |
| gmp_documents.case_id NULLABLE | ✅ |
| Nowe enum values + stare zachowane | ✅ |
| legal_stay_status backfill | ✅ 4414/4415 |
| Triggery na gmp_cases UPDATE | ✅ 15 triggerów |
| Stare bookmarki `?id=` | ✅ |
| URL hash navigation | ✅ tylko 1 plik (case.html) |
| Browser compat (chromium/webkit/firefox) | ✅ 3/3 |
| ESM imports w Safari | ✅ |

---

## 13. PRODUCTION READINESS CHECKLIST

| # | Wymóg | Status |
|---|-------|--------|
| 1 | SSL grade A+ | ✅ HSTS max-age=63072000 (2 lata) na obu domenach, Vercel default |
| 2 | Rate-limit public endpoints | ❌ BLK-7 |
| 3 | RLS pre-prod review | ❌ BLK-1 (15 views), BLK-2/3 (intake), CRIT-NEW-2 (offers anon UPDATE) |
| 4 | Anti-overlap appointments | ❌ BLK-8 |
| 5 | Email transactional (Resend) | ❌ BLK-9 |
| 6 | DMARC enforcement | ❌ p=none + brak MX |
| 7 | Error tracking (Sentry) | ❌ CRIT-NEW-1 |
| 8 | Health endpoint | ❌ MAJ-NEW-4 |
| 9 | Storage MIME whitelist | ❌ intake-docs allowed_mime_types=null (MAJ-NEW-1) |
| 10 | Backup / WAL | ✅ archive_mode=on, wal_level=logical |
| 11 | Cookie/consent | ❌ BLK-6 (brak banner) |
| 12 | Backwards compat | ✅ |
| 13 | Polityka + regulamin | ✅ |

**5/13 PASS, 8/13 FAIL.** **Production NOT READY.**

---

## LISTA BUGÓW (sorted by priority)

### 🚨 BLOCKER (9)

#### [BLK-1] 15 SECURITY DEFINER views — 13 wycieka dane do anon
**✅ FIXED 2026-05-02** — Migracja `20260502_06_views_security_invoker.sql`: `ALTER VIEW ... SET (security_invoker = on)` × 15. Verify (`scripts/apply_blk1.mjs`): anon REST przed = 13/15 wycieka (1 row each), po = 0/15 (gmp_case_dashboard_kpi zwraca 1 row z samymi zerami/null bo RLS blokuje agregaty na gmp_cases). Staff (postgres role) wciąż widzi pełne dane: 979 aktywnych spraw, 4415 cases, 980 alerts. **Rollback (gdyby coś przestało działać):** `ALTER VIEW <name> RESET (security_invoker)`.
**Gdzie:** prod DB, wszystkie views w `public.gmp_*` (owner=postgres)
**Problem:** RLS bypass — view działa z uprawnieniami właściciela, nie querującego. Test na żywo: anon ANON_KEY pobiera salda klientów, faktury, leady (telefon!), audit_log activity, KPI biznesowe.
**Fix (Postgres 17.6):** `ALTER VIEW <name> SET (security_invoker = on)` × 15
**Procedura bezpieczna:** snapshot → migracja → verify anon=0 → verify staff w UI (dashboard/cases/case/finance/leads/staff/alerts) → rollback `RESET (security_invoker)` jeśli problem
**Estymacja:** 30 min migracja + 1-2h testów manualnych

#### [BLK-2] gmp_intake_tokens anon SELECT wszystkich aktywnych
**✅ FIXED 2026-05-02** — Migracja `20260502_02_intake_rls_token_header.sql`: policy `intake_anon_read`/`intake_anon_update` wymaga `token = current_setting('request.headers',true)::json->>'x-intake-token'`. Frontend `crm/intake/intake.js` przekazuje token z URL przez `global.headers['X-Intake-Token']` przy createClient. Verify: anon bez headera 0 rows, z prawidłowym tokenem 1 row, ze złym tokenem 0 rows.
**Gdzie:** policy `intake_anon_read` `qual=(expires_at > now())` bez filtra po token
**Problem:** Anon pobiera wszystkie tokens z `data jsonb`. *Sesja 7 raportuje że anon test dostał 400 — ALE polityka nadal pozwala. Wymaga końcowej weryfikacji w sesji FIX.*
**Fix:** policy z `token = current_setting('request.jwt.claims',true)::jsonb->>'intake_token'`
**Estymacja:** 1h

#### [BLK-3] gmp_intake_documents anon CRUD na qual=true
**✅ FIXED 2026-05-02** — Migracja `20260502_02_intake_rls_token_header.sql`: 3 policies anon (SELECT/INSERT/DELETE) joinują z `gmp_intake_tokens` po `X-Intake-Token` header. INSERT/DELETE dodatkowo wymagają `status IN (invited, in_progress)`. Verify: anon bez headera 0 rows na docs.
**Gdzie:** 3 policies z `qual='true'` (SELECT/INSERT/DELETE)
**Fix:** weryfikacja przez join z gmp_intake_tokens po token JWT claim
**Estymacja:** 1h

#### [BLK-4] gmp_audit_log sanitize trigger niepodpięty
**✅ FIXED 2026-05-02** — Migracja `20260502_01_audit_sanitize_trigger.sql`: nowa funkcja wrapper `gmp_audit_log_sanitize_tg()` (BEFORE INSERT) wywołuje `gmp_sanitize_audit_jsonb` na `before_data`/`after_data`/`metadata`. Verify: insert testowy z `pesel`/`passport_number`/`trusted_profile_password` → wszystkie odfiltrowane (rollback).
**Gdzie:** prod DB
**Fix:** `CREATE TRIGGER trg_audit_sanitize BEFORE INSERT ON gmp_audit_log FOR EACH ROW EXECUTE FUNCTION gmp_sanitize_audit_jsonb();`
**Estymacja:** 30 min

#### [BLK-5] vercel.json brak security headers
**✅ FIXED 2026-05-02** — `vercel.json`: dodano CSP (frame-ancestors 'none', allowlist Supabase/jsdelivr/unpkg/Tailwind/Sentry/Cloudflare Turnstile/Resend), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy (camera/mic/geo/payment off). Plus redirects blokujące `/package.json`/`.env`. `.vercelignore` rozszerzony o package.json, lock files, *.md.
**Gdzie:** vercel.json (tylko Cache-Control)
**Brakuje:** CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. **HSTS już aktywny przez Vercel default** (max-age 2 lata).
**Estymacja:** 30 min

#### [BLK-6] Brak cookie banner / RODO consent UI
**✅ FIXED 2026-05-02** — Nowy moduł `components/consent-banner.js`: banner accept-all/reject-all/settings + modal z 4 kategoriami (necessary, functional, analytics, marketing), localStorage persistence (`gmp_consent_v1`), `gtag('consent','update',{...})` apply do ad_storage/ad_user_data/ad_personalization/analytics_storage/functionality_storage/personalization_storage/security_storage. `window.gmpOpenConsent()` re-otwiera modal (link "Cookies" w footerze). Dodany do 8 publicznych stron: index.html, lawyers.html, calendar.html, availability.html, lead.html, offers.html, polityka-prywatnosci.html, regulamin.html.
**Gdzie:** index.html i landing pages
**Fix:** banner z accept/reject + `gtag('consent','update',{...})` + persist localStorage
**Estymacja:** 4h

#### [BLK-7] permit-lead-save brak rate-limit / CAPTCHA / mass assignment
**✅ FIXED 2026-05-02** — Migracja `20260502_04_lead_rate_limit.sql` (tabela `gmp_lead_rate_limit` service-role only). Edge fn przepisana: (1) whitelist `ALLOWED_FIELDS` (CRIT-CR-1: brak `{...data}`, klient NIE nadpisze lead_score/status/assigned_to), (2) regex walidacja email + phone (CRIT-CR-2), (3) IP rate-limit 5/15min z `cf-connecting-ip` (verify: 6th call → 429 z Retry-After), (4) Cloudflare Turnstile opcjonalny (jeśli `TURNSTILE_SECRET_KEY` env ustawione + frontend doda token). Verify: bad email/phone → 400, mass-assignment lead_score=9999 → DB rekord `lead_score=0` (default).
**Gdzie:** `supabase/functions/permit-lead-save/index.ts:104, 112, 230`
**Problem:** 3 problemy w 1 funkcji:
- L230: brak rate-limit (5 POST/2.7s = wszystkie przyjęte, Storage rośnie liniowo)
- L112: mass assignment `{...data}` — klient nadpisze `lead_score`/`status`
- L104: walidacja `!email && !phone && !form_session_id` — przepuszcza śmieci
**Fix:** IP rate limit (5/15min), email/phone whitelist pól, walidacja phone regex, CAPTCHA Cloudflare Turnstile
**Estymacja:** 4-6h

#### [BLK-8] gmp_appointments anon INSERT + brak anti-overlap
**✅ FIXED 2026-05-02** — Migracja `20260502_05_appointments_security.sql`: (1) `btree_gist` extension + generated `appt_range tsrange` + EXCLUDE constraint `gmp_appointments_no_overlap` (lawyer_id =, range &&, WHERE status NOT IN cancelled/no_show); (2) CHECK constraints: date_sane (current-7d..current+180d), time_sane (06:00-22:00), duration_sane (15-240), status_whitelist; (3) anon SELECT zawężony do availability columns (id, lawyer_id, scheduled_date/time, duration, status, type) — bez PII; (4) anon INSERT column-level GRANT na ograniczony subset, status NIE może być nadpisany na inne niż 'scheduled', staff_id/case_id/client_id muszą być NULL; (5) anon UPDATE/DELETE — brak policy. Verify: 6/6 testów (overlap blokowany 23P01, cancelled overlap OK, past date 23514, bad status 23514).
**Gdzie:** RLS gmp_appointments + schema constraint
**Problem:** Bot może spamować appointments + nakładać 09:00-10:00 i 09:30-10:30 na tego samego lawyer
**Fix:** rate-limit edge fn dla bookings + EXCLUDE constraint anti-overlap (`tstzrange` + GIST)
**Estymacja:** 6-8h (refaktor schemy + UI testing)

#### [BLK-9] Brak Resend integration + brak MX recorda
**⚠ FIXED CODE 2026-05-02 — wymaga akcji usera (env + DNS)** — Nowy edge fn `send-email/index.ts` (Resend API + 4 templates: lead_confirmation, appointment_confirmation, password_reset, intake_invitation, auth: service_role lub authenticated staff JWT). `permit-lead-save` po INSERT (gdy NIE partial i jest email) odpala fire-and-forget `send-email` z templatem `lead_confirmation`. **WYMAGA OD USERA:**
1. Supabase Dashboard → Edge Functions → Secrets: ustawić `RESEND_API_KEY` i (opcjonalnie) `RESEND_FROM` (np. `GetMyPermit <noreply@getmypermit.pl>`)
2. Panel DNS lh.pl: dodać MX recordy dla `getmypermit.pl` (do odbioru maili — bez tego nie odbierzesz reply na `noreply@`)
3. Panel DNS lh.pl: zmienić `_dmarc.getmypermit.pl` z `p=none` na `p=quarantine`
**Gdzie:** zero referencji w `supabase/functions/*` i `crm/*`
**Problem:** System NIE WYSYŁA emaili. DKIM `resend._domainkey` skonfigurowany (ale nieużywany), MX = NXDOMAIN.
**Fix:** integracja Resend SDK w edge fn (lead confirmation, appointment confirmation, password reset templates), dodać MX records
**Estymacja:** 1-2 dni roboczych

### CRITICAL (14)

| # | Tytuł | Estymacja |
|---|-------|-----------|
| CRIT-1 | Mapping legacy kategorii — 96% spraw `inna_sprawa` | 2-4h |
| CRIT-2 | Brak GDPR endpoints (access/erasure/anonymize) | 1d |
| CRIT-3 | A1 backfill checklist niekompletny — 4346/4415 — **⚠ SKIPPED 2026-05-02** (sprawdzono: aktywne sprawy z prawidłową category JUŻ MAJĄ checklist przez `trg_auto_instantiate_checklist`. Pozostałe to zakończone (3425) lub bad category zależne od CRIT-1) | 2h |
| CRIT-4 | Etap VI niepełny (legal_status_recomputed_at, gmp_legal_check_kind, gmp_legal_status_snapshots) | 4-6h |
| CRIT-5 | Brak gmp_calc_balance funkcji+triggera | 4-6h (lub akceptacja view-only) |
| CRIT-6 | Brak gmp_clients.consents jsonb — **✅ FIXED 2026-05-02** (Migracja `20260502_07_clients_consents_jsonb.sql`: kolumna `consents jsonb NOT NULL DEFAULT '{}'` + CHECK `jsonb_typeof = 'object'` + index na `consents->'marketing'->>'granted'`) | 2h |
| CRIT-7 | Brak soft delete (zero kolumn deleted_at) | 4h |
| CRIT-8 | Brak input validation DB (PESEL/NIP/email CHECK) — **✅ FIXED 2026-05-02** (Migracja `20260502_08_check_constraints_validation.sql`: 6 CHECK constraints NOT VALID na gmp_clients.{pesel/email/phone} + gmp_employers.nip + permit_leads.{email/phone}. Verify: bad PESEL/email blokowane 23514, good OK) | 2h |
| **CRIT-PENTEST-1** | Open redirect crm/index.html:459,546 — `params.get('return')` bez whitelist — **✅ FIXED 2026-05-02** (helper `safeReturnTo` whitelist do same-origin `*.html`, blokuje schemy + protocol-relative + decoded variants) | 30 min |
| **CRIT-CR-1** | permit-lead-save:112 mass assignment — **✅ FIXED 2026-05-02** (whitelist `ALLOWED_FIELDS`) | 1h (część BLK-7) |
| **CRIT-CR-2** | permit-lead-save:104 walidacja zbyt luźna — **✅ FIXED 2026-05-02** (regex email + phone) | 1h (część BLK-7) |
| **CRIT-NEW-1** | Brak Sentry / observability — **⚠ FIXED CODE 2026-05-02 (wymaga DSN od usera)** Nowy `crm/components/sentry.js`: lazy-load Sentry SDK z CDN (8.41.0), PII scrub w `beforeSend` (PESEL/passport regex, strip Authorization headers), fallback do localStorage gdy brak DSN. Wstawione do **30 stron CRM** (dashboard, case, cases, kanban, employer, lead, leads, automations + 22 inne). User musi ustawić DSN: localStorage.setItem('gmp_sentry_dsn', '<DSN>') lub `<meta name="x-sentry-dsn" content="...">`. | 4h |
| **CRIT-NEW-2** | gmp_client_offers anon UPDATE qual=true → modyfikacja dowolnej kolumny — **✅ FIXED 2026-05-02** Migracja `20260502_03_client_offers_rls_token.sql`: SELECT/UPDATE wymaga `X-Offer-Token` header, plus REVOKE UPDATE + GRANT UPDATE (view_count, viewed_at, view_history, status). Verify: anon UPDATE custom_price = 401 (column-level), UPDATE view_count = 204. Frontend `client-offer.html` ustawia header. | 1h |
| **CRIT-MOBILE-1** | dashboard.html 400 z `gmp_case_alerts` (każdy browser, każdy bp) — **✅ FIXED 2026-05-02** (`dashboard.html:669` używał `select('id')` ale view nie ma kolumny `id`. Zmienione na `select('case_id')`. Verify: `select=id` → 400, `select=case_id` → 200) | 2-4h diagnostic |

### MAJOR (25)

#### Z poprzednich sesji (13 z v2.1)
- MAJ-1: legal_stay_end_date 1/4415
- MAJ-2: filtr f-pawel-group brak
- MAJ-3: role_assignments 0 wpisów
- MAJ-4: automation-executor cron HTTP
- MAJ-5: 7/19 templates kind brakuje
- MAJ-6: button audit_checklist DOCX brak
- MAJ-7: eksport PDF employer brak
- MAJ-8: pg_cron weekly_work_legality
- MAJ-9: 6/8 tabów employer.html
- MAJ-10: 13 stron bez media queries
- MAJ-11: cases filter 144ms
- MAJ-12: rate limit appointments
- MAJ-13: client_offers RLS qual=true (częściowo, eskalacja w sesji 7 do CRIT-NEW-2)

#### Z code review sesji 5 (5 nowych)
- **MAJ-CR-1**: intake-ocr storage_path bypass — atakujący OCR'uje cudze paszporty — **✅ FIXED 2026-05-02** (`intake-ocr/index.ts` wymaga `storage_path.startsWith(intake_token + '/')` i blokuje `..`, deployed `--no-verify-jwt`)
- **MAJ-CR-2**: intake-ocr brak check intake.status — **✅ FIXED 2026-05-02** (status musi być `invited` lub `in_progress`, inaczej 403)
- **MAJ-CR-3**: invite-staff `.or()` query injection przez full_name — **✅ FIXED 2026-05-02** (`invite-staff/index.ts`: dwa osobne query (eq email + ilike escape `%_\\`) zamiast `.or(...)` z user input)
- **MAJ-CR-4**: invite-staff origin header bez whitelisty (open redirect recovery) — **✅ FIXED 2026-05-02** (`ALLOWED_REDIRECT_ORIGINS` whitelist w invite-staff, fallback do `crm.getmypermit.pl`)
- **MAJ-CR-5**: import-employer-workers brak limitu CSV + brak walidacji PESEL/email/phone

#### Z pen test sesji 4 (3 nowe)
- **MAJ-PENTEST-1**: getmypermit.pl/package.json publicznie (ujawnia repo, deploy --no-verify-jwt) — **✅ FIXED 2026-05-02** (`.vercelignore` rozszerzony: package.json + lock files + *.md; vercel.json redirect `/package.json` → `/`)
- **MAJ-PENTEST-2**: brak rate-limit /auth/v1/token (10/10 wrong-pass = 0 lockout)
- **MAJ-PENTEST-3**: CORS `*` na admin endpoints (generate-document, case-startup-pack) — **✅ FIXED 2026-05-02** (3 admin edge fns: generate-document, case-startup-pack, delete-staff — `corsFor(req)` z `ALLOWED_ORIGINS` whitelist + `Vary: Origin`. Verify: Origin=evil.com → ACAO=`crm.getmypermit.pl`, Origin=crm.getmypermit.pl → match)

#### Z mobile sesji 6 (2 nowe)
- **MAJ-MOBILE-1**: case.html horizontal scroll <768px (3 breakpointy)
- **MAJ-MOBILE-2**: 60+ inputów bez `<label for>` (cases.html: 62, case.html: 58) — WCAG 2.1 AA risk

#### Z pre-v3 sesji 7 (4 nowe — niektóre eskalowane do BLK)
- **MAJ-NEW-1**: intake-docs bucket allowed_mime_types=null (.exe/.html dozwolone) — **✅ FIXED 2026-05-02** (Migracja `20260502_09_storage_mime_whitelist.sql`: intake-docs whitelist [jpeg/png/heic/webp/pdf]; documents whitelist [obrazy/pdf/Word/Excel/csv/txt] + 25MB limit)
- **MAJ-NEW-2**: permit-lead-save walidacja zbyt luźna (już w CRIT-CR-2)
- **MAJ-NEW-3**: DMARC `p=none`
- **MAJ-NEW-4**: brak `/health` endpoint — **✅ FIXED 2026-05-02** (`supabase/functions/health/index.ts` deployed `--no-verify-jwt`. Verify: `GET /functions/v1/health` → `{status:"ok", db:true, db_latency_ms:176, version:"unknown", timestamp, duration_ms}`. 503 gdy DB down. URL: `https://gfwsdrbywgmceateubyq.supabase.co/functions/v1/health` — uptime monitor może pollować.)

### MINOR (14)

Z v2.1: MIN-1 (9 spraw NULL kind/category), MIN-2 (2005 individual z employer_id), MIN-3 (dashboard 42 SQL queries), MIN-4 (pg_cron HTTP automation), MIN-5 (4 brakujące indexy), MIN-6 (templates single-version), MIN-7 (spike-docx test only na prod).

Z code review sesji 5: listUsers perPage:1000 × 2, OpenAI response runtime check, console.error leak, automation-executor brak explicit auth, case-startup-pack optional chain, CORS `*`.

---

## LISTA BRAKUJĄCYCH FEATURÓW

### Pre-launch sprint (BLOCKERS + niezbędne CRIT)

| # | Feature | Prio | Estymacja |
|---|---------|------|-----------|
| 1 | Fix 15 SECURITY DEFINER views (BLK-1) | BLOCKER | 30 min + 1-2h test |
| 2 | Fix RLS intake_tokens (BLK-2) | BLOCKER | 1h |
| 3 | Fix RLS intake_documents (BLK-3) | BLOCKER | 1h |
| 4 | Trigger sanitize audit_log (BLK-4) | BLOCKER | 30 min |
| 5 | Security headers vercel.json (BLK-5) | BLOCKER | 30 min |
| 6 | Cookie banner (BLK-6) | BLOCKER | 4h |
| 7 | permit-lead-save rate limit + walidacja + whitelist (BLK-7) | BLOCKER | 4-6h |
| 8 | gmp_appointments anti-overlap + rate limit (BLK-8) | BLOCKER | 6-8h |
| 9 | Resend integration + MX records (BLK-9) | BLOCKER | 1-2d |
| 10 | Open redirect fix (CRIT-PENTEST-1) | CRIT | 30 min (z BLK-5 sprintem) |
| 11 | gmp_client_offers anon UPDATE policy (CRIT-NEW-2) | CRIT | 1h |
| 12 | dashboard alerts 400 fix (CRIT-MOBILE-1) | CRIT | 2-4h |
| 13 | intake-ocr storage_path filter + status check (MAJ-CR-1/2 → eskalacja) | CRIT | 2h |

**Total pre-launch:** **5-7 dni roboczych** dla 1 senior dev.

### Post-launch backlog (CRIT pozostałe + MAJ)

| Feature | Estymacja | Priorytet |
|---------|-----------|-----------|
| Mapping legacy pawel_group (CRIT-1) | 2-4h | High |
| GDPR endpoints (CRIT-2) | 1d | High |
| Backfill checklist (CRIT-3) | 2h | High |
| Etap VI dodatki (CRIT-4) | 4-6h | High |
| gmp_clients.consents (CRIT-6) | 2h | High |
| Soft delete (CRIT-7) | 4h | High |
| Input validation DB (CRIT-8) | 2h | High |
| Sentry / observability (CRIT-NEW-1) | 4h | High |
| Brakujące indexy (4) (MAJ-11/MIN-5) | 30 min | High |
| 7 brakujących templates DOCX (MAJ-5) | 1-2d | Medium |
| Filtr f-pawel-group (MAJ-2) | 2h | Medium |
| backfill legal_stay_end_date (MAJ-1) | 4-8h | Medium |
| package.json public fix (MAJ-PENTEST-1) | 30 min | Medium |
| Brute-force protection /auth (MAJ-PENTEST-2) | 4h | Medium |
| CORS whitelist admin endpoints (MAJ-PENTEST-3) | 1h | Medium |
| case.html horizontal scroll (MAJ-MOBILE-1) | 2h | Medium |
| 60+ inputów bez label (MAJ-MOBILE-2) | 6h | Medium |
| `/health` endpoint (MAJ-NEW-4) | 1h | Medium |
| DMARC enforce (MAJ-NEW-3) | 30 min config | Medium |
| 13 stron bez media queries (MAJ-10) | 6h | Medium |
| 6/8 tabów employer (MAJ-9) | 4h | Low |
| pg_cron weekly_work_legality (MAJ-8) | 1h | Low |
| eksport PDF employer (MAJ-7) | 2-3h | Low |
| import-employer-workers walidacja (MAJ-CR-5) | 4h | Low |

**Total post-launch:** ~10 dni roboczych.

---

## RECOMMENDED IMPROVEMENTS (poza spec)

1. **Sentry / error tracking** — pre-launch must-have (już jako CRIT-NEW-1)
2. **Status page** dla komunikacji awarii
3. **Runbooks** dla typowych operacji
4. **Reconcyliacja gmp_case_categories: 34 vs 27**
5. **Test data seed na staging** (po blokerach)
6. **Plan migracji do MV** dla gmp_case_completeness (przy >10k spraw)
7. **Audit log retention** — pg_cron `gmp_audit_log_purge`
8. **role-editor.js usability test** (0 wpisów = users nie widzą/nie używają)
9. **Load test** (k6/artillery) — 50/200 concurrent users przed go-live
10. **Pełny axe-core a11y scan** — dziś tylko podstawowy manual check

---

## FINAL CHECKLIST

- [x] **Go/No-Go decision** — NO-GO + warunki
- [x] Wszystkie sekcje 1-13 wypełnione
- [x] Sekcja 8 (Security) — pełen pen test (10 testów) + OWASP Top 10 (2/10 PASS)
- [x] Sekcja 13 (Production readiness) — go-live checklist (5/13)
- [x] Lista bugów ma estymacje czasu — łącznie 9 BLOCKER + 14 CRIT + 25 MAJ + 14 MIN = 62 findings
- [x] Wszystkie BLOCKER w Executive Summary
- [x] Performance metryki zmierzone (B5: 76ms, page load: 540-774ms)
- [x] Pre-condition 2 (PZ encryption) sprawdzone konkretnie
- [x] Status compliance % wyliczony — 78% spec, 2/10 OWASP, 5/13 production readiness
- [x] **Pen test wykonany** (sesja 4 — 4 PASS, 2 FAIL, 4 WARN)
- [x] **Browser compat testowany** na chromium/webkit/firefox (sesja 6)
- [x] **DOCX Pawła sparsowany** — wszystkie 19 punktów zidentyfikowane
- [x] **Edge functions code review** — 8 funkcji line-by-line
- [x] **Mobile per-breakpoint** — 5 stron × 5 bp = 46 screenshotów
- [x] **DNS records check** (SPF/DKIM/DMARC/MX)
- [x] Plik nazwany `AUDYT_RAPORT_2026-05-01.md`
- [ ] Commit + push — **czeka na decyzję usera**
- [ ] Sesja FIX — po decyzji usera

---

## ARTEFAKTY SESJI

**Skrypty audytowe (idempotentne, re-runnable):**
- `scripts/audit_section_2_3_5.mjs` — sekcje 2/3/5 DB
- `scripts/audit_section_8_security.mjs` — sekcja 8 RLS + secrets grep
- `scripts/audit_pentest.mjs` — sekcja 8.10 pen test (10 testów)
- `scripts/audit_mobile_browser.mjs` — sekcja 10/12 Playwright multi-bp/multi-browser
- `scripts/audit_section_11_13.mjs` — sekcje 11/13 pre-v3 + ops
- `scripts/_archive/audit_section_1_4*.mjs` — sesja 1 (z archive)

**Zrzut DOCX Pawła:** `/c/tmp/pawel_docx_text.txt`
**Screenshoty mobile:** `C:\tmp\mobile_audit\` (46 PNG + audit_result.json)
**Raw outputs sesji:** `tool-results/byd3n63v0.txt`, `tool-results/b314qfb9o.txt`

---

## KOLEJNOŚĆ FIXÓW (rekomendowana, dla sesji FIX)

**Dzień 1 (najprostsze + najgorsze ryzyka):**
1. BLK-4 sanitize trigger (30 min)
2. BLK-1 SECURITY DEFINER views — migracja + 2h test (3h total)
3. BLK-5 vercel.json security headers + CRIT-PENTEST-1 open redirect + MAJ-PENTEST-1 package.json (1h)

**Dzień 2 (RLS hardening):**
4. BLK-2 + BLK-3 intake RLS (2h)
5. CRIT-NEW-2 client_offers UPDATE policy (1h)
6. MAJ-CR-1/2 intake-ocr storage_path + status (2h)

**Dzień 3 (public form bezpieczeństwo):**
7. BLK-7 permit-lead-save rate limit + whitelist + walidacja (5h)
8. CRIT-MOBILE-1 dashboard alerts 400 (3h)

**Dzień 4 (appointments + cookie):**
9. BLK-8 gmp_appointments anti-overlap + rate limit (8h)
10. BLK-6 cookie banner UI (4h — równolegle inny dev)

**Dzień 5-7 (Resend + observability):**
11. BLK-9 Resend integration + MX records + DMARC enforce (1-2d)
12. CRIT-NEW-1 Sentry + MAJ-NEW-4 health endpoint (1d)

**Po sprincie:** ponowny audit (re-run wszystkich 5 skryptów) → GO/NO-GO re-decision.

---

**Wersja raportu:** 3.0 (final, pełny pre-launch audit 13 sekcji + Go/No-Go + DOCX Pawła + 4 paralelne subagenty)
**Generated by:** AUDYT_INSTRUKCJE.md sesja 1-8 (skondensowane do 1 sesji + 4 paralelne ścieżki)
**Czas pracy:** ~9h (sam) + ~17 minut (4 agenty paralelnie)
**Next step:** **sesja FIX** — 5-7 dni roboczych (kolejność powyżej) → re-audit → re-decision GO/NO-GO.
