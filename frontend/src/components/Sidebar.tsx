import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
// import './Sidebar.css'; // Removed in favor of App.css global styles

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard' },
    { path: '/personas', icon: 'bi-people-fill', label: 'Personas' },
    { path: '/asistencias', icon: 'bi-calendar-check-fill', label: 'Asistencias' },
    { path: '/reportes', icon: 'bi-bar-chart-fill', label: 'Reportes' },
    { path: '/polo-tecnologico', icon: 'bi-cpu-fill', label: 'Tecno Aliados' },
  ];

  return (
    <nav className={`sidebar-dark${collapsed ? ' collapsed' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        {/* Placeholder for Logo if needed */}
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
      </ul>
    </nav>
  );
};

export default Sidebar;