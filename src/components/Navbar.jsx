import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from './Button';

const Navbar = ({ isAdmin, onLogout, user }) => {
  const { pathname } = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo">PADELTINO</Link>

        <div className="navbar-links">
          <Link
            to="/dashboard"
            className={`navbar-link${pathname === '/dashboard' ? ' active' : ''}`}
          >
            Mis Reservas
          </Link>
          <Link
            to="/book"
            className={`navbar-link${pathname === '/book' ? ' active' : ''}`}
          >
            Reservar Pista
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className={`navbar-link${pathname === '/admin' ? ' active' : ''}`}
            >
              Admin
            </Link>
          )}
        </div>

        <div className="navbar-actions">
          {isAdmin && (
            <span className="badge badge-green" style={{ marginRight: 8 }}>Admin</span>
          )}
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
