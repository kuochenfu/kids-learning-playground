# API Reference

Base URL: `https://kids-learning-playground-backend.onrender.com`
Local dev: `http://localhost:8080`

All protected endpoints require:
```
Authorization: Bearer <jwt>
```

---

## Public Endpoints

### GET /api/ping
Liveness probe.

**Response:**
```json
{ "message": "pong" }
```

---

### GET /api/health
Database connectivity check and question bank stats.

**Response:**
```json
{
  "status": "ok",
  "db": "connected",
  "questions": 101,
  "categories": ["science", "logic", "meta"]
}
```

---

### POST /api/auth/google
Exchange a Google ID Token for an application JWT.

**Request:**
```json
{ "token": "<google-id-token>" }
```

**Response (200):**
```json
{
  "token": "<app-jwt>",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Yui",
    "picture": "https://lh3.googleusercontent.com/...",
    "role": "child"
  }
}
```

**Errors:**
- `400` — Missing or malformed token
- `401` — Token validation failed

---

## Protected Endpoints

### POST /api/score
Save a completed game session.

**Request:**
```json
{
  "gameId": "speed-math",
  "score": 850,
  "duration": 60,
  "wrongAnswers": ["12×7", "144÷9"]
}
```

**Response (200):**
```json
{ "message": "Score saved", "sessionId": 42 }
```

---

### GET /api/achievements
Retrieve all game sessions for the authenticated user.

**Response (200):**
```json
[
  {
    "id": 42,
    "gameId": "speed-math",
    "score": 850,
    "duration": 60,
    "wrongAnswers": ["12×7"],
    "timestamp": "2026-03-12T10:00:00Z"
  }
]
```

---

### GET /api/questions
Fetch 10 randomly selected questions for a given category.

**Query Parameters:**

| Parameter | Required | Values | Description |
|---|---|---|---|
| `category` | Yes | `science`, `logic` | Question category |
| `_t` | No | Unix ms timestamp | Cache-busting (auto-added by client) |

**Response (200):**
```json
[
  {
    "id": 7,
    "category": "science",
    "text": "What does CPU stand for?",
    "options": ["Central Processing Unit", "Computer Personal Unit", "Core Processing Utility", "Central Program Upload"],
    "answer": "Central Processing Unit",
    "fact": "A modern CPU can execute billions of instructions per second."
  }
]
```

**Notes:**
- Server applies `ORDER BY RANDOM()` before the client-side Fisher-Yates shuffle
- Returns exactly 10 questions or fewer if the bank is smaller

---

### GET /api/puzzles
List all available puzzle images (default + admin-uploaded).

**Response (200):**
```json
[
  {
    "name": "Space Kitten",
    "url": "/assets/puzzles/space-kitten.png",
    "isDefault": true
  },
  {
    "name": "my-upload.jpg",
    "url": "/uploads/puzzle/my-upload.jpg",
    "isDefault": false
  }
]
```

---

### POST /api/puzzles/upload
Upload a new puzzle image. **Admin only** (`kuochenfu@gmail.com`).

**Request:** `multipart/form-data`

| Field | Type | Constraints |
|---|---|---|
| `image` | file | Max 5 MB, extensions: jpg, png, webp |

**Response (200):**
```json
{ "url": "/uploads/puzzle/my-image.png", "filename": "my-image.png" }
```

**Errors:**
- `403` — Not admin
- `400` — File too large or invalid extension
- `500` — Save failed

---

### DELETE /api/puzzles/:filename
Delete an uploaded puzzle image. **Admin only**.

**Path Parameter:** `filename` — must not contain `..` or `/`

**Response (200):**
```json
{ "message": "Deleted" }
```

**Errors:**
- `403` — Not admin
- `400` — Invalid filename (path traversal attempt)
- `404` — File not found
