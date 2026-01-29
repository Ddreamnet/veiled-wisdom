import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

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
};

export function useActiveCall(conversationId: string | null) {
  const [activeCall, setActiveCall] = useState<ActiveCallInfo>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchActiveCall = useCallback(async () => {
    if (!conversationId) {
      setActiveCall(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('active_call_room_name, active_call_room_url, active_call_started_at, active_call_ended_at, active_call_created_by')
        .eq('id', conversationId)
        .maybeSingle();

      if (error) {
        console.error('[useActiveCall] Error fetching:', error);
        setActiveCall(null);
        return;
      }

      if (!mountedRef.current) return;

      const row = data as ConversationRow | null;
      
      // Check if there's an active call (started but not ended)
      if (
        row?.active_call_room_name &&
        row?.active_call_room_url &&
        row?.active_call_started_at &&
        row?.active_call_ended_at === null
      ) {
        setActiveCall({
          room_name: row.active_call_room_name,
          room_url: row.active_call_room_url,
          started_at: row.active_call_started_at,
          created_by: row.active_call_created_by,
        });
      } else {
        setActiveCall(null);
      }
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
    setLoading(true);
    fetchActiveCall();

    // Subscribe to realtime updates for this conversation
    if (!conversationId) return;

    const channel = supabase
      .channel(`active-call-${conversationId}`)
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
          if (
            row?.active_call_room_name &&
            row?.active_call_room_url &&
            row?.active_call_started_at &&
            row?.active_call_ended_at === null
          ) {
            setActiveCall({
              room_name: row.active_call_room_name,
              room_url: row.active_call_room_url,
              started_at: row.active_call_started_at,
              created_by: row.active_call_created_by,
            });
          } else {
            setActiveCall(null);
          }
        }
      )
      .subscribe();

    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchActiveCall]);

  return { activeCall, loading, refetch: fetchActiveCall };
}
