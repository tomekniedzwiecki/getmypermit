// Analytics — BI dashboard
function Analytics({ data }) {
  // Mock chart data
  const monthly = [
    { m: 'Lis', net: 28400 }, { m: 'Gru', net: 32800 }, { m: 'Sty', net: 41200 },
    { m: 'Lut', net: 38600 }, { m: 'Mar', net: 44800 }, { m: 'Kwi', net: 51200 },
  ];
  const maxNet = Math.max(...monthly.map(m => m.net));

  const kindStats = [
    { kind: 'Pobyt czasowy + praca', count: 87, pct: 47 },
    { kind: 'Pobyt rezydenta UE',    count: 32, pct: 17 },
    { kind: 'Zezwolenie na pracę typ A', count: 24, pct: 13 },
    { kind: 'Pobyt stały',           count: 18, pct: 10 },
    { kind: 'Odwołania',        count: 14, pct: 8 },
    { kind: 'Pozostałe',        count: 9,  pct: 5 },
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow={<><span>● Analytics</span><span className="em">stan na 30 kwietnia</span></>}
        title="Analytics"
        sub={<>Przegląd portfela kancelarii · YoY <em className="font-serif">+18%</em></>}
        actions={
          <>
            <div className="seg">
              <button>Tydzień</button>
              <button>Miesiąc</button>
              <button className="active">Kwartał</button>
              <button>Rok</button>
            </div>
            <button className="btn btn-secondary"><i className="ph ph-export"></i>Raport PDF</button>
          </>
        }
      />

      <div className="kpi-row">
        <Kpi iconKind="ok"     icon="check-circle"     label="Success rate"   value="91%" foot="+3pp YoY" footKind="up" />
        <Kpi iconKind="info"   icon="clock"            label="Śr. czas sprawy" value="42d" foot="-5d YoY" footKind="up" />
        <Kpi iconKind="warn"   icon="currency-circle-dollar" label="Przychód MoM"   value={H.fmtPLN(51200)} foot="+14% MoM" footKind="up" />
        <Kpi                       icon="users-three"      label="Aktywni klienci" value="247" foot="+12 w tym mies." footKind="up" />
      </div>

      <div style={{ height: 18 }}></div>

      <div className="row-2">
        <Card title="Przychód miesięczny" sub="Ostatnie 6 miesięcy · netto">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180, padding: '10px 0', borderBottom: '1px solid var(--hairline)' }}>
            {monthly.map(m => {
              const h = (m.net / maxNet) * 100;
              return (
                <div key={m.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div className="font-mono" style={{ fontSize: 10, color: 'var(--fg-muted)' }}>{(m.net / 1000).toFixed(0)}k</div>
                  <div style={{
                    width: '100%', maxWidth: 56,
                    height: `${h}%`,
                    background: m.m === 'Kwi' ? 'linear-gradient(180deg, var(--accent), var(--accent-hover))' : 'var(--surface-3)',
                    borderRadius: '6px 6px 0 0',
                    transition: 'all var(--dur-base) var(--ease)',
                  }}></div>
                  <div style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 500 }}>{m.m}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--fg-muted)' }}>
            Trend <span style={{ color: 'var(--ok)', fontWeight: 600 }} className="font-mono">+18% YoY</span> · prognoza maja <span className="font-mono" style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{H.fmtPLN(56000)}</span>
          </div>
        </Card>

        <Card title="Rozkład typów spraw" sub="Według liczby aktywnych w portfelu">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {kindStats.map(k => (
              <div key={k.kind} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 180, fontSize: 12.5, color: 'var(--fg-1)' }}>{k.kind}</div>
                <div style={{ flex: 1, height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${k.pct}%`, height: '100%', background: 'var(--accent)' }}></div>
                </div>
                <div style={{ width: 72, textAlign: 'right' }} className="font-mono">{k.count} <span style={{ color: 'var(--fg-muted)', fontSize: 11 }}>({k.pct}%)</span></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ height: 18 }}></div>

      <div className="row-2">
        <Card title="Czas zamknięcia sprawy" sub="Średnia wg typu (dni)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            {[
              { kind: 'Zaproszenie',     d: 18, kind2: 'ok' },
              { kind: 'Karta Polaka',    d: 28, kind2: 'ok' },
              { kind: 'Pobyt czasowy + praca', d: 41, kind2: 'ok' },
              { kind: 'Pobyt rezydenta UE',    d: 56, kind2: 'warn' },
              { kind: 'Pobyt stały',     d: 67, kind2: 'warn' },
              { kind: 'Odwołania',  d: 84, kind2: 'danger' },
            ].map(r => (
              <div key={r.kind} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>{r.kind}</div>
                <div style={{ width: 80, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(r.d / 90) * 100}%`, height: '100%', background: `var(--${r.kind2})` }}></div>
                </div>
                <div className="font-mono" style={{ width: 50, textAlign: 'right', fontWeight: 500 }}>{r.d}d</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Performance prawników" sub="Sprawy aktywne · % na czas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...data.staff].sort((a, b) => b.casesActive - a.casesActive).slice(0, 6).map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar initials={s.initials} color={s.color} size="sm" />
                <div style={{ flex: 1, fontSize: 13 }}>{s.name}</div>
                <span className="font-mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{s.casesActive} sp.</span>
                <span className="font-mono" style={{ fontSize: 12, color: 'var(--ok-text)', minWidth: 40, textAlign: 'right' }}>{Math.round(s.onTime/s.casesActive*100)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

window.Analytics = Analytics;
