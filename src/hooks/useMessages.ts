import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    fetchMessages();
    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user]);

  const fetchMessages = async () => {
    if (!conversationId) return;

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

  const setupRealtimeSubscription = () => {
    if (!conversationId) return;

    // Önceki channel'ı temizle
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Yeni channel oluştur ve mesaj insert event'lerini dinle
    const channel = supabase
      .channel(`messages:${conversationId}`)
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
            // Duplicate kontrolü
            if (prev.find((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const sendMessage = async (body: string): Promise<boolean> => {
    if (!conversationId || !user || !body.trim()) return false;

    try {
      setSending(true);
      setError(null);

      const { error: insertError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: body.trim(),
      });

      if (insertError) throw insertError;

      return true;
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message);
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
    refetch: fetchMessages,
  };
}
