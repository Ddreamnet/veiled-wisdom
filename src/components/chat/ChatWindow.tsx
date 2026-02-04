import { useCallback, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useMessages } from '@/hooks/useMessages';
import { ConversationWithParticipant } from '@/hooks/useConversations';
import { useActiveCall } from '@/hooks/useActiveCall';
import { useAuth } from '@/contexts/AuthContext';
import { Video, ArrowLeft, MessageCircle, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { formatPresenceStatus } from '@/hooks/usePresence';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type ChatWindowProps = {
  conversation: ConversationWithParticipant | null;
  onBack?: () => void;
  onMessagesRead?: () => void;
};

export function ChatWindow({ conversation, onBack, onMessagesRead }: ChatWindowProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { messages, loading, sending, sendMessage } = useMessages(conversation?.id || null);
  const { activeCall } = useActiveCall(conversation?.id || null);
  
  // OPTIMIZATION: Prefetch media permissions on hover/focus to reduce join time
  const mediaPreloadedRef = useRef(false);
  const prefetchMediaPermissions = useCallback(async () => {
    if (mediaPreloadedRef.current) return;
    mediaPreloadedRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      stream.getTracks().forEach(t => t.stop());
      console.log('[ChatWindow] Media permissions prefetched');
    } catch (e) {
      // Permission denied or not available - that's fine, will be handled during call
      console.log('[ChatWindow] Media prefetch skipped:', e);
    }
  }, []);

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

  // Check if the active call was started by someone else (so we show "Join" banner)
  const isCallStartedByOther = activeCall && activeCall.created_by !== user?.id;

  const handleJoinCall = () => {
    // Pass roomUrl to skip edge function call for joiner (OPTIMIZATION)
    const roomUrl = activeCall?.room_url;
    const params = new URLSearchParams({ intent: 'join' });
    if (roomUrl) params.set('roomUrl', roomUrl);
    navigate(`/call/${conversation.id}?${params.toString()}`);
  };

  const handleStartCall = () => {
    navigate(`/call/${conversation.id}`);
  };

  return (
    <div className={cn("flex-1 flex flex-col bg-background", isMobile && "h-full overflow-hidden")}>
      {/* Active Call Banner */}
      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-green-500/10 border-b border-green-500/30 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 text-green-500 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-green-400 truncate">
                      {isCallStartedByOther ? 'Aktif görüşme var' : 'Görüşmeniz devam ediyor'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {isCallStartedByOther 
                        ? `${conversation.other_participant.username || 'Kullanıcı'} aramada`
                        : 'Katılmak için tıklayın'
                      }
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleJoinCall}
                  className="bg-green-500 hover:bg-green-600 text-white flex-shrink-0"
                >
                  <Phone className="h-4 w-4 mr-1.5" />
                  Katıl
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            onClick={activeCall ? handleJoinCall : handleStartCall}
            onMouseEnter={prefetchMediaPermissions}
            onFocus={prefetchMediaPermissions}
            className={cn(
              "rounded-full flex-shrink-0 transition-colors",
              isMobile ? "h-10 w-10" : "h-11 w-11",
              activeCall 
                ? "bg-green-500/10 hover:bg-green-500/20 text-green-500" 
                : "hover:bg-primary/10 hover:text-primary"
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
