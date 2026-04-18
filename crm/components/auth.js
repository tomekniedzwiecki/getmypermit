// Auth guard + helpers
// Usage: <script src="components/auth.js" data-require-auth="true"></script>

(function() {
  const script = document.currentScript;
  const requireAuth = script?.getAttribute('data-require-auth') !== 'false';

  async function getSession() {
    const { data, error } = await window.supabaseClient.auth.getSession();
    if (error) console.error('Auth error:', error);
    return data?.session || null;
  }

  async function getCurrentUser() {
    const session = await getSession();
    return session?.user || null;
  }

  async function getCurrentStaff() {
    const user = await getCurrentUser();
    if (!user) return null;
    const { data, error } = await window.db
      .from('gmp_staff')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) console.error('Staff fetch error:', error);
    return data;
  }

  async function login(email, password) {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  // Buduje absolutny URL względem obecnego katalogu (działa lokalnie i w produkcji,
  // niezależnie czy /crm/ jest w ścieżce czy nie)
  function relativeUrl(filename) {
    const path = window.location.pathname;
    const base = path.endsWith('/') ? path : path.substring(0, path.lastIndexOf('/') + 1);
    return window.location.origin + base + filename;
  }

  async function sendMagicLink(email) {
    const { error } = await window.supabaseClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: relativeUrl('dashboard.html') },
    });
    if (error) throw error;
  }

  async function sendPasswordReset(email) {
    const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: relativeUrl('reset-password.html'),
    });
    if (error) throw error;
  }

  async function updatePassword(newPassword) {
    const { error } = await window.supabaseClient.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function logout() {
    await window.supabaseClient.auth.signOut();
    window.location.href = 'index.html';
  }

  // Guard - jesli nie zalogowany to redirect do index.html
  async function enforceAuth() {
    const session = await getSession();
    if (!session) {
      const returnTo = window.location.pathname.split('/').pop() + window.location.search;
      const url = `index.html${returnTo && returnTo !== 'index.html' ? '?return=' + encodeURIComponent(returnTo) : ''}`;
      window.location.href = url;
      return false;
    }
    return true;
  }

  // Role helpers
  function hasRole(staff, minRole) {
    if (!staff?.role) return false;
    const hierarchy = { owner: 5, admin: 4, lawyer: 3, assistant: 2, staff: 1 };
    return (hierarchy[staff.role] || 0) >= (hierarchy[minRole] || 0);
  }
  function isOwner(staff) { return staff?.role === 'owner'; }
  function isAdminOrOwner(staff) { return staff?.role === 'owner' || staff?.role === 'admin'; }

  // Redirect jeśli brak roli (używane w /admin.html)
  async function requireRole(minRole) {
    const staff = await getCurrentStaff();
    if (!staff || !hasRole(staff, minRole)) {
      alert('Brak uprawnień do tej sekcji.');
      window.location.href = 'dashboard.html';
      return null;
    }
    return staff;
  }

  // Audit log helper — wywołuje RPC gmp_audit_log_add
  async function auditLog(action, opts = {}) {
    try {
      await window.db.rpc('gmp_audit_log_add', {
        p_action: action,
        p_entity_type: opts.entityType || null,
        p_entity_id: opts.entityId || null,
        p_entity_label: opts.entityLabel || null,
        p_severity: opts.severity || 'info',
        p_before: opts.before || null,
        p_after: opts.after || null,
        p_metadata: opts.metadata || {},
      });
    } catch (e) { console.warn('audit log failed:', e.message); }
  }

  // Touch login — wywołane raz po zalogowaniu (debounce na sessionStorage, 1h TTL)
  async function touchLoginIfNeeded() {
    try {
      const last = sessionStorage.getItem('gmp_login_touched');
      if (last && Date.now() - parseInt(last) < 3600_000) return;
      await window.db.rpc('gmp_staff_touch_login');
      sessionStorage.setItem('gmp_login_touched', String(Date.now()));
    } catch (e) { /* silent */ }
  }

  // Export
  window.gmpAuth = {
    getSession, getCurrentUser, getCurrentStaff,
    login, sendMagicLink, sendPasswordReset, updatePassword, logout,
    enforceAuth, requireRole, hasRole, isOwner, isAdminOrOwner, auditLog,
  };

  // Auto-enforce jesli data-require-auth="true" (default)
  if (requireAuth) {
    document.addEventListener('DOMContentLoaded', async () => {
      const ok = await enforceAuth();
      if (ok) {
        // Info o uzytkowniku do window.currentUser
        window.currentUser = await getCurrentUser();
        window.currentStaff = await getCurrentStaff();
        // Touch login (1h debounce)
        touchLoginIfNeeded();
        document.dispatchEvent(new CustomEvent('gmp-auth-ready', {
          detail: { user: window.currentUser, staff: window.currentStaff }
        }));
      }
    });
  }
})();
