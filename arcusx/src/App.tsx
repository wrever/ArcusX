import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TrustlessWorkConfig } from '@trustless-work/escrow';
import { TRUSTLESS_WORK_API_KEY, TRUSTLESS_WORK_BASE_URL } from './config/trustlessWork';
import Navbar from './components/Navbar';
import LanguageFab from './components/LanguageFab';
import ThemeToggle from './components/ThemeToggle';
import Hero from './components/Hero';
import Login from './components/Login';
import Register from './components/Register';
import AuthCallback from './components/AuthCallback';
import Preloader from './components/Preloader';
import AdminLogin from './components/AdminLogin';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfile from './components/UserProfile';
import './App.css';

// Code splitting - Lazy load de componentes pesados
const Dashboard = lazy(() => import('./dashboard'));
const CreateTask = lazy(() => import('./components/CreateTask'));
const ApplyTask = lazy(() => import('./components/ApplyTask'));
const ProposalReview = lazy(() => import('./components/ProposalReview'));
const SuperviseTask = lazy(() => import('./components/SuperviseTask'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const EditProfile = lazy(() => import('./components/EditProfile'));
const SwapPage = lazy(() => import('./pages/SwapPage'));
const TutorialsPage = lazy(() => import('./pages/TutorialsPage'));
const SupportChatButton = lazy(() => import('./components/SupportChatButton'));


function AppContent({ isLoading }: { isLoading: boolean }) {
  const location = useLocation();
  const showFloatingButtons = ['/', '/swap', '/tutoriales'].includes(location.pathname);
  const showSupportButton = location.pathname === '/';

  return (
    <>
      <LanguageFab visible={showFloatingButtons} />
      <ThemeToggle visible={showFloatingButtons} />
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
          <Suspense fallback={<Preloader />}>
            <Routes>
              <Route path="/" element={
                <>
                  <Navbar />
                  <Hero />
                </>
              } />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/create-task" element={<ProtectedRoute><CreateTask /></ProtectedRoute>} />
              <Route path="/apply-task/:taskId" element={<ProtectedRoute><ApplyTask /></ProtectedRoute>} />
              <Route path="/proposals/:taskId" element={<ProtectedRoute><ProposalReview /></ProtectedRoute>} />
              <Route path="/supervise-task/:taskId/:acceptedApplicantId" element={<ProtectedRoute><SuperviseTask /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<UserProfile />} />
              <Route path="/dashboard/settings/profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
              <Route path="/swap" element={<><Navbar /><SwapPage /></>} />
              <Route path="/tutoriales" element={<><Navbar /><TutorialsPage /></>} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminRoute><AdminPanel isAdmin={true} /></AdminRoute>} />
              <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      )}
    </>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <TrustlessWorkConfig baseURL={TRUSTLESS_WORK_BASE_URL} apiKey={TRUSTLESS_WORK_API_KEY}>
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppContent isLoading={isLoading} />
      </Router>
    </TrustlessWorkConfig>
  );
}

export default App;
