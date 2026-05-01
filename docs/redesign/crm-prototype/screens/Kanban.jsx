// Kanban — etapy spraw
function Kanban({ data, onOpenCase, openModal }) {
  return (
    <div className="page">
      <PageHeader
        title="Kanban"
        sub={<>Tablica etapów · <em className="font-serif">przeciągnij</em>, aby zmienić stan</>}
        actions={
          <>
            <button className="btn btn-secondary"><i className="ph ph-funnel"></i>Filtry</button>
            <button className="btn btn-secondary"><i className="ph ph-users"></i>Mój zespół</button>
            <button className="btn btn-primary" onClick={() => openModal('newCase')}><i className="ph ph-plus"></i>Nowa sprawa</button>
          </>
        }
      />

      <div className="kanban">
        {data.stages.map(stage => {
          const cases = data.cases.filter(c => c.stage === stage.key);
          return (
            <div key={stage.key} className="kanban-column">
              <div className="kanban-column-head">
                <span className="ttl">{stage.label}</span>
                <span className="count">{cases.length}</span>
              </div>
              <div className="kanban-list">
                {cases.length === 0 && <div style={{ fontSize: 12, color: 'var(--fg-faint)', textAlign: 'center', padding: 20, fontStyle: 'italic' }}>brak spraw</div>}
                {cases.map(c => {
                  const cli = H.clientById(c.clientId);
                  const law = H.staffById(c.lawyerId);
                  return (
                    <div key={c.id} className="kanban-card" onClick={() => onOpenCase(c.id)}>
                      <div className="meta">
                        <span className="font-mono">{c.id.split('-').slice(-1)[0]}</span>
                        <Pill kind={c.daysInStage > 30 ? 'danger' : c.daysInStage > 14 ? 'warn' : 'gray'} mono>{c.daysInStage}d</Pill>
                      </div>
                      <div className="ttl">{cli && `${cli.first} ${cli.last}`}</div>
                      <div className="sub">
                        <span>{cli && cli.flag}</span>
                        <span style={{ color: 'var(--fg-faint)' }}>·</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.kind}</span>
                      </div>
                      <div className="foot">
                        {law ? <Avatar initials={law.initials} color={law.color} size="sm" /> : <span className="text-faint">brak prawnika</span>}
                        <Pill kind={H.paymentKind(c.paymentStatus)} mono>{c.paymentStatus === 'oplacono' ? '✓' : c.paymentStatus === 'do-oplaty' ? '!' : '…'}</Pill>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.Kanban = Kanban;
