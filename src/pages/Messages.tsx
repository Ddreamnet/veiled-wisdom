import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSetAtom } from 'jotai';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { toast } from '@/hooks/use-toast';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { MessageCircle } from 'lucide-react';
import { isChatOpenAtom } from '@/atoms/chatAtoms';

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { conversations, loading, getOrCreateConversation, refetch: refetchConversations } = useConversations();
  const { refetch: refetchUnreadCount } = useUnreadCount();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const setIsChatOpen = useSetAtom(isChatOpenAtom);

  // URL'den userId parametresi varsa yeni konuşma başlat
  useEffect(() => {
    const userId = searchParams.get('userId');
    console.log('Messages page - userId from URL:', userId, 'current user:', user?.id);
    
    if (userId && user) {
      console.log('Starting conversation with:', userId);
      handleStartConversation(userId);
    }
  }, [searchParams, user]);

  const handleStartConversation = async (otherUserId: string) => {
    console.log('handleStartConversation called with:', otherUserId);
    const conversationId = await getOrCreateConversation(otherUserId);
    console.log('getOrCreateConversation returned:', conversationId);
    
    if (conversationId) {
      console.log('Setting selected conversation to:', conversationId);
      setSelectedConversationId(conversationId);
      setShowMobileChat(true);
      // URL'den userId parametresini temizle
      navigate('/messages', { replace: true });
    } else {
      console.log('Failed to create/get conversation');
      toast({
        title: 'Hata',
        description: 'Konuşma oluşturulamadı. Lütfen tekrar deneyin.',
        variant: 'destructive',
      });
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowMobileChat(true);
    setIsChatOpen(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    setSelectedConversationId(null);
    setIsChatOpen(false);
  };

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      setIsChatOpen(false);
    };
  }, [setIsChatOpen]);

  const handleMessagesRead = async () => {
    console.log('handleMessagesRead - Refetching conversations and unread count');
    // Konuşma listesini ve okunmamış sayacı güncelle
    await Promise.all([
      refetchConversations(),
      refetchUnreadCount()
    ]);
    console.log('handleMessagesRead - Refetch completed');
  };

  if (!user) {
    return (
      <div className="container py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Mesajlar</h1>
          <p className="text-muted-foreground max-w-md">
            Mesajlaşmak için giriş yapmalısınız.
          </p>
        </div>
      </div>
    );
  }

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null;

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:block h-[calc(100vh-4rem)]">
        <div className="container h-full py-4 md:py-6 px-2 sm:px-4">
          <div className="mb-4">
            <PageBreadcrumb />
          </div>
          <div className="h-[calc(100%-3rem)] bg-card rounded-xl border border-border overflow-hidden shadow-elegant">
            <div className="flex h-full">
              {/* Sol Panel - Konuşma Listesi */}
              <div className="w-80 lg:w-96 border-r border-border flex flex-col bg-background/50">
                <div className="p-5 border-b border-border">
                  <h2 className="text-xl font-semibold">Mesajlar</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {conversations.length} konuşma
                  </p>
                </div>
                <ConversationList
                  conversations={conversations}
                  loading={loading}
                  selectedConversationId={selectedConversationId}
                  onSelectConversation={handleSelectConversation}
                />
              </div>

              {/* Sağ Panel - Chat Penceresi */}
              <ChatWindow conversation={selectedConversation} onMessagesRead={handleMessagesRead} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - Full Screen Chat Experience */}
      <div className="md:hidden flex flex-col" style={{ height: showMobileChat ? '100dvh' : 'calc(100dvh - 80px - env(safe-area-inset-bottom))', overflow: 'hidden', touchAction: 'none' }}>
        {!showMobileChat ? (
          <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
            {/* Mobile Header */}
            <div className="flex-shrink-0 px-4 py-4 border-b border-border bg-background/95 backdrop-blur-sm">
              <h1 className="text-xl font-semibold">Mesajlar</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {conversations.length} konuşma
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ConversationList
                conversations={conversations}
                loading={loading}
                selectedConversationId={selectedConversationId}
                onSelectConversation={handleSelectConversation}
              />
            </div>
          </div>
        ) : (
          <ChatWindow 
            conversation={selectedConversation} 
            onBack={handleBackToList} 
            onMessagesRead={handleMessagesRead} 
          />
        )}
      </div>
    </>
  );
}
