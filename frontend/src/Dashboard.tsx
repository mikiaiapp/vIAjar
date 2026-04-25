import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
        const createdTrip = await res.json();
        setShowCreateForm(false);
        setNewTrip({ title: '', destination: '', start_date: '', end_date: '' });
        navigate(`/trip/${createdTrip.id}/generate`);
      } else {
        alert("Error creando viaje");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [tripToDelete, setTripToDelete] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const handleDeleteTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation.toLowerCase() !== 'borrar') return;
    
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/trips/${tripToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setTripToDelete(null);
        setDeleteConfirmation('');
        fetchTrips();
      } else {
        alert("Error al borrar el viaje");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="app-container" style={{ padding: 0 }}>
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
              <div key={trip.id} className="card glass-panel" style={{ width: '100%', position: 'relative' }}>
                <button onClick={() => setTripToDelete(trip)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', opacity: 0.5 }}>🗑️</button>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.5rem', paddingRight: '2rem' }}>{trip.title}</h3>
                <p style={{ color: 'var(--primary)', fontWeight: 500, marginBottom: '1rem' }}>📍 {trip.destination}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  <span>Inicio: {trip.start_date}</span>
                  <span>Fin: {trip.end_date}</span>
                </div>
                <button onClick={() => navigate(`/trip/${trip.id}${trip.status !== 'completed' ? '/generate' : ''}`)} className="btn-primary" style={{ width: '100%', padding: '0.5rem', background: trip.status === 'completed' ? 'var(--primary)' : 'transparent', border: '1px solid var(--primary)', color: trip.status === 'completed' ? 'white' : 'var(--primary)' }}>
                  {trip.status === 'planning' ? 'Ver Progreso IA' : 'Ver Guía'}
                </button>
              </div>
            ))}
          </div>
        )}

        {tripToDelete && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '100%' }}>
              <h3 style={{ color: '#ff4d4f', marginBottom: '1rem', fontSize: '1.5rem' }}>⚠️ Atención</h3>
              <p style={{ marginBottom: '1.5rem' }}>Estás a punto de borrar irremediablemente el viaje <strong>{tripToDelete.title}</strong>.</p>
              <form onSubmit={handleDeleteTrip}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Para continuar, escribe <strong>borrar</strong>:</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={deleteConfirmation}
                  onChange={e => setDeleteConfirmation(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', marginBottom: '1.5rem' }} 
                />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => { setTripToDelete(null); setDeleteConfirmation(''); }} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'transparent', border: '1px solid var(--surface-border)', color: 'white', cursor: 'pointer' }}>Cancelar</button>
                  <button type="submit" disabled={deleteConfirmation.toLowerCase() !== 'borrar'} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: deleteConfirmation.toLowerCase() === 'borrar' ? '#ff4d4f' : 'rgba(255, 77, 79, 0.3)', border: 'none', color: 'white', cursor: deleteConfirmation.toLowerCase() === 'borrar' ? 'pointer' : 'not-allowed', fontWeight: 600 }}>Eliminar</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
