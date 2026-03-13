# Development Guide

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Go | 1.25+ | Backend runtime |
| Node.js | 20+ | Frontend build |
| PostgreSQL | 15+ | Local database |

A free [Neon.tech](https://neon.tech) database works as a drop-in replacement for local PostgreSQL.

---

## Initial Setup

### 1. Clone and configure

```bash
git clone https://github.com/kuochenfu/kids-learning-playground
cd kids-learning-playground
```

### 2. Backend environment

Create `backend/.env`:
```bash
PORT=8080
DB_DSN=postgres://user:pass@localhost:5432/kids_playground?sslmode=disable
JWT_SECRET=change-me-to-something-random-in-production
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
ALLOWED_ORIGINS=http://localhost:5173
```

### 3. Frontend environment

Create `frontend/.env.local`:
```bash
VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
VITE_API_BASE_URL=http://localhost:8080
```

### 4. Google OAuth setup (one-time)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add Authorized JavaScript Origins:
   - `http://localhost:5173`
   - `https://kids-learning-playground.pages.dev` (production)
4. Copy the Client ID into both `.env` files above

---

## Running Locally

### Backend
```bash
cd backend
go run main.go
# Starts at http://localhost:8080
# DB tables auto-migrate and questions auto-seed on first run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

Both servers must be running simultaneously for the full app to work.

---

## Project Conventions

### Backend (Go)

- **Package layout:** Flat structure for this size — `config`, `models`, `services` each have one file
- **Error responses:** Return `gin.H{"error": "message"}` with appropriate HTTP status
- **Auth middleware:** Calls `c.Set("userID", ...)` and `c.Set("userEmail", ...)` for handlers to read
- **DB access:** GORM is used globally via a package-level `db *gorm.DB` variable initialized in `main.go`
- **Logging:** `log.Printf` / `log.Fatal` for now (no structured logging library)

### Frontend (TypeScript / React)

- **Shared types:** `shared/types.ts` is imported by frontend code. Keep it in sync with Go models.
- **API calls:** All calls go through `axios` with the base URL from `import.meta.env.VITE_API_BASE_URL`
- **Auth:** Access via `const { user, token } = useAuth()` from `AuthContext`
- **Adding a new game:**
  1. Create `frontend/src/games/<game-name>/index.tsx`
  2. Register the route in `App.tsx`
  3. Add the card to the Lobby grid in `Lobby.tsx`
  4. Use the `gameId` string that matches what you POST to `/api/score`

### Styling

- Utility-first with Tailwind CSS
- Custom theme tokens in `tailwind.config.js` (colors: primary, secondary, accent)
- Custom shadow utilities: `shadow-playful`, `shadow-popping`
- Typography: Outfit font, `font-black tracking-widest` for headings

---

## Useful Commands

```bash
# Frontend
npm run dev        # Dev server
npm run build      # Production build (tsc + vite)
npm run lint       # ESLint

# Backend
go run backend/main.go    # Run from repo root
go build -o main backend/main.go && ./main   # Build then run

# DB — check question seeding
curl http://localhost:8080/api/health

# DB — force re-seed (delete the meta record)
# Connect to your PostgreSQL and run:
# DELETE FROM questions WHERE category = 'meta';
# Then restart the backend.
```

---

## Adding Questions

Questions live in `backend/questions.json`. The format is:

```json
{
  "category": "science",
  "text": "What does RAM stand for?",
  "options": ["Random Access Memory", "Read Access Mode", "Rapid Action Module", "Run All Memory"],
  "answer": "Random Access Memory",
  "fact": "RAM is volatile memory — it loses data when power is cut."
}
```

After editing `questions.json`:
1. Bump the version string in the `meta` record at the bottom of the file
2. Update the version check constant in `backend/main.go` (search for `DB_VERSION_`)
3. Redeploy the backend — it will auto-drop and re-seed

---

## Troubleshooting

| Issue | Likely cause | Fix |
|---|---|---|
| Login popup blocked | Google client ID not set | Check `VITE_GOOGLE_CLIENT_ID` in `.env.local` |
| `401 Unauthorized` on API calls | Token not sent or expired | Log out and log back in; check `Authorization` header |
| Questions not updating | Old DB version | Delete meta record (see above) and restart backend |
| CORS error in browser | Origin not in `ALLOWED_ORIGINS` | Add your URL to `ALLOWED_ORIGINS` in backend `.env` |
| Puzzle uploads lost on redeploy | No persistent volume | Expected on Render free tier — attach a disk or use object storage |
