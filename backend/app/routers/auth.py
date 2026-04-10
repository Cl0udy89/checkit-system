from fastapi import APIRouter, Depends, HTTPException, status, Request, Form, UploadFile, File
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session
from app.schemas import UserCreate, UserRead
from app.services.auth_service import auth_service
from fastapi.security import OAuth2PasswordRequestForm
from app.security import create_access_token, verify_password
from app.simple_config import settings
import base64

router = APIRouter(tags=["Auth"])

from app.limiter import limiter

@router.post("/register", response_model=UserRead)
@limiter.limit("3/minute")
async def register(
    request: Request,
    nick: str = Form(...),
    email: str = Form(...),
    screenshot: UploadFile | None = File(default=None),
    session: AsyncSession = Depends(get_session)
):
    """
    Registers a new user. Accepts multipart form with optional screenshot.
    """
    try:
        user = UserCreate(nick=nick[:15], email=email)
        new_user = await auth_service.register_user(user, session)

        if screenshot and screenshot.filename:
            raw = await screenshot.read(1024 * 1024 * 2)  # max 2MB
            new_user.screenshot_b64 = base64.b64encode(raw).decode()
            new_user.screenshot_name = screenshot.filename
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)

        return new_user
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/token")
@limiter.limit("5/minute")
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends()):
    # HARDCODED ADMIN FOR NOW (Simple Kiosk Mode)
    print(f"DEBUG: Login attempt. Username='{form_data.username}', Password='{form_data.password}'")
    
    # user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if (
       form_data.username.strip() == settings.auth.admin_user
       and form_data.password.strip() == settings.auth.admin_pass
    ):
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
