import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FullScreenLoader } from '@/components/shared/LoadingSpinner';

/**
 * ProtectedRoute — wraps routes that require authentication + a specific role.
 *
 * - If auth is loading → show a full-screen spinner (Edge-Case 1.7: no login flash)
 * - If not authenticated → redirect to /login
 * - If authenticated but wrong role → redirect to the correct dashboard (Edge-Case 1.5)
 * - If authenticated and correct role → render children
 */
export default function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, profile, loading } = useAuth();

  // Show spinner while loading (never flash login page — edge case 1.7)
  if (loading) {
    return <FullScreenLoader />;
  }

  // Not logged in → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Profile not loaded yet — rare race condition
  if (!profile) {
    return <FullScreenLoader />;
  }

  // Wrong role → redirect to the correct dashboard (edge case 1.5)
  if (allowedRole && profile.role !== allowedRole) {
    const correctDashboard =
      profile.role === 'admin' ? '/admin/dashboard' : '/app/dashboard';
    return <Navigate to={correctDashboard} replace />;
  }

  return children;
}
