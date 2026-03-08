import { useState, KeyboardEvent, useRef, useEffect, useMemo } from 'react';
import { Send, Mic, Square, X, Loader2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { cn } from '@/lib/utils';

type MessageInputProps = {
  onSendMessage: (message: string, audioUrl?: string) => Promise<boolean>;
  sending: boolean;
};

// Mini audio preview for recorded state
function RecordedPreview({ audioUrl, onCancel, onSend, isSending }: {
  audioUrl: string;
  onCancel: () => void;
  onSend: () => void;
  isSending: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => setDuration(audio.duration);
    const onTime = () => setCurrentTime(audio.currentTime);
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.pause(); else audio.play();
    setIsPlaying(!isPlaying);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  // Simple waveform
  const bars = useMemo(() => Array.from({ length: 24 }, (_, i) => 8 + Math.sin(i * 0.7) * 6 + (i % 3) * 2), []);

  return (
    <>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className="flex items-center gap-2.5 flex-1 bg-card/80 backdrop-blur-sm rounded-2xl p-2.5 border border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/15 text-primary flex-shrink-0"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[2px] h-6">
            {bars.map((h, i) => (
              <div
                key={i}
                className={cn(
                  'w-[2.5px] rounded-full transition-colors duration-75',
                  (i / bars.length) * 100 <= progress ? 'bg-primary' : 'bg-muted-foreground/25'
                )}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground/60">{fmt(currentTime > 0 ? currentTime : duration)}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          onClick={onSend}
          disabled={isSending}
          className="h-10 w-10 rounded-full flex-shrink-0"
        >
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </>
  );
}

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
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleSendAudio = async () => {
    if (!audioUrl || sending || isUploading) return;
    setIsUploading(true);
    try {
      const uploadedUrl = await uploadAudio();
      if (uploadedUrl) {
        const success = await onSendMessage('🎤 Sesli mesaj', uploadedUrl);
        if (success) cancelRecording();
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
          <div className="flex items-center justify-between bg-card/80 backdrop-blur-sm rounded-2xl p-4 border border-destructive/30">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
              <div>
                <span className="text-sm font-medium text-destructive">Kayıt yapılıyor</span>
                <span className="text-sm text-muted-foreground ml-2 font-mono tabular-nums">{formattedDuration}</span>
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

  // Recorded State UI — custom mini player
  if (recordingState === 'recorded' && audioUrl) {
    return (
      <div 
        className="border-t border-border bg-background/95 backdrop-blur-sm"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="px-3 pt-3">
          <RecordedPreview
            audioUrl={audioUrl}
            onCancel={cancelRecording}
            onSend={handleSendAudio}
            isSending={isUploading || sending}
          />
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
          <div className="flex-1 relative flex items-center rounded-2xl border border-input bg-muted/30 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all duration-200">
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
                  "text-base placeholder:text-muted-foreground",
                  "focus:outline-none",
                  "min-h-[44px]"
                )}
                style={{ overflow: 'hidden' }}
                disabled={sending}
              />
            </div>
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
