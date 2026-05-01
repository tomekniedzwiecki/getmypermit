// Clients — kartoteka cudzoziemców
function ClientsList({ data, onOpenClient, openModal }) {
  const [query, setQuery] = React.useState('');
  const filtered = data.clients.filter(c => {
    if (!query) return true;
    return (`${c.first} ${c.last}`).toLowerCase().includes(query.toLowerCase()) || c.pesel.includes(query) || c.id.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="page">
      <PageHeader
        title="Klienci"
        sub={<>{filtered.length} z {data.clients.length} cudzoziemców · kartoteka <em className="font-serif">aktualna</em></>}
        actions={
          <>
            <button className="btn btn-secondary"><i className="ph ph-export"></i>Eksport</button>
            <button className="btn btn-primary" onClick={() => openModal('newClient')}><i className="ph ph-user-plus"></i>Dodaj klienta</button>
          </>
        }
      />

      <div className="filter-bar">
        <div className="search-input">
          <i className="ph ph-magnifying-glass"></i>
          <input placeholder="Szukaj po nazwisku, imieniu, PESEL…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="chip"><i className="ph ph-globe"></i>Narodowość</button>
        <button className="chip"><i className="ph ph-calendar"></i>Aktywność</button>
        <button className="chip"><i className="ph ph-arrows-down-up"></i>Sortuj: Nazwisko</button>
      </div>

      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Klient</th>
              <th>PESEL</th>
              <th>Data ur.</th>
              <th>Zawód</th>
              <th>Telefon</th>
              <th>Sprawy</th>
              <th>Ostatnia akt.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} onClick={() => onOpenClient(c.id)}>
                <td>
                  <div className="name-cell">
                    <div className="avatar">{c.first[0]}{c.last[0]}<span className="flag">{c.flag}</span></div>
                    <div>
                      <div className="nm">{c.first} {c.last}</div>
                      <div className="sm">{c.nationality} · <span className="font-mono">{c.id}</span></div>
                    </div>
                  </div>
                </td>
                <td className="font-mono" style={{ fontSize: 12 }}>{c.pesel}</td>
                <td className="font-mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{c.born}</td>
                <td style={{ fontSize: 13 }}>{c.profession}</td>
                <td className="font-mono" style={{ fontSize: 12 }}>{c.phone}</td>
                <td><Pill kind={c.cases > 2 ? 'accent' : 'gray'} mono>{c.cases}</Pill></td>
                <td className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{c.lastSeen}</td>
                <td><i className="ph ph-caret-right" style={{ color: 'var(--fg-faint)' }}></i></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

window.ClientsList = ClientsList;
