// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO TILE COMPONENT
// Renders a participant's video with Daily React hooks for track management
// useVideoTrack/useAudioTrack provide reactive track state
// DailyVideo component handles track lifecycle automatically
// Supports multiple variants: default (grid), pip (floating), fullscreen
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect } from 'react';
import { DailyVideo, useVideoTrack, useAudioTrack } from '@daily-co/daily-react';
import { motion } from 'framer-motion';
import { VideoOff, MicOff } from 'lucide-react';
import { devLog } from '@/lib/debug';
import type { VideoTileProps } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANT STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const variantStyles = {
  default: {
    container: 'relative bg-card rounded-lg md:rounded-xl overflow-hidden aspect-[4/3] md:aspect-video border border-border shadow-lg h-full',
    nameBadge: 'absolute bottom-2 left-2 md:bottom-4 md:left-4',
    micIndicator: 'absolute top-2 right-2 md:top-4 md:right-4',
    avatar: 'h-16 w-16 md:h-20 md:w-20',
    avatarText: 'text-2xl md:text-3xl',
  },
  pip: {
    container: 'relative bg-card overflow-hidden w-full h-full',
    nameBadge: 'absolute top-1 right-1 z-10',
    micIndicator: 'absolute bottom-1 left-1 z-10',
    avatar: 'h-10 w-10',
    avatarText: 'text-lg',
  },
  fullscreen: {
    container: 'relative bg-card overflow-hidden w-full h-full',
    nameBadge: 'absolute top-4 right-4 z-10',
    micIndicator: 'absolute top-4 left-4 z-10',
    avatar: 'h-24 w-24 md:h-32 md:w-32',
    avatarText: 'text-4xl md:text-5xl',
  },
};

export function VideoTile({ 
  sessionId, 
  isLocal, 
  displayName,
  variant = 'default',
}: VideoTileProps) {
  // Daily React Hooks - provide reactive track state
  // isOff = true means no data is being sent to remote
  const videoTrackState = useVideoTrack(sessionId);
  const audioTrackState = useAudioTrack(sessionId);

  // Track state check - hook's isOff value is the reliable source
  const isVideoOff = videoTrackState.isOff;
  const isAudioOff = audioTrackState.isOff;

  // Debug logging - only log state transitions, not every render
  const prevVideoOffRef = useRef(isVideoOff);
  const prevAudioOffRef = useRef(isAudioOff);
  
  useEffect(() => {
    const videoChanged = prevVideoOffRef.current !== isVideoOff;
    const audioChanged = prevAudioOffRef.current !== isAudioOff;
    
    if (videoChanged || audioChanged) {
      devLog('VideoTile', `${displayName} track changed:`,
        videoChanged ? `video: ${prevVideoOffRef.current ? 'off' : 'on'} -> ${isVideoOff ? 'off' : 'on'}` : '',
        audioChanged ? `audio: ${prevAudioOffRef.current ? 'off' : 'on'} -> ${isAudioOff ? 'off' : 'on'}` : ''
      );
      prevVideoOffRef.current = isVideoOff;
      prevAudioOffRef.current = isAudioOff;
    }
  }, [displayName, isLocal, isVideoOff, isAudioOff]);

  const avatarLetter = isLocal ? 'S' : (displayName?.charAt(0).toUpperCase() || 'K');
  const shownName = isLocal ? 'Siz' : (displayName || 'Katılımcı');
  
  // Get styles based on variant
  const styles = variantStyles[variant];
  
  // PiP variant: minimal UI, smaller elements
  const isPiP = variant === 'pip';
  const isFullscreen = variant === 'fullscreen';

  return (
    <div className={styles.container}>
      {/* 
        DailyVideo component - Daily React's official video renderer
        - Automatically handles track state changes
        - Manages srcObject internally
        - Shows nothing when isOff
      */}
      <DailyVideo
        sessionId={sessionId}
        type="video"
        // Local self-view should be mirrored (selfie-style)
        // Daily's automirror can be unreliable across browsers/constraints, so we also apply a CSS fallback.
        automirror={isLocal}
        fit="cover"
        style={{
          width: '100%',
          height: '100%',
          opacity: isVideoOff ? 0 : 1,
          transition: 'opacity 200ms ease-in-out',
          transform: isLocal ? 'scaleX(-1)' : 'none',
        }}
        muted={isLocal}
      />

      {/* Name badge - adapted for each variant */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${styles.nameBadge} flex items-center gap-2`}
      >
        <div className={`
          ${isPiP ? 'px-1.5 py-0.5' : 'px-2 py-1 md:px-3 md:py-1.5'} 
          bg-background/80 backdrop-blur-sm rounded-full border border-border 
          flex items-center gap-1.5 ${isPiP ? 'gap-1' : 'md:gap-2'}
        `}>
          {isLocal && (
            <span className={`
              ${isPiP ? 'h-1 w-1' : 'h-1.5 w-1.5 md:h-2 md:w-2'} 
              rounded-full bg-primary animate-pulse
            `} />
          )}
          <span className={`
            ${isPiP ? 'text-[10px]' : 'text-xs md:text-sm'} 
            font-medium
          `}>
            {shownName}
          </span>
        </div>
      </motion.div>

      {/* Mic status indicator - show when muted */}
      {isAudioOff && (
        <div className={styles.micIndicator}>
          <div className={`
            ${isPiP ? 'p-1' : 'p-1.5 md:p-2'} 
            rounded-full bg-red-500/20 border border-red-500/30
          `}>
            <MicOff className={`
              ${isPiP ? 'h-2.5 w-2.5' : 'h-3 w-3 md:h-4 md:w-4'} 
              text-red-400
            `} />
          </div>
        </div>
      )}

      {/* Camera off placeholder - show when video disabled */}
      {isVideoOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <motion.div 
            initial={{ scale: 0.8 }} 
            animate={{ scale: 1 }} 
            className="text-center"
            key="avatar-placeholder"
          >
            <div className={`
              ${styles.avatar} 
              rounded-full bg-primary/20 flex items-center justify-center mx-auto 
              ${isPiP ? 'mb-1' : 'mb-2 md:mb-3'} 
              ring-4 ring-primary/10
            `}>
              <span className={`${styles.avatarText} font-bold text-primary`}>
                {avatarLetter}
              </span>
            </div>
            {!isPiP && (
              <>
                <p className={`${isFullscreen ? 'text-base md:text-lg' : 'text-xs md:text-sm'} text-muted-foreground`}>
                  {shownName}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1.5 md:mt-2">
                  <div className="px-2 py-0.5 md:py-1 rounded-full bg-red-500/20 border border-red-500/30 flex items-center gap-1">
                    <VideoOff className="h-3 w-3 text-red-400" />
                    <span className="text-[10px] md:text-xs text-red-400">Kamera kapalı</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
