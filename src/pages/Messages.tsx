import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { toast } from '@/hooks/use-toast';

export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { conversations, loading, getOrCreateConversation } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);

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
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    setSelectedConversationId(null);
  };

  if (!user) {
    return (
      <div className="container py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <h1 className="text-3xl font-bold mb-4">Mesajlar</h1>
          <p className="text-muted-foreground max-w-md">
            Mesajlaşmak için giriş yapmalısınız.
          </p>
        </div>
      </div>
    );
  }

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null;

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="container h-full py-6">
        <div className="h-full bg-card rounded-lg border border-border overflow-hidden">
          {/* Desktop Layout */}
          <div className="hidden md:flex h-full">
            {/* Sol Panel - Konuşma Listesi */}
            <div className="w-80 border-r border-border flex flex-col">
              <div className="p-4 border-b border-border">
                <h2 className="text-xl font-semibold">Mesajlar</h2>
              </div>
              <ConversationList
                conversations={conversations}
                loading={loading}
                selectedConversationId={selectedConversationId}
                onSelectConversation={handleSelectConversation}
              />
            </div>

            {/* Sağ Panel - Chat Penceresi */}
            <ChatWindow conversation={selectedConversation} />
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden h-full">
            {!showMobileChat ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-border">
                  <h2 className="text-xl font-semibold">Mesajlar</h2>
                </div>
                <ConversationList
                  conversations={conversations}
                  loading={loading}
                  selectedConversationId={selectedConversationId}
                  onSelectConversation={handleSelectConversation}
                />
              </div>
            ) : (
              <ChatWindow conversation={selectedConversation} onBack={handleBackToList} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
