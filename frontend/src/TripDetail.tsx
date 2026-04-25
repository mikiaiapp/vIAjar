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
  status?: string;
  category?: string;
  website_url?: string;
}

interface Day {
  id: number;
  title: string;
  order: number;
  accommodation?: POI | null;
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

export default function TripDetail() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [currentDayIdx, setCurrentDayIdx] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'assigned' | 'discarded'>('pending');
  
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const fetchTrip = async () => {
    if (!tripId) return;
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrip(data);
        if (data.available_pois && data.available_pois.length > 0 && !selectedPoi) {
          const firstPending = data.available_pois.find((p:any) => (p.status || 'pending') === 'pending');
          setSelectedPoi(firstPending || data.available_pois[0]);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTrip(); }, [tripId]);

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

        const coords: any[] = [];
        const allPois = [...(trip.available_pois || [])];

        allPois.forEach(poi => {
            if (typeof poi.latitude === 'number' && typeof poi.longitude === 'number') {
                let color = '#4f46e5'; 
                if (poi.status === 'assigned') color = '#10b981';
                if (poi.status === 'discarded') color = '#ef4444';
                
                const icon = L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="background-color:${color}; width:14px; height:14px; border-radius:50%; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.4)"></div>`,
                  iconSize: [14, 14],
                  iconAnchor: [7, 7]
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
        } else if (selectedPoi && typeof selectedPoi.latitude === 'number' && typeof selectedPoi.longitude === 'number') {
            mapRef.current.setView([selectedPoi.latitude, selectedPoi.longitude], 13);
        }
    }
  }, [showMap, trip, selectedPoi]);

  const handleStatusUpdate = async (poiId: number, newStatus: string) => {
    if (!tripId) return;
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/trips/${tripId}/poi/${poiId}/status?status=${newStatus}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTrip();
    } catch (e) { console.error(e); }
  };

  const handleMovePoi = async (poiId: number, dayId: number | null, isAccommodation: boolean = false) => {
    if (!tripId) return;
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/trips/${tripId}/move-poi?poi_id=${poiId}${dayId !== null ? `&day_id=${dayId}` : ''}${isAccommodation ? '&is_accommodation=true' : ''}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTrip();
    } catch (e) { console.error(e); }
  };

  const handleSearch = async (query: string) => {
    if (!tripId) return;
    if (!query) return;
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/trips/${tripId}/search-poi?query=${encodeURIComponent(query)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTrip();
    } catch (e) { console.error(e); }
  };

  const handleExport = async (format: string) => {
    if (!tripId) return;
    const token = localStorage.getItem('access_token');
    const res = await fetch(`/api/trips/${tripId}/export?format=${format}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok && trip) {
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `viajar_${trip.title}.${format}`;
      a.click();
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let data: any[] = [];
    if (file.name.endsWith('.kml')) {
      const parser = new DOMParser();
      const kml = parser.parseFromString(text, "text/xml");
      const placemarks = kml.getElementsByTagName("Placemark");
      for (let i = 0; i < placemarks.length; i++) {
        const name = placemarks[i].getElementsByTagName("name")[0]?.textContent;
        const coords = placemarks[i].getElementsByTagName("coordinates")[0]?.textContent?.split(",");
        if (name && coords) {
          data.push({ 
            name: name || "Lugar sin nombre", 
            lng: parseFloat(coords[0]), 
            lat: parseFloat(coords[1]), 
            category: 'attraction',
            description: 'Importado desde KML',
            image_url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'
          });
        }
      }
    } else if (file.name.endsWith('.csv')) {
      const lines = text.split('\n').filter(l => l.trim());
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',');
        if (vals[0]) {
          data.push({ 
            name: vals[0], 
            lat: parseFloat(vals[3]), 
            lng: parseFloat(vals[4]), 
            category: vals[2] || 'attraction',
            description: 'Importado desde CSV',
            image_url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'
          });
        }
      }
    } else {
      data = JSON.parse(text);
    }
    const token = localStorage.getItem('access_token');
    if (!tripId) return;
    await fetch(`/api/trips/${tripId}/import`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    fetchTrip();
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', background: 'white', height: '100vh' }}><h3>Cargando tu próxima aventura...</h3></div>;
  if (!trip) return <div style={{ padding: '4rem', textAlign: 'center' }}>Viaje no encontrado</div>;

  const currentDay = trip.days[currentDayIdx];
  if (!currentDay) return <div style={{ padding: '4rem', textAlign: 'center' }}>Día no encontrado</div>;
  
  const filteredPois = trip.available_pois?.filter(p => (p.status || 'pending') === filterStatus) || [];

  return (
    <div className="trip-engine-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f4f7f9' }}>
      
      {/* BARRA SUPERIOR: BUSCADOR Y EXPORT */}
      <div className="top-bar" style={{ padding: '0.8rem 2rem', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: '2rem', alignItems: 'center', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
           <span style={{ fontSize: '1.2rem' }}>🏠</span>
        </div>
        
        <div style={{ flex: 1, position: 'relative' }}>
          <input 
            type="text" 
            placeholder="🔍 Busca hoteles, restaurantes o monumentos adicionales..." 
            onKeyDown={e => e.key === 'Enter' && handleSearch((e.target as HTMLInputElement).value)}
            style={{ width: '100%', padding: '0.8rem 1.5rem', borderRadius: '30px', border: '1px solid #e2e8f0', background: '#f8fafc', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => handleExport('json')} className="btn-mini">JSON</button>
          <button onClick={() => handleExport('csv')} className="btn-mini">CSV</button>
          <button onClick={() => handleExport('kml')} className="btn-mini">KML</button>
          <div style={{ borderLeft: '1px solid #ddd', margin: '0 0.5rem' }}></div>
          <label className="btn-mini" style={{ background: 'var(--primary)', color: 'white', display: 'inline-block', cursor: 'pointer' }}>
            ➕ Importar
            <input type="file" onChange={handleImportFile} style={{ display: 'none' }} accept=".kml,.json,.csv" />
          </label>
        </div>
      </div>

      <div className="trip-engine" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      
      {/* COLUMNA 1: DESCUBRIMIENTOS */}
      <div className="col-discovery" style={{ width: '350px', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(0,0,0,0.05)', background: 'white' }}>
        <header style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'white' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', marginBottom: '1rem' }}>
              <button onClick={() => setFilterStatus('pending')} style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', background: filterStatus === 'pending' ? 'white' : 'transparent', boxShadow: filterStatus === 'pending' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none', color: filterStatus === 'pending' ? 'var(--primary)' : '#64748b', cursor: 'pointer' }}>Pendientes</button>
              <button onClick={() => setFilterStatus('assigned')} style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', background: filterStatus === 'assigned' ? 'white' : 'transparent', boxShadow: filterStatus === 'assigned' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none', color: filterStatus === 'assigned' ? '#10b981' : '#64748b', cursor: 'pointer' }}>Asignados</button>
              <button onClick={() => setFilterStatus('discarded')} style={{ flex: 1, padding: '0.5rem', border: 'none', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', background: filterStatus === 'discarded' ? 'white' : 'transparent', boxShadow: filterStatus === 'discarded' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none', color: '#ef4444', cursor: 'pointer' }}>Descartados</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', color: '#94a3b8' }}>Descubrimientos</h2>
            <button onClick={() => setShowMap(!showMap)} style={{ border: 'none', background: 'none', color: 'var(--primary)', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}>
              {showMap ? '📋 Lista' : '🗺️ Mapa'}
            </button>
          </div>
        </header>

        <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '1rem', position: 'relative' }}>
          {showMap ? (
            <div id="map-detail-container" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}></div>
          ) : (
            <div className="vertical-carousel" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {filteredPois.map(poi => (
                <div key={poi.id} 
                     draggable 
                     onDragStart={e => e.dataTransfer.setData('poiId', poi.id.toString())}
                     onClick={() => setSelectedPoi(poi)}
                     style={{ 
                       height: '180px', 
                       borderRadius: '16px', 
                       overflow: 'hidden', 
                       position: 'relative', 
                       cursor: 'pointer',
                       transition: 'transform 0.2s',
                       border: selectedPoi?.id === poi.id ? '4px solid var(--primary)' : '1px solid #eee',
                       boxShadow: selectedPoi?.id === poi.id ? '0 8px 24px rgba(0,0,0,0.12)' : 'none',
                       opacity: poi.status === 'discarded' ? 0.6 : 1
                     }}>
                  <img src={poi.image_url} onError={(e:any)=>e.target.src='https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={poi.name} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', color: 'white' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{poi.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COLUMNA 2: DETALLES */}
      <div className="col-details" style={{ flex: 1, background: 'white', display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
        {selectedPoi ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ height: '350px', width: '100%', position: 'relative' }}>
              <img src={selectedPoi.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={selectedPoi.name} />
              <div style={{ position: 'absolute', bottom: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                   {selectedPoi.status !== 'discarded' && <button onClick={() => handleStatusUpdate(selectedPoi.id, 'discarded')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)' }}>❌ Descartar</button>}
                   {selectedPoi.status === 'discarded' && <button onClick={() => handleStatusUpdate(selectedPoi.id, 'pending')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: '700', fontSize: '0.75rem', cursor: 'pointer' }}>🔄 Recuperar</button>}
              </div>
              <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'var(--primary)', color: 'white', padding: '0.5rem 1.2rem', borderRadius: '30px', fontSize: '0.75rem', fontWeight: '700' }}>
                 {selectedPoi.category?.toUpperCase()}
              </div>
            </div>
            <div style={{ padding: '3rem', flex: 1, overflowY: 'auto' }}>
              <h1 style={{ margin: '0 0 1.5rem 0', fontSize: '2.5rem', fontWeight: '800' }}>{selectedPoi.name}</h1>
              <p style={{ lineHeight: '1.8', color: '#64748b', fontSize: '1.1rem' }}>{selectedPoi.description}</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                {selectedPoi.website_url && <a href={selectedPoi.website_url} target="_blank" rel="noreferrer" style={{ background: 'var(--primary)', color: 'white', padding: '1rem 2rem', borderRadius: '12px', fontWeight: '600', textDecoration: 'none' }}>🌐 Web</a>}
                <div style={{ padding: '1rem 1.5rem', background: '#f1f5f9', borderRadius: '12px', fontSize: '0.9rem', color: '#475569' }}>📍 {selectedPoi.latitude?.toFixed(4)}, {selectedPoi.longitude?.toFixed(4)}</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>Selecciona un lugar</div>
        )}
      </div>

      {/* COLUMNA 3: PLANIFICADOR */}
      <div className="col-planner" style={{ width: '380px', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
        <header style={{ padding: '1.5rem', background: 'white', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => setCurrentDayIdx(prev => Math.max(0, prev - 1))} className="btn-circle">{'<'}</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)' }}>PLANIFICADOR</div>
            <h3 style={{ margin: 0 }}>{currentDay.title}</h3>
          </div>
          <button onClick={() => setCurrentDayIdx(prev => Math.min(trip.days.length - 1, prev + 1))} className="btn-circle">{'>'}</button>
        </header>

        <div className="planner-scroll" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>BASE DEL DÍA</label>
            <div onDragOver={e => e.preventDefault()} onDrop={e => handleMovePoi(parseInt(e.dataTransfer.getData('poiId')), currentDay.id, true)} style={{ padding: '1.5rem', background: 'white', borderRadius: '20px', border: currentDay.accommodation ? '2px solid #e2e8f0' : '2px dashed #cbd5e1' }}>
              {currentDay.accommodation ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '1.5rem' }}>🏨</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700' }}>{currentDay.accommodation.name}</div>
                    <button onClick={() => handleMovePoi(currentDay.accommodation?.id || 0, null, true)} style={{ color: 'var(--primary)', border: 'none', background: 'none', fontSize: '0.7rem', cursor: 'pointer' }}>Quitar</button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8' }}>Arrastra el hotel aquí</div>
              )}
            </div>
          </div>

          <div onDragOver={e => e.preventDefault()} onDrop={e => handleMovePoi(parseInt(e.dataTransfer.getData('poiId')), currentDay.id)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#94a3b8' }}>ITINERARIO</label>
            {currentDay.pois.map((dp, idx) => (
              <div key={dp.id} style={{ background: 'white', padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <div style={{ width: '24px', height: '24px', background: 'var(--primary)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>{idx + 1}</div>
                <div style={{ flex: 1, fontWeight: '600', fontSize: '0.9rem' }}>{dp.poi.name}</div>
                <button onClick={() => handleMovePoi(dp.poi.id, null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
            {currentDay.pois.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#cbd5e1' }}>Vacío</div>}
          </div>
        </div>
      </div>

      </div> {/* Final trip-engine */}
    </div> 
  );
}
