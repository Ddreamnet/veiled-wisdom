// ═══════════════════════════════════════════════════════════════════════════════
// APPLICATION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Platform commission rate: 25% platform, 75% teacher */
export const PLATFORM_COMMISSION_RATE = 0.25;

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE LAYOUT CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Bottom nav content area height in px (excludes safe area inset) */
export const BOTTOM_NAV_HEIGHT = 56;

/** Extra breathing room between content and nav */
export const BOTTOM_NAV_PADDING_EXTRA = 12;

/** Total bottom offset for main content padding: nav height + extra spacing */
export const BOTTOM_NAV_CONTENT_OFFSET = BOTTOM_NAV_HEIGHT + BOTTOM_NAV_PADDING_EXTRA; // 68

/** Helper: CSS calc string for bottom content padding including safe area */
export const bottomNavPaddingStyle = `calc(${BOTTOM_NAV_CONTENT_OFFSET}px + env(safe-area-inset-bottom, 0px))`;
