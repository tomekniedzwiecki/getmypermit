// pz-credentials — Pre-condition Etap III (B6)
// Bezpieczna obsługa haseł Profilu Zaufanego przez Supabase Vault.
//
// Akcje (POST):
//   - action='save': { client_id, case_id, login, password, notes? } → tworzy vault secret + insert row
//   - action='read': { credential_id } → odszyfrowuje password z vault + loguje access
//   - action='delete': { credential_id } → usuwa row + vault secret + loguje access
//
// Bezpieczeństwo:
//   - Tylko admin/partner/owner może wywołać (sprawdza JWT user → gmp_staff.role)
//   - Każdy read/write zapisuje wpis w gmp_credentials_access_log (kto, co, kiedy)
//   - Nigdy nie loguje plaintext password ani secret_id w response (poza save->id który jest UUID)

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ROLES = ["admin", "partner", "owner"];

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return resp(405, { error: "POST only" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return resp(401, { error: "Unauthorized" });

    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1) Verify JWT (user) — kim jesteś
    const userClient = createClient(SUPA_URL, ANON, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return resp(401, { error: "Invalid token" });

    // 2) Sprawdź role staff
    const { data: staff } = await userClient.from("gmp_staff")
        .select("id, role").eq("user_id", user.id).maybeSingle();
    if (!staff || !ALLOWED_ROLES.includes(staff.role)) {
        return resp(403, { error: `Forbidden — wymagana rola: ${ALLOWED_ROLES.join("|")}` });
    }

    // 3) Service role client (do vault + access_log)
    const svcClient = createClient(SUPA_URL, SVC, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null;
    const ua = req.headers.get("user-agent") || null;

    try {
        switch (action) {
            case "save": return await handleSave(svcClient, body, staff.id, ip, ua);
            case "read": return await handleRead(svcClient, body, staff.id, ip, ua);
            case "delete": return await handleDelete(svcClient, body, staff.id, ip, ua);
            default: return resp(400, { error: "action: 'save' | 'read' | 'delete'" });
        }
    } catch (e) {
        console.error("[pz-credentials]", e);
        return resp(500, { error: (e as Error).message });
    }
});

async function handleSave(svc: any, body: any, staffId: string, ip: string | null, ua: string | null) {
    const { client_id, case_id, login, password, notes } = body;
    if (!client_id || !login || !password) {
        return resp(400, { error: "client_id, login, password required" });
    }

    // 1) Utwórz vault secret z hasłem (nazwa: pz_<client_id>_<timestamp>)
    const secretName = `pz_${client_id}_${Date.now()}`;
    const { data: secretData, error: secretErr } = await svc.rpc("create_secret", {
        new_secret: password,
        new_name: secretName,
    });
    // create_secret może być w schema vault, próbujemy alternatywnie
    let secretId = secretData;
    if (secretErr) {
        // Fallback: bezpośredni INSERT do vault.secrets (wymaga service_role w Supabase)
        const { data: alt, error: altErr } = await svc
            .from("secrets").insert({ secret: password, name: secretName }).select("id").single();
        if (altErr) {
            // Drugi fallback: wywołanie SQL bezpośrednie przez rpc na utworzonej funkcji
            return resp(500, { error: "Vault save failed: " + (secretErr.message || altErr?.message) });
        }
        secretId = alt.id;
    }

    // 2) Insert row do gmp_trusted_profile_credentials
    const { data: cred, error: credErr } = await svc.from("gmp_trusted_profile_credentials")
        .insert({
            client_id,
            case_id: case_id || null,
            trusted_profile_login: login,
            password_secret_id: secretId,
            notes: notes || null,
        })
        .select("id").single();
    if (credErr) return resp(500, { error: "Insert failed: " + credErr.message });

    // 3) Log access
    await svc.from("gmp_credentials_access_log").insert({
        credential_id: cred.id,
        accessed_by: staffId,
        action: "create",
        ip_address: ip,
        user_agent: ua,
    });

    return resp(200, { ok: true, credential_id: cred.id });
}

async function handleRead(svc: any, body: any, staffId: string, ip: string | null, ua: string | null) {
    const { credential_id } = body;
    if (!credential_id) return resp(400, { error: "credential_id required" });

    // 1) Pobierz row
    const { data: cred, error: credErr } = await svc.from("gmp_trusted_profile_credentials")
        .select("id, trusted_profile_login, password_secret_id, trusted_profile_password, notes")
        .eq("id", credential_id).maybeSingle();
    if (credErr || !cred) return resp(404, { error: "Credential not found" });

    // 2) Decrypt password z vault
    let password = null;
    if (cred.password_secret_id) {
        const { data: dec, error: decErr } = await svc.from("decrypted_secrets")
            .select("decrypted_secret").eq("id", cred.password_secret_id).maybeSingle();
        if (decErr || !dec) {
            // Próbuj alt query do vault.decrypted_secrets jako schema
            const { data: alt } = await svc.rpc("vault_decrypt", { secret_id: cred.password_secret_id }).catch(() => ({ data: null }));
            password = alt;
            if (!password) return resp(500, { error: "Vault decrypt failed" });
        } else {
            password = dec.decrypted_secret;
        }
    } else if (cred.trusted_profile_password) {
        // Legacy fallback
        password = cred.trusted_profile_password;
    } else {
        return resp(404, { error: "No password stored" });
    }

    // 3) Update last_accessed + log access
    await svc.from("gmp_trusted_profile_credentials")
        .update({ last_accessed_at: new Date().toISOString(), last_accessed_by: staffId })
        .eq("id", credential_id);
    await svc.from("gmp_credentials_access_log").insert({
        credential_id,
        accessed_by: staffId,
        action: "read",
        ip_address: ip,
        user_agent: ua,
    });

    return resp(200, {
        ok: true,
        login: cred.trusted_profile_login,
        password,
        notes: cred.notes,
    });
}

async function handleDelete(svc: any, body: any, staffId: string, ip: string | null, ua: string | null) {
    const { credential_id } = body;
    if (!credential_id) return resp(400, { error: "credential_id required" });

    const { data: cred } = await svc.from("gmp_trusted_profile_credentials")
        .select("password_secret_id").eq("id", credential_id).maybeSingle();

    // Log first (before delete)
    await svc.from("gmp_credentials_access_log").insert({
        credential_id,
        accessed_by: staffId,
        action: "delete",
        ip_address: ip,
        user_agent: ua,
    });

    // Delete row
    const { error } = await svc.from("gmp_trusted_profile_credentials").delete().eq("id", credential_id);
    if (error) return resp(500, { error: error.message });

    // Try delete vault secret (best-effort)
    if (cred?.password_secret_id) {
        await svc.from("secrets").delete().eq("id", cred.password_secret_id).catch(() => {});
    }

    return resp(200, { ok: true });
}

function resp(status: number, body: any) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
