import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const Layout = lazy(() => import('./components/Layout'));
const Login = lazy(() => import('./components/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Clients = lazy(() => import('./pages/Clients'));
const Expenses = lazy(() => import('./pages/Expenses'));
const CapitalAssets = lazy(() => import('./pages/CapitalAssets'));
const Income = lazy(() => import('./pages/Income'));
const Dividends = lazy(() => import('./pages/Dividends'));
const OwnerPayments = lazy(() => import('./pages/OwnerPayments'));
const Reports = lazy(() => import('./pages/Reports'));
const Integration = lazy(() => import('./pages/Integration'));
const Settings = lazy(() => import('./pages/Settings'));

// Create a client
const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
);

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Placeholder components for other pages
const TaxCalculator = () => <div className="p-6"><h1 className="text-2xl font-bold">Tax Calculator</h1><p>Tax calculations coming soon...</p></div>;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <Invoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute>
                    <Expenses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/capital-assets"
                element={
                  <ProtectedRoute>
                    <CapitalAssets />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/income"
                element={
                  <ProtectedRoute>
                    <Income />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dividends"
                element={
                  <ProtectedRoute>
                    <Dividends />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/owner-payments"
                element={
                  <ProtectedRoute>
                    <OwnerPayments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute>
                    <Clients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tax-calculator"
                element={
                  <ProtectedRoute>
                    <TaxCalculator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/integration"
                element={
                  <ProtectedRoute>
                    <Integration />
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
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;