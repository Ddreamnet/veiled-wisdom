import { Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MobileHeader, MobileBottomNav } from './components/mobile';
import { Skeleton } from './components/ui/skeleton';
import { prefetchCriticalRoutes } from './lib/routePrefetch';
import { usePresence } from './hooks/usePresence';
import { ProtectedRoute, allRoutes, RouteConfig } from './routes';
import './App.css';

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  </div>
);

// Optimized QueryClient with aggressive caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: 1,
    },
  },
});

// Render a single route based on its configuration
function renderRoute(route: RouteConfig, user: any) {
  const { path, element: Element, protected: isProtected, requiredRole, authRedirect } = route;
  
  if (authRedirect && user) {
    return <Route key={path} path={path} element={<Navigate to="/" replace />} />;
  }
  
  if (isProtected) {
    return (
      <Route
        key={path}
        path={path}
        element={
          <ProtectedRoute requiredRole={requiredRole}>
            <Element />
          </ProtectedRoute>
        }
      />
    );
  }
  
  return <Route key={path} path={path} element={<Element />} />;
}

import { NotFound } from './routes/routeConfig';

// JS-based mobile detection — accurate on first render, no flash
function useIsMobileLayout() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia('(max-width: 767px)').matches
  );

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

// Conditional MobileHeader — hidden on /messages
function MobileHeaderWrapper() {
  const location = useLocation();
  if (location.pathname.startsWith('/messages')) return null;
  return <MobileHeader />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const hasRenderedRef = useRef(false);
  const isMobile = useIsMobileLayout();
  
  // Track user presence (heartbeat)
  usePresence();

  if (!loading) {
    hasRenderedRef.current = true;
  }

  if (loading && !hasRenderedRef.current) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  const routeElements = allRoutes.map(route => renderRoute(route, user));

  // Single Routes — no more double-mounting of page components
  const content = (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {routeElements}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );

  if (isMobile) {
    return (
      <div className="h-[100dvh] flex flex-col overflow-hidden">
        <MobileHeaderWrapper />
        <main 
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
        >
          {content}
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{content}</main>
      <Footer />
    </div>
  );
}

function App() {
  useEffect(() => {
    prefetchCriticalRoutes();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AuthProvider>
            <AppRoutes />
            <Toaster />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
