import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import jwt_decode from 'jwt-decode';
import './Navbar.css';

interface JwtPayload {
  username?: string;
  nombre?: string;
  full_name?: string;
  // Otros campos si los necesitás
}

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');
  let displayName = '';
  if (token) {
    try {
      const decoded = jwt_decode<JwtPayload>(token);
      displayName = decoded.nombre || decoded.full_name || decoded.username || '';
    } catch (e) {
      displayName = '';
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
    localStorage.removeItem('accessToken');
    setDropdownOpen(false);
    navigate('/login');
  };

  return (
    <nav className="navbar custom-navbar">
      <div className="container-fluid">
        <span className="navbar-brand">AsistencIA</span>
        <div className="navbar-user-actions">
          {token && displayName ? (
            <div className="navbar-dropdown-wrapper" ref={dropdownRef}>
              <button
                className="navbar-username-btn"
                onClick={() => setDropdownOpen((open) => !open)}
              >
                {displayName}
                <span className="dropdown-caret ms-2">▼</span>
              </button>
              {dropdownOpen && (
                <div className="navbar-dropdown-menu">
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