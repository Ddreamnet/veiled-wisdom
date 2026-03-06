import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { devLog } from '@/lib/debug';

export type ActiveCallInfo = {
  room_name: string;
  room_url: string;
  started_at: string;
  created_by: string | null;
} | null;

type ConversationRow = {
  active_call_room_name: string | null;
  active_call_room_url: string | null;
  active_call_started_at: string | null;
  active_call_ended_at: string | null;
  active_call_created_by: string | null;
  // Legacy fields (written by older edge function versions like REV3)
  video_room_name?: string | null;
  video_room_url?: string | null;
  video_room_created_at?: string | null;
};

function rowToActiveCall(row: ConversationRow | null): ActiveCallInfo {
  // Primary: new active_call_* fields (REV8+)
  if (
    row?.active_call_room_name &&
    row?.active_call_room_url &&
    row?.active_call_started_at &&
    !row?.active_call_ended_at
  ) {
    return {
      room_name: row.active_call_room_name,
      room_url: row.active_call_room_url,
      started_at: row.active_call_started_at,
      created_by: row.active_call_created_by,
    };
  }

  // LEGACY FALLBACK: Old edge function (REV3) only writes video_room_* fields.
  // If active_call fields are empty but legacy fields exist, use them.
  if (
    row?.video_room_name &&
    row?.video_room_url &&
    row?.video_room_created_at &&
    !row?.active_call_ended_at
  ) {
    devLog('useActiveCall', 'Using LEGACY video_room_* fallback (old edge function detected)');
    return {
      room_name: row.video_room_name,
      room_url: row.video_room_url,
      started_at: row.video_room_created_at,
      created_by: row.active_call_created_by ?? null, // Legacy has no created_by
    };
  }

  return null;
}

export function useActiveCall(conversationId: string | null) {
  const [activeCall, setActiveCall] = useState<ActiveCallInfo>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeConnectedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      devLog('useActiveCall', 'Polling stopped');
    }
  }, []);

  const fetchActiveCall = useCallback(async () => {
    if (!conversationId) {
      setActiveCall(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('active_call_room_name, active_call_room_url, active_call_started_at, active_call_ended_at, active_call_created_by, video_room_name, video_room_url, video_room_created_at')
        .eq('id', conversationId)
        .maybeSingle();

      if (error) {
        console.error('[useActiveCall] Error fetching:', error);
        setActiveCall(null);
        return;
      }

      if (!mountedRef.current) return;

      const row = data as ConversationRow | null;
      
      devLog('useActiveCall', 'Fetched call data:', {
        room: row?.active_call_room_name,
        started: row?.active_call_started_at,
        ended: row?.active_call_ended_at,
        createdBy: row?.active_call_created_by,
      });

      setActiveCall(rowToActiveCall(row));
    } catch (e) {
      console.error('[useActiveCall] Exception:', e);
      setActiveCall(null);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [conversationId]);

  useEffect(() => {
    mountedRef.current = true;
    realtimeConnectedRef.current = false;
    setLoading(true);
    fetchActiveCall();

    // REMOVED: Warmup invoke - causes unnecessary edge function calls (8x problem)
    // The edge function will be cold-started on first real call instead.

    if (!conversationId) return;

    // Start safety polling fallback after 3s if realtime hasn't connected
    const fallbackTimer = setTimeout(() => {
      if (!realtimeConnectedRef.current && mountedRef.current) {
        devLog('useActiveCall', 'Realtime not connected after 3s, starting polling fallback');
        startPolling();
      }
    }, 3000);

    const startPolling = () => {
      stopPolling();
      pollingRef.current = setInterval(() => {
        if (mountedRef.current) {
          devLog('useActiveCall', 'Polling fetch...');
          fetchActiveCall();
        }
      }, 3000);
    };

    const channel = supabase
      .channel(`active-call-${conversationId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as ConversationRow;
          devLog('useActiveCall', 'Realtime UPDATE received:', {
            room: row?.active_call_room_name,
            started: row?.active_call_started_at,
            ended: row?.active_call_ended_at,
            createdBy: row?.active_call_created_by,
          });
          setActiveCall(rowToActiveCall(row));
          // Realtime is working, stop polling
          stopPolling();
        }
      )
      .subscribe((status) => {
        devLog('useActiveCall', 'Channel status:', status);
        if (status === 'SUBSCRIBED') {
          realtimeConnectedRef.current = true;
          stopPolling();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          realtimeConnectedRef.current = false;
          devLog('useActiveCall', 'Realtime disconnected, starting polling fallback');
          startPolling();
        }
      });

    return () => {
      mountedRef.current = false;
      clearTimeout(fallbackTimer);
      stopPolling();
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchActiveCall, stopPolling]);

  return { activeCall, loading, refetch: fetchActiveCall };
}
