import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AudioMessageProps = {
  audioUrl: string;
  isOwnMessage: boolean;
};

export function AudioMessage({ audioUrl, isOwnMessage }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn(
      'flex items-center gap-3 min-w-[200px] max-w-[280px] p-2 rounded-2xl',
      isOwnMessage 
        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
        : 'bg-muted text-foreground rounded-tl-sm'
    )}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-10 w-10 rounded-full flex-shrink-0',
          isOwnMessage 
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground' 
            : 'bg-primary/10 hover:bg-primary/20 text-primary'
        )}
        onClick={togglePlayPause}
        disabled={!isLoaded}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        {/* Progress bar */}
        <div className={cn(
          'h-1 rounded-full overflow-hidden mb-1.5',
          isOwnMessage ? 'bg-primary-foreground/30' : 'bg-muted-foreground/30'
        )}>
          <div 
            className={cn(
              'h-full rounded-full transition-all duration-100',
              isOwnMessage ? 'bg-primary-foreground' : 'bg-primary'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Duration */}
        <div className={cn(
          'text-xs',
          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
