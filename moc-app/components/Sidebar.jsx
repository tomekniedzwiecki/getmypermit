// Sidebar component
const { useState } = React;

const NAV_GROUPS = [
  {
    label: "Przegląd",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "house", badge: null },
      { id: "alerts", label: "Alerty", icon: "bell", badge: 9, badgeKind: "danger" },
    ],
  },
  {
    label: "Cudzoziemcy",
    items: [
      { id: "foreigners", label: "Lista cudzoziemców", icon: "users-three", badge: 247 },
      { id: "documents", label: "Dokumenty", icon: "files", badge: 34, badgeKind: "warn" },
      { id: "events", label: "Zdarzenia", icon: "lightning", badge: null },
      { id: "calendar", label: "Kalendarz terminów", icon: "calendar-blank", badge: null },
      { id: "onboarding", label: "Dodaj cudzoziemca", icon: "user-plus", badge: null },
    ],
  },
  {
    label: "Łańcuch dostawców",
    items: [
      { id: "subcontractors", label: "Podwykonawcy", icon: "buildings", badge: 4 },
    ],
  },
  {
    label: "Kancelaria",
    items: [
      { id: "cases", label: "Sprawy zlecone", icon: "scales", badge: 11, badgeKind: "accent" },
      { id: "reports", label: "Raporty compliance", icon: "chart-bar", badge: null },
    ],
  },
  {
    label: "System",
    items: [
      { id: "settings", label: "Ustawienia", icon: "gear", badge: null },
    ],
  },
];

function initialsFromName(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function roleLabel(role) {
  return ({
    owner: 'Właściciel',
    hr_manager: 'HR Manager',
    hr_specialist: 'HR Specjalista',
    viewer: 'Podgląd',
  })[role] || role;
}

function Sidebar({ active, onNav, plan, userName, userRole, companyName, onSignOut, badges }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const b = badges || {};

  // Override badge'y w NAV_GROUPS przez data z props (jeśli są)
  const groups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.map(item => ({
      ...item,
      badge: b[item.id] !== undefined ? b[item.id] : item.badge,
    })),
  }));

  const compactCompany = (companyName || '').length > 18 ? companyName.slice(0, 16) + '…' : companyName;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">G</div>
        <div className="brand-text">
          <strong>Getmypermit</strong>
          <span>Compliance · Cudzoziemcy</span>
        </div>
      </div>

      {groups.map((group) => (
        <div className="nav-group" key={group.label}>
          <div className="nav-group-label">{group.label}</div>
          {group.items.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => onNav(item.id)}
            >
              <i className={`ph ph-${item.icon} nav-icon`}></i>
              <span>{item.label}</span>
              {item.badge !== null && item.badge !== undefined && item.badge !== 0 && (
                <span className={`nav-badge ${item.badgeKind || ''}`}>{item.badge}</span>
              )}
            </button>
          ))}
        </div>
      ))}

      <div className="sidebar-footer">
        <div style={{ padding: '8px 10px 12px', borderRadius: 8, background: 'var(--surface-3)', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontWeight: 600 }}>Plan</span>
            <span className={`plan-pill ${plan === 'Basic' ? 'basic' : plan === 'Medium' ? 'medium' : ''}`}>{plan}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--fg-muted)', lineHeight: 1.4 }}>
            {plan === 'Pro' && 'System + obsługa kancelarii'}
            {plan === 'Medium' && 'System + procesy'}
            {plan === 'Basic' && 'Kartoteka + alerty'}
          </div>
        </div>
        <div className="user-card" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setMenuOpen(!menuOpen)}>
          <div className="user-avatar">{initialsFromName(userName)}</div>
          <div className="user-info">
            <div className="name">{userName || 'Użytkownik'}</div>
            <div className="role">{roleLabel(userRole)} · {compactCompany}</div>
          </div>
          <i className="ph ph-caret-up-down" style={{ fontSize: 12, color: 'var(--fg-faint)' }}></i>
          {menuOpen && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 6, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onSignOut && onSignOut(); }}
                style={{ width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg)', fontSize: 13, textAlign: 'left' }}
              >
                <i className="ph ph-sign-out" style={{ fontSize: 14 }}></i>
                Wyloguj
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
