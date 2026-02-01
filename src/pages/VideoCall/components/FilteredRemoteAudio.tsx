// ═══════════════════════════════════════════════════════════════════════════════
// FILTERED REMOTE AUDIO
// Plays audio only for sanitized participants (filters ghost audio)
// DailyAudio by default plays ALL participants including duplicates
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect } from 'react';
import { useAudioTrack } from '@daily-co/daily-react';
import type { FilteredRemoteAudioProps } from '../types';

export function FilteredRemoteAudio({ sessionId }: FilteredRemoteAudioProps) {
  const audioTrack = useAudioTrack(sessionId);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    
    // Play track if available and not off
    if (audioTrack.persistentTrack && !audioTrack.isOff) {
      const stream = new MediaStream([audioTrack.persistentTrack]);
      el.srcObject = stream;
      el.play().catch(() => {
        // Autoplay blocked - waiting for user interaction
      });
    } else {
      // Track is off or missing - stop audio
      el.srcObject = null;
    }
    
    return () => {
      if (el) {
        el.srcObject = null;
      }
    };
  }, [audioTrack.persistentTrack, audioTrack.isOff]);
  
  return <audio ref={audioRef} autoPlay playsInline />;
}
