from fastapi import APIRouter, HTTPException, Depends
from app.hardware.solenoid import solenoid
from app.hardware.patch_panel import patch_panel
from app.simple_config import settings
from app.database import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from app.security import get_current_admin
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(get_current_admin)])

@router.post("/solenoid/trigger")
async def trigger_solenoid():
    logger.info("Admin triggered solenoid.")
    # This runs in background/async
    await solenoid.open_box()
    return {"status": "triggered"}

@router.get("/hardware/status")
async def get_hardware_status():
    return {
        "solenoid": {
            "is_active": solenoid._is_active, # Accessing protected member for debug
            "pin": settings.hardware.solenoid_pin
        },
        "patch_panel": {
            "solved": patch_panel.is_solved(),
            "pairs": patch_panel.get_state()
        }
    }

@router.get("/users")
async def get_users(session: AsyncSession = Depends(get_session)):
    from app.models import User
    from sqlmodel import select
    from sqlmodel import select, delete
    result = await session.execute(select(User))
    return result.scalars().all()

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, session: AsyncSession = Depends(get_session)):
    from app.models import User, GameScore
    from sqlmodel import select, delete
    
    # Check if user exists
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Delete associated scores first (cascade should handle this but manual is safer for SQLite sometimes)
    # Actually, let's just delete the user, assuming CASCADE is set up or ID won't be reused immediately.
    # To be safe in simple app:
    await session.execute(delete(GameScore).where(GameScore.user_id == user_id))
    await session.execute(delete(User).where(User.id == user_id))
    await session.commit()
    return {"status": "deleted", "user_id": user_id}

@router.get("/scores")
async def get_scores(session: AsyncSession = Depends(get_session)):
    from app.models import GameScore, User
    from sqlmodel import select
    # Join with User to get nicks
    stmt = select(GameScore, User.nick).join(User, GameScore.user_id == User.id)
    stmt = select(GameScore, User.nick).join(User, GameScore.user_id == User.id)
    result = await session.execute(stmt)
    # Return as list of dicts to make it JSON serializable easily
    return [{"score": s, "nick": n} for s, n in result.all()]
