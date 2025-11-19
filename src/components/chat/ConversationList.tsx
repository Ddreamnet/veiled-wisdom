import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ConversationWithParticipant } from '@/hooks/useConversations';
import { cn } from '@/lib/utils';

type ConversationListProps = {
  conversations: ConversationWithParticipant[];
  loading: boolean;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
};

export function ConversationList({
  conversations,
  loading,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <p className="text-muted-foreground">Henüz konuşmanız yok</p>
          <p className="text-sm text-muted-foreground mt-2">
            Bir hoca profiline giderek mesaj gönderebilirsiniz
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => {
          const isSelected = conversation.id === selectedConversationId;
          const truncatedMessage = conversation.last_message?.body
            ? conversation.last_message.body.length > 50
              ? conversation.last_message.body.substring(0, 50) + '...'
              : conversation.last_message.body
            : 'Henüz mesaj yok';

          const timeAgo = conversation.last_message?.created_at
            ? formatDistanceToNow(new Date(conversation.last_message.created_at), {
                addSuffix: true,
                locale: tr,
              })
            : '';

          return (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={cn(
                'w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left',
                isSelected
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-accent/50 border border-transparent'
              )}
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={conversation.other_participant.avatar_url || undefined} />
                <AvatarFallback>
                  {conversation.other_participant.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm truncate">
                    {conversation.other_participant.username || 'Kullanıcı'}
                  </p>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    {timeAgo && (
                      <span className="text-xs text-muted-foreground">
                        {timeAgo}
                      </span>
                    )}
                    {conversation.unread_count > 0 && (
                      <Badge 
                        variant="default" 
                        className="h-5 min-w-5 flex items-center justify-center p-0 px-1.5 text-xs"
                      >
                        {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className={cn(
                  "text-sm truncate",
                  conversation.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {truncatedMessage}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
