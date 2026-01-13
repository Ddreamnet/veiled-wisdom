import { useState, KeyboardEvent } from 'react';
import { Send, Mic, Square, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';

type MessageInputProps = {
  onSendMessage: (message: string, audioUrl?: string) => Promise<boolean>;
  sending: boolean;
};

export function MessageInput({ onSendMessage, sending }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const {
    recordingState,
    formattedDuration,
    audioUrl,
    error: recordingError,
    startRecording,
    stopRecording,
    cancelRecording,
    uploadAudio,
  } = useAudioRecorder();

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    const success = await onSendMessage(message);
    if (success) {
      setMessage('');
    }
  };

  const handleSendAudio = async () => {
    if (!audioUrl || sending || isUploading) return;

    setIsUploading(true);
    try {
      const uploadedUrl = await uploadAudio();
      if (uploadedUrl) {
        const success = await onSendMessage('🎤 Sesli mesaj', uploadedUrl);
        if (success) {
          cancelRecording(); // Reset recorder
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter ile gönder, Shift+Enter ile yeni satır
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Kayıt modundayken
  if (recordingState === 'recording') {
    return (
      <div className="border-t border-border bg-background p-4">
        <div className="flex items-center justify-between bg-destructive/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium">Kayıt yapılıyor...</span>
            <span className="text-sm text-muted-foreground font-mono">{formattedDuration}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/20"
            >
              <X className="h-5 w-5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={stopRecording}
              className="h-10 w-10"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Kayıt tamamlandığında
  if (recordingState === 'recorded' && audioUrl) {
    return (
      <div className="border-t border-border bg-background p-4">
        <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-4">
          <audio src={audioUrl} controls className="flex-1 h-10" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={cancelRecording}
              className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/20"
            >
              <X className="h-5 w-5" />
            </Button>
            <Button
              variant="default"
              size="icon"
              onClick={handleSendAudio}
              disabled={isUploading || sending}
              className="h-10 w-10"
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
        {recordingError && (
          <p className="text-destructive text-xs mt-2">{recordingError}</p>
        )}
      </div>
    );
  }

  // Normal mesaj modu
  return (
    <div className="border-t border-border bg-background p-4">
      <div className="flex items-end space-x-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mesajınızı yazın... (Enter ile gönder)"
          className="min-h-[60px] max-h-[120px] resize-none"
          disabled={sending}
        />
        <div className="flex flex-col gap-2">
          <Button
            onClick={startRecording}
            disabled={sending}
            size="icon"
            variant="outline"
            className="h-[28px] w-[60px] flex-shrink-0"
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            size="icon"
            className="h-[28px] w-[60px] flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {recordingError && (
        <p className="text-destructive text-xs mt-2">{recordingError}</p>
      )}
    </div>
  );
}
