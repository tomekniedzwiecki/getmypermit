// MOC App — klient Supabase + helpery formatujące
// OSOBNY projekt Supabase niż getmypermit CRM. Pomost cross-project przez edge function.
// Storage key INNY żeby sesje się nie kolidowały gdy user ma otwarte oba panele.

const SUPABASE_URL = 'https://yltidvqiwdedhmirjazp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsdGlkdnFpd2RlZGhtaXJqYXpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTMyNDQsImV4cCI6MjA5MzI4OTI0NH0.wP7pMoP8WtNuK_HSbb77QLZ4bts1qQ8E_Q0t1xtICC4';

window.mocSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'moc-app-auth',
    },
});

// Skrót
window.db = window.mocSupabase;

// Toast (zależy od DOM)
window.toast = (function() {
    function show(msg, type = 'info', duration = 3500) {
        const colors = {
            success: { bg: 'rgba(16,185,129,0.95)', fg: '#fff' },
            error: { bg: 'rgba(225,29,72,0.95)', fg: '#fff' },
            warning: { bg: 'rgba(245,158,11,0.95)', fg: '#1a1a1a' },
            info: { bg: 'rgba(15,23,42,0.95)', fg: '#fff' },
        };
        const icons = {
            success: 'ph-check-circle',
            error: 'ph-x-circle',
            warning: 'ph-warning',
            info: 'ph-info',
        };
        let c = document.getElementById('moc-toast-container');
        if (!c) {
            c = document.createElement('div');
            c.id = 'moc-toast-container';
            c.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:420px';
            document.body.appendChild(c);
        }
        const t = document.createElement('div');
        const col = colors[type] || colors.info;
        t.style.cssText = `background:${col.bg};color:${col.fg};border-radius:10px;padding:12px 16px;display:flex;align-items:flex-start;gap:10px;box-shadow:0 10px 30px rgba(0,0,0,0.25);font-size:14px;line-height:1.4;backdrop-filter:blur(10px)`;
        t.innerHTML = `<i class="ph ${icons[type]}" style="font-size:20px;flex-shrink:0"></i><div style="flex:1">${msg}</div><button style="background:transparent;border:none;color:inherit;opacity:0.7;cursor:pointer" onclick="this.parentElement.remove()"><i class="ph ph-x"></i></button>`;
        c.appendChild(t);
        setTimeout(() => t.remove(), duration);
    }
    return {
        success: (m, d) => show(m, 'success', d),
        error: (m, d) => show(m, 'error', d ?? 6000),
        warning: (m, d) => show(m, 'warning', d),
        info: (m, d) => show(m, 'info', d),
    };
})();

// Format helpery
window.fmt = {
    date: (d) => {
        if (!d) return '—';
        const dt = new Date(d);
        if (isNaN(dt)) return d;
        return dt.toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' });
    },
    datetime: (d) => {
        if (!d) return '—';
        const dt = new Date(d);
        if (isNaN(dt)) return d;
        return dt.toLocaleString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    },
    daysFromNow: (d) => {
        if (!d) return null;
        const dt = new Date(d);
        return Math.floor((dt.getTime() - Date.now()) / 86400000);
    },
};

// Escape HTML
window.esc = function(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

// Mapowanie kodów krajów na flagi (ISO 3166-1 alpha-3)
window.countryFlag = function(iso3) {
    const m = {
        UKR: '🇺🇦', BLR: '🇧🇾', GEO: '🇬🇪', PAK: '🇵🇰', VNM: '🇻🇳',
        IND: '🇮🇳', KAZ: '🇰🇿', UZB: '🇺🇿', PHL: '🇵🇭', NPL: '🇳🇵',
        BGD: '🇧🇩', LKA: '🇱🇰', IDN: '🇮🇩', TUR: '🇹🇷', RUS: '🇷🇺',
        XKX: '🇽🇰', MDA: '🇲🇩', ARM: '🇦🇲', AZE: '🇦🇿', PRK: '🇰🇵',
    };
    return m[iso3] || '🌍';
};
window.countryShort = function(iso3) {
    const m = {
        UKR: 'UA', BLR: 'BY', GEO: 'GE', PAK: 'PK', VNM: 'VN',
        IND: 'IN', KAZ: 'KZ', UZB: 'UZ', PHL: 'PH', NPL: 'NP',
        BGD: 'BD', LKA: 'LK', IDN: 'ID', TUR: 'TR', RUS: 'RU',
        XKX: 'XK', MDA: 'MD', ARM: 'AM', AZE: 'AZ', PRK: 'KP',
    };
    return m[iso3] || iso3;
};
