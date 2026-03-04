import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * Detects mobile layout using matchMedia.
 * Uses initializer function for SSR-safe first render without flash.
 */
export function useIsMobileLayout() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
