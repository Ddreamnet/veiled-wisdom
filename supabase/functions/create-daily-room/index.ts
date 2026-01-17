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
    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    if (!DAILY_API_KEY) {
      throw new Error("DAILY_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // --- Auth (JWT validation in-code; verify_jwt=false in config.toml) ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authedUserId = claimsData.claims.sub as string;

    // Service client for DB writes/reads
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { conversation_id, force_new } = await req.json();

    if (!conversation_id) {
      return new Response(
        JSON.stringify({ error: 'conversation_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-daily-room] conversation_id:', conversation_id, 'force_new:', !!force_new, 'user:', authedUserId);

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .maybeSingle();

    if (convError || !conversation) {
      console.error('[create-daily-room] Conversation fetch error:', convError);
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization: only participants can create/get a room for this conversation
    const isParticipant = conversation.teacher_id === authedUserId || conversation.student_id === authedUserId;
    if (!isParticipant) {
      console.warn('[create-daily-room] Forbidden - user not participant', { authedUserId, teacher_id: conversation.teacher_id, student_id: conversation.student_id });
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If room already exists, check if it's still valid (unless we explicitly force a new one)
    if (!force_new && conversation.video_room_url && conversation.video_room_name) {
      console.log('[create-daily-room] Checking existing room:', conversation.video_room_name);

      // Verify room is still valid by calling Daily API
      const roomCheckResponse = await fetch(
        `https://api.daily.co/v1/rooms/${conversation.video_room_name}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
          },
        }
      );

      if (roomCheckResponse.ok) {
        const roomInfo = await roomCheckResponse.json();

        // IMPORTANT: Always trust Daily API as the source of truth.
        // We've seen cases where DB holds an URL under a different domain, causing Daily "no-room".
        const apiRoomName = roomInfo?.name ?? conversation.video_room_name;
        const apiRoomUrl = roomInfo?.url ?? conversation.video_room_url;

        // Daily's response shape can vary; try several known locations
        const exp =
          roomInfo?.config?.exp ??
          roomInfo?.config?.properties?.exp ??
          roomInfo?.properties?.exp ??
          null;

        const now = Math.floor(Date.now() / 1000);
        console.log('[create-daily-room] Existing room check:', { apiRoomName, apiRoomUrl, exp, now });

        if (!exp || exp > now) {
          // If stored fields drifted (common when domain changes), heal the DB.
          if (apiRoomName !== conversation.video_room_name || apiRoomUrl !== conversation.video_room_url) {
            console.warn('[create-daily-room] Stored room info differs from Daily API; repairing conversation fields', {
              stored: { name: conversation.video_room_name, url: conversation.video_room_url },
              api: { name: apiRoomName, url: apiRoomUrl },
            });

            await supabase
              .from('conversations')
              .update({
                video_room_name: apiRoomName,
                video_room_url: apiRoomUrl,
                video_room_created_at: conversation.video_room_created_at ?? new Date().toISOString(),
              })
              .eq('id', conversation_id);
          }

          console.log('[create-daily-room] Room is still valid (returning API URL):', apiRoomName);
          return new Response(
            JSON.stringify({
              room_name: apiRoomName,
              room_url: apiRoomUrl,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[create-daily-room] Room has expired, creating new one...');
      } else {
        const checkText = await roomCheckResponse.text().catch(() => '');
        console.warn('[create-daily-room] Room check failed; creating new one...', {
          status: roomCheckResponse.status,
          body: checkText,
        });
      }

      // Clear old room info before creating new one
      await supabase
        .from('conversations')
        .update({
          video_room_name: null,
          video_room_url: null,
          video_room_created_at: null,
        })
        .eq('id', conversation_id);
    }

    // If client requests a fresh room, clear old room fields first
    if (force_new && (conversation.video_room_url || conversation.video_room_name)) {
      console.log('force_new requested; clearing stored room fields for conversation:', conversation_id);
      await supabase
        .from('conversations')
        .update({
          video_room_name: null,
          video_room_url: null,
          video_room_created_at: null,
        })
        .eq('id', conversation_id);
    }

    // Create new Daily room with optimized settings
    // Use an explicit unique name so Daily can never "reuse" an old/expired room name.
    // Daily room names must be <= 41 chars and can include [a-zA-Z0-9_-]
    const ts = Math.floor(Date.now() / 1000);
    const compactId = String(conversation_id).replace(/-/g, '');
    const roomName = `c${compactId.slice(0, 16)}-${ts}`;

    const roomResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          // Participant limit (2 users + 1 potential admin spectator)
          max_participants: 3,
          // Room features
          enable_screenshare: true,
          enable_chat: false,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
          // Enable adaptive streaming for optimal quality based on network
          enable_advanced_chat: false,
          enable_prejoin_ui: false,
          // Owner metadata for debugging in Daily dashboard
          owner_id: conversation.teacher_id || conversation.student_id || 'unknown',
          // Room expiration (24 hours)
          exp: ts + (60 * 60 * 24),
        },
      }),
    });

    if (!roomResponse.ok) {
      const errorText = await roomResponse.text().catch(() => '');
      console.error('[create-daily-room] Daily API create room error:', {
        status: roomResponse.status,
        body: errorText,
        roomName,
      });
      throw new Error(`Daily API error ${roomResponse.status}: ${errorText || 'no body'}`);
    }

    const roomData = await roomResponse.json();
    console.log('Daily room created:', roomData.name);

    // Update conversation with room info
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        video_room_name: roomData.name,
        video_room_url: roomData.url,
        video_room_created_at: new Date().toISOString(),
      })
      .eq('id', conversation_id);

    if (updateError) {
      console.error('Failed to update conversation:', updateError);
      throw new Error('Failed to save room info');
    }

    return new Response(
      JSON.stringify({
        room_name: roomData.name,
        room_url: roomData.url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[create-daily-room] Unhandled error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
