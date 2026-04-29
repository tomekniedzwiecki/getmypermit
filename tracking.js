/**
 * GetMyPermit — tracking helpers + RODO/GDPR-compliant consent modal.
 * Requires: Consent Mode v2 defaults + GTM snippet already in <head>.
 */
(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  // === Helper: push event to dataLayer + GA4 direct ===
  // Push do dataLayer dla GTM (zachowanie istniejacych Tagow Google Ads / GA4 conv.).
  // RÓWNIEZ wywolanie gtag('event', ...) zeby event poszedl bezposrednio do GA4
  // (pomijajac GTM) — GTM nie ma Tagow dla naszych form_* custom events.
  window.gmpTrack = function (event, params) {
    var p = params || {};
    window.dataLayer.push(Object.assign({ event: event }, p));
    if (typeof window.gtag === 'function') {
      window.gtag('event', event, p);
    }
  };

  // === Helper: SHA-256 (lowercase hex) for Enhanced Conversions ===
  window.gmpHashEmail = async function (email) {
    if (!email) return null;
    const normalized = String(email).trim().toLowerCase();
    const buf = new TextEncoder().encode(normalized);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map(function (b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  };

  // === Helper: compute Google Ads value from lead score ===
  // COLD < 35 → 10 PLN, WARM 35-59 → 60 PLN, HOT >= 60 → 200 PLN
  window.gmpValueFromScore = function (score) {
    const s = Number(score) || 0;
    if (s >= 60) return 200;
    if (s >= 35) return 60;
    return 10;
  };

  // === Auto-bind: phone / email clicks ===
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (href.startsWith('tel:')) {
      window.gmpTrack('phone_click', { phone_number: href.replace('tel:', '') });
    } else if (href.startsWith('mailto:')) {
      window.gmpTrack('email_click', { email_address: href.replace('mailto:', '').split('?')[0] });
    }
  }, { passive: true });

  // ============================================================
  // CONSENT MANAGEMENT (RODO / ePrivacy / Google Consent Mode v2)
  // ============================================================

  const CONSENT_KEY = 'gmp_consent_v3';
  const LEGACY_KEYS = ['gmp_consent_v1', 'gmp_consent_v2'];
  const PRIVACY_URL = { pl: '/polityka-prywatnosci', en: '/privacy-policy' };

  function getLang() {
    const lang = (window.currentLang || document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    return lang === 'pl' ? 'pl' : 'en';
  }

  function t(key) {
    const lang = getLang();
    const dict = {
      pl: {
        title: 'Zanim przejdziemy dalej — pliki cookie',
        lead: 'Używamy plików cookie i podobnych technologii, aby analizować ruch na stronie oraz docierać z reklamą do osób, którym możemy pomóc w sprawach pobytowych. Zgodnie z RODO potrzebujemy Twojej zgody na cookies analityczne i reklamowe.',
        leadDetails: 'Swoją decyzję możesz w każdej chwili zmienić klikając „Ustawienia cookies" w lewym dolnym rogu strony. Więcej informacji znajdziesz w <a href="{privacy}" target="_blank" rel="noopener">polityce prywatności</a>.',
        acceptAll: 'Zaakceptuj wszystkie',
        rejectAll: 'Odrzuć wszystkie',
        customize: 'Dostosuj',
        savePrefs: 'Zapisz wybór',
        back: '← Wróć',
        cats: 'Kategorie plików cookie',
        necNm: 'Niezbędne',
        necDesc: 'Potrzebne do działania strony — zapamiętują język, sesję, stan formularza. Nie da się ich wyłączyć, bo strona bez nich nie działa. Dane nie są używane do analityki ani reklamy.',
        necAlways: 'Zawsze aktywne',
        anNm: 'Analityka',
        anDesc: 'Google Analytics 4. Mierzy ile osób odwiedza stronę, które sekcje czytają, w jakich językach. Pomaga nam zrozumieć co działa, a co nie — bez tego rozwijamy stronę na ślepo.',
        adNm: 'Reklama',
        adDesc: 'Google Ads. Pozwala mierzyć skuteczność reklam i pokazywać trafniejsze komunikaty osobom, które szukają pomocy w sprawach pobytowych. Bez tego nie wiemy czy nasze reklamy docierają do właściwych ludzi.',
        settings: 'Ustawienia cookies',
        settingsClose: 'Zamknij',
      },
      en: {
        title: 'Before we continue — cookies',
        lead: 'We use cookies and similar technologies to analyze site traffic and to reach people we can help with residence permit matters. Under GDPR we need your consent for analytics and advertising cookies.',
        leadDetails: 'You can change your decision any time by clicking "Cookie settings" in the bottom-left corner of the page. More info in our <a href="{privacy}" target="_blank" rel="noopener">privacy policy</a>.',
        acceptAll: 'Accept all',
        rejectAll: 'Reject all',
        customize: 'Customize',
        savePrefs: 'Save preferences',
        back: '← Back',
        cats: 'Cookie categories',
        necNm: 'Strictly necessary',
        necDesc: 'Required for the site to work — remembers language, session, form state. Cannot be turned off because the site will not function without them. Not used for analytics or advertising.',
        necAlways: 'Always active',
        anNm: 'Analytics',
        anDesc: 'Google Analytics 4. Measures how many people visit, which sections they read, in which languages. Helps us understand what works and what does not.',
        adNm: 'Advertising',
        adDesc: 'Google Ads. Measures ad effectiveness and shows more relevant messages to people searching for residence permit help. Without this we cannot know if our ads reach the right people.',
        settings: 'Cookie settings',
        settingsClose: 'Close',
      },
    };
    const str = (dict[lang] && dict[lang][key]) || dict.en[key] || '';
    return str.replace('{privacy}', PRIVACY_URL[lang]);
  }

  function loadStored() {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);
      if (raw) return JSON.parse(raw);
      // Clear old keys so user gets fresh modal (v1 baner + v2 intermediate)
      LEGACY_KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    } catch (e) {}
    return null;
  }

  function storeConsent(analytics, marketing) {
    const record = {
      version: 3,
      timestamp: new Date().toISOString(),
      analytics: !!analytics,
      marketing: !!marketing,
      userAgent: navigator.userAgent.slice(0, 200),
    };
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
      LEGACY_KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
    } catch (e) {}
    return record;
  }

  function applyConsent(analytics, marketing) {
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'update', {
      ad_storage: marketing ? 'granted' : 'denied',
      ad_user_data: marketing ? 'granted' : 'denied',
      ad_personalization: marketing ? 'granted' : 'denied',
      analytics_storage: analytics ? 'granted' : 'denied',
    });
    // Emit event for GTM so tags can react immediately
    window.gmpTrack('consent_updated', {
      analytics_consent: analytics ? 'granted' : 'denied',
      marketing_consent: marketing ? 'granted' : 'denied',
    });
  }

  function injectStyles() {
    if (document.getElementById('gmp-consent-styles')) return;
    const css = [
      '#gmp-consent-overlay{position:fixed;inset:0;background:rgba(5,10,20,.88);backdrop-filter:blur(10px);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px;animation:gmpFadeIn .3s ease-out}',
      '@keyframes gmpFadeIn{from{opacity:0}to{opacity:1}}',
      '@keyframes gmpSlideUp{from{transform:translateY(24px) scale(.98);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}',
      '#gmp-consent-modal{background:#fff;color:#1f2124;max-width:720px;width:100%;max-height:94vh;overflow-y:auto;border-radius:24px;box-shadow:0 40px 100px -20px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.05);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:16px;line-height:1.6;animation:gmpSlideUp .35s ease-out}',
      '#gmp-consent-modal header{padding:36px 36px 20px;text-align:center}',
      '#gmp-consent-modal h2{margin:0 0 14px;font-size:26px;font-weight:800;color:#0a0f19;letter-spacing:-.02em;line-height:1.25}',
      '#gmp-consent-modal p{margin:0 0 14px;color:#333;font-size:15px}',
      '#gmp-consent-modal p.gmp-details{font-size:13px;color:#778}',
      '#gmp-consent-modal a{color:#05f;text-decoration:underline;text-underline-offset:2px}',
      '#gmp-consent-modal .gmp-body{padding:0 36px 8px}',
      '#gmp-consent-modal .gmp-actions{padding:8px 36px 16px}',
      '#gmp-consent-modal .gmp-actions-secondary{display:flex;justify-content:center;gap:20px;padding:0 36px 24px;flex-wrap:wrap}',
      '#gmp-consent-modal button{font:inherit;font-weight:600;padding:14px 18px;border-radius:12px;border:1.5px solid #1f2124;cursor:pointer;background:#fff;color:#1f2124;transition:transform .1s,background .15s;font-size:15px}',
      '#gmp-consent-modal button.gmp-primary-big{width:100%;padding:18px 24px;font-size:17px;font-weight:700;background:#05f;color:#fff;border:0;border-radius:14px;box-shadow:0 10px 30px -8px rgba(0,85,255,.5);letter-spacing:.01em}',
      '#gmp-consent-modal button.gmp-primary-big:hover{background:#3377ff;transform:translateY(-2px);box-shadow:0 14px 34px -8px rgba(0,85,255,.6)}',
      '#gmp-consent-modal button.gmp-primary-big:active{transform:translateY(0)}',
      '#gmp-consent-modal button.gmp-link-sm{border:0;padding:4px 2px;background:transparent;color:#99a;text-decoration:underline;text-underline-offset:3px;font-weight:500;font-size:13px}',
      '#gmp-consent-modal button.gmp-link-sm:hover{color:#556;background:transparent}',
      '#gmp-consent-modal button:hover{background:#f4f4f5;transform:translateY(-1px)}',
      '#gmp-consent-modal button:active{transform:translateY(0)}',
      '#gmp-consent-modal button.gmp-link{border:0;padding:10px 14px;background:transparent;color:#667;text-decoration:underline;font-weight:500}',
      '#gmp-consent-modal button.gmp-link:hover{background:transparent;color:#1f2124}',
      '#gmp-consent-modal .gmp-cats{padding:8px 28px 4px;border-top:1px solid #e5e7eb;margin-top:4px}',
      '#gmp-consent-modal .gmp-cats h3{margin:16px 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#667;font-weight:700}',
      '#gmp-consent-modal .gmp-cat{padding:14px 0;border-bottom:1px solid #f1f2f3}',
      '#gmp-consent-modal .gmp-cat:last-child{border-bottom:0}',
      '#gmp-consent-modal .gmp-cat-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:6px}',
      '#gmp-consent-modal .gmp-cat-name{font-weight:700;color:#0a0f19;font-size:15px}',
      '#gmp-consent-modal .gmp-cat-desc{font-size:13px;color:#556;margin:0}',
      '#gmp-consent-modal .gmp-toggle{position:relative;width:42px;height:24px;background:#d4d4d8;border-radius:999px;transition:background .2s;cursor:pointer;flex-shrink:0;border:0}',
      '#gmp-consent-modal .gmp-toggle::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;background:#fff;border-radius:50%;transition:transform .2s;box-shadow:0 2px 4px rgba(0,0,0,.15)}',
      '#gmp-consent-modal .gmp-toggle.on{background:#05f}',
      '#gmp-consent-modal .gmp-toggle.on::after{transform:translateX(18px)}',
      '#gmp-consent-modal .gmp-toggle.disabled{background:#86efac;cursor:not-allowed;opacity:.7}',
      '#gmp-consent-modal .gmp-toggle.disabled::after{transform:translateX(18px)}',
      '#gmp-consent-modal .gmp-badge{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#059669;font-weight:700;padding:4px 8px;background:#ecfdf5;border-radius:6px;white-space:nowrap}',
      '#gmp-consent-modal .gmp-save{padding:18px 28px 24px;display:flex;justify-content:space-between;align-items:center;gap:12px;border-top:1px solid #e5e7eb;background:#fafafa;border-radius:0 0 20px 20px}',
      '#gmp-consent-modal .gmp-save button.gmp-primary{background:#05f;color:#fff;border-color:#05f;flex:1;max-width:240px}',
      '#gmp-consent-modal .gmp-save button.gmp-primary:hover{background:#3377ff}',
      '#gmp-consent-settings-btn{position:fixed;bottom:14px;left:14px;width:44px;height:44px;border-radius:50%;background:#fff;color:#1f2124;border:1px solid #e5e7eb;box-shadow:0 4px 16px rgba(0,0,0,.15);cursor:pointer;z-index:2147483640;display:flex;align-items:center;justify-content:center;font-size:20px;transition:transform .15s,box-shadow .15s}',
      '#gmp-consent-settings-btn:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,.2)}',
      '@media (max-width:480px){',
      '  #gmp-consent-modal{border-radius:16px;max-height:96vh}',
      '  #gmp-consent-modal header{padding:22px 20px 14px}',
      '  #gmp-consent-modal h2{font-size:20px}',
      '  #gmp-consent-modal .gmp-body,#gmp-consent-modal .gmp-cats,#gmp-consent-modal .gmp-save{padding-left:20px;padding-right:20px}',
      '  #gmp-consent-modal .gmp-actions{padding:4px 20px 16px;grid-template-columns:1fr!important;gap:8px}',
      '  #gmp-consent-modal .gmp-save{flex-direction:column-reverse;align-items:stretch}',
      '  #gmp-consent-modal .gmp-save button.gmp-primary{max-width:none}',
      '  #gmp-consent-settings-btn{bottom:10px;left:10px;width:40px;height:40px;font-size:18px}',
      '}',
    ].join('');
    const style = document.createElement('style');
    style.id = 'gmp-consent-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  let bodyScrollY = 0;
  function lockBody() {
    bodyScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + bodyScrollY + 'px';
    document.body.style.width = '100%';
  }
  function unlockBody() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    window.scrollTo(0, bodyScrollY);
  }

  function closeModal() {
    const overlay = document.getElementById('gmp-consent-overlay');
    if (overlay) overlay.remove();
    unlockBody();
  }

  function buildActionsView(prefs) {
    return [
      '<div class="gmp-actions">',
      '<button type="button" class="gmp-primary-big" data-action="accept">', t('acceptAll'), '</button>',
      '</div>',
      '<div class="gmp-actions-secondary">',
      '<button type="button" class="gmp-link-sm" data-action="customize">', t('customize'), '</button>',
      '<button type="button" class="gmp-link-sm" data-action="reject">', t('rejectAll'), '</button>',
      '</div>',
    ].join('');
  }

  function buildCustomizeView(prefs) {
    return [
      '<div class="gmp-cats">',
      '<h3>', t('cats'), '</h3>',
      // Necessary (always on, disabled)
      '<div class="gmp-cat">',
      '<div class="gmp-cat-head">',
      '<div class="gmp-cat-name">', t('necNm'), '</div>',
      '<span class="gmp-badge">', t('necAlways'), '</span>',
      '</div>',
      '<p class="gmp-cat-desc">', t('necDesc'), '</p>',
      '</div>',
      // Analytics
      '<div class="gmp-cat">',
      '<div class="gmp-cat-head">',
      '<div class="gmp-cat-name">', t('anNm'), '</div>',
      '<button type="button" class="gmp-toggle', prefs.analytics ? ' on' : '', '" data-toggle="analytics" aria-pressed="', prefs.analytics ? 'true' : 'false', '" aria-label="', t('anNm'), '"></button>',
      '</div>',
      '<p class="gmp-cat-desc">', t('anDesc'), '</p>',
      '</div>',
      // Marketing
      '<div class="gmp-cat">',
      '<div class="gmp-cat-head">',
      '<div class="gmp-cat-name">', t('adNm'), '</div>',
      '<button type="button" class="gmp-toggle', prefs.marketing ? ' on' : '', '" data-toggle="marketing" aria-pressed="', prefs.marketing ? 'true' : 'false', '" aria-label="', t('adNm'), '"></button>',
      '</div>',
      '<p class="gmp-cat-desc">', t('adDesc'), '</p>',
      '</div>',
      '</div>',
      '<div class="gmp-save">',
      '<button type="button" class="gmp-link" data-action="back">', t('back'), '</button>',
      '<button type="button" class="gmp-primary" data-action="save">', t('savePrefs'), '</button>',
      '</div>',
    ].join('');
  }

  function openModal(mode) {
    injectStyles();
    // Close any existing modal first
    const existing = document.getElementById('gmp-consent-overlay');
    if (existing) existing.remove();

    const stored = loadStored();
    const prefs = {
      analytics: stored ? stored.analytics : false,
      marketing: stored ? stored.marketing : false,
    };

    const overlay = document.createElement('div');
    overlay.id = 'gmp-consent-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'gmp-consent-title');

    function render(view) {
      const body = view === 'customize'
        ? buildCustomizeView(prefs)
        : buildActionsView(prefs);
      overlay.innerHTML = [
        '<div id="gmp-consent-modal" tabindex="-1">',
        '<header>',
        '<h2 id="gmp-consent-title">', t('title'), '</h2>',
        '<p>', t('lead'), '</p>',
        '<p class="gmp-details">', t('leadDetails'), '</p>',
        '</header>',
        body,
        '</div>',
      ].join('');
      bind(view);
    }

    function bind(view) {
      overlay.querySelectorAll('[data-action]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const action = btn.getAttribute('data-action');
          if (action === 'accept') {
            storeConsent(true, true);
            applyConsent(true, true);
            closeModal();
          } else if (action === 'reject') {
            storeConsent(false, false);
            applyConsent(false, false);
            closeModal();
          } else if (action === 'customize') {
            render('customize');
          } else if (action === 'back') {
            render('actions');
          } else if (action === 'save') {
            storeConsent(prefs.analytics, prefs.marketing);
            applyConsent(prefs.analytics, prefs.marketing);
            closeModal();
          }
        });
      });
      overlay.querySelectorAll('[data-toggle]').forEach(function (tgl) {
        tgl.addEventListener('click', function () {
          const key = tgl.getAttribute('data-toggle');
          prefs[key] = !prefs[key];
          tgl.classList.toggle('on', prefs[key]);
          tgl.setAttribute('aria-pressed', prefs[key] ? 'true' : 'false');
        });
      });
    }

    render(mode || 'actions');
    document.body.appendChild(overlay);
    lockBody();
    const modal = overlay.querySelector('#gmp-consent-modal');
    if (modal) modal.focus();
  }

  function renderSettingsButton() {
    if (document.getElementById('gmp-consent-settings-btn')) return;
    injectStyles();
    const btn = document.createElement('button');
    btn.id = 'gmp-consent-settings-btn';
    btn.type = 'button';
    btn.title = t('settings');
    btn.setAttribute('aria-label', t('settings'));
    btn.innerHTML = '&#9881;'; // gear
    btn.addEventListener('click', function () { openModal('actions'); });
    document.body.appendChild(btn);
  }

  // === Public API ===
  window.gmpOpenConsent = function () { openModal('actions'); };

  // === Boot ===
  // Decyzja 2026-04-28: nie pokazujemy modala na pierwsza wizyte. Cookies sa
  // automatycznie zaakceptowane (analytics + marketing = granted), modal mozna
  // otworzyc z linka "Cookies" w footerze (window.gmpOpenConsent). Floating
  // gear button (renderSettingsButton) wycofany — link w footer wystarczy.
  function boot() {
    const stored = loadStored();
    if (stored) {
      applyConsent(stored.analytics, stored.marketing);
    } else {
      // Auto-accept all (zgoda domyslna, brak modala)
      storeConsent(true, true);
      applyConsent(true, true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
