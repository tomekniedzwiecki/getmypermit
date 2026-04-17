// Shared Supabase client for CRM
// Usage: <script src="components/supabase.js"></script>

const SUPABASE_URL = 'https://gfwsdrbywgmceateubyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd3NkcmJ5d2dtY2VhdGV1YnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mzg1MjksImV4cCI6MjA5MjAxNDUyOX0.Qnn4MbtfApJ8sVwkpXNqNoHCBcGymS2U04kRLIVRta0';

// Globalna instancja
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'gmp-crm-auth',
  },
});

// Helper do zapytań
window.db = window.supabaseClient;

// Toast system
window.toast = (function() {
  function show(msg, type = 'info', duration = 3500) {
    const colors = {
      success: 'bg-emerald-900/80 border-emerald-700 text-emerald-100',
      error: 'bg-red-900/80 border-red-700 text-red-100',
      warning: 'bg-amber-900/80 border-amber-700 text-amber-100',
      info: 'bg-zinc-900/90 border-zinc-700 text-zinc-100',
    };
    const icons = {
      success: 'ph-check-circle',
      error: 'ph-x-circle',
      warning: 'ph-warning',
      info: 'ph-info',
    };
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `${colors[type]} border rounded-lg px-4 py-3 flex items-start gap-3 backdrop-blur-md shadow-xl animate-enter`;
    t.innerHTML = `
      <i class="ph ${icons[type]} text-xl flex-shrink-0 mt-0.5"></i>
      <div class="flex-1 text-sm">${msg}</div>
      <button class="text-current opacity-60 hover:opacity-100" onclick="this.parentElement.remove()">
        <i class="ph ph-x"></i>
      </button>
    `;
    container.appendChild(t);
    setTimeout(() => t.remove(), duration);
  }
  return {
    success: (msg, d) => show(msg, 'success', d),
    error: (msg, d) => show(msg, 'error', d ?? 6000),
    warning: (msg, d) => show(msg, 'warning', d),
    info: (msg, d) => show(msg, 'info', d),
  };
})();

// Format helpers
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
  money: (n) => {
    if (n == null || n === '') return '—';
    const v = Number(n);
    if (isNaN(v)) return n;
    return v.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 2 });
  },
  num: (n) => {
    if (n == null) return '—';
    return Number(n).toLocaleString('pl-PL');
  },
  daysAgo: (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    const days = Math.floor((Date.now() - dt.getTime()) / 86400000);
    if (days === 0) return 'dziś';
    if (days === 1) return 'wczoraj';
    if (days < 7) return `${days} dni temu`;
    if (days < 30) return `${Math.floor(days/7)} tyg. temu`;
    if (days < 365) return `${Math.floor(days/30)} mies. temu`;
    return `${Math.floor(days/365)} lat temu`;
  },
};

// CSV export helper
// columns: array of [header, valueFn(row)] pairs
window.exportCsv = function(filename, rows, columns) {
  if (!rows?.length) { toast.warning('Brak danych do eksportu'); return; }
  const headers = columns.map(c => c[0]);
  const data = rows.map(r => columns.map(c => {
    const v = typeof c[1] === 'function' ? c[1](r) : r[c[1]];
    return v == null ? '' : String(v);
  }));
  const csv = [headers, ...data]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Pobrano ${rows.length} wierszy`);
};

// Escape HTML dla bezpiecznego renderowania user-content
window.esc = function(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Pokaz error toast dla bledow Supabase
window.handleError = function(err, context = '') {
  console.error(context, err);
  const msg = err?.message || err?.error_description || err?.details || String(err);
  toast.error(`${context ? context + ': ' : ''}${msg}`);
};
