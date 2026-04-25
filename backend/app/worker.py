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
    from .database import SessionLocal
    from .core.orchestrator import orchestrate_trip_generation
    
    db = SessionLocal()
    try:
        orchestrate_trip_generation(db, trip_id)
    finally:
        db.close()
