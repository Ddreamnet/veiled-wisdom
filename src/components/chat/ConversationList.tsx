import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ConversationWithParticipant } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";
import { formatPresenceStatus } from "@/hooks/usePresence";
import { MessageCircle } from "lucide-react";

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
  // Loading State
  if (loading) {
    return (
      <div className="flex-1 p-3 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div 
            key={i} 
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 animate-pulse"
          >
            <Skeleton className="h-13 w-13 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-3.5 w-full max-w-[180px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty State
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-[240px]">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium mb-1">Henüz konuşmanız yok</p>
          <p className="text-sm text-muted-foreground/70">
            Bir uzman profiline giderek mesaj gönderebilirsiniz
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-2 space-y-1 pb-4">
        {conversations.map((conversation) => {
          const isSelected = conversation.id === selectedConversationId;
          const presenceStatus = formatPresenceStatus(conversation.other_participant.last_seen);
          const hasUnread = conversation.unread_count > 0;
          
          // Message preview with audio support
          let messagePreview = "Henüz mesaj yok";
          if (conversation.last_message?.body) {
            const body = conversation.last_message.body;
            messagePreview = body.length > 30 ? body.substring(0, 30) + "..." : body;
          }

          const timeAgo = conversation.last_message?.created_at
            ? formatDistanceToNow(new Date(conversation.last_message.created_at), {
                addSuffix: false,
                locale: tr,
              })
            : "";

          return (
            <button
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group",
                isSelected 
                  ? "bg-primary/10 shadow-sm" 
                  : "hover:bg-muted/50 active:bg-muted/70"
              )}
            >
              {/* Avatar with Online Indicator */}
              <div className="relative flex-shrink-0">
                <Avatar className={cn(
                  "h-13 w-13 ring-2 transition-all",
                  isSelected ? "ring-primary/30" : "ring-transparent group-hover:ring-muted"
                )}>
                  <AvatarImage src={conversation.other_participant.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-base">
                    {conversation.other_participant.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {presenceStatus.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-[2.5px] border-background shadow-sm" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 py-0.5">
                {/* Top Row: Name + Time */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className={cn(
                    "font-medium text-sm truncate",
                    hasUnread && "text-foreground"
                  )}>
                    {conversation.other_participant.username || "Kullanıcı"}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {timeAgo && (
                      <span className={cn(
                        "text-xs",
                        hasUnread ? "text-primary font-medium" : "text-muted-foreground"
                      )}>
                        {timeAgo}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Message Preview + Badge */}
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "text-sm truncate flex-1",
                    hasUnread 
                      ? "text-foreground font-medium" 
                      : "text-muted-foreground"
                  )}>
                    {messagePreview}
                  </p>
                  {hasUnread && (
                    <Badge
                      className={cn(
                        "h-5 min-w-5 flex items-center justify-center p-0 px-1.5 text-xs font-semibold",
                        "bg-primary text-primary-foreground shadow-sm animate-in zoom-in-50 duration-200"
                      )}
                    >
                      {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
