import asyncio
import logging
import aiohttp
from sqlalchemy.future import select
from app.database import get_session
from app.models import GameScore, GameLog
from app.simple_config import settings

logger = logging.getLogger(__name__)

class SyncService:
    def __init__(self):
        self.running = False
        self.task = None

    async def start(self):
        self.running = True
        self.task = asyncio.create_task(self._loop())
        logger.info("Sync Service started.")

    async def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("Sync Service stopped.")

    async def _loop(self):
        while self.running:
            try:
                # Hardware Sync (High Frequency if possible, or just same loop)
                await self._sync_hardware()
                await self._sync_scores()
            except Exception as e:
                logger.error(f"Error in Sync loop: {e}")
            
            await asyncio.sleep(settings.api.sync_interval_seconds)

    async def _sync_scores(self):
        async for session in get_session(): # Context manager usage from generator
            try:
                # Select unsynced scores
                result = await session.execute(select(GameScore).where(GameScore.synced == False).limit(50))
                unsynced = result.scalars().all()

                if not unsynced:
                    return

                logger.info(f"Found {len(unsynced)} unsynced scores. Attempting upload...")
                
                payload = [
                    {
                        "user_id": s.user_id,
                        "game_type": s.game_type,
                        "score": s.score,
                        "duration_ms": s.duration_ms,
                        "played_at": s.played_at.isoformat()
                    }
                    for s in unsynced
                ]

                async with aiohttp.ClientSession() as client:
                    try:
                        async with client.post(
                            settings.api.sync_endpoint, 
                            json=payload, 
                            timeout=10
                        ) as response:
                            if response.status == 200 or response.status == 201:
                                # Mark as synced
                                for s in unsynced:
                                    s.synced = True
                                await session.commit()
                                logger.info(f"Successfully synced {len(unsynced)} scores.")
                            else:
                                logger.warning(f"Sync API returned {response.status}: {await response.text()}")
                    except aiohttp.ClientConnectorError:
                        logger.debug("Sync failed: Network unreachable (Offline mode).")
                    except Exception as e:
                        logger.error(f"Sync request failed: {e}")
            except Exception as e:
                logger.error(f"Database error in SyncService: {e}")
            # get_session handles closing via try-finally in generator if used correctly, 
            # but with `async for` it yields once.
            break # Ensure we only use one session per loop iteration

            pass

    async def _sync_hardware(self):
        """
        Reads local hardware state (if RPi) and sends to Server.
        Receives commands from Server and executes them.
        """
        from app.hardware.gpio_manager import IS_RPI
        from app.hardware.patch_panel import patch_panel
        from app.hardware.solenoid import solenoid
        import time

        if not IS_RPI:
            return

        # 1. Read Local State
        pp_state = patch_panel.get_state()
        
        # Log state changes for better observability
        if not hasattr(self, '_last_pp_state'):
            self._last_pp_state = pp_state
        else:
            for i, current in enumerate(pp_state):
                last = self._last_pp_state[i]
                if current['connected'] != last['connected']:
                    status_text = "PODŁĄCZONY" if current['connected'] else "ODŁĄCZONY"
                    logger.info(f"PATCH PANEL: Kabel na porcie {current['label']} (Pin {current['gpio']}) został {status_text}!")
                    
                    # LED Interactions
                    from app.hardware.led_manager import led_manager
                    is_now_solved = patch_panel.is_solved()
                    was_solved = all(p['connected'] for p in self._last_pp_state)
                    
                    if is_now_solved:
                        led_manager.set_solved()
                        logger.info("🟢 LED: PANEL ROZWIĄZANY (ZIELONY) 🟢")
                    elif was_solved and not is_now_solved:
                        led_manager.set_blocked()
                        logger.info("🔴 LED: PANEL PRZERWANY (CZERWONY) 🔴")
                    elif current['connected']:  # Just a single connection, not yet solved
                        logger.info("✨ LED: IMPULS (WYKRYTO KABEL) ✨")
                        asyncio.create_task(led_manager.trigger_connection_pulse())
                        
            self._last_pp_state = pp_state
        
        # 2. Prepare Payload
        payload = {
            "node_id": settings.node_id,
            "is_rpi": True,
            "timestamp": time.time(),
            "patch_panel": pp_state,
            "solenoid_state": solenoid.get_state()
        }
        
        # 3. Send to Agent Sync Endpoint
        base_url = settings.api.sync_endpoint.replace("/logs", "")
        url = f"{base_url}/agent/sync"
        
        try:
            async with aiohttp.ClientSession() as client:
                async with client.post(url, json=payload, timeout=5) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        
                        # 4. Handle Commands
                        if data.get("trigger_solenoid"):
                            logger.info("⚡ OTRZYMANO KOMENDĘ Z SERWERA: Otwieranie Solenoidu (Zamka)... ⚡")
                            asyncio.create_task(solenoid.open_box())
                            
                        led_cmd = data.get("led_command")
                        if led_cmd:
                            logger.info(f"✨ OTRZYMANO KOMENDĘ LED: {led_cmd} ✨")
                            from app.hardware.led_manager import led_manager
                            led_manager.play_effect(led_cmd)
                            
                    else:
                        logger.warning(f"Agent Sync failed: {resp.status} - {await resp.text()}")
        except Exception as e:
            # logger.error(f"Agent Sync Connection Error: {e}")
            pass


sync_service = SyncService()
