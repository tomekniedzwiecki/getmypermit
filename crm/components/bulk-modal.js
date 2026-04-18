// Reusable bulk actions modal
// Usage:
//   gmpBulk.open({
//     title: 'Przypisz opiekuna',
//     count: 15,
//     fields: [
//       { type: 'select', name: 'assigned_to', label: 'Opiekun', options: [{value: 'uuid', label: 'Anna'}], required: true },
//       { type: 'textarea', name: 'note', label: 'Notatka (opcj.)' },
//     ],
//     confirmLabel: 'Przypisz',
//     onConfirm: async (values) => { ... }
//   });

(function() {
    let container = null;

    function ensureContainer() {
        if (container) return container;
        container = document.createElement('div');
        container.id = 'gmp-bulk-container';
        document.body.appendChild(container);
        return container;
    }

    function close() {
        if (container) container.innerHTML = '';
    }

    function renderField(f) {
        const id = `bulk-f-${f.name}`;
        if (f.type === 'select') {
            const opts = (f.options || []).map(o => typeof o === 'string'
                ? `<option value="${esc(o)}">${esc(o)}</option>`
                : `<option value="${esc(o.value)}">${esc(o.label)}</option>`
            ).join('');
            return `
                <div>
                    <label class="text-xs muted block mb-1">${esc(f.label)}${f.required ? ' <span class="text-red-400">*</span>' : ''}</label>
                    <select id="${id}" data-name="${f.name}" class="filter-input w-full" ${f.required ? 'required' : ''}>
                        ${f.placeholder ? `<option value="">${esc(f.placeholder)}</option>` : ''}
                        ${opts}
                    </select>
                </div>`;
        }
        if (f.type === 'textarea') {
            return `
                <div>
                    <label class="text-xs muted block mb-1">${esc(f.label)}</label>
                    <textarea id="${id}" data-name="${f.name}" class="input w-full" rows="${f.rows || 2}" placeholder="${esc(f.placeholder || '')}"></textarea>
                </div>`;
        }
        if (f.type === 'text' || f.type === 'number' || f.type === 'date') {
            return `
                <div>
                    <label class="text-xs muted block mb-1">${esc(f.label)}${f.required ? ' <span class="text-red-400">*</span>' : ''}</label>
                    <input id="${id}" data-name="${f.name}" type="${f.type}" class="filter-input w-full" placeholder="${esc(f.placeholder || '')}" ${f.required ? 'required' : ''}>
                </div>`;
        }
        if (f.type === 'radio') {
            const opts = (f.options || []).map((o, i) => {
                const val = typeof o === 'string' ? o : o.value;
                const lbl = typeof o === 'string' ? o : o.label;
                const desc = typeof o === 'object' && o.description ? `<div class="text-xs muted mt-0.5">${esc(o.description)}</div>` : '';
                return `
                    <label class="flex items-start gap-2 p-2.5 rounded-md cursor-pointer hover:bg-zinc-900/50 border border-transparent has-[:checked]:border-accent has-[:checked]:bg-accent-subtle" style="border-color: transparent">
                        <input type="radio" name="${f.name}" value="${esc(val)}" data-name="${f.name}" class="bulk-radio" ${i === 0 && f.required ? 'checked' : ''}>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm">${esc(lbl)}</div>
                            ${desc}
                        </div>
                    </label>`;
            }).join('');
            return `
                <div>
                    <label class="text-xs muted block mb-2">${esc(f.label)}</label>
                    <div class="space-y-1">${opts}</div>
                </div>`;
        }
        return '';
    }

    function collectValues(root) {
        const values = {};
        root.querySelectorAll('[data-name]').forEach(el => {
            if (el.type === 'radio') {
                if (el.checked) values[el.dataset.name] = el.value;
            } else {
                values[el.dataset.name] = el.value;
            }
        });
        return values;
    }

    function validate(fields, values) {
        for (const f of fields) {
            if (f.required && !values[f.name]) {
                return `Pole "${f.label}" jest wymagane`;
            }
        }
        return null;
    }

    function open(opts) {
        const { title, count, fields = [], confirmLabel = 'Wykonaj', confirmClass = 'btn-primary', onConfirm, description } = opts;
        ensureContainer();

        const fieldsHTML = fields.map(renderField).join('<div class="h-3"></div>');
        container.innerHTML = `
            <div class="modal-backdrop" id="gmp-bulk-backdrop">
                <div class="modal-content" style="max-width: 500px">
                    <div class="modal-header">
                        <div>
                            <div>${esc(title)}</div>
                            <div class="text-xs muted font-normal mt-0.5">Zmiany obejmą <strong class="text-white">${count}</strong> ${count === 1 ? 'element' : count < 5 ? 'elementy' : 'elementów'}</div>
                        </div>
                        <button class="btn btn-ghost btn-sm" id="gmp-bulk-cancel"><i class="ph ph-x"></i></button>
                    </div>
                    <div class="modal-body">
                        ${description ? `<p class="text-sm text-zinc-400 mb-3">${esc(description)}</p>` : ''}
                        ${fieldsHTML}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" id="gmp-bulk-cancel2">Anuluj</button>
                        <button class="btn ${confirmClass}" id="gmp-bulk-ok">${esc(confirmLabel)}</button>
                    </div>
                </div>
            </div>`;

        const body = container.querySelector('.modal-content');

        container.querySelector('#gmp-bulk-backdrop').addEventListener('click', e => {
            if (e.target.id === 'gmp-bulk-backdrop') close();
        });
        container.querySelector('#gmp-bulk-cancel').addEventListener('click', close);
        container.querySelector('#gmp-bulk-cancel2').addEventListener('click', close);

        const okBtn = container.querySelector('#gmp-bulk-ok');
        okBtn.addEventListener('click', async () => {
            const values = collectValues(body);
            const err = validate(fields, values);
            if (err) { (window.toast ? toast.warning(err) : alert(err)); return; }
            okBtn.disabled = true;
            okBtn.innerHTML = '<span class="spinner mr-2"></span>Pracuję...';
            try {
                await onConfirm(values);
                close();
            } catch (e) {
                (window.toast ? toast.error(e.message || String(e)) : alert(e.message || e));
                okBtn.disabled = false;
                okBtn.innerHTML = esc(confirmLabel);
            }
        });

        // Auto-focus first input
        setTimeout(() => {
            const first = body.querySelector('select, input, textarea');
            if (first) first.focus();
        }, 50);

        // Esc to close
        const escHandler = (e) => {
            if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
        };
        document.addEventListener('keydown', escHandler);
    }

    window.gmpBulk = { open, close };
})();
