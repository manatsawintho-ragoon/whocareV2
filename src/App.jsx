import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './style/style.css';

import Header from './components/Header';
import Hero from './components/Hero';
import ServicesSection from './components/ServicesSection';
import FeaturedArticles from './components/FeaturedArticles';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import { Icon } from '@iconify/react';

// Lazy-load pages for code splitting & faster initial load
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const PermissionsPage = lazy(() => import('./pages/PermissionsPage'));
const ManageServicesPage = lazy(() => import('./pages/ManageServicesPage'));
const ServiceDetailPage = lazy(() => import('./pages/ServiceDetailPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const AppointmentManagementPage = lazy(() => import('./pages/AppointmentManagementPage'));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'));
const FinanceDashboardPage = lazy(() => import('./pages/FinanceDashboardPage'));
const NewsManagePage = lazy(() => import('./pages/NewsManagePage'));
const NewsListPage = lazy(() => import('./pages/NewsListPage'));
const NewsDetailPage = lazy(() => import('./pages/NewsDetailPage'));
const ApiDocPage = lazy(() => import('./pages/ApiDocPage'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-section dark:bg-darkmode">
    <Icon icon="mdi:loading" width="36" className="text-primary animate-spin" />
  </div>
);

function HomePage() {
  return (
    <>
      <main>
        <Hero />
        <ServicesSection />
        <FeaturedArticles />
      </main>
      <Footer />
    </>
  );
}

function App() {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  return (
    <>
      <Header />
      <Suspense fallback={<PageLoader />}>
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services/:id" element={<ServiceDetailPage />} />
        <Route path="/booking/:id" element={<BookingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={['super_admin', 'manager']}>
              <AdminUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/permissions"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <PermissionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/services"
          element={
            <ProtectedRoute roles={['super_admin', 'manager']}>
              <ManageServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/appointments"
          element={
            <ProtectedRoute roles={['reception', 'nurse', 'manager', 'doctor', 'super_admin']}>
              <AppointmentManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute>
              <MyBookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/finance"
          element={
            <ProtectedRoute roles={['accountant', 'reception', 'manager', 'super_admin']}>
              <FinanceDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/news"
          element={
            <ProtectedRoute roles={['doctor', 'manager', 'super_admin']}>
              <NewsManagePage />
            </ProtectedRoute>
          }
        />
        <Route path="/articles" element={<NewsListPage contentType="article" />} />
        <Route path="/articles/:category" element={<NewsListPage contentType="article" />} />
        <Route path="/articles/:category/:slug" element={<NewsDetailPage contentType="article" />} />
        <Route path="/news" element={<NewsListPage contentType="news" />} />
        <Route path="/news/:category" element={<NewsListPage contentType="news" />} />
        <Route path="/news/:category/:slug" element={<NewsDetailPage contentType="news" />} />
        <Route
          path="/admin/api-doc"
          element={
            <ProtectedRoute roles={['super_admin']}>
              <ApiDocPage />
            </ProtectedRoute>
          }
        />
        </Routes>
      </Suspense>
      <ScrollToTop />
    </>
  );
}

export default App;
