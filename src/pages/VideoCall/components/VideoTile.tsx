// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO TILE COMPONENT
// Renders a participant's video with Daily React hooks for track management
// useVideoTrack/useAudioTrack provide reactive track state
// DailyVideo component handles track lifecycle automatically
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect } from 'react';
import { DailyVideo, useVideoTrack, useAudioTrack } from '@daily-co/daily-react';
import { motion } from 'framer-motion';
import { VideoOff, MicOff } from 'lucide-react';
import { devLog } from '@/lib/debug';
import type { VideoTileProps } from '../types';

export function VideoTile({ sessionId, isLocal, displayName }: VideoTileProps) {
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

  return (
    <div className="relative bg-card rounded-xl overflow-hidden aspect-video border border-border shadow-lg group">
      {/* 
        DailyVideo component - Daily React's official video renderer
        - Automatically handles track state changes
        - Manages srcObject internally
        - Shows nothing when isOff
      */}
      <DailyVideo
        sessionId={sessionId}
        type="video"
        automirror={false}
        fit="cover"
        style={{
          width: '100%',
          height: '100%',
          opacity: isVideoOff ? 0 : 1,
          transition: 'opacity 200ms ease-in-out',
        }}
        muted={isLocal}
      />

      {/* Name badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-4 left-4 flex items-center gap-2"
      >
        <div className="px-3 py-1.5 bg-background/80 backdrop-blur-sm rounded-full border border-border flex items-center gap-2">
          {isLocal && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
          <span className="text-sm font-medium">{shownName}</span>
        </div>
      </motion.div>

      {/* Mic status indicator - show when muted */}
      {isAudioOff && (
        <div className="absolute top-4 right-4">
          <div className="p-2 rounded-full bg-red-500/20 border border-red-500/30">
            <MicOff className="h-4 w-4 text-red-400" />
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
            <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3 ring-4 ring-primary/10">
              <span className="text-3xl font-bold text-primary">{avatarLetter}</span>
            </div>
            <p className="text-sm text-muted-foreground">{shownName}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30 flex items-center gap-1">
                <VideoOff className="h-3 w-3 text-red-400" />
                <span className="text-xs text-red-400">Kamera kapalı</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
