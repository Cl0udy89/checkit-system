from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session
from app.schemas import UserCreate, UserRead
from app.services.auth_service import auth_service

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
