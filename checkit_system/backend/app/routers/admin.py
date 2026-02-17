from fastapi import APIRouter, HTTPException
from app.hardware.solenoid import solenoid
from app.hardware.patch_panel import patch_panel
from app.config_loader import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])

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
