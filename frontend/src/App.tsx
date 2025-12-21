import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Indexers } from './pages/Indexers';
import { IndexerForm } from './pages/IndexerForm';
import { IndexerTest } from './pages/IndexerTest';
import { IndexerSetup } from './pages/IndexerSetup';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <Login />
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/indexers"
        element={
          <ProtectedRoute>
            <Indexers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/indexers/new"
        element={
          <ProtectedRoute>
            <IndexerForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/indexers/:id/edit"
        element={
          <ProtectedRoute>
            <IndexerForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/indexers/:id/test"
        element={
          <ProtectedRoute>
            <IndexerTest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/indexers/:id/setup"
        element={
          <ProtectedRoute>
            <IndexerSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
