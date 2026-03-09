// ═══════════════════════════════════════════════════════════════════════════════
// CALL UI COMPONENT
// Main UI component for active video calls
// Handles participant management, media controls, and call state
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { DailyCall } from '@daily-co/daily-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Clock } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { createTransitionLogger, devLog } from '@/lib/debug';

// Types
import type { CallUIProps, CallState } from './types';

// Constants
import { 
  SOLO_TIMEOUT_SECONDS, 
  MAX_CALL_DURATION_SECONDS, 
} from './utils/constants';

// Utilities
import { formatTime } from './utils/helpers';
import { getConversationTrackStates } from './utils/participantUtils';

// Components
import { 
  LoadingScreen, 
  ErrorScreen, 
  NotificationsOverlay, 
  VideoTile, 
  WaitingRoom,
  FilteredRemoteAudio,
  ControlButton,
  DraggablePiP 
} from './components';

// Hooks - Use modular hooks from video-call
import { useIsMobile } from '@/hooks/useMobile';
import { 
  useCallNotifications,
  useCallTimers,
  useMediaControls,
  useParticipants,
  useCallTermination,
  useDailyEvents,
} from '@/hooks/video-call';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CALL UI COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CallUI({ callObject, conversationId }: CallUIProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // NOTE: Navbar hiding is now handled in VideoCallPage to cover loading/error states

  // ═══════════════════════════════════════════════════════════════════════════════
  // iOS SAFARI COMPATIBLE SCROLL LOCK
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const scrollY = window.scrollY;
    const originalStyles = {
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      htmlOverflow: document.documentElement.style.overflow,
    };
    
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyles.bodyOverflow;
      document.body.style.position = originalStyles.bodyPosition;
      document.body.style.top = originalStyles.bodyTop;
      document.body.style.width = originalStyles.bodyWidth;
      document.documentElement.style.overflow = originalStyles.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, []);
  
  // Module-level track state (StrictMode remount protection)
  const trackStates = getConversationTrackStates(conversationId);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CALL STATE
  // ═══════════════════════════════════════════════════════════════════════════════
  const [callState, setCallState] = useState<CallState>('loading');
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // VIDEO SWAP STATE & CONTROL BAR MEASUREMENT (Mobile WhatsApp-style)
  // ═══════════════════════════════════════════════════════════════════════════════
  const [isVideoSwapped, setIsVideoSwapped] = useState(false);
  const controlBarRef = useRef<HTMLDivElement>(null);
  const [controlBarHeight, setControlBarHeight] = useState(80);

  useEffect(() => {
    if (!controlBarRef.current || !isMobile) return;
    
    const measureBar = () => {
      const rect = controlBarRef.current?.getBoundingClientRect();
      if (rect) {
        setControlBarHeight(rect.height + 16); // +16 margin
      }
    };
    
    measureBar();
    const ro = new ResizeObserver(measureBar);
    ro.observe(controlBarRef.current);
    
    return () => ro.disconnect();
  }, [isMobile]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // MODULAR HOOKS
  // ═══════════════════════════════════════════════════════════════════════════════

  // Media controls (camera, mic)
  const handleMediaError = useCallback((type: 'camera' | 'mic', error: unknown) => {
    toast({
      title: type === 'camera' ? 'Kamera Hatası' : 'Mikrofon Hatası',
      description: type === 'camera' ? 'Kamera durumu değiştirilemedi.' : 'Mikrofon durumu değiştirilemedi.',
      variant: 'destructive',
    });
  }, [toast]);

  const { 
    isCameraOn, 
    isMicOn, 
    toggleCamera, 
    toggleMic, 
    syncFromDaily: syncLocalMediaState,
  } = useMediaControls(callObject, handleMediaError);

  // Participants management
  const {
    participants,
    localParticipant,
    remoteParticipants,
    updateParticipants,
    debouncedUpdateParticipants,
  } = useParticipants(callObject, syncLocalMediaState);

  // Notifications (join/leave)
  const { 
    notifications, 
    addNotification, 
    removeNotification,
  } = useCallNotifications();

  // Call termination (server-side)
  const { terminateCall } = useCallTermination({
    conversationId,
    enabled: callState === 'joined',
  });

  // Termination callbacks for timers
  const handleSoloTimeout = useCallback(() => {
    toast({
      title: "Oturum Sonlandırıldı",
      description: "30 dakika boyunca yalnız kaldığınız için görüşme sonlandırıldı.",
      variant: "destructive",
    });
    terminateCall('solo_timeout');
  }, [terminateCall, toast]);

  const handleMaxDuration = useCallback(() => {
    toast({
      title: "Maksimum Süre Doldu",
      description: "Görüşme 2 saatlik maksimum süreye ulaştığı için sonlandırıldı.",
      variant: "destructive",
    });
    terminateCall('max_duration');
  }, [terminateCall, toast]);

  // Call timers (waiting, duration, auto-leave)
  const { 
    waitingTime, 
    callDuration, 
    autoNavigateOnLeaveRef,
  } = useCallTimers(
    callState,
    participants,
    callObject,
    handleSoloTimeout,
    handleMaxDuration
  );

  // Daily event orchestration
  useDailyEvents({
    callObject,
    conversationId,
    trackStates,
    setCallState,
    updateParticipants,
    debouncedUpdateParticipants,
    syncLocalMediaState,
    addNotification,
    autoNavigateOnLeaveRef,
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LEAVE CALL HANDLER
  // ═══════════════════════════════════════════════════════════════════════════════
  const leaveCall = useCallback(() => {
    // Server-side termination (fire-and-forget)
    terminateCall('manual');
    autoNavigateOnLeaveRef.current = true;
    callObject.leave();
  }, [callObject, autoNavigateOnLeaveRef, terminateCall]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // PIP CLICK HANDLER (Tap to swap videos)
  // ═══════════════════════════════════════════════════════════════════════════════
  const remoteParticipantsForSwap = participants.filter((p) => !p.local);
  
  const handlePiPClick = useCallback(() => {
    if (remoteParticipantsForSwap.length > 0) {
      setIsVideoSwapped(prev => !prev);
    }
  }, [remoteParticipantsForSwap.length]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER LOGIC
  // ═══════════════════════════════════════════════════════════════════════════════
  const showLoadingOverlay = callState === 'loading' || callState === 'joining';
  
  const logOverlayVisibility = createTransitionLogger<boolean>('CallUI.Overlay');
  useEffect(() => {
    logOverlayVisibility(showLoadingOverlay);
  }, [callState, showLoadingOverlay]);

  if (showLoadingOverlay) {
    return <LoadingScreen message="Görüşme başlatılıyor..." />;
  }

  if (callState === 'error') {
    return <ErrorScreen onNavigate={() => navigate('/messages')} />;
  }

  if (remoteParticipants.length === 0) {
    return (
      <>
        <WaitingRoom
          localParticipant={localParticipant}
          isCameraOn={isCameraOn}
          isMicOn={isMicOn}
          onToggleCamera={toggleCamera}
          onToggleMic={toggleMic}
          onLeave={leaveCall}
          waitingTime={waitingTime}
        />
        <NotificationsOverlay notifications={notifications} onDismiss={removeNotification} />
      </>
    );
  }

  // Güvenli participant seçimi (swap desteği)
  const mainParticipant = isVideoSwapped ? localParticipant : remoteParticipants[0];
  const pipParticipant = isVideoSwapped ? remoteParticipants[0] : localParticipant;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-40 bg-gradient-to-br from-background via-purple-950/20 to-background flex flex-col overflow-hidden overscroll-none"
      >
        {/* Connection status bar - HIDDEN on mobile for WhatsApp-style */}
        <motion.div
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="hidden md:flex px-4 py-2 bg-green-500/10 border-b border-green-500/20 items-center justify-center gap-3"
        >
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-green-400">Görüşme aktif</span>
          <span className="text-sm text-muted-foreground">
            • {(localParticipant ? 1 : 0) + remoteParticipants.length} katılımcı
          </span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/50">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{formatTime(callDuration)}</span>
          </div>
        </motion.div>

        {/* Video Area */}
        {isMobile ? (
          // ═══════════════════════════════════════════════════════════════════
          // MOBILE: WhatsApp-style PiP Layout with tap-to-swap
          // ═══════════════════════════════════════════════════════════════════
          <div className="flex-1 relative">
            {/* Main video - fullscreen background */}
            {mainParticipant ? (
              <div className="absolute inset-0">
                <VideoTile 
                  sessionId={mainParticipant.session_id} 
                  isLocal={isVideoSwapped}
                  displayName={mainParticipant.user_name || (isVideoSwapped ? 'Siz' : 'Katılımcı')}
                  variant="fullscreen"
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <span className="text-muted-foreground">Bağlantı bekleniyor...</span>
              </div>
            )}
            
            {/* PiP video - draggable, tap to swap */}
            {pipParticipant && (
              <DraggablePiP 
                initialCorner="bottom-right"
                bottomOffset={controlBarHeight}
                onClick={handlePiPClick}
              >
                <VideoTile 
                  sessionId={pipParticipant.session_id} 
                  isLocal={!isVideoSwapped}
                  displayName={pipParticipant.user_name || (!isVideoSwapped ? 'Siz' : 'Katılımcı')}
                  variant="pip"
                />
              </DraggablePiP>
            )}
          </div>
        ) : (
          // ═══════════════════════════════════════════════════════════════════
          // DESKTOP: Grid Layout - Side by side videos
          // ═══════════════════════════════════════════════════════════════════
          <div className="flex-1 p-4 grid grid-cols-2 gap-4 content-center">
            <AnimatePresence>
              {localParticipant && (
                <motion.div
                  key={(localParticipant as any).userData?.appUserId || localParticipant.session_id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: 0 }}
                  className="h-full"
                >
                  <VideoTile 
                    sessionId={localParticipant.session_id} 
                    isLocal={true} 
                    displayName={localParticipant.user_name || 'Siz'} 
                  />
                </motion.div>
              )}
              {remoteParticipants.map((participant, idx) => (
                <motion.div
                  key={(participant as any).userData?.appUserId || participant.session_id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: 0.1 * (idx + 1) }}
                  className="h-full"
                >
                  <VideoTile 
                    sessionId={participant.session_id} 
                    isLocal={false} 
                    displayName={participant.user_name || 'Katılımcı'} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Audio for remote participants */}
        {remoteParticipants.map((participant) => (
          <FilteredRemoteAudio 
            key={`audio-${participant.session_id}`} 
            sessionId={participant.session_id} 
          />
        ))}

        {/* Control Bar - WhatsApp-style transparent overlay on mobile */}
        <motion.div
          ref={controlBarRef}
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          className={cn(
            "z-50 flex items-center justify-center gap-4",
            // Mobile: fixed bottom, transparent overlay
            "fixed bottom-0 left-0 right-0 pb-[calc(env(safe-area-inset-bottom,20px)+8px)] pt-4",
            // Desktop: relative, with background
            "md:relative md:bottom-auto md:pb-4 md:bg-background/80 md:backdrop-blur-xl md:border-t md:border-border"
          )}
        >
          <ControlButton 
            variant={isCameraOn ? "secondary" : "destructive"} 
            onClick={toggleCamera}
            withHoverScale
            className={cn(
              "h-14 w-14",
              isMobile && "bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border-0 shadow-lg"
            )}
          >
            {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </ControlButton>
          
          <ControlButton 
            variant={isMicOn ? "secondary" : "destructive"} 
            onClick={toggleMic}
            withHoverScale
            className={cn(
              "h-14 w-14",
              isMobile && "bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border-0 shadow-lg"
            )}
          >
            {isMicOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </ControlButton>
          
          <ControlButton 
            variant="destructive" 
            onClick={leaveCall} 
            withHoverScale
            className={cn(
              "h-14 w-14",
              isMobile && "shadow-lg"
            )}
          >
            <PhoneOff className="h-6 w-6" />
          </ControlButton>
        </motion.div>
      </motion.div>

      <NotificationsOverlay notifications={notifications} onDismiss={removeNotification} />
    </>
  );
}
