# Technology Stack

**Analysis Date:** 2026-03-20

## Languages

**Primary:**
- Python 3.13 - Backend API, hardware control, services (`backend/`)
- TypeScript 5.9 - Frontend SPA (`frontend/src/`)

**Secondary:**
- Python 3.x - Utility scripts (`convert_images.py`, `diagnose_rpi.py`, `fix_admin.py`)
- Shell (bash/zsh) - Deployment and startup scripts (`start.sh`, `start_rpi.sh`, `setup_client.sh`, `update.sh`)

## Runtime

**Backend Environment:**
- Python 3.13 (Dockerfile: `python:3.13-slim`)
- ASGI server: Uvicorn (with `standard` extras)

**Frontend Environment:**
- Node.js (version not pinned; no `.nvmrc`)
- Package manager: npm
- Lockfile: `frontend/package-lock.json` (present)

## Frameworks

**Backend:**
- FastAPI `>=0.110.0` - REST API framework (`backend/main.py`)
- SQLModel `>=0.0.14` - ORM over SQLAlchemy + Pydantic (`backend/app/models.py`)
- Pydantic `>=2.9.2` - Data validation and settings
- Pydantic Settings `>=2.2.0` - Environment-variable configuration

**Frontend:**
- React 19.2 - UI library (`frontend/src/`)
- React Router DOM 7.13 - Client-side routing (`frontend/src/App.tsx`)
- TanStack React Query 5 - Server state / data fetching (`frontend/src/main.tsx`)
- Zustand 5.0 - Client-side state management
- Framer Motion 12 - Animations
- Tailwind CSS 3.4 - Utility-first CSS (`frontend/tailwind.config.js`)

**Build / Dev:**
- Vite 7.3 - Frontend build tool and dev server (`frontend/vite.config.ts`)
- TypeScript ESLint 8.48 - Linting (`frontend/eslint.config.js`)
- PostCSS + Autoprefixer - CSS processing (`frontend/postcss.config.js`)

**Testing:**
- No testing framework detected.

## Key Dependencies

**Backend Critical:**
- `uvicorn[standard] >=0.27.0` - Production ASGI server
- `aiosqlite >=0.19.0` - Async SQLite driver (pairs with SQLModel)
- `python-jose[cryptography] ==3.3.0` - JWT encoding/decoding (`backend/app/security.py`)
- `passlib[bcrypt] ==1.7.4` - Password hashing (admin JWT auth)
- `slowapi >=0.1.9` - Rate limiting middleware (`backend/main.py`)
- `apscheduler ==3.10.4` - Background task scheduling
- `aiohttp ==3.9.1` - Async HTTP client (used by sync service)
- `requests ==2.31.0` - Sync HTTP client (misc use)
- `pyyaml >=6.0.1` - YAML config loading (`backend/app/simple_config.py`)

**Backend Hardware (Raspberry Pi only):**
- `RPi.GPIO` - GPIO pin control (installed via system or apt; mocked on non-RPi)
- `rpi_ws281x` - WS281x NeoPixel LED strip control (`backend/app/hardware/led_manager.py`)
- `adafruit-circuitpython-neopixel` - Alternative NeoPixel library
- `adafruit-blinka` - Adafruit hardware abstraction

**Frontend Critical:**
- `axios ^1.13.5` - HTTP client for API calls
- `lucide-react ^0.574.0` - Icon library
- `clsx ^2.1.1` + `tailwind-merge ^2.2.1` - Conditional className utilities

## Configuration

**Backend Configuration (layered, highest priority wins):**
1. Hardcoded defaults in `backend/app/simple_config.py`
2. `config.yaml` at repo root (YAML file, mounted read-only in Docker)
3. Environment variables (prefixed `CHECKIT_`)

**Key env vars:**
- `CHECKIT_NODE_ID` - Unique node identifier
- `CHECKIT_PLATFORM_ROLE` - `server` or `client`
- `CHECKIT_ADMIN_USER` / `CHECKIT_ADMIN_PASS` - Admin credentials
- `CHECKIT_JWT_SECRET` - JWT signing secret (`CHECKIT_SECRET_KEY` alias in `.env.example`)
- `CHECKIT_SYNC_ENDPOINT` - URL the client node posts scores/state to
- `CHECKIT_SYNC_INTERVAL_SECONDS` / `CHECKIT_RETRY_INTERVAL_SECONDS`
- `CHECKIT_DB_PATH` - Path to SQLite database file
- `CHECKIT_IS_RPI` - Force Raspberry Pi hardware mode (`true`/`false`)
- `CHECKIT_LOG_LEVEL` - Logging verbosity

**Frontend Configuration:**
- `VITE_API_BASE` - Base URL for API (set at build time via Docker build arg)

**Build Config Files:**
- `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`
- `frontend/vite.config.ts`
- `frontend/tailwind.config.js`
- `frontend/postcss.config.js`
- `frontend/eslint.config.js`

## Platform Requirements

**Development:**
- Python 3.13 for backend
- Node.js + npm for frontend (`frontend/`)
- Non-RPi: GPIO and LED libraries auto-mock; full simulation mode available

**Production:**
- Docker + Docker Compose (`docker-compose.yml`)
- Backend container: `docker/backend.Dockerfile` (Python 3.13-slim, port 8000)
- Frontend served by Nginx container: `docker/nginx.Dockerfile` (port 8080 external)
- SQLite persisted in Docker named volume `checkit_db` at `/app/backend/db/`
- `config.yaml` bind-mounted read-only into backend container
- `content/` directory bind-mounted read-only for static images
- Raspberry Pi deployment: `start_rpi.sh` / `setup_client.sh` (no Docker, direct Python)

---

*Stack analysis: 2026-03-20*
