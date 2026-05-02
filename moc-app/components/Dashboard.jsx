// Dashboard screen
function Dashboard({ data, onOpenForeigner, plan }) {
  const k = data.kpi;
  return (
    <div className="page">
      <div className="page-header">
        <div className="title-block">
          <h1 className="h-page">Dashboard</h1>
          <div className="sub">Przegląd legalności zatrudnienia</div>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><i className="ph ph-arrows-clockwise"></i>Odśwież</button>
          <button className="btn btn-secondary"><i className="ph ph-export"></i>Eksport</button>
          <button className="btn btn-primary"><i className="ph ph-user-plus"></i>Dodaj cudzoziemca</button>
        </div>
      </div>

      {/* Risk banner */}
      <Banner kind="danger" icon="warning-octagon" title="3 sytuacje wymagają natychmiastowej reakcji"
        action={<button className="btn btn-sm btn-secondary">Zobacz wszystkie</button>}>
        Wykryto wygasłe dokumenty pobytowe i pracownicze. <strong>Nie rekomendujemy dopuszczenia do pracy</strong> bez konsultacji kancelarii.
      </Banner>

      <div style={{ height: 16 }}></div>

      {/* KPI row */}
      <div className="kpi-row">
        <Kpi icon="users-three" iconKind="" label="Aktywnych cudzoziemców" value={k.active}
             foot={`+12 w tym miesiącu · ${k.nationalities} narodowości`} footKind="up" />
        <Kpi icon="check-circle" iconKind="ok" label="Status zielony" value={k.greenStatus}
             foot={`${Math.round(k.greenStatus / k.total * 100)}% bazy · gotowi do pracy`} />
        <Kpi icon="warning" iconKind="warn" label="Wymaga uwagi" value={k.yellowStatus + k.grayStatus}
             foot={`${k.yellowStatus} żółtych · ${k.grayStatus} bez danych`} />
        <Kpi icon="warning-octagon" iconKind="danger" label="Ryzyko / czerwony" value={k.redStatus}
             foot={`${k.overdue} po terminie · pilne`} footKind="down" />
      </div>

      <div className="row-2" style={{ marginBottom: 14 }}>
        {/* Status distribution + risk dial */}
        <Card title="Rozkład statusów" sub="Pobyt + praca · suma">
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            <RiskDial score={k.riskScore} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{k.total} cudzoziemców · stan na dziś</div>
              <DistBar green={k.greenStatus} yellow={k.yellowStatus} red={k.redStatus} gray={k.grayStatus} />
              <div style={{ marginTop: 14, fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.55 }}>
                <strong style={{ color: 'var(--fg)' }}>86 / 100</strong> — wynik compliance bazuje na kompletności dokumentów, świeżości weryfikacji i braku zaległości. Spadek poniżej <span className="font-mono">75</span> uruchamia rekomendację audytu.
              </div>
            </div>
          </div>
        </Card>

        {/* Expiring docs */}
        <Card title="Wygasające dokumenty" sub="Najbliższe 90 dni" action={<button className="btn btn-ghost btn-sm">Kalendarz <i className="ph ph-arrow-right"></i></button>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { lbl: 'Po terminie', val: k.overdue, kind: 'danger', icon: 'siren' },
              { lbl: '≤ 14 dni', val: 4, kind: 'danger', icon: 'clock-countdown' },
              { lbl: '15–30 dni', val: k.expiring30, kind: 'warn', icon: 'clock' },
              { lbl: '31–60 dni', val: k.expiring60 - k.expiring30, kind: 'info', icon: 'calendar' },
              { lbl: '61–90 dni', val: k.expiring90 - k.expiring60, kind: '', icon: 'calendar-blank' },
            ].map((row) => (
              <div key={row.lbl} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={`kpi-icon ${row.kind}`} style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`ph ph-${row.icon}`}></i>
                </div>
                <div style={{ flex: 1, fontSize: 13, color: 'var(--fg-1)' }}>{row.lbl}</div>
                <div className="font-mono" style={{ fontWeight: 600, fontSize: 14, color: 'var(--fg)' }}>{row.val}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alerts + Activity */}
      <div className="row-2">
        <Card title="Alerty wymagające reakcji" sub={`${data.alerts.length} otwartych · sortowane wg pilności`} flush
              action={<button className="btn btn-ghost btn-sm">Wszystkie <i className="ph ph-arrow-right"></i></button>}>
          <div className="list">
            {data.alerts.slice(0, 5).map((a) => {
              const sev = a.severity === 'overdue' ? 'overdue' : (a.severity === '14' || a.severity === 'missing') ? 'warn' : '';
              const sevLabel = a.severity === 'overdue' ? 'PO TERMIE' :
                               a.severity === 'missing' ? 'BRAK' :
                               a.severity === '14' ? '14 DNI' :
                               a.severity === '30' ? '30 DNI' :
                               a.severity === '60' ? '60 DNI' : '90 DNI';
              return (
                <div key={a.id} className="alert-row" onClick={() => onOpenForeigner(a.subjectId)}>
                  <div className={`alert-day-badge ${sev}`}>
                    {a.daysOffset !== undefined && a.daysOffset !== null ? (
                      <>
                        <span className="num">{Math.abs(a.daysOffset)}</span>
                        <span className="lbl">{a.daysOffset < 0 ? 'po term.' : 'dni'}</span>
                      </>
                    ) : (
                      <>
                        <i className="ph ph-warning" style={{ fontSize: 18, color: 'var(--warn-text)' }}></i>
                        <span className="lbl">brak</span>
                      </>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--fg-2)', fontWeight: 500 }}>{a.subject}</span>
                      <span style={{ color: 'var(--fg-dim)' }}>·</span>
                      <span style={{ maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.message}</span>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-secondary" onClick={(e) => e.stopPropagation()}>{a.action}</button>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Ostatnia aktywność" sub="Live feed" flush>
          <div style={{ padding: '14px 18px' }}>
            <div className="timeline">
              {data.activity.map((it, i) => (
                <div key={i} className="tl-item">
                  <div className={`tl-marker ${it.tone === 'danger' ? 'danger' : it.tone === 'warning' ? 'warn' : it.tone === 'ok' ? 'ok' : it.tone === 'info' ? 'info' : ''}`}>
                    <i className={`ph ph-${it.icon}`}></i>
                  </div>
                  <div className="tl-time">{it.time}</div>
                  <div className="tl-title">{it.text}</div>
                  <div className="tl-sub">{it.subject}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Plan-aware footer info */}
      {plan === 'Basic' && (
        <div style={{ marginTop: 16 }}>
          <Banner kind="info" icon="lightbulb" title="Rozważ pakiet Pro"
            action={<button className="btn btn-sm btn-primary">Porównaj plany</button>}>
            W planie Basic widzisz alerty i braki. <strong>Pro</strong> dodaje obsługę kancelarii: weryfikację ryzyk, przygotowanie zawiadomień i raporty compliance.
          </Banner>
        </div>
      )}
      {plan === 'Pro' && (
        <div style={{ marginTop: 16 }}>
          <Banner kind="ok" icon="shield-check" title="Aktywna obsługa kancelarii"
            action={<button className="btn btn-sm btn-secondary">Sprawy <i className="ph ph-arrow-right"></i></button>}>
            <strong>11 spraw</strong> w toku · średni czas odpowiedzi <span className="font-mono">3h 24min</span> · prawnik prowadzący: mec. P. Zieliński
          </Banner>
        </div>
      )}
    </div>
  );
}

window.Dashboard = Dashboard;
