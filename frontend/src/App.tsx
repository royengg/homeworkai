import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { HomeDesignOne } from './pages/HomeDesignOne';
import { NotFound } from './pages/NotFound';
import './index.css';

// Route-level code splitting. Only the landing + auth pages load on first
// paint; the heavy dashboard, upload viewer and archive chunks fetch on
// navigation (rule: bundle-dynamic-imports, bundle-analyzable-paths).
const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })),
);
const UploadDetails = lazy(() =>
  import('./pages/UploadDetails').then((m) => ({ default: m.UploadDetails })),
);
const Archive = lazy(() =>
  import('./pages/Archive').then((m) => ({ default: m.Archive })),
);
const Settings = lazy(() =>
  import('./pages/Settings').then((m) => ({ default: m.Settings })),
);

function RouteFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: '#6b7280',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      Loading…
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<HomeDesignOne />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Suspense fallback={<RouteFallback />}>
                      <Dashboard />
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload/:uploadId"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Suspense fallback={<RouteFallback />}>
                      <UploadDetails />
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/uploads"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Suspense fallback={<RouteFallback />}>
                      <Archive />
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Suspense fallback={<RouteFallback />}>
                      <Settings />
                    </Suspense>
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="*"
              element={
                <ErrorBoundary>
                  <NotFound />
                </ErrorBoundary>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;