// Alerts — pulpit bezczynności i alertów wymagających reakcji
function Alerts({ data, onOpenCase }) {
  const [filter, setFilter] = React.useState('all');
  const filtered = data.alerts.filter(a => {
    if (filter === 'overdue') return a.severity === 'overdue';
    if (filter === 'warn')    return a.severity === 'warn';
    if (filter === 'info')    return a.severity === 'info';
    return true;
  });

  const counts = {
    all: data.alerts.length,
    overdue: data.alerts.filter(a => a.severity === 'overdue').length,
    warn: data.alerts.filter(a => a.severity === 'warn').length,
    info: data.alerts.filter(a => a.severity === 'info').length,
  };

  return (
    <div className="page">
      <PageHeader
        title="Alerty"
        sub={<><strong>{counts.overdue}</strong> po terminie · <strong>{counts.warn}</strong> wymagają uwagi · sortowane wg <em className="font-serif">pilności</em></>}
        actions={<button className="btn btn-secondary"><i className="ph ph-bell-slash"></i>Wycisz na 1h</button>}
      />

      <div className="filter-bar">
        <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Wszystkie<span className="count">{counts.all}</span></button>
        <button className={`chip ${filter === 'overdue' ? 'active' : ''}`} onClick={() => setFilter('overdue')}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)' }}></span>
          Po terminie<span className="count">{counts.overdue}</span>
        </button>
        <button className={`chip ${filter === 'warn' ? 'active' : ''}`} onClick={() => setFilter('warn')}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warn)' }}></span>
          Uwaga<span className="count">{counts.warn}</span>
        </button>
        <button className={`chip ${filter === 'info' ? 'active' : ''}`} onClick={() => setFilter('info')}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--info)' }}></span>
          Info<span className="count">{counts.info}</span>
        </button>
      </div>

      <Card flush>
        <div className="list">
          {filtered.length === 0 && <Empty icon="check-circle" title="Brak alertów" body="Wszystko pod kontrolą — żadne sprawy nie wymagają reakcji." />}
          {filtered.map(a => <AlertRow key={a.id} alert={a} onClick={() => onOpenCase(a.caseId)} />)}
        </div>
      </Card>
    </div>
  );
}

window.Alerts = Alerts;
