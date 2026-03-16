import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import 'bootstrap-icons/font/bootstrap-icons.css';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const { isAdmin, currentUser } = useAuth();

  const menuItems = [
    { path: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard' },
    { path: '/asistencias', icon: 'bi-calendar-check-fill', label: 'Asistencias' },
    { path: '/personas', icon: 'bi-people-fill', label: 'Personas' },
    { path: '/cursos-horarios', icon: 'bi-calendar-week-fill', label: 'Cursos y Horarios' },
    { path: '/dias-no-laborables', icon: 'bi-calendar-x-fill', label: 'Días No Laborables' },
  ];

  return (
    <nav className={`sidebar-dark${collapsed ? ' collapsed' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        {!collapsed && <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem', color: 'white' }}>AsistencIA</h3>}
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} style={{ margin: 0 }}>
          <i className={`bi ${collapsed ? 'bi-list' : 'bi-chevron-left'}`}></i>
        </button>
      </div>

      <ul>
        {menuItems.map((item) => (
          <li key={item.path} className={location.pathname === item.path ? 'active' : ''}>
            <Link to={item.path} title={collapsed ? item.label : ''}>
              <i className={`bi ${item.icon}`}></i>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          </li>
        ))}
        {/* Instituciones — solo admins */}
        {isAdmin && (
          <li className={location.pathname === '/instituciones' ? 'active' : ''}>
            <Link to="/instituciones" title={collapsed ? 'Instituciones' : ''}>
              <i className="bi bi-building"></i>
              {!collapsed && <span>Instituciones</span>}
            </Link>
          </li>
        )}
      </ul>

      {/* Pie: usuario actual */}
      {!collapsed && (
        <div style={{
          marginTop: 'auto',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: '0.78rem',
          color: 'rgba(255,255,255,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
        }}>
          <i
            className={`bi ${isAdmin ? 'bi-shield-fill' : 'bi-eye-fill'}`}
            style={{ color: isAdmin ? '#a5b4fc' : '#64748b' }}
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentUser} &mdash; {isAdmin ? 'Admin' : 'Lectura'}
          </span>
        </div>
      )}
    </nav>
  );
};

export default Sidebar;