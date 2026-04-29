// Edge function: permit-lead-save
// Cel: zapisz leada do permit_leads. Jezeli DB nie odpowiada (PGRST002, 503),
// serializuj payload do bucketa lead-fallback. Cron replay potem przepisze
// z bucketa do permit_leads.
//
// Wywolanie z frontendu (index.html, saveLeadToSupabase):
// fetch(`${SUPABASE_URL}/functions/v1/permit-lead-save`, {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify(leadData)
// })

import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface LeadData {
  name?: string
  email?: string
  phone?: string
  details?: string
  situation?: string
  location?: string
  intent?: string
  waiting_time?: string
  rejection_timing?: string
  permit_type?: string
  lead_score?: number
  lead_type?: string
  language?: string
  user_agent?: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  status?: string
  // Lead magnet path
  is_lead_magnet?: boolean
  // Partial-save (soft-save po kazdym kroku formularza)
  is_partial?: boolean
  form_session_id?: string
  last_step_reached?: string
}

async function saveToFallbackStorage(
  supabase: any,
  data: LeadData,
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

    console.log(`Lead saved to fallback storage: ${key}`)
    return { saved: true, key }
  } catch (err) {
    console.error('Fallback storage threw:', err)
    return { saved: false, error: err instanceof Error ? err.message : String(err) }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let leadData: LeadData | null = null

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  )

  try {
    leadData = await req.json()
    const data = leadData!

    // Wymagamy: phone, email, ALBO form_session_id (dla partial saves PRZED phone step)
    if (!data.email && !data.phone && !data.form_session_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email, phone lub form_session_id jest wymagany' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Sanitizuj payload
    const insertData: Record<string, any> = { ...data }
    if (data.is_lead_magnet) {
      delete insertData.is_lead_magnet
    }

    // === UPSERT po form_session_id ===
    // Jezeli payload ma form_session_id, sprobuj znalezc istniejacy rekord
    // (z partial save z wczesniejszego kroku) i UPDATE go zamiast INSERT.
    // Bez tego dla 7 krokow formularza powstaje 7 osobnych rekordow.
    let leadId: string | null = null
    let upsertMode: 'insert' | 'update' = 'insert'

    if (data.form_session_id) {
      const { data: existing, error: selectError } = await supabase
        .from('permit_leads')
        .select('id, is_partial')
        .eq('form_session_id', data.form_session_id)
        .maybeSingle()

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 = "no rows" - to OK. Inne bledy throw.
        throw selectError
      }

      if (existing) {
        // Update istniejacy rekord
        // Guard: nie pozwol downgradeowac is_partial=false → true (ochrona finalnego rekordu)
        const updatePayload: Record<string, any> = { ...insertData }
        if (existing.is_partial === false && insertData.is_partial === true) {
          // Już mamy pełny lead — partial save od tego samego session ID jest no-op.
          // Np. user kliknął submit → full save, potem cofnął się i klikał Continue → partial.
          return new Response(
            JSON.stringify({ success: true, lead_id: existing.id, mode: 'noop_already_full' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        }
        // Usuwamy form_session_id z payload (immutable klucz dedupu)
        delete updatePayload.form_session_id

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
      // INSERT nowy rekord
      const { data: newLead, error: insertError } = await supabase
        .from('permit_leads')
        .insert([insertData])
        .select('id')
        .single()

      if (insertError) throw insertError
      leadId = newLead.id
    }

    return new Response(
      JSON.stringify({ success: true, lead_id: leadId, mode: upsertMode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Permit lead save error:', error)

    const errMsg = error instanceof Error ? error.message : String(error)
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

    if (leadData && (leadData.email || leadData.phone)) {
      const reason = isDbDown ? 'db_unavailable' : 'db_error'
      const fallback = await saveToFallbackStorage(supabase, leadData, reason, error)

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
