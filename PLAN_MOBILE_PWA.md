# Plan dopracowania mobile + PWA dla CRM getmypermit

**Cel:** CRM kancelarii prawnej ma działać na poziomie natywnej aplikacji na telefonach zespołu (iPhone + Android), instalowalny na home screen, z offline fallback. Klienci wypełniający ankietę też instalują jako PWA.

**Kontekst audytu:** obecny stan mobile = ~40% (responsive elementy są, ale brak offline / PWA / dopracowanych szczegółów). Manifest, service worker, ikony PWA = 0%.

**Źródło faktów:** audit 2026-04-23 (25 plików HTML przebadane).

---

## 0. Strategia i filary

### 3 persony używające mobile

1. **Paweł (owner) w terenie** — sprawdza alerty, dzwoni do klienta, oznacza zadanie jako done. Potrzebuje: szybki dashboard, lista zadań, historia sprawy, dzwonienie jednym klikiem.
2. **Julka / Wiktoria (opiekunowie)** — w kancelarii z laptopem, ale często sprawdzają w tel. komórkowym. Potrzebują: lista swoich zadań, karta sprawy, dodanie notatki głosem (speech-to-text).
3. **Klient** — wypełnia ankietę na telefonie, załącza skan paszportu z kamery. Potrzebuje: nie gubić postępu przy przerwie, instalacja na home screen jako PWA.

### 4 filary planu

1. **PWA fundamenty** — manifest + service worker + ikony + installability. Bez tego w ogóle nie jesteśmy w grze.
2. **Mobile-first refactor layoutu** — tabele → karty, sidebar → bottom navigation + drawer, modale → bottom sheets, safe-area insets iOS.
3. **Offline + draft saving** — IndexedDB na draft ankiety, cache czytania listy spraw, queue dla „oznacz ratę zapłaconą" itd.
4. **Performance** — Tailwind CLI (nie CDN), Critical CSS inline, Chart.js lazy, PurgeCSS.

### Sukces definiujemy jako

- **Lighthouse PWA score ≥ 90** (wszystkie strony)
- **Lighthouse Performance mobile ≥ 85** (dashboard, cases, case detail)
- **Installable** na iPhone (Safari Add to Home Screen) i Android (Chrome Install prompt)
- **Touch targets** ≥ 44×44px wszędzie
- **Offline** → read-only dashboard + karta sprawy + draft ankiety
- **Dark mode** naturalny (nie blinding white flash przy ładowaniu)
- **Apple/Google Pay-like smoothness** na transitions

---

## 1. FAZA 1 — Fundamenty PWA (2 dni pracy, priorytet P0)

### 1.1. Ikony — 10 rozmiarów

Obecnie: `favicon-32`, `favicon-192`, `logo.png/webp`. Brak wszystkich standardowych PWA.

**Do wygenerowania z `img/logo.png` (1024×1024 master):**

```
img/pwa/
├── icon-72.png          # Android min
├── icon-96.png          # Android launcher
├── icon-128.png         # Chrome shortcut
├── icon-144.png         # IE/Edge
├── icon-152.png         # iPad iOS 7-9
├── icon-180.png         # iPhone iOS 7+ (apple-touch-icon)
├── icon-192.png         # Android ecosystem standard
├── icon-256.png         # Windows tile
├── icon-384.png         # Android 4K
├── icon-512.png         # PWA required, splash screen
├── maskable-192.png     # Android adaptive icon (40% safe zone)
├── maskable-512.png     # Same but full
└── favicon.svg          # Vector (best)
```

**Narzędzia:**
- `@vite-pwa/assets-generator` (cli tool) — `pwa-assets-generator --preset minimal public/logo.png`
- Alternatywa online: https://realfavicongenerator.net + download zip

**iOS splash screens (13 rozmiarów):**
- iPhone SE, iPhone 13 mini, iPhone 14, iPhone 14 Pro Max, iPhone 15 Pro, iPad, iPad Pro — każdy potrzebuje osobnego splash
- Generator: `pwa-splash-screen-generator` lub ręcznie z PSD template

**Czas:** 1h (pełna automatyka).

---

### 1.2. Manifest.json

**Plik:** `crm/manifest.json`

```json
{
  "name": "GetMyPermit CRM — kancelaria",
  "short_name": "GMP CRM",
  "description": "CRM dla kancelarii prawnej — zarządzanie sprawami cudzoziemców",
  "start_url": "/dashboard.html?source=pwa",
  "scope": "/",
  "display": "standalone",
  "display_override": ["window-controls-overlay", "standalone", "minimal-ui"],
  "orientation": "portrait-primary",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "dir": "ltr",
  "lang": "pl-PL",
  "categories": ["business", "productivity"],
  "prefer_related_applications": false,
  "icons": [
    { "src": "/img/pwa/icon-72.png",   "sizes": "72x72",   "type": "image/png", "purpose": "any" },
    { "src": "/img/pwa/icon-96.png",   "sizes": "96x96",   "type": "image/png", "purpose": "any" },
    { "src": "/img/pwa/icon-128.png",  "sizes": "128x128", "type": "image/png", "purpose": "any" },
    { "src": "/img/pwa/icon-144.png",  "sizes": "144x144", "type": "image/png", "purpose": "any" },
    { "src": "/img/pwa/icon-152.png",  "sizes": "152x152", "type": "image/png", "purpose": "any" },
    { "src": "/img/pwa/icon-192.png",  "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/img/pwa/icon-384.png",  "sizes": "384x384", "type": "image/png", "purpose": "any" },
    { "src": "/img/pwa/icon-512.png",  "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/img/pwa/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/img/pwa/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    {
      "name": "Moje zadania",
      "short_name": "Zadania",
      "description": "Lista zadań przypisanych do mnie",
      "url": "/tasks.html?preset=mine",
      "icons": [{ "src": "/img/pwa/shortcut-tasks-96.png", "sizes": "96x96" }]
    },
    {
      "name": "Dzisiejszy kalendarz",
      "short_name": "Dziś",
      "description": "Spotkania i odciski na dziś",
      "url": "/appointments.html",
      "icons": [{ "src": "/img/pwa/shortcut-calendar-96.png", "sizes": "96x96" }]
    },
    {
      "name": "Nowa sprawa",
      "short_name": "Nowa",
      "description": "Dodaj nową sprawę",
      "url": "/cases.html?new=1",
      "icons": [{ "src": "/img/pwa/shortcut-new-96.png", "sizes": "96x96" }]
    },
    {
      "name": "Alerty",
      "short_name": "Alerty",
      "description": "Sprawy wymagające uwagi",
      "url": "/alerts.html",
      "icons": [{ "src": "/img/pwa/shortcut-alerts-96.png", "sizes": "96x96" }]
    }
  ],
  "screenshots": [
    { "src": "/img/pwa/screenshot-mobile-1.png", "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow", "label": "Dashboard" },
    { "src": "/img/pwa/screenshot-mobile-2.png", "sizes": "1080x1920", "type": "image/png", "form_factor": "narrow", "label": "Karta sprawy" },
    { "src": "/img/pwa/screenshot-desktop-1.png", "sizes": "1920x1080", "type": "image/png", "form_factor": "wide", "label": "Dashboard desktop" }
  ]
}
```

**Osobny manifest dla intake klienta:** `crm/intake/manifest.json` — inny `name`, `start_url`, jaśniejszy theme.

### 1.3. Meta tags per plik HTML

Dodać do wszystkich 25 plików `<head>`:

```html
<!-- PWA -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: light)">
<meta name="color-scheme" content="dark">

<!-- iOS standalone -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="GMP CRM">
<link rel="apple-touch-icon" sizes="180x180" href="/img/pwa/icon-180.png">

<!-- iOS splash screens (13 linii — generate from pwa-splash-generator) -->
<link rel="apple-touch-startup-image" href="/img/pwa/splash-1290x2796.png"
      media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)">
<!-- ... 12 more ... -->

<!-- Viewport (bez user-scalable=no żeby nie łamać a11y) -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

<!-- Android Chrome -->
<meta name="mobile-web-app-capable" content="yes">

<!-- Windows tile -->
<meta name="msapplication-TileColor" content="#0a0a0a">
<meta name="msapplication-TileImage" content="/img/pwa/icon-144.png">
```

**Implementacja:** stworzyć snippet `crm/components/pwa-head.html`, wstawić w każdy plik za auth.js script tag via template lub sed.

**Czas:** 2h (generowanie + sed replace w 25 plikach + testy).

---

### 1.4. Service Worker

**Plik:** `crm/sw.js`

Strategia per typ zasobu:

| Typ | Strategia | TTL | Offline fallback |
|-----|-----------|-----|------------------|
| Static HTML (dashboard, cases itd) | Stale-while-revalidate | 1h | Zapisany HTML |
| JS/CSS (layout.css, modals.js) | Cache-first | 7 dni (hash-busted) | Wersja z cache |
| Images/icons | Cache-first | 30 dni | Nic (puste) |
| Phosphor icons CDN | Cache-first | 30 dni | Wersja cache |
| Supabase REST API (GET) | Network-first, cache fallback | 2 min freshness | Zapisana lista |
| Supabase REST (POST/PATCH/DELETE) | Network-only + Background Sync | — | Queue w IndexedDB |
| Supabase Auth | Network-only (nigdy cache) | — | Redirect login |

**Szkielet:**

```javascript
// sw.js
const VERSION = 'v1.2.0';  // bump na każdy deploy
const STATIC_CACHE = `gmp-static-${VERSION}`;
const API_CACHE = `gmp-api-${VERSION}`;
const IMG_CACHE = `gmp-img-${VERSION}`;

const PRECACHE = [
  '/dashboard.html', '/cases.html', '/case.html', '/tasks.html',
  '/appointments.html', '/alerts.html', '/clients.html',
  '/components/layout.css', '/components/auth.js',
  '/components/sidebar.js', '/components/modals.js',
  '/components/payment-kinds.js', '/components/supabase.js',
  '/img/pwa/icon-192.png',
  '/offline.html',  // dedykowany fallback page
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => !k.endsWith(VERSION)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Supabase API
  if (url.hostname.endsWith('supabase.co')) {
    if (e.request.method === 'GET') {
      e.respondWith(networkFirstWithFallback(e.request, API_CACHE, 120));
    } else {
      e.respondWith(networkOnlyWithQueue(e.request));
    }
    return;
  }

  // HTML
  if (e.request.destination === 'document') {
    e.respondWith(staleWhileRevalidate(e.request, STATIC_CACHE, '/offline.html'));
    return;
  }

  // Images
  if (['image', 'font'].includes(e.request.destination)) {
    e.respondWith(cacheFirst(e.request, IMG_CACHE));
    return;
  }

  // JS/CSS
  e.respondWith(cacheFirst(e.request, STATIC_CACHE));
});

// Background Sync dla POST queue
self.addEventListener('sync', e => {
  if (e.tag === 'gmp-write-queue') {
    e.waitUntil(processWriteQueue());
  }
});

async function processWriteQueue() {
  const db = await openDB('gmp-offline', 1);
  const tx = db.transaction('queue', 'readwrite');
  const queue = await tx.store.getAll();
  for (const item of queue) {
    try {
      await fetch(item.url, { method: item.method, headers: item.headers, body: item.body });
      await tx.store.delete(item.id);
    } catch {
      break; // retry later
    }
  }
}
```

**Rejestracja** w `components/sw-register.js` (dołączana do każdego HTML):

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
      // Obsługa update dostępny
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast(reg);  // "Nowa wersja, odśwież"
          }
        });
      });
    });
  });
}
```

**Offline fallback page:** `crm/offline.html` — ładna strona z info „Brak połączenia, zobacz ostatnie zapisane dane" + przyciski „Moje zadania (cache)", „Ostatnie sprawy (cache)".

**Czas:** 1 dzień (6h — napisanie, integracja, testy offline).

---

### 1.5. Vercel headers + cache strategy

**Plik:** `crm/vercel.json`

```json
{
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    },
    {
      "source": "/manifest.json",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=3600" }
      ]
    },
    {
      "source": "/components/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/img/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=2592000" }
      ]
    },
    {
      "source": "/(.*\\.(js|css))",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=604800" }
      ]
    },
    {
      "source": "/(.*\\.html)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(self), microphone=(self), geolocation=()" }
      ]
    }
  ]
}
```

**Cache busting dla components:**
- Dodać hash do nazw plików: `layout.min.abc123.css`
- Automatyzacja: Vercel build step — lub manualnie wersjonowanie `?v=abc123` na `<script src>`

---

## 2. FAZA 2 — Design system mobile (2 dni, priorytet P0)

### 2.1. Breakpointy (uporządkowanie)

Obecnie: 600px + 900px + 1100px (chaos). Nowy standard:

```css
/* Mobile-first base (0-640px) */
/* Tablet (641px+) */
@media (min-width: 641px) { ... }
/* Desktop (1025px+) */
@media (min-width: 1025px) { ... }
/* Wide (1440px+) */
@media (min-width: 1441px) { ... }
```

Porzucam Tailwind arbitrary breakpointy (`md:`, `lg:`) i stawiam na semantic.

### 2.2. Safe-area iOS (notch, home indicator)

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
}

body {
  padding-top: var(--safe-top);
  padding-bottom: var(--safe-bottom);
}

.app-header { padding-top: calc(12px + var(--safe-top)); }
.bottom-nav { padding-bottom: calc(8px + var(--safe-bottom)); }
```

### 2.3. Bottom navigation (zastępuje drawer na mobile)

Nowa komponenta w `components/bottom-nav.html` + `bottom-nav.js`:

```html
<nav class="bottom-nav">
  <a href="/dashboard.html" class="bn-item" data-page="dashboard">
    <i class="ph ph-house"></i><span>Dom</span>
  </a>
  <a href="/cases.html" class="bn-item" data-page="cases">
    <i class="ph ph-folder"></i><span>Sprawy</span>
  </a>
  <a href="/tasks.html" class="bn-item" data-page="tasks">
    <i class="ph ph-check-square"></i><span>Zadania</span>
  </a>
  <a href="/appointments.html" class="bn-item" data-page="calendar">
    <i class="ph ph-calendar"></i><span>Kalendarz</span>
  </a>
  <button class="bn-item" onclick="openMoreMenu()">
    <i class="ph ph-dots-three"></i><span>Więcej</span>
  </button>
</nav>
```

```css
.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: none; /* desktop: hidden */
  height: calc(56px + var(--safe-bottom));
  background: var(--bg-elevated);
  border-top: 1px solid var(--border);
  z-index: 40;
}
@media (max-width: 640px) {
  .bottom-nav { display: flex; }
  .app-main { padding-bottom: calc(56px + var(--safe-bottom)); }
  #main-sidebar { display: none; }  /* drawer tylko dla "Więcej" */
  .mobile-hamburger { display: none; }  /* zastąpione bottom nav */
}
```

„Więcej" otwiera bottom sheet z: Alerty, Klienci, Pracodawcy, Płatności, Wnioski, Leady, Kanban, Staff, Analityka, Admin, Pomoc, Wyloguj.

### 2.4. Touch targets (reguła 44×44px)

**Audit aktualny:** `.btn` min-height 36px, `.btn-sm` też 36px — **za mało**.

**Fix w layout.css:**
```css
@media (max-width: 640px) {
  .btn { min-height: 44px; padding: 10px 16px; }
  .btn-sm { min-height: 40px; padding: 8px 12px; font-size: 13px; }
  .btn-ghost { min-width: 44px; min-height: 44px; }  /* icon-only buttons */
  input[type="checkbox"], input[type="radio"] { min-width: 22px; min-height: 22px; }
  select, input, textarea { min-height: 44px; font-size: 16px; } /* 16px = iOS no-zoom */
  .nav-item, .bn-item { min-height: 48px; }
}
```

### 2.5. Bottom sheets zamiast modali

Modal na mobile → bottom sheet z drag handle:

```css
@media (max-width: 640px) {
  .modal-backdrop { align-items: flex-end !important; padding: 0; }
  .modal-content {
    width: 100%;
    max-width: 100%;
    max-height: 90vh;
    border-radius: 20px 20px 0 0;
    animation: slideUp 250ms cubic-bezier(.4, 0, .2, 1);
  }
  .modal-content::before {
    content: "";
    display: block;
    width: 40px; height: 4px;
    background: var(--border);
    border-radius: 2px;
    margin: 8px auto 0;
  }
  .modal-body { padding: 16px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .modal-footer {
    position: sticky;
    bottom: 0;
    background: var(--bg-elevated);
    padding: 12px 16px calc(12px + var(--safe-bottom));
    border-top: 1px solid var(--border);
  }
}
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
```

Dodać swipe-down-to-close: biblioteka `Hammer.js` albo vanilla touchmove (50 linii).

### 2.6. Font-size 16px wymuszone (iOS anti-zoom)

Audit wykrył że `.field-input` w login = 14px. Fix:

```css
/* layout.css na górze */
@media (max-width: 640px) {
  input, select, textarea, .input, .filter-input, .field-input {
    font-size: 16px !important;
  }
}
```

**Czas fazy 2:** 1,5 dnia (8h + 4h testów na realnych urządzeniach).

---

## 3. FAZA 3 — Per-screen plan (4 dni, priorytet P1)

Lista 18 widoków z konkretnymi zmianami mobile.

### 3.1. `index.html` (Login) — status: OK

**Drobne dopracowanie:**
- Autofocus na email po 300ms (czekać na keyboard animation na iOS)
- Dodać "Zapamiętaj mnie" zapis w `localStorage.gmp_remember_email`
- Logo 120×120 zamiast full, lepsza hierarchia na 375px
- `inputmode="email"` + `autocomplete="username webauthn"` dla Passkey support

**Czas:** 2h.

---

### 3.2. `dashboard.html` — status: Częściowo

**Problemy:**
- Wykres Chart.js bez responsywności
- Sekcja "Finanse" + "Zespół" zajmują 3 screeny scroll
- KPI cards mają duże padding na 375px

**Mobile-first refactor:**

1. **KPI hero:** 1 kolumna na mobile, `scroll-snap-x` horizontal scroll z 4 kartami (Netflix-style). Każda karta = pełna szerokość, peek 20% następnej.
   ```css
   @media (max-width: 640px) {
     .kpi-grid {
       display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
       gap: 12px; padding: 0 16px 16px; margin: 0 -16px;
     }
     .kpi { flex: 0 0 85%; scroll-snap-align: center; }
   }
   ```

2. **"Dziś" bar:** 2x2 grid (spotkania, odciski, zadania, leady) zamiast 4×1.

3. **Plan dnia:** karta-lista z timestamp slider (godziny po lewej, wydarzenia po prawej). Klik na wydarzenie → bottom sheet z detalami.

4. **Moje zadania:** inline, bez sticky scroll. Max 5 pokazanych, "Pokaż więcej" → fullpage tasks.html.

5. **Finanse — ukryte dla staff** (już zrobione).

6. **Chart.js responsive:**
   ```js
   new Chart(ctx, {
     options: {
       responsive: true,
       maintainAspectRatio: false,
       plugins: { legend: { display: window.innerWidth > 640 } },
     }
   });
   ```
   + wrapper `.chart-wrap { position: relative; height: 280px; width: 100%; }`

7. **Aktywność feed:** na mobile tylko 5 ostatnich, bez "view all" — swipe up jako zachęta.

**Czas:** 6h.

---

### 3.3. `cases.html` (Lista spraw) — NAJWAŻNIEJSZA STRONA

**Problemy:**
- Tabela 17 kolumn — na 375px nie ma sensu (scroll horizontal 5 ekranów)
- Filtry zabierają 60% viewportu
- CSV button + Nowa sprawa w prawym górnym rogu — palec nie sięga

**Mobile refactor — kompletnie inny layout:**

1. **Header sticky minimalny:**
   - Tytuł "Sprawy (1234)"
   - Ikona filter → bottom sheet z wszystkimi filtrami
   - Ikona search → rozwijany input full-width

2. **Card view zamiast tabeli:**
   ```html
   <article class="case-card">
     <div class="case-card-head">
       <span class="case-nr">26/0232</span>
       <span class="badge badge-aktywna">Aktywna</span>
     </div>
     <h3 class="case-client">Kowalski Jan</h3>
     <p class="case-employer muted">MOOIJ Forwarding</p>
     <div class="case-meta">
       <span><i class="ph ph-calendar"></i> 180 dni od przyst.</span>
       <span><i class="ph ph-user"></i> Julka</span>
     </div>
     <div class="case-footer">
       <span class="overdue-badge">● 450 zł zaległość</span>
       <time class="muted">5 dni temu</time>
     </div>
   </article>
   ```
   Układ: avatar opiekuna, klient bold, pracodawca mniejszy, badge status, kwota zaległości jeśli > 0.

3. **Pinned na górze** — wyróżnione żółtym border.

4. **FAB (Floating Action Button):** "+ Nowa sprawa" prawy dolny róg, nad bottom nav, 56×56px.

5. **Pull-to-refresh:** standardowa biblioteka `PullToRefresh.js` (5KB).

6. **Infinite scroll:** pagination → auto-load w IntersectionObserver.

7. **Swipe na karcie** = szybkie akcje (Oznacz pinned / Zmień status / Dodaj notatkę).

**Czas:** 1 dzień.

---

### 3.4. `case.html` (Karta sprawy) — NAJBARDZIEJ ZŁOŻONA

Obecnie: 8 zakładek, sticky header, 2879 linii kodu. Na mobile prawie nieużywalne.

**Mobile refactor:**

1. **Hero sticky** (pierwszy ekran):
   - Klient imię + nazwisko (duży)
   - Pracodawca (mniejszy)
   - Status/etap badge
   - 3 mini-kafelki: Zadań otwartych, Zaległość, Ostatnia akt.
   - Przyciski akcji: [Zadzwoń] [WhatsApp] [Notatka] — pełna szerokość, 48px

2. **Zakładki jako segmented control:**
   - Przegląd | Historia | Zadania | Finanse | Dokumenty | Terminy | Ankieta | Dane
   - Scroll-x horizontal, aktywna podświetlona, swipe = zmiana zakładki
   - Usunąć z navigacji hash anchor: lepszy `history.pushState`

3. **Przegląd:**
   - Szybkie dane (opiekun, przyjęta, złożona, koniec legalu) jako grid 2×2
   - Timeline ostatnich 3 aktywności
   - "Zobacz historię →" link

4. **Zadania (tab):**
   - Lista zadań tej sprawy, checkboxami
   - FAB "+ Nowe zadanie" — bottom sheet z typem, datą, opisem, opiekunem

5. **Finanse (tab):**
   - 4 kafelki KPI jako carousel (scroll-x-snap)
   - Plan rat — card per rata, swipe-right = Oznacz zapłacona
   - Historia wpłat jako accordion ostatnie 5
   - "Opłaty do zwrotu" jako osobna karta

6. **Dokumenty (tab):**
   - Grid 2 kolumn kart z podglądem (JPG = miniatura, PDF = ikon)
   - Długie przyciśnięcie = menu (Pobierz / Usuń / Udostępnij)
   - Sekcja "Do zatwierdzenia z ankiety" u góry z żółtym border

7. **Ankieta (tab):**
   - Lista sekcji z procent wypełnienia
   - Przycisk "Wypełnij z palca" → pełnoekranowy form (nie modal)
   - Każda sekcja rozwijalna accordion

8. **Dane (tab):**
   - Form jako długie scrollowane pole (nie 2-kolumnowe)
   - Sticky "Zapisz" na dole
   - Przycisk "Anuluj" reverts dirty state

9. **Akcje z hero (tel/WA/email):**
   - Jeśli klient ma `phone` → [Zadzwoń] otwiera `tel:+48...`
   - WhatsApp → `https://wa.me/48...`
   - Email → `mailto:...`
   - Gate per pkt 14 uwag Pawła (tylko opiekun)

**Czas:** 1,5 dnia (najbardziej pracochłonne).

---

### 3.5. `tasks.html` — status: Częściowo

**Zmiany:**
- Tabela → karty (podobnie jak cases)
- Filter tabs "Moje / Wszystkie / Po terminie / Ukończone" = segmented control sticky top
- Karta zadania: tytuł, sprawa, termin (kolor), typ, opiekun avatar
- Swipe right = oznacz done, swipe left = postponowanie (modal z datą)
- FAB "+ Nowe zadanie"
- Pull-to-refresh

**Czas:** 4h.

---

### 3.6. `appointments.html` (Kalendarz) — NIE MOBILE (grid-cols-7)

**Mobile refactor:**

1. **3 tryby widoku:**
   - Agenda list (domyślny na mobile): lista wydarzeń posortowanych, nagłówki dat
   - Day view: 1 dzień, wydarzenia + godziny
   - Week view: tylko tablet+ (grid-cols-7)

2. **Agenda list:**
   ```
   ┌─ Poniedziałek 28.04 ────────┐
   │ 09:00 • Konsultacja          │
   │ Kowalski Jan                 │
   ├─ ■ 11:00 Odciski ─────── PC1│
   │ 12:00 • Telefon              │
   │ Nowak Anna                   │
   └─────────────────────────────┘
   ```

3. **FAB "+ Dodaj spotkanie"**
4. **Toggle "Tylko moje"** już działa.
5. **Zadanie z show_in_calendar=true** jako kafelek z ikoną check.

**Czas:** 1 dzień.

---

### 3.7. `alerts.html` — status: Częściowo

**Zmiany:**
- 4 kolumny → tabs na mobile (swipe): Bezczynność | Zadania | Płatności | Pracodawca
- Każda sekcja to lista kart
- Badge counter przy nazwie tabu
- Sticky tabs top, lista scroll

**Czas:** 3h.

---

### 3.8. `clients.html` — status: OK

**Dopracowanie:**
- Tabela → karty (jak cases)
- Search input sticky top
- Klik na klienta = detail w bottom sheet (nie osobna strona) — dla mobile szybciej
- Actions: Nowa sprawa, Edit, Trusted profile (admin-only)

**Czas:** 4h.

---

### 3.9. `employers.html` — status: OK

**Analogicznie do clients** — karty, search, detail bottom sheet.

**Czas:** 3h.

---

### 3.10. `payments.html` — status: Częściowo

**Mobile:**
- KPI strip → carousel horizontal
- Tabs → segmented control sticky
- Chart → responsive Chart.js (.options.responsive = true)
- Tabela wpłat → karty: data + kwota + typ + opiekun
- Filter okresu → bottom sheet z quick opcjami (Dziś, Miesiąc, Rok, Custom)

**Czas:** 5h.

---

### 3.11. `staff.html` — status: OK

**Drobne:**
- Summary 4 kafelki → carousel
- Tabela → karty: avatar + imię + rola + statystyki
- Detail view (`?id=`) już działa ale fullpage modal style na mobile

**Czas:** 3h.

---

### 3.12. `analytics.html` — status: NIE MOBILE

**Problem:** 8 wykresów Chart.js na desktop, brak responsywności.

**Mobile:**
- Każdy wykres osobny slide w carousel
- Albo accordion list (klik → rozwija 1 chart)
- Legenda na mobile pod wykresem (nie obok)
- Height 240px (zamiast 400)
- Touch gestures Chart.js plugin

**Czas:** 6h.

---

### 3.13. `kanban.html` — status: NIE MOBILE

**Problem:** 5 kolumn z drag-drop, scroll-x bez visual cue.

**Mobile:**
- Segmented control „Lead | Zlecona | Aktywna | Zakończona | Archiwum" — wybiera 1 kolumnę
- Lista kart w wybranej kolumnie
- Drag-drop przez menu (klik karta → "Przenieś do...")
- Albo swipe right/left = następna/poprzednia kolumna

**Czas:** 6h.

---

### 3.14. `leads.html` + `lead.html` — status: OK/Częściowo

- Lista: karty zamiast tabeli
- Detail (lead.html): stepper pipeline, sticky bottom "Zapisz" + "Konwertuj do sprawy"
- Formularze z 2-col grid → 1-col na mobile

**Czas:** 4h.

---

### 3.15. `intake/index.html` (ankieta klient) — status: MOBILE-FIRST

**Dopracowanie:**
1. **PWA installable** — własny manifest
2. **Fix `user-scalable=no`** → pozwolić zoom dla a11y
3. **Draft saving w IndexedDB** — auto-save co 5 sek
4. **Offline mode** — działa bez połączenia, queue do uploadu
5. **Camera integration** dla paszportu: `<input type="file" accept="image/*" capture="environment">` + OCR w service worker
6. **Haptic feedback** na next step (navigator.vibrate)
7. **Splash screen** własny

**Czas:** 1 dzień.

---

### 3.16. `admin.html` — status: NIE MOBILE (świadome)

**Decyzja:** admin panel tylko desktop/tablet. Mobile: pokazać komunikat "Panel administracyjny wymaga większego ekranu" i link do dashboard.

**Czas:** 1h.

---

### 3.17. `invoices.html` — status: Częściowo

- Karty zamiast tabeli
- Status jako badge kolor
- Swipe = Oznacz wystawiona / Wysłana / Zapłacona

**Czas:** 3h.

---

### 3.18. `receivables.html` (Windykacja) — status: niezaudytowany

**Prawdopodobnie:**
- Lista kart sprawa + kwota zaległości + ostatnia akcja
- FAB "+ Nowa kolejka"
- Szczegóły w bottom sheet

**Czas:** 3h.

---

## 4. FAZA 4 — Offline + IndexedDB (2 dni, priorytet P1)

### 4.1. IndexedDB schema (`gmp-offline` db)

Tabele (object stores):
- `cases_cache` — lista spraw (kluczem id)
- `tasks_cache` — lista zadań
- `clients_cache`
- `case_detail_cache` — pełne detale otwartej sprawy (TTL 1h)
- `intake_draft` — draft ankiety (klucz token, value JSON)
- `write_queue` — queue POST/PATCH czekających na sync

### 4.2. Wrapper nad Supabase — offline-aware

Nowy plik `components/supabase-offline.js`:

```javascript
window.db = new Proxy(window.supabaseClient, {
  get(target, prop) {
    if (prop === 'from') {
      return (table) => ({
        select: async (cols, opts) => {
          try {
            const res = await target.from(table).select(cols, opts);
            if (res.data) cacheTable(table, res.data);
            return res;
          } catch {
            return { data: await getFromCache(table), error: null, offline: true };
          }
        },
        insert: (data) => queueWrite('POST', table, data),
        update: (data) => ({ eq: (k, v) => queueWrite('PATCH', table, data, {[k]: v}) }),
        // ...
      });
    }
    return target[prop];
  }
});
```

Pokazuje banner „⚠ Offline — zmiany zapiszą się gdy wróci sieć".

### 4.3. Offline scenarios

1. **Paweł w pociągu** — otwiera CRM, widzi dashboard z ostatniego sync'a, lista zadań dostępna (read-only).
2. **Klient w metrze** wypełnia ankietę — każde pole auto-save w IndexedDB, gdy wróci wifi, submit z queue.
3. **Julka w sądzie** — otwiera kartę sprawy z cache, dodaje notatkę → queue → sync po powrocie.

### 4.4. Conflict resolution

- Last-write-wins dla updates (zgodnie z obecnym zachowaniem)
- Dla `gmp_cases` — check `updated_at` przed pushem; jeśli ktoś inny zmienił, pokaż diff

**Czas fazy 4:** 2 dni.

---

## 5. FAZA 5 — Push notifications (opcjonalnie, 1 dzień)

### Zastosowania
- Nowe zadanie przypisane → push
- Zmiana statusu sprawy (assigned_to otrzymuje info)
- Raty do zapłaty dzisiaj (zamiast tylko zadania w CRM)
- Nowa ankieta klienta wysłana (dla Pawła)

### Technicznie
- Web Push Protocol + VAPID keys
- Supabase Edge function `send-push` wywołana na triggerach
- Frontend: `Notification.requestPermission()` + subscription do `pushManager`

Push może zaczekać — nie jest krytyczny dla launch.

---

## 6. FAZA 6 — Performance (1 dzień, priorytet P2)

### 6.1. Tailwind przez CLI zamiast CDN

Obecnie: CDN ~100KB runtime.  
Docelowo: build-time `tailwindcss -o output.css` z purgeCSS — ~8KB gzipped.

Plik `tailwind.config.js`, `build:css` w package.json:
```json
{
  "scripts": {
    "build:css": "tailwindcss -i ./src/input.css -o ./components/tailwind.css --minify"
  }
}
```

Oszczędność: ~92KB per page load.

### 6.2. Critical CSS inline

Każdy HTML `<head>` ma inline ~8KB krytycznego CSS (sidebar, hero, buttons), `layout.css` loadowany async via `<link rel="preload">`.

### 6.3. JS code splitting

- `components/supabase.js` CDN (40KB) → self-hosted z hash
- `chart.js` tylko na stronach z wykresami (dashboard, payments, analytics)
- `shortcuts.js` (24KB) tylko dla power users — deferred

### 6.4. Image optimization

- WebP zamiast PNG (logo, avatary)
- `<picture>` z fallback
- `loading="lazy"` dla non-critical

**Czas:** 1 dzień.

---

## 7. Testy

### 7.1. Urządzenia (minimum)
- iPhone SE 2020 (4.7", najmniejszy aktywny iPhone)
- iPhone 14 / 15 Pro
- Samsung Galaxy S22 (Android 13)
- Pixel 6a (Android stock)
- iPad Mini (tablet)
- Xiaomi Redmi Note (low-end Android)

### 7.2. Przeglądarki
- Safari 17+ (iOS)
- Chrome 124+ (Android)
- Firefox Mobile
- Samsung Internet
- (NIE testujemy) IE/Edge old

### 7.3. Scenariusze testowe (smoke test per persona)

**Paweł:**
1. Zainstaluj PWA na iPhone (Add to Home Screen)
2. Otwórz z home screen, login
3. Dashboard → sprawdź 3 alerty
4. Klik na sprawę → Zadzwoń do klienta (tel: protokół)
5. Wyłącz wifi → otwórz ostatnią sprawę — ma działać
6. Włącz wifi → zmień status sprawy — sync

**Julka:**
1. Otwórz tasks.html, filtruj "Moje"
2. Oznacz 3 zadania jako done (swipe right)
3. Dodaj notatkę w karcie sprawy
4. Pull-to-refresh

**Klient:**
1. Otwórz intake link
2. Add to Home Screen
3. Wypełnij sekcję 1, zamknij
4. Otwórz po godzinie — dane zachowane
5. Załącz zdjęcie paszportu z kamery
6. Submit (online)

### 7.4. Automatyzacja

- Playwright mobile emulation (iPhone 14, Pixel 7)
- Lighthouse CI w Vercel preview — fail gdy score < 85
- axe-core dla a11y w każdym build

---

## 8. Timeline i priorytety

### Priorytet P0 (MUST przed drugim launchem)
**2 dni** — Faza 1 (PWA fundamenty) + Faza 2 (design system mobile)

Gdy to zrobione: CRM jest **installable**, touch-friendly, z bottom navigation, safe-area, bottom sheets. Działa OK na telefonie.

### Priorytet P1 (WAŻNE, tydzień 1-2 po launch)
**4 dni** — Faza 3 (per-screen polish)  
**2 dni** — Faza 4 (offline)

### Priorytet P2 (NICE, tydzień 3+)
**1 dzień** — Faza 5 (push)  
**1 dzień** — Faza 6 (performance)

### Łącznie: **~10 dni pracy** na pełny plan (single developer, skupiony).

---

## 9. Harmonogram proponowany

| Tydzień | Faza | Deliverable |
|---------|------|-------------|
| T1 pn-wt | P0 Faza 1 | Manifest, SW, ikony, meta tags, headers Vercel — CRM **installable** |
| T1 śr-pt | P0 Faza 2 | Design system mobile (bottom nav, touch 44px, bottom sheets, safe-area) |
| T2 pn-czw | P1 Faza 3 | Per-screen refactor (cases, case detail, tasks, dashboard, calendar, payments) |
| T2 pt | P1 Faza 3 | Reszta ekranów (staff, clients, employers, analytics, kanban) |
| T3 pn-wt | P1 Faza 4 | Offline + IndexedDB + write queue |
| T3 śr | P2 Faza 6 | Performance (Tailwind CLI, critical CSS) |
| T3 czw | P2 Faza 5 | Push notifications (opcjonalnie) |
| T3 pt | Testy | Cross-device, Lighthouse, Playwright |

---

## 10. Lista checkbox (do wykonania)

### PWA Core
- [ ] Wygeneruj 10 ikon (72, 96, 128, 144, 152, 180, 192, 384, 512, + 2 maskable)
- [ ] Wygeneruj 13 splash screens iOS
- [ ] `crm/manifest.json` z shortcuts
- [ ] `crm/intake/manifest.json` osobny dla klientów
- [ ] `crm/sw.js` z cache strategies
- [ ] `crm/offline.html` fallback page
- [ ] `components/sw-register.js` + import w każdy HTML
- [ ] Meta tags PWA do każdego z 25 plików HTML (auto via script)
- [ ] Vercel headers — cache, CSP, Service-Worker-Allowed

### Design system mobile
- [ ] Breakpointy uporządkowane (640 / 1025 / 1441)
- [ ] Safe-area CSS custom properties
- [ ] Bottom navigation component
- [ ] Touch targets 44px w layout.css
- [ ] Bottom sheet styling (modals)
- [ ] Font-size 16px wymuszone
- [ ] Dark mode flash prevention (inline script ustawiający `color-scheme` przed loadem)

### Per-screen (priorytet od najczęściej używanych)
- [ ] dashboard.html — KPI carousel, dziś bar 2×2, plan dnia
- [ ] cases.html — card view, FAB, pull-to-refresh, infinite scroll
- [ ] case.html — segmented tabs, hero sticky, quick actions
- [ ] tasks.html — swipe actions, FAB
- [ ] appointments.html — agenda list, FAB
- [ ] alerts.html — segmented tabs
- [ ] payments.html — responsive charts, KPI carousel
- [ ] staff.html — cards
- [ ] clients.html, employers.html — cards + search sticky
- [ ] analytics.html — carousel wykresów
- [ ] kanban.html — segmented column picker
- [ ] leads.html, lead.html — stepper mobile
- [ ] intake/index.html — draft saving IndexedDB, fix `user-scalable`, PWA manifest
- [ ] admin.html — redirect na mobile
- [ ] invoices.html — karty + swipe actions
- [ ] receivables.html — karty + swipe

### Offline
- [ ] IndexedDB schema `gmp-offline`
- [ ] `supabase-offline.js` wrapper
- [ ] Write queue + Background Sync
- [ ] Banner „Offline mode"
- [ ] Conflict resolution (updated_at check)
- [ ] Intake draft auto-save co 5s

### Testy
- [ ] Lighthouse CI w GitHub Actions (score ≥ 85)
- [ ] Playwright mobile emulation per ekran
- [ ] Manual testy na 6 urządzeniach (checklist)
- [ ] axe-core a11y audit
- [ ] Screen reader (VoiceOver + TalkBack)

---

## 11. Ryzyka

1. **Service Worker psuje cache po deploy** — nauczyć się skip-waiting + client claim prawidłowo. Mitigacja: versioning cache + user message "Nowa wersja dostępna".

2. **iOS Safari quirks** — wielopunktowy gesture, `100vh` vs `100dvh` (dynamic viewport). Testy na realnym iPhone obowiązkowe, nie tylko DevTools emulation.

3. **Chart.js na niskim Android** — lag przy dużej ilości punktów. Mitigacja: limit dataset do 30 punktów, downsampling.

4. **IndexedDB quota** — 50MB na origin. Dla kancelarii 1000+ spraw to może być za mało. Mitigacja: LRU cache, priorytet ostatnio otwieranych spraw.

5. **Push notifications permission** — użytkownik odrzuca → CRM nie działa gorzej, ale trzeba przemyśleć UX proszenia (nie od razu, tylko po 3. wizycie albo po wyraźnej akcji).

6. **Single developer on everything** — 10 dni pracy to minimum. Realnie z testami, debugowaniem, UX iteracji = 14-16 dni. Warto harmonogram rozluźnić.

---

## 12. Minimalny set jeśli czasu brak

Jeśli można zrobić TYLKO 3 dni pracy, robimy:

1. **Manifest + SW skromny** (1 dzień) — installability + cache HTML/JS/CSS
2. **Touch targets + bottom sheets + safe-area** (1 dzień) — UX upgrade widoczny
3. **Card view na cases.html + case.html hero + quick actions** (1 dzień) — najważniejsze ekrany

Reszta to nice-to-have.

---

**Autor:** Claude (po audycie 2026-04-23 przez Explore agent + 25 plików HTML przeanalizowanych)  
**Estymacja:** 10-14 dni pracy dla single developer  
**Data:** 2026-04-23
