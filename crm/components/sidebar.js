// CRM Sidebar - nawigacja dla CRM getmypermit
// Usage: <script src="components/sidebar.js" data-active="cases"></script>

(function() {
  const script = document.currentScript;
  const activePage = script?.getAttribute('data-active') || '';

  const sections = [
    {
      label: 'PRACA',
      items: [
        { href: 'dashboard.html', icon: 'ph-house', color: 'text-blue-400', label: 'Dashboard', id: 'dashboard' },
        {
          href: 'leads.html', icon: 'ph-magnet', color: 'text-pink-400', label: 'Leady', id: 'leads',
          children: [
            { href: 'leads.html', label: 'Lista', id: 'leads' },
            { href: 'leads-pipeline.html', label: 'Pipeline', id: 'leads-pipeline' },
          ]
        },
        { href: 'cases.html', icon: 'ph-folders', color: 'text-white', label: 'Sprawy', id: 'cases' },
        { href: 'kanban.html', icon: 'ph-kanban', color: 'text-purple-400', label: 'Kanban', id: 'kanban' },
        { href: 'tasks.html', icon: 'ph-check-square', color: 'text-emerald-400', label: 'Zadania', id: 'tasks' },
        { href: 'alerts.html', icon: 'ph-bell-ringing', color: 'text-red-400', label: 'Alerty', id: 'alerts' },
      ]
    },
    {
      label: 'KALENDARZ',
      items: [
        { href: 'appointments.html', icon: 'ph-calendar-check', color: 'text-cyan-400', label: 'Kalendarz', id: 'appointments' },
        { href: 'submissions.html', icon: 'ph-paper-plane-tilt', color: 'text-amber-400', label: 'Kolejka wniosków', id: 'submissions' },
      ]
    },
    {
      label: 'KARTOTEKI',
      items: [
        { href: 'clients.html', icon: 'ph-users', color: 'text-purple-400', label: 'Klienci', id: 'clients' },
        { href: 'employers.html', icon: 'ph-buildings', color: 'text-indigo-400', label: 'Pracodawcy', id: 'employers' },
        { href: 'staff.html', icon: 'ph-scales', color: 'text-pink-400', label: 'Prawnicy', id: 'staff' },
      ]
    },
    {
      label: 'FINANSE',
      items: [
        { href: 'payments.html', icon: 'ph-coins', color: 'text-yellow-400', label: 'Płatności', id: 'payments' },
        { href: 'receivables.html', icon: 'ph-warning-circle', color: 'text-red-400', label: 'Windykacja', id: 'receivables' },
        { href: 'invoices.html', icon: 'ph-receipt', color: 'text-orange-400', label: 'Faktury', id: 'invoices' },
        { href: 'analytics.html', icon: 'ph-chart-line-up', color: 'text-emerald-400', label: 'Analiza', id: 'analytics' },
      ]
    },
    {
      label: 'BIBLIOTEKA',
      items: [
        { href: 'templates.html', icon: 'ph-file-text', color: 'text-zinc-400', label: 'Wzory dokumentów', id: 'templates' },
      ]
    },
  ];

  function renderItem(item) {
    const isParentActive = item.children?.some(c => c.id === activePage);
    const mainActive = activePage === item.id || isParentActive;
    let html = `
      <a href="${item.href}" data-page="${item.id}" class="sidebar-link ${mainActive ? 'active' : ''} w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-zinc-400 text-sm font-medium">
        <i class="ph ${item.icon} text-lg ${item.color}"></i>
        <span>${item.label}</span>
      </a>`;
    // Render children only when parent section is active
    if (item.children && mainActive) {
      html += `<div class="sidebar-sub">` + item.children.map(c => `
        <a href="${c.href}" class="sidebar-sublink ${activePage === c.id ? 'active' : ''}">
          <span class="dot"></span>${c.label}
        </a>`).join('') + `</div>`;
    }
    return html;
  }

  function renderSection(sec) {
    return `
      <div class="mb-3">
        <div class="px-4 mb-1.5 text-[10px] font-semibold text-zinc-600 tracking-wider">${sec.label}</div>
        <div class="space-y-0.5">${sec.items.map(renderItem).join('')}</div>
      </div>`;
  }

  function generateSidebar() {
    return `
      <div class="mobile-topbar" id="mobile-topbar">
        <button class="mobile-hamburger" id="mobile-hamburger" aria-label="Menu"><i class="ph ph-list"></i></button>
        <a href="dashboard.html" class="mobile-topbar-brand">
          <div class="ico"><i class="ph ph-scales"></i></div>
          <span>GetMyPermit CRM</span>
        </a>
      </div>
      <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
      <aside id="main-sidebar" class="w-60 bg-zinc-950 border-r border-zinc-900 flex flex-col flex-shrink-0 h-screen sticky top-0">
        <!-- Logo -->
        <div class="h-14 flex items-center px-5 border-b border-zinc-900">
          <a href="dashboard.html" class="flex items-center gap-2.5">
            <div class="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
              <i class="ph ph-scales text-white text-sm"></i>
            </div>
            <span class="text-white font-semibold text-sm">GetMyPermit CRM</span>
          </a>
        </div>

        <!-- Navigation -->
        <nav id="sidebar-nav" class="flex-1 p-3 overflow-y-auto">
          ${sections.map(renderSection).join('')}
        </nav>

        <!-- Footer: search + user menu -->
        <div class="sidebar-footer">
          <!-- Search (primary CTA) -->
          <button class="sidebar-search" onclick="gmpSearch && gmpSearch.open()" title="Szukaj (Ctrl+K)">
            <i class="ph ph-magnifying-glass"></i>
            <span>Szukaj</span>
            <kbd class="sidebar-kbd">⌘K</kbd>
          </button>

          <!-- User card + icon actions -->
          <div class="sidebar-user-card">
            <div class="sidebar-user-info">
              <span id="sidebar-user-avatar" class="avatar avatar-sm"></span>
              <div class="min-w-0 flex-1">
                <div id="sidebar-user-name" class="sidebar-user-name">—</div>
                <div id="sidebar-user-role" class="sidebar-user-role">—</div>
              </div>
            </div>
            <div class="sidebar-user-actions">
              <button class="sidebar-icon-btn" onclick="window.gmpTheme && gmpTheme.toggle()" title="Przełącz motyw">
                <i class="ph ph-moon" id="theme-icon"></i>
              </button>
              <button class="sidebar-icon-btn" onclick="gmpSearch && gmpSearch.help()" title="Pomoc (?)">
                <i class="ph ph-question"></i>
              </button>
              <button id="sidebar-logout" class="sidebar-icon-btn" title="Wyloguj">
                <i class="ph ph-sign-out"></i>
              </button>
            </div>
          </div>
        </div>
      </aside>`;
  }

  // Auto-load shortcuts.js + theme.js + notifications.js
  if (!window._gmpShortcutsLoaded) {
    window._gmpShortcutsLoaded = true;
    const s = document.createElement('script');
    s.src = 'components/shortcuts.js';
    document.head.appendChild(s);
    const t = document.createElement('script');
    t.src = 'components/theme.js';
    document.head.appendChild(t);
    const n = document.createElement('script');
    n.src = 'components/notifications.js';
    document.head.appendChild(n);
  }

  document.addEventListener('DOMContentLoaded', function() {
    const placeholder = document.getElementById('sidebar-placeholder');
    if (placeholder) {
      placeholder.outerHTML = generateSidebar();
    }
    const logoutBtn = document.getElementById('sidebar-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => window.gmpAuth?.logout() || (window.location.href = 'index.html'));
    }

    // Mobile hamburger drawer
    const hamburger = document.getElementById('mobile-hamburger');
    const backdrop = document.getElementById('sidebar-backdrop');
    const sidebar = document.getElementById('main-sidebar');
    function openSidebar() { sidebar?.classList.add('open'); backdrop?.classList.add('open'); }
    function closeSidebar() { sidebar?.classList.remove('open'); backdrop?.classList.remove('open'); }
    if (hamburger) hamburger.addEventListener('click', openSidebar);
    if (backdrop) backdrop.addEventListener('click', closeSidebar);
    // Close drawer when clicking a link inside sidebar (mobile UX)
    sidebar?.addEventListener('click', (e) => {
      if (e.target.closest('a') && window.innerWidth <= 900) {
        setTimeout(closeSidebar, 100);
      }
    });
    // Close on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeSidebar();
    });
  });

  // Gdy auth ready - wypelnij info o userze
  document.addEventListener('gmp-auth-ready', (e) => {
    const { user, staff } = e.detail;
    const name = staff?.full_name || user?.email || '—';
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = staff?.role || 'user';
    if (avatarEl && window.avatar) avatarEl.outerHTML = window.avatar(name, 'sm').replace('class="avatar avatar-sm"', 'class="avatar avatar-sm" id="sidebar-user-avatar"');
  });

  window.GMP_CRM_SIDEBAR = { sections, generate: generateSidebar };
})();
