# Coding Conventions

**Analysis Date:** 2026-03-20

## Languages and Layers

This codebase has two distinct language contexts with separate conventions:

- **Frontend**: TypeScript/React at `frontend/src/`
- **Backend**: Python (FastAPI) at `backend/app/`

---

## Frontend (TypeScript/React)

### Naming Patterns

**Files:**
- React components use PascalCase: `Dashboard.tsx`, `BinaryBrain.tsx`, `AdminLogin.tsx`
- Pages live directly in `frontend/src/pages/` with PascalCase names
- Hooks use camelCase with `use` prefix: `useGameStore.ts`
- Library/utility files use camelCase: `api.ts`, `utils.ts`
- Config files use camelCase: `tailwind.config.js`, `vite.config.ts`

**Components/Functions:**
- Page components: `export default function Dashboard()` — default exports, PascalCase names
- Helper functions: camelCase — `shuffle()`, `showPoints()`, `handleLogout()`
- API functions: camelCase with verb prefix — `fetchLeaderboard()`, `submitGameScore()`, `deleteUser()`, `loginAdmin()`
- Mutation handler functions: `handleSubmit`, `handleLogout` pattern

**Variables:**
- camelCase throughout: `currentQIndex`, `floatingPoints`, `answerStats`
- Boolean state variables: plain `isPlayed`, `hasLoaded`, `isLoading`, `isError`
- Constants: camelCase in component scope (`DECAY_PER_MS`, `MAX_Q_POINTS` — uppercase only for module-level numeric constants)

**Types/Interfaces:**
- PascalCase for TypeScript interfaces: `User`, `GameState`
- Inline type unions for state: `'playing' | 'feedback' | 'finished'`
- Generic typing: `useState<Record<string, string>>({})`, `useState<'hardware' | 'users' | ...>`

### Code Style

**Formatting:**
- No Prettier config detected; consistent 4-space indentation used across all `.ts`/`.tsx` files
- Single quotes for string literals in TypeScript
- Template literals for string interpolation

**Linting:**
- ESLint with `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Config: `frontend/eslint.config.js`
- ecmaVersion 2020, browser globals
- Run command: `npm run lint`

### Import Organization

**Order observed:**
1. React and routing imports (`react`, `react-router-dom`)
2. Third-party libraries (`@tanstack/react-query`, `framer-motion`, `lucide-react`)
3. Internal API layer (`../lib/api`)
4. Internal hooks (`../hooks/useGameStore`)
5. Internal components
6. Static assets (images)

**Path Aliases:**
- Relative imports only — no `@/` alias configured in `vite.config.ts`
- Typical import: `import { api } from '../lib/api'`

### Component Design

**Pattern:**
- All pages are default-exported functional components
- State initialized at top of component body
- `useEffect` for side effects (navigation guards, data loading)
- `useMemo` for derived values (e.g., `gamesLeft` in Dashboard)
- `useQuery` / `useMutation` from `@tanstack/react-query` for all server state
- Zustand store accessed via selector: `useGameStore(state => state.user)`

**Query pattern:**
```typescript
const { data: gameStatus } = useQuery({
    queryKey: ['gameStatus', user?.id],
    queryFn: () => user ? fetchGameStatus(user.id) : Promise.reject('No user'),
    enabled: !!user
})
```

**Mutation pattern:**
```typescript
const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => { login(data); navigate('/dashboard') },
    onError: (err: any) => { setError(err.response?.data?.detail || 'Fallback message') }
})
```

### Error Handling (Frontend)

**Patterns:**
- API errors surfaced via `useMutation` `onError` callback, displayed in local `error` state
- `console.error()` used in catch blocks for non-critical errors (parse failures, background calls)
- Interceptor in `frontend/src/lib/api.ts` handles 401 globally: clears localStorage and redirects to `/`
- Error messages are human-readable Polish strings

**Silent error suppression pattern (common):**
```typescript
try {
    const data = JSON.parse(state)
    // ...
} catch (e) { } // intentionally empty
```

### Logging (Frontend)

- `console.log()` used sparingly for development feedback (score saves)
- `console.error()` used for network/parse failures
- No structured logging library

### State Management

- **Zustand** with persist middleware for user session: `frontend/src/hooks/useGameStore.ts`
- Key: `'checkit-storage'` in `localStorage`
- Server state managed by `@tanstack/react-query` — no manual fetch/cache logic
- Game progress (per-game) saved to `localStorage` under key `binary_brain_state_{userId}`

### Styling

- **Tailwind CSS** v3 with custom theme in `frontend/tailwind.config.js`
- Custom colors: `background`, `surface`, `primary` (#00ff41), `secondary` (#d600ff), `accent` (#f3ea5f)
- Custom fonts: `font-mono` (JetBrains Mono), `font-sans` (Inter)
- Utility merger: `cn()` helper from `frontend/src/lib/utils.ts` using `clsx` + `tailwind-merge`
- Framer Motion used for all animations (`motion.div`, `AnimatePresence`)
- Heavy use of `backdrop-blur`, `bg-white/5`, glass morphism patterns

---

## Backend (Python/FastAPI)

### Naming Patterns

**Files:**
- Router modules: lowercase snake_case — `auth.py`, `game.py`, `it_match.py`, `patch_master_queue.py`
- Service modules: lowercase snake_case — `game_service.py`, `auth_service.py`, `content_service.py`
- Hardware modules: lowercase snake_case — `gpio_manager.py`, `led_manager.py`, `patch_panel.py`

**Functions:**
- Route handlers: lowercase snake_case verbs — `get_user_game_status()`, `submit_game()`, `register_user()`
- Private/internal methods: leading underscore — `_calculate_binary_brain()`, `_load_profanity_list()`
- Utility functions: snake_case — `verify_password()`, `get_password_hash()`, `create_access_token()`

**Variables:**
- snake_case throughout: `game_type`, `user_id`, `final_score`, `duration_ms`
- Constants: UPPER_SNAKE_CASE — `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `DATABASE_URL`

**Classes:**
- PascalCase for all classes: `GameService`, `AuthService`, `SimpleConfig`, `GameSubmit`
- SQLModel models: PascalCase — `User`, `GameScore`, `GameLog`, `SystemConfig`, `EmailTemplate`
- Pydantic schemas: PascalCase with suffix — `UserCreate`, `UserRead`, `GameResult`, `LeaderboardEntry`

### Module Design

**Services pattern:**
- Services are classes instantiated as module-level singletons: `game_service = GameService()`, `auth_service = AuthService()`
- Imported directly in routers: `from app.services.game_service import game_service`

**Router pattern:**
```python
router = APIRouter(tags=["Games"])

@router.get("/status")
async def get_user_game_status(user=Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    ...
```

**Dependency injection:**
- Auth: `user=Depends(get_current_user)` or `_=Depends(get_current_admin)`
- Database: `session: AsyncSession = Depends(get_session)`
- Rate limiting: `@limiter.limit("3/minute")` decorator from `app.limiter`

### Import Organization

**Order:**
1. Standard library imports
2. Third-party imports (fastapi, sqlmodel, pydantic)
3. Internal app imports (`from app.xxx import yyy`)

**Deferred imports pattern (observed):**
Some imports are placed inside function bodies to avoid circular imports:
```python
async def get_user_game_status(...):
    from app.models import SystemConfig
    from sqlmodel import select
    ...
```

### Error Handling (Backend)

**Patterns:**
- `HTTPException` raised directly in routes and services for business logic errors
- HTTP 400 for bad requests, 401 for auth, 403 for forbidden, 409 for conflicts, 500 for unexpected
- Services raise `HTTPException` directly (not just return errors) — routers propagate them
- Generic catch-all in register route: `except Exception as e: raise HTTPException(status_code=500, detail=str(e))`
- Database operations wrapped in try/except with explicit rollback:
```python
try:
    session.add(game_score)
    await session.commit()
    await session.refresh(game_score)
except Exception as e:
    logger.error(f"Failed to save GameScore: {e}")
    await session.rollback()
    raise e
```

### Logging (Backend)

- **Standard `logging` module**, configured in `backend/main.py` via `logging.basicConfig(level=settings.log_level)`
- Each module creates its own logger: `logger = logging.getLogger(__name__)`
- Logger for main app: `logger = logging.getLogger("checkit")`
- `print()` also used for startup messages and debug output in config loader and auth service (`print(f"DEBUG: ...")`)
- Log filter applied to suppress noisy agent sync endpoint logs

### Comments

**When to comment:**
- Inline comments on business logic decisions and temporary workarounds are common
- Commented-out code left in files (e.g., game.py lines 98-114 contain extensive decision rationale)
- `# TODO: Check real DB status` found in `backend/app/routers/admin.py:63`

### Configuration Pattern

- Layered config: defaults → `config.yaml` → environment variables (highest priority)
- Singleton `settings = SimpleConfig()` in `backend/app/simple_config.py`
- Accessed via attribute sections: `settings.game.decay_rate_per_ms`, `settings.auth.admin_user`

---

*Convention analysis: 2026-03-20*
