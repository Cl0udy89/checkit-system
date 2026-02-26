from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app.routers import auth, game, leaderboard, admin, it_match
from app.services.sync_service import sync_service
from app.simple_config import settings
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.limiter import limiter
import logging

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("checkit")
# Filter out spammy agent sync logs
class EndpointFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        return "/api/v1/agent/sync" not in record.getMessage()

logging.getLogger("uvicorn.access").addFilter(EndpointFilter())

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
    docs_url=None,     # Security: Disable Swagger documentation
    redoc_url=None,    # Security: Disable ReDoc documentation
    openapi_url=None,  # Security: Disable OpenAPI Schema 
    lifespan=lifespan
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS for Frontend (assuming localhost usage mostly, but allow all for local network access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_V1_STR = "/api/v1"

app.include_router(auth.router, prefix=f"{API_V1_STR}/auth", tags=["auth"])

# Global Event Rate Limit to protect the server directly from brute-forcing any valid app route
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    Security middleware limiting overall application request flow
    and injecting standard proxy defense headers.
    """
    response = await call_next(request)
    # Hide technology footprint
    response.headers["Server"] = "Hidden" 
    response.headers["X-Powered-By"] = "None"
    
    # Event context protections
    response.headers["X-Frame-Options"] = "DENY" # Prevent clickjacking on the event monitors
    response.headers["X-Content-Type-Options"] = "nosniff" # Stop MIME type sniffing
    response.headers["X-XSS-Protection"] = "1; mode=block" # Simple XSS barrier 
    
    return response
app.include_router(game.router, prefix=f"{API_V1_STR}/games", tags=["game"])
app.include_router(it_match.router, prefix=f"{API_V1_STR}/game/it-match", tags=["it-match"])
app.include_router(leaderboard.router, prefix=f"{API_V1_STR}/leaderboard", tags=["leaderboard"])
app.include_router(admin.router, prefix=f"{API_V1_STR}/admin", tags=["admin"])

from app.routers import agent, patch_master_queue
app.include_router(agent.router, prefix=f"{API_V1_STR}/agent", tags=["agent"])
app.include_router(patch_master_queue.router, prefix=f"{API_V1_STR}/game/patch-master/queue", tags=["patch-master-queue"])

# Mount content directory for images
from pathlib import Path
CONTENT_DIR = Path(__file__).parent.parent / "content"
app.mount("/content", StaticFiles(directory=CONTENT_DIR), name="content")

@app.get("/health")
def health_check():
    return {"status": "ok", "node_id": settings.node_id}
