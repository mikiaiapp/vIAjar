import json
import time
from sqlalchemy.orm import Session
from .. import models
from tavily import TavilyClient
from groq import Groq
import google.generativeai as genai

def add_log(db: Session, trip_id: int, message: str, level: str = "info"):
    log = models.TripLog(trip_id=trip_id, message=message, level=level)
    db.add(log)
    db.commit()

def orchestrate_trip_generation(db: Session, trip_id: int):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        return
    
    user = trip.owner
    if not user.tavily_api_key or not user.groq_api_key or not user.gemini_api_key:
        add_log(db, trip.id, "Faltan claves de API en el perfil del usuario (Tavily, Groq o Gemini). Configúralas primero.", "error")
        trip.status = "error"
        db.commit()
        return

    # Calculate duration
    duration = (trip.end_date - trip.start_date).days + 1
    if duration <= 0:
        duration = 1

    try:
        # FASE 1: EXTRACTION (Tavily) - Búsquedas múltiples para evitar sesgos
        target_pois = max(40, duration * 5) 
        add_log(db, trip.id, f"TAVILY AI: Iniciando rastreo profundo de Atractivos, Hoteles y Restaurantes...")
        
        tavily_client = TavilyClient(api_key=user.tavily_api_key)
        all_raw_results = []
        
        queries = [
            f"Best tourist attractions, monuments and secret spots in {trip.destination}",
            f"Top rated hotels and accommodations in {trip.destination} for travelers",
            f"Best restaurants and culinary experiences in {trip.destination}"
        ]

        for q in queries:
            try:
                resp = tavily_client.search(query=q, search_depth="advanced", max_results=target_pois // 2, include_images=True)
                all_raw_results.extend(resp.get("results", []))
            except: pass

        if not all_raw_results:
            raise Exception("No se han podido localizar puntos de interés. Revisa tu clave de Tavily.")

        add_log(db, trip.id, f"TAVILY AI: Rastreo finalizado. {len(all_raw_results)} candidatos encontrados.", "success")

        # FASE DE SÍNTESIS (Gemini) - Procesamiento por bloques para NO perder datos
        add_log(db, trip.id, "GEMINI AI: Documentando puntos de interés y calculando coordenadas...")
        genai.configure(api_key=user.gemini_api_key)
        
        model = genai.GenerativeModel("models/gemini-1.5-flash")
        
        # Dividir resultados en bloques de 20 para que Gemini no se sature y los "tire"
        chunk_size = 20
        all_processed_pois = []

        for i in range(0, len(all_raw_results), chunk_size):
            chunk = all_raw_results[i:i + chunk_size]
            context = [{"title": p.get("title"), "snippet": p.get("content"), "url": p.get("url")} for p in chunk]
            
            prompt = f"""
            Eres un experto en viajes. Analiza este BLOQUE de {len(chunk)} candidatos para el destino {trip.destination}.
            Para CADA UNO sin excepción, genera un objeto JSON.
            Si el lugar parece ser un HOTEL, marca category='hotel'. Si es RESTAURANTE, category='restaurant'. Si es una ATRECCIÓN, category='attraction'.
            Necesito NOMBRE real, DESCRIPCIÓN completa (5-6 líneas), WEBSITE estimado (Booking/TripAdvisor o su web oficial), y COORDENADAS exactas (lat, lng).
            
            JSON FORMAT:
            {{ "pois": [ {{ "name": "...", "description": "...", "category": "...", "website_url": "...", "lat": 0.0, "lng": 0.0 }} ] }}
            
            DATA: {json.dumps(context)}
            """
            
            try:
                resp = model.generate_content(prompt)
                txt = resp.text.strip()
                if "```json" in txt: txt = txt.split("```json")[-1].split("```")[0].strip()
                elif "```" in txt: txt = txt.split("```")[1].strip()
                
                data = json.loads(txt)
                all_processed_pois.extend(data.get("pois", []))
                add_log(db, trip.id, f"Progreso IA: {len(all_processed_pois)} / {len(all_raw_results)} procesados...")
            except: continue

        # PERSISTENCIA
        for p in all_processed_pois:
            db_poi = models.POI(
                trip_id=trip.id,
                name=p.get("name"),
                description=p.get("description"),
                category=p.get("category", "attraction"),
                latitude=p.get("lat"),
                longitude=p.get("lng"),
                website_url=p.get("website_url"),
                image_url="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1", # Usamos fallback por ahora o intentar mapear de tavily
                original_source="Phase 1: Discovery"
            )
            db.add(db_poi)
        
        # CREAR DÍAS VACÍOS
        import datetime
        delta = trip.end_date - trip.start_date
        for i in range(delta.days + 1):
            curr = trip.start_date + datetime.timedelta(days=i)
            db.add(models.Day(trip_id=trip.id, date=curr, title=f"Día {i+1}: {curr.strftime('%d/%m')}", order=i + 1))

        db.commit()
                
        trip.status = "completed"
        add_log(db, trip.id, f"¡Fase 1 terminada! Se han descubierto {len(all_processed_pois)} lugares. Ahora puedes organizarlos a tu gusto.", "success")
        db.commit()

    except Exception as e:
        trip.status = "error"
        add_log(db, trip.id, f"Error en Fase 1: {str(e)}", "error")
        db.commit()
