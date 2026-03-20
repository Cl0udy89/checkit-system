# Architecture

**Analysis Date:** 2026-03-20

## Pattern Overview

**Overall:** Distributed Client-Server Kiosk System with Hardware Integration

**Key Characteristics:**
- Two deployment roles share the same codebase: `server` (central node) and `client` (Raspberry Pi game terminal), distinguished by `config.yaml` `system.platform_role`
- Backend is a FastAPI async Python application; frontend is a React SPA served via Nginx
- Hardware control (GPIO, solenoid lock, LED strip, patch panel) is abstracted behind a mock/real GPIO layer so the same code runs on both RPi and non-RPi hosts
- Clients continuously sync hardware state and game scores to the central server via HTTP polling (no WebSocket)
- SQLite + aiosqlite is used as the local database on each node; scores are marked `synced=False` until uploaded to the server

## Layers

**Routers (HTTP Layer):**
- Purpose: FastAPI route handlers, request validation, HTTP-level auth enforcement
- Location: `backend/app/routers/`
- Contains: `auth.py`, `game.py`, `admin.py`, `leaderboard.py`, `it_match.py`, `text_match.py`, `agent.py`, `patch_master_queue.py`
- Depends on: Services, Models, Schemas, Security, Hardware abstractions
- Used by: Frontend via HTTP; client nodes via `SyncService`

**Services (Business Logic Layer):**
- Purpose: Domain logic, score calculation, data persistence orchestration
- Location: `backend/app/services/`
- Contains: `game_service.py`, `auth_service.py`, `content_service.py`, `email_service.py`, `sync_service.py`
- Depends on: Models, Database session, Hardware abstractions, Config
- Used by: Routers

**Models (Data Layer):**
- Purpose: SQLModel ORM table definitions and Pydantic request/response schemas
- Location: `backend/app/models.py` (ORM), `backend/app/schemas.py` (Pydantic DTOs)
- Contains: `User`, `GameScore`, `GameLog`, `SystemConfig`, `EmailTemplate`
- Depends on: SQLModel, SQLite via aiosqlite
- Used by: All routers and services

**Hardware Abstraction Layer:**
- Purpose: Isolate GPIO/hardware interactions; provide mock implementations for non-RPi hosts
- Location: `backend/app/hardware/`
- Contains: `gpio_manager.py` (singleton GPIOManager, auto-detects RPi.GPIO), `patch_panel.py`, `solenoid.py`, `led_manager.py`
- Depends on: `RPi.GPIO` (real) or `MockGPIO` (fallback)
- Used by: `game_service.py`, `routers/game.py`, `routers/agent.py`, `sync_service.py`

**Config Layer:**
- Purpose: Three-tier config resolution: defaults → `config.yaml` → environment variables
- Location: `backend/app/simple_config.py`
- Singleton: `settings` object imported across all backend modules
- Sections: `system`, `api`, `game`, `hardware`, `auth`, `security`

**Frontend (SPA):**
- Purpose: Player-facing kiosk game UI and admin panel
- Location: `frontend/src/`
- Contains: Page components per game/view, one shared API client, one global store
- Depends on: Backend REST API via axios; state in Zustand + localStorage

## Data Flow

**Player Game Flow:**

1. Player registers via `POST /api/v1/auth/register` → `auth_service.register_user()` → `User` saved to SQLite
2. Frontend stores `user.id` in Zustand store (`checkit-storage` in localStorage)
3. Subsequent requests inject `X-User-ID` header automatically via axios interceptor (`frontend/src/lib/api.ts`)
4. Player fetches game content via `GET /api/v1/games/content/{game_type}` → `content_service.get_questions()` reads CSV files from `content/`
5. On completion, frontend posts `POST /api/v1/games/submit` with answers and `duration_ms`
6. `game_service.finish_game()` validates, calculates score (with time decay), saves `GameScore` with `synced=False`
7. For Patch Master: hardware state from `patch_panel.is_solved()` is verified; if score ≥ 5000, solenoid opens via `solenoid.open_box()`

**Client-to-Server Hardware Sync Flow:**

1. `SyncService` runs as an asyncio background task started at app lifespan (`backend/main.py`)
2. Every 100ms, `_sync_hardware()` reads patch panel and solenoid state from GPIO
3. If on RPi (`IS_RPI=True`), state is POSTed to `POST /api/v1/agent/sync` on the central server
4. Server (`routers/agent.py`) stores hardware state in memory via `patch_panel.update_remote_state()` and updates `connected_nodes` dict
5. Server returns pending commands (solenoid open, LED effects); client executes them
6. Every `sync_interval_seconds` (default 60s), `_sync_scores()` uploads unsynced `GameScore` records to `POST /api/v1/logs` on the server

**Admin Command Flow:**

1. Admin authenticates via `POST /api/v1/auth/token` → JWT Bearer token stored in `localStorage`
2. Bearer token auto-injected by axios interceptor; all `/admin/*` routes require `get_current_admin()` dependency
3. Admin can trigger solenoid via `POST /api/v1/admin/hardware/solenoid` → enqueues command via `solenoid.add_pending_command()`
4. On next client heartbeat (`/agent/sync`), the pending command is returned and the RPi executes it

**State Management:**
- Frontend: Zustand store (`useGameStore`) persisted to `localStorage` under key `checkit-storage`; user identity and score held here
- Backend: `connected_nodes` dict (`backend/app/node_state.py`) holds in-memory heartbeat registry; lost on restart
- Competition state (`competition_active`, `pm_total_time`, etc.) stored in `SystemConfig` table in SQLite

## Key Abstractions

**GPIO Mock/Real Toggle:**
- Purpose: Enables running the same hardware code in development without RPi hardware
- Location: `backend/app/hardware/gpio_manager.py`
- Pattern: At import time, attempts `import RPi.GPIO`; falls back to `MockGPIO` class if unavailable. `IS_RPI` boolean exported to callers. `CHECKIT_IS_RPI=true` env var forces `IS_RPI=True` for UI display while still using mock GPIO.

**ContentService (CSV-backed Question Store):**
- Purpose: In-memory question cache loaded from CSV files at startup
- Location: `backend/app/services/content_service.py`
- Pattern: Singleton `content_service` instance; `get_questions(game_type, limit)` returns random sample; `get_correct_answer(game_type, question_id)` used for server-side scoring

**SyncService (Background Worker):**
- Purpose: Continuous hardware polling and periodic score upload on client nodes
- Location: `backend/app/services/sync_service.py`
- Pattern: Asyncio task loop started/stopped in FastAPI lifespan. Single singleton `sync_service` instance.

**SimpleConfig (Three-Tier Config):**
- Purpose: Config resolution: hardcoded defaults → `config.yaml` shallow merge → ENV overrides
- Location: `backend/app/simple_config.py`
- Pattern: Singleton `settings` with property accessors per section (`.system`, `.game`, `.hardware`, etc.)

**Dual Authentication:**
- Purpose: Two separate auth modes for different principals
- Location: `backend/app/security.py`
- Pattern: Admin uses JWT Bearer tokens (`get_current_admin()`). Kiosk players use header-based identity: `X-User-ID` header trusted as user ID (`get_current_user()`). Explicitly documented as insecure for non-kiosk deployments.

## Entry Points

**Backend Application:**
- Location: `backend/main.py`
- Triggers: `uvicorn backend.main:app` or via supervisor/Docker
- Responsibilities: Creates FastAPI app, registers all routers under `/api/v1`, adds CORS and rate-limit middleware, runs DB init and starts `SyncService` via async lifespan context manager, mounts `content/` as static files at `/api/content`

**Frontend Application:**
- Location: `frontend/src/main.tsx`
- Triggers: Vite dev server or nginx serving built static files
- Responsibilities: Bootstraps React with `QueryClientProvider` (React Query) and renders `App.tsx`

**App Router:**
- Location: `frontend/src/App.tsx`
- Responsibilities: Defines all routes. Each game is a full page: `/game/binary-brain`, `/game/patch-master`, `/game/it-match`, `/game/text-match`. Also: `/dashboard`, `/leaderboard`, `/screen` (display leaderboard), `/admin`

**Health Check:**
- Location: `backend/main.py` — `GET /health`
- Returns: `{"status": "ok", "node_id": "..."}` — used to verify server reachability from client setup scripts

## Error Handling

**Strategy:** FastAPI HTTPException raised in routers and services; no global error wrapper beyond FastAPI defaults.

**Patterns:**
- Business rule violations raise `HTTPException` with meaningful detail strings (often Polish-language codes: `"ZAWODY_ZAKONCZONE"`, `"ALREADY_PLAYED"`, `"PRZERWA_TECHNICZNA"`)
- Frontend axios interceptor catches 401 responses and clears either admin token or kiosk user state, then redirects to appropriate page
- Hardware errors in `SyncService._sync_hardware()` are silently swallowed (`pass`) to prevent polling interruption
- Config loading errors fall back to hardcoded defaults with console warnings

## Cross-Cutting Concerns

**Logging:** `logging.basicConfig` configured from `settings.log_level`. All modules use `logging.getLogger(__name__)`. Uvicorn access logs filtered to suppress `/api/v1/agent/sync` noise.

**Rate Limiting:** `slowapi` limiter (`backend/app/limiter.py`) applied per route with decorators. Register: 3/min; Login: 5/min. SlowAPIMiddleware added globally.

**Validation:** Input validation via Pydantic models in routers. Nick profanity check and email domain blocklist in `auth_service.py`. Swagger/ReDoc/OpenAPI endpoints disabled in production (`docs_url=None`).

**Authentication:** Admin: JWT HS256, 4-hour expiry, secret from `settings.security.jwt_secret`. Kiosk users: `X-User-ID` header only — no cryptographic verification (by design for local kiosk).

**Competition State:** Checked on every game content fetch and submission. Stored as `SystemConfig` key `competition_active` with values `"true"`, `"false"`, or `"technical_break"`.

---

*Architecture analysis: 2026-03-20*
