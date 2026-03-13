# Architecture

## Overview

Kids Learning Playground is a **stateless monorepo** with three separate deployment targets:

```
┌─────────────────────┐     HTTPS + cookie     ┌──────────────────────┐
│   React 19 (SPA)    │ ──────────────────────► │   Go / Gin API       │
│   Cloudflare Pages  │ ◄────────────────────── │   Render.com         │
└─────────────────────┘   JSON (withCredentials) └──────────┬───────────┘
                                                             │ SQL (GORM)
                                                   ┌─────────▼────────┐
                                                   │  PostgreSQL 17    │
                                                   │  Neon.tech (SG)   │
                                                   └──────────────────┘
```

---

## Authentication Flow

```
User clicks "Sign in with Google"
        │
        ▼
@react-oauth/google opens OAuth popup (or One Tap)
        │
        ▼  Google ID Token (JWT)
Frontend POSTs credential → POST /api/auth/google
        │
        ▼
Backend validates token via google.golang.org/api/idtoken
        │
        ▼
Backend upserts User row in PostgreSQL
  - re-evaluates role from PARENT_EMAILS env var on every login
        │
        ▼
Backend signs app JWT (HS256, 72h TTL)
  claims: { sub: userID, email, role, exp }
        │
        ▼
Backend sets httpOnly cookie:
  Name=jwt, HttpOnly=true, Path=/
  SameSite=Lax (dev) | SameSite=None;Secure (prod, COOKIE_SECURE=true)
        │
        ▼
Frontend stores only user profile object in localStorage (no token)
All subsequent requests send the cookie automatically (withCredentials: true)

Logout: POST /api/auth/logout → backend clears cookie (MaxAge=-1)
        → frontend clears localStorage user + navigates to /login
```

---

## Directory Structure

```
kids-learning-playground/
├── backend/
│   ├── main.go              # Entrypoint: DB init, seeding, routes, CORS, server start
│   ├── config/
│   │   └── config.go        # Loads env vars with sane defaults
│   ├── models/
│   │   └── models.go        # GORM structs: User, GameSession, Question
│   ├── services/
│   │   └── auth.go          # Google ID token validation + JWT issuance
│   ├── questions.json        # Embedded question bank (go:embed)
│   └── uploads/puzzle/       # Uploaded puzzle images (needs persistent volume)
│
├── frontend/
│   └── src/
│       ├── App.tsx           # BrowserRouter + route definitions
│       ├── main.tsx          # GoogleOAuthProvider wrapper, ReactDOM.render
│       ├── context/
│       │   └── AuthContext.tsx  # user, token, login(), logout() state
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Lobby.tsx        # Game selection grid
│       │   ├── Dashboard.tsx    # Stats & history
│       │   └── GameWrapper.tsx  # Dynamic game loader by :id
│       ├── games/            # One folder per game
│       ├── layouts/
│       │   └── MainLayout.tsx
│       ├── components/       # Shared UI components
│       ├── hooks/            # Custom React hooks
│       └── utils/            # Helpers (shuffleArray, etc.)
│
├── shared/
│   └── types.ts              # TypeScript interfaces shared with backend models
│
└── docs/                     # This folder
```

---

## Backend Route Map

```
GET  /api/ping                       Public — liveness probe
GET  /api/health                     Public — DB status + question count

POST /api/auth/google                Public — Google ID token → sets httpOnly jwt cookie
POST /api/auth/logout                Public — clears jwt cookie (MaxAge=-1)

--- Protected (jwt httpOnly cookie required) ---
POST /api/score                      Save GameSession to DB
GET  /api/scores                     Get current user's game sessions
GET  /api/questions?category=<c>     Fetch 10 random questions (RANDOM() + Fisher-Yates)
GET  /api/puzzles                    List puzzle images (canonical + uploads)
POST /api/puzzles/upload             Upload image (ADMIN_EMAIL only)
DELETE /api/puzzles/:filename        Delete image (ADMIN_EMAIL only)
```

---

## Database Schema

```sql
-- Users created on first Google login
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ,
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ,  -- GORM soft delete
    email       TEXT UNIQUE NOT NULL,
    name        TEXT,
    picture     TEXT,
    role        TEXT DEFAULT 'child'  -- 'child' | 'parent'
);

-- One row per game played
CREATE TABLE game_sessions (
    id            BIGSERIAL PRIMARY KEY,
    created_at    TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ,
    deleted_at    TIMESTAMPTZ,
    user_id       BIGINT NOT NULL REFERENCES users(id),
    game_id       TEXT NOT NULL,       -- e.g. 'speed-math'
    score         INTEGER,
    duration      INTEGER,             -- seconds
    wrong_answers TEXT,                -- JSON array string
    timestamp     TIMESTAMPTZ
);

-- Static question bank, seeded from questions.json
CREATE TABLE questions (
    id         BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    category   TEXT,          -- 'science' | 'logic' | 'meta'
    text       TEXT,
    options    TEXT,          -- JSON array string
    answer     TEXT,
    fact       TEXT
);
CREATE INDEX idx_questions_category ON questions(category);
```

---

## Frontend State Management

- **Auth state:** `AuthContext` (React Context) — `user`, `loading`, `isAuthenticated`
- **Game state:** Local `useState` within each game component
- **Persistence:** User profile object in `localStorage` — read on mount, cleared on logout. No token stored in the browser (it lives in the httpOnly cookie, inaccessible to JS)
- **API calls:** Centralized `src/utils/api.ts` axios instance with `withCredentials: true` — cookie is sent automatically on every request
- **Routing:** React Router v7 with `ProtectedRoute` wrapper that redirects unauthenticated users to `/login`
- **Error handling:** `ErrorBoundary` component wraps the entire router — catches unhandled render errors and shows a friendly recovery UI

---

## Question Seeding Strategy

The backend embeds `questions.json` at compile time via `//go:embed`. On startup:

1. Check for a `meta` record with `text = 'DB_VERSION_V10_STABLE'`
2. If missing or `questions` count < 100 → **drop table** and re-seed
3. Insert in batches of 100

This is a pragmatic approach for a personal project. A migration tool (like `golang-migrate`) would be more appropriate at scale.

---

## File Upload Architecture

Puzzle images are stored on the local filesystem at `backend/uploads/puzzle/`. In the current Render.com deployment, this directory is **ephemeral** — files are lost on redeploy unless a Persistent Volume is attached.

```
POST /api/puzzles/upload
  → Validates: JWT email == kuochenfu@gmail.com
  → Validates: file size ≤ 5MB, extension in [jpg, png, webp]
  → Saves to: ./uploads/puzzle/<original-filename>
  → Returns: { url: "/uploads/puzzle/<filename>" }
```

---

## Security Controls

| Control | Implementation |
|---|---|
| Auth | Google ID token validated via Google's public keys |
| JWT signing | HS256 with `JWT_SECRET` env var |
| JWT transport | httpOnly cookie — inaccessible to JavaScript, XSS-resistant |
| Cookie flags | `SameSite=Lax` (dev) / `SameSite=None;Secure` (prod via `COOKIE_SECURE=true`) |
| CORS | Whitelist only (`ALLOWED_ORIGINS` env) + `AllowCredentials: true` |
| Rate limiting | 60 req/min general, 10 req/min on `/api/auth/google` (in-process, sync.Map) |
| Path traversal | Delete endpoint rejects filenames containing `..` or `/` |
| File uploads | 5 MB limit, extension allowlist (jpg, png, webp) |
| Admin actions | `ADMIN_EMAIL` env var check for upload/delete endpoints |
| Role assignment | `PARENT_EMAILS` env var re-evaluated on every login — no hardcoded emails |
| Sensitive config | All secrets via env vars; `.env.example` committed, `.env` gitignored |
