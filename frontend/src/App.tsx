import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TicketProvider } from './context/TicketContext';
import { AppLayout } from './components/layout/AppLayout';
import { UserRole } from './types';

// Auth Pages
import { LoginPage } from './pages/LoginPage';

// Employee Portal Pages
import { DashboardPage as EmployeeDashboardPage } from './pages/DashboardPage';
import { CreateTicketPage } from './pages/CreateTicketPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { AssignedToMePage } from './pages/AssignedToMePage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';

// Super Admin Pages
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminTicketManagementPage } from './pages/AdminTicketManagementPage';
import { AdminEmployeeManagementPage } from './pages/AdminEmployeeManagementPage';
import { AdminDepartmentsPage } from './pages/AdminDepartmentsPage';
import { AdminCategoriesPage } from './pages/AdminCategoriesPage';
import { AdminRoutingPage } from './pages/AdminRoutingPage';
import { AdminSlaPage } from './pages/AdminSlaPage';
import { AdminActivityPage } from './pages/AdminActivityPage';
import { AdminFaqPage } from './pages/AdminFaqPage';
import { AdminReportsPage } from './pages/AdminReportsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';

// Shared Detail Page
import { TicketDetailsPage } from './pages/TicketDetailsPage';

/**
 * RootRedirect inspects the authenticated user's actual role
 * and routes them to their portal home.
 */
const RootRedirect: React.FC = () => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--color-slate-50)',
          color: 'var(--color-slate-500)',
          fontSize: '0.9rem',
        }}
      >
        <p>Loading ResolveHub...</p>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role === 'SUPER_ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/employee/dashboard" replace />;
};

/**
 * RoleRoute enforces strict role access:
 * - If user does not have allowedRole, redirects to the correct portal.
 */
interface RoleRouteProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRole, children }) => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: 'var(--color-slate-50)',
          color: 'var(--color-slate-500)',
          fontSize: '0.9rem',
        }}
      >
        <p>Verifying role access...</p>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role !== allowedRole) {
    // Cross-role redirect guard
    return (
      <Navigate
        to={currentUser.role === 'SUPER_ADMIN' ? '/admin/dashboard' : '/employee/dashboard'}
        replace
      />
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TicketProvider>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Root entry point with role-based redirection */}
            <Route path="/" element={<RootRedirect />} />

            {/* Authenticated Layout Shell */}
            <Route element={<AppLayout />}>
              {/* Legacy route redirects for backward-compatibility */}
              <Route path="/dashboard" element={<RootRedirect />} />
              <Route path="/create-ticket" element={<Navigate to="/employee/create-ticket" replace />} />
              <Route path="/my-tickets" element={<Navigate to="/employee/my-tickets" replace />} />
              <Route path="/assigned-to-me" element={<Navigate to="/employee/assigned" replace />} />
              <Route path="/notifications" element={<RootRedirect />} />
              <Route path="/profile" element={<RootRedirect />} />

              {/* =======================================================
                  EMPLOYEE PORTAL ROUTES (/employee/*)
                  Restricted strictly to role: EMPLOYEE
                  ======================================================= */}
              <Route
                path="/employee/dashboard"
                element={
                  <RoleRoute allowedRole="EMPLOYEE">
                    <EmployeeDashboardPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/employee/create-ticket"
                element={
                  <RoleRoute allowedRole="EMPLOYEE">
                    <CreateTicketPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/employee/my-tickets"
                element={
                  <RoleRoute allowedRole="EMPLOYEE">
                    <MyTicketsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/employee/assigned"
                element={
                  <RoleRoute allowedRole="EMPLOYEE">
                    <AssignedToMePage />
                  </RoleRoute>
                }
              />
              <Route
                path="/employee/notifications"
                element={
                  <RoleRoute allowedRole="EMPLOYEE">
                    <NotificationsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/employee/profile"
                element={
                  <RoleRoute allowedRole="EMPLOYEE">
                    <ProfilePage />
                  </RoleRoute>
                }
              />

              {/* =======================================================
                  SUPER ADMIN PORTAL ROUTES (/admin/*)
                  Restricted strictly to role: SUPER_ADMIN
                  ======================================================= */}
              <Route
                path="/admin/dashboard"
                element={
                  <RoleRoute allowedRole="SUPER_ADMIN">
                    <AdminDashboardPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/tickets"
                element={
                  <RoleRoute allowedRole="SUPER_ADMIN">
                    <AdminTicketManagementPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/employees"
                element={
                  <RoleRoute allowedRole="SUPER_ADMIN">
                    <AdminEmployeeManagementPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/departments"
                element={
                  <RoleRoute allowedRole="SUPER_ADMIN">
                    <AdminDepartmentsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <RoleRoute allowedRole="SUPER_ADMIN">
                    <AdminCategoriesPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/routing"
                element={
                  <RoleRoute allowedRole="SUPER_ADMIN">
                    <AdminRoutingPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/sla"
                element={
                  <RoleRoute allowedRole="SUPER_ADMIN">
                    <AdminSlaPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/activity"
                element={
                  <RoleRoute allowedRole="SUPER_ADMIN">
                    <AdminActivityPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/faq"
                element={
                  <RoleRoute allowedRole="SUPER_ADMIN">
                    <AdminFaqPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <RoleRoute allowedRole="SUPER_ADMIN">
                    <AdminReportsPage />
                  </RoleRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <RoleRoute allowedRole="SUPER_ADMIN">
                    <AdminSettingsPage />
                  </RoleRoute>
                }
              />

              {/* Shared Ticket Detail view (adapts actions based on user role) */}
              <Route path="/tickets/:id" element={<TicketDetailsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </TicketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
