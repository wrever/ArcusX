import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Trustless Work - ELIMINADO
import Navbar from './components/Navbar';
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
import PostRegistrationVerification from './components/PostRegistrationVerification';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
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
              <Route path="/verify-identity" element={<ProtectedRoute><PostRegistrationVerification /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/create-task" element={<ProtectedRoute><CreateTask /></ProtectedRoute>} />
              <Route path="/apply-task/:taskId" element={<ProtectedRoute><ApplyTask /></ProtectedRoute>} />
              <Route path="/proposals/:taskId" element={<ProtectedRoute><ProposalReview /></ProtectedRoute>} />
              <Route path="/supervise-task/:taskId/:acceptedApplicantId" element={<ProtectedRoute><SuperviseTask /></ProtectedRoute>} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminRoute><AdminPanel isAdmin={true} /></AdminRoute>} />
              <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        )}
      </Router>
  );
}

export default App;
