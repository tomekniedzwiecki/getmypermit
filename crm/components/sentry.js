// CRIT-NEW-1 fix 2026-05-02: Sentry browser SDK init.
// Wymaga: ustawic window.GMP_SENTRY_DSN przed zaladowaniem (np. <meta name="x-sentry-dsn" content="...">)
// lub localStorage.gmp_sentry_dsn dla testow lokalnych.
//
// Uzycie: <script src="components/sentry.js" defer></script> przed wszystkimi innymi skryptami CRM.

(function () {
    if (typeof window === 'undefined') return;
    if (window.__gmpSentryInit) return;

    function readDsn() {
        const meta = document.querySelector('meta[name="x-sentry-dsn"]');
        if (meta && meta.content && meta.content !== '__SENTRY_DSN__') return meta.content;
        if (window.GMP_SENTRY_DSN) return window.GMP_SENTRY_DSN;
        try {
            const ls = localStorage.getItem('gmp_sentry_dsn');
            if (ls) return ls;
        } catch (_) {}
        return null;
    }

    const dsn = readDsn();
    if (!dsn) {
        // Brak DSN — fallback: zapisuj bledy w localStorage (max 50) zeby nic nie znikalo.
        window.gmpReportError = function (err, ctx) {
            try {
                const key = 'gmp_local_errors';
                const arr = JSON.parse(localStorage.getItem(key) || '[]');
                arr.push({ at: new Date().toISOString(), msg: String(err?.message || err), ctx });
                while (arr.length > 50) arr.shift();
                localStorage.setItem(key, JSON.stringify(arr));
            } catch (_) {}
        };
        window.addEventListener('error', e => window.gmpReportError(e.error || e.message, { type: 'window.error', filename: e.filename, lineno: e.lineno }));
        window.addEventListener('unhandledrejection', e => window.gmpReportError(e.reason, { type: 'unhandledrejection' }));
        return;
    }

    window.__gmpSentryInit = true;

    const script = document.createElement('script');
    script.src = 'https://browser.sentry-cdn.com/8.41.0/bundle.min.js';
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = function () {
        try {
            window.Sentry.init({
                dsn,
                integrations: [],
                tracesSampleRate: 0.0,
                replaysSessionSampleRate: 0.0,
                replaysOnErrorSampleRate: 0.0,
                environment: location.hostname.includes('localhost') ? 'development'
                    : location.hostname.includes('vercel.app') ? 'preview'
                    : 'production',
                release: (document.querySelector('meta[name="x-app-version"]')?.content) || 'unknown',
                beforeSend(event) {
                    // Strip PII: usun authorization headers + PESEL pattern w stringach
                    try {
                        if (event.request?.headers) {
                            delete event.request.headers.authorization;
                            delete event.request.headers.Authorization;
                        }
                        const peselRe = /\b\d{11}\b/g;
                        const passportRe = /\b[A-Z]{2}\d{6,7}\b/g;
                        const sanitize = (v) => typeof v === 'string'
                            ? v.replace(peselRe, '[PESEL]').replace(passportRe, '[PASSPORT]')
                            : v;
                        if (event.message) event.message = sanitize(event.message);
                        if (event.exception?.values) {
                            event.exception.values.forEach(ex => {
                                if (ex.value) ex.value = sanitize(ex.value);
                            });
                        }
                    } catch (_) {}
                    return event;
                },
            });
            window.gmpReportError = function (err, ctx) {
                try { window.Sentry.captureException(err, { extra: ctx }); } catch (_) {}
            };
        } catch (e) {
            console.error('Sentry init failed:', e);
        }
    };
    script.onerror = function () {
        console.warn('Sentry CDN load failed — falling back to console.error');
    };
    document.head.appendChild(script);
})();
