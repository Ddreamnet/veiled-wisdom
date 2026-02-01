// ═══════════════════════════════════════════════════════════════════════════════
// DEBUG UTILITIES
// Conditional logging helpers to reduce console noise in development
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a logger that only logs when the value changes (transition-based logging)
 * Useful for tracking state transitions without spamming the console on every render
 * 
 * @example
 * const logCallState = createTransitionLogger<CallState>('CallState');
 * logCallState('joined'); // logs: [CallState] Transition: joined
 * logCallState('joined'); // no output (same value)
 * logCallState('leaving'); // logs: [CallState] Transition: leaving
 */
export function createTransitionLogger<T>(tag: string) {
  let prev: T | undefined;
  
  return (current: T, extra?: Record<string, unknown>) => {
    if (!import.meta.env.DEV) return;
    
    const currentStr = JSON.stringify(current);
    const prevStr = JSON.stringify(prev);
    
    if (currentStr !== prevStr) {
      if (extra) {
        console.log(`[${tag}] Transition:`, current, extra);
      } else {
        console.log(`[${tag}] Transition:`, current);
      }
      prev = current;
    }
  };
}

/**
 * Creates a logger that only logs when explicitly enabled
 * Reduces noise but allows debugging when needed
 */
export function createConditionalLogger(tag: string, enabled: boolean = import.meta.env.DEV) {
  return (...args: unknown[]) => {
    if (!enabled) return;
    console.log(`[${tag}]`, ...args);
  };
}

/**
 * Dev-only console.log wrapper
 * Logs are stripped in production builds
 */
export function devLog(tag: string, ...args: unknown[]) {
  if (!import.meta.env.DEV) return;
  console.log(`[${tag}]`, ...args);
}

/**
 * Dev-only console.warn wrapper
 */
export function devWarn(tag: string, ...args: unknown[]) {
  if (!import.meta.env.DEV) return;
  console.warn(`[${tag}]`, ...args);
}

/**
 * Creates a throttled logger that only logs once per interval
 * Useful for high-frequency events like participant updates
 */
export function createThrottledLogger(tag: string, intervalMs: number = 1000) {
  let lastLogTime = 0;
  
  return (...args: unknown[]) => {
    if (!import.meta.env.DEV) return;
    
    const now = Date.now();
    if (now - lastLogTime >= intervalMs) {
      console.log(`[${tag}]`, ...args);
      lastLogTime = now;
    }
  };
}

/**
 * Log only when a specific condition is met
 * Useful for edge case debugging
 */
export function conditionalLog(condition: boolean, tag: string, ...args: unknown[]) {
  if (!import.meta.env.DEV || !condition) return;
  console.log(`[${tag}]`, ...args);
}
