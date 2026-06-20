import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

import Auth from './pages/Auth';
import LandingPage from './pages/LandingPage';
import Onboarding from './pages/Onboarding';
import FarmerApp from './pages/FarmerApp';
import BuyerApp from './pages/BuyerApp';
import TransporterApp from './pages/TransporterApp';
import ProfilePage from './pages/ProfilePage';
import NetworkConsole from './pages/NetworkConsole';
import SciencePage from './pages/SciencePage';

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Loader2 className="spin" size={32} color="#2e7d32" />
    </div>
  );
}

function ProtectedRoute({ requireRole }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (requireRole && profile?.role !== requireRole) {
    if (!profile?.role) return <Navigate to="/onboarding" replace />;
    return <Navigate to={`/${profile.role}`} replace />;
  }
  return <Outlet />;
}

export default function App() {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={user ? <Navigate to={profile?.role ? `/${profile.role}` : '/onboarding'} replace /> : <LandingPage />} />
      <Route path="/auth" element={user ? <Navigate to={profile?.role ? `/${profile.role}` : '/onboarding'} replace /> : <Auth />} />
      <Route path="/admin" element={<NetworkConsole />} />
      <Route path="/science" element={<SciencePage />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={profile?.role ? <Navigate to={`/${profile.role}`} replace /> : <Onboarding />} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route element={<ProtectedRoute requireRole="farmer" />}>
          <Route path="/farmer" element={<FarmerApp />} />
        </Route>
        <Route element={<ProtectedRoute requireRole="buyer" />}>
          <Route path="/buyer" element={<BuyerApp />} />
        </Route>
        <Route element={<ProtectedRoute requireRole="transporter" />}>
          <Route path="/transporter" element={<TransporterApp />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
