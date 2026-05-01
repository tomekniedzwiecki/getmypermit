# RAPORT AUDYTU PRE-LAUNCH — GetMyPermit CRM

**Data wykonania:** 2026-MM-DD
**Wykonał:** Claude (sesja audytowa)
**Czas pracy:** XX godzin (XX sesji)
**Spec źródłowa:** `docs/spec/PAWEL_ROADMAP_v3.md` v3.2 (lokalnie)
**Plan audytu:** `docs/AUDYT_PLAN.md` (13 sekcji)

---

## 🚦 GO / NO-GO DECISION

> **KLUCZOWE: czy system jest gotowy na produkcyjne wdrożenie?**

**Decyzja:** ⬜ GO  /  ⬜ NO-GO  /  ⬜ GO z warunkami

**Uzasadnienie (2-3 zdania):** ___

**Blokery (jeśli NO-GO):** lista bugów priorytetu Blocker — patrz sekcja "Lista bugów" niżej.

**Warunki (jeśli GO z warunkami):** lista zadań DO ZROBIENIA przed/podczas go-live (np. "PZ encryption MUSI być wdrożone najpóźniej dzień przed pierwszym wpisem do gmp_trusted_profile_credentials").

---

## EXECUTIVE SUMMARY

> Wypełnić po skończonym audycie. 8-15 zdań.

- **Total findings:** ___ (Blocker: __, Critical: __, Major: __, Minor: __)
- **Spec compliance Pawła:** __% (DoD wykonane: __ z __)
- **Pre-conditions status:** __ z 3 (krytyczne braki: ___)
- **Security score:** __ /10 (OWASP Top 10 pass: __ / 10, RLS coverage: __%)
- **Performance status:** avg page load __ ms, slowest query ___ ms
- **RODO compliance:** ___ (PZ encryption: ___, audit log sanitization: ___, GDPR endpoints: ___)
- **Backwards compatibility:** __ regresji wykrytych
- **Production readiness:** __ z __ punktów checklist (sekcja 13)
- **Top 3 BLOCKER do fix:** 1) ___, 2) ___, 3) ___
- **Top 3 critical (po blockers):** 1) ___, 2) ___, 3) ___
- **Recommended pre-launch sprint:** ___ items, est ___ days
- **Recommended follow-up (post-launch):** ___ items, est ___ days

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

## 8. AUDYT BEZPIECZEŃSTWA — PRIORYTET KRYTYCZNY

### 8.1 RLS coverage

```
Wszystkie tabele gmp_* z RLS enabled: __ z __
Tabele BEZ RLS: ___ (KRYTYCZNE jeśli > 0)
Tabele bez ŻADNEJ policy: ___
```

### 8.1.1 Anonymous access test

| Tabela | Anon SELECT | Pass? |
|--------|-------------|-------|
| gmp_cases | __ rows | ⬜ |
| gmp_clients | __ rows | ⬜ |
| gmp_audit_log | __ rows | ⬜ |
| gmp_trusted_profile_credentials | __ rows | ⬜ |
| gmp_payments | __ rows | ⬜ |

### 8.1.2 Special tables policies

| Tabela | Wymagana policy | Faktyczna | Pass |
|--------|-----------------|-----------|------|
| gmp_audit_log | tylko admin SELECT, append-only | ___ | ⬜ |
| gmp_trusted_profile_credentials | log access przy każdym SELECT | ___ | ⬜ |
| gmp_intake_tokens | token-based, anon access | ___ | ⬜ |

### 8.2 JWT verification

| Funkcja | Powinno | Faktyczne | Test 401 bez auth | Pass |
|---------|---------|-----------|-------------------|------|
| generate-document | --verify-jwt | ___ | ⬜ | ⬜ |
| case-startup-pack | --verify-jwt | ___ | ⬜ | ⬜ |
| import-employer-workers | --verify-jwt | ___ | ⬜ | ⬜ |
| automation-executor | --no-verify-jwt | ___ | n/a | ⬜ |
| intake-ocr | --no-verify-jwt | ___ | n/a | ⬜ |
| invite-staff | --verify-jwt + admin check | ___ | ⬜ | ⬜ |
| delete-staff | --verify-jwt + admin check | ___ | ⬜ | ⬜ |
| permit-lead-save | --no-verify-jwt + rate limit | ___ | n/a | ⬜ |

### 8.3 OWASP Top 10 (2021)

| Kategoria | Status | Findings |
|-----------|--------|----------|
| A01 Broken Access Control | ⬜ | |
| A02 Cryptographic Failures (PZ encryption!) | ⬜ | |
| A03 Injection (SQL/XSS) | ⬜ | |
| A04 Insecure Design | ⬜ | |
| A05 Security Misconfiguration | ⬜ | |
| A06 Vulnerable Components (npm audit) | ⬜ | |
| A07 Authentication Failures | ⬜ | |
| A08 Software/Data Integrity | ⬜ | |
| A09 Logging Failures | ⬜ | |
| A10 SSRF | ⬜ | |

**Score:** __ /10 OWASP categories pass

### 8.4 Audit log sanitization

Test: UPDATE `gmp_cases` z PESEL `90010112345` →
- diff_data zawiera PESEL plaintext: ⬜ (BAD — BLOCKER!)
- diff_data wymazany/zhashowany: ⬜ (GOOD)

Test passwordów / secrets:
- ⬜ password nie w log
- ⬜ passport_number nie w log
- ⬜ secret_* nie w log

### 8.5 RODO/GDPR compliance

| Wymaganie | Status | Endpoint / mechanizm | Notatki |
|-----------|--------|---------------------|---------|
| Right to access (export danych) | ⬜ | ___ | |
| Right to erasure (zapomnienie) | ⬜ | ___ | |
| Right to rectification | ⬜ | UPDATE działa, audit log | |
| Data portability | ⬜ | format ___ | |
| Consent management | ⬜ | gmp_clients.consents jsonb? | |
| Pseudonimizacja PESEL w UI | ⬜ | maska XXX-XXX-X1234? | |
| Procedura naruszenia danych | ⬜ | dokument? | |
| Cookie banner | ⬜ | landing | |

### 8.6 Secrets management

| Check | Status |
|-------|--------|
| .env w .gitignore | ⬜ |
| `grep -r SUPABASE_SERVICE_ROLE_KEY` poza .env/scripts | ⬜ (musi 0) |
| Vercel env vars set | ⬜ |
| Supabase secrets set | ⬜ |
| Brak hardcoded credentials | ⬜ |

### 8.7 CORS

| Endpoint | Allow-Origin | Pass |
|----------|--------------|------|
| edge functions | ___ | ⬜ |
| PostgREST | ___ | ⬜ |

### 8.8 Input validation

| Pole | Walidacja | XSS test | Pass |
|------|-----------|----------|------|
| PESEL | 11 cyfr + checksum | n/a | ⬜ |
| NIP | 10 cyfr + checksum | n/a | ⬜ |
| Email | regex | n/a | ⬜ |
| Notes (free text) | escape przed render | `<script>alert(1)</script>` test | ⬜ |
| Search inputs | escape | `' OR 1=1--` test | ⬜ |

### 8.9 Permissions per role (4 role)

| Rola | Sidebar | Cases visible | Audit log | PZ creds | Delete | Admin features | Status |
|------|---------|---------------|-----------|----------|--------|----------------|--------|
| anon | __ stron | __ rows | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| staff | __ stron | __ rows | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| admin | __ stron | __ rows | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| owner | __ stron | __ rows | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

#### 8.9.2 IDOR test
- Staff A próbuje `?id=<UUID staff B sprawy>` → wynik: ⬜

### 8.10 Penetration test results

| Atak | Test | Pass |
|------|------|------|
| SQL injection w search | `' OR 1=1--` | ⬜ |
| XSS reflected (URL params) | `?id=<script>alert(1)</script>` | ⬜ |
| XSS stored (notes) | `<img src=x onerror=alert(1)>` | ⬜ |
| CSRF | SameSite cookie? | ⬜ |
| Clickjacking | X-Frame-Options? | ⬜ |
| Open redirect | `?redirect=evil.com` | ⬜ |
| Session fixation | new session ID po login? | ⬜ |
| Information disclosure | error 500 stack trace? .env dostępny? | ⬜ |
| Brute force login | 10 failed → lock? | ⬜ |

### 8.11 Backup + recovery

| Check | Status |
|-------|--------|
| Auto-backup włączony | ⬜ |
| Retention min 7 dni | ⬜ |
| Test restore wykonany | ⬜ |
| RTO estimate | ___ minut |
| RPO estimate | ___ godzin |

### 8.12 Monitoring + alerting

| Check | Status |
|-------|--------|
| Error tracking (Sentry?) | ⬜ |
| Uptime monitor | ⬜ |
| Database metrics alert | ⬜ |
| On-call procedure | ⬜ |

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

## 11. PRE-V3 FEATURES

### 11.1 Landing page

| Strona | Ładuje | Brak errors | Mobile OK | Linki OK | SEO OK | Status |
|--------|--------|-------------|-----------|----------|--------|--------|
| index.html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| lawyers.html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| calendar.html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| availability.html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| lead.html (public) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| offers.html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| client-offer.html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| client-offers.html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| polityka-prywatnosci.html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| regulamin.html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

**index.html:**
- Page weight: ___ KB
- Time to load (3G): ___ s
- ebook.pdf download flow: ⬜
- tracking.js firing: ⬜

### 11.2 Leads system

| Test | Status | Notatki |
|------|--------|---------|
| Form na index.html → permit-lead-save → permit_leads | ⬜ | |
| Lead widoczny w crm/leads.html | ⬜ | |
| Qualification checklist w lead.html | ⬜ | |
| Convert to case → gmp_cases utworzony | ⬜ | |
| Spam protection (rate limit) | ⬜ | |
| Walidacja form | ⬜ | |
| Dedup (ten sam email/phone) | ⬜ | |
| UTM params zapisane | ⬜ | |

### 11.3 Integracje zewnętrzne

| Integracja | Status | Notatki |
|------------|--------|---------|
| Resend mail | ⬜ | SPF: ___, DKIM: ___, DMARC: ___ |
| Google Analytics / Meta Pixel | ⬜ | |
| Cookie banner / RODO consent | ⬜ | |
| Supabase Storage buckets | ⬜ | document-templates, case-documents |

### 11.4 Calendar / Availability

| Test | Status |
|------|--------|
| Public availability anon access | ⬜ |
| Booking flow → email confirmation | ⬜ |
| Conflict detection | ⬜ |

### 11.5 Client offers

| Test | Status |
|------|--------|
| Generate offer z CRM | ⬜ |
| Klient otrzymuje link | ⬜ |
| Akceptacja/odrzucenie | ⬜ |
| Status syncuje się w CRM | ⬜ |

### 11.6 Pre-v3 strony CRM

| Strona | Ładuje | Filtry | Search | Bulk actions | Status |
|--------|--------|--------|--------|--------------|--------|
| dashboard.html | ⬜ | n/a | n/a | n/a | ⬜ |
| clients.html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| employers.html | ⬜ | ⬜ | ⬜ | n/a | ⬜ |
| payments.html | ⬜ | ⬜ | n/a | ⬜ | ⬜ |
| invoices.html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| receivables.html | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| tasks.html | ⬜ | ⬜ | n/a | ⬜ | ⬜ |
| appointments.html | ⬜ | ⬜ | n/a | n/a | ⬜ |
| submissions.html | ⬜ | ⬜ | n/a | n/a | ⬜ |
| work-permits.html | ⬜ | ⬜ | n/a | n/a | ⬜ |
| analytics.html | ⬜ | n/a | n/a | n/a | ⬜ |
| staff.html | ⬜ | n/a | ⬜ | ⬜ | ⬜ |
| admin.html | ⬜ | ⬜ | n/a | n/a | ⬜ |
| alerts.html | ⬜ | n/a | n/a | n/a | ⬜ |
| templates.html | ⬜ | n/a | ⬜ | n/a | ⬜ |

---

## 12. BACKWARDS COMPATIBILITY

### 12.1 Schema changes — stare dane wciąż działają

| Zmiana | Test | Status |
|--------|------|--------|
| gmp_tasks.case_id NULLABLE | Stare zadania mają case_id | ⬜ |
| gmp_documents.case_id NULLABLE | Stare dokumenty OK | ⬜ |
| Nowe enum values | Stare values w bazie | ⬜ |
| legal_stay_status backfill | Wszystkie wiersze | ⬜ |
| Triggery auto-fill | Stare UPDATE działa | ⬜ |

### 12.2 RPC + triggery z starymi danymi

| Funkcja | Działa dla starych | Status |
|---------|---------------------|--------|
| gmp_get_next_steps | ⬜ | |
| gmp_instantiate_checklist | ⬜ | |
| Triggery na gmp_cases UPDATE (10+) | ⬜ | |

### 12.3 Edge functions API contract

| Funkcja | Contract zachowany | Status |
|---------|-------------------|--------|
| permit-lead-save | ⬜ | |
| lead-fallback-replay | ⬜ | |
| intake-ocr | ⬜ | |

### 12.4 Browser compatibility

| Browser | Test | Status |
|---------|------|--------|
| Chrome / Edge | ⬜ | |
| Safari (macOS) | ⬜ | |
| Firefox | ⬜ | |
| Mobile Safari iOS | ⬜ | |
| Mobile Chrome Android | ⬜ | |

**Specific issues:**
- ESM imports w case.html (Safari ≥ 14): ⬜
- backdrop-filter (Firefox fallback): ⬜
- :has() selector (Safari 15.4+): ⬜

### 12.5 URL backwards compatibility

| Test | Status |
|------|--------|
| Stare bookmarki ?id= działają | ⬜ |
| ?preset= działają | ⬜ |
| Hash navigation działa | ⬜ |

---

## 13. PRODUCTION READINESS CHECKLIST

### 13.1 Infrastruktura

| Check | Status | Notatki |
|-------|--------|---------|
| Vercel plan limits OK | ⬜ | |
| Supabase plan limits OK | ⬜ | |
| DNS crm.getmypermit.pl → Vercel | ⬜ | |
| SSL A+ na ssllabs.com | ⬜ | |
| CDN aktywny | ⬜ | |
| DB auto-backup włączony | ⬜ | retention ___ dni |
| Test restore wykonany | ⬜ | |

### 13.2 Środowiska

| Check | Status |
|-------|--------|
| Production isolation (osobne projekty) | ⬜ |
| Brak test data na prod | ⬜ |
| Test data tylko staging/dev | ⬜ |

### 13.3 Performance pod obciążeniem

| Test | Wynik | Pass |
|------|-------|------|
| Load test 50 users | ___ | ⬜ |
| Stress test 200 users | ___ | ⬜ |
| Connection pool config | ⬜ | |
| Edge fn cold start < 1s | ___ ms | ⬜ |
| Page load p95 < 3s na 3G | ___ ms | ⬜ |
| TTFB < 500ms | ___ ms | ⬜ |

### 13.4 Security pre-launch

| Check | Status |
|-------|--------|
| Wszystkie checki sekcja 8 pass | ⬜ |
| PZ encryption (BLOKER jeśli > 0 wpisów) | ⬜ |
| npm audit: 0 high/critical | ⬜ |
| Secrets rotation w 30 dni | ⬜ |
| Pen test basic checki | ⬜ |
| GDPR DPIA | ⬜ |

### 13.5 Monitoring + Alerting

| Check | Status |
|-------|--------|
| Error tracking zainstalowany | ⬜ Tool: ___ |
| Uptime monitor | ⬜ Tool: ___ |
| DB metrics alerts | ⬜ |
| On-call procedure | ⬜ Person: ___ |

### 13.6 Disaster recovery

| Check | Status |
|-------|--------|
| Recovery procedure w docs/runbooks/ | ⬜ |
| Contact list | ⬜ |
| Rollback plan testowany | ⬜ |
| Point-in-time recovery test | ⬜ |

### 13.7 Legal / Compliance

| Check | Status |
|-------|--------|
| Polityka prywatności aktualna | ⬜ |
| Regulamin aktualny | ⬜ |
| Cookie banner + opt-out | ⬜ |
| Email footer (firma + unsubscribe) | ⬜ |
| Procedury naruszenia danych | ⬜ |

### 13.8 Komunikacja użytkowników

| Check | Status |
|-------|--------|
| User onboarding test | ⬜ |
| Help/FAQ aktualne | ⬜ |
| Email confirmations | ⬜ |
| In-app notyfikacje | ⬜ |
| Status page | ⬜ |

### 13.9 Operacyjne

| Check | Status |
|-------|--------|
| Runbooks dla typowych problemów | ⬜ |
| Schedule rotation kluczy | ⬜ |
| Logs retention strategy | ⬜ |
| Off-site backup | ⬜ |

### 13.10 Go-live checklist (dzień przed)

| Check | Status |
|-------|--------|
| Wszystkie blockery naprawione | ⬜ |
| Pre-conditions DONE | ⬜ |
| Backup przed go-live (snapshot) | ⬜ |
| Vercel deploy zafiksowany | ⬜ commit: ___ |
| DNS propagacja sprawdzona | ⬜ |
| Monitoring włączony | ⬜ |
| Team poinformowany | ⬜ |
| Rollback komenda gotowa | ⬜ |
| Komunikat dla pierwszych userów | ⬜ |

**Go-live ready:** ⬜ TAK / ⬜ NIE

---

## LISTA BUGÓW (sorted by priority)

### BLOCKER (___)

> Uniemożliwia go-live. NAJPILNIEJSZE.

#### [BLK-1] Tytuł
**Gdzie:** ___
**Problem:** ___
**Reprodukcja:** ___
**Spec source:** ___
**Estymacja fix:** ___
**Sugerowany fix:** ___
**Wpływ na go-live:** OPÓŹNIA / WYMUSZA WORKAROUND / etc.

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

- [ ] **Go/No-Go decision** podjęta i uzasadniona (sekcja na początku)
- [ ] Wszystkie sekcje 1-13 wypełnione (nie tylko ⬜)
- [ ] Sekcja 8 (Security) — wszystkie OWASP Top 10 sprawdzone
- [ ] Sekcja 13 (Production readiness) — go-live checklist przeszła
- [ ] Lista bugów ma estymacje czasu dla każdego
- [ ] Wszystkie BLOCKER bugi w Executive Summary
- [ ] Performance metryki zmierzone (nie ___ )
- [ ] Pre-condition 2 (PZ encryption) sprawdzone konkretnie
- [ ] Status compliance % wyliczony
- [ ] Pen test (sekcja 8.10) wykonany
- [ ] Browser compat (sekcja 12.4) testowany na realnych device'ach
- [ ] Plik nazwany `AUDYT_RAPORT_2026-MM-DD.md`
- [ ] Commit + push (raport może być commited bo nie zawiera wrażliwych danych — chyba że dodajesz konkretne fragmenty z gmp_clients)

---

**Wersja template:** 1.0
**Generated by:** AUDYT_INSTRUKCJE.md sesja 1
