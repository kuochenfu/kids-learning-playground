# Deployment Guide

## Infrastructure Overview

| Service | Provider | URL |
|---|---|---|
| Frontend (SPA) | Cloudflare Pages | https://kids-learning-playground.pages.dev |
| Backend (API) | Render.com (free tier) | https://kids-learning-playground-backend.onrender.com |
| Database | Neon.tech (serverless PG) | Private DSN |

---

## Backend — Render.com

### Setup (one-time)

1. Connect your GitHub repo to Render.com
2. Create a new **Web Service**
3. Use these build settings:

| Field | Value |
|---|---|
| Build Command | `go build -o main backend/main.go` |
| Start Command | `./main` |
| Runtime | Go |
| Region | Frankfurt (or closest to your users) |

4. Set **Environment Variables** in the Render dashboard:

| Key | Description |
|---|---|
| `PORT` | `10000` (Render assigns this port) |
| `DB_DSN` | Your Neon.tech connection string |
| `JWT_SECRET` | Random 256-bit secret (generate with `openssl rand -hex 32`) |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `ALLOWED_ORIGINS` | `https://kids-learning-playground.pages.dev` |

### Deploying updates

Render auto-deploys on every push to `main`. Manual re-deploy:
```
Render Dashboard → Service → Manual Deploy → Deploy latest commit
```

### Persistent storage for puzzle uploads

The Render free tier uses an **ephemeral filesystem**. Uploaded puzzles will be lost on redeploy.

**Option A (free):** Pre-bundle your puzzle images as public assets in the frontend — they never need upload/delete.

**Option B (paid):** Attach a Render **Disk** to the service, mount at `/root/uploads`, and set `UPLOAD_DIR=/root/uploads` in env.

**Option C:** Use an object storage service (Cloudflare R2, AWS S3). Requires code changes in `backend/main.go` upload/list handlers.

---

## Frontend — Cloudflare Pages

### Setup (one-time)

1. Connect your GitHub repo to Cloudflare Pages
2. Use these build settings:

| Field | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `frontend` |

3. Set **Environment Variables** in Cloudflare Pages settings:

| Key | Value |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `VITE_API_BASE_URL` | `https://kids-learning-playground-backend.onrender.com` |

### Deploying updates

Cloudflare Pages auto-deploys on every push to `main`. Preview deployments are created for every PR.

---

## Database — Neon.tech

### Setup (one-time)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a project in **Asia Southeast 1 (Singapore)** for lowest latency from Taiwan
3. Copy the connection string: `postgres://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
4. Paste into `DB_DSN` environment variable on Render

### Schema management

GORM `AutoMigrate` handles table creation on backend startup — no manual schema migrations required. The question bank is seeded automatically from the embedded `questions.json`.

---

## Docker (Self-Hosted Option)

A Dockerfile is provided for running the backend anywhere that supports containers.

### Build and run

```bash
# From repo root
docker build -t kids-playground-backend .

docker run -p 8080:8080 \
  -e DB_DSN="postgres://..." \
  -e JWT_SECRET="your-secret" \
  -e GOOGLE_CLIENT_ID="your-client-id" \
  -e ALLOWED_ORIGINS="http://localhost:5173" \
  kids-playground-backend
```

### Mount uploads directory (optional)

```bash
docker run -p 8080:8080 \
  -v /host/path/uploads:/root/uploads \
  -e DB_DSN="..." \
  kids-playground-backend
```

---

## Post-Deployment Checklist

- [ ] `/api/ping` returns `{ "message": "pong" }`
- [ ] `/api/health` shows `"status": "ok"` and `"questions": 101`
- [ ] Google login completes and returns a JWT
- [ ] Dashboard loads with game history
- [ ] At least one game saves a score successfully
- [ ] Render origin is in `ALLOWED_ORIGINS` (no CORS errors in browser console)
- [ ] Google Cloud Console has both `localhost:5173` and the Cloudflare URL as authorized origins

---

## Environment Rotation

If you need to rotate the JWT secret:
1. Set the new `JWT_SECRET` in Render dashboard
2. Trigger a redeploy
3. All existing JWTs become invalid — users must log in again (72-hour TTL anyway)
