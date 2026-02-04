// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CALL HOOKS
// Modular hooks extracted from VideoCall.tsx for better maintainability
// ═══════════════════════════════════════════════════════════════════════════════

export { useCallNotifications, type NotificationItem } from './useCallNotifications';
export { useMediaControls, type MediaControlsResult } from './useMediaControls';
export { useCallTimers, type CallTimersResult } from './useCallTimers';
export { useParticipants, sanitizeParticipants, type ParticipantsResult } from './useParticipants';
export { useCallTermination } from './useCallTermination';
