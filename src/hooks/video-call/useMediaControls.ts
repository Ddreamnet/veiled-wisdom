import { useState, useCallback, useRef, useEffect } from 'react';
import { DailyCall } from '@daily-co/daily-js';
import { devLog, devWarn } from '@/lib/debug';

// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA CONTROLS HOOK
// Manages camera and microphone state with Daily.co as single source of truth
// 
// SECURITY GUARANTEE:
// 1. Await Daily API call completion before updating state
// 2. Verify actual participant state after API call
// 3. Update state based on actual state (not requested state)
// ═══════════════════════════════════════════════════════════════════════════════

export interface MediaControlsResult {
  isCameraOn: boolean;
  isMicOn: boolean;
  toggleCamera: () => Promise<void>;
  toggleMic: () => Promise<void>;
  syncFromDaily: () => void;
}

export function useMediaControls(
  callObject: DailyCall,
  onError?: (type: 'camera' | 'mic', error: unknown) => void
): MediaControlsResult {
  // Initialize from Daily's current state, not hardcoded true
  const [isCameraOn, setIsCameraOn] = useState(() => {
    try {
      const local = callObject.participants().local;
      return local?.video !== false;
    } catch { 
      return true; 
    }
  });
  
  const [isMicOn, setIsMicOn] = useState(() => {
    try {
      const local = callObject.participants().local;
      return local?.audio !== false;
    } catch { 
      return true; 
    }
  });
  
  // Refs to prevent stale closure issues in callbacks
  const isCameraOnRef = useRef(isCameraOn);
  const isMicOnRef = useRef(isMicOn);
  
  useEffect(() => { 
    isCameraOnRef.current = isCameraOn; 
  }, [isCameraOn]);
  
  useEffect(() => { 
    isMicOnRef.current = isMicOn; 
  }, [isMicOn]);

  // Sync state from Daily (single source of truth)
  const syncFromDaily = useCallback(() => {
    try {
      const local = callObject.participants().local;
      if (!local) return;
      
      const videoOn = local.video !== false;
      const audioOn = local.audio !== false;
      
      // Only update state if actually changed (prevent unnecessary renders)
      if (isCameraOnRef.current !== videoOn) {
        devLog('MediaControls', 'Camera state sync:', isCameraOnRef.current, '->', videoOn);
        setIsCameraOn(videoOn);
      }
      if (isMicOnRef.current !== audioOn) {
        devLog('MediaControls', 'Mic state sync:', isMicOnRef.current, '->', audioOn);
        setIsMicOn(audioOn);
      }
    } catch (e) {
      // Ignore errors during destroy
      devWarn('MediaControls', 'sync error:', e);
    }
  }, [callObject]);

  const toggleCamera = useCallback(async () => {
    const currentState = isCameraOnRef.current;
    const newState = !currentState;
    devLog('MediaControls', 'toggleCamera:', { currentState, requestedNewState: newState });
    
    try {
      // Daily.co API: false = track'i durdurur ve karşı tarafa göndermez
      await callObject.setLocalVideo(newState);
      
      // VERIFICATION: Check that requested state was actually applied
      const localParticipantData = callObject.participants().local;
      const actualState = localParticipantData?.video !== false;
      
      devLog('MediaControls', 'Camera toggle verified:', {
        requestedState: newState,
        actualState,
        match: actualState === newState,
        videoTrackPresent: !!localParticipantData?.videoTrack,
      });
      
      // Update state to ACTUAL state (for security)
      if (actualState !== newState) {
        devWarn('MediaControls', 'Camera state mismatch! Using actual state:', actualState);
      }
      setIsCameraOn(actualState);
      
    } catch (error) {
      console.error('[MediaControls] toggleCamera error:', error);
      onError?.('camera', error);
      throw error;
    }
  }, [callObject, onError]);

  const toggleMic = useCallback(async () => {
    const currentState = isMicOnRef.current;
    const newState = !currentState;
    devLog('MediaControls', 'toggleMic:', { currentState, requestedNewState: newState });
    
    try {
      // Daily.co API: false = audio track'i durdurur ve karşı tarafa göndermez
      await callObject.setLocalAudio(newState);
      
      // VERIFICATION: Check that requested state was actually applied
      const localParticipantData = callObject.participants().local;
      const actualState = localParticipantData?.audio !== false;
      
      devLog('MediaControls', 'Mic toggle verified:', {
        requestedState: newState,
        actualState,
        match: actualState === newState,
        audioTrackPresent: !!localParticipantData?.audioTrack,
      });
      
      // Update state to ACTUAL state (for security)
      if (actualState !== newState) {
        devWarn('MediaControls', 'Mic state mismatch! Using actual state:', actualState);
      }
      setIsMicOn(actualState);
      
    } catch (error) {
      console.error('[MediaControls] toggleMic error:', error);
      onError?.('mic', error);
      throw error;
    }
  }, [callObject, onError]);

  return {
    isCameraOn,
    isMicOn,
    toggleCamera,
    toggleMic,
    syncFromDaily,
  };
}
