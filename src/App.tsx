import { Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
  
  // Auth routes redirect to home if user is logged in
  if (authRedirect && user) {
    return <Route key={path} path={path} element={<Navigate to="/" replace />} />;
  }
  
  // Protected routes require authentication
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
  
  // Public routes
  return <Route key={path} path={path} element={<Element />} />;
}

// Import NotFound lazily for catch-all route
import { NotFound } from './routes/routeConfig';

function AppRoutes() {
  const { user, loading } = useAuth();
  const hasRenderedRef = useRef(false);
  
  // Track user presence (heartbeat)
  usePresence();

  // Once routes have rendered once, never show loading screen again to prevent remounting
  if (!loading) {
    hasRenderedRef.current = true;
  }

  // Only show loading on initial load, not on subsequent auth state changes
  if (loading && !hasRenderedRef.current) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  const routeElements = allRoutes.map(route => renderRoute(route, user));

  return (
    <>
      {/* Desktop & Tablet Layout */}
      <div className="min-h-screen flex-col hidden md:flex">
        <Header />
        <main className="flex-1">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {routeElements}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>

      {/* Mobile Layout */}
      {/* Mobile Layout - Shell structure with contained scroll */}
      <div className="h-[100dvh] flex flex-col md:hidden overflow-hidden">
        {/* Hide MobileHeader on Messages page - it has its own header */}
        <Routes>
          <Route path="/messages" element={null} />
          <Route path="*" element={<MobileHeader />} />
        </Routes>
        <main 
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
        >
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {routeElements}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <MobileBottomNav />
      </div>
    </>
  );
}

function App() {
  // Prefetch critical routes on mount
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
