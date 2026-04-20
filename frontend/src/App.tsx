import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';

// Pages auth
import LoginPage from './pages/auth/LoginPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';

// Pages employé
import DashboardPage from './pages/employee/DashboardPage';
import SaisiePage from './pages/employee/SaisiePage';
import MesFeuilles from './pages/employee/MesFeuilles';

// Pages gestionnaire
import ApprobationPage from './pages/manager/ApprobationPage';
import RapportsPage from './pages/manager/RapportsPage';

// Pages admin
import EmployesPage from './pages/admin/EmployesPage';
import SitesPage from './pages/admin/SitesPage';
import PeriodesPage from './pages/admin/PeriodesPage';
import StatistiquesPage from './pages/admin/StatistiquesPage';

// All entries (admin/manager)
import AllEntriesPage from './pages/admin/AllEntriesPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center">
      <svg className="animate-spin w-10 h-10 text-brand-gold" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    </div>
  );
  if (!user) return <Navigate to="/connexion" replace />;
  if (user.mustChangePwd && window.location.pathname !== '/changer-mot-de-passe')
    return <Navigate to="/changer-mot-de-passe" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/tableau-de-bord" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/changer-mot-de-passe" element={
        <ProtectedRoute><ChangePasswordPage /></ProtectedRoute>
      } />

      {/* App (authenticated) */}
      <Route path="/" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/tableau-de-bord" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/saisie" element={<ProtectedRoute><Layout><SaisiePage /></Layout></ProtectedRoute>} />
      <Route path="/mes-feuilles" element={<ProtectedRoute><Layout><MesFeuilles /></Layout></ProtectedRoute>} />

      {/* Gestionnaire + Admin */}
      <Route path="/approbation" element={
        <ProtectedRoute roles={['gestionnaire','admin']}><Layout><ApprobationPage /></Layout></ProtectedRoute>
      } />
      <Route path="/rapports" element={
        <ProtectedRoute roles={['gestionnaire','admin']}><Layout><RapportsPage /></Layout></ProtectedRoute>
      } />

      {/* Admin uniquement */}
      <Route path="/toutes-entrees" element={
        <ProtectedRoute roles={['admin']}><Layout><AllEntriesPage /></Layout></ProtectedRoute>
      } />
      <Route path="/statistiques" element={
        <ProtectedRoute roles={['admin']}><Layout><StatistiquesPage /></Layout></ProtectedRoute>
      } />
      <Route path="/employes" element={
        <ProtectedRoute roles={['admin']}><Layout><EmployesPage /></Layout></ProtectedRoute>
      } />
      <Route path="/sites" element={
        <ProtectedRoute roles={['admin']}><Layout><SitesPage /></Layout></ProtectedRoute>
      } />
      <Route path="/periodes" element={
        <ProtectedRoute roles={['admin']}><Layout><PeriodesPage /></Layout></ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/tableau-de-bord" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#0D1B4B', color: '#fff', borderRadius: '12px', fontSize: '14px' },
            success: { iconTheme: { primary: '#C9A84C', secondary: '#fff' } },
            error: { style: { background: '#ef4444' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
