// Invoices — faktury
function Invoices({ data }) {
  const [filter, setFilter] = React.useState('all');
  const filtered = data.invoices.filter(i => filter === 'all' ? true : i.status === filter);
  const totalGross = filtered.reduce((s, i) => s + i.gross, 0);
  const totalNet = filtered.reduce((s, i) => s + i.net, 0);

  return (
    <div className="page">
      <PageHeader
        title="Faktury"
        sub={<>{filtered.length} dokumentów · netto <span className="font-mono">{H.fmtPLN(totalNet)}</span> · brutto <span className="font-mono">{H.fmtPLN(totalGross)}</span></>}
        actions={
          <>
            <button className="btn btn-secondary"><i className="ph ph-export"></i>Eksport JPK</button>
            <button className="btn btn-primary"><i className="ph ph-plus"></i>Wystaw fakturę</button>
          </>
        }
      />

      <div className="filter-bar">
        {[['all', 'Wszystkie'], ['wystawiona', 'Wystawione'], ['wysłana', 'Wysłane'], ['oplacona', 'Opłacone']].map(([k, l]) => (
          <button key={k} className={`chip ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Numer</th>
              <th>Data</th>
              <th>Odbiorca</th>
              <th>NIP</th>
              <th className="text-right">Netto</th>
              <th className="text-right">VAT</th>
              <th className="text-right">Brutto</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id}>
                <td className="font-mono" style={{ fontSize: 12, fontWeight: 500 }}>{i.id}</td>
                <td className="font-mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{i.date}</td>
                <td><strong>{i.recipient}</strong></td>
                <td className="font-mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{i.recipientNip}</td>
                <td className="num">{H.fmtPLN(i.net)}</td>
                <td className="num" style={{ color: 'var(--fg-muted)' }}>{H.fmtPLN(i.vat)}</td>
                <td className="num"><strong>{H.fmtPLN(i.gross)}</strong></td>
                <td>
                  {i.status === 'oplacona' && <Pill kind="ok" dot>Opłacona</Pill>}
                  {i.status === 'wystawiona' && <Pill kind="info" dot>Wystawiona</Pill>}
                  {i.status === 'wysłana' && <Pill kind="warn" dot>Wysłana</Pill>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-ghost" title="PDF"><i className="ph ph-file-pdf"></i></button>
                    <button className="btn btn-sm btn-ghost" title="Wyślij"><i className="ph ph-paper-plane-tilt"></i></button>
                    <button className="btn btn-sm btn-ghost"><i className="ph ph-dots-three"></i></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

window.Invoices = Invoices;
