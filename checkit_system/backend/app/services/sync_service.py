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
                await self._sync_scores()
                # await self._sync_logs() # If implemented
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

sync_service = SyncService()
