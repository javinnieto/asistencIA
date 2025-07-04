import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Personas from './pages/Personas';
import Asistencias from './pages/Asistencias';
import Reportes from './pages/Reportes';
import Login from './pages/Login';
import './App.css';

// Componente para proteger rutas privadas
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('accessToken');
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  // Estado global para el token
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  // Estado para saber si el sidebar está colapsado
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Sincronizar token con localStorage al cargar y al cambiar en otras pestañas
  useEffect(() => {
    const syncToken = () => {
      setToken(localStorage.getItem('accessToken'));
    };
    window.addEventListener('storage', syncToken);
    return () => {
      window.removeEventListener('storage', syncToken);
    };
  }, []);

  const isLoginRoute = location.pathname === '/login';

  if (isLoginRoute) {
    // Solo renderizar el login, sin navbar ni sidebar ni layout
    return <Routes><Route path="/login" element={<Login setToken={setToken} />} /></Routes>;
  }

  return (
    <div className="app-layout">
      <Navbar token={token} />
      {/* Nuevo wrapper para sidebar + contenido */}
      <div className="layout-content">
        {/* Ocultar Sidebar en /login */}
        {!isLoginRoute && (
          <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
        )}
        <div className={`main-content${sidebarCollapsed ? ' sidebar-collapsed' : ''}${isLoginRoute ? ' login-page' : ''}`}>
          <div className="page-content">
            <Routes>
              <Route path="/login" element={<Login setToken={setToken} />} />
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
                path="/reportes"
                element={
                  <PrivateRoute>
                    <Reportes />
                  </PrivateRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 