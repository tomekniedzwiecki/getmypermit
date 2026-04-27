// Cron replay: czyta pliki z lead-fallback/pending/, probuje je zapisac
// do permit_leads. Po sukcesie przenosi do lead-fallback/processed/.
//
// Wywolanie: cron co 5 min (pg_cron + http extension)
// Reczne: curl ${URL}/functions/v1/lead-fallback-replay -H "Authorization: Bearer ${SERVICE_KEY}"

import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FallbackPayload {
  saved_at: string
  reason: string
  original_error: string
  lead_data: Record<string, any>
}

interface ReplayResult {
  key: string
  status: 'saved' | 'failed' | 'skipped'
  lead_id?: string
  error?: string
}

async function processFile(supabase: any, key: string): Promise<ReplayResult> {
  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from('lead-fallback')
      .download(key)

    if (downloadError || !blob) {
      return { key, status: 'failed', error: downloadError?.message || 'no blob' }
    }

    const text = await blob.text()
    const payload: FallbackPayload = JSON.parse(text)
    const data = payload.lead_data

    if (!data?.email && !data?.phone) {
      return { key, status: 'skipped', error: 'no email or phone in payload' }
    }

    // Sklonuj dane i dodaj notatke o recovery
    const insertData = { ...data }
    delete insertData.is_lead_magnet

    const recoveryNote = `[recovered from fallback ${payload.saved_at}, reason: ${payload.reason}]`
    insertData.details = insertData.details
      ? `${insertData.details}\n\n${recoveryNote}`
      : recoveryNote

    const { data: newLead, error: insertError } = await supabase
      .from('permit_leads')
      .insert([insertData])
      .select('id')
      .single()

    if (insertError) {
      return { key, status: 'failed', error: insertError.message }
    }

    // Move do processed/
    const newKey = key.replace(/^pending\//, 'processed/')
    const { error: moveError } = await supabase.storage
      .from('lead-fallback')
      .move(key, newKey)
    if (moveError) console.warn(`Move to processed failed for ${key}: ${moveError.message}`)

    return { key, status: 'saved', lead_id: newLead.id }
  } catch (err) {
    return { key, status: 'failed', error: err instanceof Error ? err.message : String(err) }
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

  try {
    const { data: files, error: listError } = await supabase.storage
      .from('lead-fallback')
      .list('pending', { limit: 100, sortBy: { column: 'created_at', order: 'asc' } })

    if (listError) {
      return new Response(
        JSON.stringify({ success: false, error: listError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const filesToProcess = (files || []).filter(f => f.name && f.name.endsWith('.json'))

    if (filesToProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No pending files' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: ReplayResult[] = []
    for (const file of filesToProcess) {
      const fullKey = `pending/${file.name}`
      const result = await processFile(supabase, fullKey)
      results.push(result)
    }

    const summary = {
      total: results.length,
      saved: results.filter(r => r.status === 'saved').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
    }

    return new Response(
      JSON.stringify({ success: true, summary, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
