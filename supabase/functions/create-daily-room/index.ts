import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

// Bump this when changing logic so the frontend can detect outdated deployments.
const FUNCTION_VERSION = "create-daily-room@2026-02-13-REV7-PARALLEL-AUTH";

type CallIntent = "start" | "join";

type SuccessResponse = {
  success: true;
  room: { name: string; url: string };
  createdAt: string;
  function_version: string;
  reused: boolean;
  active_call: boolean;
  call_started_at?: string;
  call_created_by?: string;
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

function errorResponse(
  params: { code: string; message: string; details?: unknown },
  status: number,
) {
  return jsonResponse(
    {
      success: false,
      error: params,
      function_version: FUNCTION_VERSION,
    } satisfies ErrorResponse,
    status,
  );
}

function successResponse(payload: Omit<SuccessResponse, "function_version">, status = 200) {
  return jsonResponse(
    {
      ...payload,
      function_version: FUNCTION_VERSION,
    } satisfies SuccessResponse,
    status,
  );
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request_id = crypto.randomUUID();

    // ═══════════════════════════════════════════════════════════════════════
    // 0. WARM-UP CHECK - BEFORE AUTH (no JWT needed for keep-alive ping)
    // ═══════════════════════════════════════════════════════════════════════
    // Parse body early to check for warmup flag
    let body: { conversation_id?: string; intent?: CallIntent; force_new?: boolean; warmup?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // Will be handled later if not a warmup request
      body = {};
    }

    if (body?.warmup === true) {
      console.log('[create-daily-room] Warm-up ping received - early return (no auth)');
      return jsonResponse({ 
        success: true, 
        warmed: true, 
        function_version: FUNCTION_VERSION,
        timestamp: Date.now(),
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. VALIDATE DAILY_API_KEY
    // ═══════════════════════════════════════════════════════════════════════
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    
    console.log('[create-daily-room] === STARTUP CHECKS ===');
    console.log('[create-daily-room] function_version:', FUNCTION_VERSION);
    console.log('[create-daily-room] request_id:', request_id);
    console.log('[create-daily-room] DAILY_API_KEY present:', !!DAILY_API_KEY);
    
    if (!DAILY_API_KEY || DAILY_API_KEY.trim() === "") {
      console.error("[create-daily-room] CRITICAL: DAILY_API_KEY is not configured!");
      return errorResponse(
        {
          code: "MISSING_DAILY_API_KEY",
          message: "DAILY_API_KEY is not configured",
          details: "Add DAILY_API_KEY in Supabase Function environment variables.",
        },
        500,
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ═══════════════════════════════════════════════════════════════════════
    // 2. AUTH + BODY VALIDATION
    // ═══════════════════════════════════════════════════════════════════════
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(
        { code: 'NO_AUTH_HEADER', message: 'Unauthorized', details: { request_id } },
        401,
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate body fields before parallel fetch
    const { conversation_id, force_new } = body;
    const intent: CallIntent = body.intent === "join" ? "join" : "start";

    if (!conversation_id) {
      return errorResponse(
        { code: 'MISSING_CONVERSATION_ID', message: 'conversation_id is required', details: { request_id } },
        400,
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. PARALLEL: Auth validation + Conversation fetch (OPTIMIZATION)
    // ═══════════════════════════════════════════════════════════════════════
    const [claimsResult, convResult] = await Promise.all([
      supabaseAuth.auth.getClaims(token),
      supabase
        .from('conversations')
        .select('*')
        .eq('id', conversation_id)
        .maybeSingle(),
    ]);

    const { data: claimsData, error: claimsError } = claimsResult;
    if (claimsError || !claimsData?.claims?.sub) {
      console.error('[create-daily-room] JWT validation failed:', claimsError);
      return errorResponse(
        { code: 'INVALID_JWT', message: 'Unauthorized', details: { request_id } },
        401,
      );
    }

    const authedUserId = claimsData.claims.sub as string;
    console.log('[create-daily-room] Authenticated user:', authedUserId);
    console.log('[create-daily-room] Request:', { conversation_id, intent, force_new, user: authedUserId });

    // ═══════════════════════════════════════════════════════════════════════
    // 4. VALIDATE CONVERSATION & PARTICIPANT
    // ═══════════════════════════════════════════════════════════════════════
    const { data: conversation, error: convError } = convResult;

    if (convError || !conversation) {
      console.error('[create-daily-room] Conversation fetch error:', convError);
      return errorResponse(
        { code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found', details: { request_id } },
        404,
      );
    }

    const isParticipant = conversation.teacher_id === authedUserId || conversation.student_id === authedUserId;
    if (!isParticipant) {
      return errorResponse(
        { code: 'NOT_PARTICIPANT', message: 'Forbidden', details: { request_id } },
        403,
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. CHECK FOR ACTIVE CALL + SELF-HEAL STALE SESSIONS
    // ═══════════════════════════════════════════════════════════════════════
    const activeCallRoomName = conversation.active_call_room_name as string | null;
    const activeCallRoomUrl = conversation.active_call_room_url as string | null;
    const activeCallStartedAt = conversation.active_call_started_at as string | null;
    const activeCallEndedAt = conversation.active_call_ended_at as string | null;
    const activeCallCreatedBy = conversation.active_call_created_by as string | null;

    let hasActiveCall = 
      isNonEmptyString(activeCallRoomName) && 
      isNonEmptyString(activeCallRoomUrl) &&
      activeCallStartedAt !== null &&
      activeCallEndedAt === null;

    // SELF-HEAL: If session is older than 2 hours, consider it stale
    const MAX_SESSION_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours
    if (hasActiveCall && activeCallStartedAt) {
      const sessionAge = Date.now() - new Date(activeCallStartedAt).getTime();
      if (sessionAge > MAX_SESSION_AGE_MS) {
        console.warn('[create-daily-room] Stale session detected (>2h), auto-closing:', {
          room: activeCallRoomName,
          started: activeCallStartedAt,
          age_hours: (sessionAge / (60 * 60 * 1000)).toFixed(2),
        });
        
        // Mark as ended
        await supabase
          .from('conversations')
          .update({
            active_call_ended_at: new Date().toISOString(),
          })
          .eq('id', conversation_id);
        
        // Clear the flag so we create a new room
        hasActiveCall = false;
      }
    }

    console.log('[create-daily-room] Active call check:', { 
      hasActiveCall, 
      activeCallRoomName, 
      activeCallStartedAt, 
      activeCallEndedAt,
      intent 
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 6. IF ACTIVE CALL EXISTS - VERIFY AND RETURN IT
    // ═══════════════════════════════════════════════════════════════════════
    if (hasActiveCall && !force_new) {
      console.log("[create-daily-room] Active call exists; verifying in Daily...");

      const verify = await dailyRequest(DAILY_API_KEY, "GET", `/rooms/${encodeURIComponent(activeCallRoomName!)}`);
      
      if (verify.res.ok) {
        console.log("[create-daily-room] Active call verified successfully");
        return successResponse({
          success: true,
          room: { name: activeCallRoomName!, url: activeCallRoomUrl! },
          createdAt: activeCallStartedAt!,
          reused: true,
          active_call: true,
          call_started_at: activeCallStartedAt!,
          call_created_by: activeCallCreatedBy ?? undefined,
        });
      }

      // Room doesn't exist in Daily anymore - clean up
      console.warn("[create-daily-room] Active call room not found in Daily. Cleaning up...");
      await supabase
        .from("conversations")
        .update({
          active_call_room_name: null,
          active_call_room_url: null,
          active_call_started_at: null,
          active_call_ended_at: new Date().toISOString(),
          active_call_created_by: null,
          // Also clear legacy fields
          video_room_name: null,
          video_room_url: null,
          video_room_created_at: null,
        })
        .eq("id", conversation_id);

      // If intent is "join", the call they wanted to join is gone
      if (intent === "join") {
        return errorResponse(
          { code: "NO_ACTIVE_CALL", message: "Aktif arama bulunamadı veya sona erdi.", details: { request_id } },
          404,
        );
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. IF INTENT IS "JOIN" BUT NO ACTIVE CALL - ERROR
    // ═══════════════════════════════════════════════════════════════════════
    if (intent === "join" && !hasActiveCall) {
      console.log("[create-daily-room] Intent is 'join' but no active call exists");
      return errorResponse(
        { code: "NO_ACTIVE_CALL", message: "Aktif arama bulunamadı. Görüşmeyi başlatmak için 'Görüntülü Ara' butonunu kullanın.", details: { request_id } },
        404,
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. CREATE A NEW DAILY ROOM (START intent)
    // ═══════════════════════════════════════════════════════════════════════
    const ts = Math.floor(Date.now() / 1000);
    const compactId = String(conversation_id).replace(/-/g, "");
    const rand = crypto.randomUUID().slice(0, 8);
    const roomName = `c${compactId.slice(0, 12)}-${ts}-${rand}`;

    console.log('[create-daily-room] === CREATING NEW ROOM ===');
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
        // No exp - rooms persist until manually cleaned
      },
    };

    let createdRoomName: string | null = null;
    let createdRoomUrl: string | null = null;
    
    try {
      const create = await dailyRequest(DAILY_API_KEY, "POST", "/rooms", roomPayload);

      if (!create.res.ok) {
        const status = create.res.status;
        const code = status === 401 || status === 403 ? "DAILY_API_KEY_INVALID" : "DAILY_CREATE_FAILED";
        const message = status === 401 || status === 403
          ? "Daily API key invalid/for wrong domain"
          : `Daily room creation failed (${status})`;

        return errorResponse({ code, message, details: { request_id, daily: create.json } }, 502);
      }

      const resBody = create.json as any;
      createdRoomName = resBody?.name ?? null;
      createdRoomUrl = resBody?.url ?? null;

      if (!isNonEmptyString(createdRoomName) || !isNonEmptyString(createdRoomUrl)) {
        return errorResponse({
          code: "DAILY_CREATE_INCOMPLETE",
          message: "Daily API returned incomplete room data",
          details: { request_id, daily: create.json },
        }, 502);
      }
    } catch (fetchError) {
      console.error("[create-daily-room] CRITICAL: fetch to Daily API failed:", fetchError);
      return errorResponse({
        code: "DAILY_FETCH_FAILED",
        message: "Failed to connect to Daily API",
        details: { request_id, error: String(fetchError) },
      }, 502);
    }

    // OPTIMIZATION: Skip verify step for newly created rooms
    // Daily POST response already confirms the room exists
    // Verify step only needed for checking existing/active rooms
    console.log("[create-daily-room] === ROOM CREATED (skipping verify for new rooms) ===");

    // ═══════════════════════════════════════════════════════════════════════
    // 10. SAVE AS ACTIVE CALL IN DATABASE
    // ═══════════════════════════════════════════════════════════════════════
    const startedAt = new Date().toISOString();

    // OPTIMIZATION: Fire-and-forget DB update - don't block response
    // Room is already created in Daily, DB update can happen async
    supabase
      .from('conversations')
      .update({
        // New active call fields
        active_call_room_name: createdRoomName,
        active_call_room_url: createdRoomUrl,
        active_call_started_at: startedAt,
        active_call_ended_at: null,
        active_call_created_by: authedUserId,
        // Also update legacy fields for backward compat
        video_room_name: createdRoomName,
        video_room_url: createdRoomUrl,
        video_room_created_at: startedAt,
      })
      .eq('id', conversation_id)
      .then(({ error }) => {
        if (error) console.error('[create-daily-room] Failed to save room info to DB:', error);
      });

    return successResponse({
      success: true,
      room: { name: createdRoomName, url: createdRoomUrl },
      createdAt: startedAt,
      reused: false,
      active_call: true,
      call_started_at: startedAt,
      call_created_by: authedUserId,
    });

  } catch (error) {
    console.error('[create-daily-room] UNHANDLED ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse({ code: "UNHANDLED_ERROR", message: errorMessage }, 500);
  }
});
