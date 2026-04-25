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
  const [currentDayIdx, setCurrentDayIdx] = useState(0);
  
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
        if (data.available_pois?.length > 0 && !selectedPoi) {
          setSelectedPoi(data.available_pois[0]);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTrip(); }, [tripId]);

  // Leaflet Sync
  useEffect(() => {
    if (showMap && trip && window.L && !mapRef.current) {
      const L = window.L;
      mapRef.current = L.map('map-detail-container').setView([0, 0], 2);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
    }

    if (showMap && trip && window.L && mapRef.current) {
        const L = window.L;
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        const assignedIds = new Set();
        trip.days.forEach(d => d.pois.forEach(dp => assignedIds.add(dp.poi.id)));

        const coords: any[] = [];
        const allPois = [...(trip.available_pois || [])];
        trip.days.forEach(d => d.pois.forEach(dp => allPois.push(dp.poi)));

        allPois.forEach(poi => {
            if (poi.latitude && poi.longitude) {
                const isAssigned = assignedIds.has(poi.id);
                const color = isAssigned ? '#10b981' : '#4f46e5';
                
                const icon = L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="background-color:${color}; width:12px; height:12px; border-radius:50%; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
                  iconSize: [12, 12],
                  iconAnchor: [6, 6]
                });

                const marker = L.marker([poi.latitude, poi.longitude], { icon })
                    .addTo(mapRef.current);
                
                marker.on('click', () => setSelectedPoi(poi));
                markersRef.current.push(marker);
                coords.push([poi.latitude, poi.longitude]);
            }
        });

        if (coords.length > 0 && !selectedPoi) {
            mapRef.current.fitBounds(coords, { padding: [50, 50] });
        } else if (selectedPoi?.latitude) {
            mapRef.current.setView([selectedPoi.latitude, selectedPoi.longitude], 13);
        }
    }
  }, [showMap, trip, selectedPoi]);

  const handleMovePoi = async (poiId: number, dayId: number | null, isAccommodation: boolean = false) => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/trips/${tripId}/move-poi?poi_id=${poiId}${dayId ? `&day_id=${dayId}` : ''}${isAccommodation ? '&is_accommodation=true' : ''}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTrip();
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="loading-screen" style={{ padding: '4rem', textAlign: 'center', background: 'white', height: '100vh' }}><h3>Cargando tu próxima aventura...</h3></div>;
  if (!trip) return <div className="error-screen" style={{ padding: '4rem', textAlign: 'center' }}>Viaje no encontrado</div>;

  const currentDay = trip.days[currentDayIdx];
  const assignedIds = new Set();
  trip.days.forEach(d => {
    d.pois.forEach(dp => assignedIds.add(dp.poi.id));
    if (d.accommodation) assignedIds.add(d.accommodation.id);
  });
  const unassignedPois = trip.available_pois?.filter(p => !assignedIds.has(p.id)) || [];

  return (
    <div className="trip-engine" style={{ display: 'flex', height: '100vh', background: '#f4f7f9', overflow: 'hidden' }}>
      
      {/* COLUMNA 1: DESCUBRIMIENTOS / CARUSEL O MAPA */}
      <div className="col-discovery" style={{ width: '350px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(0,0,0,0.05)', background: 'white' }}>
        <header style={{ padding: '1.5rem', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>Descubrimientos</h2>
            <small style={{ color: 'var(--text-secondary)' }}>{unassignedPois.length} disponibles</small>
          </div>
          <button onClick={() => setShowMap(!showMap)} style={{ border: 'none', background: '#f1f5f9', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
            {showMap ? '📋 Ver Lista' : '🗺️ Ver Mapa'}
          </button>
        </header>

        <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '1rem', position: 'relative' }}>
          {showMap ? (
            <div id="map-detail-container" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}></div>
          ) : (
            <div className="vertical-carousel" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {unassignedPois.map(poi => (
                <div key={poi.id} 
                     draggable 
                     onDragStart={e => e.dataTransfer.setData('poiId', poi.id.toString())}
                     onClick={() => setSelectedPoi(poi)}
                     style={{ 
                       height: '220px', 
                       borderRadius: '16px', 
                       overflow: 'hidden', 
                       position: 'relative', 
                       cursor: 'pointer',
                       transition: 'transform 0.2s',
                       border: selectedPoi?.id === poi.id ? '4px solid var(--primary)' : 'none',
                       boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                     }}>
                  <img src={poi.image_url} onError={(e:any)=>e.target.src='https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.5rem 1rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', color: 'white' }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{poi.name}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{poi.category}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COLUMNA 2: DETALLE DEL SELECCIONADO */}
      <div className="col-details" style={{ flex: 1, background: 'white', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
        {selectedPoi ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ height: '350px', width: '100%', position: 'relative' }}>
              <img src={selectedPoi.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--primary)', color: 'white', padding: '0.5rem 1.2rem', borderRadius: '30px', fontSize: '0.75rem', fontWeight: '700' }}>
                 {selectedPoi.category?.toUpperCase()}
              </div>
            </div>
            <div style={{ padding: '3rem', flex: 1, overflowY: 'auto' }}>
              <div style={{ marginBottom: '0.5rem', color: 'var(--primary)', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase' }}>Explorar Destino</div>
              <h1 style={{ margin: '0 0 1.5rem 0', fontSize: '2.5rem', fontWeight: '800', lineHeight: 1.1 }}>{selectedPoi.name}</h1>
              <p style={{ lineHeight: '1.8', color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>{selectedPoi.description}</p>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                {selectedPoi.website_url && (
                  <a href={selectedPoi.website_url} target="_blank" rel="noreferrer" style={{ background: 'var(--primary)', color: 'white', padding: '1rem 2rem', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }}>
                    🌐 Ver Web / Reservas
                  </a>
                )}
                <div style={{ padding: '1rem 1.5rem', background: '#f1f5f9', borderRadius: '12px', fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>
                  📍 {selectedPoi.latitude?.toFixed(4)}, {selectedPoi.longitude?.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '1.1rem' }}>
            Selecciona un lugar a la izquierda para ver su información
          </div>
        )}
      </div>

      {/* COLUMNA 3: DIARIO (SISTEMA TRELLO OPTIMIZADO) */}
      <div className="col-planner" style={{ width: '380px', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <header style={{ padding: '1.5rem', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <button onClick={() => setCurrentDayIdx(prev => Math.max(0, prev - 1))} style={{ border: 'none', background: '#eff6ff', color: 'var(--primary)', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}>←</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--primary)' }}>Planificador Diario</div>
              <h3 style={{ margin: 0 }}>{currentDay?.title}</h3>
            </div>
            <button onClick={() => setCurrentDayIdx(prev => Math.min(trip.days.length - 1, prev + 1))} style={{ border: 'none', background: '#eff6ff', color: 'var(--primary)', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}>→</button>
          </div>
        </header>

        <div className="planner-scroll" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          
          <div style={{ marginBottom: '2.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: '0.8rem' }}>Base del Día (Hotel/Restaurante)</label>
            <div onDragOver={e => e.preventDefault()}
                 onDrop={e => handleMovePoi(parseInt(e.dataTransfer.getData('poiId')), currentDay.id, true)}
                 style={{ 
                   padding: '1.5rem', background: 'white', borderRadius: '20px', 
                   border: currentDay.accommodation ? '2px solid #e2e8f0' : '2px dashed #cbd5e1',
                   boxShadow: currentDay.accommodation ? '0 10px 25px rgba(0,0,0,0.05)' : 'none'
                 }}>
              {currentDay.accommodation ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <div style={{ fontSize: '1.5rem' }}>🏨</div>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{currentDay.accommodation.name}</div>
                     <button onClick={() => handleMovePoi(currentDay.accommodation!.id, null, true)} style={{ border: 'none', background: 'none', padding: 0, color: 'var(--primary)', fontSize: '0.7rem', fontWeight: '700', cursor: 'pointer' }}>Quitar Base</button>
                   </div>
                   {currentDay.accommodation.website_url && <a href={currentDay.accommodation.website_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', fontSize: '1.2rem' }}>🔗</a>}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Suelta aquí tu hotel para este día</div>
              )}
            </div>
          </div>

          <div 
             onDragOver={e => e.preventDefault()}
             onDrop={e => handleMovePoi(parseInt(e.dataTransfer.getData('poiId')), currentDay.id)}
             style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#94a3b8' }}>Itinerario de Visitas</label>
            {currentDay.pois.length > 0 ? (
              currentDay.pois.map((dp, idx) => (
                <div key={dp.id} className="itinerary-item" style={{ background: 'white', padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div style={{ width: '28px', height: '28px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '800' }}>{idx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{dp.poi.name}</div>
                  </div>
                  <button onClick={() => handleMovePoi(dp.poi.id, null)} style={{ border: 'none', background: '#f1f5f9', color: '#94a3b8', width: '24px', height: '24px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.6rem' }}>✕</button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '2px dashed #e2e8f0', borderRadius: '20px', color: '#cbd5e1', fontSize: '0.9rem' }}>
                No hay actividades planificadas.<br/>Arrastra sitios desde la izquierda.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default TripDetail;
