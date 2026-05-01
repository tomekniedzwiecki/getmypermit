// Templates — szablony DOCX
function Templates() {
  const templates = [
    { id: 'TPL-01', name: 'Wniosek pobytowy (formularz urzędowy)', kind: 'docx', version: 'v3.2', updated: '2026-04-12', uses: 184, tags: ['pobyt', 'wniosek'] },
    { id: 'TPL-02', name: 'Załącznik nr 1 (oświadczenie pracodawcy)', kind: 'docx', version: 'v2.8', updated: '2026-04-08', uses: 142, tags: ['pracodawca'] },
    { id: 'TPL-03', name: 'Pełnomocnictwo do reprezentacji', kind: 'docx', version: 'v1.4', updated: '2026-03-15', uses: 218, tags: ['admin'] },
    { id: 'TPL-04', name: 'Raport końcowy dla klienta', kind: 'docx', version: 'v1.1', updated: '2026-04-22', uses: 38, tags: ['raport', 'klient'] },
    { id: 'TPL-05', name: 'Email — przekazanie pakietu startowego', kind: 'email', version: 'v2.0', updated: '2026-04-26', uses: 264, tags: ['email', 'klient'] },
    { id: 'TPL-06', name: 'Email — ponaglenie płatności', kind: 'email', version: 'v1.3', updated: '2026-04-18', uses: 47, tags: ['email', 'finanse'] },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Szablony"
        sub={<>{templates.length} szablonów dokumentów i emaili · <em className="font-serif">versioning aktywny</em></>}
        actions={
          <>
            <button className="btn btn-secondary"><i className="ph ph-upload"></i>Importuj</button>
            <button className="btn btn-primary"><i className="ph ph-plus"></i>Nowy szablon</button>
          </>
        }
      />

      <Card flush>
        <table className="table">
          <thead>
            <tr><th>Szablon</th><th>Typ</th><th>Wersja</th><th>Tagi</th><th>Użyć</th><th>Aktualizacja</th><th></th></tr>
          </thead>
          <tbody>
            {templates.map(t => (
              <tr key={t.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: t.kind === 'docx' ? 'var(--accent-soft)' : 'var(--info-bg)', color: t.kind === 'docx' ? 'var(--accent)' : 'var(--info)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`ph ph-${t.kind === 'docx' ? 'file-doc' : 'envelope'}`} style={{ fontSize: 18 }}></i>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 550 }}>{t.name}</div>
                      <div className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t.id}</div>
                    </div>
                  </div>
                </td>
                <td><Pill kind="gray" mono>{t.kind.toUpperCase()}</Pill></td>
                <td className="font-mono" style={{ fontSize: 12 }}>{t.version}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {t.tags.map(tag => <Pill key={tag} kind="gray">{tag}</Pill>)}
                  </div>
                </td>
                <td className="num font-mono"><strong>{t.uses}</strong></td>
                <td className="font-mono" style={{ fontSize: 11, color: 'var(--fg-muted)' }}>{t.updated}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-ghost" title="Podgląd"><i className="ph ph-eye"></i></button>
                    <button className="btn btn-sm btn-ghost"><i className="ph ph-pencil-simple"></i></button>
                    <button className="btn btn-sm btn-ghost"><i className="ph ph-dots-three"></i></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

window.Templates = Templates;
