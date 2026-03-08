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

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE SELF-VIEW & PiP CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Portrait aspect ratio for mobile self-view (3:4) — single source of truth */
export const MOBILE_SELF_VIEW_ASPECT = 3 / 4;

// PiP gesture detection
export const PIP_DRAG_THRESHOLD = 25;       // px — primary criterion for tap vs drag
export const MAX_TAP_DURATION_MS = 400;     // ms — long-press guard (>400ms = not a tap)
export const POST_DRAG_IGNORE_MS = 100;     // ms — ignore taps immediately after drag end

// PiP size limits (mobile)
export const PIP_MIN_WIDTH = 90;
export const PIP_MAX_WIDTH = 140;
export const PIP_WIDTH_PERCENT = 0.28;
