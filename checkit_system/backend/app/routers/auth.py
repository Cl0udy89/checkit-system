from fastapi import APIRouter, Depends, HTTPException, status
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session
from app.schemas import UserCreate, UserRead
from app.services.auth_service import auth_service
from fastapi.security import OAuth2PasswordRequestForm
from app.security import create_access_token, verify_password
from app.simple_config import settings

router = APIRouter(tags=["Auth"])

@router.post("/register", response_model=UserRead)
async def register(user: UserCreate, session: AsyncSession = Depends(get_session)):
    """
    Registers a new user after validation.
    """
    try:
        new_user = await auth_service.register_user(user, session)
        return new_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # HARDCODED ADMIN FOR NOW (Simple Kiosk Mode)
    # user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if form_data.username == "admin" and form_data.password == "checkit2024":
        access_token_expires = timedelta(minutes=600)
        access_token = create_access_token(
            data={"sub": form_data.username, "role": "admin"}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )
