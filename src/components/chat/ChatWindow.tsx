import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessages } from '@/hooks/useMessages';
import { ConversationWithParticipant } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { formatPresenceStatus } from '@/hooks/usePresence';
import { cn } from '@/lib/utils';

type ChatWindowProps = {
  conversation: ConversationWithParticipant | null;
  onBack?: () => void;
  onMessagesRead?: () => void;
};

export function ChatWindow({ conversation, onBack, onMessagesRead }: ChatWindowProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { messages, loading, sending, sendMessage } = useMessages(conversation?.id || null);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center p-8">
          <p className="text-muted-foreground text-lg">Bir konuşma seçin</p>
          <p className="text-sm text-muted-foreground mt-2">
            Sol taraftaki listeden bir konuşma seçerek mesajlaşmaya başlayın
          </p>
        </div>
      </div>
    );
  }

  const presenceStatus = formatPresenceStatus(conversation.other_participant.last_seen);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <Link
            to={`/profile/${conversation.other_participant.id}`}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={conversation.other_participant.avatar_url || undefined} />
                <AvatarFallback>
                  {conversation.other_participant.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {presenceStatus.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-base">
                {conversation.other_participant.username || 'Kullanıcı'}
              </h3>
              <p className={cn(
                'text-xs',
                presenceStatus.isOnline ? 'text-green-500' : 'text-muted-foreground'
              )}>
                {presenceStatus.text}
              </p>
            </div>
          </Link>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/call/${conversation.id}`)}
            className="gap-2"
          >
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Görüntülü Ara</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <MessageList 
        messages={messages} 
        loading={loading} 
        currentUserId={user?.id} 
        conversationId={conversation.id}
        onMessagesRead={onMessagesRead}
      />

      {/* Input */}
      <MessageInput onSendMessage={sendMessage} sending={sending} />
    </div>
  );
}
