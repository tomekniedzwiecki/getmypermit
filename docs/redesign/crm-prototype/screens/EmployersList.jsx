// Employers — kartoteka pracodawców
function EmployersList({ data, onOpenEmployer }) {
  return (
    <div className="page">
      <PageHeader
        title="Pracodawcy"
        sub={<>{data.employers.length} firm współpracujących · łącznie <strong>{data.employers.reduce((s, e) => s + e.workers, 0)}</strong> spraw pracowniczych</>}
        actions={
          <>
            <button className="btn btn-secondary"><i className="ph ph-export"></i>Eksport</button>
            <button className="btn btn-primary"><i className="ph ph-plus"></i>Dodaj firmę</button>
          </>
        }
      />

      <Card flush>
        <table className="table">
          <thead>
            <tr>
              <th>Firma</th>
              <th>NIP</th>
              <th>Branża</th>
              <th>Miasto</th>
              <th>Pracownicy</th>
              <th>Legalność</th>
              <th>Ostatnia faktura</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.employers.map(e => {
              const legalPct = Math.round((e.legality / e.workers) * 100);
              return (
                <tr key={e.id} onClick={() => onOpenEmployer(e.id)}>
                  <td>
                    <div className="name-cell">
                      <div className="avatar" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><i className="ph ph-buildings"></i></div>
                      <div>
                        <div className="nm">{e.name}</div>
                        <div className="sm">{e.contact}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono" style={{ fontSize: 12 }}>{e.nip}</td>
                  <td>{e.branch}</td>
                  <td>{e.city}</td>
                  <td><span className="font-mono" style={{ fontSize: 13, fontWeight: 600 }}>{e.workers}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${legalPct}%`, height: '100%', background: legalPct >= 90 ? 'var(--ok)' : legalPct >= 70 ? 'var(--warn)' : 'var(--danger)' }}></div>
                      </div>
                      <span className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{legalPct}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-stack">
                      <div className="primary font-mono" style={{ fontSize: 12 }}>{e.lastInvoice}</div>
                      <div className="secondary">{H.fmtPLN(e.lastInvoiceAmount)}</div>
                    </div>
                  </td>
                  <td><i className="ph ph-caret-right" style={{ color: 'var(--fg-faint)' }}></i></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

window.EmployersList = EmployersList;
