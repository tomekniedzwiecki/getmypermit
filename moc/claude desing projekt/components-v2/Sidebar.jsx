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

function Sidebar({ active, onNav, plan }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">G</div>
        <div className="brand-text">
          <strong>Getmypermit</strong>
          <span>Compliance · Cudzoziemcy</span>
        </div>
      </div>

      {NAV_GROUPS.map((group) => (
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
              {item.badge !== null && item.badge !== undefined && (
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
        <div className="user-card">
          <div className="user-avatar">AK</div>
          <div className="user-info">
            <div className="name">Anna Kowalska</div>
            <div className="role">HR Manager · Logistyka W.</div>
          </div>
          <i className="ph ph-caret-up-down" style={{ fontSize: 12, color: 'var(--fg-faint)' }}></i>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
