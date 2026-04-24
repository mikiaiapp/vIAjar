# vIAjar 🌍🤖

vIAjar (un juego de palabras entre "Viajar" e "IA") es una aplicación web full-stack diseñada para generar, gestionar y exportar guías de viaje detalladas y visuales de forma completamente automática mediante Inteligencia Artificial.

## 🧱 Arquitectura y Stack Tecnológico

- **Backend:** Python + FastAPI
- **Frontend:** React (Vite) + Vanilla CSS (Diseño Premium Glassmorphism)
- **Base de Datos:** PostgreSQL
- **Caché y Tareas en Segundo Plano:** Redis + Celery
- **Despliegue:** Docker Compose (Optimizado para Synology NAS)

## 🚀 Despliegue en Synology NAS mediante Portainer (por URL)

Este proyecto está preparado para desplegarse de manera automática usando la funcionalidad de **Stacks** de Portainer conectada directamente a este repositorio de GitHub.

### Requisitos Previos en el Synology NAS
1. Tener instalado **Docker** (Container Manager).
2. Tener instalado **Portainer**.
3. Tener los puertos **7070** (Frontend) y **7071** (Opcional, API Backend) libres y mapeados adecuadamente si utilizas un proxy inverso.

### Pasos para desplegar

1. Abre tu panel de **Portainer**.
2. Dirígete a la sección **Stacks** en el menú lateral izquierdo.
3. Haz clic en el botón azul **+ Add stack** (Añadir stack).
4. Dale un nombre a tu stack, por ejemplo: `viajar-app`.
5. En la sección **Build method** (Método de construcción), selecciona **Repository**.
6. Rellena los campos con la siguiente información:
   - **Repository URL:** `https://github.com/mikiaiapp/vIAjar`
   - **Repository reference:** `refs/heads/main` (o dejar por defecto).
   - **Compose path:** `docker-compose.yml`
7. (Opcional pero Recomendado) Activa **Automatic updates** (GitOps) para que Portainer actualice los contenedores automáticamente si subimos nuevo código a GitHub.
8. En la sección **Environment variables** (Variables de entorno), haz clic en **Load variables from .env file** si Portainer lo soporta, o haz clic en **Add environment variable** e introduce manualmente las claves necesarias descritas en el archivo `.env.template` (ej. `POSTGRES_USER`, `POSTGRES_PASSWORD`, etc.).
9. Haz clic en el botón **Deploy the stack** al final de la página.

Portainer descargará el repositorio, construirá las imágenes Docker locales (Frontend y Backend) e iniciará todos los contenedores (`db`, `redis`, `backend`, `worker`, `frontend`).

Una vez terminado, podrás acceder a la aplicación web a través de la IP de tu Synology NAS en el puerto `7070`. (Ejemplo: `http://192.168.1.100:7070`). La documentación de la API estará en el puerto `7071` (`http://192.168.1.100:7071/docs`).

## ⚙️ Desarrollo Local

1. Clona el repositorio:
   ```bash
   git clone https://github.com/mikiaiapp/vIAjar.git
   cd vIAjar
   ```
2. Copia el archivo `.env.template` a `.env` y rellena las variables:
   ```bash
   cp .env.template .env
   ```
3. Levanta los contenedores:
   ```bash
   docker-compose up -d --build
   ```

## 🗺️ Características del MVP

- Autenticación segura de usuarios (JWT).
- Planificador de itinerarios Drag & Drop (Estilo Trello/Notion).
- Generación automática de Puntos de Interés (POIs) combinando Tavily (Búsqueda web) y LLMs (Gemini, Groq) con sistema de fallback.
- Visualización de rutas en mapa (Leaflet + OpenStreetMap).
- Exportación en formato PDF estilo revista.
