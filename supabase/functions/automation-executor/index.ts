// automation-executor — Etap VII
// Iteruje pending executions, wykonuje pierwszy pending step, zapisuje log.
// Wywoływana ręcznie LUB z pg_cron co 2 min (via supabase.functions.invoke z service_role).
//
// Sygnatura: GET / POST (bez body) — brak parametrów
// Response: { processed, succeeded, failed, errors[] }

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface Execution {
    id: string;
    flow_id: string;
    case_id: string | null;
    trigger_context: Record<string, unknown>;
    next_step_order: number;
    log: unknown[];
}

interface Step {
    id: string;
    step_order: number;
    action_type: string;
    action_params: Record<string, unknown>;
    delay_seconds: number;
}

const MAX_BATCH = 25;

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    // Service role — operuje z pełnym dostępem (nie wymaga user JWT)
    const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
    const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPA_URL, SVC, { auth: { persistSession: false } });

    const startedAt = Date.now();
    const errors: string[] = [];
    let processed = 0, succeeded = 0, failed = 0;

    // Pobierz pending executions które są ready (next_run_at <= now)
    const { data: pending, error: fetchErr } = await supabase
        .from("gmp_automation_executions")
        .select("id, flow_id, case_id, trigger_context, next_step_order, log")
        .eq("status", "pending")
        .lte("next_run_at", new Date().toISOString())
        .order("triggered_at")
        .limit(MAX_BATCH);

    if (fetchErr) {
        return new Response(JSON.stringify({ error: fetchErr.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!pending || pending.length === 0) {
        return new Response(JSON.stringify({ ok: true, processed: 0, message: "no pending executions" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    for (const exec of pending as Execution[]) {
        processed++;
        try {
            // Mark as running
            await supabase.from("gmp_automation_executions")
                .update({ status: "running" })
                .eq("id", exec.id);

            // Pobierz pierwszy pending step
            const { data: stepData } = await supabase
                .from("gmp_automation_steps")
                .select("id, step_order, action_type, action_params, delay_seconds")
                .eq("flow_id", exec.flow_id)
                .eq("step_order", exec.next_step_order)
                .maybeSingle();

            if (!stepData) {
                // Brak więcej kroków — completed
                await supabase.from("gmp_automation_executions")
                    .update({
                        status: "success",
                        completed_at: new Date().toISOString(),
                        next_step_order: 0,
                    })
                    .eq("id", exec.id);
                succeeded++;
                continue;
            }

            const step = stepData as Step;
            const result = await executeAction(supabase, step, exec);
            const logEntry = {
                step_order: step.step_order,
                action_type: step.action_type,
                ts: new Date().toISOString(),
                ok: result.ok,
                msg: result.msg,
            };
            const newLog = [...(exec.log as object[]), logEntry];

            if (!result.ok) {
                await supabase.from("gmp_automation_executions")
                    .update({
                        status: "failed",
                        completed_at: new Date().toISOString(),
                        error_message: result.msg,
                        log: newLog,
                    })
                    .eq("id", exec.id);
                failed++;
                continue;
            }

            // Sprawdź czy są jeszcze kroki
            const { data: nextStep } = await supabase
                .from("gmp_automation_steps")
                .select("step_order, delay_seconds")
                .eq("flow_id", exec.flow_id)
                .eq("step_order", exec.next_step_order + 1)
                .maybeSingle();

            if (nextStep) {
                // Zaplanuj następny krok
                const nextRunAt = new Date(Date.now() + (nextStep.delay_seconds || 0) * 1000).toISOString();
                await supabase.from("gmp_automation_executions")
                    .update({
                        status: "pending",
                        next_step_order: exec.next_step_order + 1,
                        next_run_at: nextRunAt,
                        log: newLog,
                    })
                    .eq("id", exec.id);
            } else {
                // Koniec flow
                await supabase.from("gmp_automation_executions")
                    .update({
                        status: "success",
                        completed_at: new Date().toISOString(),
                        log: newLog,
                    })
                    .eq("id", exec.id);
                succeeded++;
            }
        } catch (e) {
            errors.push(`exec ${exec.id}: ${(e as Error).message}`);
            failed++;
            await supabase.from("gmp_automation_executions")
                .update({ status: "failed", error_message: (e as Error).message })
                .eq("id", exec.id);
        }
    }

    return new Response(JSON.stringify({
        ok: true,
        processed,
        succeeded,
        failed,
        duration_ms: Date.now() - startedAt,
        errors,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

async function executeAction(
    supabase: ReturnType<typeof createClient>,
    step: Step,
    exec: Execution
): Promise<{ ok: boolean; msg: string }> {
    const params = step.action_params || {};
    const ctx = exec.trigger_context || {};

    switch (step.action_type) {
        case "create_task": {
            const dueIn = Number(params.due_in_days || 7);
            const dueDate = new Date(Date.now() + dueIn * 86400000).toISOString().slice(0, 10);
            const { error } = await supabase.from("gmp_tasks").insert({
                case_id: exec.case_id,
                title: String(params.title || "Automatyzacja: zadanie"),
                description: String(params.description || ""),
                due_date: dueDate,
                task_type: String(params.task_type || "general"),
                status: "todo",
                visibility: "team",
            });
            return error ? { ok: false, msg: error.message } : { ok: true, msg: `task created (due ${dueDate})` };
        }
        case "create_appointment": {
            const dateStr = String(params.scheduled_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
            const { error } = await supabase.from("gmp_crm_appointments").insert({
                case_id: exec.case_id,
                appointment_type: String(params.appointment_type || "spotkanie_klient"),
                scheduled_date: dateStr,
                scheduled_time: params.scheduled_time || null,
                title: String(params.title || "Automatyzacja: spotkanie"),
                notes: String(params.notes || ""),
            });
            return error ? { ok: false, msg: error.message } : { ok: true, msg: `appt created (${dateStr})` };
        }
        case "send_notification": {
            const dedupe = `auto-${exec.id}-${step.step_order}`;
            const { error } = await supabase.rpc("gmp_notify_admins", {
                p_kind: String(params.kind || "automation"),
                p_title: String(params.title || "Automatyzacja"),
                p_body: String(params.body || ""),
                p_link: exec.case_id ? `/crm/case.html?id=${exec.case_id}` : null,
                p_icon: String(params.icon || "ph-robot"),
                p_severity: String(params.severity || "info"),
                p_source_type: "case",
                p_source_id: exec.case_id,
                p_dedupe: dedupe,
            });
            return error ? { ok: false, msg: error.message } : { ok: true, msg: "notification sent" };
        }
        case "set_field": {
            if (!exec.case_id) return { ok: false, msg: "no case_id" };
            const field = String(params.field || "");
            if (!field) return { ok: false, msg: "no field" };
            const { error } = await supabase.from("gmp_cases")
                .update({ [field]: params.value })
                .eq("id", exec.case_id);
            return error ? { ok: false, msg: error.message } : { ok: true, msg: `set ${field}` };
        }
        case "add_to_group": {
            if (!exec.case_id) return { ok: false, msg: "no case_id" };
            const groupId = String(params.group_id || "");
            if (!groupId) return { ok: false, msg: "no group_id" };
            const { error } = await supabase.from("gmp_case_group_members")
                .upsert({ group_id: groupId, case_id: exec.case_id, role_in_group: params.role || null },
                    { onConflict: "group_id,case_id", ignoreDuplicates: true });
            return error ? { ok: false, msg: error.message } : { ok: true, msg: "added to group" };
        }
        default:
            return { ok: false, msg: `unknown action_type: ${step.action_type}` };
    }
}
