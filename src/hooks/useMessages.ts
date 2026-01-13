import { useEffect, useState, useRef } from 'react';
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

      console.log('Fetching messages for conversation:', conversationId);

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      console.log('Messages fetched:', data?.length || 0, 'Error:', fetchError);

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

    console.log('Setting up realtime subscription for conversation:', conversationId);

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
          console.log('Realtime message received:', payload);
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            // Duplicate kontrolü
            if (prev.find((m) => m.id === newMessage.id)) {
              console.log('Duplicate message, skipping:', newMessage.id);
              return prev;
            }
            console.log('Adding new message to list:', newMessage.id);
            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    channelRef.current = channel;
  };

  const sendMessage = async (body: string, audioUrl?: string): Promise<boolean> => {
    if (!conversationId || !user || (!body.trim() && !audioUrl)) return false;

    // Optimistic update: mesajı hemen ekle
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: user.id,
      body: body.trim(),
      audio_url: audioUrl || null,
      created_at: new Date().toISOString(),
      read: true, // Kendi mesajımız okunmuş sayılır
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      setSending(true);
      setError(null);

      console.log('Sending message:', body.trim());

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

      console.log('Message sent successfully:', data);

      // Gerçek mesajı optimistic message ile değiştir
      setMessages((prev) =>
        prev.map((msg) => (msg.id === optimisticMessage.id ? (data as Message) : msg))
      );

      return true;
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message);
      // Hata durumunda optimistic message'ı kaldır
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
    refetch: fetchMessages,
  };
}
