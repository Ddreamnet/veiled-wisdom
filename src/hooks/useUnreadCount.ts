import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const conversationIdsRef = useRef<string[]>([]);
  const hasFetchedRef = useRef(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      // Only show loading on first fetch
      if (!hasFetchedRef.current) {
        setLoading(true);
      }

      // Kullanıcının dahil olduğu tüm konuşmaları bul
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      const conversationIds = participantData?.map((p) => p.conversation_id) || [];
      conversationIdsRef.current = conversationIds;

      if (conversationIds.length === 0) {
        setUnreadCount(0);
        return;
      }

      // Bu konuşmalardaki okunmamış mesajları say
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
      setupRealtimeSubscription();
    }, 1000);

    // Listen for custom unread count change events
    const handleUnreadCountChange = () => {
      fetchUnreadCount();
    };

    window.addEventListener('unread-count-changed', handleUnreadCountChange);

    return () => {
      clearTimeout(initialFetchTimeout);
      clearTimeout(setupRealtimeTimeout);
      window.removeEventListener('unread-count-changed', handleUnreadCountChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, fetchUnreadCount]);

  const setupRealtimeSubscription = () => {
    if (!user || channelRef.current) return;

    // Create channel for realtime updates
    channelRef.current = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as any;
          // Sadece başkalarından gelen mesajları say
          if (
            newMessage.sender_id !== user.id &&
            conversationIdsRef.current.includes(newMessage.conversation_id)
          ) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          const oldMessage = payload.old as any;
          // Mesaj okundu olarak işaretlendiyse ve bizim mesajımız değilse
          if (
            updatedMessage.sender_id !== user.id &&
            conversationIdsRef.current.includes(updatedMessage.conversation_id) &&
            oldMessage.read === false &&
            updatedMessage.read === true
          ) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();
  };

  return { unreadCount, loading, refetch: fetchUnreadCount };
}
