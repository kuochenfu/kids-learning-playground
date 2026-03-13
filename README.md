# Kids Learning Playground

An interactive, browser-based learning platform built for a 4th-grade student. Features 10 educational mini-games across Math, English, Science, and Logic — with Google OAuth login, real-time score tracking, and a progress dashboard.

**Live:**
- Frontend: https://kids-learning-playground.pages.dev
- Backend API: https://kids-learning-playground-backend.onrender.com

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Go 1.25, Gin framework |
| Database | PostgreSQL 17 (Neon.tech serverless) |
| Auth | Google OAuth 2.0 → httpOnly JWT cookie (HS256, 72h) |
| Deployment | Cloudflare Pages + Render.com |
| CI | GitHub Actions (build + test on every push/PR) |

---

## Games (10)

| Game | Category | Description |
|---|---|---|
| Speed Math Challenge | Math | 60-second timed multiplication & division |
| Word Builder | English | Drag-and-drop letter spelling |
| Sentence Scramble | English | Unscramble word order in sentences |
| Shiritori | English | Word chain — next word starts with last letter |
| Twenty Questions | Logic | Yes/no deductive reasoning game |
| Adverb Charades | English | Learn how adverbs modify actions |
| Science Quiz | Science | 50 curated questions: AI, Robotics, Binary, Hardware |
| Logic Puzzles | Logic | 50 classic riddles and brain teasers |
| Puzzle Time | Creative | Kitten jigsaw puzzles with admin-managed gallery |
| Geometry Quest | Math | Level-based geometry + built-in shape solver |

---

## Quick Start (Local Dev)

### Prerequisites
- Go 1.25+
- Node.js 20+
- PostgreSQL (or a Neon.tech free tier connection), **or** use Docker Compose below

### One-command local dev (Docker Compose)
```bash
cp backend/.env.example backend/.env     # fill in JWT_SECRET and GOOGLE_CLIENT_ID
cp frontend/.env.example frontend/.env.local
docker compose up
# Frontend: http://localhost:5173  |  Backend: http://localhost:8080
```

### Manual setup

**Backend:**
```bash
cd backend
cp .env.example .env          # fill in DB_DSN, JWT_SECRET, GOOGLE_CLIENT_ID
go mod download
go run main.go
# Server starts at http://localhost:8080
```

**Frontend:**
```bash
cd frontend
cp .env.example .env.local    # fill in VITE_GOOGLE_CLIENT_ID, VITE_API_BASE_URL
npm install
npm run dev
# App opens at http://localhost:5173
```

### Environment Variables

**Backend (`backend/.env`):**
```
PORT=8080
DB_DSN=postgres://user:pass@host/dbname?sslmode=require
JWT_SECRET=<random-256-bit-secret>
GOOGLE_CLIENT_ID=<your-oauth-client-id>
ADMIN_EMAIL=you@example.com
PARENT_EMAILS=you@example.com          # comma-separated, get parent role on first login
COOKIE_SECURE=false                    # set true in production
ALLOWED_ORIGINS=http://localhost:5173
```

**Frontend (`frontend/.env.local`):**
```
VITE_GOOGLE_CLIENT_ID=<your-oauth-client-id>
VITE_API_BASE_URL=http://localhost:8080
```

---

## Testing

```bash
# Backend unit tests
go test ./...

# Frontend
cd frontend
npm run test          # Vitest — 8 tests (AuthContext + Lobby)
npm run lint          # ESLint
npm run build         # TypeScript + Vite production build
```

CI runs on every push and pull request to `main` via GitHub Actions (`.github/workflows/ci.yml`).

---

## Project Structure

```
kids-learning-playground/
├── backend/
│   ├── main.go               # Gin server, routes, middleware, seeding
│   ├── config/config.go      # Environment config loader
│   ├── models/models.go      # GORM models (User, GameSession, Question)
│   ├── services/
│   │   ├── auth.go           # Google token validation + JWT + cookie issuance
│   │   └── auth_test.go      # Unit tests (JWT generation + middleware)
│   ├── questions.json        # Embedded question bank (101 records)
│   └── uploads/puzzle/       # Admin-uploaded puzzle images
├── frontend/
│   └── src/
│       ├── App.tsx                  # Router + protected routes + ErrorBoundary
│       ├── context/AuthContext.tsx  # Cookie-based auth state (no token in localStorage)
│       ├── utils/api.ts             # Axios instance with withCredentials: true
│       ├── pages/                   # Login, Lobby, Dashboard, GameWrapper
│       ├── games/                   # 10 game modules
│       ├── layouts/MainLayout.tsx
│       ├── components/
│       │   ├── ErrorBoundary.tsx    # App-level error boundary
│       │   ├── NumericKeypad.tsx    # Shared virtual keypad (Speed Math + Geometry Quest)
│       │   └── Skeleton.tsx         # Loading skeleton components
│       ├── hooks/
│       │   └── useSound.ts          # Web Audio API sound effects
│       └── __tests__/               # Vitest test suite
├── shared/
│   └── types.ts               # Shared TypeScript interfaces
├── docs/                      # Architecture, API, dev guides, devlogs
├── .github/workflows/ci.yml   # GitHub Actions CI pipeline
├── docker-compose.yml         # Local dev environment
├── Dockerfile
└── render.yaml
```

---

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full guide covering Cloudflare Pages, Render.com, and Neon.tech.

---

## Documentation

| Doc | Description |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, auth flow |
| [docs/API.md](docs/API.md) | Full REST API reference |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local setup, tooling, conventions |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide |
| [docs/GAMES.md](docs/GAMES.md) | Per-game design notes |
| [docs/DEVLOG_2026_03_01.md](docs/DEVLOG_2026_03_01.md) | v1.0 feature sprint |
| [docs/DEVLOG_2026_03_12.md](docs/DEVLOG_2026_03_12.md) | v1.0 code review + documentation sprint |
| [docs/DEVLOG_2026_03_13.md](docs/DEVLOG_2026_03_13.md) | v1.1 security + quality + UX improvement sprint |

---

## License

MIT — built for Yui, with love. © 2026 Antigravity & ChenFu
