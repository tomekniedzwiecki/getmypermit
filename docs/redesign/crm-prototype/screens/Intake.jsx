// Intake — publiczny formularz dla klienta-cudzoziemca
function Intake({ onBack }) {
  const [step, setStep] = React.useState(1);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}><i className="ph ph-arrow-left"></i>Wróć do panelu</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div className="brand-mark" style={{ width: 40, height: 40, fontSize: 18 }}>G</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 16, textAlign: 'center' }}>Formularz klienta GetMyPermit</h1>
          <div style={{ fontSize: 14, color: 'var(--fg-2)', marginTop: 8, textAlign: 'center', maxWidth: 480 }}>
            Wypełnij <em className="font-serif">5 prostych kroków</em> — Twój prawnik przeanalizuje sprawę w ciągu 24 godzin.
          </div>
        </div>

        <div className="stepper" style={{ marginBottom: 32 }}>
          {[
            { n: 1, lbl: 'Dane osobowe' },
            { n: 2, lbl: 'Dokumenty' },
            { n: 3, lbl: 'Pracodawca' },
            { n: 4, lbl: 'Sytuacja' },
            { n: 5, lbl: 'Podsumowanie' },
          ].map((s, i, arr) => (
            <React.Fragment key={s.n}>
              <div className={`step ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}>
                <div className="num">{step > s.n ? <i className="ph ph-check"></i> : s.n}</div>
                <div className="lbl">{s.lbl}</div>
              </div>
              {i < arr.length - 1 && <div className="step-divider"></div>}
            </React.Fragment>
          ))}
        </div>

        <Card>
          {step === 1 && (
            <>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Twoje dane osobowe</h3>
              <div className="grid-2">
                <div className="field"><label>Imię</label><input placeholder="Mariia" /></div>
                <div className="field"><label>Nazwisko</label><input placeholder="Petrenko" /></div>
                <div className="field"><label>Data urodzenia</label><input type="date" /></div>
                <div className="field"><label>Narodowość</label><select><option>Wybierz...</option><option>Ukraina</option><option>Wietnam</option><option>Indie</option></select></div>
                <div className="field"><label>Numer paszportu</label><input className="font-mono" /></div>
                <div className="field"><label>PESEL (jeśli posiadasz)</label><input className="font-mono" /></div>
                <div className="field"><label>Telefon</label><input placeholder="+48 ..." /></div>
                <div className="field"><label>Email</label><input type="email" placeholder="email@example.com" /></div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Dokumenty pobytowe</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="field"><label>Aktualny dokument pobytowy</label>
                  <select><option>Wybierz...</option><option>Wiza krajowa D</option><option>Karta pobytu czasowego</option><option>Karta pobytu stałego</option><option>Brak dokumentu</option></select>
                </div>
                <div className="grid-2">
                  <div className="field"><label>Numer dokumentu</label><input className="font-mono" /></div>
                  <div className="field"><label>Ważny do</label><input type="date" /></div>
                </div>
                <div className="field"><label>Załącz skan dokumentu (PDF/JPG)</label>
                  <div style={{ height: 120, border: '2px dashed var(--border-hi)', borderRadius: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-muted)', cursor: 'pointer', background: 'var(--surface-2)' }}>
                    <i className="ph ph-upload-simple" style={{ fontSize: 24, color: 'var(--fg-faint)', marginBottom: 8 }}></i>
                    <div style={{ fontSize: 13 }}>Przeciągnij plik lub kliknij, aby wybrać</div>
                    <div style={{ fontSize: 11, color: 'var(--fg-faint)', marginTop: 4 }}>PDF, JPG, PNG · max 10 MB</div>
                  </div>
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Pracodawca</h3>
              <div className="grid-2">
                <div className="field" style={{ gridColumn: 'span 2' }}><label>Nazwa firmy</label><input /></div>
                <div className="field"><label>NIP</label><input className="font-mono" /></div>
                <div className="field"><label>Stanowisko</label><input /></div>
                <div className="field"><label>Wynagrodzenie miesięczne (brutto, PLN)</label><input className="font-mono" type="number" /></div>
                <div className="field"><label>Wymiar etatu</label><select><option>Pełny etat</option><option>3/4 etatu</option><option>1/2 etatu</option></select></div>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Twoja sytuacja</h3>
              <div className="field" style={{ marginBottom: 16 }}>
                <label>Czego potrzebujesz?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                  {['Przedłużenie pobytu czasowego', 'Pobyt stały (po 5 latach)', 'Karta pobytu UE', 'Zezwolenie na pracę', 'Zaproszenie dla rodziny', 'Odwołanie od decyzji', 'Inna sprawa'].map(opt => (
                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, border: '1px solid var(--hairline)', borderRadius: 8, cursor: 'pointer' }}>
                      <input type="radio" name="kind" />
                      <span style={{ fontSize: 13 }}>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="field"><label>Opisz krótko swoją sytuację (opcjonalne)</label><textarea placeholder="Np. mieszkam w Polsce 4 lata, mam stałą pracę, chciałbym zmienić rodzaj pobytu..."></textarea></div>
            </>
          )}
          {step === 5 && (
            <>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Gotowe! Co dalej?</h3>
              <Banner kind="ok" icon="check-circle" title="Formularz wysłany">
                Twój prawnik <strong>Anna Kowalska</strong> przeanalizuje Twoją sprawę w ciągu <em className="font-serif">24 godzin</em> i odezwie się drogą mailową lub telefoniczną. Otrzymasz wycenę honorarium oraz plan działania.
              </Banner>
              <div style={{ marginTop: 18, padding: 16, background: 'var(--surface-2)', borderRadius: 9 }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Co przygotować</div>
                <ul style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.7, paddingLeft: 18, listStyle: 'disc' }}>
                  <li>Paszport + ksero pierwszej strony</li>
                  <li>Aktualny dokument pobytowy (jeśli posiadasz)</li>
                  <li>Umowa o pracę + zaświadczenie z ZUS</li>
                  <li>Zdjęcie biometryczne (35×45 mm)</li>
                  <li>PIT-37 z poprzedniego roku</li>
                </ul>
              </div>
            </>
          )}
        </Card>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
          {step > 1 ? <button className="btn btn-secondary" onClick={() => setStep(step - 1)}><i className="ph ph-arrow-left"></i>Wstecz</button> : <div></div>}
          {step < 5
            ? <button className="btn btn-primary btn-lg" onClick={() => setStep(step + 1)}>Dalej<i className="ph ph-arrow-right"></i></button>
            : <button className="btn btn-primary btn-lg" onClick={onBack}><i className="ph ph-house"></i>Wróć do panelu</button>}
        </div>
      </div>
    </div>
  );
}

window.Intake = Intake;
