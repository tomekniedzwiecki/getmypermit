// build-context.ts — buduje kontekst danych dla docx-templates per case_id
// Używane przez generate-document i case-startup-pack.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface CaseContext {
    case: any;
    client: any;
    employer: any;
    category: any;
    payment_plan: any;
    installments: any[];
    role_assignments: any[];
    checklists: any[];
    today: string;
    today_pl: string;
    full_client_name: string;
    case_number: string;
    [key: string]: any;
}

function formatDatePl(d: string | Date | null | undefined): string {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(date.getTime())) return '';
    const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
                    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export async function buildCaseContext(case_id: string, supabase: SupabaseClient): Promise<CaseContext> {
    // Equity load — wszystko równolegle
    const [caseRes, planRes, instRes, rolesRes, checklistsRes] = await Promise.all([
        supabase.from('gmp_cases')
            .select('*, gmp_clients(*), gmp_employers(*), gmp_case_categories!category(*)')
            .eq('id', case_id).maybeSingle(),
        supabase.from('gmp_payment_plans').select('*').eq('case_id', case_id).maybeSingle(),
        supabase.from('gmp_payment_installments').select('*').eq('case_id', case_id).order('installment_number'),
        supabase.from('gmp_case_role_assignments').select('*').eq('case_id', case_id).then(r => r).catch(() => ({ data: [] })),
        supabase.from('gmp_case_checklists').select('*').eq('case_id', case_id).order('section').order('sort_order').then(r => r).catch(() => ({ data: [] })),
    ]);

    const caseData = caseRes.data;
    if (!caseData) throw new Error(`Case not found: ${case_id}`);

    const client = caseData.gmp_clients;
    const employer = caseData.gmp_employers;
    const category = caseData.gmp_case_categories;

    const today = new Date().toISOString().split('T')[0];
    const today_pl = formatDatePl(new Date());

    const full_client_name = client
        ? `${client.first_name || ''} ${client.last_name || ''}`.trim()
        : '';

    const checklists = checklistsRes.data || [];
    const installments = instRes.data || [];

    return {
        case: caseData,
        client,
        employer,
        category,
        payment_plan: planRes.data,
        installments,
        role_assignments: rolesRes.data || [],
        checklists,
        // Pre-rendered teksty (workaround dla problemu FOR loop w python-docx templates)
        checklists_as_text: formatChecklistsAsText(checklists),
        installments_as_text: formatInstallmentsAsText(installments),

        // Helpers
        today, today_pl,
        full_client_name,
        case_number: caseData.case_number || '',
        client_first_name: client?.first_name || '',
        client_last_name: client?.last_name || '',
        client_birth_date: client?.birth_date || '',
        client_phone: client?.phone || '',
        client_email: client?.email || '',
        client_pesel: client?.pesel || '',
        client_nationality: client?.nationality || '',

        employer_name: employer?.name || '',
        employer_nip: employer?.nip || '',
        employer_address: employer?.address || '',

        category_label: category?.label || '',
        category_code: caseData.category || '',
        pawel_group: category?.pawel_group || '',

        kind: caseData.kind || '',
        kind_label: kindLabel(caseData.kind),

        admin_fee_amount: caseData.admin_fee_amount || 0,
        stamp_fee_amount: caseData.stamp_fee_amount || 0,
        fee_amount: caseData.fee_amount || 0,

        // Computed
        installments_count: (instRes.data || []).length,
        installments_total: (instRes.data || []).reduce((s: number, i: any) => s + Number(i.amount || 0), 0),
    };
}

// Pre-render listy checklist jako tekst (workaround FOR-loop python-docx)
const SECTION_LABELS_PL: Record<string, string> = {
    'braki_formalne': 'BRAKI FORMALNE',
    'braki_merytoryczne': 'BRAKI MERYTORYCZNE',
    'dokumenty_wymagane': 'WYMAGANE DOKUMENTY',
    'obliczenia_srodkow': 'OBLICZENIA ŚRODKÓW',
    'elektroniczne_zlozenie_minimum': 'MINIMUM DLA E-ZŁOŻENIA',
};

const STATUS_MARK: Record<string, string> = {
    'done': '[V]',
    'pending': '[ ]',
    'n_a': '[-]',
    'blocked': '[!]',
};

function formatChecklistsAsText(checklists: any[]): string {
    if (!checklists.length) return '(brak pozycji w checkliście — wygeneruj przez "Wygeneruj checklistę z kategorii sprawy")';

    // Grupowanie po section
    const grouped: Record<string, any[]> = {};
    for (const item of checklists) {
        const s = item.section || 'inne';
        if (!grouped[s]) grouped[s] = [];
        grouped[s].push(item);
    }

    const lines: string[] = [];
    for (const [section, items] of Object.entries(grouped)) {
        lines.push('');
        lines.push(`=== ${SECTION_LABELS_PL[section] || section.toUpperCase()} ===`);
        lines.push('');

        // Topowe + dziecięce
        const byParent: Record<string, any[]> = {};
        const topLevel: any[] = [];
        for (const it of items) {
            if (it.parent_label) {
                if (!byParent[it.parent_label]) byParent[it.parent_label] = [];
                byParent[it.parent_label].push(it);
            } else {
                topLevel.push(it);
            }
        }

        for (const it of topLevel) {
            const mark = STATUS_MARK[it.status] || '[ ]';
            const opt = it.is_required ? '' : ' (opcjonalne)';
            lines.push(`${mark} ${it.label}${opt}`);
            if (it.notes) lines.push(`    Notatka: ${it.notes}`);
            const subs = byParent[it.label] || [];
            for (const sub of subs) {
                const subMark = STATUS_MARK[sub.status] || '[ ]';
                lines.push(`    ${subMark} ${sub.label}`);
                if (sub.notes) lines.push(`        Notatka: ${sub.notes}`);
            }
        }
    }

    return lines.join('\n');
}

function formatInstallmentsAsText(installments: any[]): string {
    if (!installments.length) return '(brak rat)';
    const lines = installments.map(i => {
        const status = i.status === 'paid' ? '✓ OPŁACONA'
            : i.status === 'overdue' ? '! ZALEGŁA'
            : i.status === 'pending' ? '○ pending'
            : i.status;
        return `Rata #${i.installment_number}: ${i.amount} zł — termin ${i.due_date} — ${status}`;
    });
    return lines.join('\n');
}

function kindLabel(kind: string | null): string {
    const labels: Record<string, string> = {
        'nowa_sprawa': 'Nowa sprawa',
        'przystapienie_do_sprawy': 'Przystąpienie do sprawy',
        'przejeta_do_dalszego_prowadzenia': 'Sprawa przejęta do dalszego prowadzenia',
        'kontrola_legalnosci_pobytu_pracy': 'Kontrola legalności pobytu i pracy',
    };
    return labels[kind || ''] || kind || '';
}
