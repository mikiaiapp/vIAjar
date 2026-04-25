import { Link } from 'react-router-dom';

function Dashboard() {
  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link to="/">
          <img src="/logo.png" alt="vIAjar Logo" style={{ height: '50px' }} />
        </Link>
        <Link to="/profile">
           <button className="btn-primary" style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)' }}>Mi Perfil</button>
        </Link>
      </header>

      <main>
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '3rem', marginBottom: '1rem' }}>Mis Viajes</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem' }}>
            Aquí aparecerán todos los itinerarios que generes. El panel de planificación está en construcción.
          </p>

          <button className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.2rem', opacity: 0.5, cursor: 'not-allowed' }}>
            + Crear nuevo itinerario (Próximamente)
          </button>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
