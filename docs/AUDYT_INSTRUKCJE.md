# INSTRUKCJE WYKONANIA AUDYTU PRE-LAUNCH

**Dla:** Claude (nowa sesja)
**Cel:** Wypełnić `AUDYT_RAPORT_TEMPLATE.md` na podstawie planu w `AUDYT_PLAN.md` (13 sekcji). **System idzie wkrótce live** — audyt MUSI wyłapać wszystko, żeby uniknąć hot-fixów na produkcji.

**Priorytet sekcji:**
1. **Najwyższy:** sekcja 8 (Security) + sekcja 13 (Production readiness) + Pre-conditions
2. **Wysoki:** sekcje 1-4 (Spec Pawła)
3. **Średni:** sekcje 5-7 (DB/edge fn/UI)
4. **Niski:** sekcje 9-10 (Performance/mobile) — można dopolerować po launch
5. **Sanity:** sekcje 11-12 (Pre-v3/Compatibility) — sprawdzenie regresji

---

## START — pierwsze 15 minut

### 1. Przeczytaj 3 dokumenty (kolejność krytyczna)

```bash
# A) Pełny plan audytu (ten dokument odsyła)
cat docs/AUDYT_PLAN.md

# B) Spec źródłowa (nie commited, lokalnie)
head -200 PAWEL_ROADMAP_v3.md
# Następnie skanuj sekcje (od linii ~2600 dla Etap V/VI/VII)

# C) Szablon raportu (ten wypełnisz)
cat docs/AUDYT_RAPORT_TEMPLATE.md
```

### 2. Sprawdź środowisko

```bash
# Czy jesteś w katalogu projektu
pwd  # powinno być /c/repos_tn/getmypermit

# Czy są zmienne środowiskowe
[ -f .env ] && echo "✓ .env istnieje" || echo "✗ brak .env — potrzebne SUPABASE_DB_PASSWORD, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"

# Czy są dependencies
ls node_modules/playwright 2>&1 | head -2
ls node_modules/pg 2>&1 | head -2

# Test połączenia DB (przez istniejący skrypt)
node scripts/run_etap_iv_migrations.mjs 2>&1 | head -5
# Powinno wyświetlić "✓ Connected" + status migracji
```

### 3. Aktualizuj pamięć wiedzą o tej sesji

Zapisz w memory (auto memory):
- Sesja audytu rozpoczęta
- Czytasz `AUDYT_PLAN.md` jako spec
- Wypełniasz `AUDYT_RAPORT_TEMPLATE.md`
- Odpowiedzialność: znaleźć WSZYSTKIE odchylenia od specyfikacji

---

## STRATEGIA AUDYTU — jak zorganizować pracę

### Sesje pracy (8-10 sesji × 2-3h, total 18-25h)

| Sesja | Sekcje planu | Czas | Output |
|-------|--------------|------|--------|
| 1 | Setup + Sekcja 8.1-8.5 (RLS + JWT + audit log + RODO + permissions) | 3h | Security baseline check |
| 2 | Sekcja 8.6-8.12 (OWASP Top 10 + secrets + pen test + backup + monitoring) | 3h | Pełen security audit |
| 3 | Sekcja 4 (pre-conditions) + Sekcja 1 (wymagania Pawła) | 2h | Status wymagań |
| 4 | Sekcja 2 (DoD etapów 0.5-III) | 3h | Status 6 etapów |
| 5 | Sekcja 2 (DoD etapów IV-VII) + Sekcja 3 (cross-checks A/B/C/D/E) | 3h | Status 4 etapów + cross-checks |
| 6 | Sekcja 5 (DB schema/triggery/RLS/cron) + Sekcja 6 (edge functions) | 2h | Tech audit DB+edge |
| 7 | Sekcja 7 (UI/UX) — strony CRM v3 (case, employer, group, automations) | 3h | Per-page CRM v3 |
| 8 | Sekcja 7 — pre-v3 strony CRM (clients, leads, payments, etc.) + Sekcja 11.6 | 3h | Per-page pre-v3 |
| 9 | Sekcja 9 (performance) + Sekcja 10 (mobile/a11y) + Sekcja 11.1-11.5 (landing/leads/integracje) | 3h | Performance + mobile + landing |
| 10 | Sekcja 12 (compatibility) + Sekcja 13 (production readiness) + Go/No-Go decision + finalize raport | 3h | **Final raport z Go/No-Go** |

**TOTAL:** 28h (z buffer; realnie 18-22h jeśli sprawnie).

**WAŻNE:** Sesje 1-2 (Security) MUSZĄ być pierwsze. Każdy security blocker wstrzyma launch — lepiej wiedzieć od razu.

### Kolejność WAŻNA (pre-launch)

**1. NAJPIERW SECURITY (sesje 1-2)** — bo każdy blocker wstrzyma launch. Lepiej wykryć w sesji 1 niż w sesji 9.

**2. POTEM Pre-conditions + Wymagania Pawła (sesja 3)** — fundament spec.

**3. POTEM DoD etapów + cross-checks (sesje 4-5)** — co miało być wdrożone.

**4. POTEM DB i edge functions (sesja 6)** — techniczne fundamenty.

**5. POTEM UI per strona (sesje 7-8)** — najwięcej pracy, ale dobrze podzielić.

**6. POTEM performance + mobile + landing (sesja 9)** — wymagają działającego systemu.

**7. NA KOŃCU Compatibility + Production readiness + Go/No-Go (sesja 10)** — synteza wszystkiego.

---

## NARZĘDZIA — co używać do testowania

### A. SQL queries (do DB)

Użyj wzorca z `scripts/run_etap_*_migrations.mjs`:

```javascript
import 'dotenv/config';
import pg from 'pg';
const c = new pg.Client({
    host: 'aws-0-eu-west-1.pooler.supabase.com', port: 5432,
    user: 'postgres.gfwsdrbywgmceateubyq', database: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
});
await c.connect();
const { rows } = await c.query(`SELECT ...`);
console.table(rows);
await c.end();
```

### B. Playwright E2E (do UI)

Wzór z `scripts/e2e_test_ui.mjs`:

```javascript
import 'dotenv/config';
import { chromium } from 'playwright';

// 1. Get JWT token
const SUPA = process.env.SUPABASE_URL;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const link = await fetch(SUPA + '/auth/v1/admin/generate_link', {
    method: 'POST',
    headers: {Authorization: 'Bearer ' + SVC, apikey: SVC, 'Content-Type': 'application/json'},
    body: JSON.stringify({type: 'magiclink', email: 'tomekniedzwiecki@gmail.com'})
}).then(r => r.json());
const ver = await fetch(SUPA + '/auth/v1/verify', {
    method: 'POST',
    headers: {apikey: ANON, 'Content-Type': 'application/json'},
    body: JSON.stringify({type: 'magiclink', email: 'tomekniedzwiecki@gmail.com', token: link.email_otp})
}).then(r => r.json());
const session = {access_token: ver.access_token, refresh_token: ver.refresh_token, expires_in: ver.expires_in, expires_at: Math.floor(Date.now()/1000) + ver.expires_in, token_type: 'bearer', user: ver.user};

// 2. Launch browser z auth
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
await ctx.addInitScript(({ session }) => { localStorage.setItem('gmp-crm-auth', JSON.stringify(session)); }, { session });
const page = await ctx.newPage();

// 3. Capture errors
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(`[console] ${m.text().slice(0,200)}`); });
page.on('response', r => { if (r.status() >= 400 && !r.url().includes('favicon')) errs.push(`[net ${r.status()}] ${r.url().split('?')[0].slice(-80)}`); });
page.on('pageerror', e => errs.push(`[pageerror] ${e.message.slice(0,200)}`));

// 4. Test
await page.goto('https://crm.getmypermit.pl/case.html?id=...', { waitUntil: 'networkidle' });
await page.waitForSelector('#case-content:not(.hidden)');
// ... interactions ...

// 5. Report
if (errs.length) {
    console.log(`⚠ ${errs.length} errors:`);
    [...new Set(errs)].forEach(e => console.log('  -', e));
}
await browser.close();
```

### C. Subagenty

Dla **research'u** lub **eksploracji** używaj `Explore` agenta. Przykład:

```
Agent({
  description: "Sprawdź wszystkie views w DB",
  subagent_type: "Explore",
  prompt: "Połącz z prod DB (host aws-0-eu-west-1.pooler.supabase.com). Wyciągnij listę wszystkich views w schemacie public z prefixem gmp_. Dla każdego view: definicja (pg_get_viewdef), przybliżona liczba rows, czas wykonania SELECT * LIMIT 100 (EXPLAIN ANALYZE). Raport jako markdown table."
})
```

Dla **e2e batch** używaj `general-purpose` agenta:

```
Agent({
  description: "E2E test wszystkich stron",
  subagent_type: "general-purpose",
  prompt: "Stwórz playwright skrypt który dla każdej strony w c:/repos_tn/getmypermit/crm/*.html (poza login/forgot) zaloguj się jako tomekniedzwiecki@gmail.com, otwórz stronę, czekaj na networkidle, sprawdź console errors + network 4xx/5xx, screenshot. Raport: per-strona status (OK/Errors). Lista 5-10 najpoważniejszych bugów."
})
```

### D. Vercel + Supabase CLI

```bash
# Lista deploys
vercel ls getmypermit-crm | head -10

# Lista edge functions
npx supabase functions list --project-ref gfwsdrbywgmceateubyq

# Deploy edge function (jeśli trzeba updateować)
npx supabase functions deploy <name> --project-ref gfwsdrbywgmceateubyq

# Sprawdź alias
vercel alias ls | grep crm.getmypermit
```

---

## RÓŻNICOWANIE BUGÓW — priorytety (4 poziomy pre-launch)

### BLOCKER (NEW dla pre-launch)
**Definicja:** uniemożliwia go-live. Launch musi być opóźniony lub zablokowany.

- RLS bypass — anon widzi dane klientów / wszystkie sprawy
- Missing JWT verification na sensitive edge function
- PZ encryption brak przy > 0 wpisów (RODO violation)
- Hardcoded credentials w repo (SUPABASE_SERVICE_ROLE_KEY exposed)
- SQL injection / XSS reflected na production endpoint
- Brak SSL / niedziała HTTPS
- Brak DB backup / nie testowany restore
- Audit log writeable / można usunąć (tampering)
- Strona produkcyjna (index.html) crashuje / 500
- Lead form nie zapisuje (utrata leadów)

### CRITICAL
**Definicja:** blokuje funkcję, fix natychmiast po launch (1-2 dni).

- Funkcja zwraca błąd HTTP 500 dla niektórych przypadków
- Strona CRM (nie publiczna) się nie ładuje
- Dane się nie zapisują w specyficznych warunkach (UPDATE/INSERT failuje)
- Brak walidacji po stronie serwera (tylko JS, można bypass)
- Email confirmation nie wysyłany (klient nie wie co się dzieje)
- IDOR — dostęp do nie-swoich obiektów (jeśli per-user RLS planowany)
- Performance bad — strona ładuje > 5s

### MAJOR
**Definicja:** psuje UX, fix w 1-2 tyg.

- Funkcja działa ale niepoprawnie (zła kolumna, zły status)
- UI element nie reaguje na klik
- Filtr nie filtruje, search nie znajduje
- Conditional UI pokazuje co nie powinno
- Mobile broken layout (>700px nadal niereagujący)
- Brak fallback dla starszych browserów

### MINOR
**Definicja:** kosmetyka, można odłożyć (post-launch backlog).

- Zły kolor, alignment
- Brak tooltipa
- Mała responsywność (overflow przy 320px)
- Inline styles zamiast Tailwind (refactor)
- Console warning (nie error)
- Ruchanie nazw zmiennych
- Drobne typo

---

## CONVENTIONS PISANIA RAPORTU

### Format finding'u

```markdown
### [PRIORITY] Nazwa problemu (krótka)
**Gdzie:** plik:linia (jeśli kod) lub URL (jeśli UI)
**Problem:** 1-2 zdania opisu
**Reprodukcja:**
1. Krok 1
2. Krok 2
3. Spodziewane vs Otrzymane
**Spec source:** sekcja roadmapy lub punkt Pawła (np. "PAWEL_ROADMAP § 1.7" lub "Pkt 11 dokumentu Pawła")
**Estymacja fix:** 30min / 2h / 1d
**Sugerowany fix:** krótki opis lub kod
```

### Pełen ciąg statusów

- `✅ DONE` — w pełni zgodne ze specyfikacją
- `⚠ PARTIAL` — działa ale z odchyleniami / brakuje sub-feature
- `❌ MISSING` — brak implementacji
- `🔄 OUTDATED` — implementacja jest, ale dane są stare/niespójne (np. brak backfill)
- `❓ UNCERTAIN` — nie da się jednoznacznie sprawdzić bez dostępu do produkcji

---

## CO ROBIĆ JEŚLI ZNAJDZIESZ BUG

**Nie naprawiaj automatycznie.** Audyt = znajdowanie, nie naprawianie.

Wyjątek: **trywialne typo / literówki** — możesz fix'nąć od razu, ale OZNACZ w raporcie że "fixed inline".

Wszystkie bugi → lista w raporcie z priorytetami → user zdecyduje co fix'ować.

Po skończonym audycie: jeśli user da zielone światło, wtedy nowa sesja "FIX SESSION" naprawi z listy.

---

## CO POMINĄĆ (świadomie)

- **Refactor sugestie kosmetyczne** — chyba że user prosi
- **Optymalizacje performance < 100ms** — nie warto
- **Tailwind migration** — to osobny projekt
- **Design improvements** — chyba że konkretny breakdown UX

**Skupić się na:** czy jest zgodne ze spec Pawła, czy działa, czy nie ma bugów blokujących.

---

## KOŃCÓWKA AUDYTU

Po wypełnieniu raportu:

1. **Zapisz raport** w `docs/AUDYT_RAPORT_2026-MM-DD.md` (z datą)
2. **Commit** raport: `git add docs/AUDYT_RAPORT_*.md && git commit -m "Audyt wdrożenia 2026-MM-DD — [N] findings"`
3. **Push:** `git push`
4. **Podsumuj userowi** w 5-10 zdań: ile bugów per priorytet, top 3 critical, ile spec wykonane.

---

## CZĘSTE BŁĘDY DO UNIKNIĘCIA

1. **Nie zakładaj że istniejący kod jest zgodny ze spec** — czytaj spec, weryfikuj.
2. **Nie testuj na zmianach** — testuj na production state (`https://crm.getmypermit.pl`). Jeśli ma być test danych testowych, zrób osobne sprawy.
3. **Nie polegaj na manualnym sprawdzeniu** — jeśli da się napisać skrypt SQL/playwright, napisz.
4. **Nie pomijaj sekcji 1 (Wymagania Pawła)** — to fundament. Bez tego cross-checks nie mają sensu.
5. **Nie napraw raportu jeśli bug znaleziony** — raport ma listować problemy, nie być zoptymalizowany.

---

**Wersja:** 1.0
**Data:** 2026-05-01
**Powiązane:** `AUDYT_PLAN.md`, `AUDYT_RAPORT_TEMPLATE.md`
