import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useAuthModal } from '../hooks/useAuthModal';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { openLogin, openRegister } = useAuthModal();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/gallery');
  };

  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    transition: 'all 0.3s',
    background: scrolled ? 'rgba(255,255,255,0.8)' : 'transparent',
    backdropFilter: scrolled ? 'blur(12px)' : 'none',
    borderBottom: scrolled ? '1px solid rgba(255,255,255,0.2)' : 'none',
  };

  return (
    <>
      <style>{`
        .nav-link { color: white; text-decoration: none; font-size: 0.875rem; font-weight: 500; transition: opacity 0.2s; }
        .nav-link:hover { opacity: 0.8; }
        .nav-link.active { opacity: 1; font-weight: 600; }
        .nav-btn { padding: 8px 16px; font-size: 0.875rem; font-weight: 500; border: none; background: rgba(255,255,255,0.9); color: #1f2937; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
        .nav-btn:hover { background: white; }
        .nav-btn-ghost { background: transparent; color: rgba(255,255,255,0.7); }
        .nav-btn-ghost:hover { color: white; background: transparent; }
      `}</style>
      <nav style={navStyle}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '80px' }}>
          <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', textDecoration: 'none' }}>
            RapidPhoto
          </Link>

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <Link to="/upload" className={`nav-link ${location.pathname === '/upload' ? 'active' : ''}`}>
                Upload
              </Link>
              <Link to="/gallery" className={`nav-link ${location.pathname === '/gallery' ? 'active' : ''}`}>
                Gallery
              </Link>
              {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '24px', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 600 }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>{user.username}</span>
                </div>
              )}
              <button onClick={handleLogout} className="nav-btn-ghost nav-btn">
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={openLogin} className="nav-btn-ghost nav-btn">
                Sign In
              </button>
              <button onClick={openRegister} className="nav-btn">
                Sign Up
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};
