// Modals — NewCase, NewClient, CommandPalette
function NewCaseModal({ data, onClose }) {
  const [step, setStep] = React.useState(1);
  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal lg">
        <div className="modal-header">
          <h3>Nowa sprawa</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><i className="ph ph-x"></i></button>
        </div>
        <div className="modal-body">
          <div className="stepper">
            {[
              { n: 1, lbl: 'Klient' },
              { n: 2, lbl: 'Pracodawca' },
              { n: 3, lbl: 'Sprawa' },
              { n: 4, lbl: 'Zespół' },
              { n: 5, lbl: 'Podsumowanie' },
            ].map((s, i, arr) => (
              <React.Fragment key={s.n}>
                <div className={`step ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
                  <div className="num">{step > s.n ? <i className="ph ph-check"></i> : s.n}</div>
                  <div className="lbl">{s.lbl}</div>
                </div>
                {i < arr.length - 1 && <div className="step-divider"></div>}
              </React.Fragment>
            ))}
          </div>

          {step === 1 && (
            <div className="grid-2">
              <div className="field"><label>Imię</label><input placeholder="Np. Mariia" defaultValue="Mariia" /></div>
              <div className="field"><label>Nazwisko</label><input placeholder="Np. Petrenko" defaultValue="Petrenko" /></div>
              <div className="field"><label>Data urodzenia</label><input type="date" defaultValue="1992-03-14" /></div>
              <div className="field"><label>Narodowość</label>
                <select><option>Ukraina</option><option>Wietnam</option><option>Indie</option></select>
              </div>
              <div className="field"><label>PESEL</label><input className="font-mono" placeholder="11 cyfr" /></div>
              <div className="field"><label>Telefon</label><input placeholder="+48 …" /></div>
              <div className="field" style={{ gridColumn: 'span 2' }}><label>Email</label><input type="email" placeholder="klient@example.com" /></div>
            </div>
          )}
          {step === 2 && (
            <div className="grid-2">
              <div className="field" style={{ gridColumn: 'span 2' }}><label>Pracodawca (firma)</label>
                <select>{data.employers.map(e => <option key={e.id}>{e.name}</option>)}</select>
              </div>
              <div className="field"><label>NIP</label><input className="font-mono" defaultValue="7011234567" /></div>
              <div className="field"><label>Branża</label><input defaultValue="Mleczarstwo" /></div>
              <div className="field" style={{ gridColumn: 'span 2' }}><label>Stanowisko klienta u pracodawcy</label><input placeholder="Np. Operator linii produkcyjnej" /></div>
            </div>
          )}
          {step === 3 && (
            <div className="grid-2">
              <div className="field" style={{ gridColumn: 'span 2' }}><label>Typ sprawy</label>
                <select>
                  <option>Pobyt czasowy + praca</option>
                  <option>Pobyt rezydenta UE</option>
                  <option>Pobyt stały</option>
                  <option>Zezwolenie na pracę typ A</option>
                  <option>Zaproszenie</option>
                  <option>Karta Polaka</option>
                  <option>Odwołanie</option>
                </select>
              </div>
              <div className="field"><label>Honorarium kancelarii (PLN)</label><input className="font-mono" defaultValue="2400" /></div>
              <div className="field"><label>Opłata wniosku (PLN)</label><input className="font-mono" defaultValue="440" /></div>
              <div className="field" style={{ gridColumn: 'span 2' }}><label>Notatki wewnętrzne</label>
                <textarea placeholder="Kontekst sprawy, ustalenia z klientem..."></textarea>
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="grid-2">
              <div className="field" style={{ gridColumn: 'span 2' }}><label>Prawnik prowadzący</label>
                <select>{data.staff.filter(s => s.roleKey === 'lawyer' || s.roleKey === 'owner').map(s => <option key={s.id}>{s.name}</option>)}</select>
              </div>
              <div className="field"><label>Asystent</label>
                <select>{data.staff.filter(s => s.roleKey === 'assistant').map(s => <option key={s.id}>{s.name}</option>)}</select>
              </div>
              <div className="field"><label>Manager (opc.)</label>
                <select><option>Brak</option>{data.staff.filter(s => s.roleKey === 'manager').map(s => <option key={s.id}>{s.name}</option>)}</select>
              </div>
            </div>
          )}
          {step === 5 && (
            <div>
              <Banner kind="info" icon="info" title="Przegląd sprawy">
                Klient <strong>Mariia Petrenko</strong> · pracodawca <strong>Polmlek Sp. z o.o.</strong> · typ <em className="font-serif">Pobyt czasowy + praca</em> · honorarium <span className="font-mono">2 400 PLN</span> · prowadzi <strong>Anna Kowalska</strong>.
              </Banner>
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--fg-muted)' }}>Po kliknięciu „Utwórz” sprawa otrzyma numer GMP-2026-XXXXX i przejdzie do etapu „Weryfikacja dokumentów”.</div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)}><i className="ph ph-arrow-left"></i>Wstecz</button>}
          <div style={{ flex: 1 }}></div>
          <button className="btn btn-ghost" onClick={onClose}>Anuluj</button>
          {step < 5
            ? <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Dalej<i className="ph ph-arrow-right"></i></button>
            : <button className="btn btn-primary" onClick={onClose}><i className="ph ph-check"></i>Utwórz sprawę</button>}
        </div>
      </div>
    </>
  );
}

function NewClientModal({ data, onClose }) {
  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal">
        <div className="modal-header">
          <h3>Dodaj klienta</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><i className="ph ph-x"></i></button>
        </div>
        <div className="modal-body">
          <div className="grid-2">
            <div className="field"><label>Imię</label><input placeholder="Mariia" /></div>
            <div className="field"><label>Nazwisko</label><input placeholder="Petrenko" /></div>
            <div className="field"><label>Data urodzenia</label><input type="date" /></div>
            <div className="field"><label>Narodowość</label><select><option>Ukraina</option><option>Wietnam</option></select></div>
            <div className="field"><label>PESEL</label><input className="font-mono" /></div>
            <div className="field"><label>Telefon</label><input /></div>
            <div className="field" style={{ gridColumn: 'span 2' }}><label>Email</label><input type="email" /></div>
            <div className="field" style={{ gridColumn: 'span 2' }}><label>Notatki</label><textarea placeholder="Kontekst, język komunikacji..."></textarea></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Anuluj</button>
          <button className="btn btn-primary" onClick={onClose}><i className="ph ph-check"></i>Dodaj</button>
        </div>
      </div>
    </>
  );
}

function CommandPalette({ data, onClose, navTo, onOpenCase }) {
  const [q, setQ] = React.useState('');
  const cases = data.cases.filter(c => {
    if (!q) return true;
    const cli = H.clientById(c.clientId);
    const name = cli ? `${cli.first} ${cli.last}` : '';
    return c.id.toLowerCase().includes(q.toLowerCase()) || name.toLowerCase().includes(q.toLowerCase());
  }).slice(0, 6);
  const routes = [
    { id: 'dashboard', label: 'Pulpit', icon: 'house' },
    { id: 'cases', label: 'Sprawy', icon: 'scales' },
    { id: 'kanban', label: 'Kanban', icon: 'kanban' },
    { id: 'clients', label: 'Klienci', icon: 'users-three' },
    { id: 'payments', label: 'Płatności', icon: 'currency-circle-dollar' },
  ].filter(r => !q || r.label.toLowerCase().includes(q.toLowerCase())).slice(0, 4);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal lg" style={{ top: '20%', transform: 'translate(-50%, 0)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ph ph-magnifying-glass" style={{ fontSize: 18, color: 'var(--fg-muted)' }}></i>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj sprawy, klienta, ekranu…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, background: 'transparent' }} />
          <span className="kbd font-mono" style={{ fontSize: 10, color: 'var(--fg-faint)', background: 'var(--surface-3)', padding: '3px 7px', borderRadius: 4 }}>ESC</span>
        </div>
        <div style={{ padding: 8, maxHeight: 400, overflowY: 'auto' }}>
          {cases.length > 0 && (
            <div className="menu" style={{ boxShadow: 'none', border: 'none', padding: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-faint)', padding: '8px 10px 4px' }}>Sprawy</div>
              {cases.map(c => {
                const cli = H.clientById(c.clientId);
                return (
                  <div key={c.id} className="menu-item" onClick={() => onOpenCase(c.id)}>
                    <i className="ph ph-scales" style={{ color: 'var(--accent)' }}></i>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{cli && `${cli.first} ${cli.last}`}</div>
                      <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{c.id} · {c.stageLabel}</div>
                    </div>
                    <span className="shortcut">↵</span>
                  </div>
                );
              })}
            </div>
          )}
          {routes.length > 0 && (
            <div className="menu" style={{ boxShadow: 'none', border: 'none', padding: 0, marginTop: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-faint)', padding: '8px 10px 4px' }}>Ekrany</div>
              {routes.map(r => (
                <div key={r.id} className="menu-item" onClick={() => navTo(r.id)}>
                  <i className={`ph ph-${r.icon}`} style={{ color: 'var(--fg-muted)' }}></i>
                  <span>{r.label}</span>
                  <span className="shortcut">⌘{r.id[0].toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { NewCaseModal, NewClientModal, CommandPalette });
