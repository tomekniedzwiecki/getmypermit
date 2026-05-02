// MOC App — data layer
// Ładuje real data z Supabase i wystawia kompatybilny shape z mock data.js (window.GMP_DATA).
// Komponenty React (Dashboard/ForeignersList/...) korzystają z tych samych pól co mock.

// Mutacje (CRUD) — używają anon RLS policies dla demo company.
// Po przywróceniu auth: policies zmienią się na `authenticated` + check ról.
window.mocActions = {
    async createForeigner({ companyId, firstName, lastName, nationality, birthDate, gender, phone, email, status, employmentStartedAt, subcontractorId }) {
        const { data, error } = await window.db
            .from('moc_foreigners')
            .insert({
                company_id: companyId,
                first_name: firstName,
                last_name: lastName,
                full_name_normalized: `${lastName} ${firstName}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
                nationality: nationality || null,
                birth_date: birthDate || null,
                gender: gender || null,
                phone: phone || null,
                email: email || null,
                status: status || 'pending_start',
                employment_started_at: employmentStartedAt || null,
                subcontractor_id: subcontractorId || null,
                legality_stay: 'gray',
                legality_work: 'gray',
                legality_calculated_at: new Date().toISOString(),
                legality_reason: 'Świeżo dodany — uzupełnij dokumenty',
                next_action_text: 'Dodaj dokument pobytowy i podstawę pracy',
            })
            .select()
            .single();
        if (error) {
            console.error('createForeigner error:', error);
            window.toast?.error(`Błąd: ${error.message}`);
            return null;
        }
        window.toast?.success(`Dodano: ${firstName} ${lastName}`);
        return data;
    },

    async updateForeigner(id, patch) {
        const { data, error } = await window.db
            .from('moc_foreigners')
            .update(patch)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('updateForeigner error:', error);
            window.toast?.error(`Błąd: ${error.message}`);
            return null;
        }
        return data;
    },

    async addDocument({ companyId, foreignerId, kind, documentNumber, issuingAuthority, validFrom, validUntil }) {
        const { data, error } = await window.db
            .from('moc_documents')
            .insert({
                company_id: companyId,
                foreigner_id: foreignerId,
                kind,
                document_number: documentNumber || null,
                issuing_authority: issuingAuthority || null,
                valid_from: validFrom || null,
                valid_until: validUntil || null,
                is_current: true,
                status: 'pending_review',
            })
            .select()
            .single();
        if (error) {
            console.error('addDocument error:', error);
            window.toast?.error(`Błąd: ${error.message}`);
            return null;
        }
        window.toast?.success(`Dokument dodany`);
        return data;
    },

    async acknowledgeAlert(alertId) {
        const { error } = await window.db
            .from('moc_alerts')
            .update({ status: 'acknowledged', acknowledged_at: new Date().toISOString() })
            .eq('id', alertId);
        if (error) {
            window.toast?.error(`Błąd: ${error.message}`);
            return false;
        }
        return true;
    },
};

window.mocData = {
    // Pobierz dane firmy: cudzoziemcy, dokumenty, alerty, zdarzenia, podwykonawcy, referrals.
    // Zwraca obiekt o strukturze kompatybilnej z window.GMP_DATA z mock data.js.
    async loadCompanyData(companyId, options = {}) {
        const limit = options.limit || 500;

        const [foreigners, documents, alerts, events, subcontractors, referrals, employmentTerms] = await Promise.all([
            window.db.from('moc_foreigners')
                .select('*, subcontractor:moc_subcontractors(id, name)')
                .eq('company_id', companyId)
                .is('deleted_at', null)
                .order('updated_at', { ascending: false })
                .limit(limit),
            window.db.from('moc_documents')
                .select('id, foreigner_id, kind, document_number, valid_until, status, days_to_expiry, is_current')
                .eq('company_id', companyId)
                .is('deleted_at', null)
                .eq('is_current', true)
                .limit(limit * 4),  // ~4 doki per cudzoziemiec
            window.db.from('moc_alerts')
                .select('*')
                .eq('company_id', companyId)
                .in('status', ['open', 'snoozed'])
                .order('triggered_at', { ascending: false })
                .limit(limit),
            window.db.from('moc_events')
                .select('*')
                .eq('company_id', companyId)
                .order('occurred_at', { ascending: false })
                .limit(50),
            window.db.from('moc_subcontractors')
                .select('id, name, nip, status, contact_email, accepted_at')
                .eq('parent_company_id', companyId)
                .is('deleted_at', null)
                .limit(100),
            window.db.from('moc_referrals')
                .select('*')
                .eq('company_id', companyId)
                .order('created_at', { ascending: false })
                .limit(50),
            window.db.from('moc_employment_terms')
                .select('*')
                .eq('company_id', companyId)
                .is('valid_to', null)
                .limit(limit),
        ]);

        // Zwróć błędy jako toast
        for (const r of [foreigners, documents, alerts, events, subcontractors, referrals, employmentTerms]) {
            if (r.error) {
                console.error('loadCompanyData query error:', r.error);
                window.toast?.error(`Błąd pobierania: ${r.error.message}`);
            }
        }

        // Indeksy do szybkiego mapowania
        const docsByForeigner = {};
        for (const d of (documents.data || [])) {
            (docsByForeigner[d.foreigner_id] ||= []).push(d);
        }
        const termsByForeigner = {};
        for (const t of (employmentTerms.data || [])) {
            termsByForeigner[t.foreigner_id] = t;
        }

        // Zmapuj cudzoziemców na shape kompatybilny z mockiem
        const foreignersOut = (foreigners.data || []).map((f) => {
            const docs = docsByForeigner[f.id] || [];
            const stayDoc = docs.find((d) => ['residence_card', 'visa', 'visa_free_entry', 'pesel_confirmation'].includes(d.kind));
            const workDoc = docs.find((d) => ['work_permit', 'work_declaration', 'work_notification'].includes(d.kind));
            const missingCount = (f.legality_stay === 'gray' ? 2 : 0)
                + (f.legality_work === 'gray' || (!workDoc && f.legality_work === 'yellow') ? 1 : 0);
            const terms = termsByForeigner[f.id];
            return {
                id: f.id,
                shortId: 'F-' + (f.id.slice(-4).toUpperCase()),
                name: `${f.first_name} ${f.last_name}`,
                nationality: window.countryShort(f.nationality) || f.nationality,
                flag: window.countryFlag(f.nationality),
                position: terms?.actual_position || terms?.doc_position || '—',
                subcontractor: f.subcontractor?.name || 'Bezpośrednio',
                residenceStatus: f.legality_stay,
                workStatus: f.legality_work,
                residenceDoc: docKindLabel(stayDoc?.kind) || 'Brak danych',
                residenceExpiry: stayDoc?.valid_until || null,
                workDoc: docKindLabel(workDoc?.kind) || 'Brak podstawy',
                workExpiry: workDoc?.valid_until || null,
                riskLevel: legalityToRisk(f.legality_stay, f.legality_work),
                lastUpdate: f.updated_at?.slice(0, 10),
                events: 0,  // wyliczamy niżej z events
                missing: missingCount,
                _raw: f,  // pełen rekord do drawera
                _docs: docs,
                _terms: terms,
                _foreignerStatus: f.status,
                _nextAction: f.next_action_text,
                _nextActionDue: f.next_action_due,
                _legalityReason: f.legality_reason,
            };
        });

        // Policz events per foreigner
        for (const e of (events.data || [])) {
            const target = foreignersOut.find((f) => f.id === e.foreigner_id);
            if (target) target.events += 1;
        }

        // KPI z agregacji
        const kpi = computeKPI(foreignersOut, alerts.data || [], referrals.data || []);

        return {
            foreigners: foreignersOut,
            documents: (documents.data || []).map((d) => ({
                id: d.id,
                foreignerId: d.foreigner_id,
                foreigner: foreignersOut.find((f) => f.id === d.foreigner_id)?.name || '—',
                type: docKindLabel(d.kind),
                expiry: d.valid_until,
                status: docStatusToMockStatus(d.status),
            })),
            alerts: (alerts.data || []).map(mapAlertToMock),
            events: (events.data || []).map(mapEventToMock),
            subcontractors: (subcontractors.data || []).map((s) => ({
                id: s.id,
                name: s.name,
                nip: s.nip,
                status: s.status,
                contact: s.contact_email,
            })),
            cases: (referrals.data || []).map(mapReferralToMock),
            activity: (events.data || []).slice(0, 10).map(mapEventToActivity),
            kpi,
        };
    },
};

// Mapowanie kind → polska nazwa
function docKindLabel(kind) {
    return {
        passport: 'Paszport',
        visa: 'Wiza krajowa D',
        residence_card: 'Karta pobytu',
        visa_free_entry: 'Ruch bezwizowy',
        work_permit: 'Zezwolenie typ A',
        work_declaration: 'Oświadczenie',
        work_notification: 'Powiadomienie (UA)',
        employment_contract: 'Umowa',
        application_receipt: 'UPO',
        application_decision: 'Decyzja',
        pesel_confirmation: 'PESEL UKR',
        other: 'Inne',
    }[kind] || kind || '—';
}

function docStatusToMockStatus(s) {
    return {
        valid: 'ok',
        expiring_soon: 'warning',
        expired: 'expired',
        missing: 'missing',
        pending_review: 'review',
        pending_application: 'review',
        no_expiry: 'ok',
    }[s] || 'review';
}

function legalityToRisk(stay, work) {
    if (stay === 'red' || work === 'red') return 'high';
    if (stay === 'yellow' || work === 'yellow') return 'medium';
    if (stay === 'gray' || work === 'gray') return 'unknown';
    return 'low';
}

function mapAlertToMock(a) {
    const severityMap = {
        critical: 'overdue',
        danger: '14',
        warning: '60',
        info: 'missing',
    };
    return {
        id: a.id,
        severity: severityMap[a.severity] || a.severity,
        title: a.title,
        subject: a.foreigner_id || '',
        subjectId: a.foreigner_id,
        date: a.due_date,
        daysOffset: a.due_date ? window.fmt.daysFromNow(a.due_date) : null,
        message: a.message,
        action: a.suggested_action || 'Otwórz kartę',
    };
}

function mapEventToMock(e) {
    const typeMap = {
        work_started: 'praca-rozpoczeta',
        work_ended: 'praca-zakonczona',
        work_not_started: 'praca-niepodjeta',
        application_filed: 'wniosek-pobytowy',
        upo_received: 'upo',
        salary_changed: 'zmiana-warunkow',
        position_changed: 'zmiana-warunkow',
        worktime_changed: 'zmiana-warunkow',
    };
    return {
        id: e.id,
        type: typeMap[e.kind] || e.kind,
        title: e.title,
        subject: e.foreigner_id,
        subjectId: e.foreigner_id,
        date: window.fmt.datetime(e.occurred_at),
        status: e.action_completed ? 'ok' : (e.requires_action ? 'todo' : 'review'),
        note: e.description,
    };
}

function mapReferralToMock(r) {
    const stageMap = {
        draft: 'Szkic',
        sent: 'Wysłane',
        accepted: 'Przyjęte',
        in_progress: 'W toku',
        closed: 'Zakończone',
        rejected: 'Odrzucone',
    };
    return {
        id: r.id,
        title: r.subject,
        foreigner: '',
        foreignerId: r.foreigner_id,
        opened: r.created_at?.slice(0, 10),
        lawyer: '—',
        stage: stageMap[r.status] || r.status,
        priority: r.urgency === 'critical' ? 'high' : (r.urgency === 'warning' ? 'medium' : 'low'),
        lastUpdate: window.fmt.datetime(r.updated_at),
    };
}

function mapEventToActivity(e) {
    const toneMap = {
        work_started: 'ok',
        work_ended: 'neutral',
        document_expired: 'danger',
        salary_changed: 'warning',
        application_filed: 'info',
        upo_received: 'ok',
    };
    const iconMap = {
        work_started: 'play-circle',
        work_ended: 'stop-circle',
        document_expired: 'warning-octagon',
        salary_changed: 'warning-circle',
        application_filed: 'paper-plane-tilt',
        upo_received: 'file-arrow-up',
    };
    return {
        time: e.occurred_at?.slice(11, 16) || '',
        text: e.title,
        subject: e.foreigner_id,
        icon: iconMap[e.kind] || 'circle',
        tone: toneMap[e.kind] || 'neutral',
    };
}

function computeKPI(foreigners, alerts, referrals) {
    const counts = { green: 0, yellow: 0, red: 0, gray: 0 };
    let active = 0, onboarding = 0, offboarding = 0;
    const nationalities = new Set();
    let expiring30 = 0, expiring60 = 0, expiring90 = 0, overdue = 0;

    for (const f of foreigners) {
        // Worse-of obu statusów
        const w = worseOf(f.residenceStatus, f.workStatus);
        counts[w] = (counts[w] || 0) + 1;

        if (f._foreignerStatus === 'active') active++;
        if (f._foreignerStatus === 'pending_start') onboarding++;
        if (f._foreignerStatus === 'finished') offboarding++;
        if (f.nationality) nationalities.add(f.nationality);

        const days = f.residenceExpiry ? window.fmt.daysFromNow(f.residenceExpiry) : null;
        if (days != null) {
            if (days < 0) overdue++;
            else if (days <= 30) expiring30++;
            else if (days <= 60) expiring60++;
            else if (days <= 90) expiring90++;
        }
    }

    return {
        total: foreigners.length,
        active,
        onboarding,
        offboarding,
        nationalities: nationalities.size,
        redStatus: counts.red,
        yellowStatus: counts.yellow,
        greenStatus: counts.green,
        grayStatus: counts.gray,
        expiring30, expiring60, expiring90, overdue,
        casesWithLawFirm: referrals.filter((r) => ['sent', 'accepted', 'in_progress'].includes(r.status)).length,
        pendingDocs: alerts.filter((a) => a.kind?.startsWith('missing_') || a.kind?.startsWith('document_expir')).length,
        riskScore: computeRiskScore(counts, foreigners.length),
    };
}

function worseOf(a, b) {
    const order = ['gray', 'green', 'yellow', 'red'];
    return order.indexOf(a) > order.indexOf(b) ? a : b;
}

function computeRiskScore(counts, total) {
    if (!total) return 100;
    // 100 = pełen zielony, każdy red -10, yellow -3, gray -2
    return Math.max(0, Math.round(100 - (counts.red * 10 + counts.yellow * 3 + counts.gray * 2) / total * 100));
}
