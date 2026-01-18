import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    console.log('[create-daily-room] DAILY_API_KEY present:', !!DAILY_API_KEY);
    console.log('[create-daily-room] DAILY_API_KEY length:', DAILY_API_KEY?.length ?? 0);
    console.log('[create-daily-room] DAILY_API_KEY first 8 chars:', DAILY_API_KEY?.substring(0, 8) ?? 'N/A');
    
    if (!DAILY_API_KEY || DAILY_API_KEY.trim() === '') {
      console.error('[create-daily-room] CRITICAL: DAILY_API_KEY is not configured or is empty!');
      return new Response(
        JSON.stringify({ 
          error: 'DAILY_API_KEY is not configured',
          code: 'MISSING_API_KEY',
          details: 'The Daily.co API key is missing from environment variables. Please add it in Supabase Function settings.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ error: 'Unauthorized', code: 'NO_AUTH_HEADER' }),
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
        JSON.stringify({ error: 'Unauthorized', code: 'INVALID_JWT' }),
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

    const { conversation_id } = body;

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
        JSON.stringify({ error: 'Conversation not found', code: 'CONVERSATION_NOT_FOUND' }),
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
        JSON.stringify({ error: 'Forbidden', code: 'NOT_PARTICIPANT' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. ALWAYS CREATE A FRESH DAILY ROOM
    // We skip any cached room data to ensure reliability.
    // ═══════════════════════════════════════════════════════════════════════

    // Clear any old room info first
    if (conversation.video_room_url || conversation.video_room_name) {
      console.log('[create-daily-room] Clearing old room data before creating fresh room');
      await supabase
        .from('conversations')
        .update({
          video_room_name: null,
          video_room_url: null,
          video_room_created_at: null,
        })
        .eq('id', conversation_id);
    }

    // Generate unique room name: c<compactId>-<timestamp>
    const ts = Math.floor(Date.now() / 1000);
    const compactId = String(conversation_id).replace(/-/g, '');
    const roomName = `c${compactId.slice(0, 16)}-${ts}`;

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
        exp: ts + (60 * 60 * 24), // 24 hours expiration
      },
    };

    console.log('[create-daily-room] Sending POST to https://api.daily.co/v1/rooms');
    console.log('[create-daily-room] Payload:', JSON.stringify(roomPayload));

    // ═══════════════════════════════════════════════════════════════════════
    // 6. CALL DAILY API - This is where we actually create the room
    // ═══════════════════════════════════════════════════════════════════════
    let roomResponse: Response;
    try {
      roomResponse = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify(roomPayload),
      });
    } catch (fetchError) {
      console.error('[create-daily-room] CRITICAL: fetch to Daily API failed:', fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to connect to Daily API',
          code: 'DAILY_FETCH_FAILED',
          details: String(fetchError)
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-daily-room] Daily API response status:', roomResponse.status, roomResponse.statusText);

    // ═══════════════════════════════════════════════════════════════════════
    // 7. HANDLE DAILY API RESPONSE
    // ═══════════════════════════════════════════════════════════════════════
    const responseText = await roomResponse.text();
    console.log('[create-daily-room] Daily API response body:', responseText);

    if (!roomResponse.ok) {
      console.error('[create-daily-room] CRITICAL: Daily API returned error:', {
        status: roomResponse.status,
        statusText: roomResponse.statusText,
        body: responseText,
        roomName,
      });

      // Check for common errors
      if (roomResponse.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: 'Daily API authentication failed',
            code: 'DAILY_AUTH_FAILED',
            details: 'The DAILY_API_KEY is invalid or expired. Please verify your Daily.co API key in Supabase Function environment variables.'
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: `Daily API error: ${roomResponse.status}`,
          code: 'DAILY_API_ERROR',
          details: responseText
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the successful response
    let roomData: { name?: string; url?: string; id?: string };
    try {
      roomData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[create-daily-room] Failed to parse Daily API response:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from Daily API',
          code: 'DAILY_PARSE_ERROR',
          details: responseText
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that we got the expected fields
    if (!roomData.url || !roomData.name) {
      console.error('[create-daily-room] Daily API response missing url or name:', roomData);
      return new Response(
        JSON.stringify({ 
          error: 'Daily API returned incomplete room data',
          code: 'DAILY_INCOMPLETE_RESPONSE',
          details: JSON.stringify(roomData)
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-daily-room] === ROOM CREATED SUCCESSFULLY ===');
    console.log('[create-daily-room] Room name:', roomData.name);
    console.log('[create-daily-room] Room URL:', roomData.url);
    console.log('[create-daily-room] Room ID:', roomData.id);

    // ═══════════════════════════════════════════════════════════════════════
    // 8. SAVE ROOM INFO TO DATABASE
    // ═══════════════════════════════════════════════════════════════════════
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        video_room_name: roomData.name,
        video_room_url: roomData.url,
        video_room_created_at: new Date().toISOString(),
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
    return new Response(
      JSON.stringify({
        room_name: roomData.name,
        room_url: roomData.url,
        success: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-daily-room] UNHANDLED ERROR:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: 'UNHANDLED_ERROR'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
