// Inline edit component - turns a cell into a clickable editor.
// Usage:
//   gmpInlineEdit.attach(cellEl, {
//     value: 'aktywna',
//     options: [{value: 'lead', label: 'Lead', className: 'badge-lead'}, ...],
//     display: (v, opt) => `<span class="badge ${opt.className}">${opt.label}</span>`,
//     onSave: async (newValue) => { ... } // throws on error
//   });

(function() {
    let openEditor = null;

    function closeOpen() {
        if (openEditor) {
            openEditor.el.innerHTML = openEditor.originalHTML;
            openEditor = null;
        }
    }

    function attach(cell, opts) {
        if (!cell) return;
        const { value, options, display, onSave, placeholder = '— wybierz —' } = opts;

        cell.classList.add('inline-editable');
        cell.style.cursor = 'pointer';
        cell.title = 'Kliknij aby edytować';

        const handler = async (e) => {
            e.stopPropagation();
            if (openEditor) closeOpen();

            const originalHTML = cell.innerHTML;
            openEditor = { el: cell, originalHTML };

            const currentOpt = options.find(o => o.value === value) || { label: value || '' };

            cell.innerHTML = `<div class="inline-edit-wrap">
                <select class="inline-edit-select">
                    ${placeholder ? `<option value="">${esc(placeholder)}</option>` : ''}
                    ${options.map(o => `<option value="${esc(o.value)}" ${o.value === value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
                </select>
                <button class="inline-edit-cancel" type="button"><i class="ph ph-x"></i></button>
            </div>`;

            const sel = cell.querySelector('select');
            const cancel = cell.querySelector('.inline-edit-cancel');

            sel.focus();
            sel.addEventListener('click', (ev) => ev.stopPropagation());
            cancel.addEventListener('click', (ev) => {
                ev.stopPropagation();
                closeOpen();
            });

            sel.addEventListener('change', async (ev) => {
                ev.stopPropagation();
                const newVal = sel.value;
                if (newVal === value) { closeOpen(); return; }

                cell.innerHTML = '<span class="inline-edit-loading"><span class="spinner"></span> Zapisuję...</span>';
                try {
                    await onSave(newVal);
                    const newOpt = options.find(o => o.value === newVal);
                    const newDisplay = display ? display(newVal, newOpt) : esc(newOpt?.label || newVal);
                    cell.innerHTML = newDisplay;
                    // Re-attach for subsequent edits
                    gmpInlineEdit.attach(cell, { ...opts, value: newVal });
                    openEditor = null;
                    if (window.toast) toast.success('Zapisano');
                } catch (err) {
                    cell.innerHTML = originalHTML;
                    if (window.toast) toast.error(err.message || String(err));
                    openEditor = null;
                }
            });

            // Close on outside click / Esc
            const outside = (ev) => {
                if (!cell.contains(ev.target)) closeOpen();
                else document.addEventListener('click', outside, { once: true });
            };
            setTimeout(() => document.addEventListener('click', outside, { once: true }), 10);

            const esc = (ev) => {
                if (ev.key === 'Escape') { closeOpen(); document.removeEventListener('keydown', esc); }
            };
            document.addEventListener('keydown', esc);
        };

        cell.addEventListener('click', handler);
    }

    window.gmpInlineEdit = { attach, close: closeOpen };
})();
