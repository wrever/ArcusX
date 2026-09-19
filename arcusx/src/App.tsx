import { useState, useEffect, lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TrustlessWorkConfig } from '@trustless-work/escrow';
import { trustlessWorkApiKey, trustlessWorkEnv } from './config/trustlessWork';
import { useStellarNetwork } from './hooks/useStellarNetwork';
import { PollarAppProvider } from './components/PollarAppProvider';
import Navbar from './components/Navbar';
import EmpresasNavbar from './components/EmpresasNavbar';
import { isEnterpriseLandingHost } from './config/enterpriseSite';
import { isDocsLandingHost } from './config/docsSite';
import LanguageFab from './components/LanguageFab';
import ThemeToggle from './components/ThemeToggle';
import Hero from './components/Hero';
import Login from './components/Login';
import Register from './components/Register';
import AuthCallback from './components/AuthCallback';
import Preloader from './components/Preloader';
import AdminLoginRedirect from './components/AdminLoginRedirect';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfile from './components/UserProfile';
import ReferralBootstrap from './components/ReferralBootstrap';
import { isReferralEntryPath } from './utils/referralCapture';
import './App.css';
import './css/enterprise-professional.css';

// Code splitting - Lazy load de componentes pesados
const Dashboard = lazy(() => import('./dashboard'));
const DashboardKycPage = lazy(() => import('./pages/DashboardKycPage'));
const DashboardDeveloperPage = lazy(() => import('./pages/DashboardDeveloperPage'));
const CreateTask = lazy(() => import('./components/CreateTask'));
const ApplyTask = lazy(() => import('./components/ApplyTask'));
const ProposalReview = lazy(() => import('./components/ProposalReview'));
const SuperviseTask = lazy(() => import('./components/SuperviseTask'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const EditProfile = lazy(() => import('./components/EditProfile'));
const SwapPage = lazy(() => import('./pages/SwapPage'));
const TutorialsPage = lazy(() => import('./pages/TutorialsPage'));
const EmpresasPage = lazy(() => import('./pages/EmpresasPage'));
const DocsApp = lazy(() => import('./pages/docs/DocsApp'));
const DealWizardPage = lazy(() => import('./pages/DealWizardPage'));
const DealPublicPage = lazy(() => import('./pages/DealPublicPage'));
const DealJoinRedirect = lazy(() => import('./pages/DealJoinRedirect'));
const DealWorkspacePage = lazy(() => import('./pages/DealWorkspacePage'));
import ReferralLanding from './pages/ReferralLanding';
const SupportChatButton = lazy(() => import('./components/SupportChatButton'));

function HomeRoute() {
  if (isEnterpriseLandingHost()) {
    return (
      <>
        <EmpresasNavbar />
        <EmpresasPage />
      </>
    );
  }
  return (
    <>
      <Navbar />
      <Hero />
    </>
  );
}

function EmpresasRoute() {
  if (isEnterpriseLandingHost()) {
    return <Navigate to="/" replace />;
  }
  return (
    <>
      <Navbar />
      <EmpresasPage />
    </>
  );
}

function AppContent({ isLoading }: { isLoading: boolean }) {
  const location = useLocation();
  // Normalizar path (en cPanel a veces la URL puede ser /index.html o con trailing slash)
  const path = location.pathname.replace(/\/index\.html$/i, '').replace(/\/$/, '') || '/';
  const isRoot = path === '/' || path === '';
  /** FAB idioma a la izquierda solo en landing empresas.* (/) y login/registro ahí. En /empresas del sitio público va posición por defecto (hueco para tema). */
  const isEnterpriseLangFabLeft =
    (isEnterpriseLandingHost() && isRoot) || (isEnterpriseLandingHost() && path === '/login');
  // Páginas donde va el FAB de idioma/tema (flotante). Robusto para cPanel: considerar raíz cualquier path vacío o "/"
  const isPublicLanding =
    isRoot ||
    path === '/swap' ||
    path === '/tutoriales' ||
    path === '/login' ||
    path === '/register' ||
    path === '/empresas' ||
    path.startsWith('/ref/') ||
    path.startsWith('/r/');
  // Si no estamos en una ruta de app (dashboard, profile, etc.), mostrar FAB por si cPanel devuelve un path distinto
  const isAppRoute = path.startsWith('/dashboard') || path.startsWith('/admin') || path.startsWith('/profile') || path.startsWith('/create-task') || path.startsWith('/apply-task') || path.startsWith('/proposals') || path.startsWith('/supervise-task') || path.startsWith('/auth') || path.startsWith('/deals') || path.startsWith('/deal/');
  const showFloatingButtons = isPublicLanding || (!isAppRoute && path.length <= 20);
  const showSupportButton = isRoot && !isEnterpriseLandingHost();

  return (
    <>
      <LanguageFab
        visible={showFloatingButtons}
        fabAlign={isEnterpriseLangFabLeft ? 'enterprise-left' : 'default'}
      />
      <ThemeToggle visible={showFloatingButtons && !isEnterpriseLandingHost()} />
      {/* Botón flotante de soporte - visible solo en la página principal */}
      {showSupportButton && (
        <Suspense fallback={null}>
          <SupportChatButton />
        </Suspense>
      )}
      {isLoading ? (
        <Preloader />
      ) : (
        <div className="app">
          <ReferralBootstrap />
          <Suspense fallback={<Preloader />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route
                path="/login"
                element={
                  isEnterpriseLandingHost() ? (
                    <>
                      <EmpresasNavbar />
                      <Login />
                    </>
                  ) : (
                    <Login />
                  )
                }
              />
              <Route
                path="/register"
                element={isEnterpriseLandingHost() ? <Navigate to="/login" replace /> : <Register />}
              />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/ref/:code" element={<><Navbar /><ReferralLanding /></>} />
              <Route path="/r/:code" element={<><Navbar /><ReferralLanding /></>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/deals/new" element={<ProtectedRoute><DealWizardPage /></ProtectedRoute>} />
              <Route path="/deals/workspace/:id" element={<ProtectedRoute><DealWorkspacePage /></ProtectedRoute>} />
              <Route path="/deal/:token" element={<DealPublicPage mode="preview" />} />
              <Route
                path="/deals/join/:token"
                element={
                  <ProtectedRoute>
                    <DealJoinRedirect />
                  </ProtectedRoute>
                }
              />
              <Route path="/create-task" element={<ProtectedRoute><CreateTask /></ProtectedRoute>} />
              <Route path="/apply-task/:taskId" element={<ProtectedRoute><ApplyTask /></ProtectedRoute>} />
              <Route path="/proposals/:taskId" element={<ProtectedRoute><ProposalReview /></ProtectedRoute>} />
              <Route path="/supervise-task/:taskId/:acceptedApplicantId" element={<ProtectedRoute><SuperviseTask /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<UserProfile />} />
              <Route path="/dashboard/settings/profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
              <Route path="/dashboard/kyc" element={<ProtectedRoute><DashboardKycPage /></ProtectedRoute>} />
              <Route path="/dashboard/developer" element={<ProtectedRoute><DashboardDeveloperPage /></ProtectedRoute>} />
              <Route path="/swap" element={<><Navbar /><SwapPage /></>} />
              <Route path="/tutoriales" element={<><Navbar /><TutorialsPage /></>} />
              <Route path="/empresas" element={<EmpresasRoute />} />
              <Route path="/landing" element={<Navigate to="/empresas" replace />} />
              <Route path="/admin/login" element={<AdminLoginRedirect />} />
              <Route path="/admin/dashboard" element={<AdminRoute><AdminPanel isAdmin={true} /></AdminRoute>} />
              <Route path="/admin" element={<AdminLoginRedirect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      )}
    </>
  );
}

function TrustlessWorkProvider({ children }: { children: ReactNode }) {
  const { network } = useStellarNetwork();
  return (
    <TrustlessWorkConfig
      key={network}
      baseURL={trustlessWorkEnv(network)}
      apiKey={trustlessWorkApiKey(network)}
    >
      {children}
    </TrustlessWorkConfig>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(() => !isReferralEntryPath());
  const docsHost = typeof window !== 'undefined' && isDocsLandingHost();

  useEffect(() => {
    if (docsHost || isReferralEntryPath()) {
      setIsLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [docsHost]);

  if (docsHost) {
    return (
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<Preloader />}>
          <DocsApp />
        </Suspense>
      </Router>
    );
  }

  return (
    <TrustlessWorkProvider>
      <PollarAppProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppContent isLoading={isLoading} />
        </Router>
      </PollarAppProvider>
    </TrustlessWorkProvider>
  );
}

export default App;
