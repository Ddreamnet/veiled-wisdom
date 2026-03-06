import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const FUNCTION_VERSION = "get-daily-room-presence@2026-03-06-v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "X-Function-Version": FUNCTION_VERSION,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", function_version: FUNCTION_VERSION }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");

    if (!DAILY_API_KEY) {
      return new Response(
        JSON.stringify({ error: "DAILY_API_KEY not configured", function_version: FUNCTION_VERSION }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate JWT
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token", function_version: FUNCTION_VERSION }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = claimsData.claims.sub as string;

    // ── Body ─────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const conversationId = body.conversation_id;
    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: "conversation_id required", function_version: FUNCTION_VERSION }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Fetch conversation (service role) ────────────────────────────────
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: conv, error: convErr } = await supabase
      .from("conversations")
      .select("teacher_id, student_id, active_call_room_name, active_call_ended_at")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr || !conv) {
      return new Response(
        JSON.stringify({ error: "Conversation not found", function_version: FUNCTION_VERSION }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify participant
    if (conv.teacher_id !== userId && conv.student_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden", function_version: FUNCTION_VERSION }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Check if there's an active call ──────────────────────────────────
    const roomName = conv.active_call_room_name;
    const ended = conv.active_call_ended_at;

    if (!roomName || ended) {
      return new Response(
        JSON.stringify({
          has_live_participants: false,
          participant_count: 0,
          room_name: null,
          function_version: FUNCTION_VERSION,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Query Daily.co presence ──────────────────────────────────────────
    const dailyRes = await fetch(
      `https://api.daily.co/v1/rooms/${encodeURIComponent(roomName)}/presence`,
      {
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const dailyText = await dailyRes.text();

    if (!dailyRes.ok) {
      // Room doesn't exist anymore → no participants
      console.log("[get-daily-room-presence] Daily API error:", dailyRes.status, dailyText);
      return new Response(
        JSON.stringify({
          has_live_participants: false,
          participant_count: 0,
          room_name: roomName,
          function_version: FUNCTION_VERSION,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Daily presence response: { total_count: number, data: [...] }
    let parsed: any;
    try {
      parsed = JSON.parse(dailyText);
    } catch {
      parsed = {};
    }

    const totalCount = typeof parsed.total_count === "number" ? parsed.total_count : 0;

    console.log("[get-daily-room-presence]", { roomName, totalCount });

    return new Response(
      JSON.stringify({
        has_live_participants: totalCount > 0,
        participant_count: totalCount,
        room_name: roomName,
        function_version: FUNCTION_VERSION,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[get-daily-room-presence] Unhandled error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal error",
        function_version: FUNCTION_VERSION,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
