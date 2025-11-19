import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useUnreadCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchUnreadCount();
    setupRealtimeSubscription();

    return () => {
      // Cleanup will be handled by channel reference
    };
  }, [user]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Kullanıcının dahil olduğu tüm konuşmaları bul
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

      // Bu konuşmalardaki okunmamış mesajları say
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .eq('read', false);

      if (countError) throw countError;

      setUnreadCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching unread count:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    let channel: RealtimeChannel | null = null;

    const setupChannel = async () => {
      // Kullanıcının dahil olduğu tüm konuşmaları bul
      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      const conversationIds = participantData?.map((p) => p.conversation_id) || [];

      if (conversationIds.length === 0) return;

      // Yeni mesajları ve mesaj güncellemelerini dinle
      channel = supabase
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
            if (newMessage.sender_id !== user.id && conversationIds.includes(newMessage.conversation_id)) {
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
              conversationIds.includes(updatedMessage.conversation_id) &&
              !oldMessage.read &&
              updatedMessage.read
            ) {
              setUnreadCount((prev) => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();
    };

    setupChannel();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  };

  return { unreadCount, loading, refetch: fetchUnreadCount };
}
