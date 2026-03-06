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
  video_room_name: string | null;
  video_room_url: string | null;
  video_room_created_at: string | null;
};

const STALE_CALL_HOURS = 4;
const PRESENCE_POLL_MS = 5000;

function isFresh(startedAt: string | null): boolean {
  if (!startedAt) return true;
  const startedMs = new Date(startedAt).getTime();
  if (Number.isNaN(startedMs)) return true;
  return Date.now() - startedMs <= STALE_CALL_HOURS * 60 * 60 * 1000;
}

function getCandidate(row: ConversationRow | null) {
  if (!row) return null;

  if (
    row.active_call_room_name &&
    row.active_call_room_url &&
    !row.active_call_ended_at &&
    isFresh(row.active_call_started_at)
  ) {
    return {
      room_name: row.active_call_room_name,
      room_url: row.active_call_room_url,
      started_at: row.active_call_started_at ?? new Date().toISOString(),
      created_by: row.active_call_created_by,
    };
  }

  // Legacy fallback
  if (row.video_room_name && row.video_room_url && isFresh(row.video_room_created_at)) {
    return {
      room_name: row.video_room_name,
      room_url: row.video_room_url,
      started_at: row.video_room_created_at ?? new Date().toISOString(),
      created_by: row.active_call_created_by,
    };
  }

  return null;
}

export function useActiveCall(conversationId: string | null) {
  const [activeCall, setActiveCall] = useState<ActiveCallInfo>(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const rowRef = useRef<ConversationRow | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const resolvePresence = useCallback(
    async (row: ConversationRow | null) => {
      const candidate = getCandidate(row);
      if (!conversationId || !candidate) {
        setActiveCall(null);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('get-daily-room-presence', {
          body: { conversation_id: conversationId },
        });

        if (!mountedRef.current) return;

        if (error) {
          console.error('[useActiveCall] Presence error:', error);
          setActiveCall({ ...candidate, participant_count: -1 });
          return;
        }

        const participantCount = Number(data?.participant_count ?? 0);
        if (participantCount > 0) {
          setActiveCall({
            room_name: data?.room_name || candidate.room_name,
            room_url: data?.room_url || candidate.room_url,
            started_at: data?.started_at || candidate.started_at,
            created_by: data?.created_by ?? candidate.created_by,
            participant_count: participantCount,
          });
        } else {
          setActiveCall(null);
        }
      } catch (e) {
        console.error('[useActiveCall] Presence exception:', e);
        if (!mountedRef.current) return;
        setActiveCall({ ...candidate, participant_count: -1 });
      }
    },
    [conversationId],
  );

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
        console.error('[useActiveCall] Fetch error:', error);
        setActiveCall(null);
        return;
      }

      if (!mountedRef.current) return;
      const row = (data as ConversationRow | null) ?? null;
      rowRef.current = row;
      await resolvePresence(row);
    } catch (e) {
      console.error('[useActiveCall] Exception:', e);
      setActiveCall(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [conversationId, resolvePresence]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchActiveCall();

    stopPolling();
    if (conversationId) {
      pollRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        if (rowRef.current) {
          resolvePresence(rowRef.current);
        } else {
          fetchActiveCall();
        }
      }, PRESENCE_POLL_MS);
    }

    const channel = conversationId
      ? supabase
          .channel(`active-call-${conversationId}-${Date.now()}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conversationId}` },
            (payload) => {
              const row = payload.new as ConversationRow;
              rowRef.current = row;
              resolvePresence(row);
            },
          )
          .subscribe((status) => devLog('useActiveCall', 'Channel:', status))
      : null;

    return () => {
      mountedRef.current = false;
      stopPolling();
      if (channel) supabase.removeChannel(channel);
    };
  }, [conversationId, fetchActiveCall, resolvePresence, stopPolling]);

  return { activeCall, loading, refetch: fetchActiveCall };
}
