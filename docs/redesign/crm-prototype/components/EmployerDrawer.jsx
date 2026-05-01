// EmployerDrawer — karta pracodawcy z legalnością pracy
function EmployerDrawer({ employer, data, onClose, onOpenCase }) {
  const [tab, setTab] = React.useState('profile');
  if (!employer) return null;
  const e = employer;
  const employerCases = data.cases.filter(c => c.employerId === e.id);
  const legality = data.legality.filter(l => l.employerId === e.id);
  const legalPct = Math.round((e.legality / e.workers) * 100);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}></div>
      <aside className="drawer">
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
              <i className="ph ph-buildings"></i>
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>{e.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                <span className="font-mono">NIP {e.nip}</span>
                <span style={{ color: 'var(--fg-dim)' }}>·</span>
                <span>{e.branch}</span>
                <span style={{ color: 'var(--fg-dim)' }}>·</span>
                <span>{e.city}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm"><i className="ph ph-pencil-simple"></i>Edytuj</button>
            <button className="btn btn-primary btn-sm"><i className="ph ph-file-arrow-down"></i>Raport legalności</button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><i className="ph ph-x"></i></button>
          </div>
        </div>

        <div style={{ padding: '14px 28px', background: 'var(--surface)', borderBottom: '1px solid var(--hairline)', display: 'flex', gap: 24 }}>
          <div>
            <div className="eyebrow">Pracownicy</div>
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--fg)' }} className="font-mono">{e.workers}</div>
          </div>
          <div>
            <div className="eyebrow">Legalność</div>
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)', color: legalPct >= 90 ? 'var(--ok)' : legalPct >= 70 ? 'var(--warn)' : 'var(--danger)' }} className="font-mono">{legalPct}%</div>
          </div>
          <div>
            <div className="eyebrow">Sprawy aktywne</div>
            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--fg)' }} className="font-mono">{employerCases.filter(c => c.status === 'aktywna').length}</div>
          </div>
          <div>
            <div className="eyebrow">Ostatnia faktura</div>
            <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--fg)', marginTop: 4 }} className="font-mono">{H.fmtPLN(e.lastInvoiceAmount)}</div>
          </div>
        </div>

        <div className="tabs in-drawer">
          {[
            { id: 'profile', label: 'Profil' },
            { id: 'workers', label: 'Pracownicy', count: legality.length },
            { id: 'cases', label: 'Sprawy', count: employerCases.length },
            { id: 'invoices', label: 'Faktury' },
          ].map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}{t.count !== undefined && <span className="count">{t.count}</span>}
            </button>
          ))}
        </div>

        <div className="drawer-body">
          {tab === 'profile' && (
            <Card>
              <dl className="dl">
                <dt>Pełna nazwa</dt><dd>{e.name}</dd>
                <dt>NIP</dt><dd className="mono">{e.nip}</dd>
                <dt>Branża</dt><dd>{e.branch}</dd>
                <dt>Miasto</dt><dd>{e.city}</dd>
                <dt>Kontakt</dt><dd>{e.contact}</dd>
                <dt>Pracownicy cudzoziemcy</dt><dd>{e.workers}</dd>
                <dt>Legalność (z aktualnym pobytem)</dt><dd>{e.legality} <span className="font-mono" style={{ color: 'var(--fg-muted)' }}>({legalPct}%)</span></dd>
              </dl>
            </Card>
          )}

          {tab === 'workers' && (
            <Card flush>
              <table className="table">
                <thead><tr><th>Pracownik</th><th>Pobyt do</th><th>Praca do</th><th>Status</th></tr></thead>
                <tbody>
                  {legality.map((l, i) => (
                    <tr key={i}>
                      <td><strong>{l.workerName}</strong></td>
                      <td className="font-mono" style={{ fontSize: 12 }}>{l.residenceUntil}</td>
                      <td className="font-mono" style={{ fontSize: 12 }}>{l.workUntil}</td>
                      <td>
                        {l.status === 'ok' && <Pill kind="ok" dot>Aktualny</Pill>}
                        {l.status === 'warn' && <Pill kind="warn" dot>Wygasa wkrótce</Pill>}
                        {l.status === 'danger' && <Pill kind="danger" dot>Wygasł</Pill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {tab === 'cases' && (
            <Card flush>
              <div className="list">
                {employerCases.map(c => {
                  const cli = H.clientById(c.clientId);
                  return (
                    <div key={c.id} className="list-row" onClick={() => onOpenCase(c.id)}>
                      <div className="lr-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><i className="ph ph-scales"></i></div>
                      <div className="lr-body">
                        <div className="lr-title">{cli && `${cli.first} ${cli.last}`}</div>
                        <div className="lr-meta"><span className="font-mono">{c.id}</span><span className="sep">·</span><span>{c.kind}</span><span className="sep">·</span><Pill kind="accent" mono>{c.stageLabel}</Pill></div>
                      </div>
                      <StatusPill caseStatus={c.status} />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {tab === 'invoices' && (
            <Card flush>
              <table className="table">
                <thead><tr><th>Numer</th><th>Data</th><th>Netto</th><th>Brutto</th><th>Status</th></tr></thead>
                <tbody>
                  {data.invoices.filter(i => i.recipientNip === e.nip).map(i => (
                    <tr key={i.id}>
                      <td className="font-mono" style={{ fontSize: 12 }}>{i.id}</td>
                      <td className="font-mono" style={{ fontSize: 12 }}>{i.date}</td>
                      <td className="num">{H.fmtPLN(i.net)}</td>
                      <td className="num">{H.fmtPLN(i.gross)}</td>
                      <td>{i.status === 'oplacona' ? <Pill kind="ok" dot>Opłacona</Pill> : i.status === 'wystawiona' ? <Pill kind="info" dot>Wystawiona</Pill> : <Pill kind="warn" dot>Wysłana</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      </aside>
    </>
  );
}

window.EmployerDrawer = EmployerDrawer;
