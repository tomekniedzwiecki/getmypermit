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
    if (!staff || staff.role !== 'owner') {
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

    // Initial load
    await loadPulse();
    startPolling();

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
});

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.admin-tab[data-tab]').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
    stopPolling();

    if (tab === 'pulse') { loadPulse(); startPolling(); }
    else if (tab === 'staff') loadStaffPerf();
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
