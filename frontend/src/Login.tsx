import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        let errMessage = 'Error del servidor (probablemente esté reiniciándose)';
        try {
          const data = await response.json();
          errMessage = data.detail || 'Error de autenticación';
        } catch (parseErr) {
          console.error('El servidor no devolvió JSON:', parseErr);
        }
        throw new Error(errMessage);
      }
      
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      
      // TODO: Redirigir al dashboard / panel principal
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="card glass-panel" style={{ width: '100%', maxWidth: '400px', margin: '4rem auto' }}>
        <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '2rem' }}>Iniciar Sesión</h2>
        
        {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Correo Electrónico</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Contraseña</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
            Entrar
          </button>
        </form>
        
        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
          ¿No tienes cuenta? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Regístrate</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
