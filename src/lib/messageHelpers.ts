import { supabase } from './supabase';

/**
 * Bir konuşmadaki tüm mesajları okundu olarak işaretle
 */
export async function markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('read', false);

    if (error) throw error;
  } catch (err: any) {
    console.error('Error marking messages as read:', err);
  }
}

/**
 * Zaman damgasını göreceli formata çevir (örn: "2 saat önce", "Dün")
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Az önce';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} dakika önce`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} saat önce`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return 'Dün';
  }

  if (diffInDays < 7) {
    return `${diffInDays} gün önce`;
  }

  // 7 günden eski ise tam tarihi göster
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Mesaj saatini formatla (örn: "14:30")
 */
export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
