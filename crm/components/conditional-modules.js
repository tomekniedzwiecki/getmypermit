// ============================================================================
// crm/components/conditional-modules.js
// Etap I — § 1.4 — Conditional UI helper
// ============================================================================
// Pokazuje/ukrywa elementy UI wg deklaratywnych reguł na atrybutach data-show-when.
//
// Przykłady użycia:
//   <section data-show-when="party_type:employer"> ... </section>
//   <section data-show-when="kind:przystapienie_*"> ... </section>
//   <section data-show-when="category_pawel_group:pobyt_praca"> ... </section>
//   <section data-show-when="has_invoices:true"> ... </section>
//   <section data-show-when="submission_method:elektronicznie"> ... </section>
//
// Łączenie reguł:
//   AND: "party_type:employer,kind:przystapienie_*"
//   OR:  "kind:przystapienie_do_sprawy|przejeta_do_dalszego_prowadzenia"
//
// Wywołanie:
//   import { applyConditionalModules, buildCaseUiContext } from './components/conditional-modules.js';
//   const ctx = await buildCaseUiContext(caseData, supabase);
//   applyConditionalModules(ctx);
// ============================================================================

export function applyConditionalModules(caseData) {
    if (!caseData) return;
    document.querySelectorAll('[data-show-when]').forEach(el => {
        const rules = el.dataset.showWhen.split(',').map(r => r.trim());
        const visible = rules.every(rule => evalRule(rule, caseData));
        el.classList.toggle('hidden', !visible);
    });
}

function evalRule(rule, caseData) {
    const colonIdx = rule.indexOf(':');
    if (colonIdx === -1) return false;
    const path = rule.slice(0, colonIdx);
    const expectedRaw = rule.slice(colonIdx + 1);

    // Pobierz wartość po path (np. "category_pawel_group" lub "case.kind")
    const value = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), caseData);

    // OR: "X|Y|Z"
    const expectations = expectedRaw.split('|');
    return expectations.some(expected => {
        if (expected === 'true') return value === true || value === 'true';
        if (expected === 'false') return !value || value === 'false';
        if (expected.endsWith('*')) return String(value || '').startsWith(expected.slice(0, -1));
        return String(value) === expected;
    });
}

// ============================================================================
// buildCaseUiContext — wzbogaca caseData o computed fields dla conditional UI.
// ============================================================================
export async function buildCaseUiContext(caseData, supabase) {
    if (!caseData?.id) return caseData;
    const ctx = { ...caseData };

    // has_employer
    ctx.has_employer = !!caseData.employer_id;

    // has_invoices (B13)
    try {
        const { count: invCount } = await supabase
            .from('gmp_invoices')
            .select('id', { count: 'exact', head: true })
            .eq('case_id', caseData.id);
        ctx.has_invoices = (invCount || 0) > 0;
    } catch {
        ctx.has_invoices = false;
    }

    // has_payment_plan
    try {
        const { count: planCount } = await supabase
            .from('gmp_payment_plans')
            .select('id', { count: 'exact', head: true })
            .eq('case_id', caseData.id);
        ctx.has_payment_plan = (planCount || 0) > 0;
    } catch {
        ctx.has_payment_plan = false;
    }

    // category_pawel_group (z gmp_case_categories)
    if (caseData.category) {
        try {
            const { data: cat } = await supabase
                .from('gmp_case_categories')
                .select('pawel_group, group_label, label')
                .eq('code', caseData.category)
                .maybeSingle();
            ctx.category_pawel_group = cat?.pawel_group;
            ctx.category_label = cat?.label;
            ctx.category_group_label = cat?.group_label;
        } catch {
            ctx.category_pawel_group = null;
        }
    }

    return ctx;
}
