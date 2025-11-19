import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessages } from '@/hooks/useMessages';
import { ConversationWithParticipant } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ChatWindowProps = {
  conversation: ConversationWithParticipant | null;
  onBack?: () => void;
};

export function ChatWindow({ conversation, onBack }: ChatWindowProps) {
  const { user } = useAuth();
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

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-background p-4">
        <div className="flex items-center space-x-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.other_participant.avatar_url || undefined} />
            <AvatarFallback>
              {conversation.other_participant.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-base">
              {conversation.other_participant.username || 'Kullanıcı'}
            </h3>
            <p className="text-xs text-muted-foreground">Aktif</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} loading={loading} currentUserId={user?.id} />

      {/* Input */}
      <MessageInput onSendMessage={sendMessage} sending={sending} />
    </div>
  );
}
