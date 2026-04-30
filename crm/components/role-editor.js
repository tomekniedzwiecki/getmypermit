// ============================================================================
// crm/components/role-editor.js
// Etap II-C § II-C.2 — Edytor ról w sprawie (sekcja w "Dane szczegółowe")
// ============================================================================
// Pokazuje wszystkie role + defaults + overrides z gmp_case_role_assignments.
// Wywołanie:
//   import { renderRoleAssignments } from './components/role-editor.js';
//   await renderRoleAssignments(caseData, supabase, '#role-assignments-section');
// ============================================================================

const ROLES = [
    { code: 'strona', label: 'Strona sprawy', icon: 'ph-user' },
    { code: 'zlecajacy', label: 'Zlecający', icon: 'ph-handshake' },
    { code: 'platnik', label: 'Płatnik', icon: 'ph-currency-circle-dollar' },
    { code: 'osoba_kontaktowa', label: 'Osoba kontaktowa', icon: 'ph-phone' },
    { code: 'podpisujacy_pelnomocnictwo_klienta', label: 'Podpisujący pełnomocnictwo (klient)', icon: 'ph-signature' },
    { code: 'podpisujacy_zalacznik_nr_1', label: 'Podpisujący załącznik nr 1', icon: 'ph-signature', onlyForGroup: 'pobyt_praca' },
    { code: 'odbiorca_raportu', label: 'Odbiorca raportu', icon: 'ph-envelope', multiValue: true },
];

export async function loadAssignments(caseId, supabase) {
    const { data, error } = await supabase
        .from('gmp_case_role_assignments')
        .select('*, gmp_clients(first_name, last_name), gmp_employers(name), gmp_staff(full_name)')
        .eq('case_id', caseId);
    if (error) {
        console.warn('[role-editor] load error:', error);
        return [];
    }
    return data || [];
}

export async function renderRoleAssignments(caseData, supabase, targetSelector) {
    const target = document.querySelector(targetSelector);
    if (!target) return;

    target.innerHTML = '<div class="text-zinc-500 text-sm">Ładuję role...</div>';

    // Pobierz pawel_group dla kategorii (do conditional ról)
    let pawelGroup = null;
    if (caseData.category) {
        const { data: cat } = await supabase
            .from('gmp_case_categories')
            .select('pawel_group')
            .eq('code', caseData.category).maybeSingle();
        pawelGroup = cat?.pawel_group || null;
    }

    const assignments = await loadAssignments(caseData.id, supabase);

    // Mapping role → assignments (multi-value dla odbiorca_raportu)
    const byRole = {};
    for (const a of assignments) {
        if (!byRole[a.role]) byRole[a.role] = [];
        byRole[a.role].push(a);
    }

    // Filtruj role wg pawel_group
    const visibleRoles = ROLES.filter(r => !r.onlyForGroup || r.onlyForGroup === pawelGroup);

    let html = '<div class="space-y-2">';

    for (const role of visibleRoles) {
        const overrides = byRole[role.code] || [];
        const defaultDisplay = computeDefault(role.code, caseData);

        html += `
            <div class="role-row p-2 rounded hover:bg-zinc-900/50 border border-zinc-800/40">
                <div class="flex items-start justify-between gap-2 flex-wrap">
                    <div class="flex items-center gap-2">
                        <i class="ph ${role.icon} text-purple-400"></i>
                        <span class="text-sm text-zinc-200 font-medium">${escapeHtml(role.label)}</span>
                    </div>
                    <div class="flex items-center gap-1">
                        ${overrides.length === 0
                            ? `<span class="text-xs text-zinc-500 italic">default: ${escapeHtml(defaultDisplay)}</span>`
                            : ''}
                        <button class="btn btn-ghost btn-sm" data-action="add-role" data-role="${role.code}" data-role-label="${escapeAttr(role.label)}" title="Dodaj override">
                            <i class="ph ph-plus"></i>
                        </button>
                    </div>
                </div>
                ${overrides.length > 0 ? `
                    <div class="mt-1 ml-7 space-y-1">
                        ${overrides.map(o => `
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-zinc-300">→ ${escapeHtml(displayName(o))} <span class="text-zinc-500">(${o.party_type})</span></span>
                                <button class="text-zinc-500 hover:text-red-400" data-action="remove-role" data-id="${o.id}" title="Usuń override">
                                    <i class="ph ph-x"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    html += '</div>';
    target.innerHTML = html;

    // Bind events
    target.querySelectorAll('button[data-action="add-role"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const role = btn.dataset.role;
            const label = btn.dataset.roleLabel;
            const choice = await openAddRoleDialog(role, label, caseData);
            if (choice) {
                await supabase.from('gmp_case_role_assignments').insert({
                    case_id: caseData.id,
                    role,
                    party_type: choice.party_type,
                    client_id: choice.client_id || null,
                    employer_id: choice.employer_id || null,
                    staff_id: choice.staff_id || null,
                    external_name: choice.external_name || null,
                    external_email: choice.external_email || null,
                    external_phone: choice.external_phone || null,
                });
                if (window.toast) toast.success('Override dodany');
                await renderRoleAssignments(caseData, supabase, targetSelector);
            }
        });
    });

    target.querySelectorAll('button[data-action="remove-role"]').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('Usunąć ten override (powróci do default)?')) return;
            const id = btn.dataset.id;
            const { error } = await supabase.from('gmp_case_role_assignments').delete().eq('id', id);
            if (error) { if (window.toast) toast.error('Błąd: ' + error.message); return; }
            if (window.toast) toast.success('Override usunięty');
            await renderRoleAssignments(caseData, supabase, targetSelector);
        });
    });
}

function computeDefault(role, caseData) {
    const client = caseData.gmp_clients;
    const employer = caseData.gmp_employers;
    const clientName = client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : null;

    if (role === 'strona') {
        if (caseData.party_type === 'employer' && employer) return employer.name;
        return clientName || '—';
    }
    if (role === 'zlecajacy') return clientName || (employer?.name) || '—';
    if (role === 'platnik') {
        if (caseData.party_type === 'employer' && employer) return employer.name;
        return clientName || '—';
    }
    if (role === 'osoba_kontaktowa') return clientName || '—';
    if (role === 'podpisujacy_pelnomocnictwo_klienta') return clientName || '—';
    if (role === 'podpisujacy_zalacznik_nr_1') return employer?.name || '— wymaga pracodawcy';
    if (role === 'odbiorca_raportu') {
        const list = [];
        if (clientName) list.push(clientName);
        if (employer?.name) list.push(employer.name);
        return list.length ? list.join(', ') : '—';
    }
    return '—';
}

function displayName(a) {
    if (a.party_type === 'client' && a.gmp_clients) {
        return `${a.gmp_clients.first_name || ''} ${a.gmp_clients.last_name || ''}`.trim();
    }
    if (a.party_type === 'employer' && a.gmp_employers) return a.gmp_employers.name;
    if (a.party_type === 'staff' && a.gmp_staff) return a.gmp_staff.full_name;
    if (a.party_type === 'external') return a.external_name || '(bez nazwy)';
    return '?';
}

async function openAddRoleDialog(role, label, caseData) {
    // Prosty prompt — w prod modal z dropdown'em
    const choice = prompt(
        `Dodaj override roli "${label}":\n\n` +
        `Wpisz typ + nazwa:\n` +
        `- "client" — użyj klienta sprawy (${caseData.gmp_clients ? caseData.gmp_clients.first_name + ' ' + caseData.gmp_clients.last_name : 'brak klienta'})\n` +
        `- "employer" — użyj pracodawcy sprawy (${caseData.gmp_employers ? caseData.gmp_employers.name : 'brak pracodawcy'})\n` +
        `- "external <Imię Nazwisko>" — osoba zewnętrzna\n\n` +
        `Pusto = anuluj.`
    );
    if (!choice || !choice.trim()) return null;

    const trimmed = choice.trim();

    if (trimmed === 'client') {
        if (!caseData.client_id) { alert('Sprawa nie ma klienta'); return null; }
        return { party_type: 'client', client_id: caseData.client_id };
    }
    if (trimmed === 'employer') {
        if (!caseData.employer_id) { alert('Sprawa nie ma pracodawcy'); return null; }
        return { party_type: 'employer', employer_id: caseData.employer_id };
    }
    if (trimmed.startsWith('external ')) {
        const name = trimmed.slice(9).trim();
        if (!name) { alert('Brak nazwy'); return null; }
        return { party_type: 'external', external_name: name };
    }
    alert('Nieznany format. Dozwolone: "client" | "employer" | "external <imię>"');
    return null;
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
