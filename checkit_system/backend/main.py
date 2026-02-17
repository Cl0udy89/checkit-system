from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app.routers import auth, game, leaderboard, admin
from app.services.sync_service import sync_service
from app.config_loader import settings
import logging

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("checkit")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"System Node ID: {settings.node_id}")
    logger.info("Initializing Database...")
    await init_db()
    
    # Initialize hardware here later
    # app.state.hardware = ...
    
    logger.info("Starting Sync Service...")
    await sync_service.start()
    
    yield
    
    logger.info("Stopping Sync Service...")
    await sync_service.stop()
    
    # Cleanup hardware
    logger.info("Shutting down...")

app = FastAPI(
    title="CheckIT System API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for Frontend (assuming localhost usage mostly, but allow all for local network access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(game.router, prefix="/api/v1")
app.include_router(leaderboard.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")

# Mount content directory for images
from pathlib import Path
CONTENT_DIR = Path(__file__).parent.parent / "content"
app.mount("/content", StaticFiles(directory=CONTENT_DIR), name="content")

@app.get("/health")
def health_check():
    return {"status": "ok", "node_id": settings.node_id}
