// Staff — zespół kancelarii z performance KPI
function Staff({ data }) {
  return (
    <div className="page">
      <PageHeader
        title="Prawnicy"
        sub={<>Zespół kancelarii · <em className="font-serif">{data.staff.length} osób</em> · sortowanie wg liczby aktywnych spraw</>}
        actions={
          <>
            <button className="btn btn-secondary"><i className="ph ph-chart-bar"></i>Performance</button>
            <button className="btn btn-primary"><i className="ph ph-user-plus"></i>Dodaj członka</button>
          </>
        }
      />

      <div className="grid-2" style={{ gap: 16 }}>
        {[...data.staff].sort((a, b) => b.casesActive - a.casesActive).map(s => {
          const onTimePct = Math.round((s.onTime / s.casesActive) * 100);
          return (
            <Card key={s.id} className="card--clickable">
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <Avatar initials={s.initials} color={s.color} size="xl" />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>{s.name}</h3>
                    <Pill kind={s.roleKey === 'owner' ? 'accent' : s.roleKey === 'manager' ? 'info' : 'gray'}>{s.role}</Pill>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>{s.id} · {s.roleKey}</div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
                    <div>
                      <div className="eyebrow">Aktywne</div>
                      <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--fg)', letterSpacing: '-0.02em' }} className="font-mono">{s.casesActive}</div>
                    </div>
                    <div>
                      <div className="eyebrow">Na czas</div>
                      <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)', color: onTimePct >= 90 ? 'var(--ok)' : onTimePct >= 75 ? 'var(--warn)' : 'var(--danger)', letterSpacing: '-0.02em' }} className="font-mono">{onTimePct}%</div>
                    </div>
                    <div>
                      <div className="eyebrow">Śr. czas</div>
                      <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--fg)', letterSpacing: '-0.02em' }} className="font-mono">{s.avgClose}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--fg-faint)' }}>d</span></div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary btn-sm"><i className="ph ph-envelope"></i>Email</button>
                    <button className="btn btn-secondary btn-sm"><i className="ph ph-list-checks"></i>Zadania</button>
                    <button className="btn btn-ghost btn-sm"><i className="ph ph-dots-three"></i></button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

window.Staff = Staff;
