from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from .. import models, schemas
from ..database import get_db
from .auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

class TripCreate(BaseModel):
    title: str
    destination: str
    start_date: date
    end_date: date

class TripResponse(TripCreate):
    id: int
    is_public: bool
    owner_id: int
    status: str
    
    class Config:
        from_attributes = True

class POIResponse(BaseModel):
    id: int
    name: str
    description: str | None
    image_url: str | None
    category: str | None
    latitude: float | None
    longitude: float | None
    website_url: str | None
    status: str | None
    class Config:
        from_attributes = True

class DayPOIResponse(BaseModel):
    id: int
    order: int
    poi: POIResponse
    class Config:
        from_attributes = True

class DayResponse(BaseModel):
    id: int
    title: str | None
    order: int
    accommodation: POIResponse | None
    pois: List[DayPOIResponse]
    class Config:
        from_attributes = True

class TripDetailResponse(TripResponse):
    available_pois: List[POIResponse]
    days: List[DayResponse]

@router.post("", response_model=TripResponse)
async def create_trip(trip: TripCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_trip = models.Trip(
        title=trip.title,
        destination=trip.destination,
        start_date=trip.start_date,
        end_date=trip.end_date,
        owner_id=current_user.id
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    
    from ..worker import generate_trip_task
    generate_trip_task.delay(new_trip.id)
    
    return new_trip

@router.get("", response_model=List[TripResponse])
async def get_trips(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Trip).filter(models.Trip.owner_id == current_user.id).order_by(models.Trip.created_at.desc()).all()

@router.get("/{trip_id}", response_model=TripDetailResponse)
async def get_trip(trip_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return trip

class TripLogResponse(BaseModel):
    message: str
    level: str

    class Config:
        from_attributes = True

@router.get("/{trip_id}/logs", response_model=List[TripLogResponse])
async def get_trip_logs(trip_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    logs = db.query(models.TripLog).filter(models.TripLog.trip_id == trip_id).order_by(models.TripLog.created_at.asc()).all()
    return logs

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trip(trip_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    
    db.delete(trip)
    db.commit()
    return None

@router.post("/{trip_id}/move-poi")
async def move_poi(trip_id: int, poi_id: int, day_id: int | None, is_accommodation: bool = False, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user.id).first()
    if not trip: raise HTTPException(status_code=404)
    
    poi = db.query(models.POI).filter(models.POI.id == poi_id, models.POI.trip_id == trip_id).first()
    if not poi: raise HTTPException(status_code=404)
    
    if is_accommodation and day_id:
        day = db.query(models.Day).filter(models.Day.id == day_id).first()
        if day: 
            day.accommodation_id = poi_id
            poi.status = "assigned"
    else:
        db.query(models.DayPOI).filter(models.DayPOI.poi_id == poi_id).delete()
        if day_id:
            db.add(models.DayPOI(day_id=day_id, poi_id=poi_id, order=1))
            poi.status = "assigned"
        else:
            poi.status = "pending"
    
    db.commit()
    return {"status": "ok"}

@router.post("/{trip_id}/poi/{poi_id}/status")
async def update_poi_status(trip_id: int, poi_id: int, status: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verify trip
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user.id).first()
    if not trip: raise HTTPException(status_code=404)
    
    poi = db.query(models.POI).filter(models.POI.id == poi_id, models.POI.trip_id == trip_id).first()
    if not poi: raise HTTPException(status_code=404)
    
    if status not in ["pending", "assigned", "discarded"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    poi.status = status
    if status == "discarded" or status == "pending":
        # Remove from any day if discarded or moved back to pending
        db.query(models.DayPOI).filter(models.DayPOI.poi_id == poi_id).delete()
        # Also check if it was an accommodation
        db.query(models.Day).filter(models.Day.accommodation_id == poi_id).update({models.Day.accommodation_id: None})

    db.commit()
    return {"status": "ok"}

@router.post("/{trip_id}/search-poi")
async def manual_search(trip_id: int, query: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verify trip
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user.id).first()
    if not trip: raise HTTPException(status_code=404)
    
    # Solo buscamos 5 resultados para ser rápidos
    from ..core.orchestrator import TavilyClient
    tavily_client = TavilyClient(api_key=current_user.tavily_api_key)
    resp = tavily_client.search(query=f"{query} in {trip.destination}", search_depth="advanced", max_results=5, include_images=True)
    
    if not resp.get("results"): return {"status": "no results"}

    import google.generativeai as genai
    import json
    genai.configure(api_key=current_user.gemini_api_key)
    model = genai.GenerativeModel("models/gemini-1.5-flash")
    
    context = [{"title": r.get("title"), "snippet": r.get("content")} for r in resp["results"]]
    prompt = f"Analyze these results for '{query}' in {trip.destination}. Extract up to 3 real POIs as JSON: {{'pois': [{{'name': '...', 'description': '...', 'category': '...', 'website_url': '...', 'lat': 0.0, 'lng': 0.0}}]}}. Data: {json.dumps(context)}"
    
    genai_resp = model.generate_content(prompt)
    txt = genai_resp.text.strip()
    
    # Limpieza de markdown
    if "```json" in txt:
        txt = txt.split("```json")[-1].split("```")[0].strip()
    elif "```" in txt:
        txt = txt.split("```")[1].strip()
    
    # Intento de extracción si hay texto extra
    if not (txt.startswith('{') and txt.endswith('}')):
        start = txt.find('{')
        end = txt.rfind('}')
        if start != -1 and end != -1:
            txt = txt[start:end+1]
    
    try:
        data = json.loads(txt)
    except:
        return {"status": "error", "message": "Fallo al procesar respuesta de IA"}
    new_pois = []
    for p in data.get("pois", []):
        db_poi = models.POI(
            trip_id=trip.id,
            name=p.get("name"),
            description=p.get("description"),
            category=p.get("category", "attraction"),
            latitude=p.get("lat"),
            longitude=p.get("lng"),
            website_url=p.get("website_url"),
            image_url="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1"
        )
        db.add(db_poi)
        new_pois.append(p)
    
    db.commit()
    return {"status": "ok", "added": len(new_pois)}

@router.get("/{trip_id}/export")
async def export_trip(trip_id: int, format: str = "json", db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user.id).first()
    if not trip: raise HTTPException(status_code=404)
    
    all_pois = db.query(models.POI).filter(models.POI.trip_id == trip_id).all()
    
    if format == "csv":
        import io, csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Name", "Description", "Category", "Latitude", "Longitude", "Website"])
        for p in all_pois:
            writer.writerow([p.name, p.description, p.category, p.latitude, p.longitude, p.website_url])
        return output.getvalue()
    
    elif format == "kml":
        kml = f'<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>{trip.title}</name>'
        for p in all_pois:
            kml += f'<Placemark><name>{p.name}</name><description>{p.description}</description><Point><coordinates>{p.longitude},{p.latitude},0</coordinates></Point></Placemark>'
        kml += '</Document></kml>'
        return kml

    return [{"name": p.name, "lat": p.latitude, "lng": p.longitude, "cat": p.category} for p in all_pois]

@router.post("/{trip_id}/import")
async def import_pois(trip_id: int, data: List[dict], db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.owner_id == current_user.id).first()
    if not trip: raise HTTPException(status_code=404)
    
    existing_names = {p.name.lower() for p in db.query(models.POI).filter(models.POI.trip_id == trip_id).all()}
    
    import google.generativeai as genai
    import json
    genai.configure(api_key=current_user.gemini_api_key)
    model = genai.GenerativeModel("models/gemini-1.5-flash")

    added_count = 0
    for item in data:
        name = item.get("name", "POI Importado")
        if name.lower() in existing_names: continue
        
        # Enriquecimiento básico con IA para los importados
        description = "Lugar importado."
        try:
            enrich_prompt = f"Dame una descripción breve (3 líneas) y cautivadora para el lugar '{name}' en {trip.destination}. Devuelve solo la descripción."
            resp = model.generate_content(enrich_prompt)
            description = resp.text.strip()
        except: pass

        new_poi = models.POI(
            trip_id=trip_id,
            name=name,
            latitude=item.get("lat"),
            longitude=item.get("lng"),
            category=item.get("category", "attraction"),
            description=description,
            image_url="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1"
        )
        db.add(new_poi)
        added_count += 1
    
    db.commit()
    return {"status": "ok", "imported": added_count}
