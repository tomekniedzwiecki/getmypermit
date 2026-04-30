// ============================================================================
// crm/components/next-step.js
// Etap I — § 1.7 + A6 — Sekcja "Co teraz" w karcie sprawy
// ============================================================================
// Wywołanie:
//   import { renderNextSteps } from './components/next-step.js';
//   await renderNextSteps(caseId, supabase, '#next-steps-list');
// ============================================================================

export async function computeNextSteps(caseId, supabase) {
    if (!caseId) return [];

    let userId = null;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id || null;
    } catch { /* anonymous */ }

    try {
        const { data, error } = await supabase.rpc('gmp_get_next_steps', {
            p_case_id: caseId,
            p_user_id: userId
        });
        if (error) {
            console.warn('[next-step] RPC error:', error);
            return [];
        }
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.warn('[next-step] RPC threw:', e);
        return [];
    }
}

export async function renderNextSteps(caseId, supabase, targetSelector = '#next-steps-list') {
    const target = document.querySelector(targetSelector);
    if (!target) return;

    const steps = await computeNextSteps(caseId, supabase);
    const banner = target.closest('#next-steps');

    if (steps.length === 0) {
        target.innerHTML = '<li class="next-steps-empty">Brak akcji do wykonania — sprawa wygląda OK.</li>';
        if (banner) banner.classList.add('next-steps-empty-banner');
        return;
    }

    if (banner) banner.classList.remove('next-steps-empty-banner');
    target.innerHTML = steps.map(step => {
        const priorityClass = `next-steps-priority-${step.priority}`;
        const icon = step.icon || 'ph-arrow-right';
        return `
            <li class="next-steps-item ${priorityClass}">
                <i class="ph ${icon}"></i>
                <span class="next-steps-label">${escapeHtml(step.label)}</span>
                ${step.action_url
                    ? `<a class="next-steps-action" href="${escapeAttr(step.action_url)}">Otwórz</a>`
                    : ''}
            </li>
        `;
    }).join('');
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function escapeAttr(s) {
    if (s == null) return '';
    return String(s).replace(/"/g, '&quot;');
}

// ============================================================================
// CSS recommendation (do dodania w case.html lub wspólnym stylu):
//
// .next-steps-banner {
//     background: linear-gradient(to right, #fef3c7, #fef9c3);
//     border-left: 4px solid #f59e0b;
//     border-radius: 0.5rem;
//     padding: 0.75rem 1rem;
//     margin-bottom: 1rem;
// }
// .next-steps-banner h3 { font-size: 0.875rem; font-weight: 600; color: #92400e; }
// .next-steps-item {
//     display: flex; align-items: center; gap: 0.5rem;
//     padding: 0.5rem 0; font-size: 0.875rem;
// }
// .next-steps-priority-1 { color: #b91c1c; font-weight: 500; }
// .next-steps-priority-2 { color: #92400e; }
// .next-steps-priority-3 { color: #075985; }
// .next-steps-action { margin-left: auto; color: #2563eb; text-decoration: underline; }
// .next-steps-empty-banner { display: none; }
// ============================================================================
