// Tasks — TODO list zespołu, grupowane po terminie
function Tasks({ data, onOpenCase }) {
  const today = '2026-05-01';
  const tomorrow = '2026-05-02';
  const groups = [
    { label: 'Przeterminowane', filter: t => t.deadline < today, kind: 'danger' },
    { label: 'Dziś',       filter: t => t.deadline === today, kind: 'warn' },
    { label: 'Jutro',           filter: t => t.deadline === tomorrow, kind: 'info' },
    { label: 'Ten tydzień',filter: t => t.deadline > tomorrow && t.deadline <= '2026-05-08', kind: 'gray' },
  ];

  const [scope, setScope] = React.useState('me');
  const tasks = scope === 'me' ? data.tasks.filter(t => t.assigneeId === 'U-01') : data.tasks;

  return (
    <div className="page">
      <PageHeader
        title="Zadania"
        sub={<>{tasks.length} otwartych · widok <em className="font-serif">{scope === 'me' ? 'moje' : 'cały zespół'}</em></>}
        actions={
          <>
            <div className="seg">
              <button className={scope === 'me' ? 'active' : ''} onClick={() => setScope('me')}>Moje</button>
              <button className={scope === 'team' ? 'active' : ''} onClick={() => setScope('team')}>Zespół</button>
            </div>
            <button className="btn btn-primary"><i className="ph ph-plus"></i>Nowe zadanie</button>
          </>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {groups.map(g => {
          const items = tasks.filter(g.filter);
          if (items.length === 0) return null;
          return (
            <Card key={g.label} title={g.label} sub={`${items.length} zadań`} flush>
              <div className="list">
                {items.map(t => {
                  const c = H.caseById(t.caseId);
                  const cli = c && H.clientById(c.clientId);
                  const ass = H.staffById(t.assigneeId);
                  return (
                    <div key={t.id} className="list-row">
                      <input type="checkbox" className="checkbox" onClick={(e) => e.stopPropagation()} />
                      <div className="lr-body" style={{ cursor: 'pointer' }} onClick={() => onOpenCase(t.caseId)}>
                        <div className="lr-title">{t.title}</div>
                        <div className="lr-meta">
                          <span className="font-mono">{t.deadline}</span>
                          <span className="sep">·</span>
                          <span className="font-mono">{t.caseId}</span>
                          {cli && <><span className="sep">·</span><span>{cli.first} {cli.last}</span></>}
                        </div>
                      </div>
                      <Pill kind={H.priorityKind(t.priority)}>{H.priorityLabel(t.priority)}</Pill>
                      {ass && <StaffAvatar staffId={ass.id} size="sm" />}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
        {tasks.length === 0 && <Card><Empty icon="check-circle" title="Wszystko zrobione" body="Brak otwartych zadań w tym widoku." /></Card>}
      </div>
    </div>
  );
}

window.Tasks = Tasks;
