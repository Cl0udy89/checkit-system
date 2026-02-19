from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.hardware.patch_panel import patch_panel
from app.hardware.solenoid import solenoid
from app.node_state import connected_nodes
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class HardwareState(BaseModel):
    node_id: str
    is_rpi: bool
    timestamp: float
    patch_panel: List[Dict[str, Any]]
    # Add other hardware states here if needed

@router.post("/sync")
async def sync_agent_hardware(state: HardwareState):
    """
    Receives hardware state from Agent (RPi).
    Returns pending commands for Agent.
    """
    # 1. Update Node Status (Heartbeat)
    connected_nodes[state.node_id] = {
        "last_seen": datetime.utcnow(),
        "is_rpi": state.is_rpi,
        "role": "client", # If calling this, it's a client
        "ip": "unknown" # Could get from request request.client.host
    }

    # 2. Update Patch Panel State
    # Only if this node is the "active" hardware node? 
    # For now, we assume ONE hardware node or last-write-wins.
    patch_panel.update_remote_state(state.patch_panel)

    # 3. Check for Pending Commands
    response = {}
    
    cmd = solenoid.pop_pending_command()
    if cmd == "OPEN":
        response["trigger_solenoid"] = True
        logger.info(f"Sent OPEN command to Agent {state.node_id}")

    return response
