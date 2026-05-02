// Remaining screens — short, single-purpose

function AlertsScreen({ data, onOpenForeigner }) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="title-block">
          <h1 className="h-page">Alerty</h1>
          <div className="sub">{data.alerts.length} aktywnych alertów · sortowane wg pilności</div>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><i className="ph ph-bell-slash"></i>Wycisz wszystko</button>
          <button className="btn btn-primary"><i className="ph ph-gear"></i>Konfiguruj progi</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <Kpi icon="siren" iconKind="danger" label="Po terminie" value="3" foot="natychmiastowa reakcja" footKind="down" />
        <Kpi icon="clock-countdown" iconKind="danger" label="≤ 14 dni" value="2" foot="krytyczne" />
        <Kpi icon="clock" iconKind="warn" label="15–30 dni" value="3" foot="działanie tygodniowe" />
        <Kpi icon="calendar" iconKind="info" label="31–60 dni" value="2" foot="planowanie" />
        <Kpi icon="warning" iconKind="warn" label="Braki danych" value="2" foot="uzupełnij" />
      </div>

      <Card title="Wszystkie alerty" sub="Kliknij aby otworzyć kartę cudzoziemca" flush>
        <div className="list">
          {data.alerts.map(a => {
            const sev = a.severity === 'overdue' ? 'overdue' : (a.severity === '14' || a.severity === 'missing') ? 'warn' : '';
            return (
              <div key={a.id} className="alert-row" onClick={() => onOpenForeigner(a.subjectId)}>
                <div className={`alert-day-badge ${sev}`}>
                  {a.daysOffset !== undefined && a.daysOffset !== null ? (
                    <><span className="num">{Math.abs(a.daysOffset)}</span><span className="lbl">{a.daysOffset < 0 ? 'po term.' : 'dni'}</span></>
                  ) : (<><i className="ph ph-warning" style={{ fontSize: 18, color: 'var(--warn-text)' }}></i><span className="lbl">brak</span></>)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-2)', marginBottom: 4 }}><strong>{a.subject}</strong> · {a.message}</div>
                  {a.date && <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Termin: {a.date}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-ghost" onClick={(e) => e.stopPropagation()}><i className="ph ph-bell-slash"></i></button>
                  <button className="btn btn-sm btn-secondary" onClick={(e) => e.stopPropagation()}>{a.action}</button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function DocumentsScreen({ data, onOpenForeigner }) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="title-block">
          <h1 className="h-page">Dokumenty</h1>
          <div className="sub">Wszystkie dokumenty w bazie · {data.documents.length} pozycji</div>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><i className="ph ph-funnel"></i>Filtry</button>
          <button className="btn btn-primary"><i className="ph ph-upload-simple"></i>Wgraj dokument</button>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi icon="check-circle" iconKind="ok" label="Aktualne" value="201" foot="weryfikacja OK" />
        <Kpi icon="clock-countdown" iconKind="warn" label="Wygasają" value="34" foot="≤ 90 dni" />
        <Kpi icon="x-circle" iconKind="danger" label="Wygasłe" value="3" foot="po terminie" footKind="down" />
        <Kpi icon="warning" iconKind="" label="Brakujące" value="9" foot="uzupełnij" />
      </div>

      <Card title="Lista dokumentów" flush
            action={<div style={{ display: 'flex', gap: 6 }}>
              <button className="chip active">Wszystkie</button>
              <button className="chip">Wygasające</button>
              <button className="chip">Brakujące</button>
              <button className="chip">Wygasłe</button>
            </div>}>
        <table className="table">
          <thead><tr><th>Typ</th><th>Cudzoziemiec</th><th>Wgrany</th><th>Ważny do</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {data.documents.map(d => (
              <tr key={d.id} onClick={() => onOpenForeigner(d.foreignerId)} style={{ cursor: 'pointer' }}>
                <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="ph ph-file-text" style={{ color: 'var(--fg-muted)', fontSize: 16 }}></i><strong style={{ color: 'var(--fg)' }}>{d.type}</strong></div></td>
                <td>{d.foreigner} <span className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>· {d.foreignerId}</span></td>
                <td className="font-mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{d.uploaded || '—'}</td>
                <td className="font-mono" style={{ fontSize: 12 }}>{d.expiry || '—'}</td>
                <td>
                  {d.status === 'ok' && <Pill kind="ok" dot>Aktualny</Pill>}
                  {d.status === 'warning' && <Pill kind="warn" dot>Wygasa</Pill>}
                  {d.status === 'expired' && <Pill kind="danger" dot>Wygasł</Pill>}
                  {d.status === 'missing' && <Pill kind="gray" dot>Brak</Pill>}
                </td>
                <td><i className="ph ph-caret-right" style={{ color: 'var(--fg-faint)' }}></i></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function EventsScreen({ data, onOpenForeigner }) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="title-block">
          <h1 className="h-page">Zdarzenia</h1>
          <div className="sub">Rozpoczęcia, zakończenia, zmiany warunków, wnioski, UPO</div>
        </div>
        <div className="actions">
          <button className="btn btn-primary"><i className="ph ph-plus"></i>Zarejestruj zdarzenie</button>
        </div>
      </div>

      <div className="filter-bar">
        <button className="chip active">Wszystkie</button>
        <button className="chip"><i className="ph ph-play-circle"></i>Rozpoczęcie pracy</button>
        <button className="chip"><i className="ph ph-stop-circle"></i>Zakończenie</button>
        <button className="chip"><i className="ph ph-arrows-left-right"></i>Zmiana warunków</button>
        <button className="chip"><i className="ph ph-file-text"></i>Wniosek pobytowy</button>
        <button className="chip"><i className="ph ph-receipt"></i>UPO</button>
        <div style={{ flex: 1 }}></div>
        <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Zakres: <strong style={{ color: 'var(--fg)' }}>30 dni</strong></span>
      </div>

      <Card flush>
        <div className="list">
          {data.events.map(e => {
            const tone = e.status === 'ok' ? 'ok' : e.status === 'review' ? 'warn' : 'info';
            const iconMap = {
              'praca-rozpoczeta': 'play-circle',
              'praca-zakonczona': 'stop-circle',
              'praca-niepodjeta': 'x-circle',
              'wniosek-pobytowy': 'file-text',
              'zmiana-warunkow': 'arrows-left-right',
              'upo': 'receipt',
            };
            return (
              <div key={e.id} className="list-row" onClick={() => onOpenForeigner(e.subjectId)}>
                <div className="lr-icon" style={{
                  background: tone === 'ok' ? 'var(--ok-bg)' : tone === 'warn' ? 'var(--warn-bg)' : 'var(--info-bg)',
                  color: tone === 'ok' ? 'var(--ok)' : tone === 'warn' ? 'var(--warn)' : 'var(--info)'
                }}>
                  <i className={`ph ph-${iconMap[e.type] || 'lightning'}`}></i>
                </div>
                <div className="lr-body">
                  <div className="lr-title">{e.title} · <span style={{ color: 'var(--fg-2)', fontWeight: 500 }}>{e.subject}</span></div>
                  <div className="lr-meta">
                    <span className="font-mono">{e.date}</span>
                    {e.note && <><span className="sep">·</span><span>{e.note}</span></>}
                  </div>
                </div>
                {e.status === 'review' && <Pill kind="warn">Wymaga oceny</Pill>}
                {e.status === 'todo' && <Pill kind="info">Do zrobienia</Pill>}
                {e.status === 'ok' && <Pill kind="ok">OK</Pill>}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function CalendarScreen({ data }) {
  // Simplified calendar — May 2026
  const days = Array.from({ length: 35 }, (_, i) => i - 3);
  const eventsMap = {
    14: [{ tone: 'warn', title: 'Wiza A. Drazdou' }],
    15: [{ tone: 'info', title: 'Zmiana wynagrodzenia R. Kumar' }],
    22: [{ tone: 'info', title: 'Audyt FlexJob' }],
  };
  const today = 1;
  return (
    <div className="page">
      <div className="page-header">
        <div className="title-block">
          <h1 className="h-page">Kalendarz terminów</h1>
          <div className="sub">Maj 2026 · wygaśnięcia, terminy, audyty</div>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><i className="ph ph-caret-left"></i></button>
          <button className="btn btn-secondary">Dziś</button>
          <button className="btn btn-secondary"><i className="ph ph-caret-right"></i></button>
        </div>
      </div>
      <div className="row-2">
        <Card>
          <div className="cal" style={{ marginBottom: 8 }}>
            {['Pn','Wt','Śr','Cz','Pt','So','N'].map(d => <div key={d} className="cal-head">{d}</div>)}
          </div>
          <div className="cal">
            {days.map((d, i) => {
              const real = d > 0 && d <= 31;
              const ev = real ? eventsMap[d] : null;
              return (
                <div key={i} className={`cal-day ${!real ? 'muted' : ''} ${d === today ? 'today' : ''}`}>
                  <div className="dnum">{real ? d : (d <= 0 ? 30 + d : d - 31)}</div>
                  {ev && <div className="dots">{ev.map((e, j) => <div key={j} className={`dot ${e.tone === 'warn' ? 'warn' : e.tone === 'danger' ? 'danger' : 'info'}`}></div>)}</div>}
                </div>
              );
            })}
          </div>
        </Card>
        <Card title="Najbliższe terminy" flush>
          <div className="list">
            {data.alerts.filter(a => a.date && a.daysOffset >= 0).slice(0, 6).map(a => (
              <div key={a.id} className="list-row">
                <div className="alert-day-badge" style={{ minWidth: 44, padding: '6px 4px' }}>
                  <span className="num" style={{ fontSize: 16 }}>{a.daysOffset}</span>
                  <span className="lbl">dni</span>
                </div>
                <div className="lr-body">
                  <div className="lr-title" style={{ fontSize: 12 }}>{a.title}</div>
                  <div className="lr-meta"><span className="font-mono">{a.date}</span><span className="sep">·</span>{a.subject}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SubcontractorsScreen({ data }) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="title-block">
          <h1 className="h-page">Podwykonawcy</h1>
          <div className="sub">Łańcuch dostawców pracy · agencje, firmy zewnętrzne</div>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><i className="ph ph-shield-check"></i>Audyt</button>
          <button className="btn btn-primary"><i className="ph ph-plus"></i>Zaproś podwykonawcę</button>
        </div>
      </div>

      <div className="grid-2">
        {data.subcontractors.map(s => (
          <div className="card" key={s.id}>
            <div className="card-header">
              <div className="left">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: s.status === 'invited' ? 'var(--surface-3)' : 'var(--accent-soft)', color: s.status === 'invited' ? 'var(--fg-muted)' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                    <i className={`ph ph-${s.status === 'internal' ? 'building-office' : 'buildings'}`}></i>
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>{s.name}</h3>
                    <div className="sub font-mono">NIP {s.nip}</div>
                  </div>
                </div>
              </div>
              {s.status === 'active' && <Pill kind="ok" dot>Aktywny</Pill>}
              {s.status === 'internal' && <Pill kind="info" dot>Wewnętrzny</Pill>}
              {s.status === 'invited' && <Pill kind="warn" dot>Zaproszono</Pill>}
            </div>
            <div className="card-body">
              {s.status === 'invited' ? (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--fg-muted)' }}>
                  <i className="ph ph-envelope" style={{ fontSize: 28, color: 'var(--warn)', marginBottom: 8, display: 'block' }}></i>
                  <div style={{ fontSize: 13 }}>Zaproszenie wysłane <span className="font-mono">2026-04-26</span></div>
                  <button className="btn btn-sm btn-secondary" style={{ marginTop: 10 }}>Wyślij ponownie</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div className="micro">Cudzoziemcy</div>
                      <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>{s.workers}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="micro">Ostatnia synchronizacja</div>
                      <div className="font-mono" style={{ fontSize: 12, color: 'var(--fg-2)', marginTop: 4 }}>{s.lastSync}</div>
                    </div>
                  </div>
                  <DistBar green={s.green} yellow={s.yellow} red={s.red} gray={s.gray} />
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-muted)' }}>
                    <div>Kontakt: <strong style={{ color: 'var(--fg)' }}>{s.contact}</strong></div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-sm btn-ghost"><i className="ph ph-chat"></i></button>
                      <button className="btn btn-sm btn-ghost">Zobacz <i className="ph ph-arrow-right"></i></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CasesScreen({ data, plan }) {
  if (plan === 'Basic') {
    return (
      <div className="page">
        <div className="page-header"><div className="title-block"><h1 className="h-page">Sprawy zlecone kancelarii</h1></div></div>
        <Card>
          <div style={{ textAlign: 'center', padding: 60 }}>
            <i className="ph ph-scales" style={{ fontSize: 48, color: 'var(--accent)', display: 'block', marginBottom: 16 }}></i>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Funkcja dostępna w planie Pro</h2>
            <p style={{ color: 'var(--fg-muted)', maxWidth: 480, margin: '0 auto 20px', fontSize: 13, lineHeight: 1.6 }}>
              Plan Pro łączy system z obsługą kancelarii. Każde wykryte ryzyko możesz jednym kliknięciem przekazać prawnikom — z pełnym kontekstem, dokumentami i historią.
            </p>
            <button className="btn btn-primary"><i className="ph ph-rocket"></i>Przejdź na Pro</button>
          </div>
        </Card>
      </div>
    );
  }
  return (
    <div className="page">
      <div className="page-header">
        <div className="title-block">
          <h1 className="h-page">Sprawy zlecone kancelarii</h1>
          <div className="sub">{data.cases.length} aktywnych · średni czas reakcji <span className="font-mono">3h 24min</span></div>
        </div>
        <div className="actions">
          <button className="btn btn-primary"><i className="ph ph-scales"></i>Nowe zgłoszenie</button>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi icon="folders" iconKind="" label="Aktywne sprawy" value="11" foot="3 pilne" />
        <Kpi icon="clock" iconKind="info" label="Średnia odpowiedź" value="3.4h" foot="ostatnie 30 dni" />
        <Kpi icon="check-circle" iconKind="ok" label="Zamknięte (m-c)" value="7" foot="100% w terminie" />
        <Kpi icon="user-circle" iconKind="" label="Prawnicy" value="3" foot="P. Zieliński · K. Nowak · M. Antoniak" />
      </div>

      <Card flush title="Sprawy w toku">
        <table className="table">
          <thead><tr><th>ID</th><th>Tytuł</th><th>Cudzoziemiec</th><th>Otwarte</th><th>Etap</th><th>Prawnik</th><th>Priorytet</th></tr></thead>
          <tbody>
            {data.cases.map(c => (
              <tr key={c.id}>
                <td className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{c.id}</td>
                <td><strong style={{ color: 'var(--fg)' }}>{c.title}</strong><div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>akt. {c.lastUpdate}</div></td>
                <td>{c.foreigner}</td>
                <td className="font-mono" style={{ fontSize: 12 }}>{c.opened}</td>
                <td><Pill kind="info">{c.stage}</Pill></td>
                <td>{c.lawyer}</td>
                <td><Pill kind={c.priority === 'high' ? 'danger' : c.priority === 'medium' ? 'warn' : 'gray'} dot>{c.priority === 'high' ? 'Pilne' : c.priority === 'medium' ? 'Średnie' : 'Niskie'}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function ReportsScreen({ plan }) {
  return (
    <div className="page">
      <div className="page-header">
        <div className="title-block">
          <h1 className="h-page">Raporty compliance</h1>
          <div className="sub">Miesięczne i ad-hoc raporty stanu legalności zatrudnienia</div>
        </div>
        <div className="actions">
          <button className="btn btn-secondary"><i className="ph ph-calendar"></i>Zakres</button>
          <button className="btn btn-primary"><i className="ph ph-file-pdf"></i>Generuj raport</button>
        </div>
      </div>

      <div className="grid-2">
        {[
          { title: 'Compliance kwiecień 2026', date: '2026-04-30', status: 'ok', kind: 'Miesięczny', size: '2.1 MB' },
          { title: 'Audyt FlexJob Sp. z o.o.', date: '2026-04-15', status: 'warn', kind: 'Audyt podwykonawcy', size: '1.4 MB' },
          { title: 'Compliance marzec 2026', date: '2026-03-31', status: 'ok', kind: 'Miesięczny', size: '1.9 MB' },
          { title: 'Raport przygotowania na kontrolę PIP', date: '2026-03-12', status: 'ok', kind: 'Ad-hoc', size: '3.2 MB' },
        ].map((r, i) => (
          <div className="card" key={i}>
            <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 56, borderRadius: 6, background: 'linear-gradient(180deg, var(--danger-bg), var(--surface-3))', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ph ph-file-pdf" style={{ fontSize: 22, color: 'var(--danger)' }}></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}><span className="font-mono">{r.date}</span> · {r.kind} · {r.size}</div>
              </div>
              <Pill kind={r.status === 'ok' ? 'ok' : 'warn'} dot>{r.status === 'ok' ? 'Gotowy' : 'Uwagi'}</Pill>
              <button className="btn btn-sm btn-ghost"><i className="ph ph-download-simple"></i></button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 16 }}></div>
      <Card title="Wskaźniki compliance" sub="Ostatnie 6 miesięcy">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160, padding: '20px 0' }}>
          {[78, 82, 85, 80, 84, 86].map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: '100%', height: `${v}%`, background: 'linear-gradient(180deg, var(--accent), var(--accent-hover))', borderRadius: '6px 6px 0 0', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{v}</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{['Lis','Gru','Sty','Lut','Mar','Kwi'][i]}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function OnboardingScreen() {
  const [step, setStep] = React.useState(2);
  const steps = ['Dane podstawowe', 'Pobyt', 'Praca', 'Dokumenty', 'Podsumowanie'];
  return (
    <div className="page" style={{ maxWidth: 880 }}>
      <div className="page-header">
        <div className="title-block">
          <h1 className="h-page">Dodaj cudzoziemca</h1>
          <div className="sub">Kreator wprowadzenia osoby do systemu — krok {step + 1} z {steps.length}</div>
        </div>
      </div>

      <div className="stepper">
        {steps.map((label, i) => (
          <React.Fragment key={i}>
            <div className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="num">{i < step ? <i className="ph ph-check" style={{ fontSize: 11 }}></i> : i + 1}</div>
              <div className="lbl">{label}</div>
            </div>
            {i < steps.length - 1 && <div className="step-divider"></div>}
          </React.Fragment>
        ))}
      </div>

      <Card title={steps[step]} sub="Wpisz dane z dokumentu pobytowego — system sam pokaże co dalej">
        {step === 2 && (
          <>
            <Banner kind="info" icon="info">
              Na podstawie wprowadzonego pobytu (Wiza krajowa D · ważna do 2027-06-30) system zaproponuje możliwe podstawy pracy.
            </Banner>
            <div style={{ height: 16 }}></div>
            <div className="grid-2">
              <div className="field">
                <label>Podstawa legalnej pracy</label>
                <select defaultValue="zezwolenie-a">
                  <option value="">Wybierz…</option>
                  <option value="zezwolenie-a">Zezwolenie na pracę typ A</option>
                  <option value="oswiadczenie">Oświadczenie o powierzeniu pracy</option>
                  <option value="powiadomienie">Powiadomienie (ob. UA)</option>
                  <option value="niebieska-karta">Niebieska Karta UE</option>
                </select>
                <span className="help">System sprawdzi czy podstawa łączy się z Twoim dokumentem pobytowym</span>
              </div>
              <div className="field">
                <label>Numer dokumentu</label>
                <input className="font-mono" placeholder="np. ZA-2026-12345" />
              </div>
              <div className="field">
                <label>Stanowisko</label>
                <input placeholder="np. Operator linii produkcyjnej" />
              </div>
              <div className="field">
                <label>Wynagrodzenie brutto (zł)</label>
                <input className="font-mono" placeholder="0,00" />
              </div>
              <div className="field">
                <label>Wymiar czasu pracy</label>
                <select><option>Pełny etat</option><option>3/4 etatu</option><option>1/2 etatu</option><option>Inny</option></select>
              </div>
              <div className="field">
                <label>Data rozpoczęcia pracy</label>
                <input type="date" className="font-mono" />
              </div>
            </div>
          </>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><i className="ph ph-arrow-left"></i>Wstecz</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost">Zapisz szkic</button>
            <button className="btn btn-primary" onClick={() => setStep(Math.min(steps.length - 1, step + 1))}>
              {step === steps.length - 1 ? 'Zakończ' : 'Dalej'}<i className="ph ph-arrow-right"></i>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SettingsScreen() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="title-block">
          <h1 className="h-page">Ustawienia</h1>
          <div className="sub">Konfiguracja konta, użytkownicy, integracje, progi alertów</div>
        </div>
      </div>

      <div className="row-3-1">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card title="Profil firmy">
            <div className="grid-2">
              <div className="field"><label>Nazwa firmy</label><input defaultValue="Logistyka Wschód Sp. z o.o." /></div>
              <div className="field"><label>NIP</label><input className="font-mono" defaultValue="527-289-44-10" /></div>
              <div className="field"><label>Adres</label><input defaultValue="ul. Kolejowa 14, 08-110 Siedlce" /></div>
              <div className="field"><label>Branża</label><select><option>Transport i logistyka</option></select></div>
            </div>
          </Card>
          <Card title="Progi alertów" sub="Kiedy system ma alarmować o wygasających dokumentach">
            {[{ d: 90, on: true }, { d: 60, on: true }, { d: 30, on: true }, { d: 14, on: true }].map((p) => (
              <div key={p.d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ph ph-clock-countdown"></i></div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.d} dni przed terminem</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-muted)' }}>Email + powiadomienie w aplikacji</div>
                  </div>
                </div>
                <div style={{ width: 36, height: 20, background: p.on ? 'var(--accent)' : 'var(--surface-3)', borderRadius: 999, position: 'relative', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: 2, left: p.on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 200ms' }}></div>
                </div>
              </div>
            ))}
          </Card>
          <Card title="Użytkownicy" sub="Osoby z dostępem do panelu">
            <table className="table">
              <thead><tr><th>Osoba</th><th>Rola</th><th>Ostatnio</th><th></th></tr></thead>
              <tbody>
                {[
                  { n: 'Anna Kowalska', e: 'a.kowalska@logwsch.pl', r: 'HR Manager', last: '14:32', av: 'AK', super: true },
                  { n: 'Marek Skiba', e: 'm.skiba@logwsch.pl', r: 'Specjalista HR', last: '09:14', av: 'MS' },
                  { n: 'mec. P. Zieliński', e: 'kancelaria@gmp.pl', r: 'Kancelaria', last: '13:18', av: 'PZ', accent: true },
                ].map((u, i) => (
                  <tr key={i}>
                    <td>
                      <div className="name-cell">
                        <div className="user-avatar" style={{ background: u.accent ? 'linear-gradient(135deg, var(--accent), var(--accent-hover))' : 'linear-gradient(135deg, #94a3b8, #64748b)' }}>{u.av}</div>
                        <div><div className="nm">{u.n}{u.super && <Pill kind="info" style={{ marginLeft: 6 }}>Admin</Pill>}</div><div className="sm">{u.e}</div></div>
                      </div>
                    </td>
                    <td>{u.r}</td>
                    <td className="font-mono" style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{u.last}</td>
                    <td><button className="btn btn-sm btn-ghost"><i className="ph ph-dots-three"></i></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card title="Plan">
            <div style={{ textAlign: 'center', padding: '4px 0 12px' }}>
              <div className="plan-pill" style={{ fontSize: 12, padding: '4px 12px' }}>PRO</div>
              <div style={{ fontSize: 24, fontWeight: 600, marginTop: 12, letterSpacing: '-0.02em' }}>2 400 zł<span style={{ fontSize: 12, color: 'var(--fg-muted)', fontWeight: 400 }}>/mies.</span></div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>247 cudzoziemców · obsługa kancelarii</div>
              <button className="btn btn-secondary" style={{ marginTop: 14, width: '100%' }}>Zarządzaj planem</button>
            </div>
          </Card>
          <Card title="Integracje">
            {[
              { n: 'praca.gov.pl', s: 'Połączono', icon: 'plug', tone: 'ok' },
              { n: 'Płatnik ZUS', s: 'Połączono', icon: 'plug', tone: 'ok' },
              { n: 'Microsoft 365', s: 'Połączono', icon: 'envelope', tone: 'ok' },
              { n: 'Slack', s: 'Nie połączono', icon: 'chat', tone: 'gray' },
            ].map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid var(--border-soft)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className={`ph ph-${it.icon}`} style={{ fontSize: 14 }}></i></div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{it.n}</div>
                <Pill kind={it.tone === 'ok' ? 'ok' : 'gray'} dot>{it.s}</Pill>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AlertsScreen, DocumentsScreen, EventsScreen, CalendarScreen, SubcontractorsScreen, CasesScreen, ReportsScreen, OnboardingScreen, SettingsScreen });
