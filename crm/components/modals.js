// Shared modal helpers dla CRM
// Wymaga: window.db, window.toast, window.esc, window.supabaseClient

window.gmpModal = (function() {
  function openModal(html) {
    let container = document.getElementById('modals-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modals-container';
      document.body.appendChild(container);
    }
    container.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) gmpModal.close()">
        <div class="modal-content">${html}</div>
      </div>`;
  }
  function close() {
    const c = document.getElementById('modals-container');
    if (c) c.innerHTML = '';
  }

  // ========== KLIENT MODAL (create/edit) ==========
  async function editClient(clientId = null, onSaved = null) {
    let client = {};
    if (clientId) {
      const { data } = await db.from('gmp_clients').select('*').eq('id', clientId).maybeSingle();
      client = data || {};
    }
    // Pobierz listy do selektow
    const { data: emps } = await db.from('gmp_employers').select('id, name').order('name').limit(1000);
    const empOpts = [`<option value="">—</option>`, ...(emps || []).map(e => `<option value="${e.id}" ${client.employer_id === e.id ? 'selected' : ''}>${esc(e.name)}</option>`)].join('');

    openModal(`
      <div class="modal-header">${clientId ? 'Edytuj klienta' : 'Nowy klient'} <button class="btn btn-ghost btn-sm" onclick="gmpModal.close()"><i class="ph ph-x"></i></button></div>
      <div class="modal-body grid grid-cols-2 gap-3">
        <div><label>Nazwisko *</label><input id="cl-last" class="input w-full" value="${esc(client.last_name || '')}" autofocus required></div>
        <div><label>Imię *</label><input id="cl-first" class="input w-full" value="${esc(client.first_name || '')}" required></div>
        <div><label>Data urodzenia</label><input type="date" id="cl-birth" class="input w-full" value="${client.birth_date || ''}"></div>
        <div><label>PESEL</label><input id="cl-pesel" class="input w-full" value="${esc(client.pesel || '')}" pattern="[0-9]{11}" maxlength="11" placeholder="11 cyfr"></div>
        <div><label>Obywatelstwo</label><input id="cl-nat" class="input w-full" value="${esc(client.nationality || '')}" placeholder="np. UKRAINA"></div>
        <div><label>Telefon</label><input id="cl-phone" class="input w-full" value="${esc(client.phone || '')}"></div>
        <div><label>Email</label><input type="email" id="cl-email" class="input w-full" value="${esc(client.email || '')}"></div>
        <div class="col-span-2"><label>Pracodawca</label>
          <select id="cl-emp" class="input w-full">${empOpts}</select>
          <div class="text-xs text-zinc-500 mt-1">Nie ma? <a href="employers.html" class="text-blue-400">Dodaj pracodawcę →</a></div>
        </div>
        <div class="col-span-2"><label>Notatki</label><textarea id="cl-notes" class="input w-full" rows="3">${esc(client.notes || '')}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="gmpModal.close()">Anuluj</button>
        <button class="btn btn-primary" onclick="gmpModal.saveClient('${clientId || ''}')">${clientId ? 'Zapisz' : 'Dodaj'}</button>
      </div>`);

    // Przechowaj callback
    window._clientOnSaved = onSaved;
  }

  async function saveClient(clientId) {
    const last = document.getElementById('cl-last').value.trim();
    const first = document.getElementById('cl-first').value.trim();
    if (!last || !first) { toast.error('Nazwisko i imię są wymagane'); return; }

    const peselRaw = document.getElementById('cl-pesel').value.trim();
    const pesel = peselRaw.replace(/\D/g, '');
    if (pesel && pesel.length !== 11) { toast.error('PESEL musi mieć 11 cyfr'); return; }

    const payload = {
      last_name: last,
      first_name: first,
      full_name_normalized: (last + ' ' + first).toLowerCase().trim().replace(/\s+/g, ' '),
      birth_date: document.getElementById('cl-birth').value || null,
      pesel: pesel || null,
      nationality: document.getElementById('cl-nat').value.trim() || null,
      phone: document.getElementById('cl-phone').value.trim() || null,
      email: document.getElementById('cl-email').value.trim() || null,
      employer_id: document.getElementById('cl-emp').value || null,
      notes: document.getElementById('cl-notes').value.trim() || null,
    };

    let result;
    if (clientId) {
      result = await db.from('gmp_clients').update(payload).eq('id', clientId).select().single();
    } else {
      result = await db.from('gmp_clients').insert(payload).select().single();
    }
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(clientId ? 'Zapisano' : 'Dodano klienta');
    close();
    const cb = window._clientOnSaved;
    window._clientOnSaved = null;
    if (cb) cb(result.data);
  }

  // ========== PRACODAWCA MODAL ==========
  async function editEmployer(employerId = null, onSaved = null) {
    let emp = {};
    if (employerId) {
      const { data } = await db.from('gmp_employers').select('*').eq('id', employerId).maybeSingle();
      emp = data || {};
    }
    const iv = emp.invoice_data || {};
    openModal(`
      <div class="modal-header">${employerId ? 'Edytuj pracodawcę' : 'Nowy pracodawca'} <button class="btn btn-ghost btn-sm" onclick="gmpModal.close()"><i class="ph ph-x"></i></button></div>
      <div class="modal-body grid grid-cols-2 gap-3">
        <div class="col-span-2"><label>Nazwa *</label><input id="em-name" class="input w-full" value="${esc(emp.name || '')}" autofocus required></div>
        <div><label>NIP</label><input id="em-nip" class="input w-full" value="${esc(emp.nip || '')}"></div>
        <div><label>Osoba kontaktowa</label><input id="em-contact" class="input w-full" value="${esc(emp.contact_person || '')}"></div>
        <div><label>Telefon</label><input id="em-phone" class="input w-full" value="${esc(emp.contact_phone || '')}"></div>
        <div><label>Email</label><input type="email" id="em-email" class="input w-full" value="${esc(emp.contact_email || '')}"></div>
        <div class="col-span-2"><label>Adres</label><input id="em-addr" class="input w-full" value="${esc(emp.address || '')}"></div>
        <div class="col-span-2">
          <label>Dane do faktury (JSON - opcjonalnie)</label>
          <input id="em-invdata" class="input w-full font-mono text-xs" value='${esc(JSON.stringify(iv))}' placeholder='{"nazwa":"Full Sp. z o.o.","nip":"...","adres":"..."}'>
        </div>
        <div class="col-span-2"><label>Notatki</label><textarea id="em-notes" class="input w-full" rows="3">${esc(emp.notes || '')}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="gmpModal.close()">Anuluj</button>
        <button class="btn btn-primary" onclick="gmpModal.saveEmployer('${employerId || ''}')">${employerId ? 'Zapisz' : 'Dodaj'}</button>
      </div>`);
    window._employerOnSaved = onSaved;
  }

  async function saveEmployer(employerId) {
    const name = document.getElementById('em-name').value.trim();
    if (!name) { toast.error('Nazwa jest wymagana'); return; }
    let invoiceData = null;
    const invStr = document.getElementById('em-invdata').value.trim();
    if (invStr) {
      try { invoiceData = JSON.parse(invStr); } catch { toast.error('Nieprawidłowy JSON w danych faktury'); return; }
    }

    const payload = {
      name,
      name_normalized: name.toLowerCase().trim().replace(/\s+/g, ' '),
      nip: document.getElementById('em-nip').value.trim() || null,
      contact_person: document.getElementById('em-contact').value.trim() || null,
      contact_phone: document.getElementById('em-phone').value.trim() || null,
      contact_email: document.getElementById('em-email').value.trim() || null,
      address: document.getElementById('em-addr').value.trim() || null,
      invoice_data: invoiceData,
      notes: document.getElementById('em-notes').value.trim() || null,
    };

    let result;
    if (employerId) {
      result = await db.from('gmp_employers').update(payload).eq('id', employerId).select().single();
    } else {
      result = await db.from('gmp_employers').insert(payload).select().single();
    }
    if (result.error) { toast.error(result.error.message); return; }
    toast.success(employerId ? 'Zapisano' : 'Dodano pracodawcę');
    close();
    const cb = window._employerOnSaved;
    window._employerOnSaved = null;
    if (cb) cb(result.data);
  }

  // ========== SEARCH PICKER ==========
  // Uniwersalny picker: fetcher(search) -> rows, formatter(row) -> string, callback(row)
  async function picker(title, fetcher, formatter, onPick) {
    openModal(`
      <div class="modal-header">${title} <button class="btn btn-ghost btn-sm" onclick="gmpModal.close()"><i class="ph ph-x"></i></button></div>
      <div class="modal-body">
        <input id="picker-search" class="input w-full mb-3" placeholder="Wpisz min. 2 znaki..." autofocus>
        <div id="picker-results" class="max-h-80 overflow-y-auto divide-y divide-zinc-900/50 border border-zinc-900 rounded">
          <div class="p-3 text-zinc-600 text-sm">Wpisz czego szukasz...</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="gmpModal.close()">Zamknij</button>
      </div>`);

    const input = document.getElementById('picker-search');
    const results = document.getElementById('picker-results');
    let t;
    input.addEventListener('input', async () => {
      clearTimeout(t);
      const q = input.value.trim();
      if (q.length < 2) { results.innerHTML = '<div class="p-3 text-zinc-600 text-sm">Wpisz min. 2 znaki...</div>'; return; }
      t = setTimeout(async () => {
        results.innerHTML = '<div class="p-3 text-zinc-500 text-sm"><span class="spinner mr-2"></span>Szukam...</div>';
        try {
          const rows = await fetcher(q);
          if (!rows?.length) { results.innerHTML = '<div class="p-3 text-zinc-500 text-sm">Brak wyników</div>'; return; }
          results.innerHTML = rows.map((row, i) => `
            <button class="picker-row w-full text-left p-3 hover:bg-zinc-900/70 text-sm" data-idx="${i}">
              ${formatter(row)}
            </button>`).join('');
          results.querySelectorAll('.picker-row').forEach((btn, i) => {
            btn.addEventListener('click', () => { close(); onPick(rows[i]); });
          });
        } catch (e) {
          results.innerHTML = `<div class="p-3 text-red-400 text-sm">${esc(e.message || e)}</div>`;
        }
      }, 250);
    });
  }

  function pickClient(onPick) {
    return picker(
      'Wybierz klienta',
      async (q) => (await db.from('gmp_clients').select('id, last_name, first_name, birth_date, phone, email, nationality').or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%,phone.ilike.%${q}%`).limit(30)).data,
      (c) => `<div class="text-white">${esc(c.last_name)} ${esc(c.first_name)}${c.birth_date ? ` <span class="text-zinc-500 text-xs">(ur. ${c.birth_date})</span>` : ''}</div>
             <div class="text-xs text-zinc-500">${esc(c.nationality || '')}${c.phone ? ' • ' + esc(c.phone) : ''}${c.email ? ' • ' + esc(c.email) : ''}</div>`,
      onPick
    );
  }

  function pickEmployer(onPick) {
    return picker(
      'Wybierz pracodawcę',
      async (q) => (await db.from('gmp_employers').select('id, name, nip, contact_person').or(`name.ilike.%${q}%,nip.ilike.%${q}%`).limit(30)).data,
      (e) => `<div class="text-white">${esc(e.name)}</div>
             <div class="text-xs text-zinc-500">${e.nip ? 'NIP: ' + esc(e.nip) : ''}${e.contact_person ? ' • ' + esc(e.contact_person) : ''}</div>`,
      onPick
    );
  }

  // ========== CONFIRM MODAL ==========
  // Wspólny modal "OK / Anuluj" z dowolnym HTML body.
  // Zwraca Promise<boolean> — true gdy użytkownik kliknął confirm, false gdy anuluj/zamknął.
  // Nie zamyka modala automatycznie gdy confirm — używaj `gmpModal.close()` po zakończeniu
  //   (robimy to sami w handlerze: wywołujący widzi DOM formularza, czyta wartości, potem close).
  function confirm(title, bodyHtml, opts = {}) {
    const confirmLabel = opts.confirmLabel || 'OK';
    const cancelLabel = opts.cancelLabel || 'Anuluj';
    const confirmClass = opts.confirmClass || 'btn-primary';
    const size = opts.size || 'auto'; // 'auto' | 'full'
    return new Promise((resolve) => {
      let settled = false;
      const done = (result) => {
        if (settled) return;
        settled = true;
        window.__gmpConfirmResolve = null;
        if (!result) close();
        // Na true: NIE zamykamy modala — caller odczyta DOM, wykona save i sam wywoła gmpModal.close().
        resolve(result);
      };
      window.__gmpConfirmResolve = done;
      openModal(`
        <div class="modal-header">
          ${esc(title)}
          <button class="btn btn-ghost btn-sm" onclick="window.__gmpConfirmResolve && window.__gmpConfirmResolve(false)"><i class="ph ph-x"></i></button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="window.__gmpConfirmResolve && window.__gmpConfirmResolve(false)">${esc(cancelLabel)}</button>
          <button class="btn ${confirmClass}" onclick="window.__gmpConfirmResolve && window.__gmpConfirmResolve(true)">${esc(confirmLabel)}</button>
        </div>
      `);
      // Pozwól callerowi wstrzyknąć logikę po otwarciu modala (pre-populate, setup listenerów)
      if (typeof opts.onOpen === 'function') {
        queueMicrotask(() => opts.onOpen());
      }
    });
  }

  // Wrapper: confirm + automatyczny close po kliknięciu confirm.
  // Używany gdy wywołujący NIE czyta DOM body (prosta potwierdzająca kwestia tak/nie).
  async function confirmAndClose(title, bodyHtml, opts = {}) {
    const ok = await confirm(title, bodyHtml, opts);
    close();
    return ok;
  }

  return {
    openModal, close,
    editClient, saveClient, editEmployer, saveEmployer,
    picker, pickClient, pickEmployer,
    confirm, confirmAndClose,
  };
})();
