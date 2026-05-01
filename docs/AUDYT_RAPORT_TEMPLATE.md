# RAPORT AUDYTU WDROŻENIA — GetMyPermit CRM

**Data wykonania:** 2026-MM-DD
**Wykonał:** Claude (sesja audytowa)
**Czas pracy:** XX godzin (XX sesji)
**Spec źródłowa:** `PAWEL_ROADMAP_v3.md` v3.2 (lokalnie)
**Plan audytu:** `docs/AUDYT_PLAN.md`

---

## EXECUTIVE SUMMARY

> Wypełnić po skończonym audycie. 5-10 zdań.

- Total findings: ___ (Critical: __, Major: __, Minor: __)
- Spec compliance: __% (DoD wykonane: __ z __)
- Pre-conditions status: __ z 3 (z czego krytyczne: __)
- Performance status: ___ (avg page load __ms, slowest endpoint ___)
- RODO compliance: ___ (PZ encryption: ___, audit log sanitization: ___)
- Top 3 critical to fix: 1) ___, 2) ___, 3) ___
- Recommended next sprint: ___ items, est ___ days

---

## 1. STATUS WYMAGAŃ PAWŁA

### 1.1 Filozofia (zasady nadrzędne — pkt 18)

| # | Zasada | Status | Notatki |
|---|--------|--------|---------|
| 1 | Każdy cudzoziemiec = własna sprawa | ⬜ | |
| 2 | Conditional UI | ⬜ | |
| 3 | Workflow "Co teraz" | ⬜ | |
| 4 | Audyt PDF per kategoria | ⬜ | |
| 5 | Backfill istniejących danych | ⬜ | |

### 1.2 Punkty 1-19 dokumentu Pawła

| Pkt | Tytuł | Etap | Status | Findings |
|-----|-------|------|--------|----------|
| 1 | ___ | ___ | ⬜ | |
| 2 | ___ | ___ | ⬜ | |
| 3 | Kategorie sprawy (7 grup) | I | ⬜ | |
| 4 | Conditional UI | I | ⬜ | |
| 5 | Etapy workflow | I | ⬜ | |
| 6 | ___ | ___ | ⬜ | |
| 7 | ___ | ___ | ⬜ | |
| 8 | Elektroniczne złożenie | III | ⬜ | |
| 9 | Dane proceduralne | IV | ⬜ | |
| 10 | Opłaty | II-A/III | ⬜ | |
| 11 | Legalność pobytu/pracy | VI | ⬜ | |
| 12 | Role w sprawie | II-C | ⬜ | |
| 13 | Pracodawca jako grupa | V | ⬜ | |
| 14 | Wspólne zadania grupy | V | ⬜ | |
| 15 | ___ | ___ | ⬜ | |
| 16 | ___ | ___ | ⬜ | |
| 17 | ___ | ___ | ⬜ | |
| 18 | Filozofia (zasady) | wszędzie | ⬜ | (patrz 1.1) |
| 19 | Kontrola legalności (NEW) | I/VI | ⬜ | |

### 1.3 Mapping danych

| Mapping | Status | Notatki |
|---------|--------|---------|
| 7 grup → `pawel_group` | ⬜ | |
| Role w sprawie (5 typów) | ⬜ | |
| Etapy → `gmp_case_stage` | ⬜ | |

---

## 2. STATUS DOD ETAPÓW

| Etap | Status overall | DoD pass / total | Krytyczne braki |
|------|---------------|------------------|------------------|
| 0.5 — Spike + audit | ⬜ | __/4 | |
| I — Fundament + nazewnictwo | ⬜ | __/9 | |
| II-A — Generator dokumentów | ⬜ | __/10 | |
| II-B — Checklisty | ⬜ | __/8 | |
| II-C — Wizard + role | ⬜ | __/7 | |
| III — Elektroniczne złożenie | ⬜ | __/11 | |
| IV — Procedural data | ⬜ | __/8 | |
| V — Pracodawcy/grupy | ⬜ | __/8 | |
| VI — Legalność + Kanban | ⬜ | __/9 | |
| VII — Automatyzacje (MVP) | ⬜ | __/6 | |

### Etap 0.5 — szczegóły
> Wypełnij DoD checklist z planu sekcji 2.1.

### Etap I — szczegóły
> ...

(podobnie dla każdego etapu)

---

## 3. STATUS CROSS-CHECKS

### 3.1 Bezpieczeństwo (A1-A8)

| Code | Opis | Status | Test result | Notatki |
|------|------|--------|-------------|---------|
| A1 | Backfill checklist 5077 spraw | ⬜ | | |
| A2 | Backfill e-submission | ⬜ | | |
| A3 | Edge functions z --verify-jwt | ⬜ | | |
| A4 | Trigger spójności statusów dokumentów | ⬜ | | |
| A5 | Versioning szablonów DOCX | ⬜ | | |
| A6 | RPC `gmp_get_next_steps` | ⬜ | | |
| A7 | Enforce zgody RODO | ⬜ | | |
| A8 | Race condition guard case-startup-pack | ⬜ | | |

### 3.2 Spójność danych (B1-B14)

| Code | Opis | Status | Notatki |
|------|------|--------|---------|
| B1 | Ujednolicenie kategorii | ⬜ | |
| B2 | Default opłaty pc_praca | ⬜ | |
| B3 | gmp_payment_plans | ⬜ | |
| B4 | Trigger gmp_calc_balance | ⬜ | |
| B5 | Performance gmp_case_completeness < 200ms | ⬜ | EXPLAIN ANALYZE: ___ ms |
| B6 | PZ encryption (Pre-condition Etap III) | ⬜ | |
| B7 | Daty proceduralne | ⬜ | |
| B8 | Auto-zmiana stage po wysłaniu | ⬜ | |
| B9 | gmp_audit_log sanitization | ⬜ | |
| B10 | Pracodawca 8 tabów (mamy 6) | ⬜ | |
| B11 | gmp_tasks.group_id NULLABLE z CHECK | ⬜ | |
| B12 | gmp_case_work_legality 1:1 | ⬜ | |
| B13 | Indexy wydajnościowe | ⬜ | |
| B14 | Sekcja "Co teraz" | ⬜ | |

### 3.3 Logika biznesowa (C1-C9)

> Tabela podobna do A i B.

### 3.4 Decyzje designerskie (D1-D6)

> Tabela podobna.

### 3.5 Dashboard / KPI (E1-E6)

> Tabela podobna.

---

## 4. STATUS PRE-CONDITIONS

| # | Pre-condition | Status | Notatki |
|---|--------------|--------|---------|
| 1 | Test data + audit raport (Etap 0.5) | ⬜ | |
| 2 | PZ encryption (przed Etapem III) | ⬜ ODŁOŻONE | Liczba wpisów w `gmp_trusted_profile_credentials`: ___. **Krytyczne jeśli > 0!** |
| 3 | Audit `gmp_tasks.case_id` NOT NULL → NULL (przed Etapem V) | ⬜ | |

---

## 5. AUDYT DB

### 5.1 Migracje

```
Total migracji w supabase/migrations/: ___
Wdrożonych na prod: ___ z ___
Brakujących: ___
```

Lista brakujących (jeśli są):
- ___

### 5.2 Tabele

```
Łącznie tabel `gmp_*`: ___
Łącznie views `gmp_*`: ___
```

Brakujące lub niezgodne ze spec:
- ___

### 5.3 Triggery

| Trigger | Tabela | Działa? | Notatki |
|---------|--------|---------|---------|
| gmp_audit_sanitize | gmp_audit_log | ⬜ | |
| gmp_calc_balance | gmp_payments | ⬜ | |
| gmp_after_submit_update_case | gmp_e_submission_status | ⬜ | |
| gmp_sync_zalacznik_signed_status | gmp_documents | ⬜ | |
| gmp_check_employer_consent | gmp_documents | ⬜ | |
| gmp_remind_procedural_data | gmp_cases | ⬜ | |
| gmp_update_legal_stay_status | gmp_cases | ⬜ | |
| gmp_update_work_status | gmp_case_work_legality | ⬜ | |
| gmp_automation_trigger_stage_change | gmp_cases | ⬜ | |
| gmp_automation_trigger_decision | gmp_cases | ⬜ | |
| gmp_ensure_e_submission_status | gmp_cases | ⬜ | |

### 5.4 RLS Policies

| Tabela | Policy | Działa? | Test result |
|--------|--------|---------|-------------|
| gmp_cases | staff_cases | ⬜ | |
| gmp_clients | staff_clients | ⬜ | |
| gmp_audit_log | (special) | ⬜ | |
| gmp_trusted_profile_credentials | (special, log access) | ⬜ | |
| ... | ... | ⬜ | |

### 5.5 pg_cron jobs

| Job | Schedule | Last run | Status |
|-----|----------|----------|--------|
| gmp_legal_status_nightly | 0 2 * * * | ___ | ⬜ |
| gmp_daily_completeness_refresh | (jeśli MV) | ___ | ⬜ |
| gmp_weekly_work_legality_reminders (E1) | ? | ___ | ⬜ |
| automation-executor (HTTP cron) | ? | ___ | ⬜ MISSING |

### 5.6 Indexy

```
Łącznie idx_gmp_*: ___
Krytyczne brakujące: ___
```

---

## 6. AUDYT EDGE FUNCTIONS

| Funkcja | Deployed | --verify-jwt | Działa | Avg response | Notatki |
|---------|----------|--------------|--------|--------------|---------|
| generate-document | ⬜ | ⬜ | ⬜ | ___ ms | |
| case-startup-pack | ⬜ | ⬜ | ⬜ | ___ ms | |
| import-employer-workers | ⬜ | --no-verify | ⬜ | ___ ms | |
| automation-executor | ⬜ | --no-verify | ⬜ | ___ ms | |
| intake-ocr | ⬜ | ? | ⬜ | ___ ms | |
| invite-staff | ⬜ | ⬜ | ⬜ | ___ ms | |
| lead-fallback-replay | ⬜ | --no-verify | ⬜ | ___ ms | |
| permit-lead-save | ⬜ | --no-verify | ⬜ | ___ ms | |
| spike-docx | ⬜ | --no-verify | ⬜ | ___ ms | (test only — można usunąć) |
| delete-staff | ⬜ | ⬜ | ⬜ | ___ ms | |

---

## 7. AUDYT UI/UX PER STRONA

### 7.1 dashboard.html
- Status overall: ⬜
- Bugs found: ___
- Notatki: ___

### 7.2 cases.html
- Status overall: ⬜
- Filter persistence: ⬜
- Pagination: ⬜
- Bulk actions: ⬜
- Bugs found: ___

### 7.3 case.html (NAJWAŻNIEJSZA)
- Status overall: ⬜
- Tab Overview: ⬜
- Tab Procedura (checklist + e-submission): ⬜
- Tab Dokumenty (3 sub-taby): ⬜
- Tab Finanse: ⬜
- Tab Aktywność (3 sub-taby): ⬜
- Tab Dane (z sekcjami: Grupy, Role, Legalność, Procedural data, Daty): ⬜
- Conditional UI (per party_type/kind/submission_method): ⬜
- Bugs found: ___

### 7.4 case-new.html (Wizard)
- Status overall: ⬜
- 5 ekranów end-to-end: ⬜
- Walidatory PESEL/NIP: ⬜
- Save draft: ⬜
- Bugs found: ___

### 7.5 employer.html
- Status overall: ⬜
- 6 tabów: ⬜
- Search w tabie: ⬜
- Bugs found: ___

(podobnie dla wszystkich pozostałych stron — patrz `AUDYT_PLAN.md` § 7.1 lista 28 stron)

---

## 8. AUDYT BEZPIECZEŃSTWA

### 8.1 RLS test (4 role)

| Rola | Sidebar pages | Cases visible | Audit log access | PZ creds access | Status |
|------|---------------|---------------|------------------|-----------------|--------|
| anon | __ pages | __ rows | ⬜ | ⬜ | ⬜ |
| staff | __ pages | __ rows | ⬜ | ⬜ | ⬜ |
| admin | __ pages | __ rows | ⬜ | ⬜ | ⬜ |
| owner | __ pages | __ rows | ⬜ | ⬜ | ⬜ |

### 8.2 JWT verification per edge function

> Patrz tabela w sekcji 6.

### 8.3 Audit log sanitization

Test: UPDATE `gmp_cases` z PESEL → sprawdź `gmp_audit_log`:
- PESEL pokazany w cleartext: ⬜ (BAD)
- PESEL wymazany / zhashowany: ⬜ (GOOD)

### 8.4 RODO compliance

| Wymaganie | Status | Notatki |
|-----------|--------|---------|
| Soft delete klienta | ⬜ | |
| Eksport danych klienta (GDPR) | ⬜ | |
| Right to be forgotten | ⬜ | |
| Zgody RODO zapisane (consents) | ⬜ | |
| PZ encryption | ⬜ | |

---

## 9. AUDYT PERFORMANCE

### 9.1 SQL queries

| Query | Avg time | p95 | Target | Status |
|-------|----------|-----|--------|--------|
| `SELECT * FROM gmp_case_completeness LIMIT 100` | ___ ms | ___ ms | <200ms | ⬜ |
| `SELECT * FROM gmp_case_dashboard_kpi` | ___ ms | ___ ms | <100ms | ⬜ |
| `SELECT * FROM gmp_cases WHERE status='aktywna' ORDER BY date_last_activity LIMIT 50` | ___ ms | ___ ms | <50ms | ⬜ |

### 9.2 Page load times (Playwright)

| Strona | TTI | DOMContentLoaded | LCP | Requests | Page weight |
|--------|-----|------------------|-----|----------|-------------|
| dashboard.html | ___ ms | ___ ms | ___ ms | ___ | ___ KB |
| cases.html | ___ ms | ___ ms | ___ ms | ___ | ___ KB |
| case.html (z id) | ___ ms | ___ ms | ___ ms | ___ | ___ KB |
| ... | ... | ... | ... | ... | ... |

### 9.3 Edge function response times

| Funkcja | Avg | p95 | Status |
|---------|-----|-----|--------|
| generate-document | ___ ms | ___ ms | ⬜ |
| case-startup-pack | ___ ms | ___ ms | ⬜ |
| automation-executor | ___ ms | ___ ms | ⬜ |

---

## 10. AUDYT MOBILE + ACCESSIBILITY

### 10.1 Responsywność (per breakpoint)

| Strona | 1600px | 1024px | 768px | 600px | 390px | Notatki |
|--------|--------|--------|-------|-------|-------|---------|
| dashboard | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| cases | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| case | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | |
| ... | ... | ... | ... | ... | ... | |

### 10.2 Accessibility

| Kryterium | Pass | Notatki |
|-----------|------|---------|
| Wszystkie buttons mają tekst/aria-label | ⬜ | |
| Wszystkie form fields z labels | ⬜ | |
| Kontrast tekstu min 4.5:1 | ⬜ | |
| Tab navigation działa | ⬜ | |
| Focus visible | ⬜ | |
| Headings hierarchia | ⬜ | |

---

## LISTA BUGÓW (sorted by priority)

### CRITICAL (___)

#### [CRIT-1] Tytuł
**Gdzie:** ___
**Problem:** ___
**Reprodukcja:** ___
**Spec source:** ___
**Estymacja fix:** ___
**Sugerowany fix:** ___

(podobnie dla każdego)

### MAJOR (___)

#### [MAJ-1] Tytuł
...

### MINOR (___)

#### [MIN-1] Tytuł
...

---

## LISTA BRAKUJĄCYCH FEATURÓW

### Z roadmapy ale brak implementacji

| Feature | Etap | Estymacja | Priorytet | Notatki |
|---------|------|-----------|-----------|---------|
| pg_cron na automation-executor | VII | 30min | Major | Obecnie tylko on-demand |
| Raport zbiorczy DOCX dla grup (V.5) | V | 1d | Minor | Template + integracja |
| 2 ostatnie taby w employer.html (8 zamiast 6) | V (B10) | 4h | Minor | Status załącznika nr 1 + Rozliczenia |
| MV `gmp_case_completeness` jeśli p95 > 200ms | IV (B5) | 4h | Conditional | Zależy od testu |
| ... | ... | ... | ... | ... |

### Z dokumentu Pawła ale brak (jeśli znajdziesz)

| Feature | Pkt Pawła | Estymacja | Priorytet |
|---------|-----------|-----------|-----------|
| ... | ... | ... | ... |

---

## RECOMMENDED IMPROVEMENTS (poza spec)

> Sugerowane usprawnienia które nie są w roadmapie ale poprawią UX/quality.

1. ___
2. ___

---

## FINAL CHECKLIST przed wysłaniem raportu

- [ ] Wszystkie sekcje 1-10 wypełnione (nie tylko ⬜)
- [ ] Lista bugów ma estymacje czasu dla każdego
- [ ] Top 3 critical w Executive Summary
- [ ] Performance metryki zmierzone (nie ___ )
- [ ] Pre-condition 2 (PZ encryption) sprawdzone konkretnie
- [ ] Status compliance % wyliczony
- [ ] Plik nazwany `AUDYT_RAPORT_2026-MM-DD.md`
- [ ] Commit + push

---

**Wersja template:** 1.0
**Generated by:** AUDYT_INSTRUKCJE.md sesja 1
