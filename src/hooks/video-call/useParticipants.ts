import { useState, useCallback, useRef, useEffect } from 'react';
import { DailyCall, DailyParticipant } from '@daily-co/daily-js';
import { devLog } from '@/lib/debug';

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICIPANTS HOOK
// Manages participant list with sanitization and debounced updates
// ═══════════════════════════════════════════════════════════════════════════════

const DEBOUNCE_MS = 50;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getParticipantKey(p: DailyParticipant): string {
  const pAny = p as any;
  return pAny?.userData?.appUserId || pAny?.user_id || pAny?.user_name || p.session_id;
}

function isMirrorOfLocal(p: DailyParticipant, local: DailyParticipant | null): boolean {
  if (!local || p.local) return false;

  const lp = local as any;
  const rp = p as any;

  if (lp?.videoTrack?.id && rp?.videoTrack?.id && lp.videoTrack.id === rp.videoTrack.id) return true;
  if (lp?.audioTrack?.id && rp?.audioTrack?.id && lp.audioTrack.id === rp.audioTrack.id) return true;
  if (lp?.userData?.appUserId && rp?.userData?.appUserId && lp.userData.appUserId === rp.userData.appUserId) return true;
  if (lp?.user_id && rp?.user_id && lp.user_id === rp.user_id) return true;
  if (lp?.user_name && rp?.user_name && lp.user_name === rp.user_name) return true;

  const hasAnyIdentity = !!(rp?.userData?.appUserId || rp?.user_id || rp?.user_name);
  if (!hasAnyIdentity && (rp?.videoTrack || rp?.audioTrack)) return true;

  return false;
}

export function sanitizeParticipants(participantList: DailyParticipant[]): { 
  local: DailyParticipant | null; 
  sanitized: DailyParticipant[] 
} {
  const locals = participantList.filter((p) => p.local);
  const local =
    locals.find((p) => !!p.videoTrack) ||
    locals.find((p) => !!p.audioTrack) ||
    locals[0] ||
    null;

  const remoteCandidates = participantList
    .filter((p) => !p.local)
    .filter((p) => !isMirrorOfLocal(p, local));

  const remoteMap = new Map<string, DailyParticipant>();
  for (const p of remoteCandidates) {
    const key = String(getParticipantKey(p));
    const existing = remoteMap.get(key);
    if (!existing) {
      remoteMap.set(key, p);
      continue;
    }
    const eAny = existing as any;
    const pAny = p as any;

    // ═══════════════════════════════════════════════════════════════════════════
    // CRITICAL SECURITY: Detect camera/mic off state with PRIORITY
    // If new participant says video/audio is OFF, prefer it for SECURITY
    // This prevents "last frame" or "audio leak" problems
    // ═══════════════════════════════════════════════════════════════════════════
    const existingVideoFlag = eAny.video !== false;
    const pVideoFlag = pAny.video !== false;
    const existingAudioFlag = eAny.audio !== false;
    const pAudioFlag = pAny.audio !== false;

    // Security priority: "off" update always wins
    if (existingVideoFlag && !pVideoFlag) {
      remoteMap.set(key, p);
      continue;
    }
    if (existingAudioFlag && !pAudioFlag) {
      remoteMap.set(key, p);
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DETERMINISTIC SELECTION: Choose consistent session_id for same user
    // Alphabetically select lowest session_id - same result every render
    // This prevents AnimatePresence key change flickering
    // ═══════════════════════════════════════════════════════════════════════════
    const existingSessionId = existing.session_id;
    const pSessionId = p.session_id;
    
    // If same media state, deterministically select lowest session_id
    if (existingVideoFlag === pVideoFlag && existingAudioFlag === pAudioFlag) {
      if (pSessionId < existingSessionId) {
        remoteMap.set(key, p);
      }
    }
  }

  const sanitized: DailyParticipant[] = [
    ...(local ? [local] : []),
    ...Array.from(remoteMap.values()),
  ];

  return { local, sanitized };
}

export interface ParticipantsResult {
  participants: DailyParticipant[];
  localParticipant: DailyParticipant | null;
  remoteParticipants: DailyParticipant[];
  updateParticipants: () => void;
  debouncedUpdateParticipants: () => void;
}

export function useParticipants(
  callObject: DailyCall,
  onUpdate?: () => void
): ParticipantsResult {
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [localParticipant, setLocalParticipant] = useState<DailyParticipant | null>(null);
  const updateDebounceRef = useRef<number | null>(null);
  const prevParticipantCountRef = useRef<number>(0);

  const updateParticipants = useCallback(() => {
    const participantObj = callObject.participants();
    const participantList = Object.values(participantObj);
    const { local, sanitized } = sanitizeParticipants(participantList);

    setLocalParticipant(local);
    setParticipants(sanitized);

    // Only log when count changes (reduces noise)
    if (prevParticipantCountRef.current !== sanitized.length) {
      devLog('Participants', 'Count changed:', prevParticipantCountRef.current, '->', sanitized.length);
      prevParticipantCountRef.current = sanitized.length;
    }

    onUpdate?.();
  }, [callObject, onUpdate]);

  // Debounced version to batch rapid updates (50ms window)
  const debouncedUpdateParticipants = useCallback(() => {
    if (updateDebounceRef.current) {
      window.clearTimeout(updateDebounceRef.current);
    }
    updateDebounceRef.current = window.setTimeout(() => {
      updateParticipants();
      updateDebounceRef.current = null;
    }, DEBOUNCE_MS);
  }, [updateParticipants]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (updateDebounceRef.current) {
        window.clearTimeout(updateDebounceRef.current);
      }
    };
  }, []);

  const remoteParticipants = participants.filter((p) => !p.local);

  return {
    participants,
    localParticipant,
    remoteParticipants,
    updateParticipants,
    debouncedUpdateParticipants,
  };
}
