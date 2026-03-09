import { useEffect, useCallback, useRef } from 'react';
import { DailyCall, DailyEventObjectParticipant, DailyEventObjectParticipantLeft } from '@daily-co/daily-js';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { devLog } from '@/lib/debug';

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY EVENTS HOOK
// Orchestrates all Daily.co event listeners for video calls
// Preserves module-level track states for StrictMode protection
// ═══════════════════════════════════════════════════════════════════════════════

type CallState = 'loading' | 'joining' | 'joined' | 'leaving' | 'error';

interface TrackState {
  video: boolean;
  audio: boolean;
}

export interface UseDailyEventsOptions {
  callObject: DailyCall;
  conversationId: string;
  trackStates: Map<string, TrackState>;
  setCallState: (state: CallState) => void;
  updateParticipants: () => void;
  debouncedUpdateParticipants: () => void;
  syncLocalMediaState: () => void;
  addNotification: (type: 'join' | 'leave', userName: string) => void;
  autoNavigateOnLeaveRef: React.MutableRefObject<boolean>;
}

// Module-level handler count for debugging StrictMode double-mounts
const handlerCountMap = new Map<string, number>();

function incrementHandlerCount(conversationId: string): number {
  const current = handlerCountMap.get(conversationId) || 0;
  const next = current + 1;
  handlerCountMap.set(conversationId, next);
  return next;
}

export function useDailyEvents({
  callObject,
  conversationId,
  trackStates,
  setCallState,
  updateParticipants,
  debouncedUpdateParticipants,
  syncLocalMediaState,
  addNotification,
  autoNavigateOnLeaveRef,
}: UseDailyEventsOptions) {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const currentCount = incrementHandlerCount(conversationId);
    
    devLog('DailyEvents', 'Registering handlers:', {
      conversationId,
      registrationCount: currentCount,
      meetingState: callObject.meetingState(),
    });
    
    // Check CURRENT meeting state immediately on mount
    const currentMeetingState = callObject.meetingState();
    devLog('DailyEvents', 'Initial meeting state on mount:', currentMeetingState);
    
    if (currentMeetingState === 'joined-meeting') {
      devLog('DailyEvents', 'Already joined on mount - transitioning callState to joined');
      setCallState('joined');
      updateParticipants();
    } else if (currentMeetingState === 'joining-meeting') {
      devLog('DailyEvents', 'Currently joining on mount - transitioning callState to joining');
      setCallState('joining');
    }

    // Event handlers for FUTURE state changes
    const handleJoiningMeeting = () => {
      devLog('DailyEvents', 'joining-meeting event fired');
      setCallState('joining');
    };

    const handleJoinedMeeting = () => {
      devLog('DailyEvents', 'joined-meeting event fired');
      setCallState('joined');
      updateParticipants();
    };

    const handleLeftMeeting = () => {
      devLog('DailyEvents', 'left-meeting event fired');
      setCallState('leaving');

      if (autoNavigateOnLeaveRef.current) {
        autoNavigateOnLeaveRef.current = false;
        setTimeout(() => navigate('/messages'), 1000);
      }
    };

    const handleError = (e: any) => {
      console.error('[DailyEvents] Daily error event:', e);
      setCallState('error');
      toast({
        title: "Bağlantı Hatası",
        description: "Video araması başlatılamadı.",
        variant: "destructive",
      });
    };

    const handleParticipantJoined = (event: DailyEventObjectParticipant | undefined) => {
      devLog('DailyEvents', 'participant-joined:', event?.participant?.user_name);
      if (event?.participant && !event.participant.local) {
        addNotification('join', event.participant.user_name || 'Katılımcı');
      }
      updateParticipants();
    };

    const handleParticipantUpdated = () => {
      debouncedUpdateParticipants();
    };

    const handleParticipantLeft = (event: DailyEventObjectParticipantLeft | undefined) => {
      devLog('DailyEvents', 'participant-left:', event?.participant?.user_name);
      
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
      devLog('DailyEvents', 'camera-error event - syncing state');
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
      devLog('DailyEvents', 'Cleaning up handlers for:', conversationId);
      
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
  }, [
    callObject, 
    conversationId, 
    navigate, 
    toast, 
    addNotification, 
    updateParticipants, 
    debouncedUpdateParticipants, 
    autoNavigateOnLeaveRef, 
    syncLocalMediaState, 
    trackStates,
    setCallState,
  ]);
}
