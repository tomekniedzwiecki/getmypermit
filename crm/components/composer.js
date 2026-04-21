// Inline composer for Notes/Tasks/Payments/Appointments
// Smart date parser, slash commands, auto-expand

(function() {
    const style = document.createElement('style');
    style.textContent = `
        .composer { background: #0a0a0a; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; transition: border-color 0.15s; }
        .composer:focus-within { border-color: rgba(59,130,246,0.4); box-shadow: 0 0 0 3px rgba(59,130,246,0.08); }
        [data-theme="light"] .composer { background: white; border-color: rgba(0,0,0,0.1); }

        .composer-tabs { display: flex; gap: 2px; padding: 6px 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .composer-tab { padding: 6px 12px; background: transparent; border: none; color: #71717a; font-size: 12px; cursor: pointer; border-radius: 6px 6px 0 0; display: flex; align-items: center; gap: 6px; transition: all 0.15s; }
        .composer-tab:hover { color: #e5e5e5; background: rgba(255,255,255,0.04); }
        .composer-tab.active { color: white; background: rgba(59,130,246,0.12); border-bottom: 2px solid #3b82f6; margin-bottom: -1px; }

        .composer-body { padding: 12px; }
        .composer-input {
            width: 100%;
            background: transparent;
            border: none;
            outline: none;
            color: #e5e5e5;
            font-size: 14px;
            font-family: Inter, sans-serif;
            resize: none;
            min-height: 60px;
            line-height: 1.5;
        }
        [data-theme="light"] .composer-input { color: #18181b; }
        .composer-input::placeholder { color: #52525b; }
        /* Mobile: większy textarea + font 16px (iOS anti-zoom) + composer-field input też 16px */
        @media (max-width: 600px) {
            .composer-input { min-height: 100px; font-size: 16px; }
            .composer-tab { font-size: 13px; padding: 10px 14px; min-height: 40px; }
            .composer-field { padding: 8px 10px; font-size: 13px; }
            .composer-field select,
            .composer-field input { font-size: 16px; min-height: 36px; }
            .composer-footer { padding: 12px; flex-wrap: wrap; gap: 8px; }
            .composer-footer .btn { flex: 1; min-height: 44px; }
        }

        .composer-fields { display: flex; gap: 8px; padding-top: 10px; flex-wrap: wrap; align-items: center; }
        .composer-field { display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.04); padding: 4px 8px; border-radius: 6px; font-size: 11px; }
        .composer-field select, .composer-field input { background: transparent; border: none; color: #e5e5e5; font-size: 11px; outline: none; cursor: pointer; font-family: inherit; }
        .composer-field input[type="date"], .composer-field input[type="number"], .composer-field input[type="time"] { min-width: 70px; }
        .composer-field label { color: #71717a; margin: 0; font-size: 11px; }
        .composer-field i { color: #71717a; font-size: 12px; }

        .composer-footer { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border-top: 1px solid rgba(255,255,255,0.04); }
        .composer-hint { font-size: 10px; color: #52525b; }
        .composer-hint kbd { display: inline-block; padding: 1px 5px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 3px; font-family: monospace; font-size: 10px; color: #a1a1aa; }
        .composer-tpl-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; color: #a1a1aa; font-size: 11px; cursor: pointer; transition: all 0.15s; }
        .composer-tpl-btn:hover { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.3); color: #a5b4fc; }
        .composer-submit { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
        .composer-submit:hover:not(:disabled) { background: #2563eb; }
        .composer-submit:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Slash menu */
        .slash-menu { position: absolute; background: #0a0a0a; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 4px; min-width: 220px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); z-index: 50; }
        .slash-item { padding: 8px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 10px; font-size: 13px; color: #e5e5e5; }
        .slash-item:hover, .slash-item.active { background: rgba(255,255,255,0.06); }
        .slash-item i { color: #71717a; font-size: 14px; }
        .slash-item-kbd { margin-left: auto; font-size: 10px; color: #52525b; font-family: monospace; }

        /* Timeline item hover actions */
        .timeline-actions { opacity: 0; transition: opacity 0.15s; display: inline-flex; gap: 2px; margin-left: 8px; }
        .timeline-item:hover .timeline-actions { opacity: 1; }
        .timeline-act-btn { background: transparent; border: none; color: #52525b; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 11px; transition: all 0.15s; }
        .timeline-act-btn:hover { color: #e5e5e5; background: rgba(255,255,255,0.06); }
        .timeline-act-btn.danger:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

        /* Inline edit */
        .inline-edit-area { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(59,130,246,0.4); border-radius: 6px; padding: 8px; color: #e5e5e5; font-size: 13px; font-family: inherit; resize: vertical; min-height: 60px; outline: none; }
        [data-theme="light"] .inline-edit-area { background: white; color: #18181b; }
    `;
    document.head.appendChild(style);

    // ========== SMART DATE PARSER ==========
    // "jutro", "pojutrze", "za tydzień", "poniedziałek", "20.04", "2026-05-01"
    window.parseSmartDate = function(str) {
        if (!str) return null;
        str = str.trim().toLowerCase();
        const today = new Date();
        const addDays = (n) => {
            const d = new Date(today);
            d.setDate(d.getDate() + n);
            return d.toISOString().slice(0, 10);
        };
        if (str === 'dziś' || str === 'dzis' || str === 'today') return today.toISOString().slice(0, 10);
        if (str === 'jutro' || str === 'tomorrow') return addDays(1);
        if (str === 'pojutrze') return addDays(2);
        if (str.match(/^za\s+(\d+)\s+dni/)) return addDays(parseInt(RegExp.$1));
        if (str.match(/^za\s+tydzień|^za\s+tydzien|^in\s+a\s+week/)) return addDays(7);
        if (str.match(/^za\s+2\s+tygodnie/)) return addDays(14);
        if (str.match(/^za\s+miesiąc|^za\s+miesiac/)) return addDays(30);

        // Days of week (pol)
        const dni = { 'poniedziałek':1, 'poniedzialek':1, 'wtorek':2, 'środa':3, 'sroda':3, 'czwartek':4, 'piątek':5, 'piatek':5, 'sobota':6, 'niedziela':0 };
        for (const [name, dayNum] of Object.entries(dni)) {
            if (str === name || str === 'w ' + name) {
                const diff = (dayNum - today.getDay() + 7) % 7 || 7;
                return addDays(diff);
            }
        }

        // Date formats: 20.04, 20.04.2026, 2026-04-20, 20/04
        let m = str.match(/^(\d{1,2})[.\/\-](\d{1,2})(?:[.\/\-](\d{2,4}))?$/);
        if (m) {
            let [, d, mth, y] = m;
            y = y ? (y.length === 2 ? '20' + y : y) : today.getFullYear();
            try { return `${y}-${mth.padStart(2,'0')}-${d.padStart(2,'0')}`; } catch { }
        }
        m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) return str;
        return null;
    };

    // ========== SMART AMOUNT PARSER ==========
    window.parseSmartAmount = function(str) {
        if (!str) return null;
        const m = String(str).replace(',', '.').match(/(\d+(?:\.\d+)?)/);
        return m ? parseFloat(m[1]) : null;
    };

    // ========== COMPOSER COMPONENT ==========
    // Uzywaj: window.gmpComposer.create(containerEl, { caseId, staffId, onSave })
    window.gmpComposer = {
        create(container, opts) {
            const { caseId, staffId, onSave } = opts;

            const types = [
                { key: 'note', label: 'Notatka', icon: 'ph-note', color: '#a1a1aa' },
                { key: 'task', label: 'Zadanie', icon: 'ph-check-square', color: '#06b6d4' },
                { key: 'payment', label: 'Płatność', icon: 'ph-coins', color: '#f59e0b' },
                { key: 'appointment', label: 'Termin', icon: 'ph-calendar-plus', color: '#ec4899' },
            ];

            let activeType = 'note';
            let extraFields = {};

            const render = () => {
                const tab = types.find(t => t.key === activeType);
                container.innerHTML = `
                    <div class="composer" id="gmp-composer">
                        <div class="composer-tabs">
                            ${types.map(t => `
                                <button class="composer-tab ${t.key === activeType ? 'active' : ''}" data-type="${t.key}">
                                    <i class="ph ${t.icon}" style="color: ${t.color}"></i>
                                    ${t.label}
                                </button>
                            `).join('')}
                        </div>
                        <div class="composer-body">
                            <textarea class="composer-input" id="comp-input" placeholder="${getPlaceholder(activeType)}" rows="2"></textarea>
                            <div class="composer-fields" id="comp-fields">${renderFields(activeType)}</div>
                        </div>
                        <div class="composer-footer">
                            <div class="composer-hint flex items-center gap-2">
                                ${['note', 'email'].includes(activeType) ? `<button class="composer-tpl-btn" id="comp-tpl-btn" type="button" title="Użyj szablonu"><i class="ph ph-file-text"></i> Szablon</button>` : ''}
                                <span>${getHint(activeType)}</span>
                            </div>
                            <button class="composer-submit" id="comp-submit" disabled>
                                ${tab.label === 'Notatka' ? 'Zapisz' : 'Dodaj ' + tab.label.toLowerCase()}
                            </button>
                        </div>
                    </div>`;

                const input = container.querySelector('#comp-input');
                const submit = container.querySelector('#comp-submit');

                // Template picker
                const tplBtn = container.querySelector('#comp-tpl-btn');
                if (tplBtn && window.gmpTemplatePicker) {
                    tplBtn.addEventListener('click', (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const ctx = {
                            klient: window.caseData?.gmp_clients
                                ? `${window.caseData.gmp_clients.first_name} ${window.caseData.gmp_clients.last_name}`
                                : '',
                            nr_sprawy: window.caseData?.case_number || '',
                            typ_sprawy: window.caseData?.case_type || '',
                            urzad: window.caseData?.gmp_office_departments?.code || '',
                            godzina: '',
                        };
                        gmpTemplatePicker.open(tplBtn, {
                            category: activeType,
                            context: ctx,
                            onPick: (filledBody) => {
                                input.value = filledBody;
                                updateSubmit();
                                autoResize(input);
                                input.focus();
                            },
                        });
                    });
                }

                // Tab switching
                container.querySelectorAll('.composer-tab').forEach(t => {
                    t.addEventListener('click', () => {
                        activeType = t.dataset.type;
                        extraFields = {};
                        render();
                        setTimeout(() => container.querySelector('#comp-input')?.focus(), 0);
                    });
                });

                // Input tracking
                const updateSubmit = () => {
                    submit.disabled = !input.value.trim();
                };
                input.addEventListener('input', (e) => {
                    updateSubmit();
                    autoResize(input);
                    handleSlashAndParse(e);
                });

                // Auto-resize
                autoResize(input);

                // Enter to submit
                input.addEventListener('keydown', (e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        if (!submit.disabled) submit.click();
                    }
                    // In note, Enter = newline. In task/payment, Enter = submit
                    if (activeType !== 'note' && e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!submit.disabled) submit.click();
                    }
                });

                // Submit
                submit.addEventListener('click', handleSubmit);

                // Field handlers
                setupFieldHandlers();
            };

            const getPlaceholder = (type) => {
                switch (type) {
                    case 'note': return 'Notatka... (Ctrl+Enter = zapisz, wpisz / dla komend)';
                    case 'task': return 'Co trzeba zrobić? np. "Wysłać wezwanie do 20.04"';
                    case 'payment': return 'Notatka do wpłaty... (wpisz kwotę w polu obok)';
                    case 'appointment': return 'Tytuł spotkania (np. "Konsultacja u klienta")';
                }
            };
            const getHint = (type) => {
                switch (type) {
                    case 'note': return '<kbd>Ctrl+Enter</kbd> zapisz • <kbd>/</kbd> komendy';
                    case 'task': return '<kbd>Enter</kbd> zapisz • <kbd>Shift+Enter</kbd> nowa linia • pisz "jutro", "za tydzień" w dacie';
                    case 'payment': return '<kbd>Enter</kbd> zapisz';
                    case 'appointment': return '<kbd>Enter</kbd> zapisz • "jutro 14:00", "20.04"';
                }
            };

            const renderFields = (type) => {
                if (type === 'task') {
                    return `
                        <div class="composer-field">
                            <i class="ph ph-user"></i>
                            <label>Przypisz:</label>
                            <select id="f-assign">${getStaffOptions()}</select>
                        </div>
                        <div class="composer-field">
                            <i class="ph ph-calendar"></i>
                            <label>Termin:</label>
                            <input type="text" id="f-due" placeholder="jutro / 20.04" style="width: 80px">
                        </div>
                    `;
                }
                if (type === 'payment') {
                    return `
                        <div class="composer-field">
                            <i class="ph ph-currency-circle-dollar"></i>
                            <label>Kwota:</label>
                            <input type="number" step="0.01" id="f-amount" placeholder="0" style="width: 90px">
                            <span class="text-zinc-500 text-xs">PLN</span>
                        </div>
                        <div class="composer-field">
                            <label>Forma:</label>
                            <select id="f-method">
                                <option value="gotowka">Gotówka</option>
                                <option value="przelew">Przelew</option>
                                <option value="faktura">Faktura</option>
                                <option value="karta">Karta</option>
                            </select>
                        </div>
                        <div class="composer-field">
                            <label>Rodzaj:</label>
                            <select id="f-kind">
                                <option value="fee">Wynagrodzenie</option>
                                <option value="admin_fee">Opłata administracyjna</option>
                            </select>
                        </div>
                        <div class="composer-field">
                            <label>Płaci:</label>
                            <select id="f-payer">
                                <option value="client">Klient</option>
                                <option value="employer">Pracodawca</option>
                            </select>
                        </div>
                    `;
                }
                if (type === 'appointment') {
                    return `
                        <div class="composer-field">
                            <label>Typ:</label>
                            <select id="f-ap-type">
                                <option value="konsultacja">Konsultacja</option>
                                <option value="follow_up">Follow-up</option>
                                <option value="osobiste_odciski">Odciski</option>
                                <option value="osobiste_inne">Inne osobiste</option>
                                <option value="hearing">Rozprawa</option>
                            </select>
                        </div>
                        <div class="composer-field">
                            <i class="ph ph-calendar"></i>
                            <label>Data:</label>
                            <input type="text" id="f-ap-date" placeholder="jutro / 20.04" style="width: 80px">
                        </div>
                        <div class="composer-field">
                            <i class="ph ph-clock"></i>
                            <label>Godz:</label>
                            <input type="time" id="f-ap-time">
                        </div>
                        <div class="composer-field">
                            <i class="ph ph-user"></i>
                            <label>Prowadzi:</label>
                            <select id="f-ap-staff">${getStaffOptions()}</select>
                        </div>
                    `;
                }
                return '';
            };

            const getStaffOptions = () => {
                if (!window._gmpStaffCache) return '<option value="">—</option>';
                return '<option value="">—</option>' + window._gmpStaffCache.map(s =>
                    `<option value="${s.id}" ${s.id === staffId ? 'selected' : ''}>${esc(s.full_name)}</option>`
                ).join('');
            };

            const setupFieldHandlers = () => {
                if (activeType === 'task' || activeType === 'appointment') {
                    const dueInput = container.querySelector('#f-due') || container.querySelector('#f-ap-date');
                    if (dueInput) {
                        dueInput.addEventListener('blur', (e) => {
                            const parsed = parseSmartDate(e.target.value);
                            if (parsed) e.target.value = parsed;
                        });
                    }
                }
            };

            // Slash commands
            const handleSlashAndParse = (e) => {
                const input = container.querySelector('#comp-input');
                const val = input.value;
                if (val === '/' && activeType === 'note') {
                    showSlashMenu(input);
                } else {
                    hideSlashMenu();
                }
            };

            let slashMenu = null;
            const showSlashMenu = (input) => {
                if (slashMenu) return;
                const commands = [
                    { name: 'Zadanie', desc: 'Utwórz zadanie', action: () => { input.value = ''; activeType = 'task'; render(); } },
                    { name: 'Płatność', desc: 'Dodaj wpłatę', action: () => { input.value = ''; activeType = 'payment'; render(); } },
                    { name: 'Termin', desc: 'Zaplanuj spotkanie', action: () => { input.value = ''; activeType = 'appointment'; render(); } },
                    { name: 'Telefon', desc: 'Zadzwoniłem do klienta', action: () => { input.value = 'Zadzwoniłem do klienta. '; input.focus(); const len = input.value.length; input.setSelectionRange(len, len); hideSlashMenu(); } },
                    { name: 'Email', desc: 'Wysłałem email', action: () => { input.value = 'Wysłałem email do klienta: '; input.focus(); const len = input.value.length; input.setSelectionRange(len, len); hideSlashMenu(); } },
                    { name: 'WhatsApp', desc: 'Napisałem na WhatsApp', action: () => { input.value = 'Napisałem do klienta na WhatsApp: '; input.focus(); const len = input.value.length; input.setSelectionRange(len, len); hideSlashMenu(); } },
                ];
                slashMenu = document.createElement('div');
                slashMenu.className = 'slash-menu';
                const rect = input.getBoundingClientRect();
                slashMenu.style.top = (rect.bottom + window.scrollY + 4) + 'px';
                slashMenu.style.left = rect.left + 'px';
                slashMenu.innerHTML = commands.map((c, i) => `
                    <div class="slash-item ${i === 0 ? 'active' : ''}" data-idx="${i}">
                        <i class="ph ph-slash"></i>
                        <div style="flex:1"><div>${c.name}</div><div style="font-size:10px;color:#71717a">${c.desc}</div></div>
                    </div>
                `).join('');
                document.body.appendChild(slashMenu);
                slashMenu.querySelectorAll('.slash-item').forEach((item, i) => {
                    item.addEventListener('click', () => { commands[i].action(); });
                });
            };
            const hideSlashMenu = () => { if (slashMenu) { slashMenu.remove(); slashMenu = null; } };

            const autoResize = (el) => {
                el.style.height = 'auto';
                el.style.height = Math.min(200, el.scrollHeight) + 'px';
            };

            const handleSubmit = async () => {
                const input = container.querySelector('#comp-input');
                const text = input.value.trim();
                if (!text) return;

                const submit = container.querySelector('#comp-submit');
                submit.disabled = true;
                submit.textContent = '...';

                try {
                    if (activeType === 'note') {
                        await db.from('gmp_case_activities').insert({
                            case_id: caseId, activity_type: 'note',
                            content: text, created_by: staffId,
                        });
                    } else if (activeType === 'task') {
                        const assignee = container.querySelector('#f-assign')?.value || null;
                        const dueRaw = container.querySelector('#f-due')?.value.trim();
                        const due = dueRaw ? (parseSmartDate(dueRaw) || dueRaw.match(/^\d{4}-\d{2}-\d{2}$/) ? dueRaw : null) : null;
                        await db.from('gmp_tasks').insert({
                            case_id: caseId, title: text.split('\n')[0],
                            description: text.split('\n').slice(1).join('\n') || null,
                            assigned_to: assignee, due_date: due,
                            status: 'pending', created_by: staffId,
                        });
                        await db.from('gmp_case_activities').insert({
                            case_id: caseId, activity_type: 'task_assigned',
                            content: 'Dodano zadanie: ' + text.split('\n')[0], created_by: staffId,
                        });
                    } else if (activeType === 'payment') {
                        const amount = Number(container.querySelector('#f-amount')?.value);
                        if (!amount) { toast.error('Podaj kwotę'); submit.disabled = false; submit.textContent = 'Dodaj płatność'; return; }
                        const payer = container.querySelector('#f-payer').value;
                        const method = container.querySelector('#f-method').value;
                        const kind = container.querySelector('#f-kind').value;
                        await db.from('gmp_payments').insert({
                            case_id: caseId, payer_type: payer,
                            client_id: payer === 'client' ? (opts.clientId || null) : null,
                            employer_id: payer === 'employer' ? (opts.employerId || null) : null,
                            kind, amount, method,
                            payment_date: new Date().toISOString().slice(0, 10),
                            notes: text,
                        });
                        await db.from('gmp_case_activities').insert({
                            case_id: caseId, activity_type: 'payment_received',
                            content: `Płatność: ${fmt.money(amount)}${text ? ' — ' + text : ''}`,
                            metadata: { amount, method, kind },
                            created_by: staffId,
                        });
                    } else if (activeType === 'appointment') {
                        const dateRaw = container.querySelector('#f-ap-date')?.value.trim();
                        const date = dateRaw ? (parseSmartDate(dateRaw) || (dateRaw.match(/^\d{4}-\d{2}-\d{2}$/) ? dateRaw : null)) : null;
                        if (!date) { toast.error('Podaj datę (np. "jutro" lub "20.04")'); submit.disabled = false; submit.textContent = 'Dodaj termin'; return; }
                        const time = container.querySelector('#f-ap-time')?.value;
                        await db.from('gmp_crm_appointments').insert({
                            case_id: caseId, client_id: opts.clientId || null,
                            staff_id: container.querySelector('#f-ap-staff')?.value || null,
                            appointment_type: container.querySelector('#f-ap-type').value,
                            scheduled_date: date, scheduled_time: time || null,
                            title: text,
                            status: 'scheduled', created_by: staffId,
                        });
                        await db.from('gmp_case_activities').insert({
                            case_id: caseId, activity_type: 'appointment_created',
                            content: `Termin: ${date}${time ? ' ' + time : ''} - ${text}`,
                            metadata: { date, time, title: text },
                            created_by: staffId,
                        });
                    }

                    toast.success('Dodano');
                    input.value = '';
                    render();
                    if (onSave) onSave(activeType);
                } catch (err) {
                    toast.error(err.message || 'Błąd');
                    submit.disabled = false;
                    submit.textContent = 'Zapisz';
                }
            };

            render();
        },
    };

    // Preload staff
    window.loadStaffForComposer = async () => {
        if (window._gmpStaffCache) return;
        const { data } = await db.from('gmp_staff').select('id, full_name').order('full_name');
        window._gmpStaffCache = data || [];
    };

    // ========== INLINE EDIT OF NOTES ==========
    window.inlineEditNote = function(activityId, currentContent, onSave) {
        const el = document.querySelector(`[data-activity-id="${activityId}"] .activity-content`);
        if (!el) return;
        const original = el.innerHTML;
        el.innerHTML = `
            <textarea class="inline-edit-area" id="iee-${activityId}">${esc(currentContent)}</textarea>
            <div class="flex gap-2 mt-2">
                <button class="composer-submit" onclick="window.saveInlineNote('${activityId}')">Zapisz (Ctrl+Enter)</button>
                <button class="btn btn-ghost btn-sm" onclick="window.cancelInlineEdit('${activityId}', this)">Anuluj</button>
            </div>`;
        const area = document.getElementById(`iee-${activityId}`);
        area.focus();
        area.setSelectionRange(area.value.length, area.value.length);
        area._onSave = onSave;
        area.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveInlineNote(activityId); }
            if (e.key === 'Escape') { cancelInlineEdit(activityId, null, original); }
        });
    };
    window.saveInlineNote = async function(activityId) {
        const area = document.getElementById(`iee-${activityId}`);
        if (!area) return;
        const newContent = area.value.trim();
        if (!newContent) { toast.error('Treść nie może być pusta'); return; }
        const { error } = await db.from('gmp_case_activities').update({ content: newContent }).eq('id', activityId);
        if (error) { toast.error(error.message); return; }
        toast.success('Zaktualizowano');
        const onSave = area._onSave;
        if (onSave) onSave(newContent);
    };
    window.cancelInlineEdit = function(activityId, btn, original) {
        const el = document.querySelector(`[data-activity-id="${activityId}"] .activity-content`);
        if (el && original) el.innerHTML = original;
        // Or reload
        if (window._reloadActivities) window._reloadActivities();
    };

    // ========== UNDO TOAST ==========
    window.undoToast = function(msg, onUndo, duration = 6000) {
        const container = document.getElementById('toast-container') || (() => {
            const c = document.createElement('div');
            c.id = 'toast-container';
            c.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm';
            document.body.appendChild(c);
            return c;
        })();
        const t = document.createElement('div');
        t.className = 'bg-zinc-900/95 border border-zinc-700 rounded-lg px-4 py-3 flex items-center gap-3 backdrop-blur-md shadow-xl animate-enter';
        t.innerHTML = `
            <i class="ph ph-check-circle text-emerald-400"></i>
            <div class="flex-1 text-sm text-zinc-200">${esc(msg)}</div>
            <button class="text-blue-400 text-sm hover:underline font-medium">Cofnij</button>
        `;
        container.appendChild(t);
        const undoBtn = t.querySelector('button');
        undoBtn.addEventListener('click', async () => {
            await onUndo();
            t.remove();
        });
        setTimeout(() => t.remove(), duration);
    };
})();
