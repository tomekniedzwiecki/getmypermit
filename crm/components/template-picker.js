// Template picker - dropdown do szybkiego wstawiania szablonów notatek/emaili
// Usage:
//   gmpTemplatePicker.attach(buttonEl, {
//     category: 'note' | 'email' | 'sms' | 'whatsapp',
//     context: { klient: 'Jan Kowalski', nr_sprawy: '26/0232', ... },
//     onPick: (filledBody, filledSubject) => { ... }
//   });

(function() {
    let cache = null;
    async function loadTemplates() {
        if (cache) return cache;
        const { data } = await db.from('gmp_note_templates')
            .select('id, name, category, subject_template, body_template, description')
            .order('sort_order').order('name');
        cache = data || [];
        return cache;
    }

    function fillPlaceholders(template, context) {
        if (!template) return '';
        let out = template;
        Object.entries(context || {}).forEach(([key, value]) => {
            const re = new RegExp(`\\{${key}\\}`, 'g');
            out = out.replace(re, value || `{${key}}`);
        });
        return out;
    }

    function attach(buttonEl, opts) {
        buttonEl.addEventListener('click', async (e) => {
            e.preventDefault(); e.stopPropagation();
            await open(buttonEl, opts);
        });
    }

    async function open(anchorEl, opts) {
        const { category, context = {}, onPick, multiCategory = false } = opts;
        closeAll();

        const all = await loadTemplates();
        const templates = multiCategory
            ? all
            : (category ? all.filter(t => t.category === category) : all);

        const picker = document.createElement('div');
        picker.className = 'tpl-picker';
        picker.innerHTML = `
            <input type="text" class="tpl-search" placeholder="Szukaj szablonu..." autofocus>
            <div class="tpl-options">
                ${templates.map(t => `<div class="tpl-option" data-id="${t.id}">
                    <div class="tpl-ic"><i class="ph ${t.category === 'email' ? 'ph-envelope' : t.category === 'sms' ? 'ph-chat' : t.category === 'whatsapp' ? 'ph-whatsapp-logo' : 'ph-note'}"></i></div>
                    <div class="tpl-body">
                        <div class="tpl-name">${esc(t.name)}</div>
                        ${t.description ? `<div class="tpl-desc">${esc(t.description)}</div>` : ''}
                    </div>
                    <span class="tpl-cat">${esc(t.category)}</span>
                </div>`).join('')}
                ${templates.length === 0 ? '<div class="tpl-empty">Brak szablonów w kategorii</div>' : ''}
            </div>
            <div class="tpl-footer">
                <span class="text-xs text-zinc-500">Placeholdery: ${Object.keys(context).map(k => `{${k}}`).join(', ') || 'brak'}</span>
            </div>`;

        const rect = anchorEl.getBoundingClientRect();
        picker.style.top = (rect.bottom + window.scrollY + 4) + 'px';
        picker.style.left = (rect.left + window.scrollX) + 'px';
        document.body.appendChild(picker);

        const searchEl = picker.querySelector('.tpl-search');
        searchEl.focus();
        searchEl.addEventListener('input', () => {
            const q = searchEl.value.toLowerCase();
            picker.querySelectorAll('.tpl-option').forEach(opt => {
                const name = opt.querySelector('.tpl-name').textContent.toLowerCase();
                const desc = opt.querySelector('.tpl-desc')?.textContent.toLowerCase() || '';
                opt.style.display = (name.includes(q) || desc.includes(q)) ? '' : 'none';
            });
        });

        picker.querySelectorAll('.tpl-option').forEach(opt => opt.addEventListener('click', () => {
            const tpl = templates.find(t => t.id === opt.dataset.id);
            if (!tpl) return;
            const filledBody = fillPlaceholders(tpl.body_template, context);
            const filledSubject = fillPlaceholders(tpl.subject_template, context);
            onPick(filledBody, filledSubject, tpl);
            closeAll();
        }));

        const outside = (e) => { if (!picker.contains(e.target)) closeAll(); else document.addEventListener('click', outside, { once: true }); };
        setTimeout(() => document.addEventListener('click', outside, { once: true }), 10);
        const esc2 = (e) => { if (e.key === 'Escape') closeAll(); };
        document.addEventListener('keydown', esc2);

        window._tplPicker = { picker, esc: esc2 };
    }

    function closeAll() {
        if (window._tplPicker) {
            window._tplPicker.picker.remove();
            document.removeEventListener('keydown', window._tplPicker.esc);
            delete window._tplPicker;
        }
    }

    window.gmpTemplatePicker = { attach, open, fillPlaceholders, reload: () => { cache = null; return loadTemplates(); } };
})();
