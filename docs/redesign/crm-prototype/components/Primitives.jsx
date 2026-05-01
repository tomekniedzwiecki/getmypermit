// Shared UI primitives — Card, Pill, Kpi, Banner, RiskDial, DistBar, Status, AlertRow, Avatar, Collapsible, Empty
const H = window.GMP_HELPERS;

function Card({ title, sub, action, children, flush, elevated, className }) {
  return (
    <div className={`card ${elevated ? 'elevated' : ''} ${className || ''}`}>
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

function Pill({ kind, dot, mono, children, style, onClick }) {
  const cls = ['pill', kind, dot && 'dot', mono && 'mono'].filter(Boolean).join(' ');
  return <span className={cls} style={style} onClick={onClick}>{children}</span>;
}

function Kpi({ icon, iconKind, label, value, foot, footKind, onClick }) {
  return (
    <div className="kpi" onClick={onClick}>
      <div className="kpi-head">
        <div className={`kpi-icon ${iconKind || ''}`}>
          <i className={`ph ph-${icon}`}></i>
        </div>
        <div className="kpi-label">{label}</div>
      </div>
      <div className="kpi-value">{value}</div>
      {foot && (
        <div className="kpi-foot">
          <span className={footKind === 'up' ? 'delta-up' : footKind === 'down' ? 'delta-down' : ''}>{foot}</span>
        </div>
      )}
    </div>
  );
}

function Banner({ kind, icon, title, children, action }) {
  return (
    <div className={`banner ${kind || 'info'}`}>
      <i className={`ph ph-${icon || 'info'}`}></i>
      <div className="b-body">
        {title && <div className="b-title">{title}</div>}
        <div className="b-msg">{children}</div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function RiskDial({ score, label }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 80 ? 'var(--ok)' : score >= 60 ? 'var(--warn)' : 'var(--danger)';
  return (
    <div className="risk-dial">
      <svg viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} stroke="var(--surface-3)" strokeWidth="10" fill="none" />
        <circle cx="70" cy="70" r={r} stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 600ms var(--ease)' }} />
      </svg>
      <div className="center">
        <div className="num">{score}</div>
        <div className="lbl">{label || 'Score'}</div>
      </div>
    </div>
  );
}

function DistBar({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div>
      <div className="dist-bar">
        {segments.map((s, i) => s.value > 0 && (
          <div key={i} className={`seg ${s.kind}`} style={{ width: `${(s.value / total) * 100}%` }}></div>
        ))}
      </div>
      <div className="dist-legend">
        {segments.map((s, i) => (
          <div key={i} className="dl-item">
            <span className={`sw ${s.kind}`}></span><strong>{s.value}</strong> {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusLight({ kind, label }) {
  const map = { green: "OK", yellow: "Uwaga", red: "Ryzyko", gray: "Brak danych" };
  return (
    <span className={`status-light ${kind}`}>
      <span className="light"></span>
      <span>{label || map[kind]}</span>
    </span>
  );
}

function Avatar({ name, initials, size, color, flag }) {
  const s = size || 'md';
  const sizes = { sm: 24, md: 32, lg: 40, xl: 56 };
  const px = sizes[s];
  const init = initials || (name ? name.split(' ').map(w => w[0]).slice(0, 2).join('') : '?');
  return (
    <div className="avatar" style={{ width: px, height: px, fontSize: px * 0.4, background: color || 'var(--surface-3)', color: color ? '#fff' : 'var(--fg-2)', position: 'relative' }}>
      {init}
      {flag && <span style={{ position: 'absolute', bottom: -2, right: -2, fontSize: 11, background: 'var(--surface)', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 1.5px var(--surface)' }}>{flag}</span>}
    </div>
  );
}

function StaffAvatar({ staffId, size }) {
  const s = H.staffById(staffId);
  if (!s) return <Avatar initials="?" size={size} />;
  return <Avatar initials={s.initials} size={size} color={s.color} />;
}

function Collapsible({ marker, title, meta, defaultOpen, done, active, children }) {
  const [open, setOpen] = React.useState(!!defaultOpen);
  const cls = ['collapsible', open && 'open', done && 'done', active && 'active'].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <div className="collapsible-head" onClick={() => setOpen(!open)}>
        {marker && <div className="marker">{marker}</div>}
        <div className="ttl">{title}</div>
        {meta && <div className="meta">{meta}</div>}
        <i className="ph ph-caret-down chev"></i>
      </div>
      <div className="collapsible-body">{children}</div>
    </div>
  );
}

function AlertRow({ alert, onClick }) {
  const sev = alert.severity === 'overdue' ? 'overdue' : alert.severity === 'warn' ? 'warn' : '';
  return (
    <div className="alert-row" onClick={onClick}>
      <div className={`alert-day-badge ${sev}`}>
        <span className="num">{Math.abs(alert.days)}</span>
        <span className="lbl">{alert.days < 0 ? 'po term.' : 'dni'}</span>
      </div>
      <div>
        <div className="a-title">{alert.title}</div>
        <div className="a-meta">
          <span className="subj">{alert.subject}</span>
          <span className="sep">·</span>
          <span className="msg">{alert.message}</span>
        </div>
      </div>
      <button className="btn btn-sm btn-secondary" onClick={(e) => e.stopPropagation()}>{alert.action}</button>
    </div>
  );
}

function Empty({ icon, title, body, cta }) {
  return (
    <div className="empty">
      {icon && <i className={`ph ph-${icon}`}></i>}
      {title && <span className="em">{title}</span>}
      {body && <div className="body">{body}</div>}
      {cta}
    </div>
  );
}

function HeroStat({ pretitle, em, number, max, narrative, grid }) {
  return (
    <div className="hero-stat">
      <div className="left">
        <div className="pretitle"><span className="accent-dot"></span>{pretitle}{em && <span className="em">— {em}</span>}</div>
        <div className="number">{number}{max && <span className="max">/ {max}</span>}</div>
        {narrative && <div className="narrative">{narrative}</div>}
      </div>
      {grid && (
        <div className="right">
          <div className="hero-stat-grid">
            {grid.map((g, i) => (
              <div key={i} className="cell">
                <div className="lbl">{g.label}</div>
                <div className={`v ${g.tone || ''}`}>{g.value}{g.unit && <span className="unit">{g.unit}</span>}</div>
                {g.delta && <div className={`delta ${g.deltaTone}`}>{g.delta}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Timeline({ items }) {
  return (
    <div className="timeline">
      {items.map((it, i) => (
        <div key={i} className="tl-item">
          <div className={`tl-marker ${it.tone || ''}`}><i className={`ph ph-${it.icon}`}></i></div>
          <div className="tl-time">{it.time}</div>
          <div className="tl-title">{it.title}</div>
          {it.sub && <div className="tl-sub">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function PageHeader({ eyebrow, em, title, sub, actions }) {
  return (
    <div className="page-header">
      <div className="title-block">
        {eyebrow && <div className="eyebrow">{eyebrow}{em && <span className="em">{em}</span>}</div>}
        <h1 className="h-page">{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

function StatusPill({ caseStatus }) {
  const map = {
    "lead":       { kind: "gray",   label: "Lead" },
    "zlecona":    { kind: "info",   label: "Zlecona" },
    "aktywna":    { kind: "accent", label: "Aktywna" },
    "zakończona": { kind: "ok", label: "Zakończona" },
    "archiwum":   { kind: "gray",   label: "Archiwum" },
  };
  const cfg = map[caseStatus] || { kind: "gray", label: caseStatus };
  return <Pill kind={cfg.kind} dot>{cfg.label}</Pill>;
}

Object.assign(window, { Card, Pill, Kpi, Banner, RiskDial, DistBar, StatusLight, Avatar, StaffAvatar, Collapsible, AlertRow, Empty, HeroStat, Timeline, PageHeader, StatusPill });
