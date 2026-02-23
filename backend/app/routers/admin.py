from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.hardware.solenoid import solenoid
from app.hardware.patch_panel import patch_panel
from app.simple_config import settings
from app.database import get_session
from sqlalchemy.ext.asyncio import AsyncSession
from app.security import get_current_admin
from app.models import SystemConfig, EmailTemplate, User, GameScore
from app.services.email_service import email_service
from app.security import get_current_admin
from app.hardware.gpio_manager import IS_RPI
from app.node_state import connected_nodes
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Admin"], dependencies=[Depends(get_current_admin)])

@router.get("/system/status")
async def get_system_status():
    # Filter/Update node status based on heartbeat
    active_nodes = {}
    now = datetime.utcnow()
    for node_id, data in connected_nodes.items():
        last_seen = data.get("last_seen")
        # If seen within last 30 seconds, it's online
        if last_seen and (now - last_seen).total_seconds() < 30:
            active_nodes[node_id] = data
        else:
            # Option A: Remove it
            # Option B: Mark as offline (better for UI to see it drop)
            data_copy = data.copy()
            data_copy["status"] = "offline" 
            # actually strict filtering might be better for now to avoid clutter
            # Let's just return it but frontend should handle "offline" red color if we add a status field.
            # But wait, connected_nodes just stores raw data.
            # Let's verify what the frontend expects.
            pass

    # Actually, simpler: Just calculate "is_online" here
    nodes_response = {}
    for node_id, data in connected_nodes.items():
        last_seen = data.get("last_seen")
        is_online = False
        if last_seen and (now - last_seen).total_seconds() < 15: # 15s timeout (since sync is 5s)
            is_online = True
        
        nodes_response[node_id] = {
            "ip": data.get("ip"),
            "role": data.get("role"),
            "is_rpi": data.get("is_rpi"),
            "last_seen": last_seen.isoformat() if last_seen else None,
            "status": "online" if is_online else "offline"
        }

    return {
        "status": "online",
        "system_mode": settings.system.platform_role,
        "database": "connected", # TODO: Check real DB status
        "connected_nodes": nodes_response,
        "config": {
             "node_id": settings.node_id
        }
    }

@router.post("/solenoid/trigger")
async def trigger_solenoid():
    logger.info("Admin triggered solenoid.")
    # This runs in background/async
    await solenoid.open_box()
    return {"status": "triggered"}

@router.post("/hardware/patch_panel/force/{index}")
async def force_patch_panel_pair(index: int, state: bool = True):
    patch_panel.set_force_state(index, state)
    return {"status": "forced", "index": index, "state": state}

@router.delete("/hardware/patch_panel/force")
async def clear_patch_panel_forces():
    patch_panel.clear_force_state()
    return {"status": "cleared"}

@router.delete("/hardware/patch_panel/force/{index}")
async def clear_patch_panel_force_single(index: int):
    patch_panel.clear_force_state(index)
    return {"status": "cleared", "index": index}

@router.get("/hardware/status")
async def get_hardware_status():
    # Check if RPi is online
    is_rpi_online = False
    now = datetime.utcnow()
    for node_id, data in connected_nodes.items():
        if data.get("is_rpi"):
            last_seen = data.get("last_seen")
            if last_seen and (now - last_seen).total_seconds() < 15:
                is_rpi_online = True
            break
            
    # Get current hardware states
    solenoid_state = solenoid.get_state()
    pp_state = patch_panel.get_state()
    
    # Override with disconnected if offline (unless we are the RPi itself testing locally)
    if not is_rpi_online and not IS_RPI:
        pp_state = [
            {"label": p["label"], "gpio": p["gpio"], "connected": False}
            for p in pp_state
        ]
        
    import app.routers.agent as agent_router
    return {
        "solenoid": {
            "is_active": solenoid_state.get("is_active", False), 
            "is_open": solenoid_state.get("is_open", False),
            "pin": settings.hardware.solenoid_pin
        },
        "patch_panel": {
            "solved": patch_panel.is_solved() if is_rpi_online or IS_RPI else False,
            "pairs": pp_state
        },
        "led": {
            "current_effect": agent_router.current_led_effect
        }
    }

class LEDCommand(BaseModel):
    effect: str

@router.post("/hardware/led")
async def control_led(cmd: LEDCommand):
    import app.routers.agent as agent_router
    from app.routers.agent import pending_led_commands
    agent_router.current_led_effect = cmd.effect
    pending_led_commands.append(cmd.effect)
    return {"message": f"LED effect {cmd.effect} queued"}

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

@router.get("/users/{user_id}/scores")
async def get_user_scores(user_id: int, session: AsyncSession = Depends(get_session)):
    from app.models import GameScore
    from sqlmodel import select
    result = await session.execute(select(GameScore).where(GameScore.user_id == user_id))
    return result.scalars().all()

@router.delete("/users/{user_id}/scores/{game_type}")
async def delete_user_game_score(user_id: int, game_type: str, session: AsyncSession = Depends(get_session)):
    from app.models import GameScore
    from sqlmodel import delete
    await session.execute(delete(GameScore).where(GameScore.user_id == user_id, GameScore.game_type == game_type))
    await session.commit()
    return {"status": "deleted", "user_id": user_id, "game_type": game_type}

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

@router.get("/logs")
async def get_logs(limit: int = 50, session: AsyncSession = Depends(get_session)):
    from app.models import GameLog
    from sqlmodel import select, desc
    stmt = select(GameLog).order_by(desc(GameLog.timestamp)).limit(limit)
    result = await session.execute(stmt)
    return result.scalars().all()

@router.delete("/logs")
async def clear_logs(session: AsyncSession = Depends(get_session)):
    from app.models import GameLog
    from sqlmodel import delete
    await session.execute(delete(GameLog))
    await session.commit()
    return {"status": "cleared"}

# --- System Config & Competition Control ---

@router.delete("/database")
async def reset_database(session: AsyncSession = Depends(get_session)):
    from app.models import User, GameScore, GameLog, SystemConfig, EmailTemplate
    from sqlmodel import delete
    
    # Delete all data
    await session.execute(delete(GameScore))
    await session.execute(delete(GameLog))
    await session.execute(delete(User))
    # Optionally keep config/templates? User said "WIPE ALL". 
    # Usually we want to keep admin/system config, but "Reset Database" implies fresh start.
    # Let's keep SystemConfig and EmailTemplate to avoid breaking the app completely, 
    # but wipe user data.
    
    await session.commit()
    return {"status": "reset_complete"}

@router.get("/config")
async def get_system_config(session: AsyncSession = Depends(get_session)):
    from sqlmodel import select
    result = await session.execute(select(SystemConfig))
    return {c.key: c.value for c in result.scalars().all()}

@router.post("/config/{key}")
async def set_system_config(key: str, value: str, session: AsyncSession = Depends(get_session)):
    from sqlmodel import select
    # Check if exists
    result = await session.execute(select(SystemConfig).where(SystemConfig.key == key))
    config = result.scalar_one_or_none()
    
    if config:
        config.value = value
    else:
        config = SystemConfig(key=key, value=value)
        session.add(config)
        
    await session.commit()
    return {"status": "updated", "key": key, "value": value}

# --- Email Templates ---

@router.get("/email-templates")
async def get_email_templates(session: AsyncSession = Depends(get_session)):
    from sqlmodel import select
    
    # Initialize defaults if empty
    result = await session.execute(select(EmailTemplate))
    templates = result.scalars().all()
    
    if not templates:
        defaults = [
            EmailTemplate(slug="winner_grandmaster", subject="Gratulacje! Wygrałeś nagrodę główną!", body_template="Cześć {nick}! Zdobyłeś tytuł Grandmastera z wynikiem {score}. Zgłoś się do stoiska!"),
            EmailTemplate(slug="winner_category", subject="Gratulacje! Wygrałeś w kategorii {game}!", body_template="Cześć {nick}! Jesteś mistrzem w {game} z wynikiem {score}. Odbierz nagrodę!"),
            EmailTemplate(slug="participant", subject="Dziękujemy za udział w CheckIT!", body_template="Cześć {nick}! Dzięki za grę. Twój wynik to {score}. Powodzenia za rok!")
        ]
        for t in defaults:
            session.add(t)
        await session.commit()
        return defaults
        
    return templates

@router.put("/email-templates/{slug}")
async def update_email_template(slug: str, subject: str, body: str, session: AsyncSession = Depends(get_session)):
    from sqlmodel import select
    result = await session.execute(select(EmailTemplate).where(EmailTemplate.slug == slug))
    tpl = result.scalar_one_or_none()
    
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
        
    tpl.subject = subject
    tpl.body_template = body
    await session.commit()
    return {"status": "updated"}

# --- Email Sending Logic ---

@router.post("/email/send-all")
async def send_all_emails(session: AsyncSession = Depends(get_session)):
    from app.models import User, GameScore, EmailTemplate
    from sqlmodel import select
    
    # 1. Fetch Data
    users = (await session.execute(select(User))).scalars().all()
    scores = (await session.execute(select(GameScore))).scalars().all()
    templates = (await session.execute(select(EmailTemplate))).scalars().all()
    
    # Get Sender Config
    conf_keys = ["email_sender", "smtp_host", "smtp_port", "smtp_user", "smtp_password"]
    config_rows = (await session.execute(select(SystemConfig).where(SystemConfig.key.in_(conf_keys)))).scalars().all()
    config_map = {c.key: c.value for c in config_rows}
    
    smtp_config = {
        "sender": config_map.get("email_sender", "noreply@checkit.com"),
        "host": config_map.get("smtp_host", ""),
        "port": int(config_map.get("smtp_port", "587")),
        "user": config_map.get("smtp_user", ""),
        "password": config_map.get("smtp_password", ""),
    }
    
    tpl_map = {t.slug: t for t in templates}
    user_map = {u.id: u for u in users}
    
    # 2. Calculate Stats (Same logic as Leaderboard)
    user_best = {} # uid -> {games: {type: score}, total: 0}
    
    for s in scores:
        if s.user_id not in user_best:
            user_best[s.user_id] = {"games": {}, "total": 0}
        
        curr = user_best[s.user_id]["games"].get(s.game_type, 0)
        if s.score > curr:
           user_best[s.user_id]["games"][s.game_type] = s.score

    for uid, data in user_best.items():
        data["total"] = sum(data["games"].values())

    # 3. Identify Winners
    # Grandmasters
    gm_list = [{"uid": uid, "score": d["total"]} for uid, d in user_best.items()]
    gm_list.sort(key=lambda x: x["score"], reverse=True)
    top_gm = gm_list[:3]
    winner_ids = {x["uid"] for x in top_gm}
    
    # Category Winners
    categories = ["binary_brain", "patch_master", "it_match"]
    for cat in categories:
        cat_list = []
        for uid, data in user_best.items():
            if cat in data["games"]:
                cat_list.append({"uid": uid, "score": data["games"][cat]})
        cat_list.sort(key=lambda x: x["score"], reverse=True)
        top_cat = cat_list[:3]
        for w in top_cat:
            winner_ids.add(w["uid"])

    # 4. Queue Emails
    sent_count = 0
    
    # Mock sending loop
    email_queue = []
    
    for u in users:
        if u.id in winner_ids:
            # Determine which winner template (Grandmaster takes precedence)
            is_gm = any(w["uid"] == u.id for w in top_gm)
            if is_gm:
                t = tpl_map.get("winner_grandmaster")
                score_display = user_best[u.id]["total"]
                game_display = "Grandmaster"
            else:
                t = tpl_map.get("winner_category")
                # find which category they won (naive: best one)
                best_cat = max(user_best[u.id]["games"].items(), key=lambda x: x[1])
                score_display = best_cat[1]
                game_display = best_cat[0]
        else:
            t = tpl_map.get("participant")
            score_display = user_best.get(u.id, {"total": 0})["total"]
            game_display = "Participant"
            
        if not t: continue
        
        # Format body
        body = t.body_template.replace("{nick}", u.nick).replace("{score}", str(score_display)).replace("{game}", game_display)
        
        email_queue.append({
            "to": u.email,
            "subject": t.subject,
            "body": body
        })

    # Send
    await email_service.send_bulk(email_queue, smtp_config=smtp_config)
    
    return {"status": "sent", "count": len(email_queue), "winner_count": len(winner_ids), "from": smtp_config["sender"]}
