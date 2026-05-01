// Payments — rejest płatności
function Payments({ data, onOpenCase }) {
  const [filter, setFilter] = React.useState('all');
  const filtered = data.payments.filter(p => filter === 'all' ? true : p.status === filter);
  const total = filtered.reduce((s, p) => s + p.amount, 0);
  const counts = {
    all: data.payments.length,
    'do-oplaty': data.payments.filter(p => p.status === 'do-oplaty').length,
    'klient-przekazal': data.payments.filter(p => p.status === 'klient-przekazal').length,
    'kancelaria-oplacila': data.payments.filter(p => p.status === 'kancelaria-oplacila').length,
    oplacono: data.payments.filter(p => p.status === 'oplacono').length,
    sporne: data.payments.filter(p => p.status === 'sporne').length,
  };

  return (
    <div className="page">
      <PageHeader
        title="Płatności"
        sub={<>{filtered.length} pozycji · suma <span className="font-mono">{H.fmtPLN(total)}</span></>}
        actions={
          <>
            <button className="btn btn-secondary"><i className="ph ph-export"></i>Eksport</button>
            <button className="btn btn-primary"><i className="ph ph-plus"></i>Dodaj płatność</button>
          </>
        }
      />

      <div className="filter-bar">
        {[
          ['all', 'Wszystkie'],
          ['do-oplaty', 'Do opłaty'],
          ['klient-przekazal', 'Klient przekazał'],
          ['kancelaria-oplacila', 'Kancelaria opłaciła'],
          ['oplacono', 'Opłacono'],
          ['sporne', 'Sporne'],
        ].map(([k, l]) => (
          <button key={k} className={`chip ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
            {l}<span className="count">{counts[k]}</span>
          </button>
        ))}
      </div>

      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Sprawa</th>
              <th>Klient</th>
              <th>Typ</th>
              <th className="text-right">Kwota</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} onClick={() => onOpenCase(p.caseId)}>
                <td className="font-mono" style={{ fontSize: 12 }}>{p.date}</td>
                <td><span className="id-cell">{p.caseId}</span></td>
                <td><strong>{p.clientName}</strong></td>
                <td>
                  <Pill kind="gray">{p.kind === 'wniosek' ? 'Opłata wniosku' : p.kind === 'karta' ? 'Karta pobytu' : 'Honorarium'}</Pill>
                </td>
                <td className="num"><strong>{H.fmtPLN(p.amount)}</strong></td>
                <td><Pill kind={H.paymentKind(p.status)} dot>{H.paymentLabel(p.status)}</Pill></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--surface-2)', fontWeight: 600 }}>
              <td colSpan="4" style={{ padding: '14px 16px', fontSize: 12, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Suma</td>
              <td className="num" style={{ padding: '14px 16px', fontSize: 14 }}>{H.fmtPLN(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}

window.Payments = Payments;
