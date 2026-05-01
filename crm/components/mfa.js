// Tier 2 #7: 2FA TOTP support helpers.
// Wymaga Supabase MFA enabled (default na Pro plan).
// Use case:
//   1. Enrollment: window.gmpMfa.enroll() → QR code + secret → user scans → verifyEnrollment(code)
//   2. Challenge przy login: po signInWithPassword sprawdź needsMfaChallenge() → showMfaChallenge()
//   3. Lista factors: listFactors() / unenroll(factorId)

(function () {
    if (typeof window === 'undefined') return;
    if (window.gmpMfa) return;

    async function listFactors() {
        const { data, error } = await window.supabaseClient.auth.mfa.listFactors();
        if (error) throw error;
        return data?.totp || [];
    }

    async function hasVerifiedTotp() {
        const factors = await listFactors();
        return factors.some(f => f.status === 'verified');
    }

    // Enrollment - krok 1: stwórz factor, pokaż QR
    async function enroll(friendlyName) {
        const { data, error } = await window.supabaseClient.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: friendlyName || 'GetMyPermit CRM',
        });
        if (error) throw error;
        return {
            factorId: data.id,
            qrCodeSvg: data.totp.qr_code,
            secret: data.totp.secret,
            uri: data.totp.uri,
        };
    }

    // Enrollment - krok 2: user wpisuje kod z aplikacji, sprawdzamy
    async function verifyEnrollment(factorId, code) {
        const { data: chData, error: chErr } = await window.supabaseClient.auth.mfa.challenge({ factorId });
        if (chErr) throw chErr;
        const { data, error } = await window.supabaseClient.auth.mfa.verify({
            factorId,
            challengeId: chData.id,
            code,
        });
        if (error) throw error;
        return data;
    }

    // Login challenge - jeśli user ma TOTP, po signIn AAL=aal1 → musi przejść challenge
    async function getAal() {
        const { data, error } = await window.supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error) throw error;
        return data; // { currentLevel, nextLevel, currentAuthenticationMethods }
    }

    async function needsChallenge() {
        const { currentLevel, nextLevel } = await getAal();
        return currentLevel === 'aal1' && nextLevel === 'aal2';
    }

    async function challengeAndVerify(code) {
        const factors = await listFactors();
        const verified = factors.find(f => f.status === 'verified');
        if (!verified) throw new Error('Brak zweryfikowanego TOTP factor');
        const { data: chData, error: chErr } = await window.supabaseClient.auth.mfa.challenge({ factorId: verified.id });
        if (chErr) throw chErr;
        const { data, error } = await window.supabaseClient.auth.mfa.verify({
            factorId: verified.id,
            challengeId: chData.id,
            code,
        });
        if (error) throw error;
        return data;
    }

    async function unenroll(factorId) {
        const { error } = await window.supabaseClient.auth.mfa.unenroll({ factorId });
        if (error) throw error;
    }

    window.gmpMfa = {
        listFactors,
        hasVerifiedTotp,
        enroll,
        verifyEnrollment,
        getAal,
        needsChallenge,
        challengeAndVerify,
        unenroll,
    };
})();
