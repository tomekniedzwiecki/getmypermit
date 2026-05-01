// MAJ-NEW-4 fix 2026-05-02: /health endpoint dla uptime monitoringu.
// Zwraca: { status: "ok"|"degraded", db: <bool>, version: <git sha>, timestamp }
// Bez auth - public, ale tylko z whitelistą informacji.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const APP_VERSION = Deno.env.get('APP_VERSION') || 'unknown'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const startedAt = Date.now()
  let dbOk = false
  let dbLatencyMs: number | null = null
  let dbError: string | null = null

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const t0 = Date.now()
    // Lekkie zapytanie sprawdzające że PostgREST + DB odpowiadają
    const { error } = await supabase.from('gmp_lead_rate_limit').select('id', { count: 'exact', head: true }).limit(1)
    dbLatencyMs = Date.now() - t0
    if (error) {
      dbError = error.message?.slice(0, 80) || 'unknown'
    } else {
      dbOk = true
    }
  } catch (e) {
    dbError = e instanceof Error ? e.message.slice(0, 80) : 'unknown'
  }

  const status = dbOk ? 'ok' : 'degraded'
  const body = {
    status,
    db: dbOk,
    db_latency_ms: dbLatencyMs,
    db_error: dbError,
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
  }
  return new Response(JSON.stringify(body), {
    status: dbOk ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
})
