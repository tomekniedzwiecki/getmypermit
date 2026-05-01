// Dashboard — pulpit kancelarii
function Dashboard({ data, onOpenCase, openModal, navTo }) {
  const total = data.cases.length;
  const active = data.cases.filter(c => c.status === 'aktywna').length;
  const onTime = data.cases.filter(c => c.daysInStage <= 14).length;
  const warn = data.cases.filter(c => c.daysInStage > 14 && c.daysInStage <= 30).length;
  const overdue = data.cases.filter(c => c.daysInStage > 30).length;
  const compliance = Math.round((onTime / total) * 100);

  const stageDist = data.stages.map(s => {
    const count = data.cases.filter(c => c.stage === s.key).length;
    const colorMap = { "weryfikacja-dokumentow": "accent", "zlozenie-wniosku": "accent", "osobiste": "yellow", "po-osobistym": "yellow", "oczek-decyzji": "green", "zakonczenie": "green", "odwolanie": "red" };
    return { kind: colorMap[s.key] || 'gray', value: count, label: s.short };
  });

  return (
    <div className="page">
      <PageHeader
        eyebrow={<><span>● Pulpit dnia</span><span className="em">5 maja 2026</span></>}
        title="Dzień dobry, Anno"
        sub={<>Masz <strong style={{ color: 'var(--fg)' }}>3 zadania na dziś</strong>, w portfelu <strong style={{ color: 'var(--fg)' }}>{active}</strong> aktywnych spraw · ostatnia synchronizacja <span className="font-mono">14:32</span></>}
        actions={
          <>
            <button className="btn btn-secondary"><i className="ph ph-arrows-clockwise"></i>Odśwież</button>
            <button className="btn btn-secondary"><i className="ph ph-export"></i>Eksport</button>
            <button className="btn btn-primary" onClick={() => openModal('newCase')}><i className="ph ph-plus"></i>Nowa sprawa</button>
          </>
        }
      />

      <HeroStat
        pretitle="Compliance kancelarii"
        em="poświęcenie terminom"
        number={compliance}
        max={100}
        narrative={<>Wynik bazuje na <strong>liczbie spraw bez przekroczenia deadline'u</strong>, kompletności dokumentów i świeżości weryfikacji. Spadek poniżej <span className="font-mono">75</span> uruchamia rekomendację audytu portfela.</>}
        grid={[
          { label: "Aktywne sprawy", value: active, tone: "" },
          { label: "Na czas",        value: onTime, tone: "ok",  delta: "+8 w tym mies.", deltaTone: "up" },
          { label: "Wymagają uwagi", value: warn, tone: "warn" },
          { label: "Przeterminowane",value: overdue, tone: "danger", delta: "-2 vs ub. tydz.", deltaTone: "up" },
        ]}
      />

      <div style={{ height: 18 }}></div>

      <div className="row-2">
        <Card title="Rozkład etapów" sub={<>portfel <span className="font-mono">{total}</span> spraw · stan na dziś</>}
              action={<button className="btn btn-ghost btn-sm" onClick={() => navTo('kanban')}>Kanban<i className="ph ph-arrow-right"></i></button>}>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            <RiskDial score={compliance} label="On-time" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{total} spraw</div>
              <DistBar segments={stageDist} />
            </div>
          </div>
        </Card>

        <Card title="Dzisiejsza agenda" sub="3 spotkania, 2 wnioski do złożenia" flush
              action={<button className="btn btn-ghost btn-sm" onClick={() => navTo('calendar')}>Kalendarz<i className="ph ph-arrow-right"></i></button>}>
          <div className="list">
            {data.appointments.slice(0, 4).map(ap => {
              const cli = H.clientById(ap.clientId);
              return (
                <div key={ap.id} className="list-row" onClick={() => onOpenCase(ap.caseId)}>
                  <div className="lr-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <i className="ph ph-calendar-check"></i>
                  </div>
                  <div className="lr-body">
                    <div className="lr-title">{ap.kind} — {cli && `${cli.first} ${cli.last}`}</div>
                    <div className="lr-meta">
                      <span className="font-mono">{ap.date} · {ap.time}</span>
                      <span className="sep">·</span>
                      <span>{ap.place}</span>
                    </div>
                  </div>
                  <StaffAvatar staffId={ap.staffId} size="sm" />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ height: 18 }}></div>

      <div className="row-2">
        <Card title="Alerty wymagające reakcji" sub={<>{data.alerts.length} otwartych · sortowane wg pilności</>} flush
              action={<button className="btn btn-ghost btn-sm" onClick={() => navTo('alerts')}>Wszystkie<i className="ph ph-arrow-right"></i></button>}>
          <div className="list">
            {data.alerts.slice(0, 5).map(a => <AlertRow key={a.id} alert={a} onClick={() => onOpenCase(a.caseId)} />)}
          </div>
        </Card>

        <Card title="Ostatnia aktywność" sub="Live feed" flush>
          <div style={{ padding: '14px 18px' }}>
            <Timeline items={data.activity.map(it => ({
              time: it.time, icon: it.icon, tone: it.tone === 'danger' ? 'danger' : it.tone === 'warning' ? 'warn' : it.tone === 'ok' ? 'ok' : it.tone === 'info' ? 'info' : '',
              title: it.text, sub: it.subject,
            }))} />
          </div>
        </Card>
      </div>

      <div style={{ height: 18 }}></div>

      <Card title="Performance zespołu" sub="Liczba spraw aktywnych · % na czas · średni czas zamknięcia (dni)">
        <div className="grid-3">
          {data.staff.slice(0, 6).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
              <Avatar initials={s.initials} color={s.color} size="lg" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.005em' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{s.role}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{s.casesActive} sp.</span>
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--ok-text)' }}>{Math.round(s.onTime/s.casesActive*100)}%</span>
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>~{s.avgClose}d</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

window.Dashboard = Dashboard;
