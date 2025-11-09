import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import Index from './pages/Index';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import Explore from './pages/Explore';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import Appointments from './pages/Appointments';
import CategoryDetail from './pages/CategoryDetail';
import SubCategoryDetail from './pages/SubCategoryDetail';
import CuriosityDetail from './pages/CuriosityDetail';
import ListingDetail from './pages/ListingDetail';
import MyListings from './pages/teacher/MyListings';
import TeacherEarnings from './pages/teacher/Earnings';
import AdminDashboard from './pages/admin/Dashboard';
import Approvals from './pages/admin/Approvals';
import AdminEarnings from './pages/admin/Earnings';
import TeachersManagement from './pages/admin/Teachers';
import CategoriesManagement from './pages/admin/Categories';
import PagesManagement from './pages/admin/Pages';
import CuriositiesManagement from './pages/admin/Curiosities';
import About from './pages/static/About';
import HowItWorks from './pages/static/HowItWorks';
import Production from './pages/static/Production';
import Contact from './pages/static/Contact';
import Terms from './pages/static/Terms';
import Privacy from './pages/static/Privacy';
import FAQ from './pages/static/FAQ';
import NotFound from './pages/NotFound';
import './App.css';

const queryClient = new QueryClient();

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
          <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
          
          <Route path="/my-listings" element={<ProtectedRoute requiredRole={['teacher']}><MyListings /></ProtectedRoute>} />
          <Route path="/earnings" element={<ProtectedRoute requiredRole={['teacher']}><TeacherEarnings /></ProtectedRoute>} />
          
          <Route path="/admin" element={<ProtectedRoute requiredRole={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/approvals" element={<ProtectedRoute requiredRole={['admin']}><Approvals /></ProtectedRoute>} />
          <Route path="/admin/earnings" element={<ProtectedRoute requiredRole={['admin']}><AdminEarnings /></ProtectedRoute>} />
          <Route path="/admin/teachers" element={<ProtectedRoute requiredRole={['admin']}><TeachersManagement /></ProtectedRoute>} />
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
      </main>
      <Footer />
    </div>
  );
}

function App() {
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
