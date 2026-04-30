// ============================================================================
// crm/components/checklist-renderer.js
// Etap II-B § II-B.4 — Renderowanie zakładki Checklista
// ============================================================================
// Wywołanie:
//   import { renderChecklist } from './components/checklist-renderer.js';
//   await renderChecklist(caseId, supabase, '#checklist-section');
// ============================================================================

const SECTION_LABELS = {
    'braki_formalne': 'Braki formalne',
    'braki_merytoryczne': 'Braki merytoryczne',
    'dokumenty_wymagane': 'Wymagane dokumenty',
    'obliczenia_srodkow': 'Obliczenia środków',
    'elektroniczne_zlozenie_minimum': 'Minimum dla e-złożenia',
};

const STATUS_ICONS = {
    'pending': { icon: 'ph-square', cls: 'text-zinc-500', label: 'Do zrobienia' },
    'done': { icon: 'ph-check-square-fill', cls: 'text-emerald-400', label: 'Zrobione' },
    'n_a': { icon: 'ph-minus-square', cls: 'text-zinc-600', label: 'Nie dotyczy' },
    'blocked': { icon: 'ph-warning-octagon', cls: 'text-amber-400', label: 'Zablokowane' },
};

let _undoState = null;

export async function loadChecklist(caseId, supabase) {
    const { data, error } = await supabase.from('gmp_case_checklists')
        .select('*')
        .eq('case_id', caseId)
        .order('section')
        .order('sort_order');
    if (error) {
        console.warn('[checklist] load error:', error);
        return [];
    }
    return data || [];
}

export async function updateChecklistItem(itemId, updates, supabase) {
    const { error } = await supabase.from('gmp_case_checklists')
        .update(updates).eq('id', itemId);
    if (error) throw error;
}

export async function instantiateChecklist(caseId, supabase, force = false) {
    const { data, error } = await supabase.rpc('gmp_instantiate_checklist', {
        p_case_id: caseId, p_force: force,
    });
    if (error) throw error;
    return data;
}

export async function renderChecklist(caseId, supabase, targetSelector) {
    const target = document.querySelector(targetSelector);
    if (!target) return;

    target.innerHTML = '<div class="p-4 text-zinc-500 text-sm"><span class="spinner inline-block mr-2"></span>Ładuję checklistę...</div>';

    const items = await loadChecklist(caseId, supabase);
    if (items.length === 0) {
        target.innerHTML = `
            <div class="p-4">
                <p class="text-zinc-500 text-sm mb-3">Brak pozycji w checkliście dla tej sprawy.</p>
                <button class="btn btn-secondary btn-sm" data-action="instantiate-now">
                    <i class="ph ph-magic-wand"></i> Wygeneruj checklistę z kategorii sprawy
                </button>
            </div>
        `;
        target.querySelector('[data-action="instantiate-now"]').addEventListener('click', async (e) => {
            e.target.disabled = true;
            try {
                const inserted = await instantiateChecklist(caseId, supabase);
                if (inserted > 0) {
                    if (window.toast) toast.success(`Dodano ${inserted} pozycji checklist`);
                    await renderChecklist(caseId, supabase, targetSelector);
                } else {
                    if (window.toast) toast.warning('Brak definicji checklist dla tej kategorii sprawy');
                }
            } catch (err) {
                if (window.toast) toast.error('Błąd: ' + err.message);
            }
        });
        return;
    }

    // Group by section
    const sections = {};
    for (const item of items) {
        if (!sections[item.section]) sections[item.section] = [];
        sections[item.section].push(item);
    }

    // Progress overall
    const total = items.length;
    const done = items.filter(i => i.status === 'done').length;
    const na = items.filter(i => i.status === 'n_a').length;
    const effective = total - na;
    const percent = effective > 0 ? Math.round(done / effective * 100) : 0;

    // Render
    let html = `
        <div class="checklist-progress p-3 mb-3 border-b border-zinc-800">
            <div class="flex items-center justify-between mb-2">
                <div class="text-sm">
                    <span class="text-zinc-300 font-semibold">Postęp:</span>
                    <span class="text-emerald-400">${done}/${effective}</span>
                    <span class="text-zinc-500"> (${percent}%)</span>
                    ${na > 0 ? `<span class="text-zinc-500 text-xs ml-2">+ ${na} N/D</span>` : ''}
                </div>
                <div class="flex items-center gap-2">
                    <button class="btn btn-ghost btn-sm" data-action="export-audit" title="Pobierz audyt jako DOCX">
                        <i class="ph ph-file-doc"></i> Pobierz audyt
                    </button>
                </div>
            </div>
            <div class="w-full bg-zinc-800 rounded-full h-2">
                <div class="bg-emerald-500 h-2 rounded-full" style="width: ${percent}%"></div>
            </div>
        </div>
    `;

    for (const [section, secItems] of Object.entries(sections)) {
        const secDone = secItems.filter(i => i.status === 'done').length;
        const secNa = secItems.filter(i => i.status === 'n_a').length;
        const secEff = secItems.length - secNa;

        // Group by parent_label dla zagnieżdżeń
        const byParent = {};
        const topLevel = [];
        for (const it of secItems) {
            if (it.parent_label) {
                if (!byParent[it.parent_label]) byParent[it.parent_label] = [];
                byParent[it.parent_label].push(it);
            } else {
                topLevel.push(it);
            }
        }

        html += `
            <div class="checklist-section mb-4 px-3">
                <h4 class="text-sm font-semibold text-zinc-200 mb-2 flex items-center gap-2">
                    <i class="ph ph-list-checks text-blue-400"></i>
                    ${escapeHtml(SECTION_LABELS[section] || section)}
                    <span class="text-xs text-zinc-500 font-normal">${secDone}/${secEff}</span>
                </h4>
                <div class="checklist-items">
        `;

        for (const it of topLevel) {
            html += renderItem(it);
            // Sub-items pod parentem
            const subs = byParent[it.label] || [];
            for (const sub of subs) {
                html += renderItem(sub, true);
            }
        }

        html += '</div></div>';
    }

    target.innerHTML = html;

    // Event handlers
    target.querySelectorAll('.checklist-item-status').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const itemId = btn.dataset.itemId;
            const item = items.find(i => i.id === itemId);
            if (!item) return;

            // Cykl: pending → done → n_a → blocked → pending
            const cycle = ['pending', 'done', 'n_a', 'blocked'];
            const idx = cycle.indexOf(item.status);
            const newStatus = cycle[(idx + 1) % cycle.length];

            // Save undo
            _undoState = { itemId, oldStatus: item.status, newStatus };

            try {
                await updateChecklistItem(itemId, { status: newStatus }, supabase);
                if (window.toast) {
                    toast.success(`${escapeHtml(item.label)}: ${STATUS_ICONS[newStatus].label}`, 5000);
                }
                showUndoToast(targetSelector, supabase, caseId);
                await renderChecklist(caseId, supabase, targetSelector);
            } catch (err) {
                if (window.toast) toast.error('Błąd: ' + err.message);
            }
        });
    });

    target.querySelectorAll('.checklist-item-notes-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const itemId = btn.dataset.itemId;
            const item = items.find(i => i.id === itemId);
            if (!item) return;
            const newNote = prompt(`Notatka dla "${item.label}":`, item.notes || '');
            if (newNote === null) return;
            try {
                await updateChecklistItem(itemId, { notes: newNote || null }, supabase);
                await renderChecklist(caseId, supabase, targetSelector);
            } catch (err) { if (window.toast) toast.error('Błąd: ' + err.message); }
        });
    });

    const exportBtn = target.querySelector('[data-action="export-audit"]');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            // Wymaga audit_checklist template w gmp_document_templates
            const { data: tpl } = await supabase.from('gmp_document_templates')
                .select('id').eq('kind', 'audit_checklist').eq('is_active', true).maybeSingle();
            if (!tpl) {
                alert('Szablon audit_checklist nie jest jeszcze wgrany. Skontaktuj się z administratorem.');
                return;
            }
            exportBtn.disabled = true;
            const orig = exportBtn.innerHTML;
            exportBtn.innerHTML = '<span class="spinner inline-block mr-1"></span>Generuję...';
            try {
                const { data, error } = await supabase.functions.invoke('generate-document', {
                    body: { case_id: caseId, template_id: tpl.id },
                });
                if (error) throw new Error(error.message);
                if (data?.download_url) {
                    const a = document.createElement('a');
                    a.href = data.download_url;
                    a.download = data.file_name || 'audyt.docx';
                    a.click();
                }
            } catch (err) {
                alert('Błąd: ' + err.message);
            } finally {
                exportBtn.disabled = false;
                exportBtn.innerHTML = orig;
            }
        });
    }
}

function renderItem(item, isSub = false) {
    const ico = STATUS_ICONS[item.status] || STATUS_ICONS['pending'];
    const indent = isSub ? 'pl-8' : '';
    return `
        <div class="checklist-item flex items-start gap-2 py-1 ${indent}" data-item-id="${item.id}">
            <button class="checklist-item-status flex-shrink-0 mt-0.5 ${ico.cls}"
                    data-item-id="${item.id}"
                    title="${ico.label} (kliknij aby zmienić)">
                <i class="ph ${ico.icon} text-lg"></i>
            </button>
            <div class="flex-1 min-w-0">
                <div class="text-sm ${item.status === 'done' ? 'text-zinc-500 line-through' : 'text-zinc-200'}">
                    ${escapeHtml(item.label)}
                    ${!item.is_required ? '<span class="text-xs text-zinc-600 ml-1">(opcjonalne)</span>' : ''}
                </div>
                ${item.helper_text ? `<div class="text-xs text-zinc-500 mt-0.5">${escapeHtml(item.helper_text)}</div>` : ''}
                ${item.notes ? `<div class="text-xs text-amber-300/80 mt-0.5"><i class="ph ph-note-pencil"></i> ${escapeHtml(item.notes)}</div>` : ''}
            </div>
            <button class="checklist-item-notes-btn text-zinc-600 hover:text-zinc-300"
                    data-item-id="${item.id}"
                    title="${item.notes ? 'Edytuj notatkę' : 'Dodaj notatkę'}">
                <i class="ph ${item.notes ? 'ph-note-pencil' : 'ph-note'}"></i>
            </button>
        </div>
    `;
}

function showUndoToast(targetSelector, supabase, caseId) {
    if (!_undoState) return;
    if (!window.toast) return;
    setTimeout(() => { _undoState = null; }, 5000);
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
