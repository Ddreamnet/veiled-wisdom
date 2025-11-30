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

    const { conversation_id } = await req.json();
    
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

    // If room already exists, return it
    if (conversation.video_room_url && conversation.video_room_name) {
      console.log('Room already exists:', conversation.video_room_name);
      return new Response(
        JSON.stringify({
          room_name: conversation.video_room_name,
          room_url: conversation.video_room_url,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new Daily room
    const roomResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          enable_screenshare: true,
          enable_chat: false,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
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
