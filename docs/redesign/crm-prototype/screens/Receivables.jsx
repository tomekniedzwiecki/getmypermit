// Receivables — windykacja, aging buckets
function Receivables({ data, onOpenCase }) {
  const buckets = {
    '30':   data.receivables.filter(r => r.bucket === '30'),
    '60':   data.receivables.filter(r => r.bucket === '60'),
    '90':   data.receivables.filter(r => r.bucket === '90'),
    '90+':  data.receivables.filter(r => r.bucket === '90+'),
  };
  const sumOf = (arr) => arr.reduce((s, r) => s + r.amount, 0);
  const total = sumOf(data.receivables);

  return (
    <div className="page">
      <PageHeader
        title="Windykacja"
        sub={<>Należności ogółem <strong className="font-mono">{H.fmtPLN(total)}</strong> · <em className="font-serif">{data.receivables.length}</em> przypadków</>}
        actions={
          <>
            <button className="btn btn-secondary"><i className="ph ph-envelope"></i>Wyślij ponaglenia</button>
            <button className="btn btn-secondary"><i className="ph ph-export"></i>Eksport</button>
          </>
        }
      />

      <div className="kpi-row">
        <Kpi iconKind="info"   icon="clock"           label="Do 30 dni"  value={H.fmtPLN(sumOf(buckets['30']))} foot={`${buckets['30'].length} przypadków`} />
        <Kpi iconKind="warn"   icon="hourglass"       label="30–60 dni"  value={H.fmtPLN(sumOf(buckets['60']))} foot={`${buckets['60'].length} przypadków`} />
        <Kpi iconKind="danger" icon="warning"         label="60–90 dni"  value={H.fmtPLN(sumOf(buckets['90']))} foot={`${buckets['90'].length} przypadków`} />
        <Kpi iconKind="danger" icon="warning-octagon" label="ponad 90 dni" value={H.fmtPLN(sumOf(buckets['90+']))} foot={`${buckets['90+'].length} przypadków`} />
      </div>

      <div style={{ height: 18 }}></div>

      <Card title="Lista zaległości" sub="Sortowane wg dni opóźnienia (od najpilniejszych)" flush>
        <table className="table">
          <thead>
            <tr>
              <th>Sprawa</th>
              <th>Klient</th>
              <th>Dni opóźnienia</th>
              <th className="text-right">Kwota</th>
              <th>Akcja</th>
            </tr>
          </thead>
          <tbody>
            {[...data.receivables].sort((a, b) => b.daysOverdue - a.daysOverdue).map(r => {
              const sev = r.daysOverdue > 60 ? 'overdue' : r.daysOverdue > 30 ? 'warn' : '';
              return (
                <tr key={r.id} onClick={() => onOpenCase(r.caseId)}>
                  <td><span className="id-cell">{r.caseId}</span></td>
                  <td><strong>{r.clientName}</strong></td>
                  <td>
                    <div className={`alert-day-badge ${sev}`} style={{ display: 'inline-flex', minWidth: 50, height: 38, padding: '6px 4px' }}>
                      <span className="num" style={{ fontSize: 16 }}>{r.daysOverdue}</span>
                      <span className="lbl">dni</span>
                    </div>
                  </td>
                  <td className="num"><strong style={{ color: r.daysOverdue > 60 ? 'var(--danger-text)' : 'var(--fg)' }}>{H.fmtPLN(r.amount)}</strong></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-secondary"><i className="ph ph-envelope"></i>Ponaglenie</button>
                      <button className="btn btn-sm btn-ghost"><i className="ph ph-phone"></i></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

window.Receivables = Receivables;
