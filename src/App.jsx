import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullScreenLoader } from '@/components/shared/LoadingSpinner';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

// Auth pages (eager load for fast initial paint)
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import LandingPage from '@/pages/LandingPage';

// Layout shells (eager load)
import AdminLayout from '@/components/layout/AdminLayout';
import RecipientLayout from '@/components/layout/RecipientLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Admin pages (lazy loaded)
const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboard'));
const ProgramsPage = React.lazy(() => import('@/pages/admin/ProgramsPage'));
const PeoplePage = React.lazy(() => import('@/pages/admin/PeoplePage'));
const RedemptionsPage = React.lazy(() => import('@/pages/admin/RedemptionsPage'));
const AnalyticsPage = React.lazy(() => import('@/pages/admin/AnalyticsPage'));

// Recipient pages (lazy loaded)
const RecipientDashboard = React.lazy(() => import('@/pages/recipient/RecipientDashboard'));
const CatalogPage = React.lazy(() => import('@/pages/recipient/CatalogPage'));
const HistoryPage = React.lazy(() => import('@/pages/recipient/HistoryPage'));
const LeaderboardPage = React.lazy(() => import('@/pages/recipient/LeaderboardPage'));

// Community pages (lazy loaded, shared by both role areas)
const CommunityFeedPage = React.lazy(() => import('@/pages/community/CommunityFeedPage'));
const PostEditorPage = React.lazy(() => import('@/pages/community/PostEditorPage'));
const PostDetailPage = React.lazy(() => import('@/pages/community/PostDetailPage'));
const DirectoryPage = React.lazy(() => import('@/pages/community/DirectoryPage'));
const MemberProfilePage = React.lazy(() => import('@/pages/community/MemberProfilePage'));
const MessagesPage = React.lazy(() => import('@/pages/community/MessagesPage'));
const NotificationsPage = React.lazy(() => import('@/pages/community/NotificationsPage'));
const CommunityModerationPage = React.lazy(() => import('@/pages/admin/CommunityModerationPage'));
const CommunityInsightsPage = React.lazy(() => import('@/pages/admin/CommunityInsightsPage'));

/**
 * Community routes, mounted under both /app (employees) and /admin (HR) so
 * each role keeps its own shell. Called as a function (not a component) so
 * React Router sees plain <Route> elements.
 */
function communityRoutes() {
  return (
    <>
      <Route path="community" element={<CommunityFeedPage />} />
      <Route path="community/ask" element={<PostEditorPage initialType="question" />} />
      <Route path="community/new" element={<PostEditorPage />} />
      <Route path="community/mine" element={<CommunityFeedPage mode="mine" />} />
      <Route path="community/saved" element={<CommunityFeedPage mode="saved" />} />
      <Route path="community/post/:postId" element={<PostDetailPage />} />
      <Route path="community/post/:postId/edit" element={<PostEditorPage />} />
      <Route path="directory" element={<DirectoryPage />} />
      <Route path="directory/:userId" element={<MemberProfilePage />} />
      <Route path="profile" element={<MemberProfilePage self />} />
      <Route path="messages" element={<MessagesPage />} />
      <Route path="messages/:conversationId" element={<MessagesPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
    </>
  );
}

/**
 * Root route: authenticated users go straight to their role-appropriate
 * dashboard; a first-time visitor sees the landing page instead of being
 * bounced straight to a login form.
 */
function RootRedirect() {
  const { isAuthenticated, profile, loading } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!isAuthenticated) return <LandingPage />;

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
              <Route path="redemptions" element={<RedemptionsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="community/moderation" element={<CommunityModerationPage />} />
              <Route path="community/insights" element={<CommunityInsightsPage />} />
              {communityRoutes()}
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
              <Route path="leaderboard" element={<LeaderboardPage />} />
              {communityRoutes()}
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
