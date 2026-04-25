from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import auth
from . import models
from sqlalchemy import text
from .database import engine

# Crear tablas en la BD si no existen
models.Base.metadata.create_all(bind=engine)

# Parche temporal de migración: Añadir nuevas columnas si ya existía la BD
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR;"))
        conn.commit()
except Exception as e:
    print("Migración de esquema falló o ya estaba aplicada:", e)

app = FastAPI(title="vIAjar API", description="API for vIAjar travel guide generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

@app.get("/")
def read_root():
    return {"message": "Welcome to vIAjar API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
