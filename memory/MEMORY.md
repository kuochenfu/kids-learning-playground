# Kids Learning Playground — Memory

## Project Identity
- **Purpose:** Interactive educational platform for a 4th-grade student (Yui)
- **Built by:** Antigravity AI & ChenFu
- **Repo:** github.com/kuochenfu/kids-learning-playground
- **Live:** https://kids-learning-playground.pages.dev (frontend), https://kids-learning-playground-backend.onrender.com (backend)

## Stack
- Frontend: React 19, Vite, TypeScript, Tailwind CSS, Framer Motion, React Router v7
- Backend: Go 1.25, Gin framework, GORM
- DB: PostgreSQL 17 (Neon.tech, Singapore region)
- Auth: Google OAuth 2.0 → app JWT (HS256, 72h)
- Deployment: Cloudflare Pages + Render.com free tier

## Key Files
- `backend/main.go` — entrypoint, all routes, middleware, seeding logic
- `backend/models/models.go` — User, GameSession, Question GORM structs
- `backend/services/auth.go` — Google token validation, JWT signing
- `backend/questions.json` — embedded question bank (101 records, V10_STABLE)
- `frontend/src/App.tsx` — router + protected routes
- `frontend/src/context/AuthContext.tsx` — auth state (user, token, login, logout)
- `frontend/src/pages/GameWrapper.tsx` — dynamic game loader
- `shared/types.ts` — shared TypeScript interfaces

## Games (10)
speed-math, word-builder, sentence-scramble, shiritori, twenty-questions,
adverb-charades, science-quiz, logic-puzzles, puzzle-time, geometry-quest

## Question Bank
- 101 records total: 50 science + 50 logic + 1 meta (version marker)
- Version: DB_VERSION_V10_STABLE
- Seeding: drop & re-seed if meta record missing or count < 100

## Known Issues / Tech Debt
- Admin email (`kuochenfu@gmail.com`) hardcoded in backend — should be env var
- JWT stored in localStorage (XSS risk) — consider httpOnly cookies
- No rate limiting on API
- Puzzle uploads ephemeral on Render free tier (no persistent volume)
- Zero test coverage
- No CI/CD pipeline
- No Docker Compose for local dev
- No .env.example files
- Parent role hardcoded check for frankuo@gmail.com

## Documentation (as of 2026-03-12)
- README.md — full rewrite (stack, games, quickstart, structure)
- docs/ARCHITECTURE.md — system design, auth flow, schema
- docs/API.md — full REST reference
- docs/DEVELOPMENT.md — local setup, conventions, troubleshooting
- docs/DEPLOYMENT.md — Cloudflare/Render/Neon/Docker guide
- docs/GAMES.md — per-game notes and gameIds
