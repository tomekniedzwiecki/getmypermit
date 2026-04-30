// ============================================================================
// crm/components/e-submission-section.js
// Etap III § III.3 — UI sekcji "Elektroniczne złożenie wniosku"
// ============================================================================
// Renderuje 8 podsekcji A-H (Pawel pkt 10):
//   A. Minimum dokumentów
//   B. Profil zaufany
//   C. Ankieta
//   D. Opłaty admin (2 osobne: wniosek + karta)
//   E. Spotkanie
//   F. Załącznik nr 1 + checklista koordynacyjna
//   G. Złożenie + UPO + checklista operacyjna 11 boxów
//   H. Raporty (klient + pracodawca z RODO check)
//
// Wywołanie: renderESubmission(caseData, supabase, '#e-submission-section');
// ============================================================================

let _saveTimeout = null;

const ZAL_MODELS = {
    'pracodawca_pelnomocnictwo': { label: 'Pracodawca daje pełnomocnictwo', star: true, color: 'emerald' },
    'pracodawca_samodzielnie': { label: 'Pracodawca podpisuje samodzielnie', color: 'amber' },
    'do_ustalenia': { label: 'Decyzja jeszcze nieustalona', color: 'red' },
    'nie_dotyczy': { label: 'Nie dotyczy', color: 'zinc' },
};

const OPLATA_STATUSES = {
    'do_oplaty': 'Do opłaty',
    'klient_przekazal': 'Klient przekazał środki',
    'kancelaria_oplacila': 'Kancelaria opłaciła',
    'klient_oplaci_sam': 'Klient opłaci samodzielnie',
    'oplacono': 'Opłacono',
    'nie_dotyczy': 'Nie dotyczy',
};

const COORDINATION_KEYS = [
    { k: 'signer_identified', l: 'Osoba podpisująca ustalona' },
    { k: 'representation_verified', l: 'Reprezentacja zweryfikowana' },
    { k: 'employer_time_set', l: 'Termin pracodawcy ustalony' },
    { k: 'instruction_sent', l: 'Instrukcja wysłana do pracodawcy' },
    { k: 'attachment_signed', l: 'Załącznik podpisany' },
    { k: 'has_problem', l: 'Problem / wymaga kontaktu' },
];

const SUBMIT_KEYS = [
    { k: 'client_present', l: 'Klient obecny' },
    { k: 'pz_works', l: 'Profil zaufany działa' },
    { k: 'application_filled', l: 'Wniosek wypełniony' },
    { k: 'intake_verified', l: 'Dane z ankiety zweryfikowane' },
    { k: 'fee_paid', l: 'Opłata wniosku zapłacona' },
    { k: 'card_fee_marked', l: 'Opłata karty oznaczona' },
    { k: 'attachment_signed', l: 'Załącznik nr 1 podpisany' },
    { k: 'client_signed', l: 'Klient podpisał wniosek' },
    { k: 'application_sent', l: 'Wniosek wysłany' },
    { k: 'upo_generated', l: 'UPO wygenerowane' },
    { k: 'upo_saved', l: 'UPO zapisane w dokumentach' },
];

export async function loadESubmission(caseId, supabase) {
    const { data, error } = await supabase.from('gmp_e_submission_status')
        .select('*').eq('case_id', caseId).maybeSingle();
    if (error) {
        console.warn('[e-submission] load error:', error);
        return null;
    }
    return data;
}

async function saveESubmission(eSubId, updates, supabase) {
    const { error } = await supabase.from('gmp_e_submission_status')
        .update(updates).eq('id', eSubId);
    if (error) throw error;
}

function debounceSave(eSubId, updates, supabase) {
    clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(async () => {
        try {
            await saveESubmission(eSubId, updates, supabase);
            if (window.toast) toast.success('Zapisano', 1500);
        } catch (e) {
            if (window.toast) toast.error('Błąd zapisu: ' + e.message);
        }
    }, 800);
}

export async function renderESubmission(caseData, supabase, targetSelector) {
    const target = document.querySelector(targetSelector);
    if (!target) return;

    target.innerHTML = '<div class="p-4 text-zinc-500 text-sm">Ładuję...</div>';

    let eSub = await loadESubmission(caseData.id, supabase);

    if (!eSub) {
        // Sprawa nie ma e_submission — zainicjuj jeśli submission_method=elektronicznie
        if (caseData.submission_method !== 'elektronicznie') {
            target.innerHTML = `
                <div class="p-4">
                    <p class="text-zinc-400 text-sm mb-3">Ta sekcja jest dostępna dla spraw składanych <strong>elektronicznie</strong>.</p>
                    <p class="text-zinc-500 text-xs">Aby ją włączyć: ustaw "Metoda złożenia" na "elektronicznie" w zakładce <em>Dane szczegółowe</em>.</p>
                </div>`;
            return;
        }
        // Trigger powinien był utworzyć rekord — wymuś teraz
        const { data: ins, error } = await supabase.from('gmp_e_submission_status')
            .insert({ case_id: caseData.id }).select().single();
        if (error) {
            target.innerHTML = `<div class="p-4 text-red-400 text-sm">Błąd init: ${error.message}</div>`;
            return;
        }
        eSub = ins;
    }

    // Computed: progress
    const steps = [
        eSub.minimum_status === 'done',
        eSub.pz_status === 'istnieje' && eSub.pz_login_confirmed,
        eSub.ankieta_status === 'done',
        (eSub.oplata_wniosku_status === 'oplacono' || eSub.oplata_wniosku_status === 'nie_dotyczy')
            && (eSub.oplata_karty_status === 'oplacono' || eSub.oplata_karty_status === 'nie_dotyczy'),
        eSub.spotkanie_status === 'odbylo_sie',
        eSub.zalacznik_nr_1_signed || eSub.zalacznik_nr_1_model === 'nie_dotyczy',
        Object.values(eSub.submit_meeting_checklist || {}).filter(v => v === true).length >= 8,
        !!eSub.submitted_at,
        eSub.upo_generated,
        !!eSub.report_klient_generated_at,
    ];
    const doneCount = steps.filter(Boolean).length;
    const progressPct = Math.round(doneCount / steps.length * 100);

    // Render
    target.innerHTML = `
        <div class="esubm-container p-4">
            <!-- Progress -->
            <div class="esubm-progress mb-5">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-base font-semibold text-zinc-100">
                        <i class="ph ph-lightning text-amber-400"></i> Elektroniczne złożenie wniosku
                    </h3>
                    <span class="text-sm text-zinc-400">${doneCount} z 10 kroków · <strong class="text-emerald-400">${progressPct}%</strong></span>
                </div>
                <div class="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all" style="width: ${progressPct}%"></div>
                </div>
            </div>

            ${renderAlerts(eSub)}

            <!-- Sekcja A: Minimum dokumentów -->
            ${sectionWrapper('A', 'Minimum dokumentów', 'ph-files', stepStatusBadge(eSub.minimum_status), `
                <p class="text-xs text-zinc-500 mb-3">Status agregowany — szczegóły w zakładce <em>Checklista</em> sekcja "Minimum dla e-złożenia".</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                    ${(eSub.minimum_missing && eSub.minimum_missing.length > 0)
                        ? `<div class="text-sm text-amber-300"><i class="ph ph-warning"></i> Brakujące: ${eSub.minimum_missing.map(esc).join(', ')}</div>`
                        : '<div class="text-sm text-emerald-400"><i class="ph ph-check"></i> Komplet</div>'}
                </div>
                <div class="mt-3 flex gap-2">
                    <button class="btn-esub btn-status" data-section="minimum_status">
                        Zmień status: <strong>${stepStatusLabel(eSub.minimum_status)}</strong>
                    </button>
                </div>
            `)}

            <!-- Sekcja B: Profil zaufany -->
            ${sectionWrapper('B', 'Profil zaufany', 'ph-shield-check', pzStatusBadge(eSub.pz_status), `
                <p class="text-xs text-zinc-500 mb-3">Status klienta vs. dane w <em>gmp_trusted_profile_credentials</em> (wrażliwe — admin only).</p>
                <div class="esubm-radio-list">
                    <label class="esubm-radio ${eSub.pz_status === 'istnieje' ? 'selected' : ''}">
                        <input type="radio" name="pz_status" value="istnieje" ${eSub.pz_status === 'istnieje' ? 'checked' : ''} data-field="pz_status">
                        <span><i class="ph ph-check-circle text-emerald-400"></i> Istnieje</span>
                    </label>
                    <label class="esubm-radio ${eSub.pz_status === 'do_weryfikacji' ? 'selected' : ''}">
                        <input type="radio" name="pz_status" value="do_weryfikacji" ${eSub.pz_status === 'do_weryfikacji' ? 'checked' : ''} data-field="pz_status">
                        <span><i class="ph ph-question text-amber-400"></i> Do weryfikacji</span>
                    </label>
                    <label class="esubm-radio ${eSub.pz_status === 'brak' ? 'selected' : ''}">
                        <input type="radio" name="pz_status" value="brak" ${eSub.pz_status === 'brak' ? 'checked' : ''} data-field="pz_status">
                        <span><i class="ph ph-x-circle text-red-400"></i> Brak</span>
                    </label>
                </div>
                <div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                    <label class="esubm-checkbox"><input type="checkbox" data-field="pz_login_confirmed" ${eSub.pz_login_confirmed ? 'checked' : ''}> Login potwierdzony</label>
                    <label class="esubm-checkbox"><input type="checkbox" data-field="pz_method_verified" ${eSub.pz_method_verified ? 'checked' : ''}> Sposób zweryfikowany</label>
                    <label class="esubm-checkbox"><input type="checkbox" data-field="pz_client_aware" ${eSub.pz_client_aware ? 'checked' : ''}> Klient wie</label>
                </div>
            `)}

            <!-- Sekcja C: Ankieta -->
            ${sectionWrapper('C', 'Ankieta klienta', 'ph-clipboard-text', stepStatusBadge(eSub.ankieta_status), `
                <p class="text-xs text-zinc-500 mb-3">Tryb wypełniania ankiety. Szczegóły w zakładce <em>Ankieta klienta</em>.</p>
                <div class="esubm-radio-list">
                    <label class="esubm-radio ${eSub.ankieta_mode === 'klient_link' ? 'selected' : ''}">
                        <input type="radio" name="ankieta_mode" value="klient_link" ${eSub.ankieta_mode === 'klient_link' ? 'checked' : ''} data-field="ankieta_mode">
                        <span>Klient wypełnia (link)</span>
                    </label>
                    <label class="esubm-radio ${eSub.ankieta_mode === 'pracownik_recznie' ? 'selected' : ''}">
                        <input type="radio" name="ankieta_mode" value="pracownik_recznie" ${eSub.ankieta_mode === 'pracownik_recznie' ? 'checked' : ''} data-field="ankieta_mode">
                        <span>Pracownik ręcznie</span>
                    </label>
                    <label class="esubm-radio ${eSub.ankieta_mode === 'mieszane' ? 'selected' : ''}">
                        <input type="radio" name="ankieta_mode" value="mieszane" ${eSub.ankieta_mode === 'mieszane' ? 'checked' : ''} data-field="ankieta_mode">
                        <span>Mieszane</span>
                    </label>
                </div>
                <div class="mt-3">
                    <a href="#intake" class="esubm-link-action" data-tab-link="intake">
                        <i class="ph ph-arrow-square-out"></i> Otwórz zakładkę "Ankieta klienta"
                    </a>
                </div>
            `)}

            <!-- Sekcja D: Opłaty (rozdzielone wniosek + karta) -->
            ${sectionWrapper('D', 'Opłaty administracyjne', 'ph-currency-circle-dollar', oplataAggBadge(eSub), `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${oplataCard('wniosku', 'Opłata za wniosek', eSub)}
                    ${oplataCard('karty', 'Opłata za kartę pobytu', eSub)}
                </div>
            `)}

            <!-- Sekcja E: Spotkanie -->
            ${sectionWrapper('E', 'Spotkanie ws. złożenia', 'ph-calendar-check', spotkanieBadge(eSub.spotkanie_status), `
                <div class="esubm-radio-list">
                    <label class="esubm-radio ${eSub.spotkanie_mode === 'appointment' ? 'selected' : ''}">
                        <input type="radio" name="spotkanie_mode" value="appointment" ${eSub.spotkanie_mode === 'appointment' ? 'checked' : ''} data-field="spotkanie_mode">
                        <span>Spotkanie w kalendarzu</span>
                    </label>
                    <label class="esubm-radio ${eSub.spotkanie_mode === 'task_only' ? 'selected' : ''}">
                        <input type="radio" name="spotkanie_mode" value="task_only" ${eSub.spotkanie_mode === 'task_only' ? 'checked' : ''} data-field="spotkanie_mode">
                        <span>Tylko zadanie</span>
                    </label>
                </div>
                <div class="mt-3">
                    <label class="field-label">Status</label>
                    <select class="esubm-select" data-field="spotkanie_status">
                        <option value="">— wybierz —</option>
                        <option value="do_umowienia" ${eSub.spotkanie_status === 'do_umowienia' ? 'selected' : ''}>Do umówienia</option>
                        <option value="umowione" ${eSub.spotkanie_status === 'umowione' ? 'selected' : ''}>Umówione</option>
                        <option value="odbylo_sie" ${eSub.spotkanie_status === 'odbylo_sie' ? 'selected' : ''}>Odbyło się</option>
                        <option value="przelozone" ${eSub.spotkanie_status === 'przelozone' ? 'selected' : ''}>Przełożone</option>
                    </select>
                </div>
            `)}

            <!-- Sekcja F: Załącznik nr 1 -->
            ${sectionWrapper('F', 'Załącznik nr 1', 'ph-paperclip', zalacznikBadge(eSub), `
                <p class="text-xs text-zinc-500 mb-3">Wybierz model podpisania (pkt 10.F dokumentu Pawła).</p>
                <div class="esubm-radio-list">
                    ${Object.entries(ZAL_MODELS).filter(([k]) => k !== 'nie_dotyczy').map(([k, m]) => `
                        <label class="esubm-radio ${eSub.zalacznik_nr_1_model === k ? 'selected' : ''}">
                            <input type="radio" name="zal_nr_1_model" value="${k}" ${eSub.zalacznik_nr_1_model === k ? 'checked' : ''} data-field="zalacznik_nr_1_model">
                            <span>
                                ${m.star ? '<span class="text-amber-400">★</span> ' : ''}${esc(m.label)}
                                ${k === 'pracodawca_pelnomocnictwo' ? '<span class="text-xs text-emerald-400 ml-2">preferowany</span>' : ''}
                                ${k === 'do_ustalenia' ? '<span class="text-xs text-red-400 ml-2">utworzy alert</span>' : ''}
                            </span>
                        </label>
                    `).join('')}
                </div>

                ${eSub.zalacznik_nr_1_model === 'pracodawca_samodzielnie' ? `
                    <div class="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <div class="text-xs text-amber-200 font-semibold mb-2"><i class="ph ph-list-checks"></i> Checklista koordynacyjna (Wariant B)</div>
                        ${COORDINATION_KEYS.map(({k, l}) => `
                            <label class="esubm-checkbox-item">
                                <input type="checkbox" data-coord-key="${k}" ${eSub.zalacznik_nr_1_coordination_checklist?.[k] ? 'checked' : ''}>
                                <span>${esc(l)}</span>
                            </label>
                        `).join('')}
                    </div>
                ` : ''}

                <div class="mt-3">
                    <label class="esubm-checkbox-item">
                        <input type="checkbox" data-field="zalacznik_nr_1_signed" ${eSub.zalacznik_nr_1_signed ? 'checked' : ''}>
                        <span><strong>Załącznik nr 1 podpisany</strong></span>
                    </label>
                </div>
            `)}

            <!-- Sekcja G: Złożenie + UPO -->
            ${sectionWrapper('G', 'Złożenie wniosku & UPO', 'ph-paper-plane-tilt', submitBadge(eSub), `
                <p class="text-xs text-zinc-500 mb-3">Checklista operacyjna przy spotkaniu (11 punktów).</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-1">
                    ${SUBMIT_KEYS.map(({k, l}) => `
                        <label class="esubm-checkbox-item">
                            <input type="checkbox" data-submit-key="${k}" ${eSub.submit_meeting_checklist?.[k] ? 'checked' : ''}>
                            <span>${esc(l)}</span>
                        </label>
                    `).join('')}
                </div>

                <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label class="field-label">Data złożenia</label>
                        <input type="date" class="esubm-input" data-field="submitted_at"
                            value="${eSub.submitted_at ? eSub.submitted_at.slice(0, 10) : ''}">
                    </div>
                    <div>
                        <label class="field-label">Numer UPO</label>
                        <input type="text" class="esubm-input" data-field="upo_number"
                            value="${esc(eSub.upo_number || '')}" placeholder="np. UPO/2026/12345">
                    </div>
                </div>

                <div class="mt-3">
                    <label class="esubm-checkbox-item">
                        <input type="checkbox" data-field="upo_generated" ${eSub.upo_generated ? 'checked' : ''}>
                        <span>UPO wygenerowane (dokument zapisany w sprawie)</span>
                    </label>
                </div>
            `)}

            <!-- Sekcja H: Raporty -->
            ${sectionWrapper('H', 'Raport po złożeniu', 'ph-envelope', raportBadge(eSub), `
                <p class="text-xs text-zinc-500 mb-3">Generuj raport DOCX dla klienta i/lub pracodawcy.</p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="raport-card">
                        <div class="raport-card-title"><i class="ph ph-user text-blue-400"></i> Klient</div>
                        ${eSub.report_klient_generated_at
                            ? `<div class="text-xs text-emerald-400 mb-2"><i class="ph ph-check-circle"></i> Wygenerowano ${formatDate(eSub.report_klient_generated_at)}</div>`
                            : '<div class="text-xs text-zinc-500 mb-2">Nie wygenerowano</div>'}
                        <button class="btn-esub btn-primary" data-action="generate-raport-klient">
                            <i class="ph ph-file-doc"></i> Wygeneruj raport klienta
                        </button>
                        <label class="esubm-checkbox-item mt-2">
                            <input type="checkbox" data-field="notify_klient_after_submit" ${eSub.notify_klient_after_submit ? 'checked' : ''}>
                            <span>Powiadom klienta po złożeniu</span>
                        </label>
                    </div>

                    <div class="raport-card">
                        <div class="raport-card-title"><i class="ph ph-buildings text-amber-400"></i> Pracodawca</div>
                        ${!caseData.employer_id
                            ? '<div class="text-xs text-zinc-500 mb-2 italic">Brak pracodawcy w sprawie</div>'
                            : eSub.report_pracodawca_generated_at
                                ? `<div class="text-xs text-emerald-400 mb-2"><i class="ph ph-check-circle"></i> Wygenerowano ${formatDate(eSub.report_pracodawca_generated_at)}</div>`
                                : '<div class="text-xs text-zinc-500 mb-2">Nie wygenerowano</div>'}
                        <button class="btn-esub btn-primary" data-action="generate-raport-pracodawca" ${!caseData.employer_id ? 'disabled' : ''}>
                            <i class="ph ph-file-doc"></i> Wygeneruj raport pracodawcy
                        </button>
                        <label class="esubm-checkbox-item mt-2" id="notify-employer-label">
                            <input type="checkbox" data-field="notify_pracodawca_after_submit" ${eSub.notify_pracodawca_after_submit ? 'checked' : ''}>
                            <span>Powiadom pracodawcę po złożeniu</span>
                        </label>
                        <div class="text-xs text-amber-300 mt-1 hidden" id="rodo-warn">
                            <i class="ph ph-warning"></i> Wymagana podpisana zgoda RODO klienta — wygeneruj i daj do podpisu dokument "zgoda_przekazywania_statusu_pracodawcy"
                        </div>
                    </div>
                </div>
            `)}

        </div>
    `;

    // Bind events
    bindFieldHandlers(target, eSub.id, supabase, caseData);
    bindCheckboxHandlers(target, eSub, supabase);
    bindActionHandlers(target, eSub, caseData, supabase, targetSelector);
    bindCoordinationHandlers(target, eSub, supabase);
    bindSubmitChecklistHandlers(target, eSub, supabase);
    bindTabLinks(target);

    // RODO check dla notify pracodawcy
    await checkRodoConsent(target, caseData, supabase);
}

// ============================================================================
// SECTION WRAPPER
// ============================================================================
function sectionWrapper(letter, title, icon, badge, content) {
    return `
        <div class="esubm-section">
            <div class="esubm-section-header">
                <div class="flex items-center gap-3">
                    <div class="esubm-letter">${letter}</div>
                    <div>
                        <div class="esubm-section-title"><i class="ph ${icon}"></i> ${esc(title)}</div>
                    </div>
                </div>
                <div>${badge}</div>
            </div>
            <div class="esubm-section-body">
                ${content}
            </div>
        </div>
    `;
}

// ============================================================================
// BADGES
// ============================================================================
function stepStatusBadge(s) {
    const map = {
        'pending': { label: 'do zrobienia', cls: 'badge-pending' },
        'in_progress': { label: 'w trakcie', cls: 'badge-progress' },
        'done': { label: 'zrobione', cls: 'badge-done' },
        'blocked': { label: 'zablokowane', cls: 'badge-blocked' },
        'n_a': { label: 'N/D', cls: 'badge-na' },
    };
    const m = map[s] || map['pending'];
    return `<span class="esubm-badge ${m.cls}">${m.label}</span>`;
}
function stepStatusLabel(s) {
    return {pending:'do zrobienia', in_progress:'w trakcie', done:'zrobione', blocked:'zablokowane', n_a:'N/D'}[s] || s;
}
function pzStatusBadge(s) {
    if (s === 'istnieje') return '<span class="esubm-badge badge-done">istnieje</span>';
    if (s === 'brak') return '<span class="esubm-badge badge-blocked">brak</span>';
    if (s === 'do_weryfikacji') return '<span class="esubm-badge badge-progress">do weryfikacji</span>';
    return '<span class="esubm-badge badge-pending">brak danych</span>';
}
function spotkanieBadge(s) {
    const map = {do_umowienia:['do umówienia','badge-pending'], umowione:['umówione','badge-progress'],
                 odbylo_sie:['odbyło się','badge-done'], przelozone:['przełożone','badge-blocked']};
    const m = map[s] || ['—', 'badge-pending'];
    return `<span class="esubm-badge ${m[1]}">${m[0]}</span>`;
}
function zalacznikBadge(eSub) {
    if (eSub.zalacznik_nr_1_signed) return '<span class="esubm-badge badge-done">podpisany</span>';
    if (eSub.zalacznik_nr_1_model === 'do_ustalenia') return '<span class="esubm-badge badge-blocked">do ustalenia</span>';
    if (eSub.zalacznik_nr_1_model === 'nie_dotyczy') return '<span class="esubm-badge badge-na">N/D</span>';
    return '<span class="esubm-badge badge-pending">w trakcie</span>';
}
function submitBadge(eSub) {
    if (eSub.submitted_at) return '<span class="esubm-badge badge-done">złożony</span>';
    const checked = Object.values(eSub.submit_meeting_checklist || {}).filter(v => v === true).length;
    return `<span class="esubm-badge badge-progress">${checked}/11</span>`;
}
function raportBadge(eSub) {
    if (eSub.report_klient_generated_at && eSub.report_pracodawca_generated_at) return '<span class="esubm-badge badge-done">oba wygenerowane</span>';
    if (eSub.report_klient_generated_at) return '<span class="esubm-badge badge-progress">klient OK</span>';
    return '<span class="esubm-badge badge-pending">brak</span>';
}
function oplataAggBadge(eSub) {
    const w = eSub.oplata_wniosku_status === 'oplacono' || eSub.oplata_wniosku_status === 'nie_dotyczy';
    const k = eSub.oplata_karty_status === 'oplacono' || eSub.oplata_karty_status === 'nie_dotyczy';
    if (w && k) return '<span class="esubm-badge badge-done">opłacone</span>';
    if (w || k) return '<span class="esubm-badge badge-progress">częściowo</span>';
    return '<span class="esubm-badge badge-pending">do opłaty</span>';
}

// ============================================================================
// OPŁATA CARD (D — wniosek + karta)
// ============================================================================
function oplataCard(prefix, label, eSub) {
    const status = eSub[`oplata_${prefix}_status`];
    const amount = eSub[`oplata_${prefix}_amount`];
    const blokuje = eSub[`oplata_${prefix}_blokuje`];
    return `
        <div class="oplata-card ${blokuje && status !== 'oplacono' ? 'blocking' : ''}">
            <div class="text-sm font-semibold text-zinc-200 mb-2">${esc(label)}</div>
            <div class="mb-2">
                <input type="number" class="esubm-input" data-field="oplata_${prefix}_amount"
                    value="${amount != null ? amount : ''}" placeholder="kwota (zł)" step="0.01">
            </div>
            <select class="esubm-select" data-field="oplata_${prefix}_status">
                ${Object.entries(OPLATA_STATUSES).map(([k, v]) => `
                    <option value="${k}" ${status === k ? 'selected' : ''}>${v}</option>
                `).join('')}
            </select>
            <label class="esubm-checkbox-item mt-2">
                <input type="checkbox" data-field="oplata_${prefix}_blokuje" ${blokuje ? 'checked' : ''}>
                <span class="text-xs">Blokuje złożenie</span>
            </label>
        </div>
    `;
}

// ============================================================================
// ALERTS
// ============================================================================
function renderAlerts(eSub) {
    const alerts = [];
    if (eSub.zalacznik_nr_1_model === 'do_ustalenia') {
        alerts.push({ icon: 'ph-warning-circle', cls: 'red', text: 'Pilne: ustal model załącznika nr 1 (kategoria pc_praca wymaga decyzji).' });
    }
    if ((eSub.oplata_wniosku_blokuje && eSub.oplata_wniosku_status !== 'oplacono')
        || (eSub.oplata_karty_blokuje && eSub.oplata_karty_status !== 'oplacono')) {
        alerts.push({ icon: 'ph-currency-circle-dollar', cls: 'red', text: 'Brak opłaty blokuje złożenie wniosku.' });
    }
    if (eSub.submitted_at && !eSub.upo_generated) {
        alerts.push({ icon: 'ph-paper-plane-tilt', cls: 'amber', text: 'Wniosek wysłany, ale brak UPO. Sprawdź EPUAP.' });
    }
    if (alerts.length === 0) return '';
    return `<div class="mb-4 space-y-2">${alerts.map(a => `
        <div class="esubm-alert esubm-alert-${a.cls}">
            <i class="ph ${a.icon}"></i><span>${esc(a.text)}</span>
        </div>
    `).join('')}</div>`;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================
function bindFieldHandlers(target, eSubId, supabase, caseData) {
    target.querySelectorAll('[data-field]').forEach(el => {
        el.addEventListener('change', () => {
            const field = el.dataset.field;
            let value;
            if (el.type === 'checkbox') value = el.checked;
            else if (el.type === 'number') value = el.value === '' ? null : Number(el.value);
            else if (el.type === 'date') value = el.value || null;
            else value = el.value || null;
            debounceSave(eSubId, { [field]: value }, supabase);
        });
    });
}

function bindCheckboxHandlers(target, eSub, supabase) {
    // Coord checklist + submit checklist mają osobne handlery
}

function bindCoordinationHandlers(target, eSub, supabase) {
    target.querySelectorAll('[data-coord-key]').forEach(el => {
        el.addEventListener('change', async () => {
            const key = el.dataset.coordKey;
            const newChecklist = { ...(eSub.zalacznik_nr_1_coordination_checklist || {}) };
            newChecklist[key] = el.checked;
            await saveESubmission(eSub.id, { zalacznik_nr_1_coordination_checklist: newChecklist }, supabase);
            eSub.zalacznik_nr_1_coordination_checklist = newChecklist;
            if (window.toast) toast.success('Zapisano', 1200);
        });
    });
}

function bindSubmitChecklistHandlers(target, eSub, supabase) {
    target.querySelectorAll('[data-submit-key]').forEach(el => {
        el.addEventListener('change', async () => {
            const key = el.dataset.submitKey;
            const newChecklist = { ...(eSub.submit_meeting_checklist || {}) };
            newChecklist[key] = el.checked;
            await saveESubmission(eSub.id, { submit_meeting_checklist: newChecklist }, supabase);
            eSub.submit_meeting_checklist = newChecklist;
            if (window.toast) toast.success('Zapisano', 1200);
        });
    });
}

function bindActionHandlers(target, eSub, caseData, supabase, targetSelector) {
    target.querySelector('[data-action="generate-raport-klient"]')?.addEventListener('click', async (ev) => {
        const btn = ev.currentTarget;
        await generateRaport('raport_po_zlozeniu_klient', 'report_klient', caseData, eSub, supabase, btn, targetSelector);
    });
    target.querySelector('[data-action="generate-raport-pracodawca"]')?.addEventListener('click', async (ev) => {
        const btn = ev.currentTarget;
        await generateRaport('raport_po_zlozeniu_pracodawca', 'report_pracodawca', caseData, eSub, supabase, btn, targetSelector);
    });
}

function bindTabLinks(target) {
    target.querySelectorAll('[data-tab-link]').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const tab = a.dataset.tabLink;
            const tabBtn = document.querySelector(`.case-tab[data-tab="${tab}"]`);
            if (tabBtn) tabBtn.click();
        });
    });
}

async function generateRaport(kind, fieldPrefix, caseData, eSub, supabase, btn, targetSelector) {
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner-gap animate-spin"></i> Generuję...';
    try {
        // Pobierz template_id
        const { data: tpl } = await supabase.from('gmp_document_templates')
            .select('id').eq('kind', kind).eq('is_active', true).maybeSingle();
        if (!tpl) throw new Error('Template nie istnieje');

        const overrides = {
            upo_number: eSub.upo_number,
            case: { date_submitted: eSub.submitted_at?.slice(0, 10), znak_sprawy: caseData.znak_sprawy },
        };

        const { data, error } = await supabase.functions.invoke('generate-document', {
            body: { case_id: caseData.id, template_id: tpl.id, overrides }
        });
        if (error) throw new Error(error.message);
        if (data?.status === 'missing_fields') {
            alert('Brakuje danych: ' + data.missing_fields.join(', '));
            return;
        }
        if (data?.download_url) {
            const a = document.createElement('a');
            a.href = data.download_url;
            a.download = data.file_name;
            a.click();

            // Update e_submission_status
            await saveESubmission(eSub.id, {
                [`${fieldPrefix}_generated_at`]: new Date().toISOString(),
                [`${fieldPrefix}_document_id`]: data.document_id,
            }, supabase);

            if (window.toast) toast.success('Raport wygenerowany');
            // Reload sekcji
            await renderESubmission(caseData, supabase, targetSelector);
        }
    } catch (e) {
        alert('Błąd: ' + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
}

async function checkRodoConsent(target, caseData, supabase) {
    if (!caseData.employer_id) return;
    const cb = target.querySelector('input[data-field="notify_pracodawca_after_submit"]');
    const warn = target.querySelector('#rodo-warn');
    if (!cb || !warn) return;

    const { count } = await supabase.from('gmp_documents')
        .select('id', { count: 'exact', head: true })
        .eq('case_id', caseData.id)
        .eq('doc_type', 'zgoda_przekazywania_statusu')
        .eq('status', 'signed');

    if ((count || 0) === 0) {
        cb.disabled = true;
        warn.classList.remove('hidden');
    }
}

function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function formatDate(d) {
    try { return new Date(d).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return d; }
}
