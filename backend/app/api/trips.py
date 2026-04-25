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
    
    class Config:
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
    
    # Aquí es donde engancharemos celery y la generación con IA
    # generate_trip.delay(new_trip.id)
    
    return new_trip

@router.get("", response_model=List[TripResponse])
async def get_trips(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Trip).filter(models.Trip.owner_id == current_user.id).all()
