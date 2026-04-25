from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..core.security import get_password_hash, verify_password, create_access_token
from ..core.email import send_welcome_email
from ..core.security import ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
import pyotp
import io
import qrcode
from fastapi.responses import StreamingResponse

router = APIRouter()

@router.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Enviar email de bienvenida (Cartero Synology)
    send_welcome_email(new_user.full_name or "viajero", new_user.email)
    
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from ..core.security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar el acceso",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/keys", response_model=schemas.UserResponse)
async def update_api_keys(keys: schemas.UserUpdateKeys, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if keys.gemini_api_key is not None:
        current_user.gemini_api_key = keys.gemini_api_key
    if keys.groq_api_key is not None:
        current_user.groq_api_key = keys.groq_api_key
    if keys.tavily_api_key is not None:
        current_user.tavily_api_key = keys.tavily_api_key
        
    db.commit()
    db.refresh(current_user)
    return current_user

# --- 2FA Endpoints ---

@router.get("/2fa/setup")
async def setup_2fa(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.totp_secret:
        current_user.totp_secret = pyotp.random_base32()
        db.commit()
    
    totp = pyotp.TOTP(current_user.totp_secret)
    provisioning_uri = totp.provisioning_uri(name=current_user.email, issuer_name="vIAjar")
    
    img = qrcode.make(provisioning_uri)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    
    return StreamingResponse(buf, media_type="image/png")

@router.post("/2fa/verify")
async def verify_2fa(code: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    totp = pyotp.TOTP(current_user.totp_secret)
    if totp.verify(code):
        current_user.is_2fa_enabled = True
        db.commit()
        return {"status": "2FA habilitado correctamente"}
    else:
        raise HTTPException(status_code=400, detail="Código 2FA inválido")
