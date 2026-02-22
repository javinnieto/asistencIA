import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import jwt_decode from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import { getConflictos, ignorarConflicto, aceptarConflicto } from '../config/api';
import { useToast } from '../components/Toast';
import './Navbar.css';

interface Conflicto {
  idConflicto: number;
  persona_db: {
    idPersona: number;
    nombre: string;
  };
  nombre_recibido: string;
  fechaHora: string;
  foto_recibida: string | null;
}

interface NavbarProps {
  token: string | null;
}

interface JwtPayload {
  username?: string;
  nombre?: string;
  full_name?: string;
  // Otros campos si los necesitás
}

const Navbar: React.FC<NavbarProps & { onToggleMobileSidebar?: () => void }> = ({ token, onToggleMobileSidebar }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showToast } = useToast();

  let displayName = '';
  if (token) {
    try {
      const decoded = jwt_decode<any>(token);
      displayName = decoded.username || decoded.user_id || 'Usuario';
    } catch (e) {
      console.error('Error decoding token:', e);
      displayName = 'Usuario';
    }
  }

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Conflicts state
  const [conflictos, setConflictos] = useState<Conflicto[]>([]);
  const [conflictosOpen, setConflictosOpen] = useState(false);
  const conflictosRef = useRef<HTMLDivElement>(null);

  const fetchConflictos = async () => {
    if (!token) return;
    try {
      const res = await getConflictos();
      const data = await res.json();
      setConflictos(data.results || data || []);
    } catch (e) {
      console.error('Error fetching conflicts', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchConflictos();
      // Optional: poll every minute
      const interval = setInterval(fetchConflictos, 60000);
      return () => clearInterval(interval);
    }
  }, [token]);

  // Cerrar el menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (conflictosRef.current && !conflictosRef.current.contains(event.target as Node)) {
        setConflictosOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, conflictosOpen]);

  const handleResolverConflicto = async (id: number, action: 'ignorar' | 'aceptar') => {
    try {
      if (action === 'ignorar') {
        const res = await ignorarConflicto(id);
        if (res.ok) showToast('Conflicto ignorado y borrado', 'success');
      } else {
        const res = await aceptarConflicto(id);
        if (res.ok) showToast('¡Persona actualizada exitosamente con los nuevos datos!', 'success');
      }
      fetchConflictos();
    } catch (e) {
      console.error('Error resolviendo conflicto', e);
      showToast('Ocurrió un error al resolver el conflicto', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  return (
    <nav className="navbar custom-navbar">
      <div className="container-fluid">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {token && (
            <button
              className="btn btn-link text-white d-md-none p-0"
              onClick={onToggleMobileSidebar}
              style={{ fontSize: '1.5rem' }}
            >
              <i className="bi bi-list"></i>
            </button>
          )}
          <span className="navbar-brand">AsistencIA</span>
        </div>
        <div className="navbar-user-actions">
          {token ? (
            <>
              {/* Notificaciones de Conflicto */}
              <div className="navbar-dropdown-wrapper" ref={conflictosRef}>
                <button
                  className="navbar-icon-btn navbar-bell-btn position-relative"
                  onClick={() => {
                    setConflictosOpen((open) => !open);
                    setDropdownOpen(false);
                  }}
                  title="Alertas de Seguridad"
                >
                  <i className="bi bi-bell-fill"></i>
                  {conflictos.length > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.55em', padding: '0.35em 0.5em' }}>
                      {conflictos.length}
                    </span>
                  )}
                </button>

                {conflictosOpen && (
                  <div className="navbar-dropdown-menu p-3 shadow" style={{ right: 0, left: 'auto' }}>
                    <h6 className="dropdown-header text-danger mb-2 p-0"><i className="bi bi-shield-exclamation me-1"></i> Alertas de Seguridad</h6>
                    {conflictos.length === 0 ? (
                      <div className="text-muted text-center py-3">No hay alertas.</div>
                    ) : (
                      <div className="d-flex flex-column gap-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {conflictos.map(c => (
                          <div key={c.idConflicto} className="card border-danger border-1">
                            <div className="card-body p-2">
                              <small className="text-muted d-block mb-1">{new Date(c.fechaHora).toLocaleTimeString()} - ID: {c.persona_db.idPersona}</small>
                              <div className="mb-2" style={{ fontSize: '0.9rem' }}>
                                Lector: <strong>{c.nombre_recibido}</strong><br/>
                                BD: <strong>{c.persona_db.nombre}</strong>
                              </div>
                              <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-outline-secondary w-50" onClick={() => handleResolverConflicto(c.idConflicto, 'ignorar')}>IGNORAR</button>
                                <button className="btn btn-sm btn-outline-danger w-50" onClick={() => handleResolverConflicto(c.idConflicto, 'aceptar')}>ES {c.nombre_recibido.toUpperCase()}</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Menú Usuario */}
              <div className="navbar-dropdown-wrapper" ref={dropdownRef}>
                <button
                  className="navbar-icon-btn"
                  onClick={() => {
                    setDropdownOpen((open) => !open);
                    setConflictosOpen(false);
                  }}
                  title="Menú de Usuario"
                >
                <i className="bi bi-person-circle"></i>
              </button>
              {dropdownOpen && (
                <div className="navbar-dropdown-menu">
                  <div className="dropdown-header">
                    <i className="bi bi-person-fill me-2"></i>
                    {displayName}
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link
                    to="/instituciones"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <i className="bi bi-building me-2"></i>Gestionar Instituciones
                  </Link>
                    <button className="dropdown-item" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i>Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link to="/login" className="btn btn-outline-light">
              <i className="bi bi-box-arrow-in-right me-1"></i>Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 