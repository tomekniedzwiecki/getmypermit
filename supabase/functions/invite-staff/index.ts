// Edge function: zaproszenie pracownika do CRM z poziomu UI (req Pawel pkt 5)
// Tylko admin/owner moze wywolac. Tworzy konto w auth + powiazanie z gmp_staff + wysyla link resetu hasla.
//
// Invoke: POST /functions/v1/invite-staff
// Headers: Authorization: Bearer <user_jwt>   (wymagane — sprawdzamy czy to admin/owner)
// Body: { email: string, staff_id?: uuid, full_name?: string, role?: string }

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

    // Autoryzacja: token uzytkownika z naglowka
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Missing auth token' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Sprawdz tozsamosc wolajacego
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes?.user) return json({ error: 'Invalid token' }, 401);
    const caller = userRes.user;

    // Caller musi byc adminem lub ownerem
    const { data: callerStaff } = await admin.from('gmp_staff').select('role').eq('user_id', caller.id).maybeSingle();
    if (!callerStaff || !['owner', 'admin'].includes(callerStaff.role)) {
        return json({ error: 'Brak uprawnien: wymagana rola admin lub owner' }, 403);
    }

    // Parsuj body
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

    // 1. Sprawdz czy auth user istnieje
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const authUser = existing?.users?.find((u) => u.email?.toLowerCase() === email);
    let userId: string;

    if (authUser) {
        userId = authUser.id;
    } else {
        // 2. Invite (utworz z email_confirm + user_metadata)
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

    // 3. Powiazanie z gmp_staff
    if (body.staff_id) {
        await admin.from('gmp_staff').update({ user_id: userId, email, role }).eq('id', body.staff_id);
    } else {
        // Sprobuj znalezc po emailu lub imieniu
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

    // 4. Wyslij password reset (user kliknie link i ustawi haslo)
    const redirectTo = req.headers.get('origin') + '/reset-password.html';
    const { error: resetErr } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
    });
    if (resetErr) {
        // Nie przerywamy — konto utworzone, tylko email sie nie wyslal
        return json({
            ok: true,
            user_id: userId,
            warning: `Konto utworzone, ale nie udalo sie wyslac emaila: ${resetErr.message}. Uzytkownik moze uzyc 'Nie pamietam hasla' na stronie logowania.`,
        });
    }

    // Audit
    await admin.from('gmp_audit_log').insert({
        staff_id: callerStaff?.id || null,
        action: 'staff_invite',
        entity_type: 'staff',
        entity_id: body.staff_id || null,
        entity_label: `${fullName} <${email}>`,
        severity: 'info',
        metadata: { role },
    });

    return json({ ok: true, user_id: userId, email });
});
