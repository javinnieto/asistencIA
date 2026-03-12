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
    foto?: string;
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
      // Polling cada 8 segundos para detectar conflictos nuevos sin recargar
      const interval = setInterval(fetchConflictos, 8000);
      // También escuchar el evento 'conflictosUpdated' para refresco inmediato
      const handleRefresh = () => fetchConflictos();
      window.addEventListener('conflictosUpdated', handleRefresh);
      window.addEventListener('syncCompletado', handleRefresh);
      return () => {
        clearInterval(interval);
        window.removeEventListener('conflictosUpdated', handleRefresh);
        window.removeEventListener('syncCompletado', handleRefresh);
      };
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
                  className={`navbar-icon-btn navbar-bell-btn position-relative${conflictos.length > 0 ? ' navbar-bell-active' : ''}`}
                  onClick={() => {
                    const opening = !conflictosOpen;
                    setConflictosOpen(opening);
                    setDropdownOpen(false);
                    // Refrescar al abrir para siempre tener datos frescos
                    if (opening) fetchConflictos();
                  }}
                  title="Alertas de Seguridad"
                >
                  <i className="bi bi-bell-fill"></i>
                  {conflictos.length > 0 && (() => {
                    // Deduplicar: contar personas únicas con conflicto
                    const uniqueCount = new Set(conflictos.map(c => c.persona_db.idPersona)).size;
                    return (
                      <span className="navbar-notif-badge">
                        {uniqueCount > 9 ? '9+' : uniqueCount}
                      </span>
                    );
                  })()}
                </button>

                {conflictosOpen && (
                  <div className="navbar-dropdown-menu navbar-notif-panel shadow">
                    <div className="navbar-notif-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="navbar-notif-header-icon">
                          <i className="bi bi-shield-exclamation"></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9' }}>Alertas de Seguridad</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {/* Deduplicar por persona para el conteo */}
                            {Array.from(new Map(conflictos.map(c => [c.persona_db.idPersona, c])).values()).length} persona{Array.from(new Map(conflictos.map(c => [c.persona_db.idPersona, c])).values()).length !== 1 ? 's' : ''} con conflicto pendiente
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="navbar-notif-body">
                      {conflictos.length === 0 ? (
                        <div className="navbar-notif-empty">
                          <i className="bi bi-shield-check" style={{ fontSize: '2rem', color: '#4ade80', marginBottom: '10px' }}></i>
                          <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Sin alertas activas</div>
                        </div>
                      ) : (
                        // Deduplicar: tomar el conflicto más reciente por persona
                        Array.from(
                          new Map(
                            [...conflictos]
                              .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
                              .map(c => [c.persona_db.idPersona, c])
                          ).values()
                        ).map(c => (
                          <div
                            key={c.idConflicto}
                            className="navbar-notif-item"
                            onClick={() => {
                              setConflictosOpen(false);
                              setResolvingConflict(c);
                            }}
                          >
                            {/* Foto de la persona o ícono */}
                            {c.persona_db.foto ? (
                              <img
                                src={c.persona_db.foto}
                                alt={c.persona_db.nombre}
                                style={{
                                  width: '40px', height: '40px', borderRadius: '50%',
                                  objectFit: 'cover', flexShrink: 0,
                                  border: '2px solid rgba(239,68,68,0.4)',
                                }}
                              />
                            ) : (
                              <div className="navbar-notif-item-icon">
                                <i className="bi bi-person-fill-exclamation"></i>
                              </div>
                            )}
                            <div className="navbar-notif-item-content">
                              <div className="navbar-notif-item-title">
                                {c.persona_db.nombre}
                              </div>
                              <div className="navbar-notif-item-sub">
                                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Lector detectó: </span>
                                <span className="navbar-notif-name-chip navbar-notif-name-chip-danger">{c.nombre_recibido}</span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '4px' }}>
                                {new Date(c.fechaHora).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                              </div>
                            </div>
                            <i className="bi bi-chevron-right" style={{ color: '#475569', fontSize: '0.8rem', flexShrink: 0 }}></i>
                          </div>
                        ))
                      )}
                    </div>
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