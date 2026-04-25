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
        add_log(db, trip.id, f"TAVILY AI: Extrayendo Puntos de Interés (POI) relevantes en {trip.destination}...")
        
        tavily_client = TavilyClient(api_key=user.tavily_api_key)
        tavily_resp = tavily_client.search(
            query=f"Best tourist points of interest and attractions in {trip.destination}. Return specific places, descriptions, and location details.",
            search_depth="advanced",
            include_images=True,
            include_raw_content=False,
            max_results=30
        )
        
        pois_data = tavily_resp.get("results", [])
        if not pois_data:
            raise Exception("Tavily no devolvió ningún resultado.")
            
        # Clean up data specifically for Groq
        raw_pois_string = json.dumps([{
            "name": p.get("title", ""),
            "desc": p.get("content", "")[:200], # Trucante to save tokens
            "url": p.get("url", "")
        } for p in pois_data])
        
        add_log(db, trip.id, f"TAVILY AI: ¡{len(pois_data)} POIs descubiertos con éxito!", "success")


        # FASE 2: OPTIMIZACIÓN LÓGICA (Groq)
        add_log(db, trip.id, f"GROQ AI: Agrupando en {duration} días optimizando el desplazamiento...")
        
        groq_client = Groq(api_key=user.groq_api_key)
        groq_prompt = f"""
        Actúa como un experto en logística de viajes.
        Aquí tienes una lista de Puntos de Interés (POIs) en {trip.destination}: {raw_pois_string}.
        Debes agrupar lógicamente estos POIs en {duration} días, considerando la proximidad implícita y coherencia.
        No me des explicaciones. DEVUELVE ÚNICAMENTE UN JSON ESTRICTO con el siguiente formato:
        {{
            "itinerary": [
                {{
                    "day": 1,
                    "pois": [
                        {{ "name": "Nombre POI", "tavily_desc": "Desc..." }}
                    ]
                }}
            ]
        }}
        """
        
        groq_chat = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": groq_prompt}],
            model="llama3-8b-8192",
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        groq_output = groq_chat.choices[0].message.content
        
        add_log(db, trip.id, "GROQ AI: Estructuración matemática finalizada con éxito.", "success")


        # FASE 3: SÍNTESIS Y ESTÉTICA (Gemini)
        add_log(db, trip.id, "GEMINI AI: Redactando guías de usuario e inyectando contexto inmersivo...")
        
        genai.configure(api_key=user.gemini_api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        gemini_prompt = f"""
        Toma este itinerario agrupado por días: {groq_output}.
        Mejora las descripciones de los POIs con un tono inspirador y de revista de viajes.
        Además, asigna a cada POI una URL de imagen falsa representativa o usa tus fuentes si las sabes.
        Devuelve ÚNICAMENTE formato JSON:
        {{
            "days": [
                {{
                    "title": "Día 1: Título sugerente",
                    "pois": [
                        {{ "name": "...", "description": "Descripción inmersiva", "image_url": "url" }}
                    ]
                }}
            ]
        }}
        NO INTRODUZCAS MARKDOWN, SOLO JSON PLANO COMIENZANDO CON {{.
        """
        
        gemini_resp = model.generate_content(gemini_prompt)
        gemini_text = gemini_resp.text.strip()
        if gemini_text.startswith("```json"):
            gemini_text = gemini_text[7:]
        if gemini_text.endswith("```"):
            gemini_text = gemini_text[:-3]
            
        final_data = json.loads(gemini_text)
        
        add_log(db, trip.id, "GEMINI AI: Contenido premium generado. Escribiendo en base de datos...", "success")

        # PERSISTENCIA EN DB
        for day_idx, day_data in enumerate(final_data.get("days", [])):
            db_day = models.Day(
                trip_id=trip.id,
                title=day_data.get("title", f"Día {day_idx + 1}"),
                order=day_idx + 1
            )
            # Add dates logic later if needed
            db.add(db_day)
            db.commit()
            db.refresh(db_day)
            
            for poi_idx, poi_data in enumerate(day_data.get("pois", [])):
                db_poi = models.POI(
                    name=poi_data.get("name"),
                    description=poi_data.get("description"),
                    image_url=poi_data.get("image_url", "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1"),
                    original_source="Gemini/Tavily"
                )
                db.add(db_poi)
                db.commit()
                db.refresh(db_poi)
                
                db_day_poi = models.DayPOI(
                    day_id=db_day.id,
                    poi_id=db_poi.id,
                    order=poi_idx + 1
                )
                db.add(db_day_poi)
        
        db.commit()
                
        trip.status = "completed"
        add_log(db, trip.id, "¡Planificación terminada! Puedes ver tu guía en el panel.", "success")
        db.commit()

    except Exception as e:
        trip.status = "error"
        add_log(db, trip.id, f"Excepción Crítica en la Orquestación: {str(e)}", "error")
        db.commit()
