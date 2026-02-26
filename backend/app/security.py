from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.simple_config import settings
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Secret key should be in config, but defaulting here for safety
SECRET_KEY = settings.security.jwt_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 240 # Reduced to 4 hours for security

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_admin(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role != "admin":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username

from app.database import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User
from fastapi import Header

async def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    session: AsyncSession = Depends(get_session)
) -> User:
    """
    Simple Kiosk Authentication.
    Trusts the X-User-ID header sent by the frontend (which stores the registered user ID).
    In a real internet-facing app, this is insecure. For a local kiosk, it's fine.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Authentication required (X-User-ID missing)")
    
    try:
        uid = int(x_user_id)
        user = await session.get(User, uid)
        if not user:
             raise HTTPException(status_code=401, detail="User not found")
        return user
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid User ID format")
