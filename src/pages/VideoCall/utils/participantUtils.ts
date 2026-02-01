// ═══════════════════════════════════════════════════════════════════════════════
// PARTICIPANT UTILITIES
// Functions for managing participant state, deduplication, and logging
// ═══════════════════════════════════════════════════════════════════════════════

import { DailyParticipant } from '@daily-co/daily-js';
import { devLog } from '@/lib/debug';
import type { TrackState } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE-LEVEL STATE
// Persists across React StrictMode double-mounts and component re-renders
// Organized by conversationId to prevent cross-conversation interference
// ═══════════════════════════════════════════════════════════════════════════════

const globalTrackStates = new Map<string, Map<string, TrackState>>();
const handlerRegistrationCount = new Map<string, number>();

/**
 * Gets or creates track states map for a specific conversation
 */
export function getConversationTrackStates(conversationId: string): Map<string, TrackState> {
  if (!globalTrackStates.has(conversationId)) {
    globalTrackStates.set(conversationId, new Map());
  }
  return globalTrackStates.get(conversationId)!;
}

/**
 * Cleans up track states when leaving a conversation
 */
export function cleanupConversationTrackStates(conversationId: string): void {
  globalTrackStates.delete(conversationId);
  handlerRegistrationCount.delete(conversationId);
}

/**
 * Increments and returns handler registration count for debugging
 */
export function incrementHandlerCount(conversationId: string): number {
  const currentCount = (handlerRegistrationCount.get(conversationId) || 0) + 1;
  handlerRegistrationCount.set(conversationId, currentCount);
  return currentCount;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICIPANT IDENTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets a stable key for identifying a participant across sessions
 */
export function getParticipantKey(p: DailyParticipant): string {
  const pAny = p as any;
  return pAny?.userData?.appUserId || pAny?.user_id || pAny?.user_name || p.session_id;
}

/**
 * Checks if a remote participant is actually a mirror of the local user
 * This can happen with duplicate sessions or echo scenarios
 */
export function isMirrorOfLocal(p: DailyParticipant, local: DailyParticipant | null): boolean {
  if (!local || p.local) return false;

  const lp = local as any;
  const rp = p as any;

  // Check for matching track IDs
  if (lp?.videoTrack?.id && rp?.videoTrack?.id && lp.videoTrack.id === rp.videoTrack.id) return true;
  if (lp?.audioTrack?.id && rp?.audioTrack?.id && lp.audioTrack.id === rp.audioTrack.id) return true;

  // Check for matching user identities
  if (lp?.userData?.appUserId && rp?.userData?.appUserId && lp.userData.appUserId === rp.userData.appUserId) return true;
  if (lp?.user_id && rp?.user_id && lp.user_id === rp.user_id) return true;
  if (lp?.user_name && rp?.user_name && lp.user_name === rp.user_name) return true;

  // If remote has no identity but has tracks, likely a ghost
  const hasAnyIdentity = !!(rp?.userData?.appUserId || rp?.user_id || rp?.user_name);
  if (!hasAnyIdentity && (rp?.videoTrack || rp?.audioTrack)) return true;

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTICIPANT SANITIZATION
// Deduplicates participants and selects the best instance for each user
// ═══════════════════════════════════════════════════════════════════════════════

export function sanitizeParticipants(participantList: DailyParticipant[]): { 
  local: DailyParticipant | null; 
  sanitized: DailyParticipant[] 
} {
  // Find the best local participant (prioritize one with active video)
  const locals = participantList.filter((p) => p.local);
  const local =
    locals.find((p) => !!p.videoTrack) ||
    locals.find((p) => !!p.audioTrack) ||
    locals[0] ||
    null;

  // Filter remote participants, excluding mirrors of local
  const remoteCandidates = participantList
    .filter((p) => !p.local)
    .filter((p) => !isMirrorOfLocal(p, local));

  // Deduplicate by participant key
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
    // CRITICAL SECURITY: Prioritize "off" states for privacy
    // If new participant says video/audio is OFF, prefer it (prevents leaks)
    // ═══════════════════════════════════════════════════════════════════════════
    const existingVideoFlag = eAny.video !== false;
    const pVideoFlag = pAny.video !== false;
    const existingAudioFlag = eAny.audio !== false;
    const pAudioFlag = pAny.audio !== false;

    // Security priority: "off" updates always win
    if (existingVideoFlag && !pVideoFlag) {
      remoteMap.set(key, p);
      continue;
    }
    if (existingAudioFlag && !pAudioFlag) {
      remoteMap.set(key, p);
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DETERMINISTIC SELECTION: Use lowest session_id for consistency
    // Prevents AnimatePresence key changes causing UI flickering
    // ═══════════════════════════════════════════════════════════════════════════
    const existingSessionId = existing.session_id;
    const pSessionId = p.session_id;
    
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

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITION-BASED LOGGING
// Only logs when participant count or composition actually changes
// ═══════════════════════════════════════════════════════════════════════════════

const logParticipantsTransition = (() => {
  let prevCount = -1;
  let prevKeys = '';
  
  return (raw: DailyParticipant[], sanitized: DailyParticipant[]): void => {
    if (!import.meta.env.DEV) return;
    
    const count = sanitized.length;
    const keys = sanitized.map((p: any) => p.session_id).sort().join(',');
    
    if (count !== prevCount || keys !== prevKeys) {
      devLog('Participants', 'Transition:', {
        count: { from: prevCount, to: count },
        sanitized: sanitized.map((p: any) => ({
          session_id: p.session_id.substring(0, 8),
          local: p.local,
          user_name: p.user_name,
        })),
      });
      prevCount = count;
      prevKeys = keys;
    }
  };
})();

/**
 * Logs participant changes (only on actual transitions)
 */
export function logParticipants(raw: DailyParticipant[], sanitized: DailyParticipant[]): void {
  logParticipantsTransition(raw, sanitized);
}
