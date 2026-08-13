import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullScreenLoader } from '@/components/shared/LoadingSpinner';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// Auth pages (eager load for fast initial paint)
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';

// Layout shells (eager load)
import AdminLayout from '@/components/layout/AdminLayout';
import RecipientLayout from '@/components/layout/RecipientLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Admin pages (lazy loaded)
const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboard'));
const ProgramsPage = React.lazy(() => import('@/pages/admin/ProgramsPage'));
const PeoplePage = React.lazy(() => import('@/pages/admin/PeoplePage'));
const AnalyticsPage = React.lazy(() => import('@/pages/admin/AnalyticsPage'));

// Recipient pages (lazy loaded)
const RecipientDashboard = React.lazy(() => import('@/pages/recipient/RecipientDashboard'));
const CatalogPage = React.lazy(() => import('@/pages/recipient/CatalogPage'));
const HistoryPage = React.lazy(() => import('@/pages/recipient/HistoryPage'));

/**
 * Root redirect: send authenticated users to their role-appropriate dashboard,
 * and unauthenticated users to login.
 */
function RootRedirect() {
  const { isAuthenticated, profile, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (profile?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<FullScreenLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="programs" element={<ProgramsPage />} />
              <Route path="people" element={<PeoplePage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>

            {/* Recipient routes */}
            <Route
              path="/app"
              element={
                <ProtectedRoute allowedRole="recipient">
                  <RecipientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<RecipientDashboard />} />
              <Route path="catalog" element={<CatalogPage />} />
              <Route path="history" element={<HistoryPage />} />
            </Route>

            {/* Root + catch-all */}
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
