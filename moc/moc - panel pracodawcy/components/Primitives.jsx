// Shared UI primitives — pills, status lights, kpi cards, cards
function StatusLight({ kind, label }) {
  const map = { green: "Zielony", yellow: "Żółty", red: "Czerwony", gray: "Brak danych" };
  return (
    <span className={`status-light ${kind}`}>
      <span className="light"></span>
      <span>{label || map[kind]}</span>
    </span>
  );
}

function StatusPair({ residence, work }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className={`status-light ${residence}`}>
        <span className="light"></span>
        <span style={{ fontSize: 11 }}>Pobyt</span>
      </span>
      <span className={`status-light ${work}`}>
        <span className="light"></span>
        <span style={{ fontSize: 11 }}>Praca</span>
      </span>
    </div>
  );
}

function Pill({ kind, dot, mono, children, style }) {
  const cls = ['pill', kind, dot && 'dot', mono && 'mono'].filter(Boolean).join(' ');
  return <span className={cls} style={style}>{children}</span>;
}

function Kpi({ icon, iconKind, label, value, foot, footKind }) {
  return (
    <div className="kpi">
      <div className="kpi-head">
        <div className={`kpi-icon ${iconKind || ''}`}>
          <i className={`ph ph-${icon}`}></i>
        </div>
        <div className="kpi-label">{label}</div>
      </div>
      <div className="kpi-value">{value}</div>
      {foot && <div className="kpi-foot"><span className={footKind === 'up' ? 'delta-up' : footKind === 'down' ? 'delta-down' : ''}>{foot}</span></div>}
    </div>
  );
}

function Card({ title, sub, action, children, flush }) {
  return (
    <div className="card">
      {(title || action) && (
        <div className="card-header">
          <div className="left">
            {title && <h3>{title}</h3>}
            {sub && <div className="sub">{sub}</div>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={`card-body ${flush ? 'flush' : ''}`}>{children}</div>
    </div>
  );
}

function RiskDial({ score }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? 'var(--ok)' : score >= 60 ? 'var(--warn)' : 'var(--danger)';
  return (
    <div className="risk-dial">
      <svg viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} stroke="var(--surface-3)" strokeWidth="10" fill="none" />
        <circle
          cx="70" cy="70" r={r}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 600ms var(--ease)' }}
        />
      </svg>
      <div className="center">
        <div className="num">{score}</div>
        <div className="lbl">Compliance</div>
      </div>
    </div>
  );
}

function DistBar({ green, yellow, red, gray }) {
  const total = green + yellow + red + gray;
  const pct = (n) => (n / total) * 100;
  return (
    <div>
      <div className="dist-bar">
        {green > 0 && <div className="seg green" style={{ width: `${pct(green)}%` }}></div>}
        {yellow > 0 && <div className="seg yellow" style={{ width: `${pct(yellow)}%` }}></div>}
        {red > 0 && <div className="seg red" style={{ width: `${pct(red)}%` }}></div>}
        {gray > 0 && <div className="seg gray" style={{ width: `${pct(gray)}%` }}></div>}
      </div>
      <div className="dist-legend">
        <div className="dl-item"><span className="sw green"></span><strong>{green}</strong> OK</div>
        <div className="dl-item"><span className="sw yellow"></span><strong>{yellow}</strong> uwaga</div>
        <div className="dl-item"><span className="sw red"></span><strong>{red}</strong> ryzyko</div>
        <div className="dl-item"><span className="sw gray"></span><strong>{gray}</strong> brak danych</div>
      </div>
    </div>
  );
}

function Banner({ kind, icon, title, children, action }) {
  return (
    <div className={`banner ${kind}`}>
      <i className={`ph ph-${icon || 'info'}`}></i>
      <div className="b-body">
        {title && <div className="b-title">{title}</div>}
        <div className="b-msg">{children}</div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

Object.assign(window, { StatusLight, StatusPair, Pill, Kpi, Card, RiskDial, DistBar, Banner });
