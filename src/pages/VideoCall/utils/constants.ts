// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CALL CONSTANTS
// Centralized constant values for the VideoCall module
// ═══════════════════════════════════════════════════════════════════════════════

// Timer thresholds
export const SOLO_TIMEOUT_SECONDS = 30 * 60; // 30 minutes alone = auto-leave
export const MAX_CALL_DURATION_SECONDS = 2 * 60 * 60; // 2 hours max = auto-leave
export const MAX_DURATION_CHECK_INTERVAL_MS = 10000;

// Notification settings
export const NOTIFICATION_DURATION_MS = 4000;
export const DUPLICATE_NOTIFICATION_THRESHOLD_MS = 5000;

// Connection settings
export const JOIN_TIMEOUT_MS = 20000;

// Debounce settings
export const PARTICIPANT_UPDATE_DEBOUNCE_MS = 50;
