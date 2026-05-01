// LeadsPipeline — funnel konwersji
function LeadsPipeline({ data, navTo }) {
  const stages = [
    { key: 'nowy',         label: 'Nowy lead',       count: 18, kind: 'gray' },
    { key: 'kontakt',      label: 'Pierwszy kontakt',count: 12, kind: 'info' },
    { key: 'oferta',       label: 'Oferta wysłana',count: 7,  kind: 'accent' },
    { key: 'negocjacje',   label: 'Negocjacje',      count: 4,  kind: 'warn' },
    { key: 'wygrane',      label: 'Wygrane (sprawa)',count: 2,  kind: 'ok' },
  ];
  const max = Math.max(...stages.map(s => s.count));

  return (
    <div className="page">
      <PageHeader
        title="Pipeline leadów"
        sub={<>Funnel konwersji · ostatnie 30 dni · konwersja <em className="font-serif">11%</em></>}
        actions={<button className="btn btn-secondary" onClick={() => navTo('leads')}><i className="ph ph-list"></i>Lista leadów</button>}
      />

      <Card title="Etapy konwersji" sub="Liczba leadów na każdym etapie" >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stages.map((s, i) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 160, fontSize: 13, color: 'var(--fg-1)', fontWeight: 500 }}>
                <span className="eyebrow" style={{ marginRight: 8 }}>{i + 1}</span>{s.label}
              </div>
              <div style={{ flex: 1, height: 32, background: 'var(--surface-3)', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${(s.count / max) * 100}%`,
                  background: `linear-gradient(90deg, var(--accent-soft-2), var(--accent-soft))`,
                  borderRight: '2px solid var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 12,
                }}>
                  <span className="font-mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-text)' }}>{s.count}</span>
                </div>
              </div>
              <div style={{ width: 60, textAlign: 'right' }}>
                {i > 0 && <span className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{Math.round((s.count / stages[i-1].count) * 100)}%</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ height: 18 }}></div>

      <div className="row-2">
        <Card title="Źródła leadów" sub="Skąd przychodzą">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { src: 'Polecenia', count: 24, pct: 41 },
              { src: 'Strona WWW', count: 18, pct: 31 },
              { src: 'LinkedIn', count: 9, pct: 15 },
              { src: 'Cold call', count: 5, pct: 9 },
              { src: 'Inne', count: 2, pct: 4 },
            ].map(s => (
              <div key={s.src} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 100, fontSize: 12, color: 'var(--fg-2)' }}>{s.src}</div>
                <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', background: 'var(--accent)' }}></div>
                </div>
                <div style={{ width: 60, textAlign: 'right' }} className="font-mono">{s.count}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Pipeline w PLN" sub="Wartość w lejku · estymacja honorariów">
          <div style={{ fontSize: 36, fontWeight: 600, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', color: 'var(--fg)' }} className="font-mono">
            {H.fmtPLN(184000)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>
            32 leady × średni honorarium <span className="font-mono">{H.fmtPLN(2400)}</span> × prawdopodobieństwo zważone etapem
          </div>
          <div style={{ marginTop: 18, padding: 12, background: 'var(--accent-soft)', borderRadius: 8 }}>
            <div className="eyebrow" style={{ color: 'var(--accent-text)' }}>Prognoza miesiąca</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent-text)', marginTop: 4 }} className="font-mono">{H.fmtPLN(58400)}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 2 }}>Z prawdopodobieństwem ważonym 0.8 × wygrane (90%) + 0.5 × negocjacje (50%)</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

window.LeadsPipeline = LeadsPipeline;
