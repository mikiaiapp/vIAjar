import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Mis Viajes', icon: '✈️' },
    { path: '/profile', label: 'Mi Perfil', icon: '⚙️' }
  ];

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: '100vh', background: '#f1f5f9' }}>
      
      {/* Botón Flotante para Móvil */}
      <button 
        className="mobile-fab" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'var(--primary)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          zIndex: 2000,
          cursor: 'pointer',
          fontSize: '1.5rem',
          display: 'none', // Se controla por CSS
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isMobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div 
          onClick={closeMenu}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 998 }} 
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`} style={{ 
        width: '280px', 
        padding: '3rem 1.5rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '3rem',
        borderRight: '1px solid rgba(0, 0, 0, 0.05)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxSizing: 'border-box',
        background: '#f1f5f9',
        zIndex: 1000,
        transition: 'transform 0.3s ease'
      }}>
        <div style={{ padding: '0', textAlign: 'center' }}>
          <Link to="/" onClick={closeMenu}>
            <img src="/logo.png" alt="vIAjar Logo" style={{ width: '100%', maxWidth: '240px' }} />
          </Link>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map(item => {
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/trip'));
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                onClick={closeMenu}
                style={{ 
                  textDecoration: 'none', 
                  color: isActive ? 'white' : 'var(--text-secondary)',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: isActive ? 'var(--primary)' : 'transparent',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '0 1rem' }}>
          <button 
            onClick={handleLogout} 
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              background: 'transparent', 
              border: '1px solid rgba(255, 77, 79, 0.5)', 
              color: '#ff4d4f', 
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content" style={{ flex: 1, padding: '2rem 4rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}

export default Layout;
