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

  // Export
  window.gmpAuth = {
    getSession, getCurrentUser, getCurrentStaff,
    login, sendMagicLink, sendPasswordReset, updatePassword, logout,
    enforceAuth,
  };

  // Auto-enforce jesli data-require-auth="true" (default)
  if (requireAuth) {
    document.addEventListener('DOMContentLoaded', async () => {
      const ok = await enforceAuth();
      if (ok) {
        // Info o uzytkowniku do window.currentUser
        window.currentUser = await getCurrentUser();
        window.currentStaff = await getCurrentStaff();
        document.dispatchEvent(new CustomEvent('gmp-auth-ready', {
          detail: { user: window.currentUser, staff: window.currentStaff }
        }));
      }
    });
  }
})();
