import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type ConversationWithParticipant = {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  other_participant: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
  last_message: {
    body: string;
    created_at: string;
  } | null;
  unread_count: number;
};

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // RPC fonksiyonu ile konuşmaları çek (RLS bypass)
      const { data, error } = await supabase.rpc('get_user_conversations', {
        user_uuid: user.id
      });

      if (error) throw error;

      // Veriyi uygun formata dönüştür
      const formattedConversations = await Promise.all(
        (data || []).map(async (row: any) => {
          // Her konuşma için okunmamış mesaj sayısını hesapla
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', row.conversation_id)
            .neq('sender_id', user.id)
            .eq('read', false);

          return {
            id: row.conversation_id,
            created_at: row.conversation_created_at,
            updated_at: row.conversation_updated_at,
            last_message_at: row.last_message_at,
            other_participant: {
              id: row.other_user_id,
              username: row.other_username,
              avatar_url: row.other_avatar_url,
            },
            last_message: row.last_message_body ? {
              body: row.last_message_body,
              created_at: row.last_message_created_at,
            } : null,
            unread_count: count || 0,
          };
        })
      );

      setConversations(formattedConversations);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Yeni konuşma oluştur veya var olanı bul
  const getOrCreateConversation = async (otherUserId: string): Promise<string | null> => {
    if (!user) {
      console.log('No user logged in');
      return null;
    }

    console.log('getOrCreateConversation - current user:', user.id, 'other user:', otherUserId);

    try {
      // Supabase RPC fonksiyonu kullanarak konuşma oluştur/bul
      console.log('Calling RPC function: get_or_create_conversation');
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        other_user_id: otherUserId
      });

      console.log('RPC response - data:', data, 'error:', error);

      if (error) throw error;

      // Listeyi yenile
      console.log('Refreshing conversations list');
      await fetchConversations();

      console.log('Returning conversation ID:', data);
      return data;
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      setError(err.message);
      return null;
    }
  };

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
    getOrCreateConversation,
  };
}
