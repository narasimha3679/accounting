import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FeatureProvider } from './contexts/FeatureContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import { OfflineIndicator } from './components/OfflineIndicator';
import { UpdateAvailable } from './components/UpdateAvailable';
import { InstallPrompt } from './components/InstallPrompt';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Clients from './pages/Clients';
import Expenses from './pages/Expenses';
import CapitalAssets from './pages/CapitalAssets';
import Income from './pages/Income';
import Dividends from './pages/Dividends';
import SalaryPage from './pages/Salary';
import OwnerPayments from './pages/OwnerPayments';
import Reports from './pages/Reports';
import SettingsLayout from './pages/SettingsLayout';
import GeneralSettings from './pages/settings/GeneralSettings';
import TaxSettings from './pages/settings/TaxSettings';
import FeatureSettings from './pages/settings/FeatureSettings';
import TimeSettings from './pages/settings/TimeSettings';
import PayrollSettingsPage from './pages/settings/PayrollSettingsPage';
import BenefitsSettingsPage from './pages/settings/BenefitsSettingsPage';
import NotificationSettings from './pages/settings/NotificationSettings';
import CompanyOnboarding from './pages/CompanyOnboarding';
import TaxCalculator from './pages/TaxCalculator';
import PublicTaxCalculator from './pages/PublicTaxCalculator';
import SalaryVsDividendCalculator from './pages/SalaryVsDividendCalculator';
import Employees from './pages/Employees';
import EmployeeDashboard from './pages/EmployeeDashboard';
import TimeManagement from './pages/TimeManagement';
import EmployeeTimeManagement from './pages/EmployeeTimeManagement';
import PayRuns from './pages/PayRuns';
import PayRunDetail from './pages/PayRunDetail';
import PayrollReports from './pages/PayrollReports';
import PayrollRemittances from './pages/PayrollRemittances';
import ROEList from './pages/ROEList';
import ROEGeneration from './pages/ROEGeneration';
import T4Generation from './pages/T4Generation';
import EmployeePayStubsPage from './pages/EmployeePayStubsPage';
import EmployeeYTDPage from './pages/EmployeeYTDPage';
import EmployeeTaxDocumentsPage from './pages/EmployeeTaxDocumentsPage';
import EmployeeInfoPage from './pages/EmployeeInfoPage';
import EmployeeTD1Page from './pages/EmployeeTD1Page';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ResumeBuilderPromo from './pages/ResumeBuilderPromo';
import AcceptInvitation from './pages/AcceptInvitation';
import CompanyMembers from './pages/CompanyMembers';
import ScrollToTop from './components/ScrollToTop';
import { TooltipProvider } from './components/ui/Tooltip';
import type { User } from './lib/api';

// Create a client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes - cache persists for 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
      retry: 1, // Only retry once on failure
    },
  },
});

// Helper to check if user has any company memberships
const hasAnyCompany = (user: User | null): boolean => {
  return (user?.companies?.length ?? 0) > 0;
};

// Protected Route Component (requires authentication and a company)
// For company users only - blocks employees
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect employees to their dashboard
  if (user?.isEmployee) {
    return <Navigate to="/employee-dashboard" replace />;
  }

  if (!hasAnyCompany(user)) {
    return <Navigate to="/onboarding/company" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Employee-only route
const EmployeeRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect company users to dashboard
  if (!user?.isEmployee) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!user?.company_id) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Auth-only route that does NOT require a company (used for onboarding)
const AuthOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (hasAnyCompany(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FeatureProvider>
            <TooltipProvider>
              <Router>
                <ScrollToTop />
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/resume-builder" element={<ResumeBuilderPromo />} />
                  <Route path="/tax-calculator" element={<PublicTaxCalculator />} />
                  <Route
                    path="/salary-vs-dividend-calculator"
                    element={<SalaryVsDividendCalculator />}
                  />
                  <Route
                    path="/onboarding/company"
                    element={
                      <AuthOnlyRoute>
                        <CompanyOnboarding />
                      </AuthOnlyRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/employee-dashboard"
                    element={
                      <EmployeeRoute>
                        <EmployeeDashboard />
                      </EmployeeRoute>
                    }
                  />
                  <Route
                    path="/employee-time-management"
                    element={
                      <EmployeeRoute>
                        <EmployeeTimeManagement />
                      </EmployeeRoute>
                    }
                  />
                  <Route
                    path="/employee/pay-stubs"
                    element={
                      <EmployeeRoute>
                        <EmployeePayStubsPage />
                      </EmployeeRoute>
                    }
                  />
                  <Route
                    path="/employee/ytd"
                    element={
                      <EmployeeRoute>
                        <EmployeeYTDPage />
                      </EmployeeRoute>
                    }
                  />
                  <Route
                    path="/employee/tax-documents"
                    element={
                      <EmployeeRoute>
                        <EmployeeTaxDocumentsPage />
                      </EmployeeRoute>
                    }
                  />
                  <Route
                    path="/employee/info"
                    element={
                      <EmployeeRoute>
                        <EmployeeInfoPage />
                      </EmployeeRoute>
                    }
                  />
                  <Route
                    path="/employee/td1"
                    element={
                      <EmployeeRoute>
                        <EmployeeTD1Page />
                      </EmployeeRoute>
                    }
                  />
                  <Route
                    path="/employees"
                    element={
                      <ProtectedRoute>
                        <Employees />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/time-management"
                    element={
                      <ProtectedRoute>
                        <TimeManagement />
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
                    path="/salary"
                    element={
                      <ProtectedRoute>
                        <SalaryPage />
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
                    path="/reports/tax-summary"
                    element={
                      <ProtectedRoute>
                        <TaxCalculator />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <SettingsLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<Navigate to="general" replace />} />
                    <Route path="general" element={<GeneralSettings />} />
                    <Route path="tax" element={<TaxSettings />} />
                    <Route path="features" element={<FeatureSettings />} />
                    <Route path="time" element={<TimeSettings />} />
                    <Route path="payroll" element={<PayrollSettingsPage />} />
                    <Route path="benefits" element={<BenefitsSettingsPage />} />
                    <Route path="notifications" element={<NotificationSettings />} />
                  </Route>
                  <Route
                    path="/company-members"
                    element={
                      <ProtectedRoute>
                        <CompanyMembers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/accept-invitation"
                    element={<AcceptInvitation />}
                  />
                  <Route
                    path="/payroll/runs"
                    element={
                      <ProtectedRoute>
                        <PayRuns />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payroll/runs/:id"
                    element={
                      <ProtectedRoute>
                        <PayRunDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payroll/reports"
                    element={
                      <ProtectedRoute>
                        <PayrollReports />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payroll/remittances"
                    element={
                      <ProtectedRoute>
                        <PayrollRemittances />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payroll/roe"
                    element={
                      <ProtectedRoute>
                        <ROEList />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payroll/roe/new"
                    element={
                      <ProtectedRoute>
                        <ROEGeneration />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payroll/roe/:id"
                    element={
                      <ProtectedRoute>
                        <ROEGeneration />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payroll/t4"
                    element={
                      <ProtectedRoute>
                        <T4Generation />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
                <OfflineIndicator />
                <UpdateAvailable />
                <InstallPrompt />
              </Router>
            </TooltipProvider>
          </FeatureProvider>
        </AuthProvider>
      </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
