import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Skeleton } from './components/ui/skeleton';
import { prefetchCriticalRoutes } from './lib/routePrefetch';
import './App.css';

// Lazy load pages for better performance
const Index = lazy(() => import('./pages/Index'));
const SignIn = lazy(() => import('./pages/auth/SignIn'));
const SignUp = lazy(() => import('./pages/auth/SignUp'));
const Explore = lazy(() => import('./pages/Explore'));
const Messages = lazy(() => import('./pages/Messages'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Appointments = lazy(() => import('./pages/Appointments'));
const CategoryDetail = lazy(() => import('./pages/CategoryDetail'));
const SubCategoryDetail = lazy(() => import('./pages/SubCategoryDetail'));
const CuriosityDetail = lazy(() => import('./pages/CuriosityDetail'));
const ListingDetail = lazy(() => import('./pages/ListingDetail'));
const MyListings = lazy(() => import('./pages/teacher/MyListings'));
const TeacherEarnings = lazy(() => import('./pages/teacher/Earnings'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const Approvals = lazy(() => import('./pages/admin/Approvals'));
const AdminEarnings = lazy(() => import('./pages/admin/Earnings'));
const TeachersManagement = lazy(() => import('./pages/admin/Teachers'));
const UsersManagement = lazy(() => import('./pages/admin/Users'));
const TeacherEdit = lazy(() => import('./pages/admin/TeacherEdit'));
const CategoriesManagement = lazy(() => import('./pages/admin/Categories'));
const PagesManagement = lazy(() => import('./pages/admin/Pages'));
const CuriositiesManagement = lazy(() => import('./pages/admin/Curiosities'));
const About = lazy(() => import('./pages/static/About'));
const HowItWorks = lazy(() => import('./pages/static/HowItWorks'));
const Production = lazy(() => import('./pages/static/Production'));
const Contact = lazy(() => import('./pages/static/Contact'));
const Terms = lazy(() => import('./pages/static/Terms'));
const Privacy = lazy(() => import('./pages/static/Privacy'));
const FAQ = lazy(() => import('./pages/static/FAQ'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: 1,
    },
  },
});

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string[] }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  if (!user) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  if (requiredRole && role && !requiredRole.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/sign-in" element={user ? <Navigate to="/" replace /> : <SignIn />} />
          <Route path="/auth/sign-up" element={user ? <Navigate to="/" replace /> : <SignUp />} />
          <Route path="/explore" element={<Explore />} />
          
          <Route path="/categories/:slug" element={<CategoryDetail />} />
          <Route path="/categories/:slug/:subslug" element={<SubCategoryDetail />} />
          <Route path="/curiosities/:slug" element={<CuriosityDetail />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/:id" element={<PublicProfile />} />
          <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
          
          <Route path="/teacher/my-listings" element={<ProtectedRoute requiredRole={['teacher']}><MyListings /></ProtectedRoute>} />
          <Route path="/teacher/earnings" element={<ProtectedRoute requiredRole={['teacher']}><TeacherEarnings /></ProtectedRoute>} />
          
          <Route path="/admin" element={<ProtectedRoute requiredRole={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requiredRole={['admin']}><UsersManagement /></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute requiredRole={['admin']}><Approvals /></ProtectedRoute>} />
          <Route path="/admin/earnings" element={<ProtectedRoute requiredRole={['admin']}><AdminEarnings /></ProtectedRoute>} />
          <Route path="/admin/teachers" element={<ProtectedRoute requiredRole={['admin']}><TeachersManagement /></ProtectedRoute>} />
          <Route path="/admin/teachers/:id" element={<ProtectedRoute requiredRole={['admin']}><TeacherEdit /></ProtectedRoute>} />
          <Route path="/admin/categories" element={<ProtectedRoute requiredRole={['admin']}><CategoriesManagement /></ProtectedRoute>} />
          <Route path="/admin/pages" element={<ProtectedRoute requiredRole={['admin']}><PagesManagement /></ProtectedRoute>} />
          <Route path="/admin/curiosities" element={<ProtectedRoute requiredRole={['admin']}><CuriositiesManagement /></ProtectedRoute>} />
          
          <Route path="/about" element={<About />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/production" element={<Production />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/faq" element={<FAQ />} />
          
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
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
