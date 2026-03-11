import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import jwt_decode from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import { getConflictos } from '../config/api';
import { useToast } from '../components/Toast';
import ConflictoModal from './ConflictoModal';
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
  const { logout, currentUser, isAdmin } = useAuth();
  const { showToast } = useToast();

  const displayName = currentUser || 'Usuario';

  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Conflicts state
  const [conflictos, setConflictos] = useState<Conflicto[]>([]);
  const [conflictosOpen, setConflictosOpen] = useState(false);
  const [resolvingConflict, setResolvingConflict] = useState<Conflicto | null>(null);
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
    if (dropdownOpen || conflictosOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, conflictosOpen]);

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
                          <div 
                            key={c.idConflicto} 
                            className="card border-danger border-1 shadow-sm"
                            style={{ cursor: 'pointer', transition: 'all 0.2s', backgroundColor: '#fff5f5' }}
                            onClick={() => {
                              setConflictosOpen(false);
                              setResolvingConflict(c);
                            }}
                          >
                            <div className="card-body p-3">
                              <small className="text-muted d-block mb-2">{new Date(c.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ID LECTOR: {c.persona_db.idPersona}</small>
                              <div className="mb-2" style={{ fontSize: '0.9rem', color: '#334155' }}>
                                Un rostro coincidente intentó ingresar usando el nombre <strong className="text-danger">{c.nombre_recibido}</strong>.<br/>
                                Registrado en BD como: <strong>{c.persona_db.nombre}</strong>
                              </div>
                              <div className="text-primary fw-bold text-end" style={{ fontSize: '0.8rem', marginTop: '10px' }}>
                                Clic para resolver <i className="bi bi-arrow-right"></i>
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
                  className="navbar-icon-btn d-flex align-items-center gap-2"
                  onClick={() => {
                    setDropdownOpen((open) => !open);
                    setConflictosOpen(false);
                  }}
                  title="Menú de Usuario"
                >
                <i className="bi bi-person-circle"></i>
                <span className="d-none d-md-inline" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{displayName}</span>
              </button>
              {dropdownOpen && (
                <div className="navbar-dropdown-menu">
                  <div className="dropdown-header">
                    <i className="bi bi-person-fill me-2"></i>
                    {displayName}
                  </div>
                  <div className="dropdown-divider"></div>
                  {isAdmin && (
                    <>
                      <Link to="/usuarios" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                        <i className="bi bi-person-lock me-2"></i>Usuarios
                      </Link>
                      <Link to="/audit-log" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                        <i className="bi bi-journal-text me-2"></i>Logs de Auditoría
                      </Link>
                    </>
                  )}
                    <button className="dropdown-item" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i>Logout
                    </button>
                  </div>
                )}
              </div>

              {resolvingConflict && (
                <ConflictoModal
                  conflict={resolvingConflict}
                  onClose={() => setResolvingConflict(null)}
                  onResolved={() => {
                    setResolvingConflict(null);
                    fetchConflictos();
                    // Dispatch custom event to tell sibling Personas grid to refresh
                    window.dispatchEvent(new Event('conflictosUpdated'));
                  }}
                />
              )}
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