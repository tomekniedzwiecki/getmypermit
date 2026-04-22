/**
 * GetMyPermit — tracking helpers + consent banner.
 * Requires: Consent Mode v2 defaults + GTM snippet already in <head>.
 */
(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];

  // === Helper: push event to dataLayer ===
  window.gmpTrack = function (event, params) {
    window.dataLayer.push(Object.assign({ event: event }, params || {}));
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

  // === Consent banner (Consent Mode v2) ===
  const CONSENT_KEY = 'gmp_consent_v1';

  function applyConsent(granted) {
    const state = granted ? 'granted' : 'denied';
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'update', {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state,
    });
    try { localStorage.setItem(CONSENT_KEY, granted ? 'granted' : 'denied'); } catch (e) {}
  }

  function hideBanner() {
    const el = document.getElementById('gmp-consent-banner');
    if (el) el.remove();
  }

  function showBanner() {
    if (document.getElementById('gmp-consent-banner')) return;
    const lang = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    const isPL = lang === 'pl';
    const t = isPL ? {
      msg: 'Używamy plików cookie do analityki i reklam (Google Analytics, Google Ads). Dzięki temu rozwijamy stronę i docieramy do osób, którym możemy pomóc.',
      accept: 'Akceptuję',
      reject: 'Odrzuć',
      more: 'Polityka prywatności',
    } : {
      msg: 'We use cookies for analytics and ads (Google Analytics, Google Ads) to improve the site and reach people we can help.',
      accept: 'Accept',
      reject: 'Reject',
      more: 'Privacy policy',
    };

    const banner = document.createElement('div');
    banner.id = 'gmp-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML = [
      '<style>',
      '#gmp-consent-banner{position:fixed;bottom:16px;left:16px;right:16px;max-width:520px;margin:0 auto;background:#fff;color:#1f2124;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 20px 40px -10px rgba(0,0,0,.25);padding:20px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.5}',
      '#gmp-consent-banner p{margin:0 0 14px}',
      '#gmp-consent-banner .gmp-btns{display:flex;gap:8px;flex-wrap:wrap}',
      '#gmp-consent-banner button{font-family:inherit;font-size:14px;font-weight:600;padding:10px 18px;border-radius:10px;border:0;cursor:pointer}',
      '#gmp-consent-banner .gmp-accept{background:#05f;color:#fff}',
      '#gmp-consent-banner .gmp-accept:hover{background:#3377ff}',
      '#gmp-consent-banner .gmp-reject{background:#f1f2f3;color:#1f2124}',
      '#gmp-consent-banner .gmp-reject:hover{background:#e5e7eb}',
      '@media (max-width:520px){#gmp-consent-banner{left:8px;right:8px;bottom:8px;padding:16px}}',
      '</style>',
      '<p>', t.msg, '</p>',
      '<div class="gmp-btns">',
      '<button type="button" class="gmp-accept">', t.accept, '</button>',
      '<button type="button" class="gmp-reject">', t.reject, '</button>',
      '</div>',
    ].join('');

    banner.querySelector('.gmp-accept').addEventListener('click', function () {
      applyConsent(true);
      hideBanner();
    });
    banner.querySelector('.gmp-reject').addEventListener('click', function () {
      applyConsent(false);
      hideBanner();
    });

    document.body.appendChild(banner);
  }

  // Restore prior decision or show banner
  let prior = null;
  try { prior = localStorage.getItem(CONSENT_KEY); } catch (e) {}
  if (prior === 'granted') {
    applyConsent(true);
  } else if (prior === 'denied') {
    applyConsent(false);
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
