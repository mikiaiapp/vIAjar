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
            query=f"puntos de interés en {trip.destination}",
            search_depth="advanced",
            include_images=True,
            include_raw_content=False,
            max_results=30
        )
        
        pois_data = tavily_resp.get("results", [])
        if not pois_data:
            raise Exception("Tavily no devolvió ningún resultado.")
            
        # Asignar un ID a cada POI y preparar diccionarios separados
        tavily_context_map = {}
        groq_geo_list = []

        for idx, p in enumerate(pois_data):
            poi_id = f"poi_{idx}"
            tavily_context_map[poi_id] = {
                "name": p.get("title", ""),
                "description": p.get("content", "")[:300],
                "url": p.get("url", ""),
                # Si Tavily trae imágenes en el futuro real, o guardarla genérica
                "image_url": "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1"
            }
            # Simular extracción geo (Tavily no siempre lo da perfecto sin raw, 
            # pero le pasamos los keys a Groq para que entienda que es proximidad)
            groq_geo_list.append({
                "id": poi_id,
                "name": p.get("title", "")
            })
            
        add_log(db, trip.id, f"TAVILY AI: ¡{len(pois_data)} POIs descubiertos con éxito!", "success")

        # FASE 2: OPTIMIZACIÓN LÓGICA (Groq)
        add_log(db, trip.id, f"GROQ AI: Agrupando en {duration} días optimizando el desplazamiento...")
        
        groq_client = Groq(api_key=user.groq_api_key)
        groq_prompt = f"""
        Actúa como un algoritmo de clustering geo-espacial super-eficiente.
        Agrupa lógicamente esta lista de Puntos de Interés geográficamente para formar {duration} días de viaje en {trip.destination}.
        Lista de lugares: {json.dumps(groq_geo_list)}
        
        No des explicaciones. Devuelve un JSON ESTRICTO con la distribución usando los IDs:
        {{
            "Día 1": ["poi_0", "poi_5", "poi_8"],
            "Día 2": ["poi_1", "poi_2", "poi_7"]
        }}
        """
        
        groq_chat = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": groq_prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        groq_output_raw = groq_chat.choices[0].message.content
        groq_clustering = json.loads(groq_output_raw)
        
        add_log(db, trip.id, "GROQ AI: Mapeo geográfico de rutas finalizado con éxito.", "success")


        # FASE 3: SÍNTESIS Y ESTÉTICA (Gemini)
        add_log(db, trip.id, "GEMINI AI: Redactando guías con estilo vibrante, efecto sorpresa y toques italianos...")
        
        genai.configure(api_key=user.gemini_api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        gemini_prompt = f"""
        Actúa como un escritor de guías de viaje increíblemente carismático (con un estilo entusiasta, toques de la dolce vita italiana, y siempre guardando "efectos sorpresa").
        Toma esta estructura de días (creada por otra IA para optimizar desplazamientos):
        {json.dumps(groq_clustering)}
        
        El contexto real (datos extraídos por otra IA) de cada POI está aquí:
        {json.dumps(tavily_context_map)}
        
        Tu trabajo es consolidarlo todo en una guía definitiva. Redacta descripciones maravillosas y cautivadoras para cada sitio basado en su contexto original.
        Devuelve ÚNICAMENTE este formato JSON estricto (NO uses markdown fuera del JSON):
        {{
            "days": [
                {{
                    "title": "Día 1: [Un título muy italiano y emocionante para este día]",
                    "pois": [
                        {{ "name": "Nombre real del lugar", "description": "Tu descripción generada (¡mucha chispa!)", "image_url": "url original del contexto" }}
                    ]
                }}
            ]
        }}
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
