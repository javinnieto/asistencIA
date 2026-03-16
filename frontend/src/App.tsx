import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Personas from './pages/Personas';
import Asistencias from './pages/Asistencias';
import Usuarios from './pages/Usuarios';
import CursosHorarios from './pages/CursosHorarios';
import DiasNoLaborables from './pages/DiasNoLaborables';
import InstitucionesTab from './pages/CursosHorarios/InstitucionesTab';
import AuditLog from './pages/AuditLog';
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

  // Cierra sidebar mobile al cambiar de ruta
  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location]);

  // Manejo del botón "atrás" del sistema / navegador en mobile:
  // Cuando se abre el sidebar, empujamos un estado extra al historial.
  // Si el usuario aprieta "atrás", capturamos el popstate y simplemente
  // cerramos el sidebar (sin navegar).
  React.useEffect(() => {
    if (mobileSidebarOpen) {
      // Empujamos un estado "dummy" para que el botón atrás tenga algo que consumir
      window.history.pushState({ sidebarOpen: true }, '');

      const handlePopState = (e: PopStateEvent) => {
        // Si el estado que se está sacando es el nuestro (o cualquiera mientras el sidebar está abierto)
        if (mobileSidebarOpen) {
          setMobileSidebarOpen(false);
          // Prevenimos que el navegador haga la navegación real
          e.stopImmediatePropagation?.();
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [mobileSidebarOpen]);

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

      {/* Mobile Overlay: clic fuera del sidebar → lo cierra */}
      {mobileSidebarOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 951,   // encima del ::before visual (950) pero bajo el sidebar (1000)
            cursor: 'pointer',
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
            path="/dias-no-laborables"
            element={
              <PrivateRoute>
                <DiasNoLaborables />
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
          <Route
            path="/audit-log"
            element={
              <AdminRoute>
                <AuditLog />
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