import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
        aria-live="polite"
        aria-busy="true"
      >
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    // Preserve the URL the user tried to reach so we can redirect there after
    // login. Otherwise every auth bounce drops them on /dashboard even when
    // they had a deep link to a specific upload.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}