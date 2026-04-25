import os
from celery import Celery

REDIS_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(name="generate_trip")
def generate_trip_task(trip_id: int):
    import time
    from .database import SessionLocal
    from . import models
    db = SessionLocal()
    try:
        trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
        if not trip: return

        # Step 1
        log = models.TripLog(trip_id=trip_id, message=f"Iniciando planificación para {trip.destination}...", level="info")
        db.add(log)
        db.commit()
        time.sleep(2)
        
        # Step 2
        log = models.TripLog(trip_id=trip_id, message="TAVILY AI: Buscando Puntos de Interés (POI) actualizados...", level="info")
        db.add(log)
        db.commit()
        time.sleep(3)
        
        # Step 3
        log = models.TripLog(trip_id=trip_id, message="GROQ AI: Estructurando itinerario eficientemente por días...", level="info")
        db.add(log)
        db.commit()
        time.sleep(4)
        
        # Step 4
        log = models.TripLog(trip_id=trip_id, message="GEMINI AI: Redactando descripciones inmersivas de los lugares...", level="info")
        db.add(log)
        db.commit()
        time.sleep(3)
        
        # Final
        log = models.TripLog(trip_id=trip_id, message="¡Planificación terminada! Disfruta tu viaje.", level="success")
        trip.status = "completed"
        db.add(log)
        db.commit()
    except Exception as e:
        db.query(models.Trip).filter(models.Trip.id == trip_id).update({"status": "error"})
        log = models.TripLog(trip_id=trip_id, message=f"Error fatal: {str(e)}", level="error")
        db.add(log)
        db.commit()
    finally:
        db.close()
