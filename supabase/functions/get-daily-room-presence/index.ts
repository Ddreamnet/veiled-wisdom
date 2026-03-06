import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const FUNCTION_VERSION = "get-daily-room-presence@2026-03-06-v2-legacy-compat";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "X-Function-Version": FUNCTION_VERSION,
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized", function_version: FUNCTION_VERSION }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dailyApiKey = Deno.env.get("DAILY_API_KEY");

    if (!dailyApiKey) {
      return json({ error: "DAILY_API_KEY not configured", function_version: FUNCTION_VERSION }, 500);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: "Invalid token", function_version: FUNCTION_VERSION }, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const conversationId = body.conversation_id as string | undefined;
    if (!conversationId) {
      return json({ error: "conversation_id required", function_version: FUNCTION_VERSION }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select(
        "teacher_id, student_id, active_call_room_name, active_call_room_url, active_call_started_at, active_call_ended_at, active_call_created_by, video_room_name, video_room_url, video_room_created_at",
      )
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      return json({ error: "Conversation not found", function_version: FUNCTION_VERSION }, 404);
    }

    if (conv.teacher_id !== userId && conv.student_id !== userId) {
      return json({ error: "Forbidden", function_version: FUNCTION_VERSION }, 403);
    }

    // Prefer new active_call_* fields; fallback to legacy video_room_*
    const hasActive = !!conv.active_call_room_name && !!conv.active_call_room_url && !conv.active_call_ended_at;
    const roomName = hasActive ? conv.active_call_room_name : conv.video_room_name;
    const roomUrl = hasActive ? conv.active_call_room_url : conv.video_room_url;
    const startedAt = hasActive
      ? conv.active_call_started_at
      : conv.video_room_created_at ?? new Date().toISOString();

    if (!roomName || !roomUrl) {
      return json({
        has_live_participants: false,
        participant_count: 0,
        room_name: null,
        room_url: null,
        function_version: FUNCTION_VERSION,
      });
    }

    const presenceRes = await fetch(
      `https://api.daily.co/v1/rooms/${encodeURIComponent(roomName)}/presence`,
      {
        headers: {
          Authorization: `Bearer ${dailyApiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const presenceText = await presenceRes.text();
    let participantCount = 0;

    if (presenceRes.ok) {
      const parsed = JSON.parse(presenceText || "{}");
      // Daily can return different shapes across versions; support both
      if (typeof parsed.total_count === "number") {
        participantCount = parsed.total_count;
      } else if (Array.isArray(parsed.data)) {
        participantCount = parsed.data.length;
      } else if (Array.isArray(parsed.participants)) {
        participantCount = parsed.participants.length;
      }
    } else {
      console.log("[get-daily-room-presence] Daily presence failed", {
        status: presenceRes.status,
        body: presenceText,
      });
    }

    const hasLiveParticipants = participantCount > 0;

    // Self-heal: if legacy room is live but new fields are empty, backfill active_call_*
    if (hasLiveParticipants && !hasActive) {
      const { error: backfillErr } = await supabase
        .from("conversations")
        .update({
          active_call_room_name: roomName,
          active_call_room_url: roomUrl,
          active_call_started_at: startedAt,
          active_call_ended_at: null,
          active_call_created_by: conv.active_call_created_by ?? null,
        })
        .eq("id", conversationId);

      if (backfillErr) {
        console.error("[get-daily-room-presence] Backfill failed:", backfillErr);
      }
    }

    return json({
      has_live_participants: hasLiveParticipants,
      participant_count: participantCount,
      room_name: roomName,
      room_url: roomUrl,
      started_at: startedAt,
      created_by: conv.active_call_created_by ?? null,
      function_version: FUNCTION_VERSION,
    });
  } catch (err) {
    console.error("[get-daily-room-presence] Unhandled error:", err);
    return json({ error: "Internal error", function_version: FUNCTION_VERSION }, 500);
  }
});
