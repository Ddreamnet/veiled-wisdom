import { lazy } from 'react';

// Lazy load pages for better performance
export const Index = lazy(() => import('../pages/Index'));
export const SignIn = lazy(() => import('../pages/auth/SignIn'));
export const SignUp = lazy(() => import('../pages/auth/SignUp'));
export const Explore = lazy(() => import('../pages/Explore'));
export const Messages = lazy(() => import('../pages/Messages'));
export const Profile = lazy(() => import('../pages/Profile/index'));
export const PublicProfile = lazy(() => import('../pages/PublicProfile'));
export const Appointments = lazy(() => import('../pages/Appointments'));
export const CategoryDetail = lazy(() => import('../pages/CategoryDetail'));
export const SubCategoryDetail = lazy(() => import('../pages/SubCategoryDetail'));
export const CuriosityDetail = lazy(() => import('../pages/CuriosityDetail'));
export const ListingDetail = lazy(() => import('../pages/ListingDetail/index'));
export const MyListings = lazy(() => import('../pages/teacher/MyListings'));
export const TeacherEarnings = lazy(() => import('../pages/teacher/Earnings'));
export const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
export const Approvals = lazy(() => import('../pages/admin/Approvals/index'));
export const AdminEarnings = lazy(() => import('../pages/admin/Earnings'));
export const TeachersManagement = lazy(() => import('../pages/admin/Teachers'));
export const UsersManagement = lazy(() => import('../pages/admin/Users'));
export const TeacherEdit = lazy(() => import('../pages/admin/TeacherEdit'));
export const CategoriesManagement = lazy(() => import('../pages/admin/Categories'));
export const PagesManagement = lazy(() => import('../pages/admin/Pages'));
export const CuriositiesManagement = lazy(() => import('../pages/admin/Curiosities'));
export const VideoCall = lazy(() => import('../pages/VideoCall/index'));
export const About = lazy(() => import('../pages/static/About'));
export const HowItWorks = lazy(() => import('../pages/static/HowItWorks'));
export const Production = lazy(() => import('../pages/static/Production'));
export const Contact = lazy(() => import('../pages/static/Contact'));
export const Terms = lazy(() => import('../pages/static/Terms'));
export const Privacy = lazy(() => import('../pages/static/Privacy'));
export const FAQ = lazy(() => import('../pages/static/FAQ'));
export const Experts = lazy(() => import('../pages/Experts'));
export const Settings = lazy(() => import('../pages/Settings'));
export const NotFound = lazy(() => import('../pages/NotFound'));

// Route configuration types
export interface RouteConfig {
  path: string;
  element: React.LazyExoticComponent<() => JSX.Element>;
  protected?: boolean;
  requiredRole?: string[];
  authRedirect?: boolean; // Redirect to home if already authenticated
}

// Public routes - accessible to everyone
export const publicRoutes: RouteConfig[] = [
  { path: '/', element: Index },
  { path: '/explore', element: Explore },
  { path: '/experts', element: Experts },
  { path: '/categories/:slug', element: CategoryDetail },
  { path: '/categories/:slug/:subslug', element: SubCategoryDetail },
  { path: '/curiosities/:slug', element: CuriosityDetail },
  { path: '/listings/:id', element: ListingDetail },
  { path: '/profile/:id', element: PublicProfile },
  { path: '/about', element: About },
  { path: '/how-it-works', element: HowItWorks },
  { path: '/production', element: Production },
  { path: '/contact', element: Contact },
  { path: '/terms', element: Terms },
  { path: '/privacy', element: Privacy },
  { path: '/faq', element: FAQ },
];

// Auth routes - redirect to home if already logged in
export const authRoutes: RouteConfig[] = [
  { path: '/auth/sign-in', element: SignIn, authRedirect: true },
  { path: '/auth/sign-up', element: SignUp, authRedirect: true },
];

// Protected routes - require authentication
export const protectedRoutes: RouteConfig[] = [
  { path: '/messages', element: Messages, protected: true },
  { path: '/profile', element: Profile, protected: true },
  { path: '/settings', element: Settings, protected: true },
  { path: '/call/:conversationId', element: VideoCall, protected: true },
  { path: '/appointments', element: Appointments, protected: true },
];

// Teacher routes - require teacher role
export const teacherRoutes: RouteConfig[] = [
  { path: '/teacher/my-listings', element: MyListings, protected: true, requiredRole: ['teacher'] },
  { path: '/teacher/earnings', element: TeacherEarnings, protected: true, requiredRole: ['teacher'] },
];

// Admin routes - require admin role
export const adminRoutes: RouteConfig[] = [
  { path: '/admin', element: AdminDashboard, protected: true, requiredRole: ['admin'] },
  { path: '/admin/dashboard', element: AdminDashboard, protected: true, requiredRole: ['admin'] },
  { path: '/admin/users', element: UsersManagement, protected: true, requiredRole: ['admin'] },
  { path: '/admin/approvals', element: Approvals, protected: true, requiredRole: ['admin'] },
  { path: '/admin/earnings', element: AdminEarnings, protected: true, requiredRole: ['admin'] },
  { path: '/admin/teachers', element: TeachersManagement, protected: true, requiredRole: ['admin'] },
  { path: '/admin/teachers/:id', element: TeacherEdit, protected: true, requiredRole: ['admin'] },
  { path: '/admin/categories', element: CategoriesManagement, protected: true, requiredRole: ['admin'] },
  { path: '/admin/pages', element: PagesManagement, protected: true, requiredRole: ['admin'] },
  { path: '/admin/curiosities', element: CuriositiesManagement, protected: true, requiredRole: ['admin'] },
];

// All routes combined
export const allRoutes: RouteConfig[] = [
  ...publicRoutes,
  ...authRoutes,
  ...protectedRoutes,
  ...teacherRoutes,
  ...adminRoutes,
];
