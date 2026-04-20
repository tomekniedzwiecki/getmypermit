# Wdrożenie uwag Pawła z 2026-04-20 — raport

**Deploy:** commit `55139e6` na master → Vercel → alias `crm.getmypermit.pl`
**Weryfikacja SQL/REST:** `scripts/verify-postgrest-embeds.py` (30/30 zapytań OK)

---

## 1. PŁATNOŚCI

### 1.1 Plan płatności — raty z osobnymi datami ✅

- Nowa tabela `gmp_payment_installments` — 1 rekord = 1 rata z własną datą i statusem (pending / reminder_sent / paid / overdue / cancelled).
- Karta sprawy → **Finanse → Plan płatności**: lista rat z kalendarzami, kolorystyka statusów, przycisk „Oznacz zapłaconą" (jednym klikiem tworzy wpłatę + oznacza ratę).
- Edytor planu z przyciskiem **Generuj równomiernie** (zadajesz liczbę rat, kwotę, datę pierwszej i rozstaw dni — system generuje daty).
- Funkcja SQL `gmp_generate_installment_tasks()` — wywołanie raz dziennie (cron lub ręcznie) tworzy zadanie dla opiekuna „Płatność dziś: rata #X" w dniu `due_date`. **Nie uruchomiłem jeszcze crona** — na razie do odpalenia ręcznie, patrz sekcja "Do-zrobienia" poniżej.

### 1.2 Nowa kategoria — opłata skarbowa + opłata administracyjna ✅

- Rozszerzony enum `gmp_payment_kind`: `fee`, `admin_fee`, `stamp_fee` *(nowy)*, `client_advance` *(nowy)*, `client_advance_repayment` *(nowy)*.
- Nowe pola na karcie sprawy: `admin_fee_amount`, `stamp_fee_amount`, `client_advances_amount` + ich „notes".
- **Dane szczegółowe → Finanse — planowane kwoty**: 4 pola do wpisania z palca plus uwagi do każdej pozycji.

### 1.3 Założone za klienta — opłaty do zwrotu ✅

- Tabela `gmp_case_client_advances` — poszczególne pozycje (notariusz, polisa itp.) z kwotą, datą poniesienia, statusem zwrotu.
- **Sekcja „Opłaty do zwrotu" w zakładce Finanse**, między Plan płatności a Historia wpłat — lista pozycji + suma z rozbiciem „założono / zwrócono / do zwrotu".
- Przycisk „Dodaj pozycję" (modal z opisem, kwotą, datą).
- Przycisk „Oznacz zwróconą" na pozycji → zwrot zostaje zapisany jako wpłata typu `client_advance_repayment` + flaga `is_repaid`.
- Trigger: suma pozycji w `gmp_case_client_advances` automatycznie aktualizuje `gmp_cases.client_advances_amount`.

### 1.4 Wprowadzanie ręczne — bez synchronizacji ✅

- Żadnych zewnętrznych integracji. Wszystkie wpłaty wprowadzasz ręcznie w zakładce Finanse.
- Widoki zbiorcze (`gmp_case_balance`, `gmp_staff_effectiveness`) czytają dane na bieżąco — w miarę jak wprowadzasz rozliczenia, podsumowania się aktualizują.

### 1.5 Lista spraw — zaległości zamiast wpłat ✅

- Kolumna „Kwota" zastąpiona kolumną **„Zaległość"** — bierze wartość z `gmp_case_balance.balance_due`.
- **Czerwona kropka** przy kwocie gdy są przeterminowane raty (`overdue_installments_amount > 0`).
- Tooltip pokazuje: „Przeterminowane raty: X zł" albo „Saldo: X zł".

---

## 2. STATUSY

Bez zmian — zgodnie z uwagami.

---

## 3. ETAPY ✅

Dodane 6 nowych wartości do enum `gmp_case_stage`:
- `wezwanie`
- `uzupelnienie_dokumentow`
- `przyspieszenie`
- `wydluzenie_terminu`
- `przeniesienie_z_innego_wojewodztwa`
- `wniosek_przeniesiony`

Dostępne w dropdowncie na karcie sprawy i na liście spraw (filtr).

---

## 4. TAGI ✅

Dodane 8 nowych tagów w `gmp_tags`:
- czeka-na-przeniesienie
- czeka-na-dok-pracodawcy
- APT
- OUTSOURCING
- problematyczny
- pretensje
- brak-reakcji-urzedu
- zaleglosci-finansowe

Działają w mechanizmie tagów (dowolna sprawa dostaje dowolny tag).

---

## 5. KATEGORIE ✅

Nowa tabela słownikowa `gmp_case_categories` z pełną listą 25 kategorii Pawła, grupowaną w UI:
- **Pobyt czasowy** (11 kategorii)
- **Pobyt stały** (4 kategorie)
- **Inne** (10 kategorii — rezydent, obywatelstwo, zaproszenie, wymiana karty, zmiana decyzji, ochrona międzynarodowa, deportacja, transkrypcja, odwołanie)

Stare kategorie (`pobyt`, `pozostale`, `smart_work` itd.) są oznaczone `is_active=false` — zachowane dla zgodności z historycznymi sprawami, ale niedostępne w dropdowncie.

Dropdown na karcie sprawy i liście spraw ładuje się dynamicznie z DB z optgroup po grupach.

---

## 6. OPIEKUN ✅

Ustawione `is_active = FALSE` dla: Mateusz Lis, Olha Kovalova, konto testowe, Michał, Natalia.

**Nie są usuwani fizycznie** — zachowane żeby historyczne sprawy miały przypisanie. Nie pojawiają się w dropdownach.

---

## 7. ODDZIAŁ ✅

- **Usunięte:** `OCII`, `OC II`, `OCI`, `OBYWATELSTWO`, `DUE`. Wszystkie sprawy z tym oddziałem → `department_id = NULL`.
- **Zostawione/dodane:** `PC 1`, `PC 2`, `PC 3`, `PC 4`, `OP — OBYWATELSTWO` (w DUW Wrocław).

---

## 8. LISTA SPRAW + KARTA SPRAWY — nowe pola ✅

### Nowe kolumny w liście spraw (`cases.html`)
- **Data złożenia wniosku** (po dacie przyjęcia)
- **Koniec legalu** (z sortowaniem — klikasz nagłówek, sortuje po `legal_stay_end_date`)
- **Zaległość** (z czerwoną kropką dla przeterminowanych)

### Nowe pola w danych szczegółowych (karta sprawy)
- **Data końca legalnego pobytu** (`legal_stay_end_date`)
- **Gdzie to leży** (`document_location`) — wolnotekstowe
- **Sprawę przyjął(a)** (`accepted_by`) — niezależne od opiekuna, z dropdownu aktywnych pracowników. To pole (nie `assigned_to`) powinno być użyte do raportów „kto ile przyjął" — patrz `gmp_staff_effectiveness.cases_accepted`.
- **Data przekazania opiekunowi** (`assigned_at`) — ustawiana automatycznie przy zmianie opiekuna (trigger SQL).

### Multi-opiekun (system 2-kowy, max 3) ✅

Tabela `gmp_case_assignees(case_id, staff_id, role_type)` — `role_type` ∈ `primary | secondary | backup`.

- **Karta sprawy**: pole „Opiekun (główny)" zostaje, pod nim nowy blok „Dodatkowi opiekunowie" z chipami + przycisk „Dodaj opiekuna" (modal: wybór pracownika + rola).
- Trigger bazodanowy pilnuje max 3 opiekunów per sprawa i tylko 1 `primary`.
- Trigger synchronizuje `gmp_cases.assigned_to` = ten `primary` (wsteczna kompat z istniejącymi zapytaniami).
- Backfill: wszystkie istniejące sprawy z `assigned_to` dostały już wpis `primary` w `gmp_case_assignees`.

---

## 9. TERMINY I KALENDARZ ✅

### Terminy (zadania w `gmp_tasks`)
- Nowe pole `task_type` z dropdownem ze słownika `gmp_task_types`:
  - Uzupełnienie braków formalnych
  - Uzupełnienie dok. merytorycznych
  - Osobiste stawiennictwo
  - Płatność — rata (auto z triggera)
  - Rozmowa z klientem
  - Rozmowa z pracodawcą
  - Kontakt z urzędem
  - Odbiór decyzji
  - Inne
- Nowe pole `show_in_calendar` (BOOLEAN) — zadanie pokazuje się w kalendarzu tylko gdy = true.
- Nowe pole `visibility` (`team | private`) — prywatne zadania widzi tylko `created_by`.

### Lista zadań (`tasks.html`)
- Filtr „Wszystkie typy terminów" z dropdownem `gmp_task_types`.
- Kolumna „Typ" (label z słownika).
- Kolumna „W kal." z ikonką kalendarza (zielona = tak, szara = nie).
- Ikonka 🔒 przy prywatnych zadaniach.

### Kalendarz (`appointments.html`)
- Toggle „Tylko moje" (zapisywany w localStorage) — filtruje spotkania po `staff_id` + zadania po `assigned_to`.
- Zadania z `show_in_calendar=true` pojawiają się w kalendarzu (żółte kafelki obok konsultacji i odcisków).
- Respekt widoczności: prywatne zadania widoczne tylko dla twórcy.

---

## 10. ZESTAWIENIA I WYDAJNOŚĆ ✅

### Widoki SQL (użyj z `staff.html` / `analytics.html`)
- **`gmp_staff_effectiveness`** — per staff: ile przyjął, ile prowadzi, przychód z przyjętych, zadania otwarte/po-terminie/wykonane, wykonane w ostatnich 30 dniach, zaległości finansowe na sprawach opiekuna.
- **`gmp_staff_tasks_monthly`** — per staff per miesiąc: total, done, open, overdue.

### UI
- `staff.html` → dodana kolumna **„Zal. fin."** (z `pending_balance` z widoku).
- Pozostałe widoki SQL czekają na rozbudowę `analytics.html` — dane są dostępne, zrobię jako P2.

---

## 11. DASHBOARD — alert „brak reakcji pracodawcy" ✅

Widok SQL `gmp_employer_inaction_alerts`:
- Sprawa aktywna / zlecona + ma `employer_id`
- Ma tag `czeka-na-dok-pracodawcy` LUB `brak-reakcji-urzedu`
- Ostatnia aktywność > 14 dni temu
- Level: `no_response_14` (14-30 dni) lub `no_response_30` (30+ dni)

W `alerts.html` dodana 4. sekcja „Brak reakcji pracodawcy" z listą i kolorystyką wg levelu.

---

## 12. ANKIETA KLIENTA ✅

### Rozszerzone pola
Zakładka „Ankieta klienta" (również w wersji elektronicznej wysyłanej linkiem) teraz zawiera wszystkie pola z listy Pawła:
- **Dane osobowe**: imiona poprzednie, nazwisko panieńskie, imię ojca, imię matki, nazwisko panieńskie matki, miejsce urodzenia, kraj pochodzenia, stan cywilny, wzrost (cm), kolor oczu, znaki szczególne / tatuaże
- **Kontakt**: profil zaufany (tak/nie/nie wiem)
- **Zatrudnienie**: tel. pracodawcy, email pracodawcy
- **Historia**: rodzaj dokumentu wjazdu (wybór), cel wizy EU (jeśli wiza UE), lista pobytów poza PL w ostatnich 5 lat
- **Rodzina w PL**: lista (imię, data ur., miejscowość)

### „Wypełnij z palca" ✅

- Przycisk w zakładce Ankieta (2 miejsca: gdy brak intake i gdy jest).
- Otwiera modal pełnoekranowy z wszystkimi polami.
- Pre-fill: podstawowe pola (imię, nazwisko, data ur., obywatelstwo, tel, email) podstawiają się z `gmp_clients` jeśli puste.
- Zapis do `gmp_intake_tokens.data` JSONB — **ta sama struktura co ankieta elektroniczna**. Jeśli klient później wypełni link elektroniczny, dane się nałożą (merge).
- Dodawanie wielu członków rodziny i wielu pobytów poza PL (dynamiczne wiersze).

### Auto-wypełnianie dokumentów — CZEŚCIOWO
- Dokumenty załączone przez klienta w ankiecie elektronicznej są już zapisywane w `gmp_intake_documents`. Paweł sugerował żeby pojawiały się w zakładce **Dokumenty** karty sprawy. **Jeszcze nie wdrożone** — to osobna robota na migrację między dwoma tabelami. Patrz „Do-zrobienia" poniżej.

---

## 13. KALENDARZ — widok + prywatne zadania ✅

Zrealizowane w pkt 9 (toggle „Tylko moje" + prywatne zadania).

---

## 14. KONTAKT Z KARTY SPRAWY (tel/WhatsApp/email) — tylko opiekun ⏸

**NIE wdrożone.** Czeka na listę opiekun→tel+email od Pawła. Zrobię gdy dostarczysz dane.

Co jest gotowe pod spodem:
- Uprawnienia: `gmp_case_assignees` pozwala sprawdzić kto jest opiekunem sprawy.
- Istniejące przyciski quick-action (call/WhatsApp/email) są już w karcie sprawy — trzeba tylko dodać bramkę `isAssigneeOfThisCase()`.

---

## 15. LICZNIK DNI OD PRZYSTĄPIENIA ⏸

**NIE wdrożone w UI listy spraw.** Pole `date_joined` istnieje w bazie. Zrobię osobną ikoną w kolumnie „Przyjęta" (dwukropek z datami) albo jako dodatkową kolumnę w P2.

---

## 16. UPRAWNIENIA (pracownik nie widzi globalnych przychodów) ⏸

**Częściowo** — rola `gmp_staff.permission_overrides` i view `view_global_finance` już istnieją z wcześniejszych migracji. Nie przepisywałem UI aby ukryć/pokazać kafelki finansowe — to wymaga bramek w `dashboard.html` i `analytics.html` na poziomie widoków. Zrobię w P2 po weryfikacji czy aktualne role działają jak chce Paweł.

---

## 17. START 2026-04-27 — stan na deploy

**Gotowe do użycia od poniedziałku 2026-04-27:**
- Wprowadzanie spraw z pełnymi polami (kategoria ze słownika, etap rozszerzony, tagi rozszerzone, opiekun + dodatkowi opiekunowie, data końca legalu, gdzie leży, sprawę przyjął)
- Finanse z 4 rodzajami opłat + plan rat + „założone za klienta" + historia wpłat
- Lista spraw z kolumną zaległości + data złożenia + koniec legalu
- Kalendarz z widokiem „tylko moje" + zadania w kalendarzu + prywatne zadania
- Alerty (4 sekcje w tym „brak reakcji pracodawcy")
- Ankieta klienta z rozszerzonymi polami + tryb z palca

---

## Do-zrobienia po feedbacku Pawła (co nie zostało wdrożone)

| # | Zadanie | Powód / decyzja |
|---|---------|-----------------|
| 14 | Blokada kontaktu z karty sprawy tylko dla opiekuna | Wymaga listy opiekun → tel + email |
| 15 | Licznik dni od przystąpienia w liście spraw (kolumna) | Decyzja UI — wolisz osobną kolumnę czy dwuwierszowo przy `Przyjęta`? |
| 16 | RLS / gate finansów globalnych per rola | Warto uzgodnić które ekrany dokładnie ukrywać |
| 12 (doc) | Auto-migracja dokumentów z `gmp_intake_documents` do `gmp_documents` | Wymaga decyzji: automat czy manualne „Zatwierdź dokument" |
| 9 (cron) | Uruchomienie crona wywołującego `gmp_generate_installment_tasks()` codziennie | Supabase pg_cron albo edge function scheduled — dobrać po pierwszym tygodniu |

---

## Wdrożone migracje SQL

| Plik | Zakres |
|------|--------|
| [20260420_pawel_slowniki_v2.sql](supabase/migrations/20260420_pawel_slowniki_v2.sql) | Kategorie, etapy, tagi, oddziały, opiekunowie |
| [20260420_pawel_finanse_enums.sql](supabase/migrations/20260420_pawel_finanse_enums.sql) | Nowe wartości enum płatności (osobny plik — PG wymaga) |
| [20260420_pawel_finanse_v2.sql](supabase/migrations/20260420_pawel_finanse_v2.sql) | Nowe pola finansów + plan rat + założone za klienta + balance view + triggery |
| [20260420_pawel_case_fields_v2.sql](supabase/migrations/20260420_pawel_case_fields_v2.sql) | legal_stay_end_date, document_location, accepted_by, assigned_at |
| [20260421_pawel_multi_assignees.sql](supabase/migrations/20260421_pawel_multi_assignees.sql) | Multi-opiekun max 3 + triggery synchronizacji |
| [20260421_pawel_tasks_visibility.sql](supabase/migrations/20260421_pawel_tasks_visibility.sql) | task_type, show_in_calendar, visibility + słownik typów |
| [20260422_pawel_staff_stats_and_alerts.sql](supabase/migrations/20260422_pawel_staff_stats_and_alerts.sql) | Widoki efektywności + alert pracodawca |

## Zmodyfikowane pliki UI

`crm/cases.html`, `crm/case.html`, `crm/tasks.html`, `crm/appointments.html`, `crm/alerts.html`, `crm/staff.html`, `crm/payments.html`, `crm/clients.html`, `crm/kanban.html`, `crm/work-permits.html`, `crm/dashboard.html`, `crm/employers.html` (9 z nich wymagało naprawy PostgREST embed ambiguity po dodaniu `accepted_by`).

---

**Źródłowe uwagi:** [uwagi-pawla-2026-04-20.md](uwagi-pawla-2026-04-20.md)
**Plan przed wdrożeniem:** [PLAN_POPRAWEK_2026-04-20.md](PLAN_POPRAWEK_2026-04-20.md)
