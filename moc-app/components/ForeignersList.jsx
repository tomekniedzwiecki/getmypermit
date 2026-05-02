// Foreigners list screen
function ForeignersList({ data, onOpenForeigner }) {
  const [filter, setFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const filtered = data.foreigners.filter(f => {
    if (filter === 'red' && f.residenceStatus !== 'red' && f.workStatus !== 'red') return false;
    if (filter === 'yellow' && f.residenceStatus !== 'yellow' && f.workStatus !== 'yellow') return false;
    if (filter === 'gray' && f.residenceStatus !== 'gray') return false;
    if (filter === 'expiring' && !['red','yellow'].includes(f.residenceStatus)) return false;
    if (query && !f.name.toLowerCase().includes(query.toLowerCase()) && !f.id.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div className="title-block">
          <h1 className="h-page">Cudzoziemcy</h1>
          <div className="sub">{data.foreigners.length} osób · {data.subcontractors.length - 1} podwykonawców · ostatnia synchronizacja <span className="font-mono">14:32</span></div>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><i className="ph ph-funnel"></i>Filtry</button>
          <button className="btn btn-secondary"><i className="ph ph-export"></i>Eksport CSV</button>
          <button className="btn btn-primary"><i className="ph ph-user-plus"></i>Dodaj</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <i className="ph ph-magnifying-glass"></i>
          <input placeholder="Szukaj po imieniu, nazwisku albo ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className={`chip ${filter==='all'?'active':''}`} onClick={() => setFilter('all')}>Wszyscy <span className="font-mono" style={{ opacity: 0.7 }}>{data.foreigners.length}</span></button>
        <button className={`chip ${filter==='red'?'active':''}`} onClick={() => setFilter('red')}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }}></span>Czerwone</button>
        <button className={`chip ${filter==='yellow'?'active':''}`} onClick={() => setFilter('yellow')}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warn)' }}></span>Uwaga</button>
        <button className={`chip ${filter==='gray'?'active':''}`} onClick={() => setFilter('gray')}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--fg-faint)' }}></span>Brak danych</button>
        <button className={`chip ${filter==='expiring'?'active':''}`} onClick={() => setFilter('expiring')}><i className="ph ph-clock-countdown"></i>Wygasające</button>
        <div style={{ flex: 1 }}></div>
        <button className="chip"><i className="ph ph-buildings"></i>Podwykonawca</button>
        <button className="chip"><i className="ph ph-globe"></i>Obywatelstwo</button>
        <button className="chip"><i className="ph ph-arrows-down-up"></i>Sortuj: Ryzyko</button>
      </div>

      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 32 }}><input type="checkbox" /></th>
              <th>Cudzoziemiec</th>
              <th style={{ width: 140 }}>Statusy</th>
              <th>Stanowisko</th>
              <th>Pobyt</th>
              <th>Praca</th>
              <th>Podwykonawca</th>
              <th style={{ width: 80 }}>Braki</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id} onClick={() => onOpenForeigner(f.id)} style={{ cursor: 'pointer' }}>
                <td onClick={(e) => e.stopPropagation()}><input type="checkbox" /></td>
                <td>
                  <div className="name-cell">
                    <span className="flag">{f.flag}</span>
                    <div>
                      <div className="nm">{f.name}</div>
                      <div className="sm font-mono">{f.id} · {f.nationality}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <StatusPair residence={f.residenceStatus} work={f.workStatus} />
                </td>
                <td>{f.position}</td>
                <td>
                  <div style={{ fontSize: 12 }}>{f.residenceDoc}</div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{f.residenceExpiry || '—'}</div>
                </td>
                <td>
                  <div style={{ fontSize: 12 }}>{f.workDoc}</div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{f.workExpiry || '—'}</div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--fg-2)' }}>{f.subcontractor}</td>
                <td>
                  {f.missing > 0 ? <Pill kind="warn" mono>{f.missing}</Pill> : <span style={{ color: 'var(--fg-faint)' }}>—</span>}
                </td>
                <td><i className="ph ph-caret-right" style={{ color: 'var(--fg-faint)' }}></i></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-muted)' }}>
        <div>Pokazano <strong style={{ color: 'var(--fg)' }}>{filtered.length}</strong> z {data.foreigners.length}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm btn-secondary"><i className="ph ph-caret-left"></i></button>
          <button className="btn btn-sm btn-secondary">1</button>
          <button className="btn btn-sm btn-ghost">2</button>
          <button className="btn btn-sm btn-ghost">3</button>
          <button className="btn btn-sm btn-secondary"><i className="ph ph-caret-right"></i></button>
        </div>
      </div>
    </div>
  );
}

window.ForeignersList = ForeignersList;
