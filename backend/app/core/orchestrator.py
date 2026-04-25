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
        # FASE 1: EXTRACTION (Tavily)
        target_pois = max(20, duration * 4) # Más ambicioso: 4 por día, mínimo 20
        add_log(db, trip.id, f"TAVILY AI: Buscando los ~{target_pois} mejores lugares en {trip.destination}...")
        
        tavily_client = TavilyClient(api_key=user.tavily_api_key)
        try:
            tavily_resp = tavily_client.search(
                query=f"Most interesting places to visit, monuments, hidden gems and best attractions in {trip.destination}. Be exhaustive.",
                search_depth="advanced",
                include_images=True,
                max_results=target_pois
            )
        except:
            tavily_resp = tavily_client.search(
                query=f"puntos de interés {trip.destination}",
                search_depth="basic",
                max_results=target_pois
            )
        
        pois_data = tavily_resp.get("results", [])
        if not pois_data:
            raise Exception("No se encontraron resultados en Tavily.")

        add_log(db, trip.id, f"TAVILY AI: ¡{len(pois_data)} POIs localizados! Refinando con IA...", "success")


        # FASE DE SÍNTESIS (Gemini) - Sin agrupar por días aún
        add_log(db, trip.id, "GEMINI AI: Redactando descripciones inmersivas y validando imágenes...")
        
        genai.configure(api_key=user.gemini_api_key)
        
        # Filtro de modelos dinámico
        available_gemini_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                name = m.name.lower()
                if "tts" not in name and "embed" not in name and "search" not in name:
                    available_gemini_models.append(m.name)
        
        target_gemini = "models/gemini-1.5-flash"
        if target_gemini not in available_gemini_models:
            target_gemini = available_gemini_models[0] if available_gemini_models else "models/gemini-1.5-flash"

        model = genai.GenerativeModel(target_gemini)
        
        # Limpiar datos para el prompt
        raw_context = [{"title": p.get("title"), "snippet": p.get("content"), "url": p.get("url")} for p in pois_data]
        
        gemini_prompt = f"""
        Actúa como un guía de viajes experto y con mucha clase (estilo lifestyle italiano). 
        Toma esta lista de puntos de interés: {json.dumps(raw_context)}.
        
        Genera un catálogo de estos lugares. Para cada lugar, escribe una descripción cautivadora (máximo 4 líneas) y adjudica si puedes una descripción de por qué es un "Must-Visit".
        Devuelve ÚNICAMENTE un JSON con esta estructura:
        {{
            "pois": [
                {{
                    "name": "Nombre Real",
                    "description": "Tu descripción cautivadora",
                    "image_url": "puedes inventar una de unsplash relacionada si no tienes la real de tavily"
                }}
            ]
        }}
        """
        
        gemini_resp = model.generate_content(gemini_prompt)
        gemini_text = gemini_resp.text.strip()
        if "```json" in gemini_text: gemini_text = gemini_text.split("```json")[-1].split("```")[0].strip()
        elif "```" in gemini_text: gemini_text = gemini_text.split("```")[1].strip()
            
        final_results = json.loads(gemini_text)
        
        # PERSISTENCIA: Todo va al backlog (available_pois)
        for poi_data in final_results.get("pois", []):
            db_poi = models.POI(
                trip_id=trip.id,
                name=poi_data.get("name"),
                description=poi_data.get("description"),
                image_url=poi_data.get("image_url", "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1"),
                original_source="Phase 1: Discovery"
            )
            db.add(db_poi)
        
        # CREAR DÍAS VACÍOS PARA EL TABLERO TRELLO
        import datetime
        delta = trip.end_date - trip.start_date
        for i in range(delta.days + 1):
            current_date = trip.start_date + datetime.timedelta(days=i)
            db_day = models.Day(
                trip_id=trip.id,
                date=current_date,
                title=f"Día {i+1}: {current_date.strftime('%d/%m')}",
                order=i + 1
            )
            db.add(db_day)

        db.commit()
                
        trip.status = "completed"
        add_log(db, trip.id, f"¡Fase 1 terminada! Se han descubierto {len(final_results['pois'])} lugares. Ahora puedes organizarlos a tu gusto.", "success")
        db.commit()

    except Exception as e:
        trip.status = "error"
        add_log(db, trip.id, f"Error en Fase 1: {str(e)}", "error")
        db.commit()
