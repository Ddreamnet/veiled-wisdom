import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP ENDED CALLS - Periodic cleanup for stale sessions
// Should be called via external cron (GitHub Actions, etc.) with CRON_SECRET
// DO NOT embed SERVICE_ROLE_KEY in pg_cron - use external scheduler
// ═══════════════════════════════════════════════════════════════════════════════

const FUNCTION_VERSION = "cleanup-ended-calls@2026-02-04-REV1";

// Sessions older than this (since ended_at) will have their rooms deleted
const CLEANUP_THRESHOLD_HOURS = 1;

// Sessions with null ended_at but started more than this ago are considered stale
const STALE_SESSION_HOURS = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "X-Function-Version": FUNCTION_VERSION,
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number) {
  console.error(`[cleanup-ended-calls] Error: ${code} - ${message}`);
  return jsonResponse({ success: false, error: { code, message }, function_version: FUNCTION_VERSION }, status);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[cleanup-ended-calls] === CLEANUP JOB START ===");
  console.log("[cleanup-ended-calls] function_version:", FUNCTION_VERSION);

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. AUTH - Use CRON_SECRET header (set by external scheduler)
    // This is safer than embedding SERVICE_ROLE_KEY in SQL
    // ═══════════════════════════════════════════════════════════════════════
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");

    // If CRON_SECRET is configured, validate it
    if (expectedSecret && cronSecret !== expectedSecret) {
      // Also allow service role auth as fallback
      const authHeader = req.headers.get("Authorization");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (!authHeader?.includes(serviceKey ?? "NEVER_MATCH")) {
        return errorResponse("UNAUTHORIZED", "Invalid cron secret or auth", 401);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = Date.now();
    const cleanupCutoff = new Date(now - CLEANUP_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();
    const staleCutoff = new Date(now - STALE_SESSION_HOURS * 60 * 60 * 1000).toISOString();

    // ═══════════════════════════════════════════════════════════════════════
    // 2. FIND ENDED CALLS READY FOR CLEANUP (ended_at > threshold)
    // ═══════════════════════════════════════════════════════════════════════
    const { data: endedCalls, error: endedError } = await supabase
      .from("conversations")
      .select("id, active_call_room_name")
      .not("active_call_ended_at", "is", null)
      .lt("active_call_ended_at", cleanupCutoff)
      .not("active_call_room_name", "is", null);

    if (endedError) {
      console.error("[cleanup-ended-calls] Query error (ended):", endedError);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. FIND STALE CALLS (started but never ended, older than threshold)
    // These are orphaned sessions from crashes/disconnects
    // ═══════════════════════════════════════════════════════════════════════
    const { data: staleCalls, error: staleError } = await supabase
      .from("conversations")
      .select("id, active_call_room_name, active_call_started_at")
      .not("active_call_started_at", "is", null)
      .is("active_call_ended_at", null)
      .lt("active_call_started_at", staleCutoff)
      .not("active_call_room_name", "is", null);

    if (staleError) {
      console.error("[cleanup-ended-calls] Query error (stale):", staleError);
    }

    const allCalls = [
      ...(endedCalls || []).map((c) => ({ ...c, type: "ended" as const })),
      ...(staleCalls || []).map((c) => ({ ...c, type: "stale" as const })),
    ];

    console.log("[cleanup-ended-calls] Found calls to clean:", {
      ended: endedCalls?.length ?? 0,
      stale: staleCalls?.length ?? 0,
    });

    let deletedRooms = 0;
    let cleanedConversations = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const call of allCalls) {
      // ═══════════════════════════════════════════════════════════════════
      // 4. DELETE DAILY ROOM (idempotent - 404 is success)
      // ═══════════════════════════════════════════════════════════════════
      if (DAILY_API_KEY && call.active_call_room_name) {
        try {
          const res = await fetch(
            `https://api.daily.co/v1/rooms/${encodeURIComponent(call.active_call_room_name)}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
            }
          );

          // 200 = deleted, 404 = already gone (both are success)
          if (res.ok || res.status === 404) {
            deletedRooms++;
            console.log(`[cleanup-ended-calls] Room deleted: ${call.active_call_room_name} (${res.status})`);
          } else {
            console.warn(`[cleanup-ended-calls] Room delete failed: ${call.active_call_room_name} (${res.status})`);
          }
        } catch (err) {
          console.error(`[cleanup-ended-calls] Room delete error: ${call.active_call_room_name}`, err);
          errors.push({ id: call.id, error: String(err) });
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // 5. CLEAN DB RECORD
      // For stale calls, also set ended_at
      // ═══════════════════════════════════════════════════════════════════
      const updatePayload: Record<string, unknown> = {
        active_call_room_name: null,
        active_call_room_url: null,
        // Keep started_at and ended_at for audit
      };

      // For stale calls, mark them as ended
      if (call.type === "stale") {
        updatePayload.active_call_ended_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("conversations")
        .update(updatePayload)
        .eq("id", call.id);

      if (updateError) {
        console.error(`[cleanup-ended-calls] DB update error for ${call.id}:`, updateError);
        errors.push({ id: call.id, error: updateError.message });
      } else {
        cleanedConversations++;
      }
    }

    console.log("[cleanup-ended-calls] === CLEANUP COMPLETE ===", {
      deletedRooms,
      cleanedConversations,
      errors: errors.length,
    });

    return jsonResponse({
      success: true,
      cleaned: {
        ended: endedCalls?.length ?? 0,
        stale: staleCalls?.length ?? 0,
        rooms_deleted: deletedRooms,
        conversations_updated: cleanedConversations,
      },
      errors: errors.length > 0 ? errors : undefined,
      function_version: FUNCTION_VERSION,
    });

  } catch (err) {
    console.error("[cleanup-ended-calls] Unexpected error:", err);
    return errorResponse("INTERNAL_ERROR", String(err), 500);
  }
});
