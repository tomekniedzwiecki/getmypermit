// Edge function: zaproszenie pracownika - generuje link do skopiowania
// (zamiast wysylac email, ktory nie zawsze dochodzi).
//
// Tylko admin/owner moze wywolac. Tworzy (lub znajduje) konto auth, powiazuje
// z gmp_staff, generuje link do ustawienia hasla i zwraca go w response.
// Admin kopiuje link i przekazuje go pracownikowi (Slack/Telegram/WhatsApp).
//
// Invoke: POST /functions/v1/invite-staff
// Headers: Authorization: Bearer <user_jwt>
// Body: { email: string, staff_id?: uuid, full_name?: string, role?: string }
// Response: { ok, user_id, email, action_link, existed }

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Missing auth token' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user) return json({ error: 'Invalid token' }, 401);
    const caller = userRes.user;

    const { data: callerStaff } = await admin.from('gmp_staff').select('id, role').eq('user_id', caller.id).maybeSingle();
    if (!callerStaff || !['owner', 'admin'].includes(callerStaff.role)) {
        return json({ error: 'Brak uprawnien: wymagana rola admin lub owner' }, 403);
    }

    let body: { email?: string; staff_id?: string; full_name?: string; role?: string };
    try {
        body = await req.json();
    } catch {
        return json({ error: 'Invalid JSON body' }, 400);
    }
    const email = body.email?.trim().toLowerCase();
    if (!email) return json({ error: 'email wymagany' }, 400);
    const role = body.role || 'staff';
    const fullName = body.full_name || email.split('@')[0];

    // 1. Znajdz lub utworz konto auth
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = existing?.users?.find((u) => u.email?.toLowerCase() === email);
    let userId: string;
    let existed = false;

    if (authUser) {
        userId = authUser.id;
        existed = true;
    } else {
        const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { role, full_name: fullName },
        });
        if (createErr || !newUser?.user) {
            return json({ error: `Blad tworzenia konta: ${createErr?.message || 'unknown'}` }, 500);
        }
        userId = newUser.user.id;
    }

    // 2. Powiaz z gmp_staff
    if (body.staff_id) {
        await admin.from('gmp_staff').update({ user_id: userId, email, role }).eq('id', body.staff_id);
    } else {
        const { data: match } = await admin.from('gmp_staff')
            .select('id')
            .or(`email.eq.${email},full_name.ilike.${fullName}`)
            .maybeSingle();
        if (match) {
            await admin.from('gmp_staff').update({ user_id: userId, email, role }).eq('id', match.id);
        } else {
            await admin.from('gmp_staff').insert({ user_id: userId, email, full_name: fullName, role });
        }
    }

    // 3. Wygeneruj link do ustawienia hasla (typ 'recovery' dziala dla nowych i istniejacych)
    const origin = req.headers.get('origin') || 'https://crm.getmypermit.pl';
    const redirectTo = `${origin}/reset-password.html`;

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
    });

    if (linkErr || !linkData) {
        return json({
            ok: false,
            user_id: userId,
            existed,
            error: `Konto utworzone, ale nie udalo sie wygenerowac linku: ${linkErr?.message || 'unknown'}`,
        }, 500);
    }

    const actionLink = (linkData as any)?.properties?.action_link
        || (linkData as any)?.action_link
        || null;

    // Audit
    await admin.from('gmp_audit_log').insert({
        staff_id: callerStaff.id,
        action: existed ? 'staff_relink' : 'staff_invite',
        entity_type: 'staff',
        entity_id: body.staff_id || null,
        entity_label: `${fullName} <${email}>`,
        severity: 'info',
        metadata: { role, existed },
    });

    return json({
        ok: true,
        user_id: userId,
        email,
        existed,
        action_link: actionLink,
    });
});
