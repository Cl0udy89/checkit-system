# Structure

**Analysis Date:** 2026-03-20

## Top-Level Layout

```
checkit-system/
├── backend/                  # FastAPI Python application
├── frontend/                 # React/Vite TypeScript SPA
├── content/                  # Game question content (CSV, images) — served as static files
├── config.yaml               # Active runtime config (gitignored, built from example)
├── config-server.example.yaml
├── config-client.example.yaml
├── .env.example
├── .githooks/post-merge      # Git hook for post-pull updates
├── INSTRUKCJA_OBSLUGI.md     # Polish-language operation manual
└── README.md
```

## Backend Structure

```
backend/
├── main.py                   # FastAPI app factory, router registration, lifespan
├── requirements.txt          # Full deps (server + client)
├── requirements-server.txt   # Server-only deps
├── requirements-client.txt   # Client-only deps (RPi-friendly)
├── requirements-core.txt     # Shared base deps
├── assets/
│   └── it_match/
│       └── questions.csv     # IT Match game questions
└── app/
    ├── __init__.py
    ├── database.py           # SQLite engine + async session factory (aiosqlite)
    ├── models.py             # SQLModel ORM: User, GameScore, GameLog, SystemConfig, EmailTemplate
    ├── schemas.py            # Pydantic request/response DTOs
    ├── security.py           # JWT + X-User-ID auth helpers
    ├── limiter.py            # slowapi rate limiter instance
    ├── node_state.py         # In-memory connected_nodes registry
    ├── simple_config.py      # Three-tier config loader (defaults → config.yaml → ENV)
    ├── hardware/
    │   ├── gpio_manager.py   # RPi.GPIO singleton + MockGPIO fallback
    │   ├── patch_panel.py    # Patch panel cable-matching logic
    │   ├── solenoid.py       # Solenoid lock control + pending command queue
    │   └── led_manager.py    # LED strip effects
    ├── routers/
    │   ├── auth.py           # /auth/register, /auth/token
    │   ├── game.py           # /games/content, /games/submit
    │   ├── admin.py          # /admin/* (JWT-protected)
    │   ├── leaderboard.py    # /leaderboard
    │   ├── it_match.py       # IT Match specific endpoints
    │   ├── text_match.py     # Text Match specific endpoints
    │   ├── agent.py          # /agent/sync (client heartbeat)
    │   └── patch_master_queue.py  # Patch Master queue management
    └── services/
        ├── auth_service.py   # User registration, login, validation
        ├── game_service.py   # Score calculation, game completion logic
        ├── content_service.py# CSV question loading and random sampling
        ├── email_service.py  # Email notifications (SMTP)
        └── sync_service.py   # Background hardware polling + score upload
```

## Frontend Structure

```
frontend/
├── index.html                # Vite HTML entry point
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── eslint.config.js
├── public/
│   └── favicon.png
└── src/
    ├── main.tsx              # React bootstrap + QueryClientProvider
    ├── App.tsx               # React Router routes definition
    ├── App.css
    ├── index.css             # Global Tailwind styles
    ├── assets/               # Static images (logos)
    ├── components/
    │   └── InteractiveBackground.tsx  # Animated particle background
    ├── hooks/
    │   └── useGameStore.ts   # Zustand store: user identity, scores, game state
    ├── lib/
    │   ├── api.ts            # Axios instance + request/response interceptors
    │   └── utils.ts          # Shared utility functions
    └── pages/
        ├── Welcome.tsx       # Landing/registration page
        ├── Dashboard.tsx     # Game selection hub
        ├── BinaryBrain.tsx   # Binary Brain game
        ├── PatchMaster.tsx   # Patch Master (cable-matching) game
        ├── ITMatch.tsx       # IT Match quiz game
        ├── TextMatch.tsx     # Text Match game
        ├── Leaderboard.tsx   # Player leaderboard
        ├── ScreenLeaderboard.tsx  # Display-mode leaderboard (for TV/screen)
        ├── Admin.tsx         # Admin panel
        └── AdminLogin.tsx    # Admin JWT login
```

## Content Structure

```
content/
└── binary_brain/
    └── images/               # Question images (pyt_1.webp ... pyt_N.webp)
```
Served as static files at `/api/content/` by FastAPI.

## Key File Locations

| Purpose | Path |
|---|---|
| App entry (backend) | `backend/main.py` |
| App entry (frontend) | `frontend/src/main.tsx` |
| Route definitions | `frontend/src/App.tsx` |
| API client | `frontend/src/lib/api.ts` |
| Global state | `frontend/src/hooks/useGameStore.ts` |
| DB models | `backend/app/models.py` |
| Config loader | `backend/app/simple_config.py` |
| Hardware GPIO | `backend/app/hardware/gpio_manager.py` |
| Background sync | `backend/app/services/sync_service.py` |

## Naming Conventions

**Backend:**
- Files: `snake_case.py`
- Classes: `PascalCase` (models, schemas, services)
- Functions/variables: `snake_case`
- Router modules named by resource: `game.py`, `auth.py`, `admin.py`

**Frontend:**
- Files: `PascalCase.tsx` for components/pages, `camelCase.ts` for utilities
- Components: `PascalCase` React functional components
- Hooks: `use` prefix (`useGameStore`)
- Utility files: lowercase (`api.ts`, `utils.ts`)

## Where to Add New Code

- New game type: `backend/app/routers/` (new router) + `frontend/src/pages/` (new page) + register in `backend/main.py` and `frontend/src/App.tsx`
- New DB model: `backend/app/models.py` + migration via `create_db_and_tables()`
- New config section: `backend/app/simple_config.py` (add property + defaults)
- New hardware control: `backend/app/hardware/` (new module) + mock fallback pattern
- New shared UI component: `frontend/src/components/`

---

*Structure analysis: 2026-03-20*
