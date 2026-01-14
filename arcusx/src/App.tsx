import { useState, useEffect } from 'react';
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
import Dashboard from './dashboard';
import Preloader from './components/Preloader';
import CreateTask from './components/CreateTask';
import ApplyTask from './components/ApplyTask';
import ProposalReview from './components/ProposalReview';
import SuperviseTask from './components/SuperviseTask';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfile from './components/UserProfile';
import EditProfile from './components/EditProfile';
import SwapPage from './pages/SwapPage';
import './App.css';


function AppContent({ isLoading }: { isLoading: boolean }) {
  const location = useLocation();

  return (
    <>
      <LanguageFab visible={location.pathname === '/'} />
      <ThemeToggle visible={location.pathname === '/'} />
      {isLoading ? (
        <Preloader />
      ) : (
        <div className="app">
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
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminRoute><AdminPanel isAdmin={true} /></AdminRoute>} />
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
