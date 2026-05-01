// Admin — panel właściciela
function Admin({ data }) {
  const [tab, setTab] = React.useState('pulse');

  return (
    <div className="page">
      <PageHeader
        eyebrow={<><span>● Super-admin</span><span className="em">tylko owner</span></>}
        title="Admin"
        sub={<>Panel zarządczy — KPI globalne, zespół, ryzyka, audyt</>}
        actions={<button className="btn btn-secondary"><i className="ph ph-shield-check"></i>Zaloguj jako</button>}
      />

      <div className="tabs" style={{ marginBottom: 18 }}>
        {[
          { id: 'pulse', label: 'Pulse' },
          { id: 'team', label: 'Zespół', count: data.staff.length },
          { id: 'risk', label: 'Ryzyko' },
          { id: 'finance', label: 'Finanse' },
          { id: 'audit', label: 'Audyt' },
        ].map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}{t.count !== undefined && <span className="count">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'pulse' && (
        <>
          <div className="kpi-row">
            <Kpi icon="users-three"          label="Aktywni klienci" value="247"      foot="+12 MoM" footKind="up" />
            <Kpi icon="scales" iconKind="info" label="Spraw w toku"  value={data.cases.filter(c => c.status === 'aktywna').length} foot="9 nowych w tym tyg." />
            <Kpi icon="check-circle" iconKind="ok" label="Success rate" value="91%" foot="+3pp YoY" footKind="up" />
            <Kpi icon="currency-circle-dollar" iconKind="warn" label="Przychód MTD" value={H.fmtPLN(51200)} foot="+14% MoM" footKind="up" />
          </div>

          <div style={{ height: 18 }}></div>

          <Card title="Działania w czasie" sub="Aktywność w ciągu ostatnich 7 dni" flush>
            <div style={{ padding: '14px 18px' }}>
              <Timeline items={[
                { time: '2026-04-30', icon: 'plus-circle', tone: 'ok', title: 'Utworzono 6 nowych spraw', sub: 'Średnio 0.86/dzień (poniżej target 1.2)' },
                { time: '2026-04-29', icon: 'currency-circle-dollar', tone: 'ok', title: 'Wystawiono 12 faktur', sub: 'Łącznie ' + H.fmtPLN(54200) },
                { time: '2026-04-28', icon: 'warning-octagon', tone: 'danger', title: '3 sprawy przekroczyły 30 dni w etapie', sub: 'Wymaga interwencji managera' },
                { time: '2026-04-26', icon: 'sign-in', tone: 'info', title: '2 nowych pracowników kancelarii zalogowanych pierwszy raz', sub: 'Onboarding ukończony' },
              ]} />
            </div>
          </Card>
        </>
      )}

      {tab === 'team' && (
        <Card flush>
          <table className="table">
            <thead><tr><th>Pracownik</th><th>Rola</th><th>Aktywne sprawy</th><th>Na czas</th><th>Śr. czas</th><th>Akcje</th></tr></thead>
            <tbody>
              {data.staff.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="name-cell">
                      <Avatar initials={s.initials} color={s.color} size="md" />
                      <div><div className="nm">{s.name}</div><div className="sm">{s.id}</div></div>
                    </div>
                  </td>
                  <td><Pill kind={s.roleKey === 'owner' ? 'accent' : s.roleKey === 'manager' ? 'info' : 'gray'}>{s.role}</Pill></td>
                  <td className="num font-mono">{s.casesActive}</td>
                  <td className="num font-mono" style={{ color: 'var(--ok-text)' }}>{Math.round(s.onTime/s.casesActive*100)}%</td>
                  <td className="num font-mono">{s.avgClose}d</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-ghost"><i className="ph ph-pencil-simple"></i></button>
                      <button className="btn btn-sm btn-ghost"><i className="ph ph-key"></i></button>
                      <button className="btn btn-sm btn-ghost"><i className="ph ph-dots-three"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'risk' && (
        <Card title="Sprawy w czerwonym" sub="Wymagają natychmiastowej interwencji" flush>
          <div className="list">
            {data.alerts.filter(a => a.severity === 'overdue').map(a => <AlertRow key={a.id} alert={a} />)}
          </div>
        </Card>
      )}

      {tab === 'finance' && (
        <div className="grid-3">
          <div className="stat"><div className="stat__label">Przychód YTD</div><div className="stat__value">{H.fmtPLN(217600)}</div><div className="stat__change stat__change--up"><i className="ph ph-trend-up"></i> +18% vs 2025</div></div>
          <div className="stat"><div className="stat__label">Marża operacyjna</div><div className="stat__value">42%</div><div className="stat__change stat__change--up"><i className="ph ph-trend-up"></i> +4pp YoY</div></div>
          <div className="stat"><div className="stat__label">Należności</div><div className="stat__value">{H.fmtPLN(data.receivables.reduce((s, r) => s + r.amount, 0))}</div><div className="stat__change stat__change--down"><i className="ph ph-trend-down"></i> +{H.fmtPLN(1240)} MoM</div></div>
        </div>
      )}

      {tab === 'audit' && (
        <Card title="Audit log" sub="Ostatnie 30 zmian w systemie" flush>
          <div style={{ padding: '14px 18px' }}>
            <Timeline items={[
              { time: '14:32', icon: 'pencil-simple', tone: 'info', title: 'Anna Kowalska zmieniła etap sprawy GMP-2026-00184', sub: '"Osobiste" → "Po osobistym"' },
              { time: '13:18', icon: 'currency-circle-dollar', tone: 'ok', title: 'Tomasz Dąbrowski wystawił fakturę FV/2026/04/0142', sub: 'TransLogistics 24 · 9 225 PLN brutto' },
              { time: '11:14', icon: 'file-arrow-up', tone: 'ok', title: 'Kasia Wiśniewska wgrała dokument Załącznik nr 1', sub: 'Sprawa GMP-2026-00203' },
              { time: '10:21', icon: 'shield-check', tone: 'ok', title: 'Paweł Nowak zalogowany z 2FA', sub: 'IP 89.42.x.x · Warszawa' },
              { time: '09:00', icon: 'warning-octagon', tone: 'danger', title: 'System wykrył brak ruchu — 3 sprawy', sub: 'Auto-alert' },
            ]} />
          </div>
        </Card>
      )}
    </div>
  );
}

window.Admin = Admin;
