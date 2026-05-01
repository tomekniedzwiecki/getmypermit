// BLK-9 fix 2026-05-02: send-email via Resend API.
// Centralna funkcja do wysylki transakcyjnej. Inne edge fns moga ja wywolywac:
//  await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
//    method: 'POST', headers: { Authorization: `Bearer ${SERVICE_ROLE}` },
//    body: JSON.stringify({ to, subject, html, template, vars })
//  })
//
// Wymaga env: RESEND_API_KEY, RESEND_FROM (np. "GetMyPermit <noreply@getmypermit.pl>")
// Templaty: lead_confirmation, appointment_confirmation, password_reset, intake_invitation

import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'GetMyPermit <noreply@getmypermit.pl>'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface SendInput {
  to: string | string[]
  subject?: string
  html?: string
  text?: string
  template?: 'lead_confirmation' | 'appointment_confirmation' | 'password_reset' | 'intake_invitation'
  vars?: Record<string, any>
  reply_to?: string
  cc?: string | string[]
}

function escapeHtml(s: any): string {
  if (s == null) return ''
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c))
}

function templateLeadConfirmation(vars: Record<string, any>): { subject: string; html: string } {
  const name = escapeHtml(vars.name || 'Cześć')
  return {
    subject: 'Otrzymaliśmy Twoje zgłoszenie — GetMyPermit',
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:auto;padding:20px">
      <h2 style="color:#0ea5e9">Dziękujemy, ${name}!</h2>
      <p>Otrzymaliśmy Twoje zgłoszenie i skontaktujemy się z Tobą w ciągu 24 godzin (w dni robocze).</p>
      <p>Zespół adwokatów GetMyPermit pomoże Ci uporządkować sprawę pobytu i pracy w Polsce.</p>
      <p style="margin-top:30px;color:#64748b;font-size:13px">Stachurski i Grzybowska Adwokacka Spółka Partnerska, Wrocław</p>
    </body></html>`,
  }
}

function templateAppointmentConfirmation(vars: Record<string, any>): { subject: string; html: string } {
  const name = escapeHtml(vars.client_name || 'Cześć')
  const date = escapeHtml(vars.scheduled_date || '')
  const time = escapeHtml(vars.scheduled_time || '')
  const lawyer = escapeHtml(vars.lawyer_name || 'naszym prawnikiem')
  const office = vars.office_address ? `<p><strong>Adres:</strong> ${escapeHtml(vars.office_address)}</p>` : ''
  return {
    subject: `Potwierdzenie spotkania ${date} ${time}`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:auto;padding:20px">
      <h2 style="color:#0ea5e9">Spotkanie potwierdzone, ${name}</h2>
      <p><strong>Termin:</strong> ${date} o godz. ${time}</p>
      <p><strong>Z kim:</strong> ${lawyer}</p>
      ${office}
      <p>Jeśli musisz przełożyć lub anulować, skontaktuj się z nami możliwie najwcześniej.</p>
    </body></html>`,
  }
}

function templatePasswordReset(vars: Record<string, any>): { subject: string; html: string } {
  const link = escapeHtml(vars.reset_link || '#')
  return {
    subject: 'Reset hasła — GetMyPermit',
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:auto;padding:20px">
      <h2 style="color:#0ea5e9">Reset hasła</h2>
      <p>Kliknij poniższy link aby ustawić nowe hasło. Link wygasa za 1 godzinę.</p>
      <p style="margin:20px 0"><a href="${link}" style="background:#0ea5e9;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Ustaw nowe hasło</a></p>
      <p style="color:#64748b;font-size:12px">Jeśli to nie Ty prosiłeś o reset, możesz zignorować tę wiadomość.</p>
    </body></html>`,
  }
}

function templateIntakeInvitation(vars: Record<string, any>): { subject: string; html: string } {
  const name = escapeHtml(vars.client_name || 'Cześć')
  const link = escapeHtml(vars.intake_link || '#')
  return {
    subject: 'Wypełnij ankietę przed spotkaniem — GetMyPermit',
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#111;max-width:560px;margin:auto;padding:20px">
      <h2 style="color:#0ea5e9">Cześć ${name}</h2>
      <p>Aby przyspieszyć obsługę Twojej sprawy, prosimy o wypełnienie krótkiej ankiety. Zajmie ok. 5-10 minut.</p>
      <p style="margin:20px 0"><a href="${link}" style="background:#0ea5e9;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Wypełnij ankietę</a></p>
      <p>Link jest jednorazowy i ważny przez 14 dni.</p>
    </body></html>`,
  }
}

function buildFromTemplate(name: string, vars: Record<string, any>): { subject: string; html: string } | null {
  switch (name) {
    case 'lead_confirmation': return templateLeadConfirmation(vars)
    case 'appointment_confirmation': return templateAppointmentConfirmation(vars)
    case 'password_reset': return templatePasswordReset(vars)
    case 'intake_invitation': return templateIntakeInvitation(vars)
    default: return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: 'RESEND_API_KEY env not set' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Auth: tylko service_role albo authenticated staff moze wywolac.
  // Sprawdzamy przez JWT role claim (niezalezne od konkretnej rotacji klucza).
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return new Response(JSON.stringify({ success: false, error: 'Auth required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  let isServiceRole = false
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      isServiceRole = payload?.role === 'service_role'
    }
  } catch (_) {}
  if (!isServiceRole) {
    // Sprawdz czy token to authenticated user JWT (staff)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  }

  try {
    const body: SendInput = await req.json()

    let { subject, html, text } = body
    if (body.template) {
      const t = buildFromTemplate(body.template, body.vars || {})
      if (!t) {
        return new Response(JSON.stringify({ success: false, error: 'Unknown template' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      subject = subject || t.subject
      html = html || t.html
    }

    if (!body.to || !subject || (!html && !text)) {
      return new Response(JSON.stringify({ success: false, error: 'Missing to/subject/html' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const resendBody: Record<string, any> = {
      from: RESEND_FROM,
      to: Array.isArray(body.to) ? body.to : [body.to],
      subject,
    }
    if (html) resendBody.html = html
    if (text) resendBody.text = text
    if (body.reply_to) resendBody.reply_to = body.reply_to
    if (body.cc) resendBody.cc = Array.isArray(body.cc) ? body.cc : [body.cc]

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendBody),
    })
    const result = await r.json()
    if (!r.ok) {
      return new Response(JSON.stringify({ success: false, error: 'Resend API error', detail: result }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
