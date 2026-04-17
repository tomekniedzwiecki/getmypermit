// Theme toggle - dark / light
(function() {
    const KEY = 'gmp-theme';
    const apply = (theme) => {
        document.documentElement.dataset.theme = theme;
        const icon = document.getElementById('theme-icon');
        if (icon) icon.className = 'ph ' + (theme === 'light' ? 'ph-sun' : 'ph-moon');
    };
    const saved = localStorage.getItem(KEY) || 'dark';
    apply(saved);

    // CSS dla jasnego motywu
    const style = document.createElement('style');
    style.textContent = `
        [data-theme="light"] {
            color-scheme: light;
        }
        [data-theme="light"] body { background: #fafafa !important; color: #18181b !important; }
        [data-theme="light"] .card { background: white !important; border-color: rgba(0,0,0,0.08) !important; }
        [data-theme="light"] .card:hover { border-color: rgba(0,0,0,0.15) !important; }
        [data-theme="light"] aside#main-sidebar { background: white !important; border-color: rgba(0,0,0,0.08) !important; }
        [data-theme="light"] .sidebar-link { color: #52525b !important; }
        [data-theme="light"] .sidebar-link:hover { background: rgba(0,0,0,0.04) !important; color: #18181b !important; }
        [data-theme="light"] .sidebar-link.active { background: rgba(0,0,0,0.08) !important; color: #18181b !important; }
        [data-theme="light"] .gmp-table thead th { background: #fafafa !important; color: #71717a !important; border-color: rgba(0,0,0,0.06) !important; }
        [data-theme="light"] .gmp-table tbody tr { border-color: rgba(0,0,0,0.04) !important; }
        [data-theme="light"] .gmp-table tbody tr:hover { background: rgba(0,0,0,0.02) !important; }
        [data-theme="light"] .input, [data-theme="light"] .filter-input { background: #fafafa !important; border-color: rgba(0,0,0,0.1) !important; color: #18181b !important; }
        [data-theme="light"] .input:focus, [data-theme="light"] .filter-input:focus { background: white !important; border-color: rgba(0,0,0,0.25) !important; }
        [data-theme="light"] .btn-primary { background: #18181b !important; color: white !important; }
        [data-theme="light"] .btn-secondary { background: white !important; border-color: rgba(0,0,0,0.1) !important; color: #18181b !important; }
        [data-theme="light"] .btn-secondary:hover { background: #fafafa !important; }
        [data-theme="light"] .btn-ghost { color: #52525b !important; }
        [data-theme="light"] .btn-ghost:hover { background: rgba(0,0,0,0.04) !important; color: #18181b !important; }
        [data-theme="light"] .card-header { border-color: rgba(0,0,0,0.06) !important; }
        [data-theme="light"] .divider { border-color: rgba(0,0,0,0.08) !important; }
        [data-theme="light"] .text-white { color: #18181b !important; }
        [data-theme="light"] .text-zinc-200, [data-theme="light"] .text-zinc-300 { color: #3f3f46 !important; }
        [data-theme="light"] .text-zinc-400 { color: #52525b !important; }
        [data-theme="light"] .text-zinc-500 { color: #71717a !important; }
        [data-theme="light"] .text-zinc-600 { color: #a1a1aa !important; }
        [data-theme="light"] .modal-content { background: white !important; border-color: rgba(0,0,0,0.1) !important; }
        [data-theme="light"] .bg-zinc-900, [data-theme="light"] .bg-zinc-950 { background: #fafafa !important; }
    `;
    document.head.appendChild(style);

    window.gmpTheme = {
        toggle: () => {
            const cur = localStorage.getItem(KEY) || 'dark';
            const next = cur === 'dark' ? 'light' : 'dark';
            localStorage.setItem(KEY, next);
            apply(next);
        },
        set: (t) => { localStorage.setItem(KEY, t); apply(t); },
        get: () => localStorage.getItem(KEY) || 'dark',
    };
})();
