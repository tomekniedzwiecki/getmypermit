// Foreigner detail drawer — the deepest screen in the product
function ForeignerDrawer({ foreigner, data, onClose }) {
  const [tab, setTab] = React.useState('overview');
  if (!foreigner) return null;

  const f = foreigner;
  const docs = data.documents.filter(d => d.foreignerId === f.id);
  const events = data.events.filter(e => e.subjectId === f.id);
  const alerts = data.alerts.filter(a => a.subjectId === f.id);

  const overallStatus =
    f.residenceStatus === 'red' || f.workStatus === 'red' ? 'danger' :
    f.residenceStatus === 'yellow' || f.workStatus === 'yellow' ? 'warn' :
    f.residenceStatus === 'gray' ? 'gray' : 'ok';

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
                <Pill kind="gray" mono>{f.id}</Pill>
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
            <button className="btn btn-secondary btn-sm"><i className="ph ph-pencil-simple"></i>Edytuj</button>
            <button className="btn btn-primary btn-sm"><i className="ph ph-scales"></i>Zleć kancelarii</button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="micro" style={{ fontSize: 9 }}>Następny krok</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg)' }}>
              {alerts.length > 0 ? alerts[0].action : 'Brak akcji wymaganych'}
            </span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Pill kind={overallStatus === 'ok' ? 'ok' : overallStatus === 'warn' ? 'warn' : overallStatus === 'danger' ? 'danger' : 'gray'} dot>
              {overallStatus === 'ok' && 'Można dopuścić do pracy'}
              {overallStatus === 'warn' && 'Wymaga uzupełnienia'}
              {overallStatus === 'danger' && 'Nie rekomendujemy dopuszczenia'}
              {overallStatus === 'gray' && 'Brak danych do oceny'}
            </Pill>
          </div>
        </div>

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
              {/* Risk alerts for this person */}
              {alerts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alerts.map(a => (
                    <Banner key={a.id}
                      kind={a.severity === 'overdue' ? 'danger' : (a.severity === 'missing' || a.severity === '14') ? 'warn' : 'info'}
                      icon={a.severity === 'overdue' ? 'warning-octagon' : a.severity === 'missing' ? 'warning' : 'clock-countdown'}
                      title={a.title}
                      action={<button className="btn btn-sm btn-secondary">{a.action}</button>}
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
                    <dt>Numer</dt><dd className="mono">CZA 4187392</dd>
                    <dt>Wydany</dt><dd className="mono">2025-04-12</dd>
                    <dt>Ważny do</dt><dd className="mono">{f.residenceExpiry || '—'}</dd>
                    <dt>Podstawa</dt><dd>Praca · art. 114 ust. 1</dd>
                    <dt>Status</dt><dd><StatusLight kind={f.residenceStatus} /></dd>
                  </dl>
                </Card>
                <Card title="Praca" sub="Podstawa legalnego powierzenia">
                  <dl className="dl">
                    <dt>Dokument</dt><dd>{f.workDoc}</dd>
                    <dt>Stanowisko (z dok.)</dt><dd>{f.position}</dd>
                    <dt>Stanowisko (faktyczne)</dt><dd>{f.position} {f.id === 'F-1047' && <Pill kind="warn" style={{ marginLeft: 6 }}>zmienione</Pill>}</dd>
                    <dt>Wynagrodzenie</dt><dd className="mono">5 800 zł brutto</dd>
                    <dt>Wymiar</dt><dd>Pełny etat</dd>
                    <dt>Status</dt><dd><StatusLight kind={f.workStatus} /></dd>
                  </dl>
                </Card>
              </div>

              <Card title="Dane podstawowe">
                <dl className="dl">
                  <dt>Imię i nazwisko</dt><dd>{f.name}</dd>
                  <dt>Obywatelstwo</dt><dd>{f.flag} {f.nationality}</dd>
                  <dt>Data urodzenia</dt><dd className="mono">1991-03-22</dd>
                  <dt>Paszport</dt><dd className="mono">AB1234567 · ważny do 2029-08-22</dd>
                  <dt>PESEL</dt><dd className="mono">91032212345</dd>
                  <dt>Adres zameldowania</dt><dd>ul. Przemysłowa 14/3, 41-200 Sosnowiec</dd>
                  <dt>Kontakt</dt><dd className="mono">+48 600 123 456 · {f.name.split(' ')[0].toLowerCase()}@example.com</dd>
                </dl>
              </Card>
            </>
          )}

          {tab === 'documents' && (
            <Card flush>
              <table className="table">
                <thead><tr><th>Dokument</th><th>Wgrany</th><th>Ważny do</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {docs.map(d => (
                    <tr key={d.id}>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="ph ph-file-text" style={{ color: 'var(--fg-muted)', fontSize: 16 }}></i><strong style={{ color: 'var(--fg)' }}>{d.type}</strong></div></td>
                      <td className="font-mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{d.uploaded || '—'}</td>
                      <td className="font-mono" style={{ fontSize: 12 }}>{d.expiry || '—'}</td>
                      <td>
                        {d.status === 'ok' && <Pill kind="ok" dot>Aktualny</Pill>}
                        {d.status === 'warning' && <Pill kind="warn" dot>Wygasa wkrótce</Pill>}
                        {d.status === 'expired' && <Pill kind="danger" dot>Wygasł</Pill>}
                        {d.status === 'missing' && <Pill kind="gray" dot>Brak</Pill>}
                      </td>
                      <td><button className="btn btn-sm btn-ghost"><i className="ph ph-dots-three"></i></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {tab === 'events' && (
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
          )}

          {tab === 'history' && (
            <Card>
              <div className="timeline">
                {[
                  { time: '2026-04-30 14:32', title: 'System wykrył wygaśnięcie dokumentu', sub: 'Karta pobytu · automatycznie', tone: 'danger', icon: 'warning-octagon' },
                  { time: '2026-04-28 11:14', title: 'Zaktualizowano dane stanowiska', sub: 'Anna Kowalska · ręczna edycja', tone: 'info', icon: 'pencil-simple' },
                  { time: '2026-04-15 09:00', title: 'Dodano dokument: Karta pobytu', sub: 'Anna Kowalska · upload', tone: 'ok', icon: 'file-arrow-up' },
                  { time: '2025-04-15 10:22', title: 'Cudzoziemiec dodany do systemu', sub: 'Onboarding zakończony', tone: 'ok', icon: 'user-plus' },
                ].map((h, i) => (
                  <div key={i} className="tl-item">
                    <div className={`tl-marker ${h.tone}`}><i className={`ph ph-${h.icon}`}></i></div>
                    <div className="tl-time">{h.time}</div>
                    <div className="tl-title">{h.title}</div>
                    <div className="tl-sub">{h.sub}</div>
                  </div>
                ))}
              </div>
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
                      <div className="lr-meta"><span className="font-mono">{c.id}</span><span className="sep">·</span><span>{c.lawyer}</span><span className="sep">·</span><span>{c.stage}</span></div>
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

window.ForeignerDrawer = ForeignerDrawer;
