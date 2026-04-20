// Super admin (/admin.html) — dashboard dla właścicieli firmy
// Role guard: tylko role='owner' (Paweł, Tomek)
// Polling 30s w aktywnej zakładce

const db = window.db;

let currentTab = 'pulse';
let pollingTimer = null;
let ownerStaff = null;

// === INIT ===
document.addEventListener('gmp-auth-ready', async (e) => {
    const staff = e.detail.staff;
    // Admin panel: owner i admin (req Pawel pkt 5 - admin tez zarzadza kontami)
    if (!window.gmpAuth.hasPermission(staff, 'view_admin_panel')) {
        document.getElementById('access-denied').classList.remove('hidden');
        return;
    }
    ownerStaff = staff;
    document.getElementById('admin-content').classList.remove('hidden');
    document.getElementById('ah-owner-name').textContent = staff.full_name || staff.email;

    // Tab switching
    document.querySelectorAll('.admin-tab[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Initial load — respect URL hash (np. admin.html#staff)
    const hash = window.location.hash.replace('#', '');
    if (hash && ['pulse', 'staff', 'risk', 'finance', 'audit'].includes(hash)) {
        switchTab(hash);
    } else {
        await loadPulse();
        startPolling();
    }

    // Audit tab sub-switching
    window.switchAuditSub = (sub) => {
        document.querySelectorAll('[data-subtab]').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-subtab="${sub}"]`).classList.add('active');
        ['actions', 'credentials', 'logins'].forEach(s => {
            document.getElementById(`audit-${s}-sub`).style.display = s === sub ? '' : 'none';
        });
        if (sub === 'actions') loadAuditActions();
        if (sub === 'credentials') loadCredentialsLog();
        if (sub === 'logins') loadLoginHistory();
    };

    // Expose globals for onclick attrs
    window.refreshStaff = () => loadStaffPerf(true);
    window.refreshRisk = () => loadRisk(true);

    // Staff subtab switching
    window.switchStaffSub = (sub) => {
        document.querySelectorAll('[data-subtab]').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-subtab="${sub}"]`).classList.add('active');
        document.getElementById('staff-sub-manage').style.display = sub === 'manage' ? '' : 'none';
        document.getElementById('staff-sub-perf').style.display = sub === 'perf' ? '' : 'none';
        if (sub === 'manage') loadStaffManage();
        if (sub === 'perf') loadStaffPerf();
    };

    // Staff management globals
    window.openStaffManageModal = openStaffManageModal;
    window.saveStaffManage = saveStaffManage;
    window.toggleOverride = toggleOverride;
    window.deleteStaffAccount = deleteStaffAccount;
    window.sendPasswordResetForStaff = sendPasswordResetForStaff;
});

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.admin-tab[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
    stopPolling();

    if (tab === 'pulse') { loadPulse(); startPolling(); }
    else if (tab === 'staff') loadStaffManage(); // default: manage subpanel
    else if (tab === 'risk') { loadRisk(); startPolling(loadRisk); }
    else if (tab === 'finance') loadFinance();
    else if (tab === 'audit') loadAuditActions();
}

function startPolling(fn) {
    stopPolling();
    pollingTimer = setInterval(() => {
        if (document.hidden) return; // oszczędzamy gdy tab ukryty
        if (fn) fn();
        else if (currentTab === 'pulse') loadPulse();
        else if (currentTab === 'risk') loadRisk();
    }, 30000);
}
function stopPolling() { if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; } }

// === PANEL 1: LIVE PULSE ===
async function loadPulse() {
    // KPIs dzisiaj
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [newCasesTodayR, newCasesYestR, actTodayR, actYestR, tasksTodayR, tasksYestR, streamR, staffR] = await Promise.all([
        db.from('gmp_cases').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        db.from('gmp_cases').select('id', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString()),
        db.from('gmp_case_activities').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        db.from('gmp_case_activities').select('id', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString()),
        db.from('gmp_tasks').select('id', { count: 'exact', head: true }).gte('completed_at', today.toISOString()),
        db.from('gmp_tasks').select('id', { count: 'exact', head: true }).gte('completed_at', yesterday.toISOString()).lt('completed_at', today.toISOString()),
        db.from('gmp_live_activity').select('*').order('created_at', { ascending: false }).limit(50),
        db.from('gmp_staff').select('id, full_name, email, role, last_login_at').not('last_login_at', 'is', null).gte('last_login_at', new Date(Date.now() - 10 * 60 * 1000).toISOString()),
    ]);

    setKpi('k-new-cases-today', newCasesTodayR.count || 0, newCasesYestR.count || 0, 'vs wczoraj');
    setKpi('k-activities-today', actTodayR.count || 0, actYestR.count || 0, 'vs wczoraj');
    setKpi('k-tasks-done-today', tasksTodayR.count || 0, tasksYestR.count || 0, 'vs wczoraj');

    const onlineCount = staffR.data?.length || 0;
    document.getElementById('k-online-now').textContent = onlineCount;

    renderStream(streamR.data || []);
}

function setKpi(id, value, prevValue, subLabel) {
    document.getElementById(id).textContent = value.toLocaleString('pl-PL');
    const sub = document.getElementById(id + '-sub') || document.getElementById(id.replace(/today$/, 'sub'));
    if (!sub) return;
    const diff = value - prevValue;
    const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
    const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : '';
    sub.className = 'k-sub ' + cls;
    sub.innerHTML = `<span>${arrow} ${Math.abs(diff)} ${subLabel}</span>`;
}

function renderStream(items) {
    const el = document.getElementById('stream-body');
    if (!items.length) {
        el.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-tertiary)">Brak aktywności</div>';
        return;
    }
    el.innerHTML = items.map(i => {
        const name = i.staff_name || 'System';
        const initials = (name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
        const colorIdx = hashCode(name) % 5;
        const actionLabel = formatAction(i.action);
        const entity = i.entity_label ? `<span class="stream-entity">${esc(i.entity_label)}</span>` : '';
        const time = timeAgo(i.created_at);
        return `<div class="stream-item">
            <div class="stream-avatar color-${colorIdx}">${initials}</div>
            <div class="stream-main">
                <span class="stream-actor">${esc(name)}</span>
                <span class="stream-action">${actionLabel}</span>
                ${entity}
            </div>
            <div class="stream-time">${time}</div>
        </div>`;
    }).join('');
}

function formatAction(action) {
    const map = {
        status_change: 'zmienił status',
        stage_change: 'zmienił etap',
        note: 'dodał notatkę',
        document_added: 'dodał dokument',
        task_assigned: 'przypisał zadanie',
        email_sent: 'wysłał email',
        whatsapp_sent: 'napisał na WhatsApp',
        payment_received: 'otrzymał płatność',
        appointment_created: 'umówił termin',
        decision_received: 'otrzymał decyzję',
        case_delete: 'USUNĄŁ sprawę',
        client_delete: 'USUNĄŁ klienta',
        intake_delete: 'USUNĄŁ ankietę',
        credential_view: 'podejrzał hasła',
        credential_create: 'dodał hasła',
        role_change: 'zmienił rolę',
        export_data: 'wyeksportował dane',
        intake_approved: 'zatwierdził ankietę',
        intake_submitted: 'ankieta wypełniona przez klienta',
        intake_rejected: 'odrzucił ankietę',
    };
    return map[action] || action;
}

// === PANEL 2: STAFF PERFORMANCE ===
async function loadStaffPerf(forceRefresh = false) {
    const btn = document.getElementById('staff-refresh-btn');
    if (btn) btn.classList.add('refreshing');

    const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
    const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

    const [staffR, casesR, activitiesR, paymentsR, tasksOverdueR] = await Promise.all([
        db.from('gmp_staff').select('id, full_name, email, role, last_login_at').order('full_name'),
        db.from('gmp_cases').select('id, status, assigned_to, date_last_activity, fee_amount, created_at'),
        db.from('gmp_case_activities').select('created_by, created_at').gte('created_at', since7d),
        db.from('gmp_payments').select('amount, payment_date, case_id').gte('payment_date', since30d),
        db.from('gmp_tasks').select('assigned_to, due_date, completed_at').is('completed_at', null).lt('due_date', new Date().toISOString()),
    ]);

    const staff = staffR.data || [];
    const cases = casesR.data || [];
    const activities = activitiesR.data || [];
    const payments = paymentsR.data || [];
    const overdueTasks = tasksOverdueR.data || [];

    // Przychód per staff: payment → case → assigned_to
    const caseToStaff = {};
    cases.forEach(c => { if (c.assigned_to) caseToStaff[c.id] = c.assigned_to; });
    const revenueBy = {};
    payments.forEach(p => {
        const sid = caseToStaff[p.case_id];
        if (sid) revenueBy[sid] = (revenueBy[sid] || 0) + Number(p.amount || 0);
    });

    // Metryki
    const rows = staff.map(s => {
        const activeCases = cases.filter(c => c.assigned_to === s.id && ['zlecona', 'aktywna'].includes(c.status)).length;
        // "Zamknięte w 30d" — aproksymacja: status='zakonczona' + ostatnia aktywność w 30d (konwencja z analytics.html)
        const closed30 = cases.filter(c => c.assigned_to === s.id && c.status === 'zakonczona' && c.date_last_activity && new Date(c.date_last_activity) >= new Date(since30d)).length;
        const acts7 = activities.filter(a => a.created_by === s.id).length;
        const overdue = overdueTasks.filter(t => t.assigned_to === s.id).length;
        const revenue = revenueBy[s.id] || 0;
        // Score: (closed × 3) + (acts × 0.1) − (overdue × 5), zaokrąglone do 0-100
        const rawScore = (closed30 * 3) + (acts7 * 0.1) - (overdue * 5);
        const score = Math.max(0, Math.min(100, Math.round(rawScore + 30))); // +30 baseline
        const lastLogin = s.last_login_at ? timeAgo(s.last_login_at) : 'nigdy';
        const online = s.last_login_at && (Date.now() - new Date(s.last_login_at).getTime()) < 10 * 60 * 1000;
        return { s, activeCases, closed30, revenue, acts7, overdue, score, lastLogin, online };
    })
    .filter(r => r.s.role !== 'staff' || r.activeCases > 0 || r.acts7 > 0) // pomiń zupełnie nieaktywne staff
    .sort((a, b) => b.score - a.score);

    const tbody = document.getElementById('staff-perf-body');
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-tertiary); padding: 30px">Brak danych</td></tr>';
    } else {
        tbody.innerHTML = rows.map(r => {
            const initials = (r.s.full_name || r.s.email || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
            const scoreClass = r.score >= 70 ? 'good' : r.score >= 40 ? 'mid' : 'bad';
            return `<tr>
                <td>
                    <div class="staff-name-cell">
                        <div class="staff-avatar-sm ${r.online ? 'online' : ''}">${initials}</div>
                        <div>
                            <div class="n">${esc(r.s.full_name || r.s.email)}</div>
                            <div class="role">${r.s.role}</div>
                        </div>
                    </div>
                </td>
                <td style="text-align: right" class="mono-num">${r.activeCases}</td>
                <td style="text-align: right" class="mono-num">${r.closed30}</td>
                <td style="text-align: right" class="mono-num">${r.revenue.toLocaleString('pl-PL')} zł</td>
                <td style="text-align: right" class="mono-num">${r.acts7}</td>
                <td style="text-align: right" class="mono-num" style="color: ${r.overdue > 0 ? '#fca5a5' : 'inherit'}">${r.overdue}</td>
                <td style="text-align: right; color: var(--text-tertiary); font-size: 11px">${r.lastLogin}</td>
                <td style="text-align: right"><span class="activity-score ${scoreClass}"><span class="score-dot"></span>${r.score}</span></td>
            </tr>`;
        }).join('');
    }

    if (btn) btn.classList.remove('refreshing');
}

// === PANEL 3: RISK BOARD ===
async function loadRisk(forceRefresh = false) {
    const btn = document.getElementById('risk-refresh-btn');
    if (btn) btn.classList.add('refreshing');

    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const d14 = new Date(now.getTime() - 14 * 86400000);
    const d7 = new Date(now.getTime() - 7 * 86400000);
    const d3 = new Date(now.getTime() - 3 * 86400000);
    const d2 = new Date(now.getTime() - 2 * 86400000);

    const [casesR, invoicesR, intakesR] = await Promise.all([
        db.from('gmp_cases').select(`
            id, case_number, status, stage, date_last_activity, inactivity_reason, assigned_to,
            gmp_clients(first_name, last_name),
            gmp_staff:assigned_to(full_name)
        `).in('status', ['zlecona', 'aktywna']).order('date_last_activity', { ascending: true, nullsFirst: true }),
        db.from('gmp_invoices').select(`
            id, invoice_number, issue_date, amount, status, case_id,
            gmp_cases(case_number, gmp_clients(first_name, last_name))
        `).in('status', ['issued', 'sent']),
        db.from('gmp_intake_tokens').select(`
            id, status, submitted_at, created_at, case_id,
            gmp_cases(case_number, gmp_clients(first_name, last_name))
        `).eq('status', 'submitted'),
    ]);

    const critical = [];
    const warning = [];
    const attention = [];

    // Sprawy bez aktywności
    (casesR.data || []).forEach(c => {
        const lastAct = c.date_last_activity ? new Date(c.date_last_activity) : null;
        if (!lastAct) return;
        const client = c.gmp_clients ? `${c.gmp_clients.first_name || ''} ${c.gmp_clients.last_name || ''}`.trim() : '';
        const lawyer = c.gmp_staff?.full_name || '—';
        const daysIdle = Math.floor((now - lastAct) / 86400000);
        const base = {
            title: `${c.case_number || c.id.slice(0, 6)} · ${client}`,
            href: `case.html?id=${c.id}`,
            meta: [`Etap: <b>${c.stage || '—'}</b>`, `Prawnik: <b>${lawyer}</b>`, `Cisza <b>${daysIdle} dni</b>`],
        };
        if (daysIdle > 30) critical.push(base);
        else if (daysIdle > 14) warning.push(base);
    });

    // Faktury overdue
    (invoicesR.data || []).forEach(inv => {
        const issueDate = inv.issue_date ? new Date(inv.issue_date) : null;
        if (!issueDate) return;
        const daysOverdue = Math.floor((now - issueDate) / 86400000);
        if (daysOverdue < 14) return;
        const client = inv.gmp_cases?.gmp_clients
            ? `${inv.gmp_cases.gmp_clients.first_name || ''} ${inv.gmp_cases.gmp_clients.last_name || ''}`.trim()
            : '';
        const base = {
            title: `Faktura ${inv.invoice_number} · ${client}`,
            href: `case.html?id=${inv.case_id}&tab=finance`,
            meta: [`Kwota <b>${Number(inv.amount || 0).toLocaleString('pl-PL')} zł</b>`, `<b>${daysOverdue} dni</b> przeterminowana`],
        };
        if (daysOverdue > 60) critical.push(base);
        else if (daysOverdue > 30) warning.push(base);
        else attention.push(base);
    });

    // Intake submitted > 48h bez review
    (intakesR.data || []).forEach(it => {
        if (!it.submitted_at) return;
        const submittedDate = new Date(it.submitted_at);
        const hoursIdle = (now - submittedDate) / 3600000;
        if (hoursIdle < 48) return;
        const client = it.gmp_cases?.gmp_clients
            ? `${it.gmp_cases.gmp_clients.first_name || ''} ${it.gmp_cases.gmp_clients.last_name || ''}`.trim()
            : '';
        const base = {
            title: `Ankieta do zatwierdzenia · ${client}`,
            href: `case.html?id=${it.case_id}&tab=intake`,
            meta: [`<b>${Math.floor(hoursIdle)}h</b> czeka na review`],
        };
        attention.push(base);
    });

    renderRiskCol('critical', critical);
    renderRiskCol('warning', warning);
    renderRiskCol('attention', attention);

    document.getElementById('cnt-risk').textContent = critical.length + warning.length;
    if (btn) btn.classList.remove('refreshing');
}

function renderRiskCol(key, items) {
    const wrap = document.getElementById(`risk-${key}`);
    const countEl = document.getElementById(`risk-${key}-count`);
    countEl.textContent = items.length;
    if (!items.length) {
        wrap.innerHTML = `<div style="padding: 30px 16px; text-align: center; color: var(--text-tertiary); font-size: 12px">✓ Nic do pokazania</div>`;
        return;
    }
    wrap.innerHTML = items.slice(0, 30).map(it => `
        <a class="risk-item" href="${it.href}" style="display: block; text-decoration: none; color: inherit">
            <div class="ri-title">${esc(it.title)}</div>
            <div class="ri-meta">${it.meta.map(m => `<span>${m}</span>`).join('')}</div>
        </a>
    `).join('');
}

// === PANEL 4: FINANCE ===
async function loadFinance() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = monthStart;
    const d14 = new Date(now.getTime() - 14 * 86400000);

    const [activeCasesR, paymentsThisMonthR, paymentsLastMonthR, overdueR, collectionsR, paymentsHistoryR, staffR] = await Promise.all([
        db.from('gmp_cases').select('fee_amount').in('status', ['zlecona', 'aktywna']),
        // MRR = wynagrodzenie (bez oplat administracyjnych)
        db.from('gmp_payments').select('amount').neq('kind', 'admin_fee').gte('payment_date', monthStart.toISOString().slice(0, 10)),
        db.from('gmp_payments').select('amount').neq('kind', 'admin_fee').gte('payment_date', prevMonthStart.toISOString().slice(0, 10)).lt('payment_date', prevMonthEnd.toISOString().slice(0, 10)),
        db.from('gmp_invoices').select(`
            id, invoice_number, amount, issue_date, status, case_id,
            gmp_cases(case_number, assigned_to, gmp_clients(first_name, last_name), gmp_staff:assigned_to(full_name))
        `).in('status', ['issued', 'sent']).lt('issue_date', d14.toISOString().slice(0, 10)),
        db.from('gmp_collections').select('total_due, amount_recovered'),
        db.from('gmp_payments').select('amount, payment_date, case_id').gte('payment_date', new Date(now.getFullYear(), now.getMonth() - 12, 1).toISOString().slice(0, 10)),
        db.from('gmp_staff').select('id, full_name'),
    ]);

    const pipeline = (activeCasesR.data || []).reduce((s, c) => s + Number(c.fee_amount || 0), 0);
    const mrr = (paymentsThisMonthR.data || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const mrrPrev = (paymentsLastMonthR.data || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const mrrDelta = mrrPrev > 0 ? Math.round(((mrr - mrrPrev) / mrrPrev) * 100) : 0;

    const totalDue = (collectionsR.data || []).reduce((s, c) => s + Number(c.total_due || 0), 0);
    const recovered = (collectionsR.data || []).reduce((s, c) => s + Number(c.amount_recovered || 0), 0);
    const collectionRate = totalDue > 0 ? Math.round((recovered / totalDue) * 100) : 0;

    const overdueTotal = (overdueR.data || []).reduce((s, inv) => s + Number(inv.amount || 0), 0);

    document.getElementById('k-pipeline').textContent = (pipeline / 1000).toFixed(0) + 'k zł';
    document.getElementById('k-pipeline-sub').textContent = `${(activeCasesR.data || []).length} aktywnych`;
    document.getElementById('k-mrr').textContent = mrr.toLocaleString('pl-PL') + ' zł';
    document.getElementById('k-mrr-sub').className = `k-sub ${mrrDelta > 0 ? 'up' : mrrDelta < 0 ? 'down' : ''}`;
    document.getElementById('k-mrr-sub').textContent = `${mrrDelta > 0 ? '↑' : mrrDelta < 0 ? '↓' : '→'} ${Math.abs(mrrDelta)}% vs poprzedni`;
    document.getElementById('k-collection-rate').textContent = collectionRate + '%';
    document.getElementById('k-collection-sub').textContent = `${recovered.toLocaleString('pl-PL')} zł z ${totalDue.toLocaleString('pl-PL')} zł`;
    document.getElementById('k-overdue').textContent = overdueTotal.toLocaleString('pl-PL') + ' zł';
    document.getElementById('k-overdue-sub').textContent = `${(overdueR.data || []).length} faktur`;

    // Top overdue invoices
    const overdueBody = document.getElementById('overdue-invoices-body');
    const sortedOverdue = (overdueR.data || [])
        .sort((a, b) => new Date(a.issue_date) - new Date(b.issue_date))
        .slice(0, 10);
    if (sortedOverdue.length === 0) {
        overdueBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-tertiary); padding: 20px">✓ Brak przeterminowanych</td></tr>';
    } else {
        overdueBody.innerHTML = sortedOverdue.map(inv => {
            const days = Math.floor((Date.now() - new Date(inv.issue_date).getTime()) / 86400000);
            const client = inv.gmp_cases?.gmp_clients ? `${inv.gmp_cases.gmp_clients.first_name || ''} ${inv.gmp_cases.gmp_clients.last_name || ''}`.trim() : '—';
            const lawyer = inv.gmp_cases?.gmp_staff?.full_name || '—';
            return `<tr>
                <td><a href="case.html?id=${inv.case_id}&tab=finance" style="color: #a5b4fc">${esc(inv.invoice_number)}</a></td>
                <td>${esc(client)}</td>
                <td class="mono-num" style="text-align: right">${Number(inv.amount || 0).toLocaleString('pl-PL')} zł</td>
                <td class="mono-num" style="text-align: right; color: ${days > 60 ? '#fca5a5' : days > 30 ? '#fcd34d' : 'inherit'}">${days}</td>
                <td>${esc(lawyer)}</td>
                <td style="color: var(--text-tertiary); font-size: 11px">—</td>
            </tr>`;
        }).join('');
    }

    // Chart: revenue per staff per month
    renderFinanceChart(paymentsHistoryR.data || [], staffR.data || []);
}

let financeChart = null;
function renderFinanceChart(payments, staff) {
    const ctx = document.getElementById('fin-chart');
    if (!ctx) return;

    // Get cases with assignments to map payments → staff
    db.from('gmp_cases').select('id, assigned_to').then(({ data: cases }) => {
        const caseToStaff = {};
        (cases || []).forEach(c => { if (c.assigned_to) caseToStaff[c.id] = c.assigned_to; });

        // Group payments by month + staff
        const monthly = {}; // { 'YYYY-MM': { staffId: sum } }
        const now = new Date();
        const months = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toISOString().slice(0, 7);
            months.push(key);
            monthly[key] = {};
        }
        payments.forEach(p => {
            const key = p.payment_date?.slice(0, 7);
            if (!key || !monthly[key]) return;
            const sid = caseToStaff[p.case_id] || 'unassigned';
            monthly[key][sid] = (monthly[key][sid] || 0) + Number(p.amount || 0);
        });

        // Aktywni prawnicy (mający jakikolwiek przychód w okresie)
        const activeStaffIds = new Set();
        Object.values(monthly).forEach(m => Object.keys(m).forEach(k => activeStaffIds.add(k)));
        const staffMap = {};
        staff.forEach(s => { staffMap[s.id] = s.full_name || 'Staff'; });
        staffMap['unassigned'] = 'Nieprzypisane';

        const palette = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#a855f7', '#3b82f6'];
        const datasets = [...activeStaffIds].slice(0, 9).map((sid, i) => ({
            label: staffMap[sid] || sid.slice(0, 6),
            data: months.map(m => monthly[m][sid] || 0),
            backgroundColor: palette[i % palette.length],
            borderRadius: 4,
        }));

        if (financeChart) financeChart.destroy();
        financeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months.map(m => {
                    const [y, mo] = m.split('-');
                    return ['sty','lut','mar','kwi','maj','cze','lip','sie','wrz','paź','lis','gru'][parseInt(mo) - 1] + ' ' + y.slice(2);
                }),
                datasets,
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { color: '#a1a1aa', font: { size: 11 } } },
                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('pl-PL')} zł` } },
                },
                scales: {
                    x: { stacked: true, ticks: { color: '#71717a' }, grid: { display: false } },
                    y: { stacked: true, ticks: { color: '#71717a', callback: v => (v/1000) + 'k' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                },
            },
        });
    });
}

// === PANEL 5: AUDIT ===
async function loadAuditActions() {
    const { data } = await db.from('gmp_audit_log').select('*').order('created_at', { ascending: false }).limit(100);
    const tbody = document.getElementById('audit-actions-body');
    if (!data?.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-tertiary); padding: 20px">Brak wpisów — to dobrze! Pojawia się gdy ktoś coś usunie lub zmieni rolę.</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(row => `<tr>
        <td style="color: var(--text-tertiary); white-space: nowrap">${fmtDateTime(row.created_at)}</td>
        <td>${esc(row.staff_name || '—')}</td>
        <td style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #c4b5fd">${esc(row.action)}</td>
        <td>${esc(row.entity_label || row.entity_type || '—')}</td>
        <td><span class="audit-severity ${row.severity}">${row.severity}</span></td>
    </tr>`).join('');
}

async function loadCredentialsLog() {
    const { data } = await db.from('gmp_credentials_access_log')
        .select(`*, gmp_staff!accessed_by(full_name, email), gmp_trusted_profile_credentials(gmp_clients(first_name, last_name))`)
        .order('accessed_at', { ascending: false }).limit(100);
    const tbody = document.getElementById('audit-credentials-body');
    if (!data?.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-tertiary); padding: 20px">Brak dostępów do haseł</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(row => {
        const client = row.gmp_trusted_profile_credentials?.gmp_clients
            ? `${row.gmp_trusted_profile_credentials.gmp_clients.first_name || ''} ${row.gmp_trusted_profile_credentials.gmp_clients.last_name || ''}`.trim()
            : '—';
        return `<tr>
            <td style="color: var(--text-tertiary); white-space: nowrap">${fmtDateTime(row.accessed_at)}</td>
            <td>${esc(row.gmp_staff?.full_name || row.gmp_staff?.email || '—')}</td>
            <td style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #fcd34d">${esc(row.action)}</td>
            <td>${esc(client)}</td>
            <td style="color: var(--text-tertiary); font-size: 11px">${esc(row.ip_address || '—')}</td>
        </tr>`;
    }).join('');
}

async function loadLoginHistory() {
    const { data } = await db.from('gmp_staff').select('id, full_name, email, role, last_login_at, login_count').order('last_login_at', { ascending: false, nullsFirst: false });
    const tbody = document.getElementById('audit-logins-body');
    if (!data?.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-tertiary); padding: 20px">Brak danych</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(s => {
        const days = s.last_login_at ? Math.floor((Date.now() - new Date(s.last_login_at).getTime()) / 86400000) : null;
        const dayCls = days === null ? '' : days > 30 ? 'color: #fca5a5' : days > 14 ? 'color: #fcd34d' : '';
        return `<tr>
            <td>${esc(s.full_name || '—')}</td>
            <td style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase">${s.role}</td>
            <td style="color: var(--text-tertiary)">${esc(s.email)}</td>
            <td style="text-align: right" class="mono-num">${s.login_count || 0}</td>
            <td style="text-align: right; color: var(--text-tertiary); font-size: 11px">${s.last_login_at ? fmtDateTime(s.last_login_at) : 'nigdy'}</td>
            <td style="text-align: right; ${dayCls}" class="mono-num">${days !== null ? days + ' dni' : '—'}</td>
        </tr>`;
    }).join('');
}

// === UTILS ===
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function hashCode(s) { let h = 0; for (let i = 0; i < (s || '').length; i++) h = ((h << 5) - h) + s.charCodeAt(i); return Math.abs(h); }
function timeAgo(ts) {
    if (!ts) return '—';
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.round(diff / 60000);
    if (m < 1) return 'teraz';
    if (m < 60) return m + ' min temu';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' godz. temu';
    const d = Math.round(h / 24);
    if (d < 30) return d + ' dni temu';
    const mo = Math.round(d / 30);
    return mo + ' msc temu';
}
function fmtDateTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// PANEL 2b: STAFF MANAGEMENT (req Pawel - pelny modul zespolu)
// ============================================================
const PERMISSION_LABELS = {
    view_global_finance: 'Dostęp do globalnych finansów (Płatności, Windykacja, Faktury)',
    view_analytics: 'Dostęp do analityki',
    view_team_performance: 'Dostęp do modułu "Prawnicy" (wydajność zespołu)',
    view_admin_panel: 'Dostęp do panelu Super Admin',
    delete_case: 'Usuwanie spraw',
    delete_client: 'Usuwanie klientów',
    delete_staff: 'Usuwanie pracowników',
    delete_payment: 'Usuwanie wpłat',
    manage_staff_accounts: 'Zarządzanie kontami pracowników (ta sekcja)',
    edit_case: 'Edycja spraw',
    archive_case: 'Archiwizacja spraw',
    edit_payment: 'Dodawanie/edycja wpłat',
    edit_task: 'Zadania (dodaj/edytuj/zakończ)',
    edit_appointment: 'Terminy (dodaj/edytuj)',
};

async function loadStaffManage() {
    const { data: staff, error } = await db.from('gmp_staff')
        .select('id, full_name, email, phone, role, is_active, last_login_at, login_count, user_id, permission_overrides, color')
        .order('full_name');
    const tbody = document.getElementById('staff-manage-body');
    if (error) { tbody.innerHTML = `<tr><td colspan="8" style="color: #ef4444; padding: 20px">${esc(error.message)}</td></tr>`; return; }
    if (!staff?.length) { tbody.innerHTML = '<tr><td colspan="8" style="padding: 20px; text-align: center; color: var(--text-tertiary)">Brak pracowników</td></tr>'; return; }

    const ROLE_LABELS = { owner: 'Właściciel', admin: 'Admin', manager: 'Nadzór', lawyer: 'Prawnik', assistant: 'Asystent', staff: 'Pracownik' };
    tbody.innerHTML = staff.map(s => {
        const overrideCount = Object.keys(s.permission_overrides || {}).length;
        const lastLogin = s.last_login_at ? fmtDateTime(s.last_login_at) : '—';
        return `<tr>
            <td><div style="display: flex; align-items: center; gap: 10px">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${s.color || '#3b82f6'}"></span>
                <div>
                    <div style="font-weight: 600">${esc(s.full_name)}</div>
                    <div style="font-size: 11px; color: var(--text-tertiary)">${s.phone ? esc(s.phone) : ''}</div>
                </div>
            </div></td>
            <td style="font-size: 12px; color: var(--text-secondary)">${esc(s.email || '—')}</td>
            <td><span class="badge" style="font-size: 10px; padding: 3px 8px; background: rgba(99,102,241,0.15); border: 1px solid var(--accent-border); border-radius: 999px; color: #c4b5fd">${ROLE_LABELS[s.role] || s.role}</span></td>
            <td style="text-align: center">${s.user_id
                ? '<span style="color: #10b981"><i class="ph ph-check-circle"></i> aktywne</span>'
                : '<span style="color: var(--text-tertiary)"><i class="ph ph-x-circle"></i> brak</span>'}</td>
            <td style="text-align: center">${s.is_active
                ? '<span style="color: #10b981"><i class="ph ph-check"></i></span>'
                : '<span style="color: #ef4444"><i class="ph ph-x"></i></span>'}</td>
            <td style="text-align: center">${overrideCount > 0
                ? `<span style="color: #f59e0b"><i class="ph ph-star"></i> ${overrideCount}</span>`
                : '<span style="color: var(--text-tertiary)">—</span>'}</td>
            <td style="text-align: right; color: var(--text-tertiary); font-size: 11px">${lastLogin}</td>
            <td style="text-align: right"><button class="refresh-btn" style="padding: 5px 10px; font-size: 11px" onclick="openStaffManageModal('${s.id}')"><i class="ph ph-pencil-simple"></i> Edytuj</button></td>
        </tr>`;
    }).join('');
}

async function openStaffManageModal(id) {
    let s = {
        full_name: '', email: '', phone: '', role: 'staff', is_active: true,
        color: '#3b82f6', permission_overrides: {}, aliases: [],
    };
    if (id) {
        const { data } = await db.from('gmp_staff').select('*').eq('id', id).maybeSingle();
        if (data) s = { ...s, ...data };
    }
    const overrides = s.permission_overrides || {};
    const ROLE_OPTS = [
        ['staff', 'Pracownik'],
        ['assistant', 'Asystent'],
        ['lawyer', 'Prawnik'],
        ['manager', 'Nadzór (Wiktoria/Oleksandr)'],
        ['admin', 'Admin'],
        ['owner', 'Właściciel'],
    ];

    const hasAccount = !!s.user_id;
    const currentRole = s.role || 'staff';

    const permRows = Object.entries(PERMISSION_LABELS).map(([key, label]) => {
        const roleDefault = window.gmpAuth.getRoleDefaultForPermission(currentRole, key);
        const hasOverride = Object.prototype.hasOwnProperty.call(overrides, key);
        const effective = hasOverride ? !!overrides[key] : roleDefault;
        return `<tr data-perm="${key}">
            <td style="padding: 8px 10px; font-size: 12px">${esc(label)}</td>
            <td style="padding: 8px 10px; text-align: center; font-size: 11px; color: var(--text-tertiary)">${roleDefault ? '✓ tak' : '✗ nie'}</td>
            <td style="padding: 8px 10px; text-align: center">
                <label style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; cursor: pointer">
                    <input type="checkbox" class="perm-override" data-perm="${key}" ${hasOverride ? 'checked' : ''} onchange="toggleOverride('${key}')">
                    <span>Nadpisz</span>
                </label>
            </td>
            <td style="padding: 8px 10px; text-align: center">
                <select class="perm-value" data-perm="${key}" ${!hasOverride ? 'disabled' : ''} style="padding: 3px 6px; background: var(--surface); border: 1px solid var(--border); color: var(--text); border-radius: 4px; font-size: 11px">
                    <option value="true" ${effective === true ? 'selected' : ''}>✓ Pozwól</option>
                    <option value="false" ${effective === false ? 'selected' : ''}>✗ Zabroń</option>
                </select>
            </td>
        </tr>`;
    }).join('');

    const modalHtml = `
        <div class="modal-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center">
            <h3 style="margin: 0; font-size: 16px">${id ? 'Edytuj pracownika' : 'Nowy pracownik'}</h3>
            <button onclick="gmpModal.close()" style="background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-size: 20px"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body" style="padding: 20px; max-height: 70vh; overflow-y: auto">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px">
                <div><label style="display: block; font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px">Imię i nazwisko *</label>
                    <input id="sm-name" class="input" value="${esc(s.full_name || '')}" autofocus></div>
                <div><label style="display: block; font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px">Email (wymagany do zaproszenia)</label>
                    <input type="email" id="sm-email" class="input" value="${esc(s.email || '')}"></div>
                <div><label style="display: block; font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px">Telefon</label>
                    <input id="sm-phone" class="input" value="${esc(s.phone || '')}"></div>
                <div><label style="display: block; font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px">Rola (domyślny profil uprawnień)</label>
                    <select id="sm-role" class="input" onchange="gmpAdminRoleChanged()">
                        ${ROLE_OPTS.map(([v, l]) => `<option value="${v}" ${v === currentRole ? 'selected' : ''}>${l}</option>`).join('')}
                    </select></div>
                <div><label style="display: block; font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px">Kolor</label>
                    <input type="color" id="sm-color" class="input" value="${s.color || '#3b82f6'}" style="padding: 3px; height: 36px"></div>
                <div><label style="display: block; font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px">Aktywny</label>
                    <select id="sm-active" class="input">
                        <option value="true" ${s.is_active !== false ? 'selected' : ''}>Tak</option>
                        <option value="false" ${s.is_active === false ? 'selected' : ''}>Nie</option>
                    </select></div>
                <div style="grid-column: span 2"><label style="display: block; font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px">Aliasy (imiona z arkuszy Pawła, po przecinku)</label>
                    <input id="sm-aliases" class="input" value="${esc((s.aliases || []).join(', '))}"></div>
            </div>

            <!-- Account -->
            <div style="padding: 12px; background: rgba(99,102,241,0.05); border: 1px solid var(--accent-border); border-radius: 8px; margin-bottom: 16px">
                <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px; color: #c4b5fd"><i class="ph ph-key"></i> Konto w systemie</div>
                ${hasAccount
                    ? `<div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; font-size: 12px">
                            <span style="color: #10b981"><i class="ph ph-check-circle"></i> Konto aktywne</span>
                            <span style="color: var(--text-tertiary); margin: 0 4px">·</span>
                            <button class="refresh-btn" style="padding: 5px 10px; font-size: 11px" onclick="regenerateAccessLink('${id}', '${esc(s.email || '')}', '${esc(s.full_name || '')}', '${esc(s.role || 'staff')}')"><i class="ph ph-link"></i> Wygeneruj link</button>
                            <button class="refresh-btn" style="padding: 5px 10px; font-size: 11px" onclick="gmpSetPasswordForExisting('${id}', '${esc(s.email || '')}', '${esc(s.full_name || '')}', '${esc(s.role || 'staff')}')"><i class="ph ph-key"></i> Ustaw nowe hasło</button>
                        </div>
                        <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 6px">Link = pracownik sam ustawi hasło. Hasło = ustawiasz i przekazujesz kanałem zaufanym.</div>`
                    : `<div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px">Brak konta. Po zapisie utworzę konto w systemie.</div>
                       <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; margin-bottom: 8px">
                           <input type="checkbox" id="sm-invite" ${s.email ? 'checked' : ''} onchange="gmpToggleInviteOpts()">
                           Utwórz konto po zapisie
                       </label>
                       <div id="sm-invite-opts" style="margin-left: 22px; display: ${s.email ? 'block' : 'none'}">
                           <div style="display: flex; gap: 14px; font-size: 12px; margin-bottom: 8px">
                               <label style="display: flex; align-items: center; gap: 5px; cursor: pointer">
                                   <input type="radio" name="sm-access-mode" value="link" checked onchange="gmpToggleAccessMode()">
                                   Link resetujący (pracownik sam ustawi hasło)
                               </label>
                               <label style="display: flex; align-items: center; gap: 5px; cursor: pointer">
                                   <input type="radio" name="sm-access-mode" value="password" onchange="gmpToggleAccessMode()">
                                   Ustaw hasło teraz
                               </label>
                           </div>
                           <div id="sm-password-row" style="display: none">
                               <div style="display: flex; gap: 6px; align-items: center">
                                   <input id="sm-password" class="input" type="text" placeholder="min. 12 znaków" style="flex: 1; font-family: 'JetBrains Mono', monospace; font-size: 12px" autocomplete="new-password">
                                   <button type="button" class="refresh-btn" style="padding: 6px 10px; font-size: 11px" onclick="gmpGenPasswordInto('sm-password')"><i class="ph ph-arrows-clockwise"></i> Generuj 16</button>
                               </div>
                               <div style="font-size: 11px; color: #f59e0b; margin-top: 6px">
                                   <i class="ph ph-warning-circle"></i> Hasło pokaże się raz po zapisie. Przekaż pracownikowi kanałem zaufanym (Signal/WhatsApp), nie emailem razem z loginem.
                               </div>
                           </div>
                       </div>`}
            </div>

            <!-- Permissions -->
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px"><i class="ph ph-shield"></i> Uprawnienia — nadpisz indywidualnie</div>
            <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 10px">Domyślnie pracownik dziedziczy uprawnienia z roli. Możesz nadpisać każdą pozycję (np. dać pracownikowi dostęp do faktur nie zmieniając mu roli).</div>
            <div style="overflow-x: auto; border: 1px solid var(--border); border-radius: 8px">
                <table style="width: 100%; font-size: 12px">
                    <thead style="background: var(--bg-secondary)">
                        <tr>
                            <th style="text-align: left; padding: 8px 10px">Uprawnienie</th>
                            <th style="text-align: center; padding: 8px 10px">Domyślnie (z roli)</th>
                            <th style="text-align: center; padding: 8px 10px">Nadpisz</th>
                            <th style="text-align: center; padding: 8px 10px">Wartość</th>
                        </tr>
                    </thead>
                    <tbody id="sm-perm-body">${permRows}</tbody>
                </table>
            </div>
        </div>
        <div class="modal-footer" style="padding: 14px 20px; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: space-between">
            <div style="display: flex; gap: 6px">${id ? `
                ${hasAccount ? `<button class="refresh-btn" style="background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #ef4444" onclick="deleteStaffAccount('${id}', '${esc(s.full_name)}')"><i class="ph ph-power"></i> Dezaktywuj</button>` : ''}
                <button class="refresh-btn" style="background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.5); color: #ef4444; font-weight: 600" onclick="hardDeleteStaff('${id}', '${esc(s.full_name)}', ${hasAccount})"><i class="ph ph-trash"></i> Usuń całkowicie</button>
            ` : ''}</div>
            <div style="display: flex; gap: 8px">
                <button class="refresh-btn" onclick="gmpModal.close()">Anuluj</button>
                <button class="refresh-btn" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none" onclick="saveStaffManage('${id || ''}')">${id ? 'Zapisz' : 'Dodaj'}</button>
            </div>
        </div>`;
    gmpModal.openModal(modalHtml);
}

window.gmpAdminRoleChanged = function() {
    const role = document.getElementById('sm-role').value;
    document.querySelectorAll('#sm-perm-body tr').forEach(tr => {
        const perm = tr.dataset.perm;
        const def = window.gmpAuth.getRoleDefaultForPermission(role, perm);
        const defCell = tr.children[1];
        if (defCell) defCell.textContent = def ? '✓ tak' : '✗ nie';
    });
};

function toggleOverride(perm) {
    const cb = document.querySelector(`.perm-override[data-perm="${perm}"]`);
    const sel = document.querySelector(`.perm-value[data-perm="${perm}"]`);
    if (!cb || !sel) return;
    sel.disabled = !cb.checked;
    if (!cb.checked) {
        const role = document.getElementById('sm-role').value;
        sel.value = window.gmpAuth.getRoleDefaultForPermission(role, perm) ? 'true' : 'false';
    }
}

async function saveStaffManage(id) {
    const name = document.getElementById('sm-name').value.trim();
    if (!name) { alert('Imię i nazwisko wymagane'); return; }
    const email = document.getElementById('sm-email').value.trim() || null;
    const aliases = document.getElementById('sm-aliases').value.split(',').map(s => s.trim()).filter(Boolean);
    const overrides = {};
    document.querySelectorAll('.perm-override:checked').forEach(cb => {
        const perm = cb.dataset.perm;
        const sel = document.querySelector(`.perm-value[data-perm="${perm}"]`);
        overrides[perm] = sel?.value === 'true';
    });

    const payload = {
        full_name: name,
        email,
        phone: document.getElementById('sm-phone').value.trim() || null,
        role: document.getElementById('sm-role').value,
        color: document.getElementById('sm-color').value || '#3b82f6',
        is_active: document.getElementById('sm-active').value === 'true',
        aliases,
        permission_overrides: overrides,
    };

    const result = id
        ? await db.from('gmp_staff').update(payload).eq('id', id).select().single()
        : await db.from('gmp_staff').insert(payload).select().single();
    if (result.error) { alert('Błąd: ' + result.error.message); return; }

    await window.gmpAuth.auditLog(id ? 'staff_update' : 'staff_create', {
        entityType: 'staff',
        entityId: result.data.id,
        entityLabel: `${name} <${email || '-'}>`,
        severity: 'info',
        metadata: { role: payload.role, override_count: Object.keys(overrides).length },
    });

    const inviteCb = document.getElementById('sm-invite');
    const shouldInvite = !id && inviteCb?.checked && email && !result.data.user_id;
    if (shouldInvite) {
        const mode = document.querySelector('input[name="sm-access-mode"]:checked')?.value || 'link';
        if (mode === 'password') {
            const pwd = document.getElementById('sm-password')?.value || '';
            if (pwd.length < 12) { alert('Hasło musi mieć minimum 12 znaków'); return; }
            gmpModal.close();
            await setPasswordAndShow(email, result.data.id, name, payload.role, pwd);
        } else {
            gmpModal.close();
            await generateAccessLinkAndShow(email, result.data.id, name, payload.role);
        }
    } else {
        window.toast?.success(id ? 'Zapisano' : 'Dodano');
        gmpModal.close();
    }

    loadStaffManage();
}

// Generuj link dostepowy i pokaz go w modalu z 'Kopiuj'
async function generateAccessLinkAndShow(email, staffId, fullName, role) {
    window.toast?.info('Generuję link dostępowy...');
    try {
        const { data, error } = await invokeEdgeWithAuth('invite-staff', {
            email, staff_id: staffId, full_name: fullName, role: role || 'staff',
        });
        if (error) throw error;
        if (!data?.action_link) {
            alert('Nie udało się wygenerować linku: ' + (data?.error || 'brak action_link w odpowiedzi'));
            return;
        }
        showAccessLinkModal(data.action_link, email, data.existed);
    } catch (e) {
        alert('Błąd generowania linku: ' + (e.message || e));
    }
}

function showAccessLinkModal(link, email, existed) {
    const safeLink = esc(link);
    const safeEmail = esc(email);
    const html = `
        <div class="modal-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center">
            <h3 style="margin: 0; font-size: 16px"><i class="ph ph-link"></i> Link dostępowy gotowy</h3>
            <button onclick="gmpModal.close()" style="background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-size: 20px"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body" style="padding: 20px">
            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px">
                ${existed ? 'Konto już istniało — link odświeża dostęp.' : 'Konto utworzone.'} Wyślij ten link pracownikowi (Slack/WhatsApp/SMS/email). Po kliknięciu ustawi hasło i zaloguje się do CRM.
            </div>
            <div style="padding: 12px; background: rgba(99,102,241,0.08); border: 1px solid var(--accent-border); border-radius: 8px; margin-bottom: 14px">
                <div style="font-size: 11px; color: var(--text-tertiary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.08em">Dla: ${safeEmail}</div>
                <textarea id="access-link-box" readonly style="width: 100%; min-height: 90px; background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 11px; word-break: break-all; resize: vertical">${safeLink}</textarea>
            </div>
            <div style="display: flex; gap: 8px; align-items: center">
                <button class="refresh-btn" onclick="copyAccessLink()" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; flex: 0 0 auto"><i class="ph ph-copy"></i> Kopiuj link</button>
                <a href="mailto:${safeEmail}?subject=${encodeURIComponent('Dostęp do CRM GetMyPermit')}&body=${encodeURIComponent('Cześć,\n\nOto link do ustawienia hasła i zalogowania się do CRM:\n\n' + link + '\n\nLink jest jednorazowy i wygasa po krótkim czasie.\n')}" class="refresh-btn" style="flex: 0 0 auto"><i class="ph ph-envelope"></i> Wyślij mailem</a>
                <a href="https://wa.me/?text=${encodeURIComponent('Dostęp do CRM GetMyPermit: ' + link)}" target="_blank" class="refresh-btn" style="flex: 0 0 auto"><i class="ph ph-whatsapp-logo"></i> WhatsApp</a>
                <span id="copy-feedback" style="font-size: 12px; color: #10b981; opacity: 0; transition: opacity 200ms">✓ skopiowano</span>
            </div>
            <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 12px">
                <i class="ph ph-warning-circle"></i> Link wygasa po 1h. Jeśli pracownik nie zdąży — wygeneruj nowy z "Edytuj pracownika → Wygeneruj nowy link".
            </div>
        </div>`;
    gmpModal.openModal(html);
}

window.copyAccessLink = async function() {
    const box = document.getElementById('access-link-box');
    if (!box) return;
    try {
        await navigator.clipboard.writeText(box.value);
    } catch {
        box.select();
        document.execCommand('copy');
    }
    const fb = document.getElementById('copy-feedback');
    if (fb) {
        fb.style.opacity = '1';
        setTimeout(() => { fb.style.opacity = '0'; }, 2000);
    }
};

// Dla istniejacych kont — regeneracja linku (zamiast 'wyslij reset hasla')
window.regenerateAccessLink = async function(staffId, email, fullName, role) {
    if (!email) { alert('Brak emaila'); return; }
    await generateAccessLinkAndShow(email, staffId, fullName, role);
};

async function sendPasswordResetForStaff(email) {
    if (!email) { alert('Brak emaila'); return; }
    try {
        await window.gmpAuth.sendPasswordReset(email);
        window.toast?.success('Wysłano link resetu hasła na ' + email);
    } catch (e) {
        alert('Błąd wysyłki: ' + e.message);
    }
}

async function deleteStaffAccount(id, name) {
    if (!confirm(`Dezaktywować pracownika "${name}"? Konto w systemie (auth.users) pozostanie, rekord zostanie odłączony i oznaczony jako nieaktywny.`)) return;
    const { error } = await db.from('gmp_staff').update({ is_active: false, user_id: null }).eq('id', id);
    if (error) { alert('Błąd: ' + error.message); return; }
    await window.gmpAuth.auditLog('staff_delete', {
        entityType: 'staff', entityId: id, entityLabel: name, severity: 'critical',
    });
    window.toast?.success('Dezaktywowano pracownika');
    gmpModal.close();
    loadStaffManage();
}

// === Wywołanie edge function z explicit user JWT (omija problem z autoRefresh) ===
async function invokeEdgeWithAuth(fnName, body) {
    let session = (await db.auth.getSession())?.data?.session;
    // Jeśli session istnieje ale token jest expired - wymuś refresh
    if (session?.expires_at && session.expires_at * 1000 < Date.now() + 5000) {
        const { data: refreshed } = await db.auth.refreshSession();
        session = refreshed?.session || session;
    }
    const accessToken = session?.access_token;
    if (!accessToken) {
        return { data: null, error: { message: 'Sesja wygasła. Zaloguj się ponownie (Ctrl+F5).' } };
    }
    return await db.functions.invoke(fnName, {
        body,
        headers: { Authorization: `Bearer ${accessToken}` },
    });
}

// === Obsługa ustawiania hasła przez admina ===
// Bez ambiguous znaków (0/O, 1/l/I), z klasą specjalną dla siły.
const GMP_PWD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';

function gmpGenPasswordValue(len = 16) {
    const arr = new Uint32Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr, n => GMP_PWD_CHARS[n % GMP_PWD_CHARS.length]).join('');
}

window.gmpGenPasswordInto = function(inputId) {
    const el = document.getElementById(inputId);
    if (el) el.value = gmpGenPasswordValue(16);
};

window.gmpToggleInviteOpts = function() {
    const cb = document.getElementById('sm-invite');
    const opts = document.getElementById('sm-invite-opts');
    if (opts) opts.style.display = cb?.checked ? 'block' : 'none';
};

window.gmpToggleAccessMode = function() {
    const mode = document.querySelector('input[name="sm-access-mode"]:checked')?.value;
    const row = document.getElementById('sm-password-row');
    if (row) row.style.display = mode === 'password' ? 'block' : 'none';
};

async function setPasswordAndShow(email, staffId, fullName, role, password) {
    window.toast?.info('Ustawiam hasło...');
    try {
        const { data, error } = await invokeEdgeWithAuth('invite-staff', {
            email, staff_id: staffId, full_name: fullName, role: role || 'staff', password,
        });
        if (error) throw error;
        if (!data?.ok) {
            alert('Błąd: ' + (data?.error || 'nieznany'));
            return;
        }
        showCredentialsModal(email, password, data.existed);
    } catch (e) {
        alert('Błąd: ' + (e.message || e));
    } finally {
        // Wyczyść pole hasła w modalu edycji (jeśli jeszcze istnieje w DOM)
        const f = document.getElementById('sm-password');
        if (f) f.value = '';
    }
}

function showCredentialsModal(email, password, existed) {
    const safeEmail = esc(email);
    const safePwd = esc(password);
    const html = `
        <div class="modal-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center">
            <h3 style="margin: 0; font-size: 16px"><i class="ph ph-key"></i> Dane dostępowe gotowe</h3>
            <button onclick="gmpCredModalClose()" style="background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-size: 20px"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body" style="padding: 20px">
            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px">
                ${existed ? 'Hasło zaktualizowane.' : 'Konto utworzone.'} Skopiuj dane i przekaż pracownikowi.
            </div>
            <div style="padding: 12px; background: rgba(99,102,241,0.08); border: 1px solid var(--accent-border); border-radius: 8px; margin-bottom: 14px">
                <label style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 4px">Login (email)</label>
                <div style="display: flex; gap: 6px; align-items: center">
                    <input id="cred-email" readonly value="${safeEmail}" style="flex: 1; background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 8px 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px">
                    <button class="refresh-btn" style="padding: 7px 10px" onclick="gmpCopyFromInput('cred-email','cred-email-fb')"><i class="ph ph-copy"></i></button>
                    <span id="cred-email-fb" style="font-size: 11px; color: #10b981; opacity: 0; transition: opacity 200ms; min-width: 22px">✓</span>
                </div>
                <label style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-top: 12px; margin-bottom: 4px">Hasło</label>
                <div style="display: flex; gap: 6px; align-items: center">
                    <input id="cred-pwd" readonly value="${safePwd}" type="password" style="flex: 1; background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 8px 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px">
                    <button class="refresh-btn" style="padding: 7px 10px" onclick="gmpTogglePwdVisibility()" title="Pokaż/ukryj"><i class="ph ph-eye" id="cred-pwd-eye"></i></button>
                    <button class="refresh-btn" style="padding: 7px 10px" onclick="gmpCopyFromInput('cred-pwd','cred-pwd-fb')"><i class="ph ph-copy"></i></button>
                    <span id="cred-pwd-fb" style="font-size: 11px; color: #10b981; opacity: 0; transition: opacity 200ms; min-width: 22px">✓</span>
                </div>
            </div>
            <div style="padding: 10px 12px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.3); border-radius: 6px; font-size: 11px; color: #f59e0b; line-height: 1.5">
                <i class="ph ph-warning-circle"></i> <strong>Bezpieczeństwo:</strong> hasło nie jest nigdzie zapisane — po zamknięciu tego okna nie odzyskasz go. Przekaż pracownikowi kanałem zaufanym (Signal / WhatsApp / telefon), NIE emailem razem z loginem. Poproś o zmianę hasła po pierwszym logowaniu.
            </div>
        </div>
        <div class="modal-footer" style="padding: 14px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end">
            <button class="refresh-btn" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none" onclick="gmpCredModalClose()"><i class="ph ph-check"></i> Zamknij</button>
        </div>`;
    gmpModal.openModal(html);
}

window.gmpCopyFromInput = async function(inputId, fbId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    try {
        await navigator.clipboard.writeText(el.value);
    } catch {
        el.select();
        document.execCommand('copy');
    }
    const fb = document.getElementById(fbId);
    if (fb) {
        fb.style.opacity = '1';
        setTimeout(() => { fb.style.opacity = '0'; }, 2000);
    }
};

window.gmpTogglePwdVisibility = function() {
    const el = document.getElementById('cred-pwd');
    const eye = document.getElementById('cred-pwd-eye');
    if (!el) return;
    const show = el.type === 'password';
    el.type = show ? 'text' : 'password';
    if (eye) eye.className = show ? 'ph ph-eye-slash' : 'ph ph-eye';
};

// Wyczysc wartosci credentials przed zamknieciem (nie zostawiaj hasla w DOM)
window.gmpCredModalClose = function() {
    const pwd = document.getElementById('cred-pwd');
    const eml = document.getElementById('cred-email');
    if (pwd) pwd.value = '';
    if (eml) eml.value = '';
    gmpModal.close();
};

// Dla istniejacych kont — ustaw nowe haslo
window.gmpSetPasswordForExisting = function(staffId, email, fullName, role) {
    if (!email) { alert('Brak emaila'); return; }
    const html = `
        <div class="modal-header" style="padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center">
            <h3 style="margin: 0; font-size: 16px"><i class="ph ph-key"></i> Ustaw nowe hasło</h3>
            <button onclick="gmpModal.close()" style="background: none; border: none; color: var(--text-tertiary); cursor: pointer; font-size: 20px"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body" style="padding: 20px">
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px">${esc(fullName)}</div>
            <div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 14px">${esc(email)}</div>
            <label style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 4px">Nowe hasło (min. 12 znaków)</label>
            <div style="display: flex; gap: 6px; align-items: center">
                <input id="spass-input" class="input" type="text" placeholder="min. 12 znaków" style="flex: 1; font-family: 'JetBrains Mono', monospace; font-size: 12px" autocomplete="new-password">
                <button type="button" class="refresh-btn" style="padding: 6px 10px; font-size: 11px" onclick="gmpGenPasswordInto('spass-input')"><i class="ph ph-arrows-clockwise"></i> Generuj 16</button>
            </div>
            <div style="padding: 10px 12px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; font-size: 11px; color: #ef4444; line-height: 1.5; margin-top: 12px">
                <i class="ph ph-warning-circle"></i> Zastąpi obecne hasło pracownika. Wszystkie aktywne sesje zostaną unieważnione po następnym odświeżeniu.
            </div>
        </div>
        <div class="modal-footer" style="padding: 14px 20px; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: flex-end">
            <button class="refresh-btn" onclick="gmpModal.close()">Anuluj</button>
            <button class="refresh-btn" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none" onclick="gmpSubmitNewPassword('${staffId}', '${esc(email)}', '${esc(fullName)}', '${esc(role)}')"><i class="ph ph-check"></i> Ustaw hasło</button>
        </div>`;
    gmpModal.openModal(html);
};

window.gmpSubmitNewPassword = async function(staffId, email, fullName, role) {
    const input = document.getElementById('spass-input');
    const pwd = (input?.value || '').trim();
    if (pwd.length < 12) { alert('Hasło musi mieć minimum 12 znaków'); return; }
    if (input) input.value = '';
    gmpModal.close();
    await setPasswordAndShow(email, staffId, fullName, role, pwd);
};

// === USUWANIE PEŁNE — kasuje auth.users + gmp_staff (NIEODWRACALNE) ===
window.hardDeleteStaff = async function(staffId, fullName, hasAccount) {
    const accountInfo = hasAccount
        ? '\n\nTo CAŁKOWICIE usunie konto pracownika z systemu:\n  • rekord w gmp_staff\n  • konto w auth.users (login + hasło)\n\nOperacja jest NIEODWRACALNA.'
        : '\n\nTo usunie rekord pracownika z gmp_staff. Konto w auth (jeśli było) też zostanie usunięte.';

    if (!confirm(`Usunąć pracownika "${fullName}" CAŁKOWICIE?${accountInfo}\n\nKliknij OK aby kontynuować.`)) return;

    // Drugi confirm — wpisanie nazwy
    const typed = prompt(`Aby potwierdzić, wpisz dokładnie imię i nazwisko pracownika:\n\n${fullName}`);
    if (typed === null) return;
    if (typed.trim() !== fullName.trim()) {
        alert('Wpisana nazwa nie pasuje. Anulowano.');
        return;
    }

    window.toast?.info('Usuwam pracownika...');
    try {
        const { data, error } = await invokeEdgeWithAuth('delete-staff', {
            staff_id: staffId,
        });
        if (error) throw error;
        if (!data?.ok) {
            alert('Błąd: ' + (data?.error || 'nieznany'));
            return;
        }
        window.toast?.success(`Usunięto "${fullName}" całkowicie`);
        gmpModal.close();
        loadStaffManage();
    } catch (e) {
        alert('Błąd: ' + (e.message || e));
    }
};
