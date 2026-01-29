import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

// Bump this when changing logic so the frontend can detect outdated deployments.
const FUNCTION_VERSION = "2026-01-29-verify-daily-room";

type SuccessResponse = {
  success: true;
  room: { name: string; url: string };
  createdAt: string;
  source: "daily_api";
  function_version: string;
  reused: boolean;
};

type ErrorResponse = {
  success: false;
  error: { code: string; message: string; details?: unknown };
  function_version: string;
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

async function dailyRequest(
  DAILY_API_KEY: string,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
) {
  const url = `https://api.daily.co/v1${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const requestId = res.headers.get("x-daily-request-id") ?? res.headers.get("x-request-id") ?? null;

  // NOTE: We never log the API key.
  console.log("[create-daily-room] Daily API", {
    method,
    path,
    status: res.status,
    request_id: requestId,
    body: text,
  });

  return { res, text, json: safeJsonParse(text), requestId };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "X-Function-Version": FUNCTION_VERSION,
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. VALIDATE DAILY_API_KEY FIRST - This is the most common failure point
    // ═══════════════════════════════════════════════════════════════════════
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    
    console.log('[create-daily-room] === STARTUP CHECKS ===');
    console.log('[create-daily-room] function_version:', FUNCTION_VERSION);
    console.log('[create-daily-room] DAILY_API_KEY present:', !!DAILY_API_KEY);
    console.log('[create-daily-room] DAILY_API_KEY length:', DAILY_API_KEY?.length ?? 0);
    console.log('[create-daily-room] DAILY_API_KEY first 8 chars:', DAILY_API_KEY?.substring(0, 8) ?? 'N/A');
    
    if (!DAILY_API_KEY || DAILY_API_KEY.trim() === "") {
      console.error("[create-daily-room] CRITICAL: DAILY_API_KEY is not configured or is empty!");
      return jsonResponse(
        {
          success: false,
          error: {
            code: "MISSING_DAILY_API_KEY",
            message: "DAILY_API_KEY is not configured",
            details: "Add DAILY_API_KEY in Supabase Function environment variables.",
          },
          function_version: FUNCTION_VERSION,
        } satisfies ErrorResponse,
        500,
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ═══════════════════════════════════════════════════════════════════════
    // 2. AUTH - Validate JWT
    // ═══════════════════════════════════════════════════════════════════════
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[create-daily-room] No Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'NO_AUTH_HEADER', function_version: FUNCTION_VERSION }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseAuth = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('[create-daily-room] JWT validation failed:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'INVALID_JWT', function_version: FUNCTION_VERSION }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authedUserId = claimsData.claims.sub as string;
    console.log('[create-daily-room] Authenticated user:', authedUserId);

    // Service client for DB writes/reads
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. PARSE REQUEST BODY
    // ═══════════════════════════════════════════════════════════════════════
    let body: { conversation_id?: string; force_new?: boolean } = {};
    try {
      body = await req.json();
    } catch (e) {
      console.error('[create-daily-room] Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body', code: 'INVALID_BODY' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { conversation_id, force_new } = body;

    if (!conversation_id) {
      return new Response(
        JSON.stringify({ error: 'conversation_id is required', code: 'MISSING_CONVERSATION_ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-daily-room] conversation_id:', conversation_id, 'user:', authedUserId);

    // ═══════════════════════════════════════════════════════════════════════
    // 4. GET CONVERSATION & VALIDATE PARTICIPANT
    // ═══════════════════════════════════════════════════════════════════════
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .maybeSingle();

    if (convError || !conversation) {
      console.error('[create-daily-room] Conversation fetch error:', convError);
      return new Response(
        JSON.stringify({ error: 'Conversation not found', code: 'CONVERSATION_NOT_FOUND', function_version: FUNCTION_VERSION }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization: only participants can create/get a room for this conversation
    const isParticipant = conversation.teacher_id === authedUserId || conversation.student_id === authedUserId;
    if (!isParticipant) {
      console.warn('[create-daily-room] Forbidden - user not participant', { 
        authedUserId, 
        teacher_id: conversation.teacher_id, 
        student_id: conversation.student_id 
      });
      return new Response(
        JSON.stringify({ error: 'Forbidden', code: 'NOT_PARTICIPANT', function_version: FUNCTION_VERSION }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. REUSE IF VERIFIED (unless force_new)
    // ═══════════════════════════════════════════════════════════════════════
    const existingName = conversation.video_room_name as string | null | undefined;
    const existingUrl = conversation.video_room_url as string | null | undefined;

    if (!force_new && isNonEmptyString(existingName) && isNonEmptyString(existingUrl)) {
      console.log("[create-daily-room] Candidate cached room found; verifying before reuse", {
        conversation_id,
        room_name: existingName,
      });

      const verify = await dailyRequest(DAILY_API_KEY, "GET", `/rooms/${encodeURIComponent(existingName)}`);
      if (verify.res.ok) {
        const createdAt = new Date().toISOString();
        return jsonResponse(
          {
            success: true,
            room: { name: existingName, url: existingUrl },
            createdAt,
            source: "daily_api",
            function_version: FUNCTION_VERSION,
            reused: true,
          } satisfies SuccessResponse,
          200,
        );
      }

      console.warn("[create-daily-room] Cached room failed verification; will create a new one", {
        conversation_id,
        room_name: existingName,
        verify_status: verify.res.status,
      });

      // clear cached room in DB (best effort)
      await supabase
        .from("conversations")
        .update({ video_room_name: null, video_room_url: null, video_room_created_at: null })
        .eq("id", conversation_id);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. CREATE A FRESH DAILY ROOM (unique)
    // ═══════════════════════════════════════════════════════════════════════
    const ts = Math.floor(Date.now() / 1000);
    const compactId = String(conversation_id).replace(/-/g, "");
    const rand = crypto.randomUUID().slice(0, 8);
    const roomName = `c${compactId.slice(0, 12)}-${ts}-${rand}`;

    console.log('[create-daily-room] === CREATING DAILY ROOM ===');
    console.log('[create-daily-room] Room name:', roomName);

    const roomPayload = {
      name: roomName,
      properties: {
        max_participants: 3,
        enable_screenshare: true,
        enable_chat: false,
        enable_knocking: false,
        start_video_off: false,
        start_audio_off: false,
        enable_advanced_chat: false,
        enable_prejoin_ui: false,
        // IMPORTANT: Do not set exp. Expiring rooms cause “works then breaks later” regressions
        // when any stale room_url is reused.
      },
    };

    console.log('[create-daily-room] Sending POST to https://api.daily.co/v1/rooms');
    console.log('[create-daily-room] Payload:', JSON.stringify(roomPayload));

    // ═══════════════════════════════════════════════════════════════════════
    // 7. POST /rooms (create) + fail-fast
    // ═══════════════════════════════════════════════════════════════════════
    let createdRoomName: string | null = null;
    let createdRoomUrl: string | null = null;
    try {
      const create = await dailyRequest(DAILY_API_KEY, "POST", "/rooms", roomPayload);

      if (!create.res.ok) {
        const status = create.res.status;
        const code = status === 401 || status === 403 ? "DAILY_API_KEY_INVALID" : "DAILY_CREATE_FAILED";
        const message =
          status === 401 || status === 403
            ? "Daily API key invalid/for wrong domain"
            : `Daily room creation failed (${status})`;

        return jsonResponse(
          {
            success: false,
            error: { code, message, details: create.json },
            function_version: FUNCTION_VERSION,
          } satisfies ErrorResponse,
          502,
        );
      }

      const body = create.json as any;
      createdRoomName = body?.name ?? null;
      createdRoomUrl = body?.url ?? null;

      if (!isNonEmptyString(createdRoomName) || !isNonEmptyString(createdRoomUrl)) {
        return jsonResponse(
          {
            success: false,
            error: {
              code: "DAILY_CREATE_INCOMPLETE",
              message: "Daily API returned incomplete room data",
              details: create.json,
            },
            function_version: FUNCTION_VERSION,
          } satisfies ErrorResponse,
          502,
        );
      }
    } catch (fetchError) {
      console.error("[create-daily-room] CRITICAL: fetch to Daily API failed:", fetchError);
      return jsonResponse(
        {
          success: false,
          error: { code: "DAILY_FETCH_FAILED", message: "Failed to connect to Daily API", details: String(fetchError) },
          function_version: FUNCTION_VERSION,
        } satisfies ErrorResponse,
        502,
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. VERIFY /rooms/{name} (non-negotiable)
    // ═══════════════════════════════════════════════════════════════════════
    const verify = await dailyRequest(DAILY_API_KEY, "GET", `/rooms/${encodeURIComponent(createdRoomName)}`);
    if (!verify.res.ok) {
      return jsonResponse(
        {
          success: false,
          error: {
            code: "DAILY_VERIFY_FAILED",
            message: `Daily room verify failed (${verify.res.status})`,
            details: {
              room_name: createdRoomName,
              create_url: createdRoomUrl,
              verify_status: verify.res.status,
              verify_body: verify.json,
            },
          },
          function_version: FUNCTION_VERSION,
        } satisfies ErrorResponse,
        502,
      );
    }

    console.log("[create-daily-room] === ROOM CREATED + VERIFIED ===", {
      room_name: createdRoomName,
      room_url: createdRoomUrl,
      conversation_id,
      reused: false,
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 8. SAVE ROOM INFO TO DATABASE
    // ═══════════════════════════════════════════════════════════════════════
    const createdAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        video_room_name: createdRoomName,
        video_room_url: createdRoomUrl,
        video_room_created_at: createdAt,
      })
      .eq('id', conversation_id);

    if (updateError) {
      console.error('[create-daily-room] Failed to save room info to DB:', updateError);
      // Room was created in Daily but we failed to save - still return success
      // since the room exists and can be used
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 9. RETURN SUCCESS
    // ═══════════════════════════════════════════════════════════════════════
    return jsonResponse(
      {
        success: true,
        room: { name: createdRoomName, url: createdRoomUrl },
        createdAt,
        source: "daily_api",
        function_version: FUNCTION_VERSION,
        reused: false,
      } satisfies SuccessResponse,
      200,
    );

  } catch (error) {
    console.error('[create-daily-room] UNHANDLED ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return jsonResponse(
      {
        success: false,
        error: { code: "UNHANDLED_ERROR", message: errorMessage },
        function_version: FUNCTION_VERSION,
      } satisfies ErrorResponse,
      500,
    );
  }
});
