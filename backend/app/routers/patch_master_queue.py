from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.security import get_current_user, get_current_admin
from app.models import User
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Patch Master Queue"])

# --- In-Memory State ---
# status enum: "available" (nobody playing, queue empty), "waiting_for_player" (player called, must click start), "playing" (game active), "resetting" (admin fixing cables)
queue_state = {
    "status": "available",
    "current_player": None, # Dict: {"id": 1, "nick": "Player1"}
    "queue": [], # List of Dicts: [{"id": 2, "nick": "Player2"}, ...]
}

class QueueStateResponse(BaseModel):
    status: str
    current_player: Optional[Dict[str, Any]]
    queue: List[Dict[str, Any]]
    position: Optional[int] = None # Position for the requesting user
    global_status: Optional[str] = "true" # "true", "technical_break", "false"

# --- User Endpoints ---

from fastapi import Header
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session
from sqlmodel import select
from app.models import SystemConfig

@router.get("", response_model=QueueStateResponse)
async def get_queue_state(
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    session: AsyncSession = Depends(get_session)
):
    # Fetch global competition status
    conf_res = await session.execute(select(SystemConfig).where(SystemConfig.key == "competition_active"))
    conf = conf_res.scalar_one_or_none()
    global_status = conf.value if conf else "true"

    position = None
    if x_user_id:
        try:
            uid = int(x_user_id)
            for idx, u in enumerate(queue_state["queue"]):
                if u["id"] == uid:
                    position = idx + 1
                    break
        except ValueError:
            pass
            
    return QueueStateResponse(
        status=queue_state["status"],
        current_player=queue_state["current_player"],
        queue=queue_state["queue"],
        position=position,
        global_status=global_status
    )

from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_session

@router.post("/join")
async def join_queue(user: User = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    from app.models import SystemConfig
    from sqlmodel import select
    conf_res = await session.execute(select(SystemConfig).where(SystemConfig.key == "competition_active"))
    conf = conf_res.scalar_one_or_none()
    if conf:
        if conf.value == "false":
            raise HTTPException(status_code=403, detail="ZAWODY_ZAKONCZONE")
        elif conf.value == "technical_break":
            raise HTTPException(status_code=403, detail="PRZERWA_TECHNICZNA")

    # Check if already playing
    if queue_state["current_player"] and queue_state["current_player"]["id"] == user.id:
        return {"message": "Already playing"}
        
    # Check if already in queue
    if any(u["id"] == user.id for u in queue_state["queue"]):
        return {"message": "Already in queue"}
        
    queue_state["queue"].append({"id": user.id, "nick": user.nick})
    return {"message": "Joined queue"}

@router.post("/leave")
async def leave_queue(user: User = Depends(get_current_user)):
    queue_state["queue"] = [u for u in queue_state["queue"] if u["id"] != user.id]
    return {"message": "Left queue"}

@router.post("/start")
async def start_game(user: User = Depends(get_current_user)):
    if queue_state["status"] != "waiting_for_player":
        raise HTTPException(status_code=400, detail="Not waiting for a player.")
        
    if not queue_state["current_player"] or queue_state["current_player"]["id"] != user.id:
        raise HTTPException(status_code=403, detail="It is not your turn.")
        
    queue_state["status"] = "playing"
    return {"message": "Game started"}

# --- Admin Endpoints ---

class AdminStatusUpdate(BaseModel):
    status: str

@router.post("/admin/next")
async def call_next_player(admin: User = Depends(get_current_admin)):
    if not queue_state["queue"]:
        queue_state["current_player"] = None
        queue_state["status"] = "available"
        return {"message": "Queue is empty."}
        
    next_player = queue_state["queue"].pop(0)
    queue_state["current_player"] = next_player
    queue_state["status"] = "waiting_for_player"
    return {"message": f"Called {next_player['nick']}"}

@router.post("/admin/set_status")
async def set_queue_status(update: AdminStatusUpdate, admin: User = Depends(get_current_admin)):
    valid_statuses = ["available", "waiting_for_player", "playing", "resetting"]
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    queue_state["status"] = update.status
    if update.status == "available":
        queue_state["current_player"] = None
        
    return {"message": f"Status set to {update.status}"}

@router.delete("/admin/kick/{user_id}")
async def kick_user(user_id: int, admin: User = Depends(get_current_admin)):
    queue_state["queue"] = [u for u in queue_state["queue"] if u["id"] != user_id]
    if queue_state["current_player"] and queue_state["current_player"]["id"] == user_id:
        queue_state["current_player"] = None
        queue_state["status"] = "available"
    return {"message": "User kicked"}
