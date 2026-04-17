// Global search, FAB, keyboard shortcuts
// Uzycie: <script src="components/shortcuts.js"></script>

(function() {
    // CSS - wstrzyk
    const style = document.createElement('style');
    style.textContent = `
        .gs-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(6px); z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding-top: 10vh; }
        .gs-modal { width: 100%; max-width: 640px; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; box-shadow: 0 24px 80px rgba(0,0,0,0.6); overflow: hidden; }
        .gs-input-wrap { padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 10px; }
        .gs-input-wrap i { color: #71717a; font-size: 18px; }
        .gs-input { flex: 1; background: transparent; border: none; outline: none; color: #fff; font-size: 15px; font-family: Inter, sans-serif; }
        .gs-hint { font-size: 10px; color: #52525b; text-transform: uppercase; letter-spacing: 0.05em; }
        .gs-kbd { display: inline-block; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; padding: 2px 6px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #a1a1aa; }
        .gs-results { max-height: 60vh; overflow-y: auto; }
        .gs-section { padding: 8px 18px 4px; font-size: 10px; color: #52525b; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
        .gs-item { padding: 10px 18px; border-top: 1px solid rgba(255,255,255,0.03); cursor: pointer; display: flex; align-items: center; gap: 12px; transition: background 0.1s; }
        .gs-item:hover, .gs-item.active { background: rgba(255,255,255,0.05); }
        .gs-item i { font-size: 16px; color: #71717a; }
        .gs-item-main { flex: 1; min-width: 0; }
        .gs-item-title { font-size: 14px; color: #fff; }
        .gs-item-sub { font-size: 11px; color: #71717a; }
        .gs-empty { padding: 40px 18px; text-align: center; color: #52525b; font-size: 13px; }

        /* FAB */
        .gs-fab { position: fixed; bottom: 24px; right: 24px; width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border: none; color: white; font-size: 20px; cursor: pointer; box-shadow: 0 8px 24px rgba(59,130,246,0.4); z-index: 30; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .gs-fab:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 12px 32px rgba(59,130,246,0.5); }
        .gs-fab-menu { position: fixed; bottom: 80px; right: 24px; display: flex; flex-direction: column; gap: 8px; z-index: 30; }
        .gs-fab-item { display: flex; align-items: center; gap: 10px; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 8px 14px; color: #e5e5e5; font-size: 13px; cursor: pointer; transition: all 0.15s; text-decoration: none; }
        .gs-fab-item:hover { background: #1a1a1a; border-color: rgba(255,255,255,0.25); transform: translateX(-4px); }
        .gs-fab-item i { font-size: 16px; }

        /* Help modal */
        .gs-help-content { padding: 20px 24px; }
        .gs-help-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .gs-help-row:last-child { border: none; }

        @media (max-width: 768px) {
            .gs-modal { max-width: calc(100% - 20px); }
            .gs-fab { bottom: 16px; right: 16px; }
        }
    `;
    document.head.appendChild(style);

    // ========== GLOBAL SEARCH ==========
    let searchModal = null;
    let searchResults = [];
    let activeIdx = 0;

    async function openSearch() {
        if (searchModal) return;
        searchModal = document.createElement('div');
        searchModal.className = 'gs-backdrop';
        searchModal.innerHTML = `
            <div class="gs-modal">
                <div class="gs-input-wrap">
                    <i class="ph ph-magnifying-glass"></i>
                    <input type="text" class="gs-input" id="gs-q" placeholder="Szukaj: klient, sprawa, pracodawca, nr sprawy..." autocomplete="off">
                    <span class="gs-kbd">ESC</span>
                </div>
                <div class="gs-results" id="gs-results">
                    <div class="gs-empty">
                        Zacznij wpisywać aby szukać.<br>
                        <span class="text-xs text-zinc-600 mt-2 block">Nazwisko, imię, numer sprawy, znak sprawy, nazwa firmy, NIP, telefon, email</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(searchModal);

        const input = document.getElementById('gs-q');
        input.focus();

        searchModal.addEventListener('click', e => { if (e.target === searchModal) closeSearch(); });
        input.addEventListener('input', (e) => { doSearch(e.target.value); });
        input.addEventListener('keydown', handleKeyNav);
    }

    function closeSearch() {
        if (searchModal) { searchModal.remove(); searchModal = null; searchResults = []; activeIdx = 0; }
    }

    let searchTimer;
    function doSearch(q) {
        clearTimeout(searchTimer);
        if (q.length < 2) {
            document.getElementById('gs-results').innerHTML = '<div class="gs-empty">Wpisz min. 2 znaki</div>';
            return;
        }
        searchTimer = setTimeout(() => executeSearch(q), 200);
    }

    async function executeSearch(q) {
        const el = document.getElementById('gs-results');
        el.innerHTML = '<div class="gs-empty"><div class="spinner" style="margin: 0 auto"></div></div>';
        const s = `%${q}%`;

        const [clientsRes, casesRes, employersRes] = await Promise.all([
            db.from('gmp_clients').select('id, last_name, first_name, birth_date, phone, nationality, gmp_employers(name)').or(`last_name.ilike.${s},first_name.ilike.${s},phone.ilike.${s},email.ilike.${s}`).limit(10),
            db.from('gmp_cases').select('id, case_number, znak_sprawy, status, stage, case_type, gmp_clients(last_name, first_name)').or(`case_number.ilike.${s},znak_sprawy.ilike.${s}`).limit(10),
            db.from('gmp_employers').select('id, name, nip, contact_person').or(`name.ilike.${s},nip.ilike.${s}`).limit(10),
        ]);

        const results = [];
        (clientsRes.data || []).forEach(c => {
            results.push({
                type: 'client',
                icon: 'ph-user',
                title: `${c.last_name} ${c.first_name}`,
                sub: `${c.birth_date ? 'ur. ' + c.birth_date : ''}${c.phone ? ' • tel: ' + c.phone : ''}${c.gmp_employers ? ' • ' + c.gmp_employers.name : ''}${c.nationality ? ' • ' + c.nationality : ''}`,
                href: `clients.html?id=${c.id}`,
            });
        });
        (casesRes.data || []).forEach(c => {
            const client = c.gmp_clients ? `${c.gmp_clients.last_name} ${c.gmp_clients.first_name}` : '(brak klienta)';
            results.push({
                type: 'case',
                icon: 'ph-folder',
                title: `Sprawa #${c.case_number || c.id.slice(0,8)}`,
                sub: `${client} • ${c.case_type || '—'} • ${c.status} ${c.znak_sprawy ? '• ' + c.znak_sprawy : ''}`,
                href: `case.html?id=${c.id}`,
            });
        });
        (employersRes.data || []).forEach(e => {
            results.push({
                type: 'employer',
                icon: 'ph-buildings',
                title: e.name,
                sub: `${e.nip ? 'NIP: ' + e.nip : ''}${e.contact_person ? ' • ' + e.contact_person : ''}`,
                href: `employers.html?id=${e.id}`,
            });
        });

        // Extra: sprawy gdzie klient matches
        if ((clientsRes.data || []).length) {
            const clientIds = clientsRes.data.map(c => c.id);
            const { data: extraCases } = await db.from('gmp_cases').select('id, case_number, status, case_type, gmp_clients(last_name, first_name)').in('client_id', clientIds).limit(15);
            (extraCases || []).forEach(c => {
                if (!results.find(r => r.type === 'case' && r.href === `case.html?id=${c.id}`)) {
                    const client = c.gmp_clients ? `${c.gmp_clients.last_name} ${c.gmp_clients.first_name}` : '';
                    results.push({
                        type: 'case',
                        icon: 'ph-folder',
                        title: `Sprawa ${client}`,
                        sub: `#${c.case_number || c.id.slice(0,8)} • ${c.case_type || '—'} • ${c.status}`,
                        href: `case.html?id=${c.id}`,
                    });
                }
            });
        }

        searchResults = results;
        activeIdx = 0;
        renderResults();
    }

    function renderResults() {
        const el = document.getElementById('gs-results');
        if (!searchResults.length) { el.innerHTML = '<div class="gs-empty">Brak wyników</div>'; return; }

        const grouped = { client: [], case: [], employer: [] };
        searchResults.forEach((r, i) => { r._i = i; grouped[r.type].push(r); });
        const labels = { client: 'Klienci', case: 'Sprawy', employer: 'Pracodawcy' };

        let html = '';
        ['client', 'case', 'employer'].forEach(type => {
            if (grouped[type].length) {
                html += `<div class="gs-section">${labels[type]}</div>`;
                grouped[type].forEach(r => {
                    html += `<div class="gs-item ${r._i === activeIdx ? 'active' : ''}" data-idx="${r._i}" onclick="window.location.href='${r.href}'">
                        <i class="ph ${r.icon}"></i>
                        <div class="gs-item-main">
                            <div class="gs-item-title">${esc(r.title)}</div>
                            <div class="gs-item-sub">${esc(r.sub || '')}</div>
                        </div>
                    </div>`;
                });
            }
        });
        el.innerHTML = html;
    }

    function handleKeyNav(e) {
        if (e.key === 'Escape') { closeSearch(); return; }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIdx = Math.min(searchResults.length - 1, activeIdx + 1);
            renderResults();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIdx = Math.max(0, activeIdx - 1);
            renderResults();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (searchResults[activeIdx]) window.location.href = searchResults[activeIdx].href;
        }
    }

    // ========== FAB (Quick Add) ==========
    let fabMenu = null;

    function createFab() {
        const fab = document.createElement('button');
        fab.className = 'gs-fab';
        fab.id = 'gs-fab';
        fab.innerHTML = '<i class="ph ph-plus" style="font-weight: 700"></i>';
        fab.title = 'Szybkie akcje';
        fab.addEventListener('click', toggleFabMenu);
        document.body.appendChild(fab);
    }

    function toggleFabMenu() {
        if (fabMenu) { fabMenu.remove(); fabMenu = null; return; }
        fabMenu = document.createElement('div');
        fabMenu.className = 'gs-fab-menu';
        const items = [
            { icon: 'ph-folder-plus', label: 'Nowa sprawa', onclick: () => window.location.href = 'cases.html?new=1' },
            { icon: 'ph-user-plus', label: 'Nowy klient', onclick: () => goClientModal() },
            { icon: 'ph-buildings', label: 'Nowy pracodawca', onclick: () => goEmployerModal() },
            { icon: 'ph-receipt', label: 'Nowa faktura', onclick: () => window.location.href = 'invoices.html' },
            { icon: 'ph-magnifying-glass', label: 'Szukaj (Ctrl+K)', onclick: () => { closeFabMenu(); openSearch(); } },
        ];
        fabMenu.innerHTML = items.map((it, i) => `
            <div class="gs-fab-item" data-idx="${i}">
                <i class="ph ${it.icon}"></i>
                <span>${it.label}</span>
            </div>
        `).join('');
        document.body.appendChild(fabMenu);
        fabMenu.querySelectorAll('.gs-fab-item').forEach((el, i) => el.addEventListener('click', () => {
            items[i].onclick();
            closeFabMenu();
        }));
        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', closeFabMenuOnOutside, { once: true });
        }, 100);
    }
    function closeFabMenu() { if (fabMenu) { fabMenu.remove(); fabMenu = null; } }
    function closeFabMenuOnOutside(e) {
        if (!fabMenu) return;
        if (!fabMenu.contains(e.target) && e.target.id !== 'gs-fab' && !e.target.closest('#gs-fab')) closeFabMenu();
    }

    function goClientModal() {
        if (typeof gmpModal !== 'undefined') gmpModal.editClient(null, (c) => { if (c) window.location.href = 'clients.html?id=' + c.id; });
        else window.location.href = 'clients.html';
    }
    function goEmployerModal() {
        if (typeof gmpModal !== 'undefined') gmpModal.editEmployer(null, (e) => { if (e) window.location.href = 'employers.html?id=' + e.id; });
        else window.location.href = 'employers.html';
    }

    // ========== HELP MODAL ==========
    function openHelp() {
        const modal = document.createElement('div');
        modal.className = 'gs-backdrop';
        modal.innerHTML = `
            <div class="gs-modal">
                <div class="gs-input-wrap">
                    <i class="ph ph-keyboard"></i>
                    <div style="flex: 1"><div style="color: white; font-weight: 600;">Skróty klawiszowe</div></div>
                    <span class="gs-kbd">ESC</span>
                </div>
                <div class="gs-help-content">
                    <div class="gs-help-row"><span>Otwórz szukanie</span><span><span class="gs-kbd">Ctrl</span> + <span class="gs-kbd">K</span></span></div>
                    <div class="gs-help-row"><span>Otwórz szukanie (alt.)</span><span><span class="gs-kbd">/</span></span></div>
                    <div class="gs-help-row"><span>Nowa sprawa</span><span><span class="gs-kbd">N</span></span></div>
                    <div class="gs-help-row"><span>Dashboard</span><span><span class="gs-kbd">G</span> <span class="gs-kbd">D</span></span></div>
                    <div class="gs-help-row"><span>Sprawy</span><span><span class="gs-kbd">G</span> <span class="gs-kbd">S</span></span></div>
                    <div class="gs-help-row"><span>Klienci</span><span><span class="gs-kbd">G</span> <span class="gs-kbd">K</span></span></div>
                    <div class="gs-help-row"><span>Kalendarz</span><span><span class="gs-kbd">G</span> <span class="gs-kbd">C</span></span></div>
                    <div class="gs-help-row"><span>Alerty</span><span><span class="gs-kbd">G</span> <span class="gs-kbd">A</span></span></div>
                    <div class="gs-help-row"><span>Zapisz w karcie sprawy</span><span><span class="gs-kbd">Ctrl</span> + <span class="gs-kbd">S</span></span></div>
                    <div class="gs-help-row"><span>Pomoc</span><span><span class="gs-kbd">?</span></span></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.addEventListener('keydown', function closer(ev) {
            if (ev.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', closer); }
        });
    }

    // ========== KEYBOARD SHORTCUTS ==========
    let goSequence = null;
    let goTimeout;
    function handleGlobalKey(e) {
        // Nie przeszkadzaj w inputach
        const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;

        // Ctrl/Cmd+K zawsze
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openSearch();
            return;
        }

        // Escape - zamknij wszystko
        if (e.key === 'Escape') {
            if (searchModal) closeSearch();
            if (fabMenu) closeFabMenu();
            return;
        }

        if (inInput) return;

        // Single-key shortcuts
        if (e.key === '/') { e.preventDefault(); openSearch(); return; }
        if (e.key === '?') { openHelp(); return; }
        if (e.key === 'n' || e.key === 'N') { window.location.href = 'cases.html?new=1'; return; }

        // Sequential: G + letter
        if (e.key === 'g' || e.key === 'G') {
            goSequence = 'g';
            clearTimeout(goTimeout);
            goTimeout = setTimeout(() => goSequence = null, 1000);
            return;
        }
        if (goSequence === 'g') {
            const routes = { d: 'dashboard.html', s: 'cases.html', k: 'clients.html', c: 'appointments.html', a: 'alerts.html', p: 'payments.html', t: 'tasks.html', e: 'employers.html', i: 'invoices.html', z: 'analytics.html', w: 'templates.html', l: 'staff.html', u: 'submissions.html' };
            const target = routes[e.key.toLowerCase()];
            if (target) {
                e.preventDefault();
                window.location.href = target;
            }
            goSequence = null;
        }
    }

    // ========== INIT ==========
    document.addEventListener('keydown', handleGlobalKey);
    document.addEventListener('DOMContentLoaded', () => {
        // FAB tylko na zalogowanych stronach (nie na index.html)
        if (!document.getElementById('sidebar-placeholder') && !document.getElementById('main-sidebar')) return;
        createFab();
    });

    // Export API
    window.gmpSearch = { open: openSearch, close: closeSearch, help: openHelp };
})();
