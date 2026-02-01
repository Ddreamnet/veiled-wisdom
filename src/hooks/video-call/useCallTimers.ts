import { useEffect, useState, useRef, useCallback } from 'react';
import { DailyCall, DailyParticipant } from '@daily-co/daily-js';

// ═══════════════════════════════════════════════════════════════════════════════
// CALL TIMERS HOOK
// Manages waiting time, call duration, and auto-leave timers
// ═══════════════════════════════════════════════════════════════════════════════

type CallState = 'loading' | 'joining' | 'joined' | 'leaving' | 'error';

const SOLO_TIMEOUT_SECONDS = 30 * 60; // 30 minutes alone = auto-leave
const MAX_CALL_DURATION_SECONDS = 2 * 60 * 60; // 2 hours max = auto-leave
const MAX_DURATION_CHECK_INTERVAL_MS = 10000;

export interface CallTimersResult {
  waitingTime: number;
  callDuration: number;
  autoNavigateOnLeaveRef: React.MutableRefObject<boolean>;
}

export function useCallTimers(
  callState: CallState,
  participants: DailyParticipant[],
  callObject: DailyCall,
  onSoloTimeout: () => void,
  onMaxDuration: () => void
): CallTimersResult {
  const [waitingTime, setWaitingTime] = useState(0);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [roomJoinTime, setRoomJoinTime] = useState<number | null>(null);
  const autoNavigateOnLeaveRef = useRef(false);

  const remoteCount = participants.filter((p) => !p.local).length;

  // Track when we join the room
  useEffect(() => {
    if (callState === 'joined' && roomJoinTime === null) {
      setRoomJoinTime(Date.now());
    }
  }, [callState, roomJoinTime]);

  // Waiting time counter (when alone)
  useEffect(() => {
    if (remoteCount === 0 && callState === 'joined') {
      const interval = setInterval(() => setWaitingTime((prev) => prev + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [remoteCount, callState]);

  // Call duration counter (when with others)
  useEffect(() => {
    if (remoteCount > 0 && callState === 'joined') {
      if (callStartTime === null) {
        setCallStartTime(Date.now());
      }
      const interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [remoteCount, callState, callStartTime]);

  // Solo timeout - auto leave if alone for too long
  useEffect(() => {
    if (waitingTime >= SOLO_TIMEOUT_SECONDS && callState === 'joined') {
      onSoloTimeout();
      autoNavigateOnLeaveRef.current = true;
      callObject.leave();
    }
  }, [waitingTime, callState, callObject, onSoloTimeout]);

  // Max duration check - prevent infinite calls
  useEffect(() => {
    if (!roomJoinTime || callState !== 'joined') return;

    const checkMaxDuration = () => {
      const elapsed = (Date.now() - roomJoinTime) / 1000;
      if (elapsed >= MAX_CALL_DURATION_SECONDS) {
        onMaxDuration();
        autoNavigateOnLeaveRef.current = true;
        callObject.leave();
      }
    };

    const interval = setInterval(checkMaxDuration, MAX_DURATION_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [roomJoinTime, callState, callObject, onMaxDuration]);

  return { 
    waitingTime, 
    callDuration, 
    autoNavigateOnLeaveRef,
  };
}
