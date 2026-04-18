// Notifications bell + dropdown
// Wywoływane automatycznie po auth-ready
// API: gmpNotifications.refresh(), gmpNotifications.notify(...)

(function() {
    const style = document.createElement('style');
    style.textContent = `
        .notif-bell {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 36px; height: 36px;
            border-radius: 8px;
            background: transparent;
            border: 1px solid var(--border);
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 100ms;
        }
        .notif-bell:hover { background: var(--bg-hover); color: var(--text); border-color: var(--border-hover); }
        .notif-badge {
            position: absolute;
            top: -4px; right: -4px;
            min-width: 16px; height: 16px;
            padding: 0 4px;
            border-radius: 999px;
            background: var(--danger);
            color: white;
            font-size: 10px;
            font-weight: 600;
            display: flex; align-items: center; justify-content: center;
            border: 2px solid var(--bg);
        }
        .notif-drawer {
            position: fixed;
            top: 60px; right: 16px;
            width: 400px; max-width: calc(100vw - 32px);
            max-height: 70vh;
            background: var(--bg-elevated);
            border: 1px solid var(--border);
            border-radius: var(--r-xl);
            box-shadow: var(--shadow-lg);
            z-index: 95;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .notif-header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border);
            display: flex; align-items: center; justify-content: space-between;
            flex-shrink: 0;
        }
        .notif-title { font-size: var(--fs-sm); font-weight: 600; color: var(--text); }
        .notif-clear {
            font-size: 11px; color: var(--text-tertiary);
            background: transparent; border: none; cursor: pointer;
            padding: 4px 8px; border-radius: 4px;
        }
        .notif-clear:hover { color: var(--text); background: var(--bg-hover); }
        .notif-list {
            flex: 1;
            overflow-y: auto;
            min-height: 100px;
        }
        .notif-item {
            display: flex; align-items: flex-start; gap: 10px;
            padding: 12px 14px;
            border-bottom: 1px solid var(--border);
            text-decoration: none;
            color: inherit;
            cursor: pointer;
            transition: background 100ms;
            position: relative;
        }
        .notif-item:hover { background: var(--bg-hover); }
        .notif-item.unread { background: rgba(99,102,241,0.04); }
        .notif-item.unread::before {
            content: '';
            position: absolute;
            left: 4px; top: 50%;
            transform: translateY(-50%);
            width: 4px; height: 4px;
            border-radius: 50%;
            background: var(--accent);
        }
        .notif-ic {
            width: 32px; height: 32px;
            border-radius: var(--r-md);
            display: flex; align-items: center; justify-content: center;
            background: var(--bg-subtle);
            color: var(--text-secondary);
            flex-shrink: 0;
            font-size: 15px;
        }
        .notif-ic.warn { background: rgba(245,158,11,0.12); color: #fcd34d; }
        .notif-ic.danger { background: rgba(239,68,68,0.12); color: #fca5a5; }
        .notif-ic.success { background: rgba(16,185,129,0.12); color: #6ee7b7; }
        .notif-body { flex: 1; min-width: 0; }
        .notif-body-title { font-size: var(--fs-sm); color: var(--text); line-height: 1.3; font-weight: 500; }
        .notif-body-sub { font-size: 11px; color: var(--text-tertiary); margin-top: 3px; line-height: 1.4; }
        .notif-body-time { font-size: 10px; color: var(--text-muted); margin-top: 4px; }
        .notif-empty {
            padding: 32px 16px;
            text-align: center;
            color: var(--text-tertiary);
            font-size: var(--fs-sm);
        }
        .notif-empty i { font-size: 32px; opacity: 0.3; display: block; margin-bottom: 8px; }
        .notif-dismiss {
            background: transparent; border: none;
            color: var(--text-tertiary); cursor: pointer;
            padding: 2px 4px; border-radius: 4px;
            opacity: 0; transition: opacity 100ms;
            flex-shrink: 0;
        }
        .notif-item:hover .notif-dismiss { opacity: 1; }
        .notif-dismiss:hover { color: var(--danger); background: var(--danger-subtle); }
    `;
    document.head.appendChild(style);

    let drawerEl = null;
    let notifications = [];
    let unreadCount = 0;
    let pollInterval = null;

    function ensureBell() {
        if (document.getElementById('gmp-notif-bell')) return;
        // Wstaw w page-header przed przycikami (pierwszy div z klasą flex)
        const header = document.querySelector('.page-header');
        if (!header) return;
        const actionsDiv = header.querySelector(':scope > .flex');
        if (!actionsDiv) return;

        const bell = document.createElement('button');
        bell.id = 'gmp-notif-bell';
        bell.className = 'notif-bell';
        bell.title = 'Powiadomienia';
        bell.innerHTML = `<i class="ph ph-bell"></i><span class="notif-badge" id="gmp-notif-badge" style="display:none">0</span>`;
        bell.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
        actionsDiv.insertBefore(bell, actionsDiv.firstChild);
    }

    async function refresh() {
        if (!window.currentStaff) return;
        const { data } = await db.from('gmp_notifications')
            .select('*')
            .eq('recipient_id', window.currentStaff.id)
            .order('created_at', { ascending: false })
            .limit(30);
        notifications = data || [];
        unreadCount = notifications.filter(n => !n.read_at).length;
        renderBadge();
        if (drawerEl) renderDrawer();
    }

    function renderBadge() {
        const badge = document.getElementById('gmp-notif-badge');
        if (!badge) return;
        if (unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        } else badge.style.display = 'none';
    }

    function toggle() {
        if (drawerEl) { close(); return; }
        open();
    }

    function open() {
        close();
        drawerEl = document.createElement('div');
        drawerEl.className = 'notif-drawer';
        drawerEl.addEventListener('click', (e) => e.stopPropagation());
        document.body.appendChild(drawerEl);
        renderDrawer();

        // Mark all as read after 1s
        setTimeout(() => markAllRead(), 1000);

        // Close on outside click
        setTimeout(() => document.addEventListener('click', outsideClose), 10);
    }

    function outsideClose(e) {
        if (drawerEl && !drawerEl.contains(e.target) && e.target.id !== 'gmp-notif-bell' && !e.target.closest('#gmp-notif-bell')) {
            close();
        } else {
            document.addEventListener('click', outsideClose, { once: true });
        }
    }

    function close() {
        if (drawerEl) { drawerEl.remove(); drawerEl = null; }
        document.removeEventListener('click', outsideClose);
    }

    function renderDrawer() {
        if (!drawerEl) return;
        const unreadN = notifications.filter(n => !n.read_at).length;
        const listHTML = notifications.length ? notifications.map(n => {
            const isUnread = !n.read_at;
            const sevClass = ['danger', 'warn', 'success'].includes(n.severity) ? n.severity : '';
            return `<a class="notif-item ${isUnread ? 'unread' : ''}" ${n.link_url ? `href="${esc(n.link_url)}"` : ''} data-id="${n.id}">
                <div class="notif-ic ${sevClass}"><i class="ph ${esc(n.icon || 'ph-bell')}"></i></div>
                <div class="notif-body">
                    <div class="notif-body-title">${esc(n.title)}</div>
                    ${n.body ? `<div class="notif-body-sub">${esc(n.body)}</div>` : ''}
                    <div class="notif-body-time">${fmt.daysAgo(n.created_at)}</div>
                </div>
                <button class="notif-dismiss" data-id="${n.id}" title="Usuń"><i class="ph ph-x"></i></button>
            </a>`;
        }).join('') : `<div class="notif-empty"><i class="ph ph-check-circle"></i>Brak powiadomień</div>`;

        drawerEl.innerHTML = `
            <div class="notif-header">
                <span class="notif-title">Powiadomienia ${unreadN ? `<span style="color: var(--accent); font-weight: 600">· ${unreadN} nowe</span>` : ''}</span>
                <button class="notif-clear" id="gmp-notif-clear-all">Wyczyść wszystko</button>
            </div>
            <div class="notif-list">${listHTML}</div>`;

        drawerEl.querySelectorAll('.notif-dismiss').forEach(btn => btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            dismiss(btn.dataset.id);
        }));
        drawerEl.querySelector('#gmp-notif-clear-all').addEventListener('click', clearAll);
    }

    async function markAllRead() {
        const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
        if (!unreadIds.length) return;
        await db.from('gmp_notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
        notifications.forEach(n => { if (!n.read_at) n.read_at = new Date().toISOString(); });
        unreadCount = 0;
        renderBadge();
    }

    async function dismiss(id) {
        await db.from('gmp_notifications').delete().eq('id', id);
        notifications = notifications.filter(n => n.id !== id);
        unreadCount = notifications.filter(n => !n.read_at).length;
        renderBadge();
        renderDrawer();
    }

    async function clearAll() {
        if (!confirm('Wyczyścić wszystkie powiadomienia?')) return;
        await db.from('gmp_notifications').delete().eq('recipient_id', window.currentStaff.id);
        notifications = [];
        unreadCount = 0;
        renderBadge();
        renderDrawer();
    }

    // Init after auth
    document.addEventListener('gmp-auth-ready', () => {
        // Wait for page-header to exist
        setTimeout(() => {
            ensureBell();
            refresh();

            // Poll every 60s
            if (pollInterval) clearInterval(pollInterval);
            pollInterval = setInterval(refresh, 60000);
        }, 100);
    });

    window.gmpNotifications = { refresh, open, close };
})();
