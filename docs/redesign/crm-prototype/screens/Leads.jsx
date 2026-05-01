// Leads — lista potencjalnych klientów (perspektywa kancelarii: zwykle pracodawcy szukający usługi)
function Leads({ data, openModal, navTo }) {
  return (
    <div className="page">
      <PageHeader
        title="Leady"
        sub={<>{data.leads.length} świeżych kontaktów · konwersja <em className="font-serif">średnio 32%</em></>}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => navTo('pipeline')}><i className="ph ph-funnel"></i>Pipeline</button>
            <button className="btn btn-primary"><i className="ph ph-plus"></i>Dodaj lead</button>
          </>
        }
      />

      <div className="kpi-row">
        <Kpi icon="magnet"        label="Nowe (7 dni)"   value={6} foot="+2 vs. ub. tydzień" footKind="up" />
        <Kpi iconKind="info"   icon="phone"         label="W kontakcie"    value={4} foot="3 zaplanowane" />
        <Kpi iconKind="warn"   icon="hourglass"     label="Bez odpowiedzi" value={2} foot="≥ 5 dni" />
        <Kpi iconKind="ok"     icon="check-circle"  label="Konwersja"      value="32%" foot="+4pp YoY" footKind="up" />
      </div>

      <div style={{ height: 18 }}></div>

      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Kontakt</th>
              <th>Firma</th>
              <th>Źródło</th>
              <th>Zainteresowanie</th>
              <th>Dodano</th>
              <th style={{ width: 200 }}>Akcja</th>
            </tr>
          </thead>
          <tbody>
            {data.leads.map(l => (
              <tr key={l.id}>
                <td>
                  <div className="name-cell">
                    <div className="avatar">{l.first[0]}{l.last[0]}</div>
                    <div>
                      <div className="nm">{l.first} {l.last}</div>
                      <div className="sm font-mono">{l.phone}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="cell-stack">
                    <div className="primary">{l.company}</div>
                    <div className="secondary">{l.email}</div>
                  </div>
                </td>
                <td><Pill kind="gray">{l.source}</Pill></td>
                <td style={{ fontSize: 13, color: 'var(--fg-1)' }}>{l.interest}</td>
                <td><span className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{l.noted}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-secondary"><i className="ph ph-phone"></i>Zadzwoń</button>
                    <button className="btn btn-sm btn-ghost"><i className="ph ph-envelope"></i></button>
                    <button className="btn btn-sm btn-primary" onClick={() => openModal('newCase')}>Konwertuj</button>
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

window.Leads = Leads;
