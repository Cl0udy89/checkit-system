# Concerns

**Analysis Date:** 2026-03-20

## Security

### Critical

**Kiosk user auth is trust-based (by design, but risky if deployed beyond LAN)**
- Location: `backend/app/security.py`, `get_current_user()`
- Issue: `X-User-ID` header is accepted as-is with no cryptographic verification. Any request can impersonate any user by spoofing the header.
- Documented as intentional for local kiosk use, but dangerous if API is internet-exposed.

**Debug `print()` statements leak credentials in production logs**
- Location: `backend/app/routers/auth.py:36`, `backend/app/services/auth_service.py:55`, `backend/app/routers/leaderboard.py:33`
- Issue: `print(f"DEBUG: Login attempt. Username='{form_data.username}', Password='{form_data.password}'")` logs plaintext credentials to stdout.
- Risk: Passwords visible in server logs / journal output.

**TODO: DB health check always returns "connected"**
- Location: `backend/app/routers/admin.py:63`
- Code: `"database": "connected"  # TODO: Check real DB status`
- Risk: Admin health endpoint gives false assurance about DB state.

### Moderate

**JWT secret defaults to weak fallback**
- Location: `backend/app/simple_config.py` — `jwt_secret` has a hardcoded default value
- Risk: If `config.yaml` is missing or misconfigured, predictable JWT secret used in production.

**No CSRF protection**
- Admin panel uses JWT in localStorage; no CSRF tokens. Acceptable for kiosk use but a concern for admin endpoints reachable from non-kiosk browsers.

## Reliability

### High

**Hardware errors silently swallowed in SyncService**
- Location: `backend/app/services/sync_service.py:28`, `:97`, `:187`
- Pattern: `except Exception: pass` — hardware sync failures (GPIO read errors, network timeouts) are silently ignored
- Risk: Client node can lose hardware sync with no alerting; patch panel/solenoid state can become stale with no visibility.

**In-memory `connected_nodes` lost on restart**
- Location: `backend/app/node_state.py`
- Risk: After server restart, all client node heartbeat history is lost; admin panel shows no connected nodes until they re-sync.

**Unsynced scores can be lost if SQLite is corrupted**
- Location: `backend/app/services/sync_service.py` — `synced=False` scores uploaded periodically
- Risk: No retry queue or write-ahead log beyond SQLite's default durability.

### Moderate

**ContentService in-memory cache — questions.csv changes not reloaded**
- Location: `backend/app/services/content_service.py`
- Issue: Questions loaded once at startup; to update content, server must restart.

**Email body_template uses ad-hoc string interpolation**
- Location: `backend/app/models.py:38`
- Comment: `# Jinja2 format or simple f-string placeholders` — format is ambiguous; email service must guess the template style.

## Tech Debt

**No tests at all**
- Zero test files exist; no test framework configured; no CI pipeline.
- All validation is manual/operator-driven.

**`errors.txt` in frontend root**
- Location: `frontend/errors.txt` (1-line empty file)
- Looks like a leftover debugging artifact; should be cleaned up or gitignored.

**`commit_details.patch` in repo root**
- Location: `commit_details.patch`
- A git patch file committed to the repo — likely a debugging or backup artifact.

**Polish-language HTTP error codes**
- Location: Throughout routers — e.g., `"ZAWODY_ZAKONCZONE"`, `"PRZERWA_TECHNICZNA"`, `"ALREADY_PLAYED"`
- Inconsistency: Some error codes are Polish strings, some are English. Frontend must handle both; documentation is Polish-only.

**`requirements.txt` is a superset of server+client**
- Location: `backend/requirements.txt`, `requirements-server.txt`, `requirements-client.txt`
- Risk: Installing `requirements.txt` on a Raspberry Pi client pulls in heavy server-only deps.

## Performance

**100ms hardware sync polling loop**
- Location: `backend/app/services/sync_service.py` — `asyncio.sleep(0.1)` in `_sync_hardware()`
- Impact: 10 req/s per client to the central server from hardware sync alone. Scales linearly with client count. No backpressure.

**No DB connection pool configuration**
- Location: `backend/app/database.py` — default `aiosqlite` settings
- Impact: Under concurrent load (leaderboard polling, game submissions, admin requests), SQLite may bottleneck. Acceptable for kiosk scale but not web-scale.

**Leaderboard fetched with no caching**
- Location: `backend/app/routers/leaderboard.py`
- `ScreenLeaderboard` page polls the leaderboard endpoint frequently; no server-side cache or ETags.

## Fragile Areas

**Hardware GPIO singleton init at import time**
- Location: `backend/app/hardware/gpio_manager.py`
- Pattern: GPIO detection runs at module import, not at app startup. Import order matters; mock/real toggle can behave unexpectedly in test environments.

**Competition state stored as string `"true"`/`"false"` in `SystemConfig`**
- Location: `backend/app/services/game_service.py` — checks `config_value == "true"`
- Fragile: String comparison instead of boolean column; typo in DB value silently disables competition.

**No graceful shutdown for SyncService**
- Location: `backend/app/services/sync_service.py` / `backend/main.py`
- SyncService task is cancelled on shutdown but active HTTP connections to the server node may not complete cleanly.

---

*Concerns analysis: 2026-03-20*
