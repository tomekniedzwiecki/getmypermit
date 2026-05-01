// ClientDrawer — karta klienta
function ClientDrawer({ client, data, onClose, onOpenCase }) {
  const [tab, setTab] = React.useState('profile');
  if (!client) return null;
  const c = client;
  const cases = data.cases.filter(x => x.clientId === c.id);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose}></div>
      <aside className="drawer">
        <div className="drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
            <Avatar initials={c.first[0] + c.last[0]} flag={c.flag} size="xl" color="var(--accent)" />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>{c.first} {c.last}</h2>
                <Pill kind="gray" mono>{c.id}</Pill>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--fg-muted)' }}>
                <span>{c.flag} {c.nationality}</span>
                <span style={{ color: 'var(--fg-dim)' }}>·</span>
                <span>{c.profession}</span>
                <span style={{ color: 'var(--fg-dim)' }}>·</span>
                <span>ur. <span className="font-mono">{c.born}</span></span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm"><i className="ph ph-pencil-simple"></i>Edytuj</button>
            <button className="btn btn-primary btn-sm"><i className="ph ph-plus"></i>Nowa sprawa</button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><i className="ph ph-x"></i></button>
          </div>
        </div>

        <div className="tabs in-drawer">
          {[
            { id: 'profile', label: 'Profil' },
            { id: 'cases', label: 'Sprawy', count: cases.length },
            { id: 'docs', label: 'Dokumenty osobiste' },
            { id: 'notes', label: 'Notatki' },
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
                <dt>Imię i nazwisko</dt><dd>{c.first} {c.last}</dd>
                <dt>Narodowość</dt><dd>{c.flag} {c.nationality}</dd>
                <dt>Data urodzenia</dt><dd className="mono">{c.born}</dd>
                <dt>PESEL</dt><dd className="mono">{c.pesel}</dd>
                <dt>Zawód</dt><dd>{c.profession}</dd>
                <dt>Telefon</dt><dd className="mono">{c.phone}</dd>
                <dt>Email</dt><dd className="mono">{c.email}</dd>
                <dt>Liczba spraw</dt><dd>{c.cases} (<span className="font-mono">{cases.filter(x => x.status === 'aktywna').length}</span> aktywnych)</dd>
                <dt>Ostatnia aktywność</dt><dd className="mono">{c.lastSeen}</dd>
              </dl>
            </Card>
          )}

          {tab === 'cases' && (
            <Card flush>
              <div className="list">
                {cases.length === 0 && <Empty icon="folder-open" title="Brak spraw" body="Ten klient nie ma jeszcze otwartej sprawy." />}
                {cases.map(cs => (
                  <div key={cs.id} className="list-row" onClick={() => onOpenCase(cs.id)}>
                    <div className="lr-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><i className="ph ph-scales"></i></div>
                    <div className="lr-body">
                      <div className="lr-title">{cs.kind}</div>
                      <div className="lr-meta">
                        <span className="font-mono">{cs.id}</span>
                        <span className="sep">·</span>
                        <Pill kind="accent" mono>{cs.stageLabel}</Pill>
                        <span className="sep">·</span>
                        <span>otwarte <span className="font-mono">{cs.opened}</span></span>
                      </div>
                    </div>
                    <StatusPill caseStatus={cs.status} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === 'docs' && (
            <Card flush>
              <div className="list">
                <div className="list-row">
                  <div className="lr-icon"><i className="ph ph-identification-card"></i></div>
                  <div className="lr-body">
                    <div className="lr-title">Paszport</div>
                    <div className="lr-meta"><span className="font-mono">AB1234567</span><span className="sep">·</span>ważny do <span className="font-mono">2029-08-22</span></div>
                  </div>
                  <Pill kind="ok" dot>Aktualny</Pill>
                </div>
                <div className="list-row">
                  <div className="lr-icon"><i className="ph ph-credit-card"></i></div>
                  <div className="lr-body">
                    <div className="lr-title">Karta pobytu czasowego</div>
                    <div className="lr-meta"><span className="font-mono">CZA 4187392</span><span className="sep">·</span>ważna do <span className="font-mono">2027-04-12</span></div>
                  </div>
                  <Pill kind="ok" dot>Aktualna</Pill>
                </div>
                <div className="list-row">
                  <div className="lr-icon"><i className="ph ph-file-text"></i></div>
                  <div className="lr-body">
                    <div className="lr-title">PIT-37 za 2025</div>
                    <div className="lr-meta">złożony <span className="font-mono">2026-03-10</span></div>
                  </div>
                  <Pill kind="warn" dot>Sprawdź</Pill>
                </div>
              </div>
            </Card>
          )}

          {tab === 'notes' && (
            <Card>
              <textarea className="textarea" placeholder="Dopisz notatkę…" style={{ width: '100%', minHeight: 100 }}></textarea>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm">Dodaj</button>
              </div>
            </Card>
          )}
        </div>
      </aside>
    </>
  );
}

window.ClientDrawer = ClientDrawer;
