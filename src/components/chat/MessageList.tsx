import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Message } from '@/hooks/useMessages';
import { cn } from '@/lib/utils';
import { markMessagesAsRead } from '@/lib/messageHelpers';

type MessageListProps = {
  messages: Message[];
  loading: boolean;
  currentUserId: string | undefined;
  conversationId: string | null;
  onMessagesRead?: () => void;
};

export function MessageList({ messages, loading, currentUserId, conversationId, onMessagesRead }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMarkedAsRead = useRef(false);

  // Yeni mesaj geldiğinde otomatik scroll
  useEffect(() => {
    if (bottomRef.current && messages.length > 0) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  // Mesajlar görüntülendiğinde okundu olarak işaretle (sadece bir kere)
  useEffect(() => {
    // Konuşma değiştiğinde reset et
    hasMarkedAsRead.current = false;
  }, [conversationId]);

  useEffect(() => {
    if (conversationId && currentUserId && !hasMarkedAsRead.current) {
      // Okunmamış mesaj var mı kontrol et
      const hasUnreadMessages = messages.some(
        (msg) => msg.sender_id !== currentUserId && !msg.read
      );

      if (hasUnreadMessages) {
        hasMarkedAsRead.current = true;
        // Kısa bir gecikme sonrası okundu olarak işaretle
        const timer = setTimeout(async () => {
          await markMessagesAsRead(conversationId, currentUserId);
          // Mesajlar okunduktan sonra sayaçları güncelle
          onMessagesRead?.();
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [conversationId, currentUserId, messages.length]);

  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
            <div className="space-y-2 max-w-[70%]">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground text-center">
          Henüz mesaj yok. İlk mesajı gönderin!
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.sender_id === currentUserId;
          const time = format(new Date(message.created_at), 'HH:mm', { locale: tr });

          return (
            <div
              key={message.id}
              className={cn('flex', isOwnMessage ? 'justify-end' : 'justify-start')}
            >
              <div className={cn('max-w-[70%] space-y-1', isOwnMessage ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5 break-words',
                    isOwnMessage
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                </div>
                <span
                  className={cn(
                    'text-xs text-muted-foreground px-1',
                    isOwnMessage ? 'text-right' : 'text-left'
                  )}
                >
                  {time}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
