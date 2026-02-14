import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  audio_url: string | null;
  created_at: string;
  read: boolean;
};

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(true);
  const pollIntervalRef = useRef(2000);
  const isRealtimeConnectedRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback((convId: string) => {
    if (!isActiveRef.current) return;
    stopPolling();

    const poll = async () => {
      if (!isActiveRef.current) return;

      // Realtime bağlıysa polling'i durdur
      if (isRealtimeConnectedRef.current) {
        pollIntervalRef.current = 2000;
        return;
      }

      try {
        // Son mesajın timestamp'ini al
        const lastTimestamp = messages.length > 0
          ? messages[messages.length - 1].created_at
          : '1970-01-01T00:00:00Z';

        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', convId)
          .gt('created_at', lastTimestamp)
          .order('created_at', { ascending: true });

        if (data && data.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = data.filter((m: Message) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });
          pollIntervalRef.current = 2000; // Yeni mesaj geldi, interval'i sıfırla
        } else {
          // Değişiklik yok, backoff uygula
          pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.5, 30000);
        }
      } catch (err) {
        console.error('Polling failed:', err);
        pollIntervalRef.current = Math.min(pollIntervalRef.current * 1.5, 30000);
      }

      if (isActiveRef.current && !isRealtimeConnectedRef.current) {
        pollTimerRef.current = setTimeout(poll, pollIntervalRef.current);
      }
    };

    pollTimerRef.current = setTimeout(poll, pollIntervalRef.current);
  }, [messages, stopPolling]);

  useEffect(() => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    isActiveRef.current = true;
    isRealtimeConnectedRef.current = false;
    pollIntervalRef.current = 2000;

    // Mesajları çek
    const doFetch = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;
        setMessages(data || []);
      } catch (err: any) {
        console.error('Error fetching messages:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    doFetch();

    // Realtime subscription kur - benzersiz kanal adı ile
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `messages:${conversationId}:${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          // Realtime çalışıyor, polling'e gerek yok
          pollIntervalRef.current = 2000;
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isRealtimeConnectedRef.current = true;
          stopPolling(); // Realtime bağlandı, polling durdur
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          isRealtimeConnectedRef.current = false;
          // Fallback: polling başlat
          startPolling(conversationId);
        }
      });

    channelRef.current = channel;

    // Güvenlik: 3 saniye içinde realtime bağlanmazsa polling başlat
    const fallbackTimer = setTimeout(() => {
      if (!isRealtimeConnectedRef.current && isActiveRef.current) {
        console.log('Realtime not connected after 3s, starting polling fallback');
        startPolling(conversationId);
      }
    }, 3000);

    return () => {
      isActiveRef.current = false;
      clearTimeout(fallbackTimer);
      stopPolling();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user]);

  const sendMessage = async (body: string, audioUrl?: string): Promise<boolean> => {
    if (!conversationId || !user || (!body.trim() && !audioUrl)) return false;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      body: body.trim(),
      audio_url: audioUrl || null,
      created_at: new Date().toISOString(),
      read: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      setSending(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          body: body.trim() || null,
          audio_url: audioUrl || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setMessages((prev) =>
        prev.map((msg) => (msg.id === optimisticMessage.id ? (data as Message) : msg))
      );

      return true;
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      return false;
    } finally {
      setSending(false);
    }
  };

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    refetch: async () => {
      if (!conversationId) return;
      try {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        if (data) setMessages(data);
      } catch (err) {
        console.error('Error refetching messages:', err);
      }
    },
  };
}
