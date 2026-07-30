/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import './i18n'; // initialise i18next (détection langue + traductions FR/EN)
import { ErrorBoundary } from './components/ErrorBoundary';

window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  console.error('[unhandledrejection]', event.reason);
  toast.error('Une erreur inattendue est survenue. Veuillez reessayer.');
});

window.addEventListener('error', (event) => {
  if (event.message?.includes('Loading chunk')) {
    toast.error('Probleme de chargement. Actualisez la page.');
  }
});

// Protected Routes & Layouts (toujours chargés)
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import RoleGuard from './features/auth/components/RoleGuard';
import AppLayout from './components/AppLayout';

// === Code-splitting : pages marketing ===
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const Produit = React.lazy(() => import('./pages/Produit'));
const Solutions = React.lazy(() => import('./pages/Solutions'));
const Tarifs = React.lazy(() => import('./pages/Tarifs'));
const Ressources = React.lazy(() => import('./pages/Ressources'));

// === Code-splitting : auth ===
const Login = React.lazy(() => import('./features/auth/pages/Login'));
const Register = React.lazy(() => import('./features/auth/pages/Register'));
const ConfirmEmail = React.lazy(() => import('./features/auth/pages/ConfirmEmail'));
const VerifyEmail = React.lazy(() => import('./features/auth/pages/VerifyEmail'));
const ConfirmationSuccess = React.lazy(() => import('./features/auth/pages/ConfirmationSuccess'));
const ResetPassword = React.lazy(() => import('./features/auth/pages/ResetPassword'));
const AcceptInvitation = React.lazy(() => import('./features/auth/pages/AcceptInvitation'));

// === Code-splitting : pages protégées ===
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Contacts = React.lazy(() => import('./pages/Contacts'));
const Campaigns = React.lazy(() => import('./pages/Campaigns'));
const CampaignEditor = React.lazy(() => import('./pages/CampaignEditor'));
const Automations = React.lazy(() => import('./pages/Automations'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const CampaignReport = React.lazy(() => import('./pages/CampaignReport'));
const Rechargement = React.lazy(() => import('./pages/Rechargement'));
const ContactDetail = React.lazy(() => import('./features/contacts/pages/ContactDetail'));
const Security = React.lazy(() => import('./features/account/pages/Security'));
const Team = React.lazy(() => import('./features/account/pages/Team'));
const Settings = React.lazy(() => import('./features/account/pages/Settings'));
const Profile = React.lazy(() => import('./features/account/pages/Profile'));
const AuditLogs = React.lazy(() => import('./features/account/pages/AuditLogs'));
const Integrations = React.lazy(() => import('./features/account/pages/Integrations'));
const Developers = React.lazy(() => import('./features/account/pages/Developers'));
const StatusPage = React.lazy(() => import('./pages/StatusPage'));

import './index.css';

const Fallback = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      color: 'var(--text-2)',
      fontSize: 14,
    }}
  >
    Chargement…
  </div>
);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <React.Suspense fallback={<Fallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/produit" element={<Produit />} />
            <Route path="/solutions" element={<Solutions />} />
            <Route path="/tarifs" element={<Tarifs />} />
            <Route path="/ressources" element={<Ressources />} />

            {/* Page de statut publique */}
            <Route path="/status" element={<StatusPage />} />

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/verify-email/:token" element={<VerifyEmail />} />
            <Route path="/confirmation-success" element={<ConfirmationSuccess />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

            {/* Protected Routes with AppLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Accessible à tous les rôles */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/account/profile" element={<Profile />} />
              <Route path="/account/security" element={<Security />} />
              <Route path="/account/settings" element={<Settings />} />

              {/* Admin + Editor uniquement */}
              <Route
                path="/contacts"
                element={
                  <RoleGuard roles={['Admin', 'Editor']}>
                    <Contacts />
                  </RoleGuard>
                }
              />
              <Route
                path="/contacts/:id"
                element={
                  <RoleGuard roles={['Admin', 'Editor']}>
                    <ContactDetail />
                  </RoleGuard>
                }
              />
              <Route
                path="/campaigns"
                element={
                  <RoleGuard roles={['Admin', 'Editor']}>
                    <Campaigns />
                  </RoleGuard>
                }
              />
              <Route
                path="/campaigns/new"
                element={
                  <RoleGuard roles={['Admin', 'Editor']}>
                    <CampaignEditor />
                  </RoleGuard>
                }
              />
              <Route
                path="/campaigns/:id"
                element={
                  <RoleGuard roles={['Admin', 'Editor']}>
                    <CampaignEditor />
                  </RoleGuard>
                }
              />
              <Route
                path="/campaigns/:id/edit"
                element={
                  <RoleGuard roles={['Admin', 'Editor']}>
                    <CampaignEditor />
                  </RoleGuard>
                }
              />
              <Route
                path="/automations"
                element={
                  <RoleGuard roles={['Admin', 'Editor']}>
                    <Automations />
                  </RoleGuard>
                }
              />
              <Route
                path="/segments"
                element={
                  <RoleGuard roles={['Admin', 'Editor']}>
                    <Contacts />
                  </RoleGuard>
                }
              />

              {/* Rapports de campagne — Admin, Editor, Analyst */}
              <Route
                path="/campaigns/:id/report"
                element={
                  <RoleGuard roles={['Admin', 'Editor', 'Analyst']}>
                    <CampaignReport />
                  </RoleGuard>
                }
              />

              {/* Admin uniquement */}
              <Route
                path="/rechargement"
                element={
                  <RoleGuard roles={['Admin']}>
                    <Rechargement />
                  </RoleGuard>
                }
              />
              <Route
                path="/account/team"
                element={
                  <RoleGuard roles={['Admin']}>
                    <Team />
                  </RoleGuard>
                }
              />
              <Route
                path="/account/developers"
                element={
                  <RoleGuard roles={['Admin']}>
                    <Developers />
                  </RoleGuard>
                }
              />

              {/* Admin + Analyst */}
              <Route
                path="/account/audit-logs"
                element={
                  <RoleGuard roles={['Admin', 'Analyst']}>
                    <AuditLogs />
                  </RoleGuard>
                }
              />
              <Route
                path="/account/integrations"
                element={
                  <RoleGuard roles={['Admin']}>
                    <Integrations />
                  </RoleGuard>
                }
              />
            </Route>
          </Routes>
        </React.Suspense>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
