// Login — auth screen z 2FA
function Login({ onBack }) {
  const [step, setStep] = React.useState('login'); // 'login' | '2fa'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      background: 'radial-gradient(circle at 30% 20%, rgba(13,148,136,0.05), transparent 50%), radial-gradient(circle at 70% 80%, rgba(13,148,136,0.04), transparent 60%), var(--bg)',
    }}>
      <div style={{ position: 'absolute', top: 24, left: 24 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}><i className="ph ph-arrow-left"></i>Wróć do panelu</button>
      </div>

      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '32px 28px', borderRadius: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div className="brand-mark" style={{ width: 48, height: 48, fontSize: 22, borderRadius: 12 }}>G</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 16 }}>GetMyPermit</h1>
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>Panel kancelarii · v3.0</div>
        </div>

        {step === 'login' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Email</label>
                <input type="email" placeholder="anna.kowalska@gmp.pl" defaultValue="anna.kowalska@gmp.pl" />
              </div>
              <div className="field">
                <label>Hasło</label>
                <input type="password" defaultValue="••••••••" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <input type="checkbox" className="checkbox" defaultChecked />
                <span style={{ color: 'var(--fg-2)' }}>Pamiętaj mnie na 30 dni</span>
                <a style={{ marginLeft: 'auto', color: 'var(--accent)' }}>Nie pamiętam hasła</a>
              </div>
              <button className="btn btn-primary btn-block btn-lg" onClick={() => setStep('2fa')}><i className="ph ph-sign-in"></i>Zaloguj się</button>
            </div>
            <div style={{ marginTop: 18, padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 11.5, color: 'var(--fg-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              <i className="ph ph-shield-check" style={{ color: 'var(--ok)', fontSize: 14 }}></i> Bezpieczne logowanie z weryfikacją 2FA · TOTP · IP whitelist
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 18 }}>
              <i className="ph ph-shield-check" style={{ fontSize: 32, color: 'var(--accent)' }}></i>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>Weryfikacja 2FA</h2>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', textAlign: 'center', maxWidth: 280 }}>
                Wprowadź <em className="font-serif">6-cyfrowy</em> kod z aplikacji uwierzytelniającej.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
              {[1,2,3,4,5,6].map(i => (
                <input key={i} maxLength="1" autoFocus={i === 1}
                  style={{ width: 46, height: 56, textAlign: 'center', fontSize: 24, fontFamily: 'var(--font-mono)', fontWeight: 600,
                           background: 'var(--surface)', border: '1px solid var(--border-hi)', borderRadius: 9, color: 'var(--fg)' }} />
              ))}
            </div>
            <button className="btn btn-primary btn-block btn-lg" onClick={onBack}><i className="ph ph-check"></i>Zatwierdź</button>
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--fg-muted)' }}>
              <a style={{ color: 'var(--accent)' }} onClick={() => setStep('login')}>← Wróć do logowania</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

window.Login = Login;
