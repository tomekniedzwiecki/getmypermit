// Shared Sidebar Component for GetMyPermit
// Usage: <script src="components/sidebar.js" data-active="calendar"></script>

(function() {
    const script = document.currentScript;
    const activePage = script?.getAttribute('data-active') || '';

    const menuItems = [
        { href: 'admin.html#leads', icon: 'ph-list-bullets', color: 'text-cyan-400', label: 'Leady', id: 'leads' },
        { href: 'admin.html#pipeline', icon: 'ph-kanban', color: 'text-pink-400', label: 'Pipeline', id: 'pipeline' },
        { href: 'calendar.html', icon: 'ph-calendar', color: 'text-blue-400', label: 'Kalendarz', id: 'calendar' },
        { href: 'availability.html', icon: 'ph-clock', color: 'text-emerald-400', label: 'Dostepnosc', id: 'availability' },
        { href: 'lawyers.html', icon: 'ph-users', color: 'text-purple-400', label: 'Prawnicy', id: 'lawyers' },
        { href: 'offers.html', icon: 'ph-file-text', color: 'text-amber-400', label: 'Szablony ofert', id: 'offers' },
        { href: 'client-offers.html', icon: 'ph-paper-plane-tilt', color: 'text-green-400', label: 'Wysłane oferty', id: 'client-offers' },
    ];

    function generateSidebar(extraContent = '') {
        return `
            <aside id="main-sidebar" class="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col flex-shrink-0">
                <!-- Logo -->
                <div class="h-16 flex items-center px-5 border-b border-zinc-800">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                            <i class="ph ph-user-list text-white"></i>
                        </div>
                        <span class="text-white font-semibold">GetMyPermit</span>
                    </div>
                </div>

                <!-- Navigation -->
                <nav id="sidebar-nav" class="flex-1 p-3 space-y-1">
                    ${menuItems.map(item => `
                        <a href="${item.href}" data-page="${item.id}" class="sidebar-link ${activePage === item.id ? 'active' : ''} w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 text-sm font-medium">
                            <i class="ph ${item.icon} text-lg ${item.color}"></i>
                            <span>${item.label}</span>
                        </a>
                    `).join('')}
                </nav>

                ${extraContent}

                <!-- Branding -->
                <div class="p-4 border-t border-zinc-800">
                    <div class="bg-gradient-to-br from-zinc-900 via-zinc-900 to-blue-950/30 rounded-xl p-4 border border-zinc-800/50 relative overflow-hidden">
                        <div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-2xl"></div>
                        <div class="relative">
                            <div class="flex items-center gap-2 mb-2">
                                <div class="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <i class="ph-fill ph-lightning text-white text-xs"></i>
                                </div>
                                <span class="text-zinc-400 text-[10px] font-medium uppercase tracking-wider">Crafted by</span>
                            </div>
                            <p class="text-zinc-300 text-xs font-medium leading-relaxed">Tomasz Niedźwiecki</p>
                            <p class="text-zinc-500 text-[10px] mt-1">Autorski panel &bull; Wszelkie prawa zastrzeżone</p>
                        </div>
                    </div>
                </div>

                <!-- Logout -->
                <div class="p-3 pt-0">
                    <button id="sidebar-logout" class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 text-sm transition-colors">
                        <i class="ph ph-sign-out text-lg"></i>
                        <span>Wyloguj</span>
                    </button>
                </div>
            </aside>
        `;
    }

    const sidebarHTML = generateSidebar();

    // Find placeholder and insert sidebar
    document.addEventListener('DOMContentLoaded', function() {
        const placeholder = document.getElementById('sidebar-placeholder');
        if (placeholder) {
            const extraContent = placeholder.innerHTML.trim();
            placeholder.outerHTML = generateSidebar(extraContent);
        }

        // Handle logout button
        const logoutBtn = document.getElementById('sidebar-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                if (typeof logout === 'function') {
                    logout();
                } else {
                    window.location.href = 'index.html';
                }
            });
        }

        // Handle hash-based navigation for admin.html
        function updateActiveLink() {
            const hash = window.location.hash.replace('#', '') || 'leads';
            const links = document.querySelectorAll('#sidebar-nav .sidebar-link');
            links.forEach(link => {
                const page = link.getAttribute('data-page');
                if (page === hash || (page === 'leads' && hash === 'leads') || (page === 'pipeline' && hash === 'pipeline')) {
                    link.classList.add('active');
                } else if (page === 'leads' || page === 'pipeline') {
                    link.classList.remove('active');
                }
            });

            // Call switchTab if it exists (for admin.html)
            if (typeof switchTab === 'function' && (hash === 'leads' || hash === 'pipeline')) {
                switchTab(hash);
            }
        }

        // Check hash on load
        if (window.location.pathname.includes('admin.html')) {
            updateActiveLink();
            window.addEventListener('hashchange', updateActiveLink);
        }
    });

    // Export
    window.GMP_SIDEBAR = { generate: generateSidebar, menuItems };
})();
