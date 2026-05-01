# PLAN AUDYTU WDROŻENIA — GetMyPermit CRM

**Cel:** Kompletna weryfikacja czy wdrożenie odpowiada wymaganiom z dokumentu Pawła (zaadaptowanym w `PAWEL_ROADMAP_v3.md` v3.2).

**Estymowany czas:** 12-18 godzin pracy (5-7 sesji po 2-3h każda).

**Spec źródłowa:** `PAWEL_ROADMAP_v3.md` (3500+ linii, w gitignore — nie commited, czytaj lokalnie).

**Wynik:** wypełniony `AUDYT_RAPORT_TEMPLATE.md` z findings + lista bugów + lista improvements.

---

## STRUKTURA AUDYTU — 10 SEKCJI

1. [Wymagania Pawła — punkt po punkcie](#1-wymagania-pawła)
2. [DoD każdego etapu (10 etapów)](#2-dod-etapów)
3. [Cross-checks z review v3.2 (A/B/C/D/E)](#3-cross-checks)
4. [Pre-conditions](#4-pre-conditions)
5. [Audyt DB schema](#5-audyt-db)
6. [Audyt edge functions](#6-audyt-edge-functions)
7. [Audyt UI/UX per strona](#7-audyt-uiux)
8. [Audyt bezpieczeństwa (RLS, JWT, audit log)](#8-audyt-bezpieczeństwa)
9. [Audyt performance](#9-audyt-performance)
10. [Audyt mobile + accessibility](#10-audyt-mobile)

---

## 1. WYMAGANIA PAWŁA

### 1.1 Filozofia (zasady nadrzędne — pkt 18 dokumentu Pawła)

Z roadmapy `PAWEL_ROADMAP_v3.md` sekcja "Filozofia". Każda zasada → check w UI/DB.

- [ ] **Każdy cudzoziemiec = własna sprawa** (`gmp_cases`). Grupa to relacja, nie zastępuje sprawy. **Test:** SQL `SELECT case_id FROM gmp_case_group_members GROUP BY case_id HAVING COUNT(*) > 1` — jeden case_id może być w wielu grupach (pracodawca + rodzina).
- [ ] **Conditional UI** — moduły pokazują się tylko gdy potrzebne. **Test:** sprawa `party_type=individual` nie pokazuje sekcji Pracodawca/Pracownicy.
- [ ] **Workflow "Co teraz"** — proaktywne podpowiedzi. **Test:** karta sprawy → aside → sekcja "Co teraz" z 1-3 sugestiami.
- [ ] **Audyt PDF** — możliwy do wygenerowania per kategoria. **Test:** karta sprawy → tab Dokumenty → "Pobierz audit_checklist" → DOCX z grupowaniem po section.
- [ ] **Backfill istniejących danych** — żadna istniejąca sprawa nie powinna mieć NULL kind/category.

### 1.2 Mapping danych Pawła

#### Mapping 7 grup → `gmp_case_categories.pawel_group`
- [ ] `pobyt_praca` (pc_praca, pc_jdg_ukr, etc.)
- [ ] `pobyt_rodzina` (pc_laczenie_z_rodzina, pc_laczenie_z_ob_rp, pc_konkubinat)
- [ ] `pobyt_staly` (pobyt_staly_*, karta_polaka)
- [ ] `rezydent_ue` (rezydent)
- [ ] `zezwolenie_praca` (zezwolenie_a, zezwolenie_b, etc.)
- [ ] `kontrola_legalnosci` (kontrola_*)
- [ ] `inna_sprawa` (default)

**SQL test:** `SELECT pawel_group, COUNT(*) FROM gmp_case_categories GROUP BY pawel_group` zwraca wszystkie 7 grup z >0 wierszy.

#### Mapping ról w sprawie (pkt 12)
- [ ] Tabela `gmp_case_role_assignments` istnieje
- [ ] Role: `klient_glowny`, `pelnomocnik`, `kontakt_pracodawca`, `tlumacz`, `inny`
- [ ] UI w karcie sprawy → tab Dane → sekcja "Role w sprawie"

**SQL test:** `SELECT DISTINCT role FROM gmp_case_role_assignments` zwraca min. 5 typów.

#### Mapping etapów (pkt 5)
Każdy etap z dokumentu Pawła → wartość enum `gmp_case_stage`:
- [ ] `weryfikacja_dokumentow`, `dokumenty_do_uzupelnienia` → enum istnieje
- [ ] `gotowa_do_zlozenia` (NEW v3.1)
- [ ] `wniosek_zlozony`, `oczekuje_na_osobiste`, `po_osobistym`
- [ ] `wezwanie`, `uzupelnienie_dokumentow`, `oczekuje_na_decyzje`
- [ ] `odwolanie`

**SQL test:** `SELECT enum_range(NULL::gmp_case_stage)` zawiera wszystkie powyższe.

### 1.3 Punkty 1-19 dokumentu Pawła (cytaty z roadmapy)

#### Pkt 3 — Kategorie sprawy (7 grup)
**Gdzie:** `gmp_cases.category` + `gmp_case_categories.pawel_group`
**Pass:** każda sprawa ma `category` przypisaną do `pawel_group`. Filtr "Grupa Pawła" w cases.html i kanban.html.
**Test SQL:** `SELECT COUNT(*) FROM gmp_cases WHERE category IS NULL` = 0 (lub bardzo blisko 0).

#### Pkt 4 — Conditional UI
**Gdzie:** `crm/components/conditional-modules.js` → `applyConditionalModules()`
**Pass:** moduły z `data-show-when` poprawnie się pokazują/ukrywają.
**Test E2E:** stwórz 4 sprawy (party_type × kind combinations), sprawdzaj visibility każdej sekcji.

#### Pkt 5 — Etapy workflow
**Gdzie:** `gmp_cases.stage` (enum), Kanban, sekcja "Co teraz"
**Pass:** wszystkie etapy z dokumentu Pawła w enum, Kanban pokazuje kolumny per etap.

#### Pkt 8 — Elektroniczne złożenie
**Gdzie:** karta sprawy → tab Procedura → sekcja E-złożenie (10 sekcji A-H)
**Pass:** widoczne tylko dla `submission_method=elektronicznie`. Wszystkie 10 sekcji działają.
**Test:** sprawa `c42` (BIST PREM SINGH) ma e-złożenie widoczne; sprawa `submission_method=osobiscie` nie.

#### Pkt 9 — Dane proceduralne
**Gdzie:** karta sprawy → tab Dane → sekcja "Dane proceduralne"
**Pass:** widoczne dla `kind LIKE 'przystapienie%'` lub `przejeta_do_dalszego_prowadzenia`. Pola: braki_formalne_status, odciski_status, oplata_status, date_fingerprints, date_summon, date_decision, decision_outcome, decision_outcome_notes.
**Test SQL:** `SELECT column_name FROM information_schema.columns WHERE table_name='gmp_cases' AND column_name LIKE 'date_%'` zawiera wszystkie 4 daty.

#### Pkt 10 — Opłaty (A/B/C/D/H sekcje)
**Gdzie:** generator dokumentów + sekcja Opłaty w finance + e-submission Sekcja D
**Pass:** default opłaty dla pc_praca = 440 + 100 zł (B2). Sekcja D w e-submission ma 7 statusów per opłata.

#### Pkt 11 — Legalność pobytu/pracy
**Gdzie:** karta sprawy → tab Dane → sekcja "Legalność pobytu i pracy"
**Pass:** auto-derived `legal_stay_status` (zielony/żółty/czerwony/brak) z `legal_stay_end_date`. Tabela `gmp_case_work_legality` 1:1 z osobnym statusem dla pracy.
**Test:** pg_cron `gmp_legal_status_nightly` recalkuje codziennie 02:00 UTC.

#### Pkt 12 — Role w sprawie
**Gdzie:** karta sprawy → tab Dane → sekcja "Role w sprawie", komponent `role-editor.js`
**Pass:** wybór roli + override defaultu z klienta/pracodawcy.

#### Pkt 13 — Pracodawca jako grupa
**Gdzie:** auto-grupy `pracodawca` (211 utworzonych z istniejących), `employer.html` z 6 tabami
**Pass:** każdy pracodawca z >=2 sprawami ma grupę. Strona pracodawcy pokazuje wszystkich pracowników.

#### Pkt 14 — Wspólne zadania grupy
**Gdzie:** `gmp_tasks.group_id` (NULLABLE z CHECK case_id OR group_id)
**Pass:** task można utworzyć z group_id zamiast case_id. Wyświetlany w group.html → tab Zadania.

#### Pkt 18 — Zasady nadrzędne (filozofia)
Patrz sekcja 1.1 wyżej.

#### Pkt 19 — Kontrola legalności (NEW)
**Gdzie:** `kind=kontrola_legalnosci_pobytu_pracy`, sprawa typ "kontrola"
**Pass:** enum value istnieje, conditional UI pokazuje specyficzne sekcje.

**Pozostałe punkty (1, 2, 6, 7, 15, 16, 17)** — sprawdzić w roadmapie i dopisać.

---

## 2. DOD ETAPÓW

### 2.1 Etap 0.5 — Spike + audit ✅
- [ ] Spike `_spike-docx` zwraca DOCX (renderowany w 350ms)
- [ ] Test data: 7 spraw w `cases.html` (po 1 per pawel_group)
- [ ] Audit raport prod: `SELECT COUNT(*) FROM gmp_cases` = 4412 (lub bliżej obecnej)
- [ ] Backfill mapping ramowy: tylko 4 sprawy do uzupełnienia kind/category

### 2.2 Etap I — Fundament + nazewnictwo ✅
- [ ] Migracje 20260501_01-08 wdrożone
- [ ] Rename "typ" → "tryb" w UI
- [ ] Helper `applyConditionalModules` istnieje
- [ ] Sekcja "Co teraz" widoczna w karcie sprawy
- [ ] View `gmp_upcoming_installments` zwraca dane
- [ ] `dashboard.html` kafelek "Zbliżające się raty"
- [ ] `gmp_crm_appointments.employer_id` istnieje + backfill
- [ ] Nowe wartości enum: `kind=przejeta_do_dalszego_prowadzenia`, `kind=kontrola_legalnosci_pobytu_pracy`, `stage=gotowa_do_zlozenia`
- [ ] RPC `gmp_get_next_steps` działa

### 2.3 Etap II-A — Generator dokumentów ✅
- [ ] Migracje 20260507_01-04 wdrożone
- [ ] Storage buckets `document-templates` + `case-documents` z RLS
- [ ] Edge function `generate-document` z `--verify-jwt`
- [ ] Min. 4 szablony DOCX uploadowane
- [ ] Generator karty przyjęcia działa, dane zgodne ze sprawą
- [ ] Tab "Dokumenty" w karcie sprawy
- [ ] Status enum `ready/awaiting_signature/signed/sent` działa
- [ ] `gmp_audit_log` ma wpisy `action='document_generated'`

### 2.4 Etap II-B — Checklisty + audyt PDF ✅
- [ ] Migracje 20260512_01-03 + 20260513_01 wdrożone
- [ ] 255 definicji checklist w `gmp_checklist_definitions`
- [ ] 2100+ instancji checklist (backfill A1)
- [ ] RPC `gmp_instantiate_checklist(case_id)` działa
- [ ] Tab "Procedura" pokazuje pozycje pogrupowane po section
- [ ] Generator audit DOCX działa

### 2.5 Etap II-C — Wizard + role + pakiet startowy ✅
- [ ] Migracje 20260514_01-04 wdrożone
- [ ] Wizard `case-new.html` 5 ekranów end-to-end
- [ ] Walidatory PESEL/NIP/phone, PESEL auto-fill `birth_date`
- [ ] Tabela `gmp_case_role_assignments` z UI
- [ ] Edge function `case-startup-pack` generuje pakiet (race condition guard A8)
- [ ] Default opłaty dla pc_praca: 440 + 100 zł
- [ ] Zadania startowe auto (3-5 per kind)

### 2.6 Etap III — Elektroniczne złożenie ✅
- [ ] Migracje 20260520_01-07 wdrożone
- [ ] Conditional na `submission_method=elektronicznie`
- [ ] Sekcje A-H działają, status w bazie
- [ ] 3 modele załącznika nr 1
- [ ] Checklisty koordynacyjna (6 boxów) + operacyjna (11 boxów) w JSONB
- [ ] Opłaty: 2 sekcje (wniosek + karta) z 7 statusami każda
- [ ] Spotkanie: 2 tryby (appointment / task_only)
- [ ] Upload UPO do `gmp_documents` (doc_type=upo)
- [ ] Generator raportu klient + pracodawca
- [ ] Auto-zmiana stage po "Wniosek wysłany"
- [ ] Trigger `gmp_check_employer_consent` (A7)
- [ ] **Pre-condition 2 (PZ encryption)** — odłożone (0 wpisów na prod), do wdrożenia przed pierwszym wpisem

### 2.7 Etap IV — Procedural data ✅
- [ ] Migracje 20260527_01-05 wdrożone
- [ ] Sekcja "Dane proceduralne" conditional na kind
- [ ] Pola statusów + dat edytowane z UI
- [ ] View `gmp_case_completeness` zwraca % kompletności
- [ ] **Performance test (B5):** `EXPLAIN ANALYZE SELECT * FROM gmp_case_completeness LIMIT 100` p95 < 200ms
- [ ] Badge "X dni" od przystąpienia z kolorami (>180 czerwony)
- [ ] Trigger `gmp_remind_procedural_data` (zmiana etapu bez znaku → notification)
- [ ] Dashboard kafelek "Sukces decyzji 90 dni" (E4)

### 2.8 Etap V — Pracodawcy/grupy/import ✅ (Faza 1+2+3)
- [ ] Migracje 20260603_01-04 wdrożone
- [ ] Backfill: 211 grup pracodawców auto (>=2 sprawy)
- [ ] `crm/group.html` z 3 tabami (Sprawy, Dokumenty, Zadania)
- [ ] `crm/groups.html` split view (lista + detail)
- [ ] `crm/employer.html` z 6 tabami (Sprawy, Cudzoziemcy, Terminy, Braki, Dokumenty, Alerty)
- [ ] Sekcja "Grupy" w karcie sprawy → tab Dane
- [ ] Filtry "Grupa" w cases.html, kanban.html, appointments.html
- [ ] Import CSV pracowników edge function `import-employer-workers`
- [ ] `gmp_tasks.group_id` działa z CHECK case_id OR group_id (D2)

### 2.9 Etap VI — Legalność + Kanban ✅
- [ ] Migracje 20260610_01-05 wdrożone
- [ ] Enum `gmp_legal_status` (zielony/żółty/czerwony/brak)
- [ ] `gmp_cases.legal_stay_status` auto-derived z `legal_stay_end_date`
- [ ] Trigger `trg_update_legal_stay_status` BEFORE INSERT/UPDATE
- [ ] Backfill statusów (4415 wierszy)
- [ ] Tabela `gmp_case_work_legality` 1:1 (D3) z auto-status
- [ ] View `gmp_case_dashboard_kpi` z legal_red/yellow/green
- [ ] pg_cron `gmp_legal_status_nightly` o 02:00 UTC
- [ ] Sekcja "Legalność" w karcie sprawy (status pillsy + edytor work_legality)
- [ ] Filtr "Legalność pobytu" w kanban.html

### 2.10 Etap VII — Automatyzacje ✅ MVP
- [ ] Migracja 20260615_01 wdrożona
- [ ] 3 enums (trigger_type, action_type, status)
- [ ] Tabele `gmp_automation_flows`, `_steps`, `_executions` z RLS
- [ ] 2 DB triggery: `trg_automation_stage_change`, `trg_automation_decision`
- [ ] Edge function `automation-executor` (max 25/call, 5 typów akcji)
- [ ] `automations.html` z UI: lista flow, kreator flow + step, statystyki, executor on-demand
- [ ] **TODO:** pg_cron na automation-executor (codzienny call HTTP) — obecnie tylko manual

---

## 3. CROSS-CHECKS Z REVIEW v3.2

### 3.1 Kategoria A: Bezpieczeństwo i RODO (HIGH)

| Code | Opis | Gdzie | Pass |
|------|------|-------|------|
| **A1** | Backfill checklist dla 5077 spraw | `20260513_01_checklist_seeds_all.sql` + RPC | `SELECT case_id, COUNT(*) FROM gmp_case_checklists GROUP BY case_id HAVING COUNT(*) = 0` zwraca 0 |
| **A2** | Backfill `gmp_e_submission_status` dla elektronicznie | `20260520_05_backfill_e_submission.sql` | `SELECT COUNT(*) FROM gmp_e_submission_status` ≈ `SELECT COUNT(*) FROM gmp_cases WHERE submission_method='elektronicznie'` |
| **A3** | Edge functions z `--verify-jwt` (user JWT, nie service_role) | `supabase/functions/*/index.ts` | Test: bez tokena → 401, z valid → 200. Sprawdź: `generate-document`, `case-startup-pack`, `import-employer-workers` |
| **A4** | Trigger spójności statusów dokumentów (3 sygnały → 1 truth) | `20260520_06_signed_status_sync_trigger.sql` | Zmień `gmp_documents.status='sent'` → `gmp_e_submission_status` updateuje step status |
| **A5** | Versioning szablonów DOCX | `gmp_document_templates.version` | INSERT 2 templates same kind diff version → unique nie blokuje |
| **A6** | RPC `gmp_get_next_steps()` zamiast 5 queries | `20260501_08_next_steps_rpc.sql` | `next-step.js` używa `db.rpc('gmp_get_next_steps')` |
| **A7** | Enforce zgody RODO przed wysłaniem raportu pracodawcy | `20260520_07_enforce_employer_consent.sql` | Trigger `gmp_check_employer_consent` blokuje raport bez podpisanej zgody |
| **A8** | Race condition guard `case-startup-pack` | `case-startup-pack/index.ts` | 60-second guard na duplicate generation. Test: 2 concurrent calls → 1 zwraca skip |

### 3.2 Kategoria B: Spójność danych (HIGH/MEDIUM)

| Code | Opis | Test |
|------|------|------|
| **B1** | Ujednolicenie kategorii (legacy → pawel_group) | SQL: `SELECT pawel_group, COUNT(*) FROM gmp_case_categories WHERE pawel_group IS NULL` = 0 |
| **B2** | Default opłaty pc_praca = 440 + 100 zł | Wizard Ekran 4 preselected; `gmp_default_fees` table |
| **B3** | `gmp_payment_plans` z planami ratalnymi | `\d gmp_payment_plans` istnieje |
| **B4** | Trigger `gmp_calc_balance` aktualizuje saldo | Insert payment → `gmp_case_balance` updateuje |
| **B5** | Performance `gmp_case_completeness` < 200ms p95 | `EXPLAIN ANALYZE SELECT * FROM gmp_case_completeness LIMIT 100` — jeśli > 200ms → MV + cron |
| **B6** | PZ encryption (pre-condition Etap III) | `gmp_trusted_profile_credentials` ma kolumnę szyfrowaną — odłożone (0 wpisów) |
| **B7** | Daty proceduralne (date_*, decision_outcome) | Etap IV — sprawdzone w 2.7 |
| **B8** | Auto-zmiana stage po wysłaniu wniosku | `20260520_04_after_submit_trigger.sql` |
| **B9** | gmp_audit_log sanitization (PESEL/passport/passwords removed) | Trigger `gmp_audit_sanitize` przed insertem |
| **B10** | Widok zbiorczy pracodawcy z 8 tabami | `employer.html` ma min. 6 tabów (zredukowane MVP). **Pełne 8 tabów = TODO** |
| **B11** | `gmp_tasks.group_id` NULLABLE z CHECK | `\d gmp_tasks` ma group_id; CHECK constraint istnieje |
| **B12** | `gmp_case_work_legality` osobna tabela 1:1 (D3) | `\d gmp_case_work_legality` istnieje |
| **B13** | Indexy wydajnościowe | `\di gmp_cases_*` ma idx na status, stage, kind, category, employer_id, legal_stay_status, date_decision |
| **B14** | Sekcja "Co teraz" w karcie sprawy | aside ma module-card "Co teraz" — sprawdzone Etap I |

### 3.3 Kategoria C: Logika biznesowa

| Code | Opis | Test |
|------|------|------|
| **C1** | Wizard 5 ekranów (nie 1 form) | `case-new.html` ma 5 step indicators |
| **C2** | Banner szkiców na cases.html | Czerwony banner u góry jeśli `status='lead' AND created_at > now()-7d` |
| **C3** | Inactivity alerts (14d/30d) | View `gmp_case_alerts` zwraca rows z `inactivity_level` |
| **C4** | Employer inaction alerts | View `gmp_employer_inaction_alerts` (jeśli istnieje) |
| **C5** | Balance per case | View `gmp_case_balance` zwraca saldo |
| **C6** | Trigger przypomnień proceduralnych (Etap IV.5) | Zmiana stage bez znak_sprawy → notification |
| **C7** | Look-ahead 14 dni rat | View `gmp_upcoming_installments` |
| **C8** | Collection levels 1-5 | Pole `collection_level` lub view `gmp_collection_overview` |
| **C9** | Aging buckets płatności | Buckets w receivables.html (0-30, 31-60, 61-90, 90+) |

### 3.4 Kategoria D: Decyzje designerskie

| Code | Decyzja | Implementacja |
|------|---------|---------------|
| **D1** | `decision_outcome` osobny enum, NIE sub-status | `gmp_decision_outcome` (Etap IV) — 6 wartości |
| **D2** | `gmp_tasks.case_id` NULLABLE z CHECK group_id OR case_id | Etap V — sprawdzone |
| **D3** | `gmp_case_work_legality` osobna tabela 1:1 | Etap VI — sprawdzone |
| **D4** | Audit log dual-table (current + archive) | `gmp_audit_log` + ewentualne archive table |
| **D5** | `gmp_case_completeness` REGULAR view (MV w razie potrzeby) | Etap IV — sprawdzone, p95 to verify |
| **D6** | Test data: 7 spraw + 7 klientów + 2 pracodawców + 1 grupa rodzinna | `supabase/seed/test_pawel_cases.sql` |

### 3.5 Kategoria E: Dashboard / KPI

| Code | KPI | Gdzie |
|------|-----|-------|
| **E1** | Cron `gmp_weekly_work_legality_reminders` (Etap VI) | pg_cron job — TODO sprawdzić |
| **E2** | Eksport PDF raportu legalności pracodawcy | employer.html → "Eksportuj raport PDF" — TODO sprawdzić |
| **E3** | PESEL auto-fill birth_date | `validators.js` — sprawdzone |
| **E4** | Dashboard kafelek "Sukces decyzji 90 dni" | dashboard.html `#kpi-success-decision` — sprawdzone |
| **E5** | Filter "Grupa" w appointments.html | Sprawdzone Etap V Faza 3 |
| **E6** | View `gmp_case_dashboard_kpi` (1 view zbiorczy) | Etap IV.6 + rozszerzenie VI.4 — sprawdzone |

---

## 4. PRE-CONDITIONS

### Pre-condition 1 — Przed Etapem II
**Status:** ✅ DONE (test data + audit raport zrobione w Etap 0.5)

### Pre-condition 2 — Przed Etapem III (KRYTYCZNE)
**Co:** Szyfrowanie `gmp_trusted_profile_credentials` przez `pgsodium` (B6)
**Status:** ⏸ ODŁOŻONE — 0 wpisów na prod, ale **MUSI być zrobione przed wprowadzeniem pierwszego klienta z PZ**.
**Test:** `SELECT COUNT(*) FROM gmp_trusted_profile_credentials` = 0 (jeśli > 0, MUSI być szyfrowane).

### Pre-condition 3 — Przed Etapem V
**Co:** Audit `gmp_tasks.case_id` zwolnienie z NOT NULL (A9)
**Status:** ✅ DONE (Etap V Faza 1 — kolumna jest NULLABLE z CHECK)
**Test:** `\d gmp_tasks` pokazuje case_id NULLABLE; istnieją views/RPC zakładające NOT NULL? Sprawdź.

---

## 5. AUDYT DB

### 5.1 Lista 30+ migracji do weryfikacji

```
20260430_audit_legacy_data.sql
20260501_01-08_*.sql                          (Etap I — 8 migracji)
20260507_01-05_*.sql                          (Etap II-A — 5 migracji)
20260512_01-03_*.sql + 20260513_01-02_*.sql   (Etap II-B — 5 migracji)
20260514_01-04_*.sql                          (Etap II-C — 4 migracje)
20260520_01-07_*.sql                          (Etap III — 7 migracji)
20260527_01-05_*.sql                          (Etap IV — 5 migracji)
20260603_01-04_*.sql                          (Etap V — 4 migracje)
20260610_01-05_*.sql                          (Etap VI — 5 migracji)
20260615_01_*.sql                             (Etap VII — 1 migracja)
```

**Test:** `ls supabase/migrations/` zwraca min. 44 pliki. Każdy zaaplikowany na prod (sprawdź skryptami `scripts/run_etap_*.mjs`).

### 5.2 Wszystkie tabele

```
gmp_cases, gmp_clients, gmp_employers, gmp_staff, gmp_inspectors,
gmp_offices, gmp_office_departments, gmp_case_categories,
gmp_case_alerts (view), gmp_case_balance (view), gmp_case_completeness (view),
gmp_case_dashboard_kpi (view), gmp_case_assignees, gmp_case_role_assignments,
gmp_case_groups, gmp_case_group_members, gmp_case_work_legality,
gmp_case_activities, gmp_case_checklists, gmp_checklist_definitions,
gmp_documents, gmp_document_templates, gmp_document_generation_log,
gmp_intake_tokens, gmp_intake_documents, gmp_crm_appointments,
gmp_tasks, gmp_payments, gmp_payment_plans, gmp_payment_installments,
gmp_invoices, gmp_collections, gmp_collection_overview (view),
gmp_collection_activities, gmp_collection_templates,
gmp_e_submission_status, gmp_e_submission_attachments,
gmp_employer_case_workers, gmp_employer_inaction_alerts,
gmp_trusted_profile_credentials, gmp_credentials_access_log,
gmp_audit_log, gmp_notifications, gmp_live_activity,
gmp_entity_tags, gmp_tags, gmp_saved_views,
gmp_default_fees, gmp_note_templates, gmp_task_types,
gmp_submissions_queue, gmp_upcoming_installments (view),
gmp_staff_effectiveness, gmp_leads_overview (view), permit_leads,
gmp_automation_flows, gmp_automation_steps, gmp_automation_executions
```

**Test:** SQL `\dt gmp_*` + `\dv gmp_*` zwraca wszystkie powyższe.

### 5.3 Triggery

Lista triggerów do weryfikacji:
- `gmp_audit_sanitize` (B9 — sanitization)
- `gmp_calc_balance` (B4)
- `gmp_after_submit_update_case` (B8 — auto stage zlozenie_wniosku)
- `gmp_sync_zalacznik_signed_status` (A4)
- `gmp_check_employer_consent` (A7)
- `gmp_remind_procedural_data` (Etap IV.5)
- `gmp_update_legal_stay_status` (Etap VI)
- `gmp_update_work_status` (Etap VI)
- `gmp_automation_trigger_stage_change` (Etap VII)
- `gmp_automation_trigger_decision` (Etap VII)
- `gmp_ensure_e_submission_status` (Etap III)

**Test:** `SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_name LIKE 'trg_%' OR trigger_name LIKE 'gmp_%' ORDER BY trigger_name`.

### 5.4 RLS policies

Każda tabela z RLS — sprawdzić policy:
- `gmp_cases`, `gmp_clients`, `gmp_employers` — staff (auth.uid() IS NOT NULL)
- `gmp_audit_log` — admin only?
- `gmp_trusted_profile_credentials` — special access logging
- `gmp_case_groups`, `gmp_case_group_members`, `gmp_case_work_legality` — staff
- `gmp_automation_*` — staff
- intake tables — public READ (token-based)?

**Test:** `SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE tablename LIKE 'gmp_%' ORDER BY tablename`.

### 5.5 pg_cron jobs

- `gmp_legal_status_nightly` (02:00 UTC, Etap VI)
- `gmp_daily_completeness_refresh` (jeśli MV uruchomiony, Etap IV)
- `gmp_weekly_work_legality_reminders` (E1, Etap VI)
- automation-executor (jeśli skonfigurowany jako pg_cron HTTP call, Etap VII)

**Test:** `SELECT jobname, schedule, last_finished, next_run FROM cron.job ORDER BY jobname`.

### 5.6 Indexy

Krytyczne indexy do weryfikacji:
- `idx_cases_status`, `idx_cases_stage`, `idx_cases_category`, `idx_cases_assigned_to`, `idx_cases_employer_id`
- `idx_cases_date_decision`, `idx_cases_decision_outcome`
- `idx_cases_legal_stay_status`
- `idx_groups_type`, `idx_groups_employer`
- `idx_group_members_case`
- `idx_documents_group`, `idx_documents_case_id`
- `idx_tasks_group`, `idx_tasks_case_id`
- `idx_automation_executions_pending`

**Test:** `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'idx_%' ORDER BY indexname`.

---

## 6. AUDYT EDGE FUNCTIONS

Lista 10 funkcji + status JWT verification:

| Funkcja | --no-verify-jwt? | Powód | Test |
|---------|------------------|-------|------|
| `generate-document` | NIE (verify) | User JWT (A3) | POST bez auth → 401 |
| `case-startup-pack` | NIE (verify) | User JWT (A3) | POST bez auth → 401, z auth → generuje |
| `import-employer-workers` | TAK | Może być wywołana z UI z user JWT, ale flag `--no-verify-jwt` ustawiony — sprawdź | Test: POST z CSV, walidacja inputu |
| `automation-executor` | TAK | Cron / on-demand. Service role internalnie | POST → procesuje pending |
| `intake-ocr` | ? | Public z token? | Sprawdź |
| `invite-staff` | NIE | User JWT — admin only | Sprawdź permission check |
| `lead-fallback-replay` | TAK | Background | Sprawdź |
| `permit-lead-save` | TAK | Public form save | Sprawdź rate-limit |
| `spike-docx` | TAK | Test only | Może być usunięta |
| `delete-staff` | NIE | User JWT — admin only | Sprawdź permission check |

**Per funkcja sprawdzić:**
- Deployment status: `npx supabase functions list`
- Code review: error handling, input validation
- Performance: response time < 2s typowy
- Security: nie ujawnia secrets, nie używa service_role bez powodu

---

## 7. AUDYT UI/UX

### 7.1 Pełna lista stron (28 pages)

```
case.html              — Karta sprawy detail (NAJWIĘKSZY plik, 4400+ linii)
case-new.html          — Wizard nowej sprawy (5 ekranów)
cases.html             — Lista spraw (z filtrami, presetami)
employer.html          — Karta pracodawcy detail (6 tabów)
employers.html         — Lista pracodawców
group.html             — Karta grupy (3 taby)
groups.html            — Lista grup (split view)
clients.html           — Lista klientów / detail (URL ?id=)
lead.html              — Karta leada
leads.html             — Lista leadów
leads-pipeline.html    — Pipeline leadów (kanban)
dashboard.html         — Dashboard (home)
appointments.html      — Kalendarz terminów
tasks.html             — Lista zadań
payments.html          — Historia płatności
invoices.html          — Faktury
receivables.html       — Windykacja
submissions.html       — Kolejka wniosków
work-permits.html      — Pracownicy (export)
templates.html         — Szablony notatek + dokumentów
staff.html             — Lista pracowników (HR)
analytics.html         — Raporty
admin.html             — Panel admin
alerts.html            — Powiadomienia / alerty
kanban.html            — Kanban spraw
automations.html       — Automatyzacje (Etap VII)
pomoc.html             — Pomoc
forgot-password.html   — Reset hasła
reset-password.html    — Potwierdzenie reset
index.html             — Login splash
```

### 7.2 Mapa zakładek per strona detail

#### case.html (6 tabów + sub-tabs)
- `overview` — Przegląd (default)
- `procedura` — Checklist + E-złożenie (conditional)
- `documents` — sub-tabs: pakiet / wszystkie / intake
- `finance`
- `activity` — sub-tabs: tasks / calendar / history
- `data` — Dane sprawy (edycja) + Grupy + Role + Legalność + Procedural data + Daty

#### employer.html (6 tabów)
- `cases`, `workers`, `appts`, `checklist`, `docs`, `alerts`

#### group.html (3 taby)
- `members` (Sprawy), `documents`, `tasks`

#### groups.html (split view, 4 taby w detail)
- LEFT: lista grup z search + filter pills (5 typów)
- RIGHT: detail z 4 tabami: `clients` (default), `cases`, `docs`, `tasks`

#### automations.html
- Lista flow z toggle on/off
- Modal kreator flow + step

### 7.3 Conditional UI atrybuty (`data-show-when`)

```
has_employer:true                                    — Employer panel
party_type:employer                                  — Workers card
party_type:individual                                — Hide workers
submission_method:elektronicznie                     — E-złożenie section
kind:przystapienie_*|przejeta_do_dalszego_prowadzenia — Procedural data + Forwarded info
has_invoices:true                                    — Invoices section
has_payment_plan:true                                — Payment plan
category_pawel_group:pobyt_praca                     — Custom field
```

**Helper:** `crm/components/conditional-modules.js` → `applyConditionalModules()` + `buildCaseUiContext()`

**Test:** stworzyć 4-6 spraw z różnymi kombinacjami atrybutów, sprawdzić visibility każdej sekcji.

### 7.4 Wszystkie filtry i search

| Strona | Filter ID | Persistence |
|--------|-----------|-------------|
| cases.html | f-search, f-status, f-stage, f-category, f-staff, f-department, f-employer, f-group, f-method, f-date-from/to | localStorage `cases-filters` |
| leads.html | f-search, f-status, f-type, f-permit, f-assigned, f-show-partial | localStorage `leads-filters` |
| payments.html | f-from, f-to, f-staff, f-method, f-payer, f-kind | localStorage `payments-filters` |
| receivables.html | f-search, f-level, f-staff, f-bucket, f-contact | localStorage `receivables-filters` |
| kanban.html | f-staff, f-category, f-status, f-group, f-legal, f-pinned-only | localStorage `kanban-filters` |
| tasks.html | f-task-type, f-staff | localStorage |
| appointments.html | f-group, only-mine-toggle | sessionStorage |
| employer.html | emp-search | nie persisted (tab-scoped) |
| groups.html | f-search, type filter pills | URL `?id=` |

**Test:** ustaw filtry, refresh, sprawdź czy persisted.

### 7.5 Modale (~45 instances)

Krytyczne modale do testowania:
- `openClientPicker()` — case.html
- `openEmployerPicker()` — case.html
- `openAddWorkerModal()` — case.html
- `openPaymentPlanModal()` — case.html
- `openNewCaseModal()` — cases.html (lub redirect do case-new.html)
- `openStaffManageModal()` — staff.html, admin.html
- `openNewFlow()` + `openEditFlow()` — automations.html
- `openNewGroup()` — groups.html, groups list
- `openConvertToCase()` — lead.html

**Test:** kliknij każdy button otwierający modal → modal się otwiera → wypełnij → zapisz → modal się zamyka, dane zapisane.

### 7.6 Inline onclick handlers

**Liczba:** ~270 `onclick=` w HTML.

**Test:** dla każdego pliku sprawdź czy funkcja w `window.X` jest zdefiniowana. E2E playwright klik każdego buttona → sprawdź `pageerror` event (function not defined).

### 7.7 Search functionality

- `cases.html` — search po `case_number`, `znak_sprawy`, klient name (przez gmp_clients embed)
- `leads.html` — search po phone, email, name
- `clients.html` — search po nazwisku, PESEL, telefonie
- `employers.html` — search po nazwie, NIP
- `groups.html` — search po nazwie grupy + nazwie pracodawcy
- `employer.html` — search w aktywnym tabie (filtruje karty)
- `templates.html` — search po nazwie szablonu

**Test:** każda search → wpisz część słowa → zwraca wyniki → Esc czyści.

---

## 8. AUDYT BEZPIECZEŃSTWA

### 8.1 RLS policies

Każda tabela `gmp_*` → policy `staff_*` (auth.uid() IS NOT NULL). Niektóre wymagają więcej:
- `gmp_audit_log` — tylko admin może SELECT?
- `gmp_trusted_profile_credentials` — z logowaniem dostępu (`gmp_credentials_access_log`)
- `gmp_intake_tokens` — public access przez token (token jako auth)

**Test:** logowany staff → SELECT z każdej tabeli zwraca rows. Anon → SELECT z `gmp_cases` zwraca 0 (lub error).

### 8.2 JWT verification

Wszystkie edge functions (poza intake/lead-fallback/automation):
- `generate-document` → `--verify-jwt` (NIE flag)
- `case-startup-pack` → `--verify-jwt`
- `import-employer-workers` → sprawdzić, prawdopodobnie `--no-verify-jwt` (cli call)
- `delete-staff` → sprawdzić permission check

### 8.3 Audit log sanitization

Trigger `gmp_audit_sanitize` przed insertem do `gmp_audit_log`:
- Usuwa pola PESEL, passport_number, password, secret_*

**Test:** UPDATE `gmp_cases` z PESEL → sprawdź `gmp_audit_log` że PESEL wymazany.

### 8.4 RODO compliance

- Usunięcie klienta → cascade delete? Lub soft delete?
- Eksport danych klienta (right to access) — endpoint?
- Zapomnienie (right to be forgotten) — endpoint?
- Zgody RODO — gdzie zapisane (`consents` jsonb na gmp_clients?)

### 8.5 Permissions per role

Test 4 ról:
1. **anon** (bez logowania) — nic poza intake
2. **staff** — wszystko poza admin features
3. **admin** — admin.html + staff management + audit log
4. **owner** (Tomek + Maciek) — automatyzacje + super admin

**Test:** zaloguj jako każda rola → sprawdź co jest dostępne (sidebar links + page access).

---

## 9. AUDYT PERFORMANCE

### 9.1 SQL query performance

**Krytyczne queries do EXPLAIN ANALYZE:**

```sql
-- B5: case_completeness
EXPLAIN ANALYZE SELECT * FROM gmp_case_completeness LIMIT 100;
-- Target: p95 < 200ms; jeśli > → migracja do MATERIALIZED VIEW

-- Dashboard KPI (pojedynczy view)
EXPLAIN ANALYZE SELECT * FROM gmp_case_dashboard_kpi;
-- Target: < 100ms

-- Lista spraw z filtrami
EXPLAIN ANALYZE SELECT * FROM gmp_cases WHERE status='aktywna' AND legal_stay_status='czerwony' ORDER BY date_last_activity DESC LIMIT 50;

-- Auto-grupy pracodawców (211 grup × członków)
EXPLAIN ANALYZE SELECT g.*, COUNT(m.case_id) FROM gmp_case_groups g LEFT JOIN gmp_case_group_members m ON m.group_id = g.id GROUP BY g.id;
```

### 9.2 UI page load times

**Test Playwright:** dla każdej strony zmierz:
- Time to interactive (TTI)
- DOMContentLoaded
- Largest contentful paint
- Number of network requests
- Total page weight

**Target:** TTI < 2s, requests < 30, page weight < 1MB.

### 9.3 Dashboard performance

dashboard.html — ile zapytań SQL wykonuje przy load? Czy są equivalent operations?

**Test:** Network tab podczas dashboard load. Powinno być < 10 zapytań do PostgREST.

### 9.4 Edge function response times

Średni response time każdej funkcji:
- `generate-document` — < 1s (target: 500ms)
- `case-startup-pack` — < 5s (generuje wiele dokumentów)
- `import-employer-workers` — < 30s (zależy od CSV size)
- `automation-executor` — < 3s (max 25 executions per call)

---

## 10. AUDYT MOBILE + ACCESSIBILITY

### 10.1 Responsywność

**Breakpointy do testowania:**
- 1600px (desktop large)
- 1280px (desktop)
- 1024px (laptop / iPad landscape)
- 768px (tablet portrait)
- 600px (small tablet / large phone)
- 390px (iPhone)
- 375px (small iPhone SE)

**Test:** Playwright dla każdej strony × każdego breakpointu → screenshot + sprawdź:
- Czy nie ma horizontal scroll
- Czy buttony są clickable (min 44×44px)
- Czy text czytelny (min 12px)
- Czy modale mieszczą się
- Czy sidebar przekształca się w hamburger
- Czy dropdowny działają (touch)

### 10.2 Mobile-specific elements

- `.mobile-topbar` — pokazuje się przy ≤900px?
- `.mobile-hamburger` — działa, otwiera sidebar?
- `.gmp-table-mobile-cards` — tabele zamieniają się na karty?
- Bottom nav — istnieje?
- Pull-to-refresh — działa?

### 10.3 Accessibility (a11y)

Sprawdź dla głównych stron:
- Wszystkie buttons mają tekst lub aria-label
- Wszystkie form fields mają labels
- Kontrast tekstu vs tła min 4.5:1 (WCAG AA)
- Navigation keyboard: Tab przechodzi po wszystkich interactive
- Focus visible (ring na focusie)
- Headings w prawidłowej hierarchii (h1 → h2 → h3)

**Tools:** Playwright + axe-core, lub Lighthouse audit.

---

## DELIVERABLES AUDYTU

Po wykonaniu wszystkich 10 sekcji, raport powinien zawierać:

1. **Status per wymaganie Pawła** (✅/⚠/❌) — tabela
2. **Lista bugów** posortowana po priorytecie:
   - **Critical** — blokuje funkcję, fix natychmiast
   - **Major** — psuje UX, fix w 1-2 dni
   - **Minor** — kosmetyka, można odłożyć
3. **Lista brakujących featurów** z roadmapy:
   - Co jest w roadmapie a brakuje w implementacji
   - Estymacja czasu na dodanie
4. **Performance metryki** — tabela z czasami
5. **Recommended improvements** — sugerowane refactory
6. **Status pre-conditions** — szczególnie PZ encryption (B6)

Format: `docs/AUDYT_RAPORT_TEMPLATE.md` (wypełniony).

---

## POMOCNE SKRYPTY (już istniejące w `scripts/`)

```
scripts/run_etap_iv_migrations.mjs    — sprawdza czy migracje IV są zaaplikowane
scripts/run_etap_v_phase1.mjs         — sprawdza V
scripts/run_etap_vi_vii_migrations.mjs — sprawdza VI + VII
scripts/db_audit.mjs                  — audit DB (jeśli istnieje)
scripts/e2e_full_audit.mjs            — E2E full audit (jeśli istnieje)
scripts/e2e_test_ui.mjs               — UI smoke test
```

**Strategia:** stwórz `scripts/audit_*.mjs` dla każdej sekcji 5-10.

---

**Wersja planu:** 1.0
**Data:** 2026-05-01
**Powiązane:** `AUDYT_INSTRUKCJE.md`, `AUDYT_RAPORT_TEMPLATE.md`, `PAWEL_ROADMAP_v3.md` (lokalnie, gitignored)
