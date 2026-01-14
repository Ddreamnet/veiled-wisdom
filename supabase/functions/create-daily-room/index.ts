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
    
    console.log('Daily API Key exists:', !!DAILY_API_KEY);
    console.log('Daily API Key length:', DAILY_API_KEY?.length);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header to verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { conversation_id, force_new } = await req.json();
    
    if (!conversation_id) {
      throw new Error("conversation_id is required");
    }

    console.log('Creating/getting Daily room for conversation:', conversation_id);

    // Get conversation with user verification
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      console.error('Conversation fetch error:', convError);
      throw new Error('Conversation not found');
    }

    // If room already exists, check if it's still valid (unless we explicitly force a new one)
    if (!force_new && conversation.video_room_url && conversation.video_room_name) {
      console.log('Checking existing room:', conversation.video_room_name);

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

        // Daily's response shape can vary; try several known locations
        const exp =
          roomInfo?.config?.exp ??
          roomInfo?.config?.properties?.exp ??
          roomInfo?.properties?.exp ??
          null;

        const now = Math.floor(Date.now() / 1000);
        console.log('Existing room exp:', exp, 'now:', now);

        if (!exp || exp > now) {
          console.log('Room is still valid:', conversation.video_room_name);
          return new Response(
            JSON.stringify({
              room_name: conversation.video_room_name,
              room_url: conversation.video_room_url,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Room has expired, creating new one...');
      } else {
        console.log('Room no longer exists, creating new one...');
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
      const errorText = await roomResponse.text();
      console.error('Daily API error:', errorText);
      throw new Error(`Daily API error: ${roomResponse.status}`);
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
    console.error('Error in create-daily-room:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
