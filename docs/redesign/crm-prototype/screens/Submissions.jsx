// Submissions — kolejka wniosków do złożenia w urzędzie
function Submissions({ data, onOpenCase }) {
  const ready = data.cases.filter(c => c.stage === 'zlozenie-wniosku' || (c.stage === 'weryfikacja-dokumentow' && c.daysInStage > 7));

  return (
    <div className="page">
      <PageHeader
        title="Kolejka wniosków"
        sub={<>{ready.length} spraw <em className="font-serif">gotowych</em> do złożenia w urzędzie · <span className="font-mono">5 zaplanowanych w tym tygodniu</span></>}
        actions={
          <>
            <button className="btn btn-secondary"><i className="ph ph-printer"></i>Drukuj listę</button>
            <button className="btn btn-primary"><i className="ph ph-paper-plane-tilt"></i>Złóż wybrane</button>
          </>
        }
      />

      <Banner kind="info" icon="info" title="Gotowe do złożenia">
        Te sprawy mają komplet dokumentów + opłaty + profil zaufany. <strong>Zaplanuj wizytę w UW</strong> albo użyj profilu zaufanego dla złożenia elektronicznego.
      </Banner>

      <div style={{ height: 18 }}></div>

      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 32 }}><input type="checkbox" className="checkbox" /></th>
              <th>Sprawa</th>
              <th>Klient</th>
              <th>Urząd właściwy</th>
              <th>Pakiet</th>
              <th>Płatność</th>
              <th>Termin sugerowany</th>
            </tr>
          </thead>
          <tbody>
            {ready.map(c => {
              const cli = H.clientById(c.clientId);
              return (
                <tr key={c.id} onClick={() => onOpenCase(c.id)}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" className="checkbox" /></td>
                  <td><span className="id-cell">{c.id}</span><div style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>{c.kind}</div></td>
                  <td>{cli && <><strong>{cli.first} {cli.last}</strong> <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{cli.flag}</span></>}</td>
                  <td>{c.kind.includes('UE') ? 'MUW Warszawa' : 'UW właściwy ze względu na pobyt'}</td>
                  <td><Pill kind="ok" dot>Komplet</Pill></td>
                  <td><Pill kind={H.paymentKind(c.paymentStatus)} mono>{c.paymentStatus === 'oplacono' ? 'OK' : c.paymentStatus === 'do-oplaty' ? 'Brak' : '...'}</Pill></td>
                  <td className="font-mono" style={{ fontSize: 12 }}>2026-05-{Math.min(15, c.daysInStage + 5).toString().padStart(2, '0')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

window.Submissions = Submissions;
