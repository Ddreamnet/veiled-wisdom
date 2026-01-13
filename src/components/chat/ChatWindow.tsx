import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessages } from '@/hooks/useMessages';
import { ConversationWithParticipant } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/AuthContext';
import { Video, ArrowLeft, MessageCircle } from 'lucide-react';
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

  // Empty state - no conversation selected
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
        <div className="text-center p-8 max-w-md">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Bir konuşma seçin</h3>
          <p className="text-sm text-muted-foreground">
            Sol taraftaki listeden bir konuşma seçerek mesajlaşmaya başlayın
          </p>
        </div>
      </div>
    );
  }

  const presenceStatus = formatPresenceStatus(conversation.other_participant.last_seen);
  const isMobile = onBack !== undefined;

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Modern Header */}
      <div 
        className={cn(
          "border-b border-border bg-background/95 backdrop-blur-sm",
          isMobile ? "px-3 py-3" : "px-4 py-3"
        )}
        style={isMobile ? { paddingTop: "max(12px, env(safe-area-inset-top))" } : undefined}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left Section: Back + User Info */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Back Button - Mobile only */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-10 w-10 rounded-full flex-shrink-0 hover:bg-muted/80"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}

            {/* User Info - Clickable */}
            <Link
              to={`/profile/${conversation.other_participant.id}`}
              className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
            >
              <div className="relative flex-shrink-0">
                <Avatar className={cn("ring-2 ring-background", isMobile ? "h-10 w-10" : "h-11 w-11")}>
                  <AvatarImage src={conversation.other_participant.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {conversation.other_participant.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                {presenceStatus.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background ring-2 ring-green-500/20" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base truncate leading-tight">
                  {conversation.other_participant.username || 'Kullanıcı'}
                </h3>
                <p className={cn(
                  'text-xs truncate',
                  presenceStatus.isOnline ? 'text-green-500 font-medium' : 'text-muted-foreground'
                )}>
                  {presenceStatus.text}
                </p>
              </div>
            </Link>
          </div>

          {/* Right Section: Video Call */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/call/${conversation.id}`)}
            className={cn(
              "rounded-full flex-shrink-0 hover:bg-primary/10 hover:text-primary transition-colors",
              isMobile ? "h-10 w-10" : "h-11 w-11"
            )}
          >
            <Video className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <MessageList 
        messages={messages} 
        loading={loading} 
        currentUserId={user?.id} 
        conversationId={conversation.id}
        onMessagesRead={onMessagesRead}
      />

      {/* Input Area */}
      <MessageInput onSendMessage={sendMessage} sending={sending} />
    </div>
  );
}
