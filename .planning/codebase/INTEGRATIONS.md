# External Integrations

**Analysis Date:** 2026-03-20

## APIs & External Services

**Remote Sync Endpoint (outgoing):**
- Service: Custom CheckIT cloud API (operator-controlled)
- Purpose: Client nodes (Raspberry Pi) POST accumulated game scores and hardware state to a central server
- Endpoint pattern: `CHECKIT_SYNC_ENDPOINT` env var (default: `https://api.checkit.event/v1/logs`)
- Client: `aiohttp.ClientSession` in `backend/app/services/sync_service.py`
- Auth: None explicitly defined (plain POST); endpoint must be operator-secured

**Agent Sync (internal node-to-node):**
- Purpose: RPi client nodes sync hardware state (patch panel, solenoid) to the server node and receive back commands (trigger solenoid, LED effect)
- Endpoint: `POST /api/v1/agent/sync` on the server (router: `backend/app/routers/agent.py`)
- Caller: `backend/app/services/sync_service.py` (`_sync_hardware()`)
- Access control: Restricted to VPN/LAN subnet in Nginx (`docker/nginx.conf`)
- Polling interval: 100ms with 0.5s server-sync cadence

**GitHub Raw (profanity list):**
- Service: `https://raw.githubusercontent.com/zacanger/profane-words/master/words.txt`
- Purpose: Fetches a plain-text profanity word list for nickname validation on registration
- Configured in: `config.yaml` under `security.profanity_list_url`
- No SDK; likely fetched via `requests` at startup

## Data Storage

**Databases:**
- Type: SQLite (single file, async)
- Client: SQLModel (ORM) + `aiosqlite` async driver + SQLAlchemy async engine
- Connection setup: `backend/app/database.py`
- URL pattern: `sqlite+aiosqlite:///{DB_PATH}`
- Default path: `backend/checkit.db` (relative to backend dir)
- Production path: `/app/backend/db/checkit.db` (Docker named volume `checkit_db`)
- Override: `CHECKIT_DB_PATH` env var

**Tables (defined in `backend/app/models.py`):**
- `User` - Registered kiosk players (nick, email, blocked flag)
- `GameScore` - Per-user per-game scores with sync flag
- `GameLog` - Event log entries with sync flag
- `SystemConfig` - Key-value system configuration store
- `EmailTemplate` - Slug-keyed email templates (Jinja2/f-string format)

**File Storage:**
- Local filesystem only; `content/` directory at repo root
- Served by FastAPI as static files at `/api/content` (`backend/main.py`)
- Proxied through Nginx at `/content/`
- Sub-directories: `content/binary_brain/`, `content/it_match/`, `content/text_match/` (CSV question files + images)
- Docker: bind-mounted read-only into backend container

**Caching:**
- None. No Redis, Memcached, or in-process cache layer detected.

## Authentication & Identity

**Admin Auth (JWT):**
- Implementation: Custom JWT using `python-jose` + HS256 algorithm (`backend/app/security.py`)
- Password hashing: `passlib` with bcrypt
- Token endpoint: `POST /api/v1/auth/token` (OAuth2 password flow)
- Admin credentials sourced from config/env (`CHECKIT_ADMIN_USER`, `CHECKIT_ADMIN_PASS`)
- Token expiry: 240 minutes (4 hours) in `security.py`; `.env.example` shows 600 minutes
- Protected routes: `/api/v1/admin/*` and `/api/v1/agent/sync` (also VPN-gated at Nginx level)

**Player Auth (Kiosk / X-User-ID):**
- Implementation: Trusts `X-User-ID` HTTP header sent by the frontend (no JWT for players)
- Players register via `POST /api/v1/auth/register` (nick + email, rate-limited to 3/min)
- Player ID stored in browser (local/session storage in frontend); passed as header on game requests
- Explicitly documented as "insecure for internet-facing apps, fine for local kiosk" (`backend/app/security.py`)

**No third-party auth provider** (no OAuth2 social login, no Supabase, no Auth0, etc.)

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry, Datadog, or equivalent detected.

**Logging:**
- Python standard `logging` module, configured via `logging.basicConfig` in `backend/main.py`
- Log level controlled by `CHECKIT_LOG_LEVEL` / `config.yaml` `system.log_level`
- Noisy `/api/v1/agent/sync` access log suppressed via `EndpointFilter` (`backend/main.py`)
- No structured logging (JSON); plain text to stdout

**Health Check:**
- `GET /health` endpoint returns `{"status": "ok", "node_id": "<id>"}` (`backend/main.py`)
- Proxied through Nginx

## CI/CD & Deployment

**Hosting:**
- Server node: Docker Compose on a Linux host (port 8080 externally via Nginx)
- Client node (Raspberry Pi): Direct Python process via `start_rpi.sh` / `setup_client.sh`
- Allowed frontend dev hosts: `sparklublin.it`, `57.128.247.85` (Vite config)

**CI Pipeline:**
- None detected. No GitHub Actions, GitLab CI, or equivalent config files found.

**Container Images:**
- `docker/backend.Dockerfile` - Python 3.13-slim, installs `requirements-core.txt` + `requirements-server.txt`
- `docker/nginx.Dockerfile` - Nginx serving built frontend SPA + reverse proxying backend

## Environment Configuration

**Required env vars for server production:**
- `CHECKIT_NODE_ID` - e.g. `checkit-server-01`
- `CHECKIT_PLATFORM_ROLE` - `server`
- `CHECKIT_ADMIN_USER` - Admin username
- `CHECKIT_ADMIN_PASS` - Admin password (override default `change-me`)
- `CHECKIT_JWT_SECRET` / `CHECKIT_SECRET_KEY` - JWT signing key (must be long, random)
- `VITE_API_BASE` - Frontend API base URL (Docker build arg)

**Required env vars for client (RPi):**
- `CHECKIT_NODE_ID` - e.g. `checkit-rpi-01`
- `CHECKIT_PLATFORM_ROLE` - `client`
- `CHECKIT_SYNC_ENDPOINT` - Full URL to server sync endpoint
- `CHECKIT_IS_RPI` - `true` to enable real hardware

**Secrets location:**
- `.env` file at repo root (loaded by Docker Compose via `env_file: - .env`)
- `.env.example` at repo root documents all required variables
- `config.yaml` at repo root for YAML-format overrides (mounted read-only in Docker)

## Webhooks & Callbacks

**Incoming:**
- None. No external webhook endpoints defined.

**Outgoing:**
- Score sync: `POST {CHECKIT_SYNC_ENDPOINT}` - Batch JSON payload of unsynced `GameScore` records
- Agent hardware sync: `POST {sync_endpoint_base}/agent/sync` - Hardware state from RPi client to server (internal)

## Email

**Provider:** Custom SMTP (direct `smtplib` via `backend/app/services/email_service.py`)
- No third-party email provider (no SendGrid, Mailgun, AWS SES, etc.)
- SMTP config (host, port, user, password, sender) passed at call time - not from global config or env
- Falls back to mock/log mode when no SMTP host is configured
- Email templates stored in `EmailTemplate` DB table (slugs like `winner_grandmaster`)
- Bulk sending runs SMTP calls in a thread pool executor (blocking calls wrapped in `asyncio`)

## Hardware Integrations (Raspberry Pi)

**GPIO (General Purpose I/O):**
- Library: `RPi.GPIO` (system package; mocked with `MockGPIO` on non-RPi systems)
- Manager: `backend/app/hardware/gpio_manager.py` (singleton `GPIOManager`)
- Uses BCM pin numbering
- Solenoid control: pin 26 (configurable via `config.yaml` `hardware.solenoid_pin`)
- Solenoid sensor: pin 12 (configurable via `hardware.solenoid_sensor_pin`)
- Patch panel: multiple GPIO input pins with pull-up resistors

**LED Strip:**
- Library: `rpi_ws281x` (`PixelStrip`, `Color`)
- Manager: `backend/app/hardware/led_manager.py` (singleton `LEDManager`)
- 87 WS281x NeoPixel LEDs on GPIO pin 18
- Effects: rainbow, chase, police, pulse, blink_red, wire_pulse, timeout_red, hex color
- Commands queued by server, popped by RPi client via agent sync response

**Patch Panel:**
- Driver: `backend/app/hardware/patch_panel.py`
- Physical: multi-port patch panel with GPIO-polled cable detection
- Scan interval: 50ms (configurable via `hardware.patch_panel_scan_interval_ms`)
- State shared between hardware layer and server via agent sync

**Solenoid (Lock):**
- Driver: `backend/app/hardware/solenoid.py`
- Opens a physical lock box; triggered by server command via agent sync
- Open time: 5 seconds default (configurable via `hardware.solenoid_open_time_sec`)

---

*Integration audit: 2026-03-20*
