import './App.css';

function App() {
  return (
    <div className="app-container">
      <header>
        <nav className="top-nav">
          <button className="btn-primary">Iniciar Sesión</button>
        </nav>
      </header>

      <main>
        <div className="hero-section">
          <div className="hero-logo-container">
            <img src="/logo.png" alt="vIAjar Logo" className="hero-logo" />
          </div>
          
          <div className="hero-content">
            <h1 className="hero-title">
              Tus viajes, <br />
              <span className="text-gradient">diseñados por IA</span>
            </h1>
            
            <p className="hero-subtitle">
              Genera guías de viaje completas estilo revista, descubre puntos de interés ocultos 
              y planifica tus rutas día a día de forma completamente automática.
            </p>

            <button className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem', marginTop: '1rem' }}>
              Crear Nuevo Viaje
            </button>
          </div>
        </div>

        <div className="action-cards">
          <div className="card glass-panel">
            <h3 className="text-gradient">🤖 Generación IA</h3>
            <p>Conecta tus API Keys de Gemini, Groq o Tavily para obtener descripciones ricas y precisas de cada destino.</p>
          </div>
          
          <div className="card glass-panel">
            <h3 className="text-gradient">🗺️ Mapas y Rutas</h3>
            <p>Visualiza cada día de tu itinerario en mapas interactivos y optimiza los tiempos de desplazamiento.</p>
          </div>

          <div className="card glass-panel">
            <h3 className="text-gradient">📄 Exportación Premium</h3>
            <p>Convierte tu itinerario en un PDF con formato de revista profesional, listo para imprimir o llevar en tu móvil.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
