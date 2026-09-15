import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from './Button';

const Navbar = ({ isAdmin, onLogout, user }) => {
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo" onClick={closeMenu}>PADELTINO</Link>
        
        <button className={`navbar-mobile-toggle ${isMenuOpen ? 'is-open' : ''}`} onClick={toggleMenu} aria-label="Toggle menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line className="line line1" x1="3" y1="6" x2="21" y2="6" />
            <line className="line line2" x1="3" y1="12" x2="21" y2="12" />
            <line className="line line3" x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className={`navbar-menu ${isMenuOpen ? 'is-open' : ''}`}>
          <div className="navbar-links">
            <Link
              to="/dashboard"
              className={`navbar-link${pathname === '/dashboard' ? ' active' : ''}`}
              onClick={closeMenu}
            >
              Mis Reservas
            </Link>
            <Link
              to="/book"
              className={`navbar-link${pathname === '/book' ? ' active' : ''}`}
              onClick={closeMenu}
            >
              Reservar Pista
            </Link>
            <Link
              to="/user"
              className={`navbar-link${pathname === '/user' ? ' active' : ''}`}
              onClick={closeMenu}
            >
              Mi Perfil
            </Link>
          </div>

          <div className="navbar-actions">
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
