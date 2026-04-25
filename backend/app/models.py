from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, Float, Date, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_2fa_enabled = Column(Boolean, default=False)
    totp_secret = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # API Keys configurables por el usuario
    gemini_api_key = Column(String, nullable=True)
    groq_api_key = Column(String, nullable=True)
    tavily_api_key = Column(String, nullable=True)
    
    trips = relationship("Trip", back_populates="owner")


class Trip(Base):
    __tablename__ = "trips"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    destination = Column(String, nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)
    is_public = Column(Boolean, default=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="planning")
    
    owner = relationship("User", back_populates="trips")
    days = relationship("Day", back_populates="trip", cascade="all, delete-orphan", order_by="Day.order")
    available_pois = relationship("POI", back_populates="trip", cascade="all, delete-orphan")
    logs = relationship("TripLog", back_populates="trip", cascade="all, delete-orphan", order_by="TripLog.created_at")


class TripLog(Base):
    __tablename__ = "trip_logs"

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    message = Column(String)
    level = Column(String, default="info") # info, success, warning, error
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="logs")


class Day(Base):
    __tablename__ = "days"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    date = Column(Date)
    title = Column(String)
    order = Column(Integer, nullable=False)
    
    trip = relationship("Trip", back_populates="days")
    pois = relationship("DayPOI", back_populates="day", cascade="all, delete-orphan", order_by="DayPOI.order")


class POI(Base):
    """Puntos de Interés genéricos"""
    __tablename__ = "pois"
    
    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    name = Column(String, index=True, nullable=False)
    description = Column(Text)
    latitude = Column(Float)
    longitude = Column(Float)
    image_url = Column(String)
    original_source = Column(String) # Fuente original: Tavily, Gemini, Groq, Scraping...
    
    trip = relationship("Trip", back_populates="available_pois")
    day_pois = relationship("DayPOI", back_populates="poi")


class DayPOI(Base):
    """Relación entre un POI específico y un Día del itinerario"""
    __tablename__ = "day_pois"
    
    id = Column(Integer, primary_key=True, index=True)
    day_id = Column(Integer, ForeignKey("days.id"))
    poi_id = Column(Integer, ForeignKey("pois.id"))
    order = Column(Integer, nullable=False)
    notes = Column(Text) # Notas del usuario (ej: "Comer en restaurante Olivia Aker")
    
    day = relationship("Day", back_populates="pois")
    poi = relationship("POI", back_populates="day_pois")
