import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Personas from './pages/Personas';
import Asistencias from './pages/Asistencias';

import CursosHorarios from './pages/CursosHorarios';
import InstitucionesTab from './pages/CursosHorarios/InstitucionesTab';

import Login from './pages/Login';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';

// Componente para proteger rutas privadas
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const isLoginRoute = location.pathname === '/login';

  if (isLoginRoute) {
    return <Routes><Route path="/login" element={<Login />} /></Routes>;
  }

  // Si no está autenticado y no está en login, PrivateRoute lo redirigirá, 
  // pero aquí podemos interceptar para no renderizar el layout
  if (!isAuthenticated) {
    return <Routes>
      <Route path="*" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
    </Routes>;
  }

  return (
    <div className={`app-layout${sidebarCollapsed ? ' collapsed' : ''}`}>
      <Navbar token={isAuthenticated ? 'valid' : null} />

      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <div className={`main-content${isLoginRoute ? ' login-page' : ''}`}>
        <Routes>
          <Route path="/login" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/personas"
            element={
              <PrivateRoute>
                <Personas />
              </PrivateRoute>
            }
          />
          <Route
            path="/asistencias"
            element={
              <PrivateRoute>
                <Asistencias />
              </PrivateRoute>
            }
          />
          <Route
            path="/cursos-horarios"
            element={
              <PrivateRoute>
                <CursosHorarios />
              </PrivateRoute>
            }
          />
          <Route
            path="/instituciones"
            element={
              <PrivateRoute>
                <div className="container-fluid mt-4">
                  <h1 className="mb-4 text-white fw-bold">Gestionar Instituciones</h1>
                  <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' }}>
                    <InstitucionesTab />
                  </div>
                </div>
              </PrivateRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;