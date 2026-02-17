from fastapi import APIRouter, HTTPException, Depends
from app.hardware.solenoid import solenoid
from app.hardware.patch_panel import patch_panel
from app.config_loader import settings
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
    result = await session.exec(select(User))
    return result.all()

@router.get("/scores")
async def get_scores(session: AsyncSession = Depends(get_session)):
    from app.models import GameScore, User
    from sqlmodel import select
    # Join with User to get nicks
    stmt = select(GameScore, User.nick).join(User, GameScore.user_id == User.id)
    result = await session.exec(stmt)
    # Return as list of dicts to make it JSON serializable easily
    return [{"score": s, "nick": n} for s, n in result.all()]
