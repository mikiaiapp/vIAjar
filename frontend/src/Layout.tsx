import { Link, useLocation, useNavigate } from 'react-router-dom';

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Mis Viajes', icon: '✈️' },
    { path: '/profile', label: 'Mi Perfil', icon: '⚙️' }
  ];

  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="sidebar glass-panel" style={{ 
        width: '250px', 
        padding: '2rem 1rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2rem',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        height: '100vh',
        boxSizing: 'border-box'
      }}>
        <div style={{ padding: '0 1rem' }}>
          <Link to="/">
            <img src="/logo.png" alt="vIAjar Logo" style={{ width: '100%', maxWidth: '150px' }} />
          </Link>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map(item => {
            const isActive = location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/trip'));
            return (
              <Link 
                key={item.path} 
                to={item.path} 
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
      <main style={{ flex: 1, padding: '2rem 4rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}

export default Layout;
