// Edge function: pelne usuniecie pracownika - kasuje auth.users + gmp_staff.
//
// Tylko admin/owner moze wywolac. Operacja jest NIEODWRACALNA.
// Caller NIE moze usunac samego siebie.
//
// Invoke: POST /functions/v1/delete-staff
// Headers: Authorization: Bearer <user_jwt>
// Body: { staff_id: uuid }
// Response: { ok, deleted_user_id, deleted_email }

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

    let body: { staff_id?: string };
    try {
        body = await req.json();
    } catch {
        return json({ error: 'Invalid JSON body' }, 400);
    }
    const staffId = body.staff_id;
    if (!staffId) return json({ error: 'staff_id wymagany' }, 400);

    // Zabezpieczenie: nie pozwol skasowac samego siebie
    if (staffId === callerStaff.id) {
        return json({ error: 'Nie mozesz usunac wlasnego konta' }, 400);
    }

    // Pobierz dane pracownika
    const { data: staff, error: fetchErr } = await admin.from('gmp_staff')
        .select('id, full_name, email, user_id, role')
        .eq('id', staffId)
        .maybeSingle();
    if (fetchErr || !staff) {
        return json({ error: `Nie znaleziono pracownika: ${fetchErr?.message || 'brak'}` }, 404);
    }

    // 1. Usun z auth.users (jesli powiazane)
    let authDeleteResult: string = 'no_auth_user';
    if (staff.user_id) {
        const { error: authErr } = await admin.auth.admin.deleteUser(staff.user_id);
        if (authErr) {
            // Jezeli user juz nie istnieje w auth - kontynuuj
            if (!authErr.message?.toLowerCase().includes('not found')) {
                return json({ error: `Blad usuwania z auth: ${authErr.message}` }, 500);
            }
            authDeleteResult = 'auth_user_already_gone';
        } else {
            authDeleteResult = 'auth_user_deleted';
        }
    }

    // 2. Usun z gmp_staff
    const { error: deleteErr } = await admin.from('gmp_staff').delete().eq('id', staffId);
    if (deleteErr) {
        return json({
            ok: false,
            error: `Auth usuniety (${authDeleteResult}), ale blad usuwania gmp_staff: ${deleteErr.message}`,
        }, 500);
    }

    // 3. Audit log
    await admin.from('gmp_audit_log').insert({
        staff_id: callerStaff.id,
        action: 'staff_hard_delete',
        entity_type: 'staff',
        entity_id: staffId,
        entity_label: `${staff.full_name} <${staff.email || '-'}>`,
        severity: 'critical',
        metadata: {
            role: staff.role,
            auth_result: authDeleteResult,
            had_user_id: !!staff.user_id,
        },
    });

    return json({
        ok: true,
        deleted_user_id: staff.user_id,
        deleted_email: staff.email,
        auth_result: authDeleteResult,
    });
});
