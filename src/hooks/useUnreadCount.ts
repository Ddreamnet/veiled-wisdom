import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const hasFetchedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      if (!hasFetchedRef.current) {
        setLoading(true);
      }

      // Get all conversation IDs for the user
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      const conversationIds = participantData?.map((p) => p.conversation_id) || [];

      if (conversationIds.length === 0) {
        setUnreadCount(0);
        return;
      }

      // Count unread messages from others
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .eq('read', false);

      if (countError) throw countError;

      setUnreadCount(count || 0);
      hasFetchedRef.current = true;
    } catch (err: any) {
      console.error('Error fetching unread count:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Debounced fetch to batch rapid updates (e.g. marking multiple messages read at once)
  const debouncedFetch = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchUnreadCount();
    }, 300);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      hasFetchedRef.current = false;
      return;
    }

    // Delay initial fetch to not block critical path
    const initialFetchTimeout = setTimeout(() => {
      fetchUnreadCount();
    }, 500);

    // Setup realtime after initial fetch
    const setupRealtimeTimeout = setTimeout(() => {
      if (channelRef.current) return;

      channelRef.current = supabase
        .channel('unread-messages')
        // New message from someone else → increment locally for instant feedback
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const msg = payload.new as any;
            if (msg.sender_id !== user.id) {
              // Increment optimistically, then verify with debounced fetch
              setUnreadCount((prev) => prev + 1);
            }
          }
        )
        // Message marked as read → refetch true count (avoids old payload issues)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          (payload) => {
            const updated = payload.new as any;
            if (updated.read === true && updated.sender_id !== user.id) {
              debouncedFetch();
            }
          }
        )
        // New conversation participant → refetch to include new conversations
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'conversation_participants' },
          (payload) => {
            const participant = payload.new as any;
            if (participant.user_id === user.id) {
              debouncedFetch();
            }
          }
        )
        .subscribe();
    }, 1000);

    // Listen for custom unread count change events
    const handleUnreadCountChange = () => {
      debouncedFetch();
    };

    window.addEventListener('unread-count-changed', handleUnreadCountChange);

    return () => {
      clearTimeout(initialFetchTimeout);
      clearTimeout(setupRealtimeTimeout);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      window.removeEventListener('unread-count-changed', handleUnreadCountChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchUnreadCount, debouncedFetch]);

  return { unreadCount, loading, refetch: fetchUnreadCount };
}
