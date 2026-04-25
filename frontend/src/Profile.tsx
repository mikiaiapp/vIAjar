import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Profile() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [qrLoaded, setQrLoaded] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Error al cargar perfil');
      const data = await response.json();
      setUser(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch(`/api/auth/2fa/verify?code=${totpCode}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Código inválido');
      setSuccess('2FA habilitado correctamente');
      fetchUserData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!user) return <div className="app-container">Cargando...</div>;

  return (
    <div className="app-container">
      <div className="card glass-panel" style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
        <h2 className="text-gradient" style={{ marginBottom: '2rem' }}>Configuración de Usuario</h2>
        
        {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
        {success && <div style={{ color: 'green', marginBottom: '1rem' }}>{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h3>Datos Personales</h3>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Nombre:</strong> {user.full_name || 'No configurado'}</p>
            
            <h3 style={{ marginTop: '2rem' }}>Seguridad 2FA</h3>
            {user.is_2fa_enabled ? (
              <p style={{ color: 'green' }}>✅ Autenticación en dos pasos activada</p>
            ) : (
              <div>
                <p>Protege tu cuenta con Google Authenticator</p>
                <button onClick={() => setQrLoaded(true)} className="btn-primary" style={{ marginBottom: '1rem' }}>
                  Configurar 2FA
                </button>
                
                {qrLoaded && (
                  <div style={{ textAlign: 'center' }}>
                    <p>Escanea este código QR:</p>
                    <img src={`/api/auth/2fa/setup?t=${Date.now()}`} alt="QR 2FA" style={{ border: '10px solid white', borderRadius: '10px' }} />
                    <form onSubmit={handleVerify2FA} style={{ marginTop: '1rem' }}>
                      <input 
                        type="text" 
                        placeholder="Código de 6 dígitos" 
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}
                      />
                      <button type="submit" className="btn-primary" style={{ width: '100%' }}>Verificar y Activar</button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
             <h3>Mis API Keys (IA)</h3>
             <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Configura tus propias claves para generar el contenido.</p>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <label>Gemini API Key
                  <input type="password" value={user.gemini_api_key || ''} readOnly style={{ width: '100%', padding: '0.5rem', opacity: 0.7 }} />
                </label>
                <label>Groq API Key
                  <input type="password" value={user.groq_api_key || ''} readOnly style={{ width: '100%', padding: '0.5rem', opacity: 0.7 }} />
                </label>
                <p style={{ fontSize: '0.75rem' }}>* Próximamente podrás editarlas desde aquí.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
