// Saved views - pasek zapisanych filtrów per strona+user
// Usage:
//   gmpSavedViews.init({
//     page: 'cases',
//     container: document.getElementById('saved-views-bar'),
//     getCurrentFilters: () => ({ status: '...', stage: '...', ... }),
//     applyFilters: (filters) => { ... set inputs + reload ... },
//   });

(function() {
    function init(opts) {
        const { page, container, getCurrentFilters, applyFilters } = opts;
        let views = [];
        let activeId = null;

        async function load() {
            const { data } = await db.from('gmp_saved_views')
                .select('*').eq('page', page).order('sort_order').order('name');
            views = data || [];
            render();
        }

        function render() {
            const chips = views.map(v => `
                <button class="sv-chip ${activeId === v.id ? 'active' : ''}" data-id="${v.id}" title="${esc(v.is_shared ? 'Udostępnione' : 'Moje')}">
                    ${v.icon ? `<i class="ph ${esc(v.icon)}" style="color: ${v.color || 'currentColor'}"></i>` : ''}
                    <span>${esc(v.name)}</span>
                    ${v.is_shared ? '<i class="ph ph-users" style="font-size: 10px; opacity: 0.6"></i>' : ''}
                </button>
            `).join('');

            container.innerHTML = `
                <div class="sv-bar">
                    <span class="sv-label"><i class="ph ph-bookmark"></i> Widoki:</span>
                    <div class="sv-chips">
                        <button class="sv-chip ${!activeId ? 'active' : ''}" data-id="">Wszystkie</button>
                        ${chips}
                    </div>
                    <button class="sv-add" id="sv-save-btn" title="Zapisz obecne filtry"><i class="ph ph-plus"></i> Zapisz widok</button>
                </div>`;

            container.querySelectorAll('.sv-chip').forEach(btn => btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                if (id === activeId) return;
                activeId = id || null;
                if (!id) {
                    applyFilters({});  // clear
                } else {
                    const v = views.find(x => x.id === id);
                    if (v) applyFilters(v.filters || {});
                }
                render();
            }));

            container.querySelector('#sv-save-btn').addEventListener('click', openSaveDialog);

            // Context menu na chipach — usuwanie/edycja
            container.querySelectorAll('.sv-chip[data-id]:not([data-id=""])').forEach(btn => {
                btn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    const id = btn.dataset.id;
                    if (confirm('Usunąć ten zapisany widok?')) remove(id);
                });
            });
        }

        function openSaveDialog() {
            const filters = getCurrentFilters();
            const filtersPreview = Object.entries(filters)
                .filter(([_, v]) => v !== '' && v !== null && v !== undefined && (!Array.isArray(v) || v.length))
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(',') : v}`)
                .join(' · ') || 'brak aktywnych filtrów';

            const html = `
                <div class="modal-backdrop" id="sv-modal-bd" onclick="if(event.target===this) this.remove()">
                    <div class="modal-content" style="max-width: 480px">
                        <div class="modal-header">
                            <span>Zapisz widok</span>
                            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('sv-modal-bd').remove()"><i class="ph ph-x"></i></button>
                        </div>
                        <div class="modal-body space-y-3">
                            <div>
                                <label class="text-xs muted block mb-1">Nazwa</label>
                                <input id="sv-name" class="filter-input w-full" placeholder="np. Moje HOT leady" autofocus>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="text-xs muted block mb-1">Ikona (opcj.)</label>
                                    <select id="sv-icon" class="filter-input w-full">
                                        <option value="">— brak —</option>
                                        <option value="ph-fire">🔥 ph-fire</option>
                                        <option value="ph-star">⭐ ph-star</option>
                                        <option value="ph-check-circle">✓ ph-check-circle</option>
                                        <option value="ph-warning">⚠ ph-warning</option>
                                        <option value="ph-clock-countdown">⏱ ph-clock-countdown</option>
                                        <option value="ph-briefcase">💼 ph-briefcase</option>
                                        <option value="ph-users">👥 ph-users</option>
                                        <option value="ph-bookmark-simple">📑 ph-bookmark-simple</option>
                                    </select>
                                </div>
                                <div class="flex items-end">
                                    <label class="flex items-center gap-2 text-sm">
                                        <input type="checkbox" id="sv-shared"> Udostępnij zespołowi
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label class="text-xs muted block mb-1">Zapisywane filtry</label>
                                <div class="text-xs p-2 rounded" style="background: var(--bg-subtle); color: var(--text-secondary); font-family: 'JetBrains Mono', mono">${esc(filtersPreview)}</div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-ghost" onclick="document.getElementById('sv-modal-bd').remove()">Anuluj</button>
                            <button class="btn btn-primary" id="sv-save-ok">Zapisz</button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', html);
            document.getElementById('sv-name').focus();
            document.getElementById('sv-save-ok').addEventListener('click', async () => {
                const name = document.getElementById('sv-name').value.trim();
                if (!name) { toast.warning('Podaj nazwę'); return; }
                await save({
                    name,
                    icon: document.getElementById('sv-icon').value || null,
                    is_shared: document.getElementById('sv-shared').checked,
                    filters,
                });
                document.getElementById('sv-modal-bd').remove();
            });
        }

        async function save(view) {
            const { error } = await db.from('gmp_saved_views').insert({
                page,
                owner_id: window.currentStaff?.id,
                ...view,
            });
            if (error) { toast.error(error.message); return; }
            toast.success('Zapisano widok');
            await load();
        }

        async function remove(id) {
            const { error } = await db.from('gmp_saved_views').delete().eq('id', id);
            if (error) { toast.error(error.message); return; }
            toast.success('Usunięto');
            if (activeId === id) { activeId = null; applyFilters({}); }
            await load();
        }

        load();
        return { reload: load, setActive: (id) => { activeId = id; render(); } };
    }

    window.gmpSavedViews = { init };
})();
