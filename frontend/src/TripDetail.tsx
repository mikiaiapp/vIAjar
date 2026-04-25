import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface POI {
  id: number;
  name: string;
  description: string;
  image_url: string;
}

interface Day {
  id: number;
  title: string;
  order: number;
  pois: any[];
}

interface Trip {
  id: number;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  available_pois: POI[];
  days: Day[];
}

const TripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrip = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando itinerario...</div>;
  if (!trip) return <div style={{ padding: '2rem', textAlign: 'center' }}>Viaje no encontrado</div>;

  return (
    <div className="app-container" style={{ padding: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'white' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>{trip.title}</h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>📍 {trip.destination} | {trip.start_date} al {trip.end_date}</p>
      </header>

      <div className="trello-board" style={{ 
        flex: 1, 
        display: 'flex', 
        gap: '1.5rem', 
        padding: '1.5rem', 
        overflowX: 'auto', 
        alignItems: 'flex-start',
        background: '#f4f7f9'
      }}>
        
        {/* COLUMNA: DESCUBRIMIENTOS (BACKLOG) */}
        <div className="trello-column" style={{ 
          minWidth: '320px', 
          maxWidth: '320px', 
          background: 'rgba(255,255,255,0.5)', 
          borderRadius: '12px', 
          display: 'flex', 
          flexDirection: 'column', 
          maxHeight: '100%',
          border: '1px dashed rgba(0,0,0,0.1)'
        }}>
          <div style={{ padding: '1rem', fontWeight: '600', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Descubrimientos IA</span>
            <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem' }}>{trip.available_pois?.length || 0}</span>
          </div>
          <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {trip.available_pois?.map(poi => (
              <div key={poi.id} className="card" style={{ padding: '0.8rem', background: 'white', cursor: 'grab', fontSize: '0.9rem' }}>
                {poi.image_url && <img src={poi.image_url} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.5rem' }} />}
                <div style={{ fontWeight: '600', marginBottom: '0.4rem' }}>{poi.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {poi.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMNAS DE DÍAS (SISTEMA TRELLO) */}
        {trip.days.map(day => (
          <div key={day.id} className="trello-column" style={{ 
            minWidth: '320px', 
            maxWidth: '320px', 
            background: 'white', 
            borderRadius: '12px', 
            display: 'flex', 
            flexDirection: 'column', 
            maxHeight: '100%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            <div style={{ padding: '1rem', fontWeight: '600', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              {day.title}
            </div>
            <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {day.pois.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2rem', border: '2px dashed #eee', padding: '2rem', borderRadius: '8px' }}>
                  Arrastra aquí para planificar el día
                </div>
              ) : (
                day.pois.map(dp => (
                   <div key={dp.id} className="card" style={{ padding: '0.8rem', background: 'white', fontSize: '0.9rem' }}>
                     <strong>{dp.poi.name}</strong>
                   </div>
                ))
              )}
            </div>
          </div>
        ))}

        {/* BOTÓN AÑADIR DÍA (MOCK) */}
        <button className="btn-primary" style={{ minWidth: '200px', background: 'transparent', color: 'var(--primary)', border: '1px dashed var(--primary)' }}>
          + Añadir Día
        </button>

      </div>
    </div>
  );
};

export default TripDetail;
