// Groups — grupy spraw (rodziny, projekty)
function Groups({ data, onOpenCase, onOpenClient }) {
  const groups = [
    { id: 'GR-01', name: 'Rodzina Petrenko', kind: 'family', members: ['CL-1042', 'CL-1051'], cases: 6, lead: 'Anna Kowalska', notes: 'Małżeństwo + 2 dzieci · ścieżka pobytu rezydenta UE' },
    { id: 'GR-02', name: 'Rodzina Kovalenko', kind: 'family', members: ['CL-1043'], cases: 3, lead: 'Marek Lewandowski', notes: 'Cała rodzina pracuje w TransLogistics 24' },
    { id: 'GR-03', name: 'Projekt: Castorama 2026', kind: 'project', members: ['CL-1044', 'CL-1048', 'CL-1050'], cases: 4, lead: 'Anna Kowalska', notes: '12 wniosków, sezon wiosenny — koordynacja z HR' },
    { id: 'GR-04', name: 'Rodzina Bondarenko', kind: 'family', members: ['CL-1047'], cases: 2, lead: 'Marek Lewandowski', notes: 'Pielęgniarka + mąż (oczekuje na zaproszenie)' },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Grupy spraw"
        sub={<>{groups.length} aktywnych grup · <em className="font-serif">koordynowane spraw rodzin</em> i projektów grupowych</>}
        actions={<button className="btn btn-primary"><i className="ph ph-plus"></i>Nowa grupa</button>}
      />

      <div className="grid-2" style={{ gap: 16 }}>
        {groups.map(g => (
          <Card key={g.id} className="card--clickable" title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className={`ph ph-${g.kind === 'family' ? 'users-four' : 'briefcase'}`} style={{ color: 'var(--accent)' }}></i>
              {g.name}
            </span>
          } sub={`${g.cases} spraw · prowadzi ${g.lead}`}>
            <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.55, marginBottom: 12 }}>{g.notes}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {g.members.map(mid => {
                const cl = H.clientById(mid);
                if (!cl) return null;
                return (
                  <div key={mid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}
                       onClick={() => onOpenClient(mid)} className="list-row" >
                    <Avatar initials={cl.first[0] + cl.last[0]} size="sm" flag={cl.flag} />
                    <div style={{ fontSize: 12.5, color: 'var(--fg-1)', fontWeight: 500 }}>{cl.first} {cl.last}</div>
                    <span className="font-mono" style={{ fontSize: 10, color: 'var(--fg-muted)', marginLeft: 'auto' }}>{cl.cases} spraw</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

window.Groups = Groups;
