// Case detail drawer — najważniejszy ekran w produkcie
function CaseDrawer({ caseItem, data, onClose }) {
  const [tab, setTab] = React.useState('overview');
  if (!caseItem) return null;
  const c = caseItem;
  const cli = H.clientById(c.clientId);
  const emp = H.employerById(c.employerId);
  const law = H.staffById(c.lawyerId);
  const ass = H.staffById(c.assistantId);
  const docs = data.documents.filter(d => d.caseId === c.id);
  const tasks = data.tasks.filter(t => t.caseId === c.id);
  const alerts = data.alerts.filter(a => a.caseId === c.id);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}></div>
      <aside className="drawer wide">
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              <i className="ph ph-scales"></i>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>{cli && `${cli.first} ${cli.last}`}</h2>
                <Pill kind="gray" mono>{c.id}</Pill>
                <StatusPill caseStatus={c.status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                <span>{cli && cli.flag} {cli && cli.nationality}</span>
                <span style={{ color: 'var(--fg-dim)' }}>·</span>
                <span>{c.kind}</span>
                <span style={{ color: 'var(--fg-dim)' }}>·</span>
                <span>otwarte <span className="font-mono">{c.opened}</span></span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm"><i className="ph ph-pencil-simple"></i>Edytuj</button>
            <button className="btn btn-primary btn-sm"><i className="ph ph-arrow-right"></i>Zmień etap</button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><i className="ph ph-x"></i></button>
          </div>
        </div>

        <div className="tabs in-drawer">
          {[
            { id: 'overview', label: 'Przegląd' },
            { id: 'esubmission', label: 'Elektroniczne złożenie', count: 8 },
            { id: 'documents', label: 'Dokumenty', count: docs.length },
            { id: 'payments', label: 'Płatności' },
            { id: 'notes', label: 'Notatki' },
            { id: 'history', label: 'Historia' },
          ].map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}{t.count !== undefined && <span className="count">{t.count}</span>}
            </button>
          ))}
        </div>

        <div className="drawer-body">
          {tab === 'overview' && (
            <>
              {alerts.length > 0 && alerts.map(a => (
                <Banner key={a.id} kind={a.severity === 'overdue' ? 'danger' : 'warn'} icon={a.severity === 'overdue' ? 'warning-octagon' : 'warning'} title={a.title}
                  action={<button className="btn btn-sm btn-secondary">{a.action}</button>}>
                  {a.message}
                </Banner>
              ))}

              <div className="case-detail">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Card title="Sprawa" sub="Dane proceduralne">
                    <dl className="dl">
                      <dt>Numer</dt><dd className="mono">{c.id}</dd>
                      <dt>Typ</dt><dd>{c.kind}</dd>
                      <dt>Etap</dt><dd><Pill kind="accent">{c.stageLabel}</Pill> <span className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)', marginLeft: 6 }}>{c.daysInStage}d w etapie</span></dd>
                      <dt>Otwarte</dt><dd className="mono">{c.opened}</dd>
                      <dt>Ostatnia zmiana</dt><dd className="mono">{c.lastChange}</dd>
                      <dt>Priorytet</dt><dd><Pill kind={H.priorityKind(c.priority)}>{H.priorityLabel(c.priority)}</Pill></dd>
                    </dl>
                  </Card>

                  <Card title="Klient" action={<button className="btn btn-ghost btn-sm">Karta klienta<i className="ph ph-arrow-right"></i></button>}>
                    <dl className="dl">
                      <dt>Imię i nazwisko</dt><dd>{cli && `${cli.first} ${cli.last}`}</dd>
                      <dt>Narodowość</dt><dd>{cli && cli.flag} {cli && cli.nationality}</dd>
                      <dt>Data urodzenia</dt><dd className="mono">{cli && cli.born}</dd>
                      <dt>PESEL</dt><dd className="mono">{cli && cli.pesel}</dd>
                      <dt>Telefon</dt><dd className="mono">{cli && cli.phone}</dd>
                      <dt>Email</dt><dd className="mono">{cli && cli.email}</dd>
                    </dl>
                  </Card>

                  <Card title="Pracodawca">
                    <dl className="dl">
                      <dt>Nazwa</dt><dd>{emp && emp.name}</dd>
                      <dt>NIP</dt><dd className="mono">{emp && emp.nip}</dd>
                      <dt>Branża</dt><dd>{emp && emp.branch}</dd>
                      <dt>Kontakt</dt><dd>{emp && emp.contact}</dd>
                      <dt>Miasto</dt><dd>{emp && emp.city}</dd>
                    </dl>
                  </Card>
                </div>

                <div className="case-rail">
                  <div className="drawer-summary">
                    <div className="row"><span className="lbl">Zespół</span><div className="v" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {law && <><StaffAvatar staffId={law.id} size="sm" /><span>{law.name}</span></>}
                    </div></div>
                    {ass && <div className="row"><span className="lbl">Asystent</span><div className="v" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <StaffAvatar staffId={ass.id} size="sm" /><span>{ass.name}</span>
                    </div></div>}
                    <hr />
                    <div className="row"><span className="lbl">Honorarium</span><span className="v font-mono">{H.fmtPLN(c.lawyerFee)}</span></div>
                    <div className="row"><span className="lbl">Opłata wniosku</span><span className="v font-mono">{H.fmtPLN(c.appFee)}</span></div>
                    <div className="row"><span className="lbl">Status płatności</span><span className="v"><Pill kind={H.paymentKind(c.paymentStatus)}>{H.paymentLabel(c.paymentStatus)}</Pill></span></div>
                    <hr />
                    <div className="row"><span className="lbl">Akcje</span></div>
                    <button className="btn btn-secondary btn-block"><i className="ph ph-envelope"></i>Wyślij raport klientowi</button>
                    <button className="btn btn-secondary btn-block"><i className="ph ph-currency-circle-dollar"></i>Wystaw fakturę</button>
                    <button className="btn btn-secondary btn-block"><i className="ph ph-file-arrow-down"></i>Pobierz pełnomocnictwo</button>
                  </div>

                  {tasks.length > 0 && (
                    <Card title="Zadania" sub={`${tasks.length} otwarte`}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {tasks.map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input type="checkbox" className="checkbox" />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12.5, color: 'var(--fg-1)' }}>{t.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}><span className="font-mono">{t.deadline}</span></div>
                            </div>
                            <Pill kind={H.priorityKind(t.priority)} mono>{t.priority[0].toUpperCase()}</Pill>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === 'esubmission' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Banner kind="info" icon="info" title="8 sekcji elektronicznego złożenia">
                Sekcje A–H prowadzą sprawczą ścieżkę wnioskowania. <em className="font-serif">Zakończ</em> sekcje w kolejności, system zaprezentuje pakiet startowy.
              </Banner>
              {[
                { m: 'A', t: 'Minimum dokumentów', meta: '6/7 zebranych', done: true },
                { m: 'B', t: 'Profil zaufany', meta: 'Aktywny do 2027-04', done: true },
                { m: 'C', t: 'Ankieta klienta', meta: '24/24 odpowiedzi', done: true },
                { m: 'D', t: 'Opłaty administracyjne', meta: '440 PLN · opłacono', done: true },
                { m: 'E', t: 'Spotkanie z klientem', meta: '5 maja 2026 · 10:30', active: true },
                { m: 'F', t: 'Załącznik nr 1 + checklisty', meta: 'W przygotowaniu' },
                { m: 'G', t: 'Złożenie wniosku + UPO', meta: 'Czeka' },
                { m: 'H', t: 'Raporty (klient + pracodawca)', meta: 'Czeka' },
              ].map(s => (
                <Collapsible key={s.m} marker={s.m} title={s.t} meta={<>{s.done && <Pill kind="ok" dot>Zakończone</Pill>}{s.active && <Pill kind="accent" dot>W toku</Pill>}{!s.done && !s.active && <span style={{ fontSize: 11 }}>{s.meta}</span>}</>}
                  done={s.done} active={s.active} defaultOpen={s.active}>
                  <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55 }}>
                    {s.m === 'A' && 'Lista wymaganych dokumentów: paszport, załącznik nr 1, umowa o pracę, zaświadczenie ZUS, PIT-37, zdjęcie biometryczne, ksero karty pobytu (jeśli kontynuacja).'}
                    {s.m === 'B' && 'Klient ma aktywny profil zaufany przez ePUAP. Możliwe podpisywanie elektroniczne.'}
                    {s.m === 'C' && 'Wypełniono ankietę 24-pytaniową. Brak czerwonych flag, gotowe do złożenia.'}
                    {s.m === 'D' && <>Opłata wniosku <span className="font-mono">{H.fmtPLN(c.appFee)}</span> przekazana przez kancelarię dnia 2026-04-15.</>}
                    {s.m === 'E' && <>Spotkanie zaplanowane: <strong>MUW Kraków</strong>, sala 304, 5 maja 2026 godz. <span className="font-mono">10:30</span>. Klient dotrze 30 min wcześniej, zabrany pakiet dokumentów + zdjęcie biometryczne.</>}
                    {s.m === 'F' && 'Generator załącznika nr 1 dostępny po opłaceniu wniosku. Checklist koordynacyjna 11 punktów.'}
                    {s.m === 'G' && 'Po złożeniu — oczekiwanie na UPO (średnio 2-4 dni). Auto-import do dokumentów.'}
                    {s.m === 'H' && 'Auto-generowanie 2 raportów PDF po wydaniu decyzji (klient + pracodawca z RODO check).'}
                  </div>
                </Collapsible>
              ))}
            </div>
          )}

          {tab === 'documents' && (
            <Card flush>
              <table className="table">
                <thead><tr><th>Dokument</th><th>Wgrany</th><th>Rozmiar</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {docs.length === 0 && <tr><td colSpan="5"><Empty icon="file-x" title="Brak dokumentów" body="Wgraj pierwszy dokument do tej sprawy." /></td></tr>}
                  {docs.map(d => (
                    <tr key={d.id}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="ph ph-file-text" style={{ color: 'var(--fg-muted)', fontSize: 16 }}></i><strong style={{ color: 'var(--fg)' }}>{d.type}</strong></div></td>
                      <td className="font-mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{d.uploaded || '—'}</td>
                      <td className="font-mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{d.size || '—'}</td>
                      <td>
                        {d.status === 'ok' && <Pill kind="ok" dot>OK</Pill>}
                        {d.status === 'warning' && <Pill kind="warn" dot>Sprawdź</Pill>}
                        {d.status === 'missing' && <Pill kind="gray" dot>Brak</Pill>}
                      </td>
                      <td><button className="btn btn-sm btn-ghost"><i className="ph ph-dots-three"></i></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {tab === 'payments' && (
            <Card flush>
              <table className="table">
                <thead><tr><th>Data</th><th>Typ</th><th>Kwota</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td className="font-mono" style={{ fontSize: 12 }}>2026-02-14</td><td>Honorarium kancelarii</td><td className="num">{H.fmtPLN(c.lawyerFee)}</td><td><Pill kind="ok" dot>Opłacono</Pill></td></tr>
                  <tr><td className="font-mono" style={{ fontSize: 12 }}>2026-04-15</td><td>Opłata wniosku</td><td className="num">{H.fmtPLN(c.appFee)}</td><td><Pill kind={H.paymentKind(c.paymentStatus)} dot>{H.paymentLabel(c.paymentStatus)}</Pill></td></tr>
                </tbody>
              </table>
            </Card>
          )}

          {tab === 'notes' && (
            <Card>
              <textarea className="textarea" placeholder="Dopisz notatkę wewnętrzną…" style={{ width: '100%', minHeight: 100 }}></textarea>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm">Dodaj notatkę</button>
                <button className="btn btn-secondary btn-sm"><i className="ph ph-paperclip"></i>Załącz</button>
              </div>
              <div style={{ marginTop: 18 }}>
                <div className="list">
                  <div className="list-row" style={{ alignItems: 'flex-start' }}>
                    <Avatar initials="AK" color="var(--accent)" />
                    <div className="lr-body">
                      <div className="lr-title">Anna Kowalska</div>
                      <div className="lr-meta"><span className="font-mono">2026-04-28 14:12</span></div>
                      <div style={{ marginTop: 6, fontSize: 13, color: 'var(--fg-1)' }}>Klient potwierdził obecność na spotkaniu 5 maja. Pamiętać o zdjęciu biometrycznym — nie ma jeszcze w pakiecie.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {tab === 'history' && (
            <Card>
              <Timeline items={[
                { time: '2026-04-30 13:20', icon: 'arrow-right', tone: 'info', title: 'Zmiana etapu na "Po osobistym"', sub: 'Anna Kowalska' },
                { time: '2026-04-15 11:14', icon: 'currency-circle-dollar', tone: 'ok', title: 'Opłata wniosku opłacona przez kancelarię', sub: 'Faktura FV/2026/04/0140' },
                { time: '2026-04-12 09:30', icon: 'file-arrow-up', tone: 'ok', title: 'Wgrano załącznik nr 1', sub: 'Kasia Wiśniewska' },
                { time: '2026-02-14 10:00', icon: 'plus-circle', tone: 'ok', title: 'Sprawa utworzona', sub: 'Paweł Nowak' },
              ]} />
            </Card>
          )}
        </div>
      </aside>
    </>
  );
}

window.CaseDrawer = CaseDrawer;
