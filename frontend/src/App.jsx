import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import CommandDashboard from './pages/CommandDashboard';
import CaptainDashboard from './pages/CaptainDashboard';
import { useAuthStore } from './store/authStore';
import { connectSocket, disconnectSocket } from './lib/socket';

export default function App() {
  const { role, shipId } = useAuthStore();

  useEffect(() => {
    if (role) connectSocket(role, shipId);
    // intentionally do not disconnect on cleanup — connection is a singleton
    // and StrictMode double-mount would tear it down right after creation.
  }, [role, shipId]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/command"
        element={role === 'command' ? <CommandDashboard /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/captain/:shipId"
        element={role === 'captain' ? <CaptainDashboard /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to={role ? (role === 'command' ? '/command' : `/captain/${shipId}`) : '/login'} replace />} />
    </Routes>
  );
}
