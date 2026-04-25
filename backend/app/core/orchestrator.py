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
        add_log(db, trip.id, f"TAVILY AI: Iniciando rastreo profundo de Atractivos, Monumentos y Lugares de interés...")
        
        tavily_client = TavilyClient(api_key=user.tavily_api_key)
        all_raw_results = []
        
        # Búsquedas en español e inglés para máxima cobertura
        queries = [
            f"mejores monumentos, pueblos con encanto y sitios históricos para visitar en {trip.destination}",
            f"puntos de interés turístico, miradores y parajes naturales en {trip.destination}",
            f"best tourist attractions and hidden gems in {trip.destination} for sightseeing"
        ]

        for q in queries:
            try:
                resp = tavily_client.search(query=q, search_depth="advanced", max_results=target_pois // 2, include_images=True)
                all_raw_results.extend(resp.get("results", []))
            except Exception as e:
                add_log(db, trip.id, f"Error en búsqueda Tavily: {str(e)}", "warn")

        if not all_raw_results:
            raise Exception("No se han podido localizar puntos de interés. Revisa tu clave de Tavily.")

        add_log(db, trip.id, f"TAVILY AI: Rastreo finalizado. {len(all_raw_results)} candidatos encontrados.", "success")

        # FASE DE SÍNTESIS (Gemini) - Procesamiento por bloques para NO perder datos
        add_log(db, trip.id, "GEMINI AI: Documentando puntos de interés y calculando coordenadas...")
        genai.configure(api_key=user.gemini_api_key)
        
        # Debug: Listar modelos disponibles para ver qué ID es el correcto
        try:
            available_models = [m.name for m in genai.list_models() if "generateContent" in m.supported_generation_methods]
            add_log(db, trip.id, f"DEBUG: Modelos disponibles en tu API: {', '.join(available_models)[:200]}...")
        except Exception as e:
            add_log(db, trip.id, f"DEBUG: No se pudo listar modelos: {str(e)}", "warn")

        model_name = "gemini-1.5-flash" # Fallback a nombre base
        model = genai.GenerativeModel(model_name)
        
        chunk_size = 20
        all_processed_pois = []

        for i in range(0, len(all_raw_results), chunk_size):
            chunk = all_raw_results[i:i + chunk_size]
            context = [{"title": p.get("title"), "snippet": p.get("content"), "url": p.get("url")} for p in chunk]
            
            prompt = f"""
            Eres un experto guía de viajes. Analiza este BLOQUE de {len(chunk)} candidatos para el destino {trip.destination}.
            
            OBJETIVO: Identificar PUEBLOS de interés turístico, MONUMENTOS, MUSEOS, MIRADORES, PARQUES NATURALES y otros puntos de interés (POI).
            
            CRÍTICO - REGLAS DE EXCLUSIÓN:
            - NO incluyas hoteles, hostales, apartamentos, campings ni ningún tipo de alojamiento.
            - NO incluyas restaurantes, bares, cafeterías ni gastronomía.
            - Ignóralos por completo. Solo queremos lugares que se "visitan".
            
            Para CADA lugar de interés turístico real encontrado en los datos proporcionados:
            1. NAME: Nombre oficial en español.
            2. DESCRIPTION: Un párrafo de 5-6 líneas cautivador sobre por qué visitarlo.
            3. CATEGORY: 'attraction'.
            4. WEBSITE_URL: Su web oficial o enlace informativo (TripAdvisor, Wikipedia).
            5. LAT: Latitud decimal (ej: 40.4167).
            6. LNG: Longitud decimal (ej: -3.7037).
            
            IMPORTANTE: Si no tienes coordenadas exactas, intenta estimarlas basándote en el nombre y ciudad.
            Responde ÚNICAMENTE con un objeto JSON válido.
            
            JSON FORMAT:
            {{ "pois": [ {{ "name": "...", "description": "...", "category": "attraction", "website_url": "...", "lat": 0.0, "lng": 0.0 }} ] }}
            
            DATA: {json.dumps(context)}
            """
            
            try:
                resp = model.generate_content(prompt)
                txt = resp.text.strip()
                
                # Limpieza de markdown
                if "```json" in txt:
                    txt = txt.split("```json")[-1].split("```")[0].strip()
                elif "```" in txt:
                    txt = txt.split("```")[1].strip()
                
                # Intentar encontrar el primer '{' y el último '}' si falló lo anterior
                if not (txt.startswith('{') and txt.endswith('}')):
                    start = txt.find('{')
                    end = txt.rfind('}')
                    if start != -1 and end != -1:
                        txt = txt[start:end+1]
                
                data = json.loads(txt)
                chunk_pois = data.get("pois", [])
                
                # Validación básica de datos
                valid_pois = []
                for p in chunk_pois:
                    if p.get("name") and p.get("lat") and p.get("lng"):
                        valid_pois.append(p)
                
                all_processed_pois.extend(valid_pois)
                add_log(db, trip.id, f"Progreso IA: {len(all_processed_pois)} lugares válidos identificados...")
            except Exception as e:
                add_log(db, trip.id, f"Error procesando bloque {i//chunk_size + 1}: {str(e)}", "warn")
                continue

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
