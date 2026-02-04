import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

// ═══════════════════════════════════════════════════════════════════════════════
// END DAILY CALL - Server-side call termination
// Ensures DB state is always updated when a call ends (manual, timeout, crash)
// ═══════════════════════════════════════════════════════════════════════════════

const FUNCTION_VERSION = "end-daily-call@2026-02-04-REV1";

type EndReason = 'manual' | 'solo_timeout' | 'max_duration' | 'error' | 'page_close' | 'cleanup' | 'stale';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "X-Function-Version": FUNCTION_VERSION,
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  params: { code: string; message: string; details?: unknown },
  status: number,
) {
  console.error(`[end-daily-call] Error: ${params.code}`, params);
  return jsonResponse(
    {
      success: false,
      error: params,
      function_version: FUNCTION_VERSION,
    },
    status,
  );
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const request_id = crypto.randomUUID();

  try {
    console.log("[end-daily-call] === REQUEST START ===");
    console.log("[end-daily-call] function_version:", FUNCTION_VERSION);
    console.log("[end-daily-call] request_id:", request_id);

    // ═══════════════════════════════════════════════════════════════════════
    // 1. VALIDATE AUTH - Use getClaims, never trust client-sent user_id
    // ═══════════════════════════════════════════════════════════════════════
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(
        { code: "NO_AUTH_HEADER", message: "Unauthorized", details: { request_id } },
        401,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("[end-daily-call] JWT validation failed:", claimsError);
      return errorResponse(
        { code: "INVALID_JWT", message: "Unauthorized", details: { request_id } },
        401,
      );
    }

    const authedUserId = claimsData.claims.sub as string;
    console.log("[end-daily-call] Authenticated user:", authedUserId);

    // ═══════════════════════════════════════════════════════════════════════
    // 2. PARSE BODY
    // ═══════════════════════════════════════════════════════════════════════
    let body: { conversation_id?: string; reason?: EndReason } = {};
    try {
      body = await req.json();
    } catch {
      return errorResponse(
        { code: "INVALID_BODY", message: "Invalid JSON body", details: { request_id } },
        400,
      );
    }

    const { conversation_id, reason = "manual" } = body;

    if (!conversation_id) {
      return errorResponse(
        { code: "MISSING_CONVERSATION_ID", message: "conversation_id is required", details: { request_id } },
        400,
      );
    }

    console.log("[end-daily-call] Request:", { conversation_id, reason, user: authedUserId });

    // ═══════════════════════════════════════════════════════════════════════
    // 3. GET CONVERSATION & VALIDATE PARTICIPANT
    // ═══════════════════════════════════════════════════════════════════════
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("teacher_id, student_id, active_call_room_name, active_call_started_at, active_call_ended_at")
      .eq("id", conversation_id)
      .maybeSingle();

    if (convError || !conversation) {
      console.error("[end-daily-call] Conversation fetch error:", convError);
      return errorResponse(
        { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found", details: { request_id } },
        404,
      );
    }

    const isParticipant = 
      conversation.teacher_id === authedUserId || 
      conversation.student_id === authedUserId;

    if (!isParticipant) {
      return errorResponse(
        { code: "NOT_PARTICIPANT", message: "Forbidden - not a participant", details: { request_id } },
        403,
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. CHECK IF CALL IS ALREADY ENDED (idempotent)
    // ═══════════════════════════════════════════════════════════════════════
    if (conversation.active_call_ended_at !== null) {
      console.log("[end-daily-call] Call already ended, returning success (idempotent)");
      return jsonResponse({
        success: true,
        ended: true,
        reason,
        already_ended: true,
        function_version: FUNCTION_VERSION,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. UPDATE DB - Set ended_at
    // ═══════════════════════════════════════════════════════════════════════
    const endedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        active_call_ended_at: endedAt,
        // Don't clear room_name/url yet - cleanup job will handle that
      })
      .eq("id", conversation_id);

    if (updateError) {
      console.error("[end-daily-call] DB update error:", updateError);
      return errorResponse(
        { code: "DB_UPDATE_FAILED", message: "Failed to update call state", details: { request_id, error: updateError } },
        500,
      );
    }

    console.log("[end-daily-call] Call ended successfully:", { conversation_id, reason, endedAt });

    // ═══════════════════════════════════════════════════════════════════════
    // 6. OPTIONAL: DELETE DAILY ROOM (fire-and-forget)
    // Only for manual/timeout terminations, not page_close (might be temporary)
    // ═══════════════════════════════════════════════════════════════════════
    const shouldDeleteRoom = reason !== "page_close" && conversation.active_call_room_name;
    
    if (shouldDeleteRoom) {
      const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
      if (DAILY_API_KEY) {
        // Fire-and-forget - don't block response
        fetch(`https://api.daily.co/v1/rooms/${encodeURIComponent(conversation.active_call_room_name)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
        })
          .then((res) => {
            console.log("[end-daily-call] Daily room delete:", res.status);
          })
          .catch((err) => {
            console.error("[end-daily-call] Daily room delete failed:", err);
          });
      }
    }

    return jsonResponse({
      success: true,
      ended: true,
      reason,
      ended_at: endedAt,
      room_deleted: shouldDeleteRoom,
      function_version: FUNCTION_VERSION,
    });

  } catch (err) {
    console.error("[end-daily-call] Unexpected error:", err);
    return errorResponse(
      { code: "INTERNAL_ERROR", message: "Internal server error", details: { request_id, error: String(err) } },
      500,
    );
  }
});
