// Calendar — spotkania i terminy
function Calendar({ data, onOpenCase }) {
  // Maj 2026 — 1 maja to piątek
  const days = [];
  for (let i = 1; i <= 31; i++) {
    const date = `2026-05-${String(i).padStart(2, '0')}`;
    const apps = data.appointments.filter(ap => ap.date === date);
    days.push({ d: i, date, apps });
  }
  // padding na początku — 1 maja to piątek (4. dzień licząc od poniedziałku, indeks 4)
  const padding = Array.from({ length: 4 }, (_, i) => ({ d: 27 + i, muted: true }));

  return (
    <div className="page">
      <PageHeader
        title="Kalendarz"
        sub={<>Maj 2026 · <em className="font-serif">5 zaplanowanych spotkań</em></>}
        actions={
          <>
            <div className="seg">
              <button className="active">Miesiąc</button>
              <button>Tydzień</button>
              <button>Dzień</button>
            </div>
            <button className="btn btn-secondary"><i className="ph ph-caret-left"></i></button>
            <button className="btn btn-secondary"><i className="ph ph-caret-right"></i></button>
            <button className="btn btn-primary"><i className="ph ph-plus"></i>Dodaj termin</button>
          </>
        }
      />

      <Card title="Maj 2026" sub="Klik w dzień, aby zobaczyć szczegóły">
        <div className="cal" style={{ marginBottom: 8 }}>
          {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map(d => <div key={d} className="cal-head">{d}</div>)}
        </div>
        <div className="cal">
          {padding.map((d, i) => (
            <div key={`p${i}`} className="cal-day muted">
              <div className="dnum">{d.d}</div>
            </div>
          ))}
          {days.map(d => {
            const isToday = d.d === 1;
            return (
              <div key={d.d} className={`cal-day ${isToday ? 'today' : ''}`}>
                <div className="dnum">{d.d}</div>
                {d.apps.length > 0 && (
                  <div style={{ marginTop: 4, fontSize: 10, color: 'var(--fg-2)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {d.apps.slice(0, 2).map(ap => (
                      <div key={ap.id} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--accent-soft)', color: 'var(--accent-text)', padding: '1px 4px', borderRadius: 3 }}>
                        <span className="font-mono">{ap.time.slice(0, 5)}</span> {ap.kind.split(' ')[0]}
                      </div>
                    ))}
                    {d.apps.length > 2 && <div style={{ fontSize: 9, color: 'var(--fg-muted)' }}>+{d.apps.length - 2} więcej</div>}
                  </div>
                )}
                {d.apps.length > 0 && (
                  <div className="dots">
                    {d.apps.slice(0, 3).map((ap, i) => (
                      <span key={i} className={`dot ${ap.kind.includes('Osobiste') ? 'warn' : 'info'}`}></span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ height: 18 }}></div>

      <Card title="Najbliższe spotkania" sub="Lista chronologiczna" flush>
        <div className="list">
          {data.appointments.map(ap => {
            const cli = H.clientById(ap.clientId);
            return (
              <div key={ap.id} className="list-row" onClick={() => onOpenCase(ap.caseId)}>
                <div className="lr-icon" style={{ background: ap.kind.includes('Osobiste') ? 'var(--warn-bg)' : 'var(--accent-soft)', color: ap.kind.includes('Osobiste') ? 'var(--warn)' : 'var(--accent)' }}>
                  <i className={`ph ph-${ap.kind.includes('Online') ? 'video-camera' : ap.kind.includes('Osobiste') ? 'fingerprint' : 'calendar-check'}`}></i>
                </div>
                <div className="lr-body">
                  <div className="lr-title">{ap.kind} — {cli && `${cli.first} ${cli.last}`}</div>
                  <div className="lr-meta">
                    <span className="font-mono">{ap.date} · {ap.time}</span>
                    <span className="sep">·</span>
                    <span>{ap.place}</span>
                    <span className="sep">·</span>
                    <span className="font-mono">{ap.caseId}</span>
                  </div>
                </div>
                <StaffAvatar staffId={ap.staffId} size="sm" />
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

window.Calendar = Calendar;
