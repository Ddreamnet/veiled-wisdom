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

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audio.currentTime = percentage * duration;
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate waveform bars (simulated)
  const waveformBars = Array.from({ length: 28 }, (_, i) => {
    const height = 12 + Math.sin(i * 0.8) * 8 + Math.random() * 6;
    return height;
  });

  return (
    <div className={cn(
      'flex items-center gap-3 min-w-[220px] max-w-[280px] p-3 rounded-2xl shadow-sm',
      isOwnMessage 
        ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-md' 
        : 'bg-muted text-foreground rounded-tl-md'
    )}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-11 w-11 rounded-full flex-shrink-0 transition-all',
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
        {/* Waveform Progress */}
        <div 
          className="flex items-center gap-[2px] h-8 cursor-pointer mb-1"
          onClick={handleSeek}
        >
          {waveformBars.map((height, index) => {
            const barProgress = (index / waveformBars.length) * 100;
            const isActive = barProgress <= progress;
            
            return (
              <div
                key={index}
                className={cn(
                  'w-[3px] rounded-full transition-all duration-100',
                  isOwnMessage
                    ? isActive ? 'bg-primary-foreground' : 'bg-primary-foreground/30'
                    : isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>
        
        {/* Duration */}
        <div className={cn(
          'flex items-center justify-between text-[11px]',
          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
        )}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
