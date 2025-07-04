import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const location = useLocation();

  return (
    <nav className={`sidebar-dark${collapsed ? ' collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
        <i className="bi bi-list"></i>
      </button>
      <ul>
        <li className={location.pathname === '/dashboard' ? 'active' : ''}>
          <Link to="/dashboard"><i className="bi bi-house"></i> <span>Dashboard</span></Link>
        </li>
        <li className={location.pathname === '/personas' ? 'active' : ''}>
          <Link to="/personas"><i className="bi bi-people"></i> <span>Personas</span></Link>
        </li>
        <li className={location.pathname === '/asistencias' ? 'active' : ''}>
          <Link to="/asistencias"><i className="bi bi-clipboard-check"></i> <span>Asistencias</span></Link>
        </li>
        <li className={location.pathname === '/reportes' ? 'active' : ''}>
          <Link to="/reportes"><i className="bi bi-bar-chart"></i> <span>Reportes</span></Link>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar; 