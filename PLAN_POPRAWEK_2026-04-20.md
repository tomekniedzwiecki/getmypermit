# Plan poprawek CRM getmypermit — po uwagach Pawła z 2026-04-20

**Źródło uwag:** [uwagi-pawla-2026-04-20.md](uwagi-pawla-2026-04-20.md)
**Deadline produkcyjny:** poniedziałek **2026-04-27** (Paweł zaczyna wprowadzać sprawy)
**Czas:** 7 dni kalendarzowych / ~5 dni roboczych

---

## Zasady priorytetyzacji

- **P0 BLOKUJĄCE** — bez tego Paweł nie może rzetelnie wprowadzać spraw od 2026-04-27.
- **P1 WAŻNE** — blokują codzienny workflow ale jest workaround.
- **P2 DOPEŁNIENIE** — nice-to-have, można dorzucić po starcie.

---

## P0 — BLOKUJĄCE (do 2026-04-24, piątek)

### P0.1 Słowniki: kategorie, etapy, tagi, oddziały, opiekunowie

**Dlaczego P0:** Paweł będzie wprowadzał sprawy i pierwsze pytanie to „jakiej kategorii". Bez poprawnych słowników rejestr sprawi sypanie się importu później.

**Migracja SQL** → `supabase/migrations/20260420_pawel_slowniki_v2.sql`:
1. **Kategorie** — zastąpić istniejące wartości `gmp_cases.category` pełną listą (pkt 5 uwag). Stworzyć tabelę słownikową `gmp_case_categories(code, label, group_label, sort_order, is_active)` + seed.
2. **Etapy** — rozszerzyć `gmp_case_stage` o: `wezwanie`, `uzupelnienie_dokumentow`, `przyspieszenie`, `wydluzenie_terminu`, `przeniesienie_z_innego_wojewodztwa`, `wniosek_przeniesiony` (pkt 3).
3. **Tagi** — INSERT do `gmp_tags`: `czeka_na_przeniesienie`, `czeka_na_dok_pracodawcy`, `apt`, `outsourcing`, `problematyczny`, `pretensje`, `brak_reakcji_urzedu`, `zaleglosci_finansowe` (pkt 4).
4. **Oddziały** (`gmp_office_departments`) — DELETE: `OCII`, `OCI`, `OBYWATELSTWO`, `DUE-REZYDENT`. INSERT: `PC 1`, `PC 2`, `PC 3`, `PC 4`, `OP — OBYWATELSTWO` (pkt 7).
5. **Opiekunowie** (`gmp_staff`) — oznaczyć `is_active = false` dla: Mateusz Lis, Olha Kovalova, konto testowe, Michał, Natalia (pkt 6). **UWAGA:** nie DELETE — zachować FK do istniejących rekordów aktywności.

**Pliki HTML/JS do zmiany:**
- [crm/case.html](crm/case.html) — dropdown kategorii i etapów (zmiana źródła z hardcoded na zapytanie do słowników).
- [crm/cases.html](crm/cases.html) — filtr kategorii.
- [crm/components/tags.js](crm/components/tags.js) — weryfikacja listy.

**Trudność:** średnia. **Koszt:** ~4h.

---

### P0.2 Finanse — nowe typy opłat + pole kosztowe na karcie sprawy

**Dlaczego P0:** To klucz do całej sekcji 1 uwag. Bez rozszerzonych typów nie ma sensu wprowadzać rozliczeń.

**Migracja SQL** → `supabase/migrations/20260420_pawel_finanse_v2.sql`:
1. Rozszerzyć `gmp_payment_kind` enum: dodać `skarbowa` i `za_klienta`. Zachować `fee` + `admin_fee`.
2. Dodać do `gmp_cases`:
   - `admin_fee_amount NUMERIC(10,2)` — opłata administracyjna planowana
   - `stamp_fee_amount NUMERIC(10,2)` — opłata skarbowa planowana
   - `client_advances_amount NUMERIC(10,2)` — opłaty założone za klienta (planowane)
3. Dodać `gmp_payments.payment_plan_installment_id UUID` (FK) — link do konkretnej raty (dla windykacji per-rata).

**Pliki HTML do zmiany:**
- [crm/case.html](crm/case.html) — zakładka **Finanse**:
  - Sekcja „Dane szczegółowe" — dodać pola: opłata administracyjna, opłata skarbowa, planowane opłaty za klienta.
  - Nowe kafelki KPI (4 sztuki): Wynagrodzenie / Opł. administracyjna / Opł. skarbowa / Założone za klienta.
  - Nowa sekcja „Opłaty do zwrotu" — między **Plan płatności** a **Historia wpłat**. Lista wpłat typu `za_klienta` z sumą.
- [crm/payments.html](crm/payments.html) — filtr po `kind` rozszerzyć o nowe typy.
- [crm/receivables.html](crm/receivables.html) — windykacja rozdzielona per typ opłaty.

**Trudność:** duża. **Koszt:** ~8h.

---

### P0.3 Plan płatności — rzeczywiste raty z datami + zadania-alerty

**Dlaczego P0:** Obecnie `gmp_payment_plans` ma tylko `installments_planned` (liczba) i jedną `due_date`. Paweł chce **osobną datę na ratę**.

**Migracja SQL** → `supabase/migrations/20260420_pawel_payment_installments.sql`:
1. Nowa tabela `gmp_payment_installments`:
   ```sql
   CREATE TABLE gmp_payment_installments (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       payment_plan_id UUID REFERENCES gmp_payment_plans(id) ON DELETE CASCADE,
       case_id UUID REFERENCES gmp_cases(id) ON DELETE CASCADE,
       installment_number INTEGER NOT NULL,
       amount NUMERIC(10,2) NOT NULL,
       due_date DATE NOT NULL,
       status TEXT DEFAULT 'pending'
           CHECK (status IN ('pending','reminder_sent','paid','overdue')),
       paid_at DATE,
       paid_amount NUMERIC(10,2),
       notes TEXT,
       created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX idx_installments_due_date ON gmp_payment_installments(due_date) WHERE status != 'paid';
   ```
2. Migracja danych z `gmp_payment_plans` — rozbić istniejące plany na N rat (jeśli `installments_planned > 1`).
3. Trigger: po zapisie raty z `due_date = CURRENT_DATE` → utwórz zadanie w `gmp_tasks` dla `assigned_to` sprawy („Dziś klient X ma zapłacić Y zł").

**Pliki HTML:**
- [crm/case.html](crm/case.html) — zakładka Finanse → sekcja **Plan płatności**:
  - Lista rat z kalendarzem na każdej racie (input `type="date"`).
  - Status raty (pending/reminder_sent/paid/overdue) z kolorami.
  - Przycisk „Oznacz jako zapłaconą" → tworzy wpis w `gmp_payments` z FK do raty.

**Trudność:** duża. **Koszt:** ~6h.

---

### P0.4 Lista spraw — zaległości zamiast wpłat

**Dlaczego P0:** Dosłownie: „lepiej by było gdyby w tym miejscy wyświetlała się kwota zaległości". Minimum: czerwona kropka.

**Pliki:**
- [crm/cases.html](crm/cases.html) — kolumna z kwotą → zmienić na **kwota zaległości** (`total_planned - total_paid`). Czerwona kropka gdy `> 0`. Jeśli kwota niezerowa — pokaż kwotę i kolor czerwony.

**Widok SQL pomocniczy** (`gmp_case_balance`):
```sql
CREATE OR REPLACE VIEW gmp_case_balance AS
SELECT
    c.id AS case_id,
    COALESCE(c.fee_amount,0)
      + COALESCE(c.admin_fee_amount,0)
      + COALESCE(c.stamp_fee_amount,0)
      + COALESCE(c.client_advances_amount,0) AS total_planned,
    COALESCE((SELECT SUM(amount) FROM gmp_payments p WHERE p.case_id = c.id),0) AS total_paid,
    -- overdue = rata z due_date < today i status != paid
    COALESCE((SELECT SUM(amount) FROM gmp_payment_installments pi
              WHERE pi.case_id = c.id AND pi.status != 'paid' AND pi.due_date < CURRENT_DATE),0) AS overdue_amount
FROM gmp_cases c;
```

**Trudność:** mała. **Koszt:** ~2h.

---

### P0.5 Karta sprawy — nowe pola szczegółowe

**Dlaczego P0:** Bez pól (data złożenia wniosku, data zakończenia legalnego pobytu, gdzie leży, osoba przyjmująca) dane importowane z weekendu Pawła będą niekompletne.

**Migracja SQL** → `supabase/migrations/20260420_pawel_case_fields.sql`:
```sql
ALTER TABLE gmp_cases ADD COLUMN IF NOT EXISTS legal_stay_end_date DATE;
ALTER TABLE gmp_cases ADD COLUMN IF NOT EXISTS document_location TEXT;  -- "gdzie to leży"
ALTER TABLE gmp_cases ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES gmp_staff(id); -- osoba przyjmująca
ALTER TABLE gmp_cases ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ; -- data przekazania opiekunowi

CREATE INDEX idx_cases_legal_stay_end ON gmp_cases(legal_stay_end_date);
CREATE INDEX idx_cases_accepted_by ON gmp_cases(accepted_by);
```

**Pliki:**
- [crm/case.html](crm/case.html) — formularz danych szczegółowych: 4 nowe pola.
- [crm/cases.html](crm/cases.html) — dodać:
  - Kolumnę **„Data złożenia wniosku"** po dacie przyjęcia (pkt 8).
  - Sortowanie po **„Data zakończenia legalnego pobytu"** (pkt 8).

**Trudność:** mała. **Koszt:** ~3h.

---

## P1 — WAŻNE (do 2026-04-26, sobota)

### P1.1 Wielu opiekunów sprawy (max 3) — system 2-kowy

**Migracja SQL** → `supabase/migrations/20260421_pawel_multi_assignees.sql`:
```sql
CREATE TABLE gmp_case_assignees (
    case_id UUID REFERENCES gmp_cases(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES gmp_staff(id) ON DELETE RESTRICT,
    role_type TEXT DEFAULT 'primary' CHECK (role_type IN ('primary','secondary','backup')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (case_id, staff_id)
);
-- CHECK: max 3 opiekunów per sprawa (trigger)
```

Zachować `gmp_cases.assigned_to` jako **primary** (dla kompatybilności wstecznej). `gmp_case_assignees` = tabela łącząca z role_type.

**Pliki:**
- [crm/case.html](crm/case.html) — selector opiekunów jako multi-select (max 3).
- [crm/tasks.html](crm/tasks.html) — widok „moje zadania" = union primary+secondary+backup.

**Trudność:** średnia. **Koszt:** ~4h.

---

### P1.2 Terminy — nowe typy + toggle widoczność w kalendarzu

**Migracja SQL** → `supabase/migrations/20260421_pawel_tasks_visibility.sql`:
```sql
ALTER TABLE gmp_tasks ADD COLUMN IF NOT EXISTS show_in_calendar BOOLEAN DEFAULT TRUE;
ALTER TABLE gmp_tasks ADD COLUMN IF NOT EXISTS visibility TEXT
    DEFAULT 'team' CHECK (visibility IN ('private','team'));
ALTER TABLE gmp_tasks ADD COLUMN IF NOT EXISTS task_type TEXT;
-- task_type ∈ {'uzupelnienie_brakow_formalnych','uzupelnienie_dokumentow_merytorycznych','osobiste_stawiennictwo', ...}
```

**Pliki:**
- [crm/tasks.html](crm/tasks.html) — formularz: dropdown typu terminu + checkbox „pokaż w kalendarzu" + checkbox „prywatne".
- [crm/calendar.html](crm/calendar.html) — filtrować `WHERE show_in_calendar = TRUE AND (visibility = 'team' OR created_by = current_user)`.

**Trudność:** mała. **Koszt:** ~3h.

---

### P1.3 Zestawienia per opiekun (pulpit Pawła)

**Widok SQL** → `supabase/migrations/20260422_pawel_staff_stats.sql`:
- `gmp_staff_stats_monthly` — per staff per miesiąc: ile spraw przyjął, ile prowadzi, ile zadań, ile wykonał, ile zaległości finansowych.

**Pliki:**
- [crm/analytics.html](crm/analytics.html) — nowa sekcja „Efektywność opiekunów".
- [crm/staff.html](crm/staff.html) — kolumna „zaległości w sprawach opiekuna".

**Trudność:** średnia. **Koszt:** ~4h.

---

### P1.4 Dashboard — alert „brak reakcji pracodawcy"

**Pliki:**
- [crm/alerts.html](crm/alerts.html) — dodać sekcję. Logika: sprawa ma employer_id, ostatnia activity z metadata.role='employer' > 14 dni temu, brak odpowiedzi.

**Trudność:** mała. **Koszt:** ~2h.

---

### P1.5 Uprawnienia — separacja admin vs pracownik (finanse globalne)

**Migracja SQL** → `supabase/migrations/20260422_pawel_rls_finance.sql`:
RLS policy na `gmp_payments` i widok `gmp_case_balance` — pracownik widzi tylko swoje sprawy (gdzie jest w `gmp_case_assignees`). Admin/owner widzi wszystko.

Sprawdzić czy `view_global_finance` w [crm/components/auth.js:94](crm/components/auth.js#L94) jest egzekwowany na UI (ukryte kafelki).

**Pliki:**
- [crm/dashboard.html](crm/dashboard.html) — ukryć globalny przychód dla non-admin.
- [crm/analytics.html](crm/analytics.html) — `requiresPermission('view_global_finance')`.

**Trudność:** średnia. **Koszt:** ~3h.

---

## P2 — DOPEŁNIENIE (po starcie, do 2026-05-04)

### P2.1 Ankieta z palca w karcie sprawy

Istnieje już `gmp_intake_tokens.data JSONB` dla wersji elektronicznej. Dodać:
- Zakładka **Ankieta** w [crm/case.html](crm/case.html) — formularz 30+ pól (pkt 12.1 uwag).
- Zapis do `gmp_intake_tokens` z `status = 'submitted_manual'`.
- Mapowanie: gdy klient wypełni elektronicznie → dane podstawiają się do formularza z palca (ten sam JSONB).
- Załączniki z ankiety elektronicznej → auto-upload do `gmp_documents` (case_id).

**Trudność:** duża. **Koszt:** ~8h.

---

### P2.2 Kalendarz — widok „tylko moje"

Toggle w [crm/calendar.html](crm/calendar.html) — filtr `assigned_to = current_user`.

**Trudność:** mała. **Koszt:** ~1h.

---

### P2.3 Kontakt z karty sprawy — tylko opiekun (WhatsApp/tel/email)

Zablokować przyciski **Call / WhatsApp / Email** w [crm/case.html](crm/case.html) dla staff nie będących w `gmp_case_assignees` tej sprawy. Logować akcję do `gmp_case_activities` z `created_by`.

**Wymagane od Pawła:** lista par (opiekun, nr tel, email) do konfiguracji.

**Trudność:** średnia. **Koszt:** ~3h (po otrzymaniu danych).

---

### P2.4 Licznik dni od przystąpienia do sprawy

W [crm/cases.html](crm/cases.html) — obok kolumny „dni od złożenia wniosku" dodać „dni od przystąpienia" (`CURRENT_DATE - date_joined`).

**Trudność:** bardzo mała. **Koszt:** ~30min.

---

## Checklist zadań technicznych

### Migracje SQL (w kolejności)

1. `20260420_pawel_slowniki_v2.sql` — P0.1
2. `20260420_pawel_finanse_v2.sql` — P0.2
3. `20260420_pawel_payment_installments.sql` — P0.3
4. `20260420_pawel_case_balance_view.sql` — P0.4
5. `20260420_pawel_case_fields.sql` — P0.5
6. `20260421_pawel_multi_assignees.sql` — P1.1
7. `20260421_pawel_tasks_visibility.sql` — P1.2
8. `20260422_pawel_staff_stats.sql` — P1.3
9. `20260422_pawel_rls_finance.sql` — P1.5

### Pliki HTML/JS do modyfikacji

| Plik | Zmiany (P0+P1) |
|------|---|
| [crm/case.html](crm/case.html) | nowe pola, plan rat, zakładka Finanse (4 kafelki + opłaty do zwrotu), multi-opiekun, zakładka Ankieta (P2) |
| [crm/cases.html](crm/cases.html) | kol. data złożenia wniosku, kol. zaległości (zamiast wpłat), sort po legal_stay_end_date, licznik dni od przystąpienia |
| [crm/payments.html](crm/payments.html) | filtr po nowych `kind` |
| [crm/receivables.html](crm/receivables.html) | rozbicie po typach opłat |
| [crm/tasks.html](crm/tasks.html) | dropdown task_type, toggle show_in_calendar, visibility |
| [crm/calendar.html](crm/calendar.html) | filtr „tylko moje", respekt visibility |
| [crm/alerts.html](crm/alerts.html) | alert „brak reakcji pracodawcy" |
| [crm/analytics.html](crm/analytics.html) | efektywność opiekunów, gate'owane `view_global_finance` |
| [crm/staff.html](crm/staff.html) | kol. zaległości opiekuna |
| [crm/dashboard.html](crm/dashboard.html) | RLS na globalnych kafelkach |
| [crm/components/tags.js](crm/components/tags.js) | weryfikacja listy |

---

## Harmonogram sugerowany

| Dzień | Zadania |
|-------|---------|
| **Pon 2026-04-20** | Zapisanie uwag + plan (gotowe). Rozpoczęcie P0.1 (słowniki) i P0.5 (pola szczegółowe) — niska złożoność, szybki win. |
| **Wt 2026-04-21** | P0.2 (nowe typy opłat + kafelki Finanse). |
| **Śr 2026-04-22** | P0.3 (plan rat z datami + zadania-alerty). |
| **Czw 2026-04-23** | P0.4 (zaległości w liście spraw) + testy P0. |
| **Pt 2026-04-24** | P1.1 (multi-opiekun) + P1.2 (terminy/widoczność). |
| **Sob 2026-04-25** | P1.3 (staff stats) + P1.4 (alert pracodawca) + P1.5 (RLS). |
| **Ndz 2026-04-26** | Pełny regression test + deploy (pamiętaj: `vercel alias set` i `--no-verify-jwt` dla edge functions). |
| **Pon 2026-04-27** | 🟢 Paweł startuje. P2 w tle. |

---

## Pytania do Pawła — DO WYJAŚNIENIA PRZED STARTEM P1

1. **PC 1-4** (pkt 7) — to oddziały urzędów czy wewnętrzne zespoły kancelarii? (wpływa na model — gmp_office_departments vs nowa tabela).
2. **Data zakończenia legalnego pobytu** (pkt 8) — wypełniana ręcznie, czy liczona (wiza+N miesięcy)?
3. **Raty** (pkt 1.1) — czy alert-zadanie ma być generowany tylko w dniu raty, czy z wyprzedzeniem (np. 3 dni wcześniej)?
4. **Opłaty za klienta** (pkt 1.3) — czy te zwrotki mają osobny plan spłaty, czy zawsze jednorazowe?
5. **Multi-opiekun** — czy role (primary/secondary/backup) mają wpływ na uprawnienia (np. tylko primary może usunąć sprawę)?
6. **Dane kontaktowe opiekunów** (pkt 14) — lista par (imię, nr tel, email) do konfiguracji.

---

## Ryzyka

- **Import historycznych danych Pawła (weekend):** migracja słowników musi być wdrożona PRZED wprowadzeniem pierwszej sprawy, inaczej import zmapuje się do starych kategorii. Zalecenie: wdrożenie migracji do piątku 2026-04-24 + testowy import 1-2 spraw w sobotę.
- **Vercel alias:** po deployu `vercel alias set` dla `crm.getmypermit.pl` (ostrzeżenie z memory).
- **Edge functions:** wszystkie deploy z `--no-verify-jwt` (ostrzeżenie z memory).
- **Multi-opiekun:** breaking change dla istniejących query używających `assigned_to` pojedynczego. Migracja musi backfillować `gmp_case_assignees` z obecnego `assigned_to`.
