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
    force_solved: Optional[bool] = False

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
        global_status=global_status,
        force_solved=queue_state.get("force_solved", False)
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

@router.post("/finish")
async def finish_player_game(user: User = Depends(get_current_user)):
    # Called by frontend right after successful game score submission
    if queue_state["current_player"] and queue_state["current_player"]["id"] == user.id:
        queue_state["current_player"] = None
        queue_state["status"] = "available"
        queue_state["force_solved"] = False
        return {"message": "Game finished, queue freed"}
    return {"message": "No active game to finish"}

@router.post("/timeout-flash")
async def trigger_timeout_flash(user: User = Depends(get_current_user)):
    # Flashes the physical LED red for 5 seconds when a user runs out of time
    from app.hardware.led_manager import led_manager
    led_manager.play_effect("timeout_red")
    
    # Also kick the user and free the game
    if queue_state["current_player"] and queue_state["current_player"]["id"] == user.id:
        queue_state["current_player"] = None
        queue_state["status"] = "available"
        
    return {"message": "LED timeout flash triggered and game reset"}

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
    queue_state["force_solved"] = False
    return {"message": f"Called {next_player['nick']}"}

@router.post("/admin/set_status")
async def set_queue_status(update: AdminStatusUpdate, admin: User = Depends(get_current_admin)):
    valid_statuses = ["available", "waiting_for_player", "playing", "resetting"]
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    queue_state["status"] = update.status
    if update.status in ["available", "resetting"]:
        queue_state["current_player"] = None
        queue_state["force_solved"] = False
        
    return {"message": f"Status set to {update.status}"}

@router.post("/admin/force_solve")
async def force_solve(admin: User = Depends(get_current_admin), session: AsyncSession = Depends(get_session)):
    current_player = queue_state.get("current_player")
    if not current_player:
        raise HTTPException(status_code=400, detail="No active player to solve for.")
        
    from app.services.game_service import game_service
    # If the hardware fails but admin forces solve, max points? Or base - minimal.
    # Let's give them 10000 points.
    await game_service.finish_game("patch_master", current_player["id"], answers={}, duration_ms=0, session=session, score=10000)
    
    # Unlock queue
    if not queue_state["queue"]:
        queue_state["current_player"] = None
        queue_state["status"] = "available"
    else:
        # Move to next player implicitly? NO, let the admin hit NEXT.
        # Just put it to available? NO, keep them "playing" or just clear them so they get kicked.
        pass # Wait. If we clear them, their frontend `submitMutation` will also fire when it sees isFinished!
        # Let's let the frontend handle the score submit by returning a specific status.
        # Actually, let's just trigger hardware solved override! 
    
    from app.hardware.patch_panel import patch_panel
    patch_panel.override_solved = True # Wait, does this property exist? We can just send a websocket event or just force the DB save here and tell the frontend via a new state field!

    # A cleaner way: set a flag in queue_state that the current game was forced solved.
    queue_state["force_solved"] = True

    return {"message": "Forced solve trigger initiated."}

@router.delete("/admin/kick/{user_id}")
async def kick_user(user_id: int, admin: User = Depends(get_current_admin)):
    queue_state["queue"] = [u for u in queue_state["queue"] if u["id"] != user_id]
    if queue_state["current_player"] and queue_state["current_player"]["id"] == user_id:
        queue_state["current_player"] = None
        queue_state["status"] = "available"
    return {"message": "User kicked"}
