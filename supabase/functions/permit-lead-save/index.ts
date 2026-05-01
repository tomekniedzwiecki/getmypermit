// Edge function: permit-lead-save
// Cel: zapisz leada do permit_leads. Jezeli DB nie odpowiada (PGRST002, 503),
// serializuj payload do bucketa lead-fallback. Cron replay potem przepisze
// z bucketa do permit_leads.
//
// BLK-7 fix 2026-05-02: whitelist pol, walidacja phone/email regex, rate-limit IP (5/15min),
// CRIT-CR-1: brak mass-assignment lead_score/status; CRIT-CR-2: walidacja minimum.
// Opcjonalny Cloudflare Turnstile: jesli env TURNSTILE_SECRET_KEY ustawione, wymaga `cf_turnstile_token` w body.

import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Whitelist (CRIT-CR-1): tylko te pola moga byc nadpisane przez klienta.
// Backend NIGDY nie kopiuje lead_score/status/converted_*/assigned_to z body.
const ALLOWED_FIELDS: ReadonlyArray<string> = [
  'name', 'first_name', 'last_name',
  'email', 'phone',
  'details', 'situation', 'location', 'intent',
  'waiting_time', 'rejection_timing', 'permit_type',
  'lead_type', 'language',
  'user_agent', 'referrer',
  'utm_source', 'utm_medium', 'utm_campaign',
  'is_partial', 'form_session_id', 'last_step_reached',
] as const

const RATE_LIMIT_WINDOW_MIN = 15
const RATE_LIMIT_MAX = 5
const ENDPOINT_NAME = 'permit-lead-save'

const TURNSTILE_SECRET = Deno.env.get('TURNSTILE_SECRET_KEY') || ''

// CRIT-CR-2: walidatory regex
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9][0-9 ()\-]{8,19}$/

interface LeadInput {
  name?: string; first_name?: string; last_name?: string
  email?: string; phone?: string
  details?: string; situation?: string; location?: string; intent?: string
  waiting_time?: string; rejection_timing?: string; permit_type?: string
  lead_type?: string; language?: string
  user_agent?: string; referrer?: string
  utm_source?: string; utm_medium?: string; utm_campaign?: string
  is_partial?: boolean; form_session_id?: string; last_step_reached?: string
  is_lead_magnet?: boolean
  cf_turnstile_token?: string
}

function clientIP(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

function pickAllowed(body: any): Record<string, any> {
  const out: Record<string, any> = {}
  for (const k of ALLOWED_FIELDS) {
    if (body[k] !== undefined) out[k] = body[k]
  }
  return out
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true
  if (!token) return false
  try {
    const form = new FormData()
    form.append('secret', TURNSTILE_SECRET)
    form.append('response', token)
    form.append('remoteip', ip)
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    })
    const j = await r.json()
    return j?.success === true
  } catch {
    return false
  }
}

async function saveToFallbackStorage(
  supabase: any,
  data: Record<string, any>,
  reason: string,
  originalError: unknown
): Promise<{ saved: boolean; key?: string; error?: string }> {
  try {
    const email = (data.email || 'unknown').toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '_')
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const key = `pending/${ts}__${email}.json`

    const payload = {
      saved_at: new Date().toISOString(),
      reason,
      original_error: originalError instanceof Error ? originalError.message : String(originalError),
      lead_data: data,
    }

    const { error: uploadError } = await supabase.storage
      .from('lead-fallback')
      .upload(key, JSON.stringify(payload, null, 2), {
        contentType: 'application/json',
        upsert: false,
      })

    if (uploadError) {
      console.error('Fallback storage upload failed:', uploadError)
      return { saved: false, error: uploadError.message }
    }

    return { saved: true, key }
  } catch (err) {
    return { saved: false, error: err instanceof Error ? err.message : String(err) }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  let leadInput: LeadInput | null = null
  let cleanData: Record<string, any> = {}

  try {
    leadInput = await req.json()
    const data = leadInput!

    // === CRIT-CR-2: minimalna walidacja ===
    // Wymagamy phone, email LUB form_session_id (partial save), ale jezeli phone/email
    // jest podany, MUSI byc poprawnego formatu (wczesniej dowolny smiec przechodzil).
    if (!data.email && !data.phone && !data.form_session_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email, phone lub form_session_id jest wymagany' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    if (data.email && !EMAIL_RE.test(String(data.email).trim())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nieprawidlowy format email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    if (data.phone && !PHONE_RE.test(String(data.phone).trim())) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nieprawidlowy format telefonu' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // === BLK-7: Cloudflare Turnstile (jesli skonfigurowany) ===
    // Pomijamy gdy partial save (formularz nie pokazal jeszcze captcha).
    if (TURNSTILE_SECRET && !data.is_partial) {
      const ok = await verifyTurnstile(data.cf_turnstile_token || '', clientIP(req))
      if (!ok) {
        return new Response(
          JSON.stringify({ success: false, error: 'CAPTCHA verification failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }
    }

    // === BLK-7: rate-limit IP (5 / 15 min) ===
    const ip = clientIP(req)
    const sinceIso = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString()
    const { count, error: rlErr } = await supabase
      .from('gmp_lead_rate_limit')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('endpoint', ENDPOINT_NAME)
      .gte('created_at', sinceIso)

    if (!rlErr && (count ?? 0) >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many requests', retry_after_seconds: RATE_LIMIT_WINDOW_MIN * 60 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(RATE_LIMIT_WINDOW_MIN * 60) }, status: 429 }
      )
    }

    // Loguj request po rate-check (sukces albo blad inserta - i tak zaszedl ruch)
    await supabase.from('gmp_lead_rate_limit').insert({ ip_address: ip, endpoint: ENDPOINT_NAME })

    // === CRIT-CR-1: whitelist pol (zero mass-assignment) ===
    cleanData = pickAllowed(data)
    if (data.email) cleanData.email = String(data.email).trim().toLowerCase()
    if (data.phone) cleanData.phone = String(data.phone).trim()

    // === UPSERT po form_session_id ===
    let leadId: string | null = null
    let upsertMode: 'insert' | 'update' = 'insert'

    if (cleanData.form_session_id) {
      const { data: existing, error: selectError } = await supabase
        .from('permit_leads')
        .select('id, is_partial')
        .eq('form_session_id', cleanData.form_session_id)
        .maybeSingle()

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError
      }

      if (existing) {
        const updatePayload: Record<string, any> = { ...cleanData }
        if (existing.is_partial === false && cleanData.is_partial === true) {
          return new Response(
            JSON.stringify({ success: true, lead_id: existing.id, mode: 'noop_already_full' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        }
        delete updatePayload.form_session_id // immutable klucz dedupu

        const { error: updateError } = await supabase
          .from('permit_leads')
          .update(updatePayload)
          .eq('id', existing.id)

        if (updateError) throw updateError

        leadId = existing.id
        upsertMode = 'update'
      }
    }

    if (!leadId) {
      const { data: newLead, error: insertError } = await supabase
        .from('permit_leads')
        .insert([cleanData])
        .select('id')
        .single()

      if (insertError) throw insertError
      leadId = newLead.id
    }

    // BLK-9 fix 2026-05-02: lead confirmation email (tylko gdy nie partial i mamy email).
    // Niepowodzenie wysylki NIE blokuje response (best-effort, async).
    if (!cleanData.is_partial && cleanData.email && upsertMode === 'insert') {
      try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
        const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        // fire-and-forget - nie await
        fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: cleanData.email,
            template: 'lead_confirmation',
            vars: { name: cleanData.first_name || cleanData.name },
          }),
        }).catch(e => console.error('send-email best-effort fail:', e))
      } catch (e) {
        console.error('send-email kickoff error:', e)
      }
    }

    return new Response(
      JSON.stringify({ success: true, lead_id: leadId, mode: upsertMode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Permit lead save error:', error)

    const errMsg = error instanceof Error
      ? error.message
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as any).message)
        : JSON.stringify(error)
    const errCode = (error as any)?.code || ''
    const isDbDown =
      errCode === 'PGRST002' ||
      errCode === 'PGRST001' ||
      errCode === '57P03' ||
      errMsg.includes('schema cache') ||
      errMsg.includes('fetch failed') ||
      errMsg.includes('connection') ||
      errMsg.includes('timeout') ||
      errMsg.includes('Service Unavailable')

    if (cleanData && (cleanData.email || cleanData.phone)) {
      const reason = isDbDown ? 'db_unavailable' : 'db_error'
      const fallback = await saveToFallbackStorage(supabase, cleanData, reason, error)

      if (fallback.saved) {
        return new Response(
          JSON.stringify({
            success: true,
            fallback: true,
            lead_id: null,
            message: 'Lead saved to fallback storage (DB temporarily unavailable)',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      return new Response(
        JSON.stringify({
          success: false,
          fallback_failed: true,
          error: errMsg,
          fallback_error: fallback.error,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
