import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { devLog } from '@/lib/debug';

export type ActiveCallInfo = {
  room_name: string;
  room_url: string;
  started_at: string;
  created_by: string | null;
  participant_count: number;
} | null;

type ConversationRow = {
  active_call_room_name: string | null;
  active_call_room_url: string | null;
  active_call_started_at: string | null;
  active_call_ended_at: string | null;
  active_call_created_by: string | null;
};

const STALE_CALL_HOURS = 4;
const PRESENCE_POLL_MS = 5000; // Check presence every 5s

function isRowActive(row: ConversationRow | null): boolean {
  if (
    !row?.active_call_room_name ||
    !row?.active_call_room_url ||
    !row?.active_call_started_at ||
    row?.active_call_ended_at
  ) {
    return false;
  }
  const startedAt = new Date(row.active_call_started_at).getTime();
  if (Date.now() - startedAt > STALE_CALL_HOURS * 60 * 60 * 1000) {
    devLog('useActiveCall', 'Ignoring stale call older than 4h');
    return false;
  }
  return true;
}

export function useActiveCall(conversationId: string | null) {
  const [activeCall, setActiveCall] = useState<ActiveCallInfo>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const presenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRowRef = useRef<ConversationRow | null>(null);

  // ── Check presence via edge function ──────────────────────────────────
  const checkPresence = useCallback(async (row: ConversationRow) => {
    if (!conversationId || !isRowActive(row)) {
      setActiveCall(null);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-daily-room-presence', {
        body: { conversation_id: conversationId },
      });

      if (!mountedRef.current) return;

      if (error) {
        console.error('[useActiveCall] Presence check failed:', error);
        // On error, still show the call based on DB state (graceful degradation)
        setActiveCall({
          room_name: row.active_call_room_name!,
          room_url: row.active_call_room_url!,
          started_at: row.active_call_started_at!,
          created_by: row.active_call_created_by,
          participant_count: -1, // unknown
        });
        return;
      }

      const participantCount = data?.participant_count ?? 0;
      devLog('useActiveCall', 'Presence result:', {
        room: data?.room_name,
        count: participantCount,
        version: data?.function_version,
      });

      if (participantCount > 0) {
        setActiveCall({
          room_name: row.active_call_room_name!,
          room_url: row.active_call_room_url!,
          started_at: row.active_call_started_at!,
          created_by: row.active_call_created_by,
          participant_count: participantCount,
        });
      } else {
        setActiveCall(null);
      }
    } catch (e) {
      console.error('[useActiveCall] Presence exception:', e);
    }
  }, [conversationId]);

  // ── Fetch DB row + check presence ─────────────────────────────────────
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
      lastRowRef.current = row;

      if (row && isRowActive(row)) {
        await checkPresence(row);
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
  }, [conversationId, checkPresence]);

  // ── Start/stop presence polling ───────────────────────────────────────
  const stopPresencePolling = useCallback(() => {
    if (presenceTimerRef.current) {
      clearInterval(presenceTimerRef.current);
      presenceTimerRef.current = null;
    }
  }, []);

  const startPresencePolling = useCallback(() => {
    stopPresencePolling();
    presenceTimerRef.current = setInterval(() => {
      if (mountedRef.current && lastRowRef.current && isRowActive(lastRowRef.current)) {
        checkPresence(lastRowRef.current);
      }
    }, PRESENCE_POLL_MS);
  }, [stopPresencePolling, checkPresence]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchActiveCall();

    if (!conversationId) return;

    // Start presence polling
    startPresencePolling();

    // Realtime: when DB row changes, re-check presence
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
          devLog('useActiveCall', 'Realtime UPDATE:', {
            room: row?.active_call_room_name,
            ended: row?.active_call_ended_at,
          });
          lastRowRef.current = row;

          if (row && isRowActive(row)) {
            // DB says active → verify with presence
            checkPresence(row);
          } else {
            setActiveCall(null);
          }
        }
      )
      .subscribe((status) => {
        devLog('useActiveCall', 'Channel status:', status);
      });

    return () => {
      mountedRef.current = false;
      stopPresencePolling();
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchActiveCall, startPresencePolling, stopPresencePolling, checkPresence]);

  return { activeCall, loading, refetch: fetchActiveCall };
}
