// Sidebar — nav grupy CRM kancelarii: Praca / Kalendarz / Kartoteki / System
const NAV_GROUPS = [
  {
    label: "Praca",
    items: [
      { id: "dashboard", label: "Pulpit",       icon: "house",                   badge: null },
      { id: "leads",     label: "Leady",        icon: "magnet",                  badge: 6 },
      { id: "pipeline",  label: "Pipeline",     icon: "funnel",                  badge: null },
      { id: "cases",     label: "Sprawy",       icon: "scales",                  badge: 184, badgeKind: "" },
      { id: "kanban",    label: "Kanban",       icon: "kanban",                  badge: null },
      { id: "tasks",     label: "Zadania",      icon: "list-checks",             badge: 9 },
      { id: "alerts",    label: "Alerty",       icon: "bell-ringing",            badge: 7, badgeKind: "danger" },
    ],
  },
  {
    label: "Kalendarz",
    items: [
      { id: "calendar",    label: "Spotkania",        icon: "calendar-blank",        badge: 5 },
      { id: "submissions", label: "Kolejka wniosków", icon: "tray-arrow-up",   badge: 3, badgeKind: "warn" },
    ],
  },
  {
    label: "Kartoteki",
    items: [
      { id: "clients",   label: "Klienci",      icon: "users-three",     badge: 247 },
      { id: "employers", label: "Pracodawcy",   icon: "buildings",       badge: 7 },
      { id: "groups",    label: "Grupy",        icon: "users-four",      badge: null },
      { id: "staff",     label: "Prawnicy",     icon: "scales",          badge: 6 },
      { id: "templates", label: "Szablony",     icon: "file-text",       badge: null },
    ],
  },
  {
    label: "Finanse",
    items: [
      { id: "payments",    label: "Płatności", icon: "currency-circle-dollar", badge: null },
      { id: "receivables", label: "Windykacja",   icon: "receipt",        badge: 5, badgeKind: "warn" },
      { id: "invoices",    label: "Faktury",      icon: "invoice",        badge: null },
      { id: "analytics",   label: "Analytics",    icon: "chart-line",     badge: null },
    ],
  },
  {
    label: "System",
    items: [
      { id: "admin",       label: "Admin",         icon: "shield-star",   badge: null },
      { id: "automations", label: "Automatyzacje", icon: "lightning",     badge: null },
    ],
  },
];

function Sidebar({ active, onNav, onOpenLogin, onOpenIntake }) {
  const u = window.GMP_DATA.currentUser;
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">G</div>
        <div className="brand-text">
          <strong>GetMyPermit</strong>
          <span>Panel kancelarii</span>
        </div>
      </div>

      {NAV_GROUPS.map((group) => (
        <div className="nav-group" key={group.label}>
          <div className="nav-group-label">{group.label}</div>
          {group.items.map((item) => (
            <button key={item.id}
              className={`nav-item ${active === item.id ? 'active' : ''}`}
              onClick={() => onNav(item.id)}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, padding: '0 10px' }}>
          <button className="nav-item" onClick={onOpenIntake} style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            <i className="ph ph-link nav-icon"></i><span>Formularz klienta</span>
          </button>
          <button className="nav-item" onClick={onOpenLogin} style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
            <i className="ph ph-sign-in nav-icon"></i><span>Ekran logowania</span>
          </button>
        </div>
        <div className="user-card">
          <div className="user-avatar" style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}>{u.initials}</div>
          <div className="user-info">
            <div className="name">{u.name}</div>
            <div className="role">{u.role} · GetMyPermit</div>
          </div>
          <i className="ph ph-caret-up-down" style={{ fontSize: 12, color: 'var(--fg-faint)' }}></i>
        </div>
      </div>
    </aside>
  );
}

window.Sidebar = Sidebar;
