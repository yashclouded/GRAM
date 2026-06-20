import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import FarmerApp from './pages/FarmerApp';
import BuyerApp from './pages/BuyerApp';
import TransporterApp from './pages/TransporterApp';
import NetworkConsole from './pages/NetworkConsole';

function ProtectedRoute({ requireRole }) {
  const { user, profile, loading } = useAuth();

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><Loader2 className="spin" size={32}/></div>;
  if (!user) return <Navigate to="/auth" replace />;

  if (requireRole && profile?.role !== requireRole) {
    if (!profile?.role) return <Navigate to="/onboarding" replace />;
    return <Navigate to={`/${profile.role}`} replace />;
  }

  return <Outlet />;
}

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}><Loader2 className="spin" size={32}/></div>;

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/admin" element={<NetworkConsole />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={profile?.role ? <Navigate to={`/${profile.role}`} replace /> : <Onboarding />} />
        
        {/* Role Protected Routes */}
        <Route element={<ProtectedRoute requireRole="farmer" />}>
          <Route path="/farmer" element={<FarmerApp />} />
        </Route>
        
        <Route element={<ProtectedRoute requireRole="buyer" />}>
          <Route path="/buyer" element={<BuyerApp />} />
        </Route>
        
        <Route element={<ProtectedRoute requireRole="transporter" />}>
          <Route path="/transporter" element={<TransporterApp />} />
        </Route>
        
        {/* Base route redirect */}
        <Route path="/" element={
          profile?.role ? <Navigate to={`/${profile.role}`} replace /> : <Navigate to="/onboarding" replace />
        } />
      </Route>
    </Routes>
  );
}
