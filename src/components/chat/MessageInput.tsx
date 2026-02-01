import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send, Mic, Square, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';

type MessageInputProps = {
  onSendMessage: (message: string, audioUrl?: string) => Promise<boolean>;
  sending: boolean;
};

export function MessageInput({ onSendMessage, sending }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    const success = await onSendMessage(message);
    if (success) {
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
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
          cancelRecording();
        }
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Recording State UI
  if (recordingState === 'recording') {
    return (
      <div 
        className="border-t border-border bg-background/95 backdrop-blur-sm"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="px-3 pt-3">
          <div className="flex items-center justify-between bg-destructive/10 rounded-2xl p-4 border border-destructive/20">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-4 w-4 rounded-full bg-destructive animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-destructive/50 animate-ping" />
              </div>
              <div>
                <span className="text-sm font-medium text-destructive">Kayıt yapılıyor</span>
                <span className="text-sm text-muted-foreground ml-2 font-mono">{formattedDuration}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelRecording}
                className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                onClick={stopRecording}
                className="h-10 w-10 rounded-full bg-destructive hover:bg-destructive/90"
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Recorded State UI
  if (recordingState === 'recorded' && audioUrl) {
    return (
      <div 
        className="border-t border-border bg-background/95 backdrop-blur-sm"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="px-3 pt-3">
          <div className="flex items-center gap-3 bg-muted/50 rounded-2xl p-3 border border-border">
            <audio src={audioUrl} controls className="flex-1 h-10 rounded-lg" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelRecording}
                className="h-10 w-10 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                onClick={handleSendAudio}
                disabled={isUploading || sending}
                className="h-10 w-10 rounded-full"
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
            <p className="text-destructive text-xs mt-2 px-1">{recordingError}</p>
          )}
        </div>
      </div>
    );
  }

  // Normal Input UI
  return (
    <div 
      className="border-t border-border bg-background/95 backdrop-blur-sm"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="px-3 pt-3">
        <div className="flex items-end gap-2">
          {/* Text Input Container with Mic inside */}
          <div className="flex-1 relative flex items-center rounded-2xl border border-input bg-muted/30 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all duration-200">
            {/* Scrollable textarea wrapper - scrollbar appears at its right edge, left of mic */}
            <div 
              className="flex-1 max-h-[120px] overflow-y-auto [&::-webkit-scrollbar]:w-[3px]"
              style={{ scrollbarGutter: 'stable' }}
            >
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mesajınızı yazın..."
                rows={1}
                className={cn(
                  "w-full resize-none bg-transparent pl-4 pr-2 py-3",
                  "text-sm placeholder:text-muted-foreground",
                  "focus:outline-none",
                  "min-h-[44px]"
                )}
                style={{ overflow: 'hidden' }}
                disabled={sending}
              />
            </div>
            {/* Mic Button - Right side of input, vertically centered */}
            <Button
              variant="ghost"
              size="icon"
              onClick={startRecording}
              disabled={sending}
              className={cn(
                "flex-shrink-0 mr-1 h-10 w-10 rounded-full",
                "text-muted-foreground hover:text-primary hover:bg-primary/10",
                "transition-colors"
              )}
            >
              <Mic className="h-6 w-6" />
            </Button>
          </div>

          {/* Send Button - Right side */}
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            size="icon"
            className={cn(
              "h-11 w-11 rounded-full flex-shrink-0",
              "bg-primary hover:bg-primary/90",
              "shadow-md shadow-primary/20",
              "transition-all duration-200",
              !message.trim() && "opacity-50"
            )}
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        
        {recordingError && (
          <p className="text-destructive text-xs mt-2 px-1">{recordingError}</p>
        )}
      </div>
    </div>
  );
}
