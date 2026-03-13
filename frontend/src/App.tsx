import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './layouts/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

const Lobby = lazy(() => import('./pages/Lobby'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const GameWrapper = lazy(() => import('./pages/GameWrapper'));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-grad-playful">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role?: 'parent' | 'child' }) => {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <ProtectedRoute>
                <Layout><Lobby /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/games/:id" element={
              <ProtectedRoute>
                <Layout><GameWrapper /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
