import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Profile() {
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [qrLoaded, setQrLoaded] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const [isEditingKeys, setIsEditingKeys] = useState(false);
  const [keysForm, setKeysForm] = useState({ gemini_api_key: '', groq_api_key: '', tavily_api_key: '' });

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
      setKeysForm({
        gemini_api_key: data.gemini_api_key || '',
        groq_api_key: data.groq_api_key || '',
        tavily_api_key: data.tavily_api_key || ''
      });
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

  const handleSaveKeys = async () => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('/api/auth/keys', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(keysForm)
      });
      if (!response.ok) throw new Error('Error al guardar API Keys');
      setSuccess('API Keys guardadas correctamente');
      setIsEditingKeys(false);
      fetchUserData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (error) {
    return (
      <div className="app-container" style={{ textAlign: 'center', marginTop: '4rem' }}>
        <h2 style={{ color: 'red' }}>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/login')} className="btn-primary" style={{ marginTop: '1rem' }}>Volver al Login</button>
      </div>
    );
  }

  if (!user) return <div className="app-container">Cargando perfil...</div>;

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <Link to="/">
          <img src="/logo.png" alt="vIAjar Logo" style={{ height: '50px' }} />
        </Link>
        <Link to="/">
           <button className="btn-primary" style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)' }}>← Volver</button>
        </Link>
      </header>

      <div className="card glass-panel" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <h2 className="text-gradient" style={{ marginBottom: '2rem' }}>Configuración de Usuario</h2>
        
        {success && <div style={{ color: 'green', marginBottom: '1rem' }}>{success}</div>}

        <div className="profile-grid">
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
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3>Mis API Keys (IA)</h3>
               <button onClick={() => isEditingKeys ? handleSaveKeys() : setIsEditingKeys(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                 {isEditingKeys ? 'Guardar' : 'Editar'}
               </button>
             </div>
             <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Configura tus propias claves para generar el contenido.</p>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gemini API Key</span>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>Obtener clave ↗</a>
                </label>
                <input 
                  type={isEditingKeys ? "text" : "password"} 
                  value={keysForm.gemini_api_key} 
                  onChange={e => setKeysForm({...keysForm, gemini_api_key: e.target.value})}
                  readOnly={!isEditingKeys} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', opacity: isEditingKeys ? 1 : 0.7 }} 
                />

                <label style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span>Groq API Key</span>
                  <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>Obtener clave ↗</a>
                </label>
                <input 
                  type={isEditingKeys ? "text" : "password"} 
                  value={keysForm.groq_api_key} 
                  onChange={e => setKeysForm({...keysForm, groq_api_key: e.target.value})}
                  readOnly={!isEditingKeys} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', opacity: isEditingKeys ? 1 : 0.7 }} 
                />

                <label style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span>Tavily API Key (Búsquedas Web)</span>
                  <a href="https://app.tavily.com/home" target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>Obtener clave ↗</a>
                </label>
                <input 
                  type={isEditingKeys ? "text" : "password"} 
                  value={keysForm.tavily_api_key} 
                  onChange={e => setKeysForm({...keysForm, tavily_api_key: e.target.value})}
                  readOnly={!isEditingKeys} 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)', opacity: isEditingKeys ? 1 : 0.7 }} 
                />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
