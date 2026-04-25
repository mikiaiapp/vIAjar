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
        from_attributes = True

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

@router.get("/{trip_id}", response_model=TripResponse)
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
