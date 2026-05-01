// Automations — workflow triggers
function Automations() {
  const automations = [
    { id: 'AU-01', name: 'Auto-alert: brak ruchu w sprawie >7 dni', trigger: 'cron · codziennie 06:00', action: 'Wyślij email do prawnika prowadzącego', active: true,  runs: 124, lastRun: '2026-05-01 06:00' },
    { id: 'AU-02', name: 'Onboarding klienta po utworzeniu sprawy',  trigger: 'event · case.created', action: 'Wyślij pakiet startowy DOCX',           active: true,  runs: 42,  lastRun: '2026-04-30 13:20' },
    { id: 'AU-03', name: 'Ponaglenie płatności po 7 dniach',  trigger: 'cron · codziennie 09:00', action: 'Email do klienta + dodaj zadanie',     active: true,  runs: 18,  lastRun: '2026-05-01 09:00' },
    { id: 'AU-04', name: 'Auto-faktura po zamknięciu sprawy',         trigger: 'event · case.closed',  action: 'Wystaw fakturę w Fakturowni',          active: true,  runs: 38,  lastRun: '2026-04-29 17:14' },
    { id: 'AU-05', name: 'Notify slack: nowe leady',                  trigger: 'event · lead.created', action: 'Webhook → #leads',                     active: false, runs: 0,   lastRun: '—' },
    { id: 'AU-06', name: 'Auto-archiwizacja po 90 dniach od zamknięcia', trigger: 'cron · co tydzień',   action: 'Zmiana statusu na archiwum',           active: true,  runs: 6,   lastRun: '2026-04-28 02:00' },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Automatyzacje"
        sub={<>{automations.filter(a => a.active).length} aktywnych workflow · <em className="font-serif">228 uruchomień</em> w tym miesiącu</>}
        actions={<button className="btn btn-primary"><i className="ph ph-plus"></i>Nowa automatyzacja</button>}
      />

      <Banner kind="info" icon="lightning" title="Workflow zautomatyzowane">
        Każdy workflow można <strong>wstrzymać</strong>, edytować lub przetestować na konkretnej sprawie. Zmiany nie wymagają deploymentu — działają natychmiast.
      </Banner>

      <div style={{ height: 18 }}></div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {automations.map(a => (
          <Card key={a.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div className={`switch ${a.active ? 'on' : ''}`} style={{ marginTop: 4 }}></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 600 }}>{a.name}</h4>
                  {a.active ? <Pill kind="ok" dot>Aktywna</Pill> : <Pill kind="gray" dot>Wstrzymana</Pill>}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--fg-muted)', flexWrap: 'wrap' }}>
                  <span><i className="ph ph-flow-arrow" style={{ marginRight: 4 }}></i>Trigger: <span className="font-mono" style={{ color: 'var(--fg-2)' }}>{a.trigger}</span></span>
                  <span><i className="ph ph-arrow-right" style={{ marginRight: 4 }}></i>Akcja: <span style={{ color: 'var(--fg-2)' }}>{a.action}</span></span>
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--fg-faint)' }}>
                  Uruchomień: <strong className="font-mono" style={{ color: 'var(--fg-muted)' }}>{a.runs}</strong> · ostatnio <span className="font-mono">{a.lastRun}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-sm btn-secondary"><i className="ph ph-play"></i>Test</button>
                <button className="btn btn-sm btn-ghost"><i className="ph ph-pencil-simple"></i></button>
                <button className="btn btn-sm btn-ghost"><i className="ph ph-dots-three"></i></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

window.Automations = Automations;
