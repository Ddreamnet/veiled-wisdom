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

      // Kullanıcının dahil olduğu konuşmaları çek
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      const conversationIds = participantData?.map((p) => p.conversation_id) || [];

      if (conversationIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Her konuşma için bilgileri çek
      const conversationsPromises = conversationIds.map(async (convId) => {
        // Konuşma bilgisi
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', convId)
          .single();

        if (convError) throw convError;

        // Diğer katılımcıyı bul
        const { data: otherParticipant, error: otherError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', convId)
          .neq('user_id', user.id)
          .single();

        if (otherError) throw otherError;

        // Diğer katılımcının profil bilgisi
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', otherParticipant.user_id)
          .single();

        if (profileError) throw profileError;

        // Son mesaj
        const { data: lastMessage, error: lastMessageError } = await supabase
          .from('messages')
          .select('body, created_at')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastMessageError) throw lastMessageError;

        return {
          ...convData,
          other_participant: profileData,
          last_message: lastMessage,
        };
      });

      const conversationsData = await Promise.all(conversationsPromises);

      // Son mesaja göre sırala
      conversationsData.sort((a, b) => {
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });

      setConversations(conversationsData);
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Yeni konuşma oluştur veya var olanı bul
  const getOrCreateConversation = async (otherUserId: string): Promise<string | null> => {
    if (!user) return null;

    try {
      // Önce bu iki kullanıcı arasında konuşma var mı kontrol et
      const { data: existingParticipants, error: checkError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (checkError) throw checkError;

      if (existingParticipants && existingParticipants.length > 0) {
        // Her konuşmada diğer kullanıcı var mı kontrol et
        for (const participant of existingParticipants) {
          const { data: otherParticipant, error: otherError } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', participant.conversation_id)
            .eq('user_id', otherUserId)
            .maybeSingle();

          if (otherError) throw otherError;

          if (otherParticipant) {
            // Konuşma zaten var
            return participant.conversation_id;
          }
        }
      }

      // Konuşma yok, yeni oluştur
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (createError) throw createError;

      // Her iki kullanıcıyı da katılımcı olarak ekle
      const { error: participantError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConversation.id, user_id: user.id },
          { conversation_id: newConversation.id, user_id: otherUserId },
        ]);

      if (participantError) throw participantError;

      // Listeyi yenile
      await fetchConversations();

      return newConversation.id;
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
