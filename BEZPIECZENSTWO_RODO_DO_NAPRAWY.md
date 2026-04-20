# PILNE: Bezpieczeństwo RODO — do naprawy po starcie 2026-04-27

**Kontekst:** Drugi code review (2026-04-23) znalazł 2 ryzyka RODO-class które **NIE blokują** startu 2026-04-27 (wymagają praktycznie znanego sekretu do exploitacji), ale **muszą być naprawione w pierwszym tygodniu produkcji**.

---

## 🚨 RYZYKO 1: Dokumenty klientów z ankiety elektronicznej

**Plik:** `supabase/migrations/20260418_client_intake.sql:83-107`

**Problem:** Policy RLS na tabelach `gmp_intake_tokens` / `gmp_intake_documents` + bucket Storage `intake-docs` mają `USING (true)` / `USING (expires_at > NOW())` dla roli `anon`.

Oznacza to, że **dowolna osoba znająca URL projektu Supabase** (z public anon key) może:
- Wylistować wszystkie ankiety które nie wygasły
- Pobrać paszporty, umowy, zdjęcia biometryczne **wszystkich klientów**
- Usunąć cudze pliki z bucketu

**Dlaczego NIE jest blocker na 2026-04-27:**
W praktyce atakujący musi znać `SUPABASE_ANON_KEY` (publiczny, ale widoczny tylko w HTML CRM i w URL intake) + znać nazwy tabel. Próg wejścia niski ale nie zerowy. **Istniejące tokeny 32-char crypto-secure nie chronią tu — chroniły tylko przed zgadnięciem URL, nie przed bezpośrednim atakiem na RLS.**

**Plan naprawy (po 2026-04-27):**

### Opcja A — RPC SECURITY DEFINER (rekomendowana)
Stwórz funkcje:
- `gmp_intake_get_by_token(p_token TEXT)` — zwraca intake po tokenie
- `gmp_intake_update_data(p_token TEXT, p_data JSONB)` — update tylko gdy token pasuje
- `gmp_intake_submit(p_token TEXT)` — przejście na status='submitted'
- `gmp_intake_upload_doc(p_token TEXT, p_doc_type TEXT, p_storage_path TEXT, ...)` — metadata

Usuń policy `intake_anon_read`, `intake_anon_update`, `intake_docs_anon_*` — anon dostaje dostęp TYLKO przez RPC z tokenem.

Zmiany w `crm/intake/index.html` — zamień `supabase.from('gmp_intake_tokens').select/update` na `supabase.rpc('gmp_intake_get_by_token', ...)`.

### Opcja B — Custom header
Supabase PostgREST można skonfigurować żeby przekazywał custom headers do `current_setting`. Policy: `USING (token = current_setting('request.headers')::jsonb->>'x-intake-token')`. Wymaga konfiguracji + zmian frontendu.

### Opcja C (uzupełniająca) — Storage scoped per token
Policy bucket: `name LIKE token::text || '/%'`. Plik uploadowany do `intake-docs/{token}/paszport.jpg`.

**Czas naprawy:** 4-6h pracy z testami.

---

## 🚨 RYZYKO 2: Hasła profilu zaufanego gov.pl w plaintext

**Plik:** `crm/clients.html:322-334` (`addTrustedProfile`) + tabela `gmp_trusted_profile_credentials`

**Problem:** Login i hasło cudzoziemca do systemu Państwa gov.pl / epuap są zapisywane jako **plaintext** w tabeli `trusted_profile_password`. Dodatkowo UI używa natywnego `prompt()` — hasło widoczne w cleartext podczas wpisywania.

**Wyjątek ryzyka:** Obecne RLS na tabeli `gmp_trusted_profile_credentials` jest RESTRICTIVE (`admin_only_credentials` — tylko owner/admin może SELECT). Policy FORCE ROW LEVEL SECURITY włączone. Więc **jedynym dostępem jest admin/owner** — nie każdy pracownik. Ale Paweł sam ma dostęp i hasła są czytelne.

Tabela ma w komentarzu:
```
DANE EKSTREMALNIE WRAZLIWE. Login/haslo gov.pl profilu zaufanego.
RLS: tylko admin. UI: wymaga potwierdzenia przed wyswietleniem.
Faza 5: szyfrowanie via pgsodium.
```

Czyli już było zaplanowane — nigdy nie wdrożone.

**Plan naprawy:**
1. Włącz rozszerzenie `pgsodium` (Supabase wspiera)
2. Klucz w Supabase Vault (nie commit do repo)
3. Migracja: `ALTER COLUMN trusted_profile_password TYPE BYTEA` + przeszyfrowanie istniejących
4. RPC: `gmp_trusted_profile_get(client_id)` — deszyfruje w locie, wymaga role='owner'/'admin'
5. UI: zamień `prompt()` na custom modal z `<input type="password">` i nie loguj nigdy plaintext
6. Audit log na każde zapisanie + wyświetlenie

**Czas naprawy:** 6-8h z testami (większość to konfiguracja Vault + migracja danych).

---

## 🟡 POMNIEJSZE

### Backup weryfikacyjny przed 2026-04-27
Przed startem zrób `supabase db dump --schema public > backup-preprod.sql` i trzymaj poza repo. W razie katastrofy (np. naprawy RLS zepsują dane) odzyskanie przez PITR Supabase trwa czas + wymaga ticketu — lokalny dump to natychmiastowa kopia.

**Komenda:**
```bash
SUPABASE_DB_PASSWORD='...' npx supabase db dump --schema public -f backup-preprod-$(date +%Y%m%d).sql
```

### Conflict detection w `saveCase`
Obecnie 2 pracowników edytujący tę samą sprawę równocześnie → ostatnie wygrywa cicho. Przy kancelarii 7 osób prawdopodobieństwo małe, ale zdarzy się.

**Plan:** dodaj `updated_at` check w `saveCase()` — przed UPDATE porównaj czy `caseData.updated_at` w JS == aktualne w DB. Jeśli nie, pokaż diff i pozwól wybrać którą wersję zachować.

**Czas:** 2-3h.

### Soft-delete zamiast hard-delete
`deleteCase` / `deleteIntake` to CASCADE destruction — odzyskanie po pomyłce = niemożliwe (chyba że PITR).

**Plan:** dodaj `deleted_at TIMESTAMPTZ` do kluczowych tabel, filtruj `WHERE deleted_at IS NULL`, przycisk "Kosz" dla owner/admin.

**Czas:** 4-6h.

---

## PRIORYTET

1. **Tydzień 1 po starcie:** RYZYKO 1 (intake docs RODO) — KRYTYCZNE
2. **Tydzień 2:** RYZYKO 2 (trusted profile passwords) — WAŻNE
3. **Tydzień 3-4:** Conflict detection + Soft-delete

Przed 2026-04-27 — zrób backup (pkt „Backup weryfikacyjny").
