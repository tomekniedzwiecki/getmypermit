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
        { href: 'cases.html', icon: 'ph-folders', color: 'text-white', label: 'Sprawy', id: 'cases' },
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
        { href: 'invoices.html', icon: 'ph-receipt', color: 'text-orange-400', label: 'Faktury', id: 'invoices' },
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
    return `
      <a href="${item.href}" data-page="${item.id}" class="sidebar-link ${activePage === item.id ? 'active' : ''} w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-zinc-400 text-sm font-medium">
        <i class="ph ${item.icon} text-lg ${item.color}"></i>
        <span>${item.label}</span>
      </a>`;
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

        <!-- Info o zalogowanym + logout -->
        <div class="border-t border-zinc-900 p-3">
          <div id="sidebar-user" class="px-3 py-2 mb-2 text-xs text-zinc-500">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
                <i class="ph ph-user text-zinc-500"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div id="sidebar-user-name" class="text-zinc-300 text-xs truncate">—</div>
                <div id="sidebar-user-role" class="text-zinc-600 text-[10px]">—</div>
              </div>
            </div>
          </div>
          <button id="sidebar-logout" class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 text-sm transition-colors">
            <i class="ph ph-sign-out text-lg"></i>
            <span>Wyloguj</span>
          </button>
        </div>
      </aside>`;
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
  });

  // Gdy auth ready - wypelnij info o userze
  document.addEventListener('gmp-auth-ready', (e) => {
    const { user, staff } = e.detail;
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    if (nameEl) nameEl.textContent = staff?.full_name || user?.email || '—';
    if (roleEl) roleEl.textContent = staff?.role || 'user';
  });

  window.GMP_CRM_SIDEBAR = { sections, generate: generateSidebar };
})();
