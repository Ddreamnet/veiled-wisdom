import { useEffect, useRef, useMemo } from 'react';
import { format, isToday, isYesterday, isThisWeek, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Message } from '@/hooks/useMessages';
import { cn } from '@/lib/utils';
import { markMessagesAsRead } from '@/lib/messageHelpers';
import { AudioMessage } from './AudioMessage';
import { MessageCircle, Check, CheckCheck } from 'lucide-react';

type MessageListProps = {
  messages: Message[];
  loading: boolean;
  currentUserId: string | undefined;
  conversationId: string | null;
  onMessagesRead?: () => void;
};

// WhatsApp style date format
function formatDateSeparator(date: Date): string {
  if (isToday(date)) {
    return 'Bugün';
  }
  if (isYesterday(date)) {
    return 'Dün';
  }
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return format(date, 'EEEE', { locale: tr });
  }
  return format(date, 'd MMMM yyyy', { locale: tr });
}

// Group messages by date
function groupMessagesByDate(messages: Message[]): { date: Date; messages: Message[] }[] {
  const groups: { date: Date; messages: Message[] }[] = [];
  
  messages.forEach((message) => {
    const messageDate = new Date(message.created_at);
    const lastGroup = groups[groups.length - 1];
    
    if (lastGroup && isSameDay(lastGroup.date, messageDate)) {
      lastGroup.messages.push(message);
    } else {
      groups.push({
        date: messageDate,
        messages: [message],
      });
    }
  });
  
  return groups;
}

// Date Separator Component
function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center justify-center my-6">
      <div className="bg-muted/80 backdrop-blur-sm text-muted-foreground text-xs font-medium px-4 py-1.5 rounded-full shadow-sm border border-border/50">
        {formatDateSeparator(date)}
      </div>
    </div>
  );
}

export function MessageList({ messages, loading, currentUserId, conversationId, onMessagesRead }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasMarkedAsRead = useRef(false);

  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (bottomRef.current && messages.length > 0) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);

  // Reset read status on conversation change
  useEffect(() => {
    hasMarkedAsRead.current = false;
  }, [conversationId]);

  // Mark messages as read
  useEffect(() => {
    if (conversationId && currentUserId && !hasMarkedAsRead.current) {
      const hasUnreadMessages = messages.some(
        (msg) => msg.sender_id !== currentUserId && !msg.read
      );

      if (hasUnreadMessages) {
        hasMarkedAsRead.current = true;
        const timer = setTimeout(async () => {
          await markMessagesAsRead(conversationId, currentUserId);
          onMessagesRead?.();
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [conversationId, currentUserId, messages.length, onMessagesRead]);

  // Loading State
  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
            <div className={cn("space-y-2", i % 2 === 0 ? 'items-end' : 'items-start')}>
              <Skeleton className={cn(
                "rounded-2xl",
                i % 2 === 0 ? "rounded-tr-sm" : "rounded-tl-sm",
                i === 1 ? "h-12 w-48" : i === 2 ? "h-16 w-56" : i === 3 ? "h-10 w-32" : "h-14 w-44"
              )} />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty State
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-[280px]">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground font-medium mb-1">Henüz mesaj yok</p>
          <p className="text-sm text-muted-foreground/70">
            Sohbete başlamak için bir mesaj gönderin!
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 [&_[data-radix-scroll-area-viewport]]:!overflow-y-auto [&_[data-radix-scroll-area-scrollbar]]:w-1 [&_[data-radix-scroll-area-scrollbar]]:my-2 [&_[data-radix-scroll-area-thumb]]:bg-primary/50 [&_[data-radix-scroll-area-thumb]]:rounded-full [&_[data-radix-scroll-area-thumb]]:hover:bg-primary/70" ref={scrollRef}>
      <div className="p-4 space-y-1">
        {groupedMessages.map((group) => (
          <div key={group.date.toISOString()}>
            <DateSeparator date={group.date} />
            
            <div className="space-y-2">
              {group.messages.map((message, index) => {
                const isOwnMessage = message.sender_id === currentUserId;
                const time = format(new Date(message.created_at), 'HH:mm', { locale: tr });
                
                // Check if consecutive message from same sender
                const prevMessage = group.messages[index - 1];
                const isConsecutive = prevMessage && prevMessage.sender_id === message.sender_id;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      isOwnMessage ? 'justify-end' : 'justify-start',
                      isConsecutive ? 'mt-0.5' : 'mt-3'
                    )}
                  >
                    <div className={cn(
                      'max-w-[80%] sm:max-w-[70%]',
                      isOwnMessage ? 'items-end' : 'items-start'
                    )}>
                      {/* Audio Message */}
                      {message.audio_url ? (
                        <div className="space-y-1">
                          <AudioMessage audioUrl={message.audio_url} isOwnMessage={isOwnMessage} />
                          <div className={cn(
                            "flex items-center gap-1 px-1",
                            isOwnMessage ? "justify-end" : "justify-start"
                          )}>
                            <span className="text-[11px] text-muted-foreground">{time}</span>
                            {isOwnMessage && (
                              <CheckCheck className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Text Message */
                        <div className="space-y-1">
                          <div
                            className={cn(
                              'px-4 py-2.5 break-words shadow-sm',
                              isOwnMessage
                                ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-md'
                                : 'bg-muted text-foreground rounded-2xl rounded-tl-md',
                              // Add subtle gradient for own messages
                              isOwnMessage && 'bg-gradient-to-br from-primary to-primary/90'
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.body}</p>
                          </div>
                          <div className={cn(
                            "flex items-center gap-1 px-1",
                            isOwnMessage ? "justify-end" : "justify-start"
                          )}>
                            <span className="text-[11px] text-muted-foreground">{time}</span>
                            {isOwnMessage && (
                              <CheckCheck className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} className="h-2" />
      </div>
    </ScrollArea>
  );
}
