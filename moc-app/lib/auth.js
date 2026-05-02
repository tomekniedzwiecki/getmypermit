// MOC App — auth helpers
// Używa Supabase Auth + sprawdza czy user jest aktywnym członkiem przynajmniej jednej moc_companies.

window.mocAuth = {
    // Aktualny user (auth.users)
    async getUser() {
        const { data: { user }, error } = await window.db.auth.getUser();
        if (error) {
            console.error('getUser error:', error);
            return null;
        }
        return user;
    },

    // Pobierz profil (rekord w moc_company_users) dla aktualnej firmy
    // Jeśli user należy do wielu firm — bierze pierwszą aktywną.
    // currentCompanyId można zapamiętać w localStorage żeby user mógł przełączać.
    async getProfile(companyId = null) {
        const user = await this.getUser();
        if (!user) return null;

        let q = window.db
            .from('moc_company_users')
            .select('id, company_id, full_name, email, role, is_active, accepted_at, last_login_at, company:moc_companies(id, name, slug, logo_url, accent_color)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .not('accepted_at', 'is', null);

        if (companyId) q = q.eq('company_id', companyId);
        q = q.order('accepted_at', { ascending: false }).limit(1);

        const { data, error } = await q.maybeSingle();
        if (error) {
            console.error('getProfile error:', error);
            return null;
        }
        return data;
    },

    // Wszystkie firmy do których user należy (dla company-switchera)
    async listCompanies() {
        const user = await this.getUser();
        if (!user) return [];
        const { data, error } = await window.db
            .from('moc_company_users')
            .select('company_id, role, company:moc_companies(id, name, slug, logo_url)')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .not('accepted_at', 'is', null);
        if (error) {
            console.error('listCompanies error:', error);
            return [];
        }
        return data || [];
    },

    // Login (magic link)
    async signInWithEmail(email) {
        const { error } = await window.db.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/index.html`,
            },
        });
        if (error) {
            window.toast.error(error.message);
            return false;
        }
        window.toast.success('Sprawdź skrzynkę — wysłaliśmy link logowania.');
        return true;
    },

    async signInWithPassword(email, password) {
        const { error } = await window.db.auth.signInWithPassword({ email, password });
        if (error) {
            window.toast.error(error.message);
            return false;
        }
        return true;
    },

    async signOut() {
        await window.db.auth.signOut();
        window.location.href = '/login.html';
    },

    // Wymuś że jesteś zalogowany — przekierowuje na /login.html jeśli nie.
    async requireAuth() {
        const user = await this.getUser();
        if (!user) {
            window.location.href = '/login.html';
            return null;
        }
        const profile = await this.getProfile();
        if (!profile) {
            // User zalogowany ale nie ma jeszcze zaakceptowanego rekordu w żadnej firmie
            window.location.href = '/onboarding.html';
            return null;
        }
        return { user, profile };
    },
};
