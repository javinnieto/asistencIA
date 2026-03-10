import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Personas from './pages/Personas';
import Asistencias from './pages/Asistencias';
import Usuarios from './pages/Usuarios';
import CursosHorarios from './pages/CursosHorarios';
import InstitucionesTab from './pages/CursosHorarios/InstitucionesTab';
import Login from './pages/Login';
import './App.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';

// Protege rutas privadas (autenticado)
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

// Protege rutas solo-admin
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false); // New state for mobile
  const location = useLocation();

  const isLoginRoute = location.pathname === '/login';

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location]);

  if (isLoginRoute) {
    return <Routes><Route path="/login" element={<Login />} /></Routes>;
  }

  if (!isAuthenticated) {
    return <Routes>
      <Route path="*" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
    </Routes>;
  }

  return (
    <div className={`app-layout${sidebarCollapsed ? ' collapsed' : ''} ${mobileSidebarOpen ? 'mobile-sidebar-open' : ''}`}>
      <Navbar
        token={isAuthenticated ? 'valid' : null}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      />

      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Mobile Overlay to close sidebar */}
      {mobileSidebarOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 900
            // Visual style is handled in CSS by ::before on .app-layout, but this div ensures click capture
          }}
        />
      )}

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
          <Route
            path="/usuarios"
            element={
              <AdminRoute>
                <Usuarios />
              </AdminRoute>
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