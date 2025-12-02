import { useEffect, useState, useCallback, useRef } from 'react';
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
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      hasFetchedRef.current = false;
      return;
    }

    fetchConversations();
  }, [user]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      // Only show loading on first fetch
      if (!hasFetchedRef.current) {
        setLoading(true);
      }
      setError(null);

      // RPC fonksiyonu ile konuşmaları çek (RLS bypass)
      const { data, error } = await supabase.rpc('get_user_conversations', {
        user_uuid: user.id
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        setConversations([]);
        hasFetchedRef.current = true;
        return;
      }

      // Get all conversation IDs
      const conversationIds = data.map((row: any) => row.conversation_id);

      // Batch fetch all unread counts in a single query
      const { data: unreadData } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .eq('read', false);

      // Count unread messages per conversation
      const unreadCounts: Record<string, number> = {};
      (unreadData || []).forEach((msg: any) => {
        unreadCounts[msg.conversation_id] = (unreadCounts[msg.conversation_id] || 0) + 1;
      });

      // Format conversations with unread counts
      const formattedConversations = data.map((row: any) => ({
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
        unread_count: unreadCounts[row.conversation_id] || 0,
      }));

      setConversations(formattedConversations);
      hasFetchedRef.current = true;
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
