import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import jwt_decode from 'jwt-decode';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

interface NavbarProps {
  token: string | null;
}

interface JwtPayload {
  username?: string;
  nombre?: string;
  full_name?: string;
  // Otros campos si los necesitás
}

const Navbar: React.FC<NavbarProps> = () => {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

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

  // Cerrar el menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
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
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  return (
    <nav className="navbar custom-navbar">
      <div className="container-fluid">
        <span className="navbar-brand">AsistencIA</span>
        <div className="navbar-user-actions">
          {token ? (
            <div className="navbar-dropdown-wrapper" ref={dropdownRef}>
              <button
                className="navbar-icon-btn"
                onClick={() => setDropdownOpen((open) => !open)}
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