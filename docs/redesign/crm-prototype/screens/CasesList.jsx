// Cases list — master lista spraw
function CasesList({ data, onOpenCase, openModal }) {
  const [filter, setFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState(new Set());

  const filtered = data.cases.filter(c => {
    if (filter === 'aktywne'   && c.status !== 'aktywna') return false;
    if (filter === 'do-zlozenia' && c.stage !== 'zlozenie-wniosku' && c.stage !== 'weryfikacja-dokumentow') return false;
    if (filter === 'po-osobistym' && c.stage !== 'po-osobistym') return false;
    if (filter === 'oczek' && c.stage !== 'oczek-decyzji') return false;
    if (filter === 'odwolanie' && c.stage !== 'odwolanie') return false;
    if (filter === 'zakonczone' && c.status !== 'zakończona' && c.stage !== 'zakonczenie') return false;
    if (query) {
      const cli = H.clientById(c.clientId);
      const name = cli ? `${cli.first} ${cli.last}` : '';
      if (!c.id.toLowerCase().includes(query.toLowerCase()) && !name.toLowerCase().includes(query.toLowerCase())) return false;
    }
    return true;
  });

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const counts = {
    all: data.cases.length,
    aktywne: data.cases.filter(c => c.status === 'aktywna').length,
    'do-zlozenia': data.cases.filter(c => c.stage === 'zlozenie-wniosku' || c.stage === 'weryfikacja-dokumentow').length,
    'po-osobistym': data.cases.filter(c => c.stage === 'po-osobistym').length,
    oczek: data.cases.filter(c => c.stage === 'oczek-decyzji').length,
    odwolanie: data.cases.filter(c => c.stage === 'odwolanie').length,
    zakonczone: data.cases.filter(c => c.stage === 'zakonczenie').length,
  };

  return (
    <div className="page">
      <PageHeader
        title="Sprawy"
        sub={<>{filtered.length} z {data.cases.length} spraw · portfel <em className="font-serif">aktywnie prowadzonych</em></>}
        actions={
          <>
            <button className="btn btn-secondary"><i className="ph ph-funnel"></i>Filtry</button>
            <button className="btn btn-secondary"><i className="ph ph-export"></i>Eksport CSV</button>
            <button className="btn btn-primary" onClick={() => openModal('newCase')}><i className="ph ph-plus"></i>Nowa sprawa</button>
          </>
        }
      />

      <div className="filter-bar">
        <div className="search-input">
          <i className="ph ph-magnifying-glass"></i>
          <input placeholder="Szukaj nr sprawy, nazwiska klienta…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {[
          ['all', 'Wszystkie'],
          ['aktywne', 'Aktywne'],
          ['do-zlozenia', 'Do złożenia'],
          ['po-osobistym', 'Po osobistym'],
          ['oczek', 'Oczek. decyzji'],
          ['odwolanie', 'Odwołania'],
          ['zakonczone', 'Zakończone'],
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
              <th style={{ width: 32 }}><input type="checkbox" className="checkbox" /></th>
              <th>Numer</th>
              <th>Klient</th>
              <th>Pracodawca</th>
              <th>Etap</th>
              <th>Prawnik</th>
              <th>Płatności</th>
              <th>Ostatnia zmiana</th>
              <th style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const cli = H.clientById(c.clientId);
              const emp = H.employerById(c.employerId);
              const law = H.staffById(c.lawyerId);
              return (
                <tr key={c.id} className={selected.has(c.id) ? 'selected' : ''} onClick={() => onOpenCase(c.id)}>
                  <td onClick={(e) => { e.stopPropagation(); toggle(c.id); }}>
                    <input type="checkbox" className="checkbox" checked={selected.has(c.id)} onChange={() => {}} />
                  </td>
                  <td><span className="id-cell">{c.id}</span></td>
                  <td>
                    <div className="name-cell">
                      <div className="avatar">{cli ? cli.first[0] + cli.last[0] : '?'}<span className="flag">{cli && cli.flag}</span></div>
                      <div>
                        <div className="nm">{cli && `${cli.first} ${cli.last}`}</div>
                        <div className="sm font-mono">{cli && cli.pesel} · {c.kind}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="cell-stack">
                      <div className="primary">{emp && emp.name}</div>
                      <div className="secondary">NIP {emp && emp.nip}</div>
                    </div>
                  </td>
                  <td>
                    <Pill kind="accent" mono>{c.stageLabel}</Pill>
                    <div style={{ fontSize: 11, color: c.daysInStage > 30 ? 'var(--danger-text)' : c.daysInStage > 14 ? 'var(--warn-text)' : 'var(--fg-muted)', marginTop: 4 }}>
                      <span className="font-mono">{c.daysInStage}d</span> w etapie
                    </div>
                  </td>
                  <td>{law ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar initials={law.initials} color={law.color} size="sm" /><span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{law.name.split(' ')[1]}</span></div> : <span className="text-muted">—</span>}</td>
                  <td><Pill kind={H.paymentKind(c.paymentStatus)}>{H.paymentLabel(c.paymentStatus)}</Pill></td>
                  <td><span className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{c.lastChange}</span></td>
                  <td><i className="ph ph-caret-right" style={{ color: 'var(--fg-faint)' }}></i></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-muted)' }}>
        <div>Pokazano <strong style={{ color: 'var(--fg)' }}>{filtered.length}</strong> z {data.cases.length}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm btn-secondary"><i className="ph ph-caret-left"></i></button>
          <button className="btn btn-sm btn-secondary">1</button>
          <button className="btn btn-sm btn-ghost">2</button>
          <button className="btn btn-sm btn-ghost">3</button>
          <button className="btn btn-sm btn-secondary"><i className="ph ph-caret-right"></i></button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="bulk-bar">
          <span className="count font-mono">{selected.size} zaznacz.</span>
          <span style={{ fontSize: 13 }}>Akcja zbiorcza:</span>
          <div className="actions">
            <button className="btn btn-sm"><i className="ph ph-tag"></i>Tag</button>
            <button className="btn btn-sm"><i className="ph ph-user"></i>Przepisz</button>
            <button className="btn btn-sm"><i className="ph ph-arrow-right"></i>Etap</button>
            <button className="btn btn-sm"><i className="ph ph-export"></i>Eksport</button>
            <button className="btn btn-sm" onClick={() => setSelected(new Set())}><i className="ph ph-x"></i></button>
          </div>
        </div>
      )}
    </div>
  );
}

window.CasesList = CasesList;
