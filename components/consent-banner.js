// BLK-6 fix 2026-05-02: cookie / RODO consent banner.
// Pasuje do landing pages (index.html, lawyers.html, calendar.html, availability.html,
// lead.html, offers.html, polityka-prywatnosci.html, regulamin.html).
//
// Wymaga: w <head> przed GTM/gtag musi byc Consent Mode v2 z defaults 'denied'.
// Ten moduł:
//  1. Sprawdza localStorage.gmp_consent_v1
//  2. Jeśli brak -> wyświetla banner (accept all / reject all / settings)
//  3. Po decyzji wywołuje gtag('consent','update', {...}) i zapisuje
//  4. Wystawia window.gmpOpenConsent() (link "Cookies" w footerze)

(function () {
    if (typeof window === 'undefined') return;
    if (window.__gmpConsentBannerInit) return;
    window.__gmpConsentBannerInit = true;

    const STORAGE_KEY = 'gmp_consent_v1';
    const VERSION = 1;

    // GA Consent Mode v2 mapping
    const CONSENT_MAP = {
        analytics: ['analytics_storage'],
        marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
        functional: ['functionality_storage', 'personalization_storage', 'security_storage'],
    };

    function readState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            if (!obj || obj.version !== VERSION) return null;
            return obj;
        } catch (_) { return null; }
    }

    function writeState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: VERSION, timestamp: new Date().toISOString() }));
        } catch (_) {}
    }

    function applyToGtag(state) {
        if (typeof window.gtag !== 'function') return;
        const payload = {};
        for (const [cat, keys] of Object.entries(CONSENT_MAP)) {
            const granted = state[cat] === true;
            for (const k of keys) payload[k] = granted ? 'granted' : 'denied';
        }
        try { window.gtag('consent', 'update', payload); } catch (_) {}
    }

    function injectStyles() {
        if (document.getElementById('gmp-consent-styles')) return;
        const css = `
            .gmp-consent-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;max-width:560px;margin:0 auto;background:#fff;color:#111;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.18);padding:18px 20px;font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.5}
            .gmp-consent-banner h3{margin:0 0 6px;font-size:16px;font-weight:700}
            .gmp-consent-banner p{margin:0 0 12px;color:#475569}
            .gmp-consent-actions{display:flex;flex-wrap:wrap;gap:8px}
            .gmp-consent-btn{flex:1 1 auto;min-width:120px;padding:10px 14px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;color:#111;font-weight:600;cursor:pointer;font-size:13px}
            .gmp-consent-btn:hover{background:#f8fafc}
            .gmp-consent-btn-primary{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
            .gmp-consent-btn-primary:hover{background:#0284c7}
            .gmp-consent-link{background:none;border:0;padding:6px 8px;color:#0ea5e9;cursor:pointer;font-size:12px;text-decoration:underline}
            .gmp-consent-modal{position:fixed;inset:0;z-index:99998;background:rgba(15,23,42,.5);display:flex;align-items:flex-end;justify-content:center;padding:16px}
            .gmp-consent-modal-card{background:#fff;border-radius:14px;max-width:520px;width:100%;padding:22px;max-height:85vh;overflow:auto}
            .gmp-consent-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;gap:12px}
            .gmp-consent-row:last-child{border-bottom:0}
            .gmp-consent-row label{font-weight:600;font-size:13px}
            .gmp-consent-row .gmp-consent-row-desc{font-size:12px;color:#64748b;margin-top:2px;font-weight:400}
            .gmp-consent-toggle{appearance:none;width:38px;height:22px;border-radius:11px;background:#cbd5e1;position:relative;cursor:pointer;border:0;outline:none;transition:background .15s}
            .gmp-consent-toggle:checked{background:#0ea5e9}
            .gmp-consent-toggle:disabled{opacity:.5;cursor:not-allowed}
            .gmp-consent-toggle::before{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;background:#fff;border-radius:50%;transition:transform .15s}
            .gmp-consent-toggle:checked::before{transform:translateX(16px)}
            @media (max-width:600px){.gmp-consent-banner{left:8px;right:8px;bottom:8px;padding:14px 16px}.gmp-consent-btn{flex:1 1 100%}}
        `;
        const style = document.createElement('style');
        style.id = 'gmp-consent-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function buildBanner() {
        const banner = document.createElement('div');
        banner.className = 'gmp-consent-banner';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-live', 'polite');
        banner.setAttribute('aria-label', 'Zgoda na pliki cookies');
        banner.innerHTML = `
            <h3>Pliki cookies i prywatność</h3>
            <p>Używamy plików cookies do działania strony i analizy ruchu. Wybierz kategorie, na które wyrażasz zgodę. Szczegóły w <a href="/polityka-prywatnosci.html" target="_blank" rel="noopener">Polityce prywatności</a>.</p>
            <div class="gmp-consent-actions">
                <button class="gmp-consent-btn" data-action="reject">Odrzuć opcjonalne</button>
                <button class="gmp-consent-btn" data-action="settings">Ustawienia</button>
                <button class="gmp-consent-btn gmp-consent-btn-primary" data-action="accept">Akceptuję wszystkie</button>
            </div>
        `;
        return banner;
    }

    function buildSettings(currentState) {
        const modal = document.createElement('div');
        modal.className = 'gmp-consent-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        const a = currentState?.analytics ? 'checked' : '';
        const m = currentState?.marketing ? 'checked' : '';
        const f = currentState?.functional ? 'checked' : '';
        modal.innerHTML = `
            <div class="gmp-consent-modal-card">
                <h3 style="margin:0 0 14px;font-size:18px;font-weight:700">Ustawienia plików cookies</h3>
                <div class="gmp-consent-row">
                    <div>
                        <label>Niezbędne</label>
                        <div class="gmp-consent-row-desc">Wymagane do działania strony (sesja, formularze).</div>
                    </div>
                    <input type="checkbox" class="gmp-consent-toggle" checked disabled>
                </div>
                <div class="gmp-consent-row">
                    <div>
                        <label>Funkcjonalne</label>
                        <div class="gmp-consent-row-desc">Personalizacja, zapisane preferencje.</div>
                    </div>
                    <input type="checkbox" class="gmp-consent-toggle" data-cat="functional" ${f}>
                </div>
                <div class="gmp-consent-row">
                    <div>
                        <label>Analityczne</label>
                        <div class="gmp-consent-row-desc">Anonimowe statystyki ruchu (Google Analytics).</div>
                    </div>
                    <input type="checkbox" class="gmp-consent-toggle" data-cat="analytics" ${a}>
                </div>
                <div class="gmp-consent-row">
                    <div>
                        <label>Marketingowe</label>
                        <div class="gmp-consent-row-desc">Reklamy spersonalizowane, mierzenie konwersji.</div>
                    </div>
                    <input type="checkbox" class="gmp-consent-toggle" data-cat="marketing" ${m}>
                </div>
                <div class="gmp-consent-actions" style="margin-top:18px">
                    <button class="gmp-consent-btn" data-action="cancel">Anuluj</button>
                    <button class="gmp-consent-btn gmp-consent-btn-primary" data-action="save">Zapisz wybór</button>
                </div>
            </div>
        `;
        return modal;
    }

    function decide(state) {
        writeState(state);
        applyToGtag(state);
        const b = document.querySelector('.gmp-consent-banner');
        if (b) b.remove();
        const m = document.querySelector('.gmp-consent-modal');
        if (m) m.remove();
    }

    function openSettings(initial) {
        const m = document.querySelector('.gmp-consent-modal');
        if (m) m.remove();
        const modal = buildSettings(initial || readState() || {});
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
            const action = e.target?.getAttribute?.('data-action');
            if (action === 'cancel') modal.remove();
            if (action === 'save') {
                const checks = modal.querySelectorAll('input[data-cat]');
                const next = { necessary: true };
                checks.forEach((c) => { next[c.getAttribute('data-cat')] = c.checked; });
                decide(next);
            }
        });
    }

    function openBanner() {
        if (document.querySelector('.gmp-consent-banner')) return;
        injectStyles();
        const banner = buildBanner();
        document.body.appendChild(banner);
        banner.addEventListener('click', (e) => {
            const action = e.target?.getAttribute?.('data-action');
            if (action === 'accept') {
                decide({ necessary: true, functional: true, analytics: true, marketing: true });
            } else if (action === 'reject') {
                decide({ necessary: true, functional: false, analytics: false, marketing: false });
            } else if (action === 'settings') {
                openSettings(readState());
            }
        });
    }

    window.gmpOpenConsent = function () {
        injectStyles();
        openSettings(readState());
    };

    function init() {
        const existing = readState();
        if (existing) {
            applyToGtag(existing);
            return;
        }
        injectStyles();
        // Banner pokazujemy po 250ms żeby nie blokować initial paint
        setTimeout(openBanner, 250);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
