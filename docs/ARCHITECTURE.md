# Architecture

## Overview

Kids Learning Playground is a **stateless monorepo** with three separate deployment targets:

```
┌─────────────────────┐     HTTPS      ┌──────────────────────┐
│   React 19 (SPA)    │ ─────────────► │   Go / Gin API       │
│   Cloudflare Pages  │ ◄───────────── │   Render.com         │
└─────────────────────┘   JSON + JWT   └──────────┬───────────┘
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
@react-oauth/google opens OAuth popup
        │
        ▼  Google ID Token (JWT)
Frontend POSTs token → POST /api/auth/google
        │
        ▼
Backend validates token via google.golang.org/api/idtoken
        │
        ▼
Backend upserts User row in PostgreSQL (email, name, picture)
        │
        ▼
Backend signs app JWT (HS256, 72h TTL)
  claims: { sub: userID, email, role, exp }
        │
        ▼
Frontend stores JWT in localStorage
All subsequent requests include: Authorization: Bearer <token>
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

POST /api/auth/google                Public — Google ID token → App JWT

--- Protected (Authorization: Bearer <jwt>) ---
POST /api/score                      Save GameSession to DB
GET  /api/achievements               Get current user's game sessions
GET  /api/questions?category=<c>     Fetch 10 random questions (RANDOM() + Fisher-Yates)
GET  /api/puzzles                    List puzzle images (canonical + uploads)
POST /api/puzzles/upload             Upload image (admin: kuochenfu@gmail.com only)
DELETE /api/puzzles/:filename        Delete image (admin only)
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

- **Auth state:** `AuthContext` (React Context) — `user`, `token`, `isLoading`
- **Game state:** Local `useState` within each game component
- **Persistence:** JWT in `localStorage` — read on mount, cleared on logout
- **Routing:** React Router v7 with `ProtectedRoute` wrapper that redirects unauthenticated users to `/login`

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
| CORS | Whitelist only (`ALLOWED_ORIGINS` env, defaults to localhost + production) |
| Path traversal | Delete endpoint rejects filenames containing `..` or `/` |
| File uploads | 5 MB limit, extension allowlist |
| Admin actions | JWT email check for upload/delete endpoints |
| Sensitive config | All secrets via env vars, never in source |
