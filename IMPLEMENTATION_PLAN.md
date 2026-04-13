# GetMyPermit - Kompletny Plan Implementacji

## Cel
Przeniesienie funkcjonalnosci z TN CRM do GetMyPermit z dostosowaniem do specyfiki kancelarii prawnej:
1. System kalendarza (spotkania z leadami/klientami)
2. System ofert (generowanie, podglad dla klienta)
3. Zarzadzanie prawnikami (przypisywanie leadow)

---

# CZESC 1: KALENDARZ

## 1.1 Struktura bazy danych

### Tabela: `calendar_events`
```sql
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    lead_id UUID REFERENCES permit_leads(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES lawyers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    event_type TEXT DEFAULT 'meeting', -- meeting, deadline, hearing, consultation
    location TEXT, -- adres, sala, online
    reminder_sent BOOLEAN DEFAULT FALSE
);

-- RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can CRUD calendar_events"
    ON calendar_events FOR ALL
    USING (auth.role() = 'authenticated');
```

### Typy wydarzen dla kancelarii:
- `meeting` - spotkanie z klientem
- `deadline` - termin (np. zlozenia dokumentow)
- `hearing` - rozprawa/przesluchanie
- `consultation` - konsultacja

## 1.2 Pliki do utworzenia/zmodyfikowania

### Nowe pliki:
1. `calendar.html` - strona kalendarza (skopiowac z TN CRM i dostosowac)
2. `supabase/migrations/XXXXXX_calendar_events.sql` - migracja

### Modyfikacje:
1. `lead.html` - juz ma podstawowa integracje spotkan (meetings JSON)
   - Zamienic na prawdziwa tabele `calendar_events`
   - Dodac modal tworzenia spotkan z polami: typ, lokalizacja

2. `admin.html` - dodac link do kalendarza w nawigacji

## 1.3 Funkcje JavaScript do skopiowania z TN CRM calendar.html

```javascript
// Kluczowe funkcje:
- loadEvents() - pobieranie wydarzen z bazy
- renderMonthView() - widok miesiac
- renderWeekView() - widok tydzien
- renderDayView() - widok dzien
- saveEvent() - zapis wydarzenia
- deleteEvent() - usuwanie
- openEventModal() - modal dodawania
- getDeadlineEvents() - pobieranie terminow z leadow

// Dostosowania dla kancelarii:
- event_type: meeting -> spotkanie, hearing -> rozprawa, deadline -> termin
- location: mozliwosc podania sali, adresu lub "online"
- Integracja z expected_close leadow jako terminy
```

## 1.4 Kroki implementacji

1. [ ] Utworzyc migracje SQL `calendar_events`
2. [ ] Uruchomic migracje w Supabase
3. [ ] Skopiowac `calendar.html` z TN CRM
4. [ ] Dostosowac nazewnictwo (team_members -> lawyers)
5. [ ] Dostosowac typy wydarzen
6. [ ] Zmodyfikowac `lead.html`:
   - Zamienic JSON meetings na calendar_events
   - Dodac pole event_type do modalu
   - Dodac pole location
7. [ ] Dodac link w nawigacji
8. [ ] Przetestowac CRUD wydarzen

---

# CZESC 2: SYSTEM OFERT

## 2.1 Struktura bazy danych

### Tabela: `offers` (szablony ofert)
```sql
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    milestones JSONB DEFAULT '[]', -- etapy realizacji
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Przykladowe oferty dla kancelarii:
-- "Pomoc w uzyskaniu pozwolenia na pobyt" - 5000 PLN
-- "Odwolanie od decyzji" - 3000 PLN
-- "Pelna obsluga sprawy imigracyjnej" - 8000 PLN

-- RLS
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage offers"
    ON offers FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Anon can view active offers"
    ON offers FOR SELECT
    USING (is_active = TRUE);
```

### Tabela: `client_offers` (oferty wyslane do klientow)
```sql
CREATE TABLE IF NOT EXISTS client_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES permit_leads(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    unique_token TEXT UNIQUE NOT NULL,
    valid_until DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES lawyers(id),

    -- Tracking
    view_count INTEGER DEFAULT 0,
    viewed_at TIMESTAMPTZ,
    view_history JSONB DEFAULT '[]',

    -- Customization
    custom_price DECIMAL(10,2), -- indywidualna cena dla klienta
    offer_type TEXT DEFAULT 'full', -- full, starter, custom

    -- Status
    status TEXT DEFAULT 'pending' -- pending, viewed, accepted, rejected, expired
);

-- RLS
ALTER TABLE client_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage client_offers"
    ON client_offers FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Anon can view by token"
    ON client_offers FOR SELECT
    USING (unique_token = current_setting('request.headers', true)::json->>'x-offer-token');
```

## 2.2 Pliki do utworzenia

### Nowe pliki:
1. `offers.html` - zarzadzanie szablonami ofert (admin)
2. `offer.html` - edycja pojedynczej oferty (admin)
3. `client-offer.html` - podglad oferty dla klienta (publiczny)
4. `supabase/migrations/XXXXXX_offers_tables.sql`

### Modyfikacje lead.html:
1. Sekcja "Oferta dla klienta" z:
   - Wybor szablonu oferty
   - Data waznosci
   - Indywidualna cena (opcjonalnie)
   - Przycisk "Generuj link do oferty"
   - Wyswietlanie statusu (wyslano, obejrzano, zaakceptowano)
   - Kopiowanie linku
   - Historia wyswietlen

## 2.3 Funkcje do zaimplementowania

### W lead.html (admin):
```javascript
// Skopiowac z TN CRM lead.html:
- loadClientOffer() - pobieranie istniejaceej oferty
- generateClientOffer() - tworzenie nowej oferty
- updateClientOfferSection() - aktualizacja UI
- copyOfferUrl() - kopiowanie linku
- getClientOfferUrl() - generowanie URL

// Nowe dla kancelarii:
- sendOfferByEmail() - wysylka emailem
- sendOfferBySMS() - wysylka SMS (opcjonalnie)
```

### W client-offer.html (klient):
```javascript
// Skopiowac i dostosowac z TN CRM client-offer.html:
- loadOffer() - pobieranie oferty po tokenie
- trackView() - rejestracja wyswietlenia
- acceptOffer() - akceptacja oferty
- rejectOffer() - odrzucenie oferty
- downloadPDF() - pobranie oferty jako PDF

// Layout:
- Logo kancelarii
- Dane klienta
- Szczegoly oferty (usluga, cena, zakres)
- Etapy realizacji (milestones)
- Warunki wspolpracy
- Przyciski akcji (akceptuj, kontakt)
```

## 2.4 Kroki implementacji

1. [ ] Utworzyc migracje SQL (offers + client_offers)
2. [ ] Uruchomic migracje
3. [ ] Utworzyc `offers.html` - lista szablonow
4. [ ] Utworzyc `offer.html` - edycja szablonu
5. [ ] Utworzyc `client-offer.html` - podglad dla klienta
6. [ ] Zmodyfikowac `lead.html`:
   - Dodac sekcje generowania oferty
   - Dodac pole wyboru szablonu
   - Dodac generowanie linku
   - Dodac tracking statusu
7. [ ] Dodac RLS policies
8. [ ] Przetestowac caly flow

---

# CZESC 3: ZARZADZANIE PRAWNIKAMI

## 3.1 Struktura bazy danych

### Tabela: `lawyers` (zamiast team_members)
```sql
CREATE TABLE IF NOT EXISTS lawyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialization TEXT[], -- ['imigracja', 'prawo_pracy', 'prawo_rodzinne']
    color TEXT DEFAULT '#3b82f6', -- kolor do wyswietlania w UI
    role TEXT DEFAULT 'lawyer', -- admin, lawyer, assistant
    is_active BOOLEAN DEFAULT TRUE,
    max_cases INTEGER DEFAULT 50, -- max liczba spraw
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lawyers"
    ON lawyers FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage lawyers"
    ON lawyers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM lawyers
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
```

### Modyfikacja permit_leads:
```sql
ALTER TABLE permit_leads
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES lawyers(id) ON DELETE SET NULL;

COMMENT ON COLUMN permit_leads.assigned_to IS 'Prawnik przypisany do sprawy';
```

## 3.2 Pliki do utworzenia

### Nowe pliki:
1. `lawyers.html` - lista prawnikow (admin)
2. `lawyer.html` - profil prawnika / edycja (admin)
3. `supabase/migrations/XXXXXX_lawyers_table.sql`

### Modyfikacje:
1. `lead.html`:
   - Dodac pole "Przypisany prawnik" (dropdown)
   - Wyswietlac avatar/kolor prawnika
   - Zapisywac zmiane przypisania

2. `admin.html` (lista leadow):
   - Filtrowanie po prawniku
   - Kolumna z przypisanym prawnikiem
   - Bulk assign (przypisz wiele leadow)

## 3.3 UI Components

### Dropdown przypisania prawnika:
```html
<div>
    <label class="block text-zinc-500 text-[10px] font-mono uppercase tracking-wider mb-1.5">
        Przypisany prawnik
    </label>
    <select id="field-assigned-to" class="input-field w-full rounded-lg px-3 py-2.5 text-sm text-white">
        <option value="">Nieprzypisany</option>
        <!-- Opcje generowane dynamicznie -->
    </select>
</div>
```

### Lista prawnikow w lawyers.html:
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- Karta prawnika -->
    <div class="bg-zinc-900/40 border border-white/5 rounded-lg p-4">
        <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                JK
            </div>
            <div>
                <h3 class="font-medium text-white">Jan Kowalski</h3>
                <p class="text-xs text-zinc-500">Specjalizacja: Imigracja</p>
            </div>
        </div>
        <div class="mt-4 flex items-center justify-between text-xs">
            <span class="text-zinc-400">Aktywne sprawy: 12/50</span>
            <span class="text-emerald-400">Aktywny</span>
        </div>
    </div>
</div>
```

## 3.4 Kroki implementacji

1. [ ] Utworzyc migracje SQL (lawyers + alter permit_leads)
2. [ ] Uruchomic migracje
3. [ ] Utworzyc `lawyers.html` - lista prawnikow
4. [ ] Utworzyc `lawyer.html` - edycja profilu
5. [ ] Zmodyfikowac `lead.html`:
   - Dodac dropdown przypisania
   - Ladowac liste prawnikow
   - Zapisywac zmiane
6. [ ] Zmodyfikowac `admin.html`:
   - Dodac filtr po prawniku
   - Dodac kolumne z prawnikiem
7. [ ] Dodac statystyki per prawnik
8. [ ] Przetestowac przypisywanie

---

# KOLEJNOSC IMPLEMENTACJI

## Faza 1: Baza danych
1. Migracja: lawyers
2. Migracja: calendar_events
3. Migracja: offers + client_offers
4. Test polaczen FK

## Faza 2: Zarzadzanie prawnikami (najprostsze)
1. lawyers.html
2. Modyfikacja lead.html (dropdown)
3. Modyfikacja admin.html (filtr)

## Faza 3: Kalendarz
1. calendar.html
2. Integracja z lead.html
3. Widoki miesiac/tydzien/dzien

## Faza 4: Oferty
1. offers.html (szablony)
2. offer.html (edycja szablonu)
3. Integracja z lead.html (generowanie)
4. client-offer.html (podglad klienta)
5. Tracking i statusy

## Faza 5: Testy i deploy
1. Testy RLS
2. Testy flow
3. Deploy

---

# REFERENCJE Z TN CRM

## Pliki zrodlowe do skopiowania:
- `tn-crm/calendar.html` -> kalendarz
- `tn-crm/lead.html` (sekcja client-offer) -> generowanie ofert
- `tn-crm/client-offer.html` -> podglad oferty
- `tn-crm/offers.html` -> zarzadzanie szablonami
- `tn-crm/offer.html` -> edycja szablonu

## Kluczowe funkcje JS do przeniesienia:

### Z calendar.html:
- loadEvents(), renderMonthView(), renderWeekView(), renderDayView()
- saveEvent(), deleteEvent(), openEventModal()
- getDeadlineEvents()

### Z lead.html:
- generateClientOffer(), loadClientOffer(), updateClientOfferSection()
- copyOfferUrl(), getClientOfferUrl()

### Z client-offer.html:
- loadOffer(), trackView(), renderOffer()
- formatPrice(), formatDate()

---

# UWAGI DLA IMPLEMENTACJI

1. **Nazewnictwo**:
   - TN CRM: team_members -> GetMyPermit: lawyers
   - TN CRM: leads -> GetMyPermit: permit_leads

2. **Specyfika kancelarii**:
   - Typy wydarzen: spotkanie, rozprawa, termin
   - Specjalizacje prawnikow
   - Max liczba spraw per prawnik

3. **Kolejnosc**:
   - Najpierw baza danych (wszystkie migracje)
   - Potem backend (RLS)
   - Na koncu frontend (HTML/JS)

4. **Testowanie**:
   - Kazda faze testowac osobno
   - RLS sprawdzic z roznych rol (admin/lawyer/anon)

---

# APPENDIX A: FRAGMENTY KODU DO SKOPIOWANIA

## A.1 Sekcja ofert w lead.html (HTML)

Lokalizacja w TN CRM: `lead.html` linie 655-870

```html
<!-- Deal & Oferta - Combined Section -->
<div id="client-offer-section" class="bg-zinc-900/40 rounded-xl border border-white/5 overflow-hidden hidden">
    <!-- Header -->
    <div class="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-white/5 flex items-center justify-between">
        <h3 class="text-sm font-medium text-white flex items-center gap-2">
            <i class="ph ph-handshake text-amber-400"></i>
            Oferta
        </h3>
        <span id="offer-price-badge" class="text-sm font-semibold text-amber-400">0 zl</span>
    </div>

    <div class="p-4 sm:p-5">
        <!-- Wybor szablonu oferty + cena -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div class="sm:col-span-2">
                <label class="block text-zinc-500 text-[10px] font-mono uppercase tracking-wider mb-1.5">Oferta</label>
                <select id="field-offer" class="input-field w-full rounded-lg px-3 py-2.5 text-sm text-white cursor-pointer">
                    <option value="">-- Wybierz oferte --</option>
                </select>
            </div>
            <div>
                <label class="block text-zinc-500 text-[10px] font-mono uppercase tracking-wider mb-1.5">Cena</label>
                <div class="relative">
                    <input type="number" id="field-value" class="input-field w-full rounded-lg px-3 py-2.5 text-sm text-white pr-10" placeholder="auto" min="0" step="1">
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">zl</span>
                </div>
            </div>
        </div>

        <!-- Data waznosci + Przypisany prawnik -->
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div>
                <label class="block text-zinc-500 text-[10px] font-mono uppercase tracking-wider mb-1.5">Waznosc oferty</label>
                <input type="date" id="client-offer-valid-until" class="input-field w-full rounded-lg px-3 py-2.5 text-sm text-white cursor-pointer" onclick="this.showPicker()">
            </div>
            <div>
                <label class="block text-zinc-500 text-[10px] font-mono uppercase tracking-wider mb-1.5">Przypisany prawnik</label>
                <select id="field-assigned-to" class="input-field w-full rounded-lg px-3 py-2.5 text-sm text-white cursor-pointer">
                    <option value="">Nie przypisano</option>
                </select>
            </div>
        </div>

        <!-- Przycisk generowania -->
        <button id="generate-client-offer-btn" class="w-full bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            <i class="ph ph-link-simple"></i>
            Generuj link do oferty
        </button>

        <!-- Wynik - istniejaca oferta -->
        <div id="client-offer-exists" class="hidden mt-4">
            <div class="bg-zinc-800/30 rounded-xl p-3 sm:p-4 border border-white/5">
                <div class="flex items-center gap-2 text-[10px] text-zinc-500 mb-2">
                    <i class="ph ph-link text-amber-400"></i>
                    <span class="font-mono uppercase tracking-wider">Link do oferty</span>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="client-offer-url" readonly class="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-3 py-2.5 text-xs sm:text-sm text-zinc-300 font-mono truncate">
                    <div class="flex gap-2">
                        <button onclick="copyOfferUrl()" class="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm text-white">
                            <i class="ph ph-copy"></i>
                            <span class="sm:hidden">Kopiuj</span>
                        </button>
                        <button onclick="openOfferPreview()" class="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm text-amber-400">
                            <i class="ph ph-arrow-square-out"></i>
                            <span class="sm:hidden">Otworz</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Stats -->
            <div class="flex items-center justify-between text-xs text-zinc-500 mt-3">
                <span class="flex items-center gap-1.5">
                    <i class="ph ph-calendar text-amber-400/70"></i>
                    do <span id="client-offer-valid-display" class="text-zinc-300 font-medium">-</span>
                </span>
                <span class="flex items-center gap-1.5">
                    <i class="ph ph-eye text-cyan-400/70"></i>
                    <span id="client-offer-views" class="text-zinc-300 font-medium">0</span> wyswietlen
                </span>
            </div>
        </div>
    </div>
</div>
```

## A.2 Funkcje JS dla ofert (z lead.html TN CRM)

Lokalizacja: `lead.html` linie 4655-4760, 3701-3760

```javascript
// ============ CLIENT OFFER FUNCTIONS ============

async function loadClientOffer() {
    if (!lead) return;

    const { data, error } = await db
        .from('client_offers')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (data && !error) {
        clientOffer = data;
    } else {
        clientOffer = null;
    }

    updateClientOfferSection();
}

function updateClientOfferSection() {
    const section = document.getElementById('client-offer-section');
    const emptyState = document.getElementById('client-offer-empty');
    const existsState = document.getElementById('client-offer-exists');
    const offerId = document.getElementById('field-offer').value;

    // Show section only if offer is selected
    if (!offerId) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');

    if (clientOffer) {
        // Show existing offer
        if (emptyState) emptyState.classList.add('hidden');
        existsState.classList.remove('hidden');

        const offerUrl = getClientOfferUrl(clientOffer.unique_token);
        document.getElementById('client-offer-url').value = offerUrl;
        document.getElementById('client-offer-valid-display').textContent =
            new Date(clientOffer.valid_until).toLocaleDateString('pl-PL');
        document.getElementById('client-offer-views').textContent = clientOffer.view_count || 0;
    } else {
        // Show form
        if (emptyState) emptyState.classList.remove('hidden');
        existsState.classList.add('hidden');
    }
}

async function generateClientOffer() {
    if (!lead) return;

    const offerId = document.getElementById('field-offer').value;
    if (!offerId) {
        alert('Najpierw wybierz oferte');
        return;
    }

    const validUntil = document.getElementById('client-offer-valid-until').value;
    if (!validUntil) {
        alert('Podaj date waznosci oferty');
        return;
    }

    const customPriceInput = document.getElementById('field-value')?.value;
    const customPrice = customPriceInput ? parseFloat(customPriceInput) : null;

    const token = generateToken();

    const btn = document.getElementById('generate-client-offer-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i>';

    const insertData = {
        lead_id: lead.id,
        offer_id: offerId,
        unique_token: token,
        valid_until: validUntil
    };

    if (customPrice !== null && customPrice > 0) {
        insertData.custom_price = customPrice;
    }

    const { data, error } = await db
        .from('client_offers')
        .insert([insertData])
        .select()
        .single();

    btn.disabled = false;
    btn.innerHTML = '<i class="ph ph-link-simple"></i> Generuj link do oferty';

    if (error) {
        console.error('Error generating offer:', error);
        alert('Blad podczas generowania oferty');
        return;
    }

    clientOffer = data;
    updateClientOfferSection();
}

function generateToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function getClientOfferUrl(token) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/oferta?token=${token}`;
}

function copyOfferUrl() {
    const urlInput = document.getElementById('client-offer-url');
    urlInput.select();
    document.execCommand('copy');

    const btn = urlInput.nextElementSibling.querySelector('button') || urlInput.nextElementSibling;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-check text-emerald-400"></i>';
    setTimeout(() => {
        btn.innerHTML = originalHtml;
    }, 1500);
}

function openOfferPreview() {
    const url = document.getElementById('client-offer-url').value;
    if (url) window.open(url, '_blank');
}
```

## A.3 Struktura client-offer.html (podglad dla klienta)

```html
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Twoja spersonalizowana oferta</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <!-- ... -->
</head>
<body class="bg-zinc-950 text-white">
    <!-- Loading screen -->
    <div id="loading-screen" class="min-h-screen flex items-center justify-center">
        <div class="text-center">
            <i class="ph ph-circle-notch animate-spin text-4xl text-amber-400 mb-4"></i>
            <p class="text-zinc-400">Ladowanie oferty...</p>
        </div>
    </div>

    <!-- Main offer content -->
    <div id="offer-screen" class="hidden">
        <div class="max-w-4xl mx-auto p-6">
            <!-- Logo kancelarii -->
            <div class="text-center mb-8">
                <img src="/logo.svg" alt="GetMyPermit" class="h-12 mx-auto mb-4">
                <h1 class="text-2xl font-bold">Twoja spersonalizowana oferta</h1>
            </div>

            <!-- Dane klienta -->
            <div class="bg-zinc-900/50 rounded-xl p-6 mb-6 border border-white/5">
                <h2 class="text-lg font-semibold mb-4">Przygotowane dla:</h2>
                <p id="client-name" class="text-xl text-white"></p>
                <p id="client-email" class="text-zinc-400"></p>
            </div>

            <!-- Szczegoly oferty -->
            <div class="bg-zinc-900/50 rounded-xl p-6 mb-6 border border-white/5">
                <h2 class="text-lg font-semibold mb-4">Oferta</h2>
                <h3 id="offer-name" class="text-2xl font-bold text-amber-400 mb-2"></h3>
                <p id="offer-description" class="text-zinc-300 mb-4"></p>
                <div class="text-3xl font-bold text-white">
                    <span id="offer-price">0</span> zl
                </div>
            </div>

            <!-- Etapy realizacji -->
            <div id="milestones-section" class="bg-zinc-900/50 rounded-xl p-6 mb-6 border border-white/5">
                <h2 class="text-lg font-semibold mb-4">Etapy realizacji</h2>
                <div id="milestones-list" class="space-y-4">
                    <!-- Generowane dynamicznie -->
                </div>
            </div>

            <!-- Waznosc oferty -->
            <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-center">
                <p class="text-amber-400">
                    <i class="ph ph-clock mr-2"></i>
                    Oferta wazna do: <strong id="valid-until"></strong>
                </p>
            </div>

            <!-- Przyciski akcji -->
            <div class="flex flex-col sm:flex-row gap-4">
                <button onclick="acceptOffer()" class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-4 rounded-xl font-semibold text-lg transition-colors">
                    <i class="ph ph-check-circle mr-2"></i>
                    Akceptuje oferte
                </button>
                <a href="tel:+48123456789" class="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-4 rounded-xl font-semibold text-lg transition-colors text-center">
                    <i class="ph ph-phone mr-2"></i>
                    Zadzwon
                </a>
            </div>
        </div>
    </div>

    <!-- Not found screen -->
    <div id="not-found-screen" class="hidden min-h-screen flex items-center justify-center">
        <div class="text-center">
            <i class="ph ph-file-x text-6xl text-red-400 mb-4"></i>
            <h2 class="text-xl font-semibold mb-2">Oferta nie znaleziona</h2>
            <p class="text-zinc-400">Link moze byc niepoprawny lub oferta wygasla.</p>
        </div>
    </div>

    <!-- Expired screen -->
    <div id="expired-screen" class="hidden min-h-screen flex items-center justify-center">
        <div class="text-center">
            <i class="ph ph-clock text-6xl text-amber-400 mb-4"></i>
            <h2 class="text-xl font-semibold mb-2">Oferta wygasla</h2>
            <p class="text-zinc-400">Skontaktuj sie z nami, aby uzyskac nowa oferte.</p>
        </div>
    </div>

    <script>
        const SUPABASE_URL = 'https://yxmavwkwnfuphjqbelws.supabase.co';
        const SUPABASE_ANON_KEY = '...';
        const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        let clientOffer = null;
        let offer = null;
        let lead = null;

        async function loadOffer() {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');

            if (!token) {
                showScreen('not-found-screen');
                return;
            }

            const { data, error } = await db
                .from('client_offers')
                .select('*, permit_leads(*), offers(*)')
                .eq('unique_token', token)
                .single();

            if (error || !data) {
                showScreen('not-found-screen');
                return;
            }

            clientOffer = data;
            offer = data.offers;
            lead = data.permit_leads;

            // Check if expired
            const validUntil = new Date(clientOffer.valid_until);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (validUntil < today) {
                showScreen('expired-screen');
                return;
            }

            renderOffer();
            trackView();
            showScreen('offer-screen');
        }

        function renderOffer() {
            document.getElementById('client-name').textContent = lead.name || lead.phone || 'Klient';
            document.getElementById('client-email').textContent = lead.email || '';
            document.getElementById('offer-name').textContent = offer.name;
            document.getElementById('offer-description').textContent = offer.description || '';
            document.getElementById('offer-price').textContent = formatPrice(clientOffer.custom_price || offer.price);
            document.getElementById('valid-until').textContent = new Date(clientOffer.valid_until).toLocaleDateString('pl-PL');

            // Render milestones
            if (offer.milestones && offer.milestones.length > 0) {
                document.getElementById('milestones-list').innerHTML = offer.milestones.map((m, i) => `
                    <div class="flex gap-4">
                        <div class="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0">
                            ${i + 1}
                        </div>
                        <div>
                            <h4 class="font-medium text-white">${m.name}</h4>
                            <p class="text-sm text-zinc-400">${m.description || ''}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                document.getElementById('milestones-section').classList.add('hidden');
            }
        }

        async function trackView() {
            const { data: freshData } = await db
                .from('client_offers')
                .select('view_count, view_history')
                .eq('id', clientOffer.id)
                .single();

            const currentViewCount = freshData?.view_count || 0;
            const viewHistory = freshData?.view_history || [];
            viewHistory.push(new Date().toISOString());

            await db
                .from('client_offers')
                .update({
                    view_count: currentViewCount + 1,
                    viewed_at: new Date().toISOString(),
                    view_history: viewHistory
                })
                .eq('id', clientOffer.id);
        }

        function formatPrice(price) {
            return new Intl.NumberFormat('pl-PL').format(price || 0);
        }

        function showScreen(screenId) {
            document.querySelectorAll('[id$="-screen"]').forEach(el => el.classList.add('hidden'));
            document.getElementById(screenId).classList.remove('hidden');
        }

        loadOffer();
    </script>
</body>
</html>
```

---

# APPENDIX B: MIGRACJE SQL

## B.1 Kompletna migracja - wszystkie tabele naraz

```sql
-- Migration: GetMyPermit - Calendar, Offers, Lawyers
-- Run this migration in Supabase SQL Editor

-- ============ LAWYERS TABLE ============
CREATE TABLE IF NOT EXISTS lawyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialization TEXT[] DEFAULT '{}',
    color TEXT DEFAULT '#3b82f6',
    role TEXT DEFAULT 'lawyer' CHECK (role IN ('admin', 'lawyer', 'assistant')),
    is_active BOOLEAN DEFAULT TRUE,
    max_cases INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view lawyers"
    ON lawyers FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage lawyers"
    ON lawyers FOR ALL USING (
        EXISTS (SELECT 1 FROM lawyers WHERE user_id = auth.uid() AND role = 'admin')
    );

-- ============ CALENDAR_EVENTS TABLE ============
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    lead_id UUID REFERENCES permit_leads(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES lawyers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES lawyers(id),
    event_type TEXT DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'deadline', 'hearing', 'consultation')),
    location TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can CRUD calendar_events"
    ON calendar_events FOR ALL USING (auth.role() = 'authenticated');

-- ============ OFFERS TABLE ============
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    milestones JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage offers"
    ON offers FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anon can view active offers"
    ON offers FOR SELECT USING (is_active = TRUE);

-- ============ CLIENT_OFFERS TABLE ============
CREATE TABLE IF NOT EXISTS client_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES permit_leads(id) ON DELETE CASCADE,
    offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
    unique_token TEXT UNIQUE NOT NULL,
    valid_until DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES lawyers(id),
    view_count INTEGER DEFAULT 0,
    viewed_at TIMESTAMPTZ,
    view_history JSONB DEFAULT '[]',
    custom_price DECIMAL(10,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected', 'expired'))
);

ALTER TABLE client_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage client_offers"
    ON client_offers FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Anon can view by token"
    ON client_offers FOR SELECT USING (TRUE);

-- ============ ALTER PERMIT_LEADS ============
ALTER TABLE permit_leads
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES lawyers(id) ON DELETE SET NULL;

-- ============ INSERT DEFAULT OFFERS ============
INSERT INTO offers (name, description, price, is_active, is_default, milestones) VALUES
('Pomoc w uzyskaniu pozwolenia na pobyt', 'Kompleksowa pomoc prawna w uzyskaniu pozwolenia na pobyt czasowy lub staly', 5000.00, TRUE, TRUE, '[
    {"name": "Analiza dokumentow", "description": "Weryfikacja kompletnosci dokumentacji"},
    {"name": "Przygotowanie wniosku", "description": "Sporzadzenie wniosku i zalacznikow"},
    {"name": "Zlozenie wniosku", "description": "Reprezentacja przed urzedem"},
    {"name": "Monitoring sprawy", "description": "Sledzenie postepowania i odpowiadanie na wezwania"}
]'),
('Odwolanie od decyzji', 'Sporzadzenie odwolania od negatywnej decyzji administracyjnej', 3000.00, TRUE, FALSE, '[
    {"name": "Analiza decyzji", "description": "Ocena podstaw do odwolania"},
    {"name": "Przygotowanie odwolania", "description": "Sporzadzenie pisma odwolawczego"},
    {"name": "Zlozenie odwolania", "description": "Terminowe zlozenie do organu wyzszej instancji"}
]'),
('Pelna obsluga sprawy imigracyjnej', 'Kompleksowa obsluga od poczatku do uzyskania pozwolenia', 8000.00, TRUE, FALSE, '[
    {"name": "Konsultacja wstepna", "description": "Omowienie sytuacji i strategii"},
    {"name": "Kompletowanie dokumentow", "description": "Pomoc w zebraniu wymaganych dokumentow"},
    {"name": "Przygotowanie wniosku", "description": "Profesjonalne sporzadzenie dokumentacji"},
    {"name": "Reprezentacja", "description": "Pelna reprezentacja przed organami"},
    {"name": "Monitoring i wsparcie", "description": "Obsluga az do uzyskania decyzji"}
]');

-- Grant permissions
GRANT SELECT ON offers TO anon;
GRANT SELECT ON client_offers TO anon;
```

---

# APPENDIX C: CHECKLISTA IMPLEMENTACJI

## Faza 1: Baza danych
- [ ] Uruchom migracje z Appendix B
- [ ] Zweryfikuj tabele w Supabase Dashboard
- [ ] Przetestuj RLS

## Faza 2: Prawnicy (lawyers)
- [ ] Utworz `lawyers.html` (lista + dodawanie)
- [ ] Zmodyfikuj `lead.html`:
  - [ ] Dodaj dropdown `field-assigned-to`
  - [ ] Laduj liste prawnikow
  - [ ] Zapisuj zmiane przypisania
- [ ] Zmodyfikuj `admin.html`:
  - [ ] Dodaj filtr po prawniku
  - [ ] Dodaj kolumne z prawnikiem

## Faza 3: Kalendarz
- [ ] Skopiuj `calendar.html` z TN CRM
- [ ] Zmien `team_members` na `lawyers`
- [ ] Zmien `leads` na `permit_leads`
- [ ] Dostosuj typy wydarzen
- [ ] Dodaj link w nawigacji

## Faza 4: Oferty
- [ ] Utworz `offers.html` (zarzadzanie szablonami)
- [ ] Utworz `offer.html` (edycja szablonu)
- [ ] Zmodyfikuj `lead.html`:
  - [ ] Dodaj sekcje client-offer-section (kod z Appendix A)
  - [ ] Dodaj funkcje JS (kod z Appendix A)
  - [ ] Podlacz do loadLead()
- [ ] Utworz `client-offer.html` (kod z Appendix A.3)

## Faza 5: Testy
- [ ] Test tworzenia prawnika
- [ ] Test przypisywania leada do prawnika
- [ ] Test tworzenia wydarzenia w kalendarzu
- [ ] Test generowania oferty dla leada
- [ ] Test podgladu oferty jako klient
- [ ] Test RLS z roznych rol

## Faza 6: Deploy
- [ ] git add + commit
- [ ] git push
