/**
 * Route prefetching utilities for faster navigation
 */

const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a route's JavaScript bundle
 */
export const prefetchRoute = (routePath: string): void => {
  if (prefetchedRoutes.has(routePath)) {
    return;
  }

  // Mark as prefetched
  prefetchedRoutes.add(routePath);

  // Create link element for prefetch
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = routePath;
  link.as = 'script';
  
  document.head.appendChild(link);
};

/**
 * Prefetch critical routes on idle
 */
export const prefetchCriticalRoutes = (): void => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      const criticalRoutes = [
        '/explore',
        '/auth/sign-in',
        '/auth/sign-up',
      ];
      
      criticalRoutes.forEach(route => prefetchRoute(route));
    }, { timeout: 2000 });
  }
};
