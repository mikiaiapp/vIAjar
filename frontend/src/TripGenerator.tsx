import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

function TripGenerator() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchTripDetails();
    const interval = setInterval(() => {
      fetchLogs();
      fetchTripDetails();
    }, 2000);
    return () => clearInterval(interval);
  }, [tripId]);

  const fetchTripDetails = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/trips/${tripId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setTrip(await res.json());
    } catch {}
  };

  const fetchLogs = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`/api/trips/${tripId}/logs`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch {}
  };

  const getLogColor = (level: string) => {
    if (level === 'error') return '#ff4d4f';
    if (level === 'success') return '#52c41a';
    if (level === 'warning') return '#faad14';
    return '#1890ff';
  };

  return (
    <div className="app-container" style={{ padding: 0 }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 className="text-gradient" style={{ marginBottom: '1rem', fontSize: '2rem' }}>
          Analizando {trip?.destination || 'destino'}...
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          La inteligencia artificial está estructurando el itinerario. Este proceso puede tardar un minuto.
        </p>

        <div className="card glass-panel" style={{ width: '100%', background: 'rgba(10, 15, 30, 0.95)', padding: '1.5rem', fontFamily: 'monospace', color: '#00ff41', minHeight: '300px', borderRadius: '12px' }}>
          
          <div style={{ paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f' }} />
            <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: '1rem' }}>vIAjar Core System - Log Stream</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {logs.length === 0 ? (
              <div style={{ color: '#00ff41', opacity: 0.5 }}>Conectando con el motor AI...</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} style={{ color: getLogColor(log.level), display: 'flex', gap: '1rem' }}>
                  <span style={{ opacity: 0.5 }}>[{new Date().toLocaleTimeString()}]</span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
            
            {trip?.status === 'planning' && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                 <span style={{ opacity: 0.5 }}>[{new Date().toLocaleTimeString()}]</span>
                 <span className="blinking-cursor">Generando... _</span>
              </div>
            )}
          </div>
        </div>

        {trip?.status === 'completed' && (
           <div style={{ marginTop: '2rem', textAlign: 'center' }}>
             <button onClick={() => navigate(`/trip/${tripId}`)} className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.2rem', boxShadow: '0 8px 32px rgba(2, 136, 209, 0.4)' }}>
               ⭐ ¡Ver Itinerario Terminado!
             </button>
           </div>
        )}
      </div>

      <style>{`
        .blinking-cursor {
          animation: blink 1s step-end infinite;
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default TripGenerator;
