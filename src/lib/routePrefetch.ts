/**
 * Route prefetching utilities for faster navigation
 */

const prefetchedRoutes = new Set<string>();
const prefetchedImages = new Set<string>();

/**
 * Prefetch a route - disabled as SPA routes don't need prefetching
 * The lazy-loaded components are already handled by Vite's code splitting
 */
export const prefetchRoute = (_routePath: string): void => {
  // Route prefetching removed - causes 404 errors on deployed sites
  // SPA routing is handled client-side, not by loading route paths as resources
};

/**
 * Prefetch an image
 */
export const prefetchImage = (imageUrl: string): void => {
  if (!imageUrl || prefetchedImages.has(imageUrl)) {
    return;
  }

  prefetchedImages.add(imageUrl);

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = imageUrl;
  link.as = 'image';
  
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

/**
 * Preconnect to external domains for faster resource loading
 */
export const preconnectDomains = (): void => {
  const domains = [
    'https://egjuybvfhxazpvbeaupy.supabase.co',
  ];

  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // Also add dns-prefetch as fallback
    const dnsLink = document.createElement('link');
    dnsLink.rel = 'dns-prefetch';
    dnsLink.href = domain;
    document.head.appendChild(dnsLink);
  });
};

/**
 * Initialize all prefetch optimizations
 */
export const initPrefetch = (): void => {
  // Preconnect to external domains immediately
  preconnectDomains();
  
  // Prefetch critical routes on idle
  prefetchCriticalRoutes();
};
