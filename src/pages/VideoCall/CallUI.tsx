// ═══════════════════════════════════════════════════════════════════════════════
// CALL UI COMPONENT
// Main UI component for active video calls
// Handles participant management, media controls, and call state
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DailyCall, DailyParticipant, DailyEventObjectParticipant, DailyEventObjectParticipantLeft } from '@daily-co/daily-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createTransitionLogger, devLog } from '@/lib/debug';

// Types
import type { CallUIProps, NotificationItem, CallState } from './types';

// Constants
import { 
  SOLO_TIMEOUT_SECONDS, 
  MAX_CALL_DURATION_SECONDS, 
  MAX_DURATION_CHECK_INTERVAL_MS,
  DUPLICATE_NOTIFICATION_THRESHOLD_MS 
} from './utils/constants';

// Utilities
import { formatTime } from './utils/helpers';
import { 
  sanitizeParticipants, 
  logParticipants, 
  getConversationTrackStates,
  incrementHandlerCount 
} from './utils/participantUtils';

// Components
import { 
  LoadingScreen, 
  ErrorScreen, 
  NotificationsOverlay, 
  VideoTile, 
  WaitingRoom,
  FilteredRemoteAudio,
  ControlButton 
} from './components';

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const recentRef = useRef<Map<string, number>>(new Map());

  const add = useCallback((type: 'join' | 'leave', userName: string) => {
    const dedupeKey = `${type}-${userName || 'unknown'}`;
    const now = Date.now();
    const lastShown = recentRef.current.get(dedupeKey) || 0;

    if (now - lastShown < DUPLICATE_NOTIFICATION_THRESHOLD_MS) {
      devLog('Notifications', 'Duplicate suppressed:', dedupeKey);
      return;
    }

    recentRef.current.set(dedupeKey, now);
    const id = `${now}-${Math.random()}`;
    setNotifications((prev) => [...prev, { id, type, userName }]);
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifications, add, remove };
}

function useCallTimers(
  callState: CallState,
  participants: DailyParticipant[],
  callObject: DailyCall,
  toast: ReturnType<typeof useToast>['toast']
) {
  const [waitingTime, setWaitingTime] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [roomJoinTime, setRoomJoinTime] = useState<number | null>(null);
  const autoNavigateOnLeaveRef = useRef(false);

  const remoteCount = participants.filter((p) => !p.local).length;

  useEffect(() => {
    if (callState === 'joined' && roomJoinTime === null) {
      setRoomJoinTime(Date.now());
    }
  }, [callState, roomJoinTime]);

  useEffect(() => {
    if (remoteCount === 0 && callState === 'joined') {
      const interval = setInterval(() => setWaitingTime((prev) => prev + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [remoteCount, callState]);

  useEffect(() => {
    if (remoteCount > 0 && callState === 'joined') {
      if (callStartTime === null) {
        setCallStartTime(Date.now());
      }
      const interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [remoteCount, callState, callStartTime]);

  useEffect(() => {
    if (waitingTime >= SOLO_TIMEOUT_SECONDS && callState === 'joined') {
      toast({
        title: "Oturum Sonlandırıldı",
        description: "30 dakika boyunca yalnız kaldığınız için görüşme sonlandırıldı.",
        variant: "destructive",
      });
      autoNavigateOnLeaveRef.current = true;
      callObject.leave();
    }
  }, [waitingTime, callState, callObject, toast]);

  useEffect(() => {
    if (!roomJoinTime || callState !== 'joined') return;

    const checkMaxDuration = () => {
      const elapsed = (Date.now() - roomJoinTime) / 1000;
      if (elapsed >= MAX_CALL_DURATION_SECONDS) {
        toast({
          title: "Maksimum Süre Doldu",
          description: "Görüşme 2 saatlik maksimum süreye ulaştığı için sonlandırıldı.",
          variant: "destructive",
        });
        autoNavigateOnLeaveRef.current = true;
        callObject.leave();
      }
    };

    const interval = setInterval(checkMaxDuration, MAX_DURATION_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [roomJoinTime, callState, callObject, toast]);

  return { waitingTime, callDuration, autoNavigateOnLeaveRef };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CALL UI COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CallUI({ callObject, conversationId }: CallUIProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Module-level track state (StrictMode remount protection)
  const trackStates = getConversationTrackStates(conversationId);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CAMERA/MIC STATE: Derive from Daily as the single source of truth
  // ═══════════════════════════════════════════════════════════════════════════════
  const [isCameraOn, setIsCameraOn] = useState(() => {
    const local = callObject.participants().local;
    return local?.video !== false;
  });
  const [isMicOn, setIsMicOn] = useState(() => {
    const local = callObject.participants().local;
    return local?.audio !== false;
  });

  const [callState, setCallState] = useState<CallState>('loading');
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<DailyParticipant | null>(null);

  // Custom hooks
  const { notifications, add: addNotification, remove: removeNotification } = useNotifications();
  const { waitingTime, callDuration, autoNavigateOnLeaveRef } = useCallTimers(
    callState,
    participants,
    callObject,
    toast
  );

  // Debounce ref for participant updates
  const updateDebounceRef = useRef<number | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SYNC LOCAL MEDIA STATE
  // ═══════════════════════════════════════════════════════════════════════════════
  const syncLocalMediaState = useCallback(() => {
    const local = callObject.participants().local;
    if (local) {
      setIsCameraOn(local.video !== false);
      setIsMicOn(local.audio !== false);
    }
  }, [callObject]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPDATE PARTICIPANTS
  // ═══════════════════════════════════════════════════════════════════════════════
  const updateParticipants = useCallback(() => {
    const participantObj = callObject.participants();
    const participantList = Object.values(participantObj);
    const { local, sanitized } = sanitizeParticipants(participantList);

    setLocalParticipant(local);
    setParticipants(sanitized);
    syncLocalMediaState();

    if (import.meta.env.DEV) {
      logParticipants(participantList, sanitized);
    }
  }, [callObject, syncLocalMediaState]);

  // Debounced version to batch rapid updates
  const debouncedUpdateParticipants = useCallback(() => {
    if (updateDebounceRef.current) {
      window.clearTimeout(updateDebounceRef.current);
    }
    updateDebounceRef.current = window.setTimeout(() => {
      updateParticipants();
      updateDebounceRef.current = null;
    }, 50);
  }, [updateParticipants]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (updateDebounceRef.current) {
        window.clearTimeout(updateDebounceRef.current);
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DAILY EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const currentCount = incrementHandlerCount(conversationId);
    
    devLog('CallUI', 'Registering handlers:', {
      conversationId,
      registrationCount: currentCount,
      meetingState: callObject.meetingState(),
    });
    
    // Check CURRENT meeting state immediately on mount
    const currentMeetingState = callObject.meetingState();
    devLog('CallUI', 'Initial meeting state on mount:', currentMeetingState);
    
    if (currentMeetingState === 'joined-meeting') {
      devLog('CallUI', 'Already joined on mount - transitioning callState to joined');
      setCallState('joined');
      updateParticipants();
    } else if (currentMeetingState === 'joining-meeting') {
      devLog('CallUI', 'Currently joining on mount - transitioning callState to joining');
      setCallState('joining');
    }

    // Event handlers for FUTURE state changes
    const handleJoiningMeeting = () => {
      devLog('CallUI', 'joining-meeting event fired');
      setCallState('joining');
    };

    const handleJoinedMeeting = () => {
      devLog('CallUI', 'joined-meeting event fired');
      setCallState('joined');
      updateParticipants();
    };

    const handleLeftMeeting = () => {
      devLog('CallUI', 'left-meeting event fired');
      setCallState('leaving');

      if (autoNavigateOnLeaveRef.current) {
        autoNavigateOnLeaveRef.current = false;
        setTimeout(() => navigate('/messages'), 1000);
      }
    };

    const handleError = (e: any) => {
      console.error('[CallUI] Daily error event:', e);
      setCallState('error');
      toast({
        title: "Bağlantı Hatası",
        description: "Video araması başlatılamadı.",
        variant: "destructive",
      });
    };

    const handleParticipantJoined = (event: DailyEventObjectParticipant | undefined) => {
      devLog('CallUI', 'participant-joined:', event?.participant?.user_name);
      if (event?.participant && !event.participant.local) {
        addNotification('join', event.participant.user_name || 'Katılımcı');
      }
      updateParticipants();
    };

    const handleParticipantUpdated = () => {
      debouncedUpdateParticipants();
    };

    const handleParticipantLeft = (event: DailyEventObjectParticipantLeft | undefined) => {
      devLog('CallUI', 'participant-left:', event?.participant?.user_name);
      
      if (event?.participant?.session_id) {
        trackStates.delete(event.participant.session_id);
      }
      
      if (event?.participant && !event.participant.local) {
        addNotification('leave', event.participant.user_name || 'Katılımcı');
      }
      updateParticipants();
    };

    // Track event handlers with deduplication
    const handleTrackStarted = (event: any) => {
      const sessionId = event?.participant?.session_id;
      const trackKind = event?.track?.kind as 'video' | 'audio';
      
      if (!sessionId || !trackKind) return;
      
      const current = trackStates.get(sessionId) || { video: false, audio: false };
      
      if (current[trackKind] === true) return;
      
      trackStates.set(sessionId, { ...current, [trackKind]: true });
      
      if (!event?.participant?.local) {
        devLog('TrackEvent', 'started (remote):', event?.participant?.user_name, trackKind);
      }
      
      if (event?.participant?.local) {
        syncLocalMediaState();
      }
      
      debouncedUpdateParticipants();
    };

    const handleTrackStopped = (event: any) => {
      const sessionId = event?.participant?.session_id;
      const trackKind = event?.track?.kind as 'video' | 'audio';
      
      if (!sessionId || !trackKind) return;
      
      const current = trackStates.get(sessionId) || { video: true, audio: true };
      
      if (current[trackKind] === false) return;
      
      trackStates.set(sessionId, { ...current, [trackKind]: false });
      
      if (!event?.participant?.local) {
        devLog('TrackEvent', 'stopped (remote):', event?.participant?.user_name, trackKind);
      }
      
      if (event?.participant?.local) {
        syncLocalMediaState();
      }
      
      debouncedUpdateParticipants();
    };
    
    const handleCameraError = () => {
      devLog('CallUI', 'camera-error event - syncing state');
      syncLocalMediaState();
    };

    updateParticipants();

    callObject.on('joining-meeting', handleJoiningMeeting);
    callObject.on('joined-meeting', handleJoinedMeeting);
    callObject.on('left-meeting', handleLeftMeeting);
    callObject.on('error', handleError);
    callObject.on('participant-joined', handleParticipantJoined);
    callObject.on('participant-updated', handleParticipantUpdated);
    callObject.on('participant-left', handleParticipantLeft);
    callObject.on('track-started', handleTrackStarted);
    callObject.on('track-stopped', handleTrackStopped);
    callObject.on('camera-error', handleCameraError);

    return () => {
      devLog('CallUI', 'Cleaning up handlers for:', conversationId);
      
      callObject.off('joining-meeting', handleJoiningMeeting);
      callObject.off('joined-meeting', handleJoinedMeeting);
      callObject.off('left-meeting', handleLeftMeeting);
      callObject.off('error', handleError);
      callObject.off('participant-joined', handleParticipantJoined);
      callObject.off('participant-updated', handleParticipantUpdated);
      callObject.off('participant-left', handleParticipantLeft);
      callObject.off('track-started', handleTrackStarted);
      callObject.off('track-stopped', handleTrackStopped);
      callObject.off('camera-error', handleCameraError);
    };
  }, [callObject, conversationId, navigate, toast, addNotification, updateParticipants, debouncedUpdateParticipants, autoNavigateOnLeaveRef, syncLocalMediaState, trackStates]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // MEDIA TOGGLE HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════
  const toggleCamera = useCallback(async () => {
    const newState = !isCameraOn;
    devLog('Toggle', 'Camera:', isCameraOn, '->', newState);
    
    try {
      await callObject.setLocalVideo(newState);
      
      const localParticipantData = callObject.participants().local;
      const actualState = localParticipantData?.video !== false;
      
      if (actualState !== newState) {
        devLog('Toggle', 'Camera mismatch! Actual:', actualState);
      }
      setIsCameraOn(actualState);
      updateParticipants();
      
    } catch (error) {
      console.error('[Toggle] Camera error:', error);
      toast({
        title: "Kamera Hatası",
        description: "Kamera durumu değiştirilemedi.",
        variant: "destructive",
      });
    }
  }, [callObject, isCameraOn, toast, updateParticipants]);

  const toggleMic = useCallback(async () => {
    const newState = !isMicOn;
    devLog('Toggle', 'Mic:', isMicOn, '->', newState);
    
    try {
      await callObject.setLocalAudio(newState);
      
      const localParticipantData = callObject.participants().local;
      const actualState = localParticipantData?.audio !== false;
      
      if (actualState !== newState) {
        devLog('Toggle', 'Mic mismatch! Actual:', actualState);
      }
      setIsMicOn(actualState);
      updateParticipants();
      
    } catch (error) {
      console.error('[Toggle] Mic error:', error);
      toast({
        title: "Mikrofon Hatası",
        description: "Mikrofon durumu değiştirilemedi.",
        variant: "destructive",
      });
    }
  }, [callObject, isMicOn, toast, updateParticipants]);

  const leaveCall = useCallback(() => {
    autoNavigateOnLeaveRef.current = true;
    callObject.leave();
  }, [callObject, autoNavigateOnLeaveRef]);

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

  const remoteParticipants = participants.filter((p) => !p.local);

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

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="h-[100dvh] md:h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex flex-col overflow-hidden"
      >
        {/* Connection status bar */}
        <motion.div
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          className="px-3 py-1.5 md:px-4 md:py-2 bg-green-500/10 border-b border-green-500/20 flex items-center justify-center gap-2 md:gap-3"
        >
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs md:text-sm text-green-400">Görüşme aktif</span>
          <span className="text-xs md:text-sm text-muted-foreground">
            • {(localParticipant ? 1 : 0) + remoteParticipants.length} katılımcı
          </span>
          <div className="flex items-center gap-1 md:gap-1.5 px-2 py-0.5 rounded-full bg-background/50">
            <Clock className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
            <span className="text-xs md:text-sm font-medium">{formatTime(callDuration)}</span>
          </div>
        </motion.div>

        {/* Video Grid - mobilde ekranın tamamını kaplar */}
        <div className="flex-1 px-0 py-1 md:p-4 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 content-start md:content-center pb-[calc(68px+env(safe-area-inset-bottom,0px)+56px)] md:pb-0">
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

        {/* Audio for remote participants */}
        {remoteParticipants.map((participant) => (
          <FilteredRemoteAudio 
            key={`audio-${participant.session_id}`} 
            sessionId={participant.session_id} 
          />
        ))}

        {/* Control Bar - mobilde navbar üzerinde sticky */}
        <motion.div
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          className="fixed bottom-[calc(68px+env(safe-area-inset-bottom,0px))] md:relative md:bottom-auto left-0 right-0 z-40 p-3 md:p-4 flex items-center justify-center gap-3 bg-background/80 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.3)] md:shadow-none"
        >
          <ControlButton 
            variant={isCameraOn ? "secondary" : "destructive"} 
            onClick={toggleCamera}
            withHoverScale
            className="h-12 w-12 md:h-14 md:w-14"
          >
            {isCameraOn ? <Video className="h-5 w-5 md:h-6 md:w-6" /> : <VideoOff className="h-5 w-5 md:h-6 md:w-6" />}
          </ControlButton>
          <ControlButton 
            variant={isMicOn ? "secondary" : "destructive"} 
            onClick={toggleMic}
            withHoverScale
            className="h-12 w-12 md:h-14 md:w-14"
          >
            {isMicOn ? <Mic className="h-5 w-5 md:h-6 md:w-6" /> : <MicOff className="h-5 w-5 md:h-6 md:w-6" />}
          </ControlButton>
          <ControlButton 
            variant="destructive" 
            onClick={leaveCall} 
            withHoverScale
            className="h-12 w-12 md:h-14 md:w-14"
          >
            <PhoneOff className="h-5 w-5 md:h-6 md:w-6" />
          </ControlButton>
        </motion.div>
      </motion.div>

      <NotificationsOverlay notifications={notifications} onDismiss={removeNotification} />
    </>
  );
}
