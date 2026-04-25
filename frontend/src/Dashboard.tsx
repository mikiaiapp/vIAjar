import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Dashboard() {
  const [trips, setTrips] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTrip, setNewTrip] = useState({ title: '', destination: '', start_date: '', end_date: '' });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return navigate('/login');
    try {
      const res = await fetch('/api/trips', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setTrips(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTrip)
      });
      if (res.ok) {
        setShowCreateForm(false);
        setNewTrip({ title: '', destination: '', start_date: '', end_date: '' });
        fetchTrips();
      } else {
        alert("Error creando viaje");
      }
    } catch (e) {
      console.error(e);
    }
  };

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

      <main style={{ alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Mis Viajes</h1>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary">
            {showCreateForm ? 'Cancelar' : '+ Nuevo Itinerario'}
          </button>
        </div>

        {showCreateForm && (
          <div className="card glass-panel" style={{ width: '100%', marginBottom: '2rem', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Planificar nuevo viaje</h3>
            <form onSubmit={handleCreateTrip} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Título del Viaje</label>
                <input required type="text" placeholder="Ej: Ruta 66 en Familia" value={newTrip.title} onChange={e => setNewTrip({...newTrip, title: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Destino Principal</label>
                <input required type="text" placeholder="Ej: Japón" value={newTrip.destination} onChange={e => setNewTrip({...newTrip, destination: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Fecha de Inicio</label>
                <input required type="date" value={newTrip.start_date} onChange={e => setNewTrip({...newTrip, start_date: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Fecha de Fin</label>
                <input required type="date" value={newTrip.end_date} onChange={e => setNewTrip({...newTrip, end_date: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }} />
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Comenzar Diseño con IA</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center' }}>Cargando viajes...</p>
        ) : trips.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '3rem', color: 'var(--text-secondary)' }}>
            <p>Todavía no tienes ningún viaje planificado.</p>
            <p>Empieza ahora añadiendo tu destino preferido.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {trips.map(trip => (
              <div key={trip.id} className="card glass-panel" style={{ width: '100%' }}>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{trip.title}</h3>
                <p style={{ color: 'var(--primary)', fontWeight: 500, marginBottom: '1rem' }}>📍 {trip.destination}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  <span>Inicio: {trip.start_date}</span>
                  <span>Fin: {trip.end_date}</span>
                </div>
                <button className="btn-primary" style={{ width: '100%', padding: '0.5rem', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }}>
                  Ver Guía
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
