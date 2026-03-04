import { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AudioMessageProps = {
  audioUrl: string;
  isOwnMessage: boolean;
  time?: string;
};

// Simple hash for stable waveform
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function AudioMessage({ audioUrl, isOwnMessage, time }: AudioMessageProps) {
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
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => { setIsPlaying(false); setCurrentTime(0); };

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
    if (isPlaying) audio.pause(); else audio.play();
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !isLoaded) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percentage * duration;
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Stable waveform bars based on URL hash
  const waveformBars = useMemo(() => {
    const rand = seededRandom(hashCode(audioUrl));
    return Array.from({ length: 28 }, () => 12 + rand() * 16);
  }, [audioUrl]);

  return (
    <div className={cn(
      'flex items-center gap-2.5 min-w-[220px] max-w-[280px] p-2.5',
      isOwnMessage
        ? 'bg-gradient-to-br from-primary via-primary to-primary/85 text-white rounded-[20px] rounded-tr-md shadow-md shadow-primary/10'
        : 'bg-muted/80 text-foreground rounded-[20px] rounded-tl-md border border-border/40'
    )}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Play/Pause Button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-10 w-10 rounded-full flex-shrink-0',
          isOwnMessage
            ? 'bg-white/15 hover:bg-white/25 text-white border border-white/10'
            : 'bg-primary/10 hover:bg-primary/15 text-primary border border-primary/10'
        )}
        onClick={togglePlayPause}
        disabled={!isLoaded}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>

      <div className="flex-1 min-w-0">
        {/* Waveform Progress */}
        <div
          className="flex items-center gap-[2px] h-7 cursor-pointer mb-1"
          onClick={handleSeek}
        >
          {waveformBars.map((height, index) => {
            const barProgress = (index / waveformBars.length) * 100;
            const isActive = barProgress <= progress;

            return (
              <div
                key={index}
                className={cn(
                  'w-[3px] rounded-full transition-colors duration-75',
                  isOwnMessage
                    ? isActive ? 'bg-white' : 'bg-white/25'
                    : isActive ? 'bg-primary' : 'bg-muted-foreground/25'
                )}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        {/* Duration + time inline */}
        <div className={cn(
          'flex items-center justify-between text-[10px] leading-none select-none',
          isOwnMessage ? 'text-white/60' : 'text-muted-foreground/60'
        )}>
          <span>{formatTime(currentTime > 0 ? currentTime : duration)}</span>
          <div className="flex items-center gap-1">
            {time && <span>{time}</span>}
            {isOwnMessage && time && <CheckCheck className="h-3 w-3" />}
          </div>
        </div>
      </div>
    </div>
  );
}
