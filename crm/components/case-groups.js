// ============================================================================
// crm/components/case-groups.js
// Etap V — sekcja "Grupy" w karcie sprawy: chipy + modal Dodaj/Utwórz grupę
// ============================================================================
// Użycie:
//   import { renderCaseGroups } from './components/case-groups.js';
//   await renderCaseGroups(caseId, supabase, '#case-groups-section');
// ============================================================================

const TYPE_LABELS = {
    pracodawca: 'Pracodawca',
    rodzina: 'Rodzina',
    projekt: 'Projekt',
    rozliczenie_zbiorcze: 'Rozliczenie',
    inna: 'Inna',
};
const TYPE_ICONS = {
    pracodawca: 'ph-buildings',
    rodzina: 'ph-users-three',
    projekt: 'ph-folder-notch',
    rozliczenie_zbiorcze: 'ph-coins',
    inna: 'ph-circle',
};
const TYPE_COLORS = {
    pracodawca: { bg: 'rgba(245,158,11,0.10)', color: '#fbbf24', border: 'rgba(245,158,11,0.28)' },
    rodzina: { bg: 'rgba(236,72,153,0.10)', color: '#f9a8d4', border: 'rgba(236,72,153,0.28)' },
    projekt: { bg: 'rgba(99,102,241,0.10)', color: '#a5b4fc', border: 'rgba(99,102,241,0.28)' },
    rozliczenie_zbiorcze: { bg: 'rgba(16,185,129,0.10)', color: '#6ee7b7', border: 'rgba(16,185,129,0.28)' },
    inna: { bg: 'rgba(161,161,170,0.12)', color: '#d4d4d8', border: 'rgba(161,161,170,0.18)' },
};

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function loadCaseGroups(caseId, supabase) {
    if (!caseId) return [];
    try {
        const { data, error } = await supabase
            .from('gmp_case_group_members')
            .select('role_in_group, group:gmp_case_groups(id, name, type, employer_id, is_active)')
            .eq('case_id', caseId);
        if (error) {
            console.warn('[case-groups] load error:', error);
            return [];
        }
        return (data || []).filter(m => m.group && m.group.is_active);
    } catch (e) {
        console.warn('[case-groups] threw:', e);
        return [];
    }
}

export async function renderCaseGroups(caseId, supabase, targetSelector = '#case-groups-section') {
    const target = document.querySelector(targetSelector);
    if (!target) return;

    const members = await loadCaseGroups(caseId, supabase);

    const chipsHtml = members.length === 0
        ? '<span class="text-zinc-500 text-xs">Sprawa nie należy do żadnej grupy.</span>'
        : members.map(m => {
            const g = m.group;
            const c = TYPE_COLORS[g.type] || TYPE_COLORS.inna;
            const ico = TYPE_ICONS[g.type] || 'ph-circle';
            const role = m.role_in_group ? ` · ${escapeHtml(m.role_in_group)}` : '';
            return `
                <a href="group.html?id=${g.id}" class="case-group-chip"
                   style="background:${c.bg}; color:${c.color}; border-color:${c.border};">
                    <i class="ph ${ico}"></i>
                    <span>${escapeHtml(g.name)}</span>
                    <span class="opacity-70 text-[10px]">${TYPE_LABELS[g.type] || g.type}${role}</span>
                </a>
            `;
        }).join('');

    target.innerHTML = `
        <div class="case-groups-bar">
            <div class="case-groups-chips">${chipsHtml}</div>
            <button class="btn btn-secondary btn-sm" onclick="window.gmp.openAddGroupModal('${caseId}')" title="Dodaj sprawę do grupy lub utwórz nową">
                <i class="ph ph-plus"></i> Dodaj do grupy
            </button>
        </div>
    `;
}

// === MODAL: Dodaj do grupy / Utwórz nową ===

export async function openAddGroupModal(caseId, supabase, onSaved) {
    if (!caseId) return;
    if (!window.openModal) {
        console.warn('[case-groups] window.openModal not available');
        return;
    }

    // Pobierz aktywne grupy do wyboru
    const { data: allGroups, error } = await supabase
        .from('gmp_case_groups')
        .select('id, name, type, employer_id')
        .eq('is_active', true)
        .order('name');

    if (error) {
        window.toast?.error?.('Błąd pobrania grup: ' + error.message);
        return;
    }

    // Pobierz już-przypisane żeby ich nie pokazywać
    const { data: alreadyIn } = await supabase
        .from('gmp_case_group_members')
        .select('group_id')
        .eq('case_id', caseId);
    const alreadySet = new Set((alreadyIn || []).map(m => m.group_id));

    const available = (allGroups || []).filter(g => !alreadySet.has(g.id));

    const optionsHtml = available.length === 0
        ? '<option value="" disabled>Brak dostępnych grup — utwórz nową poniżej</option>'
        : available.map(g => `<option value="${g.id}">${escapeHtml(g.name)} (${TYPE_LABELS[g.type] || g.type})</option>`).join('');

    window.openModal(`
        <div class="modal-card" style="max-width: 520px;">
            <div class="modal-header">
                <h3 class="text-lg font-semibold text-white">Dodaj sprawę do grupy</h3>
                <button onclick="window.closeModal()" class="text-zinc-500 hover:text-white"><i class="ph ph-x"></i></button>
            </div>
            <div class="modal-body p-5 space-y-4">
                <div>
                    <label class="text-xs text-zinc-400 mb-1 block font-medium uppercase tracking-wider">Wybierz istniejącą grupę</label>
                    <select id="add-group-select" class="input w-full">
                        <option value="">— wybierz —</option>
                        ${optionsHtml}
                    </select>
                    <input type="text" id="add-group-role" class="input w-full mt-2" placeholder="Rola w grupie (opcjonalnie, np. mąż, dziecko, pracownik)">
                </div>
                <div class="text-center text-xs text-zinc-600">— LUB —</div>
                <div class="space-y-2 p-3 rounded-lg" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);">
                    <label class="text-xs text-zinc-400 mb-1 block font-medium uppercase tracking-wider">Utwórz nową grupę</label>
                    <input type="text" id="new-group-name" class="input w-full" placeholder="Nazwa grupy">
                    <select id="new-group-type" class="input w-full">
                        <option value="rodzina">Rodzina</option>
                        <option value="pracodawca">Pracodawca</option>
                        <option value="projekt">Projekt</option>
                        <option value="rozliczenie_zbiorcze">Rozliczenie zbiorcze</option>
                        <option value="inna">Inna</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer flex gap-2 justify-end p-4 border-t border-white/5">
                <button class="btn btn-ghost" onclick="window.closeModal()">Anuluj</button>
                <button class="btn btn-primary" onclick="window.gmp._saveAddGroup('${caseId}')">Dodaj</button>
            </div>
        </div>
    `);
}

export async function _saveAddGroup(caseId, supabase, onSaved) {
    const groupSelect = document.getElementById('add-group-select');
    const roleInput = document.getElementById('add-group-role');
    const newName = document.getElementById('new-group-name');
    const newType = document.getElementById('new-group-type');

    let groupId = groupSelect?.value || null;
    const role = roleInput?.value?.trim() || null;
    const name = newName?.value?.trim();
    const type = newType?.value;

    // Branch: nowa grupa
    if (!groupId && name) {
        const { data: created, error: createErr } = await supabase
            .from('gmp_case_groups')
            .insert({ name, type, is_active: true })
            .select('id')
            .single();
        if (createErr) {
            window.toast?.error?.('Błąd utworzenia grupy: ' + createErr.message);
            return;
        }
        groupId = created.id;
    }

    if (!groupId) {
        window.toast?.warning?.('Wybierz grupę lub podaj nazwę nowej');
        return;
    }

    const { error: linkErr } = await supabase
        .from('gmp_case_group_members')
        .insert({ group_id: groupId, case_id: caseId, role_in_group: role });
    if (linkErr) {
        window.toast?.error?.('Błąd dodania do grupy: ' + linkErr.message);
        return;
    }

    window.toast?.success?.('Dodano do grupy');
    window.closeModal?.();
    if (typeof onSaved === 'function') onSaved();
    // Re-render bieżącej sekcji
    if (window.gmp?.renderCaseGroups && caseId) {
        await window.gmp.renderCaseGroups(caseId, supabase, '#case-groups-section');
    }
}

export async function removeFromGroup(caseId, groupId, supabase) {
    if (!confirm('Usunąć sprawę z tej grupy?')) return;
    const { error } = await supabase
        .from('gmp_case_group_members')
        .delete()
        .eq('case_id', caseId)
        .eq('group_id', groupId);
    if (error) {
        window.toast?.error?.('Błąd: ' + error.message);
        return;
    }
    window.toast?.success?.('Usunięto z grupy');
    if (window.gmp?.renderCaseGroups) {
        await window.gmp.renderCaseGroups(caseId, supabase, '#case-groups-section');
    }
}
