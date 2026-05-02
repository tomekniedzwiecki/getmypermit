// Foreigner detail drawer — the deepest screen in the product
function ForeignerDrawer({ foreigner, data, companyId, onClose, onChanged }) {
  const [tab, setTab] = React.useState('overview');
  const [panel, setPanel] = React.useState(null); // 'edit' | 'add-document' | 'add-event' | 'refer'

  if (!foreigner) return null;

  const f = foreigner;
  const raw = f._raw || {};
  const docs = data.documents.filter(d => d.foreignerId === f.id);
  const events = data.events.filter(e => e.subjectId === f.id);
  const alerts = data.alerts.filter(a => a.subjectId === f.id);

  const overallStatus =
    f.residenceStatus === 'red' || f.workStatus === 'red' ? 'danger' :
    f.residenceStatus === 'yellow' || f.workStatus === 'yellow' ? 'warn' :
    f.residenceStatus === 'gray' ? 'gray' : 'ok';

  const refresh = async () => { onChanged && await onChanged(); };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}></div>
      <aside className="drawer">
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{f.flag}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>{f.name}</h2>
                <Pill kind="gray" mono>{f.shortId || f.id.slice(0, 8)}</Pill>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                <span>{f.position}</span>
                <span style={{ color: 'var(--fg-dim)' }}>·</span>
                <span>{f.subcontractor}</span>
                <span style={{ color: 'var(--fg-dim)' }}>·</span>
                <span>Aktualizacja <span className="font-mono">{f.lastUpdate}</span></span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setPanel(panel === 'edit' ? null : 'edit')}><i className="ph ph-pencil-simple"></i>Edytuj</button>
            <button className="btn btn-primary btn-sm" onClick={() => setPanel(panel === 'refer' ? null : 'refer')}><i className="ph ph-scales"></i>Zleć kancelarii</button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><i className="ph ph-x"></i></button>
          </div>
        </div>

        {/* Status strip */}
        <div style={{ padding: '12px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="micro" style={{ fontSize: 9 }}>Status pobytu</span>
            <StatusLight kind={f.residenceStatus} />
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="micro" style={{ fontSize: 9 }}>Status pracy</span>
            <StatusLight kind={f.workStatus} />
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <span className="micro" style={{ fontSize: 9 }}>Następny krok</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>
              {f._nextAction || (alerts.length > 0 ? alerts[0].action : 'Brak akcji wymaganych')}
            </span>
          </div>
          <Pill kind={overallStatus === 'ok' ? 'ok' : overallStatus === 'warn' ? 'warn' : overallStatus === 'danger' ? 'danger' : 'gray'} dot>
            {overallStatus === 'ok' && 'Można dopuścić do pracy'}
            {overallStatus === 'warn' && 'Wymaga uzupełnienia'}
            {overallStatus === 'danger' && 'Nie rekomendujemy dopuszczenia'}
            {overallStatus === 'gray' && 'Brak danych do oceny'}
          </Pill>
        </div>

        {/* Inline panels */}
        {panel === 'edit' && (
          <EditForeignerPanel foreigner={f} raw={raw} onClose={() => setPanel(null)} onSaved={async () => { setPanel(null); await refresh(); }} />
        )}
        {panel === 'refer' && (
          <ReferToLawFirmPanel foreigner={f} companyId={companyId} onClose={() => setPanel(null)} onSent={async () => { setPanel(null); await refresh(); }} />
        )}

        {/* Tabs */}
        <div className="tabs">
          {[
            { id: 'overview', label: 'Przegląd' },
            { id: 'documents', label: `Dokumenty (${docs.length})` },
            { id: 'events', label: `Zdarzenia (${events.length})` },
            { id: 'history', label: 'Historia' },
            { id: 'cases', label: 'Sprawy' },
          ].map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <div className="drawer-body">
          {tab === 'overview' && (
            <>
              {/* Risk alerts for this person — z możliwością acknowledge */}
              {alerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alerts.map(a => (
                    <Banner key={a.id}
                      kind={a.severity === 'overdue' ? 'danger' : (a.severity === 'missing' || a.severity === '14') ? 'warn' : 'info'}
                      icon={a.severity === 'overdue' ? 'warning-octagon' : a.severity === 'missing' ? 'warning' : 'clock-countdown'}
                      title={a.title}
                      action={
                        <button className="btn btn-sm btn-secondary" onClick={async () => {
                          if (await window.mocActions.acknowledgeAlert(a.id)) await refresh();
                        }}>
                          <i className="ph ph-check"></i>Oznacz jako wykonane
                        </button>
                      }
                    >
                      {a.message}
                    </Banner>
                  ))}
                </div>
              )}

              {/* Two columns: residence + work */}
              <div className="grid-2">
                <Card title="Pobyt" sub="Dane dokumentów pobytowych">
                  <dl className="dl">
                    <dt>Dokument</dt><dd>{f.residenceDoc}</dd>
                    <dt>Ważny do</dt><dd className="mono">{f.residenceExpiry || '—'}</dd>
                    <dt>Status</dt><dd><StatusLight kind={f.residenceStatus} /></dd>
                  </dl>
                </Card>
                <Card title="Praca" sub="Podstawa legalnego powierzenia">
                  <dl className="dl">
                    <dt>Dokument</dt><dd>{f.workDoc}</dd>
                    <dt>Stanowisko (z dok.)</dt><dd>{f._terms?.doc_position || '—'}</dd>
                    <dt>Stanowisko (faktyczne)</dt><dd>{f._terms?.actual_position || '—'} {f._terms?.has_mismatch && <Pill kind="warn" style={{ marginLeft: 6 }}>zmienione</Pill>}</dd>
                    <dt>Wynagrodzenie</dt><dd className="mono">{f._terms?.actual_salary_pln ? `${Number(f._terms.actual_salary_pln).toLocaleString('pl-PL')} zł` : '—'}</dd>
                    <dt>Wymiar</dt><dd>{f._terms?.actual_worktime_hours_per_week ? `${f._terms.actual_worktime_hours_per_week}h/tyg` : '—'}</dd>
                    <dt>Status</dt><dd><StatusLight kind={f.workStatus} /></dd>
                  </dl>
                </Card>
              </div>

              <Card title="Dane podstawowe">
                <dl className="dl">
                  <dt>Imię i nazwisko</dt><dd>{f.name}</dd>
                  <dt>Obywatelstwo</dt><dd>{f.flag} {f.nationality}</dd>
                  <dt>Data urodzenia</dt><dd className="mono">{raw.birth_date || '—'}</dd>
                  <dt>Płeć</dt><dd>{({M:'Mężczyzna', F:'Kobieta', X:'Inna'})[raw.gender] || '—'}</dd>
                  <dt>Status zatrudnienia</dt><dd>{({active:'Pracuje', pending_start:'Ma rozpocząć', not_started:'Nie podjął', finished:'Zakończył', archived:'Archiwum'})[raw.status] || raw.status || '—'}</dd>
                  <dt>Data startu pracy</dt><dd className="mono">{raw.employment_started_at || '—'}</dd>
                  <dt>Telefon</dt><dd className="mono">{raw.phone || '—'}</dd>
                  <dt>Email</dt><dd className="mono">{raw.email || '—'}</dd>
                </dl>
              </Card>
            </>
          )}

          {tab === 'documents' && (
            <>
              <Card flush>
                <table className="table">
                  <thead><tr><th>Dokument</th><th>Numer</th><th>Ważny do</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {docs.length === 0 && <tr><td colSpan="5"><div className="empty">Brak dokumentów</div></td></tr>}
                    {docs.map(d => (
                      <tr key={d.id}>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="ph ph-file-text" style={{ color: 'var(--fg-muted)', fontSize: 16 }}></i><strong style={{ color: 'var(--fg)' }}>{d.type}</strong></div></td>
                        <td className="font-mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{(data.foreigners.find(x => x.id === d.foreignerId)?._docs || []).find(x => x.id === d.id)?.document_number || '—'}</td>
                        <td className="font-mono" style={{ fontSize: 12 }}>{d.expiry || '—'}</td>
                        <td>
                          {d.status === 'ok' && <Pill kind="ok" dot>Aktualny</Pill>}
                          {d.status === 'warning' && <Pill kind="warn" dot>Wygasa wkrótce</Pill>}
                          {d.status === 'expired' && <Pill kind="danger" dot>Wygasł</Pill>}
                          {d.status === 'missing' && <Pill kind="gray" dot>Brak</Pill>}
                          {d.status === 'review' && <Pill kind="gray" dot>Do weryfikacji</Pill>}
                        </td>
                        <td><button className="btn btn-sm btn-ghost"><i className="ph ph-dots-three"></i></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <div style={{ height: 12 }}></div>
              {panel === 'add-document' ? (
                <AddDocumentPanel foreignerId={f.id} companyId={companyId} onClose={() => setPanel(null)} onAdded={async () => { setPanel(null); await refresh(); }} />
              ) : (
                <button className="btn btn-secondary" onClick={() => setPanel('add-document')}>
                  <i className="ph ph-plus"></i>Dodaj dokument
                </button>
              )}
            </>
          )}

          {tab === 'events' && (
            <>
              <Card flush>
                <div className="list">
                  {events.length === 0 && <div className="empty">Brak zdarzeń dla tej osoby</div>}
                  {events.map(e => (
                    <div key={e.id} className="list-row">
                      <div className={`lr-icon ${e.status === 'ok' ? '' : e.status === 'review' ? 'warn' : ''}`}
                           style={{ background: e.status === 'review' ? 'var(--warn-bg)' : e.status === 'todo' ? 'var(--info-bg)' : 'var(--ok-bg)',
                                    color: e.status === 'review' ? 'var(--warn)' : e.status === 'todo' ? 'var(--info)' : 'var(--ok)' }}>
                        <i className="ph ph-lightning"></i>
                      </div>
                      <div className="lr-body">
                        <div className="lr-title">{e.title}</div>
                        <div className="lr-meta">
                          <span className="font-mono">{e.date}</span>
                          {e.note && <><span className="sep">·</span><span>{e.note}</span></>}
                        </div>
                      </div>
                      {e.status === 'review' && <Pill kind="warn">Wymaga oceny</Pill>}
                      {e.status === 'todo' && <Pill kind="info">Do zrobienia</Pill>}
                    </div>
                  ))}
                </div>
              </Card>
              <div style={{ height: 12 }}></div>
              {panel === 'add-event' ? (
                <AddEventPanel foreignerId={f.id} companyId={companyId} onClose={() => setPanel(null)} onAdded={async () => { setPanel(null); await refresh(); }} />
              ) : (
                <button className="btn btn-secondary" onClick={() => setPanel('add-event')}>
                  <i className="ph ph-plus"></i>Zarejestruj zdarzenie
                </button>
              )}
            </>
          )}

          {tab === 'history' && (
            <Card>
              <div className="empty" style={{ padding: 24 }}>Historia zmian — będzie dostępna gdy podłączymy audit log do widoku</div>
            </Card>
          )}

          {tab === 'cases' && (
            <Card flush>
              <div className="list">
                {data.cases.filter(c => c.foreignerId === f.id).length === 0 && <div className="empty">Brak spraw zleconych kancelarii dla tej osoby</div>}
                {data.cases.filter(c => c.foreignerId === f.id).map(c => (
                  <div key={c.id} className="list-row">
                    <div className="lr-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><i className="ph ph-scales"></i></div>
                    <div className="lr-body">
                      <div className="lr-title">{c.title}</div>
                      <div className="lr-meta"><span className="font-mono">{c.id.slice(0,8)}</span><span className="sep">·</span><span>{c.lawyer}</span><span className="sep">·</span><span>{c.stage}</span></div>
                    </div>
                    <Pill kind={c.priority === 'high' ? 'danger' : c.priority === 'medium' ? 'warn' : 'gray'}>{c.priority === 'high' ? 'Pilne' : c.priority === 'medium' ? 'Średnie' : 'Niskie'}</Pill>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </aside>
    </>
  );
}


// ============================================================================
// Inline panels — pokazują się pod headerem drawera
// ============================================================================

function PanelShell({ title, onClose, children }) {
  return (
    <div style={{ padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h3>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><i className="ph ph-x"></i></button>
      </div>
      {children}
    </div>
  );
}

function EditForeignerPanel({ foreigner, raw, onClose, onSaved }) {
  const [form, setForm] = React.useState({
    first_name: raw.first_name || '', last_name: raw.last_name || '',
    nationality: raw.nationality || '', birth_date: raw.birth_date || '',
    gender: raw.gender || '', phone: raw.phone || '', email: raw.email || '',
    status: raw.status || 'pending_start', employment_started_at: raw.employment_started_at || '',
    next_action_text: raw.next_action_text || '',
  });
  const [saving, setSaving] = React.useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSave() {
    setSaving(true);
    const patch = {};
    for (const k of Object.keys(form)) {
      patch[k] = form[k] === '' ? null : form[k];
    }
    const result = await window.mocActions.updateForeigner(foreigner.id, patch);
    setSaving(false);
    if (result) {
      window.toast?.success('Zmiany zapisane');
      onSaved && await onSaved();
    }
  }

  return (
    <PanelShell title="Edytuj cudzoziemca" onClose={onClose}>
      <div className="grid-2">
        <div className="field"><label>Imię</label><input value={form.first_name} onChange={set('first_name')} /></div>
        <div className="field"><label>Nazwisko</label><input value={form.last_name} onChange={set('last_name')} /></div>
        <div className="field">
          <label>Status zatrudnienia</label>
          <select value={form.status} onChange={set('status')}>
            <option value="pending_start">Ma rozpocząć</option>
            <option value="active">Pracuje</option>
            <option value="not_started">Nie podjął</option>
            <option value="finished">Zakończył</option>
            <option value="archived">Archiwum</option>
          </select>
        </div>
        <div className="field"><label>Data startu pracy</label><input type="date" value={form.employment_started_at} onChange={set('employment_started_at')} className="font-mono" /></div>
        <div className="field"><label>Telefon</label><input value={form.phone} onChange={set('phone')} className="font-mono" /></div>
        <div className="field"><label>Email</label><input value={form.email} onChange={set('email')} /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>Następny krok (notatka)</label><input value={form.next_action_text} onChange={set('next_action_text')} placeholder="Co trzeba zrobić z tym cudzoziemcem?" /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Zapisuję…' : 'Zapisz'}</button>
        <button className="btn btn-ghost" onClick={onClose}>Anuluj</button>
      </div>
    </PanelShell>
  );
}

function AddDocumentPanel({ foreignerId, companyId, onClose, onAdded }) {
  const [form, setForm] = React.useState({
    kind: 'visa', document_number: '', issuing_authority: '',
    valid_from: '', valid_until: '',
  });
  const [saving, setSaving] = React.useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSave() {
    setSaving(true);
    const result = await window.mocActions.addDocument({
      companyId, foreignerId,
      kind: form.kind,
      documentNumber: form.document_number || null,
      issuingAuthority: form.issuing_authority || null,
      validFrom: form.valid_from || null,
      validUntil: form.valid_until || null,
    });
    setSaving(false);
    if (result) onAdded && await onAdded();
  }

  return (
    <Card title="Dodaj dokument">
      <div className="grid-2">
        <div className="field">
          <label>Typ dokumentu</label>
          <select value={form.kind} onChange={set('kind')}>
            <option value="passport">Paszport</option>
            <option value="visa">Wiza krajowa D</option>
            <option value="residence_card">Karta pobytu</option>
            <option value="visa_free_entry">Ruch bezwizowy</option>
            <option value="pesel_confirmation">PESEL UKR</option>
            <option value="work_permit">Zezwolenie typ A</option>
            <option value="work_declaration">Oświadczenie</option>
            <option value="work_notification">Powiadomienie (UA)</option>
            <option value="employment_contract">Umowa</option>
            <option value="application_receipt">UPO</option>
            <option value="application_decision">Decyzja</option>
            <option value="other">Inny</option>
          </select>
        </div>
        <div className="field"><label>Numer dokumentu</label><input value={form.document_number} onChange={set('document_number')} className="font-mono" /></div>
        <div className="field"><label>Organ wydający</label><input value={form.issuing_authority} onChange={set('issuing_authority')} placeholder="Wojewoda Mazowiecki" /></div>
        <div className="field"><label>Ważny od</label><input type="date" value={form.valid_from} onChange={set('valid_from')} className="font-mono" /></div>
        <div className="field"><label>Ważny do</label><input type="date" value={form.valid_until} onChange={set('valid_until')} className="font-mono" /></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Zapisuję…' : 'Dodaj dokument'}</button>
        <button className="btn btn-ghost" onClick={onClose}>Anuluj</button>
      </div>
    </Card>
  );
}

function AddEventPanel({ foreignerId, companyId, onClose, onAdded }) {
  const [form, setForm] = React.useState({
    kind: 'work_started', occurred_at: new Date().toISOString().slice(0, 10),
    title: '', description: '', requires_action: false,
  });
  const [saving, setSaving] = React.useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Pre-fill title based on kind
  React.useEffect(() => {
    const titleMap = {
      work_started: 'Rozpoczęcie pracy',
      work_not_started: 'Niepodjęcie pracy',
      work_ended: 'Zakończenie pracy',
      position_changed: 'Zmiana stanowiska',
      salary_changed: 'Zmiana wynagrodzenia',
      worktime_changed: 'Zmiana wymiaru czasu pracy',
      application_filed: 'Cudzoziemiec złożył wniosek',
      upo_received: 'UPO dostarczone',
      manual_note: 'Notatka',
    };
    if (titleMap[form.kind]) setForm(s => ({ ...s, title: titleMap[form.kind] }));
  }, [form.kind]);

  const requiresActionKinds = ['work_not_started', 'work_ended', 'position_changed', 'salary_changed', 'worktime_changed', 'application_filed'];

  async function handleSave() {
    setSaving(true);
    const { error } = await window.db.from('moc_events').insert({
      company_id: companyId,
      foreigner_id: foreignerId,
      kind: form.kind,
      occurred_at: form.occurred_at,
      title: form.title || form.kind,
      description: form.description || null,
      requires_action: requiresActionKinds.includes(form.kind),
    });
    setSaving(false);
    if (error) {
      window.toast?.error(error.message);
      return;
    }
    window.toast?.success('Zdarzenie zarejestrowane');
    onAdded && await onAdded();
  }

  return (
    <Card title="Zarejestruj zdarzenie">
      <div className="grid-2">
        <div className="field">
          <label>Typ zdarzenia</label>
          <select value={form.kind} onChange={set('kind')}>
            <option value="work_started">Rozpoczęcie pracy</option>
            <option value="work_not_started">Niepodjęcie pracy</option>
            <option value="work_ended">Zakończenie pracy</option>
            <option value="position_changed">Zmiana stanowiska</option>
            <option value="salary_changed">Zmiana wynagrodzenia</option>
            <option value="worktime_changed">Zmiana wymiaru czasu pracy</option>
            <option value="application_filed">Złożono wniosek pobytowy</option>
            <option value="upo_received">UPO dostarczone</option>
            <option value="manual_note">Notatka</option>
          </select>
        </div>
        <div className="field"><label>Data zdarzenia</label><input type="date" value={form.occurred_at} onChange={set('occurred_at')} className="font-mono" /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>Tytuł</label><input value={form.title} onChange={set('title')} /></div>
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>Opis (opcjonalny)</label><input value={form.description} onChange={set('description')} placeholder="Dodatkowe szczegóły" /></div>
      </div>
      {requiresActionKinds.includes(form.kind) && (
        <Banner kind="info" icon="info">To zdarzenie może wymagać reakcji (np. zawiadomienia urzędu). System oznaczy je jako „do zrobienia".</Banner>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'Zapisuję…' : 'Zarejestruj'}</button>
        <button className="btn btn-ghost" onClick={onClose}>Anuluj</button>
      </div>
    </Card>
  );
}

function ReferToLawFirmPanel({ foreigner, companyId, onClose, onSent }) {
  const [form, setForm] = React.useState({
    subject: '', problem_description: '', desired_outcome: '', urgency: 'warning',
  });
  const [saving, setSaving] = React.useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSend() {
    if (!form.subject.trim() || !form.problem_description.trim()) {
      window.toast?.error('Wypełnij temat i opis problemu');
      return;
    }
    setSaving(true);
    const snapshot = {
      foreigner: { first_name: foreigner._raw?.first_name, last_name: foreigner._raw?.last_name, nationality: foreigner._raw?.nationality, birth_date: foreigner._raw?.birth_date },
      legality: { stay: foreigner.residenceStatus, work: foreigner.workStatus },
      next_action: foreigner._nextAction,
      legality_reason: foreigner._legalityReason,
    };
    const { error } = await window.db.from('moc_referrals').insert({
      company_id: companyId,
      foreigner_id: foreigner.id,
      subject: form.subject,
      problem_description: form.problem_description,
      desired_outcome: form.desired_outcome || null,
      urgency: form.urgency,
      status: 'sent',
      sent_at: new Date().toISOString(),
      context_snapshot: snapshot,
    });
    setSaving(false);
    if (error) {
      window.toast?.error(error.message);
      return;
    }
    window.toast?.success('Zlecenie wysłane do kancelarii');
    onSent && await onSent();
  }

  return (
    <PanelShell title="Zleć kancelarii" onClose={onClose}>
      <Banner kind="info" icon="info">
        Kancelaria otrzyma snapshot stanu cudzoziemca i przejmie sprawę. Otrzymasz odpowiedź w panelu „Sprawy zlecone".
      </Banner>
      <div style={{ height: 12 }}></div>
      <div className="grid-2">
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Temat *</label>
          <input value={form.subject} onChange={set('subject')} placeholder={`np. „${foreigner.name} — analiza ryzyka po wygaśnięciu karty pobytu"`} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Opis problemu *</label>
          <textarea rows="4" value={form.problem_description} onChange={set('problem_description')} style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }} placeholder="Opisz co się stało, co próbowałeś, czego potrzebujesz od kancelarii…"></textarea>
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Pożądany rezultat</label>
          <input value={form.desired_outcome} onChange={set('desired_outcome')} placeholder="np. Analiza prawnicza + przygotowanie wniosku o przedłużenie pobytu" />
        </div>
        <div className="field">
          <label>Pilność</label>
          <select value={form.urgency} onChange={set('urgency')}>
            <option value="info">Informacyjna</option>
            <option value="warning">Standard</option>
            <option value="danger">Pilna</option>
            <option value="critical">Krytyczna</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-primary" disabled={saving} onClick={handleSend}><i className="ph ph-paper-plane-tilt"></i>{saving ? 'Wysyłam…' : 'Wyślij zlecenie'}</button>
        <button className="btn btn-ghost" onClick={onClose}>Anuluj</button>
      </div>
    </PanelShell>
  );
}

window.ForeignerDrawer = ForeignerDrawer;
