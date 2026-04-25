import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

declare global {
  interface Window {
    L: any;
  }
}

interface POI {
  id: number;
  name: string;
  description: string;
  image_url: string;
  latitude?: number;
  longitude?: number;
}

interface Day {
  id: number;
  title: string;
  order: number;
  pois: { id: number; poi: POI }[];
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
  const [showMap, setShowMap] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

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

  // Manejo del Mapa Leaflet
  useEffect(() => {
    if (showMap && trip && window.L && !mapRef.current) {
      const L = window.L;
      mapRef.current = L.map('map-container').setView([55.9533, -3.1883], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    if (showMap && trip && window.L && mapRef.current) {
        const L = window.L;
        // Limpiar marcadores
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        const allPois = [...(trip.available_pois || [])];
        trip.days.forEach(d => d.pois.forEach(dp => allPois.push(dp.poi)));

        const coords: any[] = [];
        allPois.forEach(poi => {
            if (poi.latitude && poi.longitude) {
                const marker = L.marker([poi.latitude, poi.longitude])
                    .addTo(mapRef.current)
                    .bindPopup(`<strong>${poi.name}</strong><br/>${poi.description?.substring(0, 50)}...`);
                
                marker.on('mouseover', function() { this.openPopup(); });
                markersRef.current.push(marker);
                coords.push([poi.latitude, poi.longitude]);
            }
        });

        if (coords.length > 0) {
            mapRef.current.fitBounds(coords);
        }
    }
  }, [showMap, trip]);

  const handleMovePoi = async (poiId: number, dayId: number | null) => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/trips/${tripId}/move-poi?poi_id=${poiId}${dayId ? `&day_id=${dayId}` : ''}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTrip();
    } catch (e) { console.error(e); }
  };

  const onDragStart = (e: React.DragEvent, poiId: number) => {
    e.dataTransfer.setData('poiId', poiId.toString());
  };

  const onDrop = (e: React.DragEvent, dayId: number | null) => {
    const poiId = parseInt(e.dataTransfer.getData('poiId'));
    handleMovePoi(poiId, dayId);
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando itinerario...</div>;
  if (!trip) return <div style={{ padding: '2rem', textAlign: 'center' }}>Viaje no encontrado</div>;

  return (
    <div className="app-container" style={{ padding: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>{trip.title}</h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>📍 {trip.destination} | {trip.available_pois?.length} Sugerencias</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setShowMap(!showMap)} className="btn-primary" style={{ background: showMap ? 'var(--text-primary)' : 'var(--primary)' }}>
                {showMap ? 'Ver Tablero' : 'Ver Mapa 🗺️'}
            </button>
        </div>
      </header>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        
        {/* VISTA MAPA */}
        <div id="map-container" style={{ 
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
            zIndex: showMap ? 50 : -1,
            visibility: showMap ? 'visible' : 'hidden'
        }}></div>

        {/* VISTA TRELLO */}
        <div className="trello-board" style={{ 
            display: showMap ? 'none' : 'flex',
            gap: '1.5rem', 
            padding: '1.5rem', 
            overflowX: 'auto', 
            height: '100%',
            alignItems: 'flex-start',
            background: '#f4f7f9',
            boxSizing: 'border-box'
        }}>
            
            {/* BACKLOG */}
            <div className="trello-column" 
                 onDragOver={e => e.preventDefault()} 
                 onDrop={e => onDrop(e, null)}
                 style={{ minWidth: '320px', maxWidth: '320px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '100%', border: '2px dashed rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '1rem', fontWeight: '700', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>💡 Descubrimientos</span>
                    <span style={{ background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>{trip.available_pois?.length}</span>
                </div>
                <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {trip.available_pois?.map(poi => (
                        <div key={poi.id} draggable onDragStart={e => onDragStart(e, poi.id)} className="card" onClick={() => setSelectedPoi(poi)} style={{ padding: '0', overflow: 'hidden', background: 'white', cursor: 'grab', position: 'relative' }}>
                            <img src={poi.image_url} onError={(e: any) => { e.target.src='https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1' }} style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                            <div style={{ padding: '0.8rem' }}>
                                <div style={{ fontWeight: '600', marginBottom: '0.4rem' }}>{poi.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{poi.description}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* DÍAS */}
            {trip.days.map(day => (
                <div key={day.id} 
                     onDragOver={e => e.preventDefault()} 
                     onDrop={e => onDrop(e, day.id)}
                     className="trello-column" style={{ minWidth: '320px', maxWidth: '320px', background: 'white', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '1rem', fontWeight: '700', borderBottom: '2px solid var(--primary)', color: 'var(--primary)' }}>
                        {day.title}
                    </div>
                    <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {day.pois.map(dp => (
                            <div key={dp.id} draggable onDragStart={e => onDragStart(e, dp.poi.id)} className="card" onClick={() => setSelectedPoi(dp.poi)} style={{ padding: '0', overflow: 'hidden', background: 'white', cursor: 'grab' }}>
                                <img src={dp.poi.image_url} style={{ width: '100%', height: '80px', objectFit: 'cover' }} />
                                <div style={{ padding: '0.6rem' }}>
                                    <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{dp.poi.name}</div>
                                </div>
                            </div>
                        ))}
                        {day.pois.length === 0 && <div style={{ border: '1px dashed #ddd', padding: '2rem', textAlign: 'center', fontSize: '0.8rem', color: '#aaa', borderRadius: '8px' }}>Día libre. Suelta lugares aquí.</div>}
                    </div>
                </div>
            ))}

        </div>
      </div>

      {/* MODAL DETALLE POI */}
      {selectedPoi && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div className="card" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 0, background: 'white' }}>
                  <img src={selectedPoi.image_url} style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} />
                  <div style={{ padding: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0, color: 'var(--primary)' }}>{selectedPoi.name}</h2>
                        <button onClick={() => setSelectedPoi(null)} style={{ background: '#eee', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>Cerrar</button>
                      </div>
                      <p style={{ lineHeight: '1.6', color: 'var(--text-primary)', fontSize: '1.1rem' }}>{selectedPoi.description}</p>
                      {selectedPoi.latitude && (
                          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f8f8', borderRadius: '8px', fontSize: '0.9rem' }}>
                              📍 Coordenadas: {selectedPoi.latitude.toFixed(4)}, {selectedPoi.longitude?.toFixed(4)}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default TripDetail;
