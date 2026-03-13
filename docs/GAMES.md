# Games Reference

All 10 games save scores via `POST /api/score` on completion using the game's `gameId`.

---

## Speed Math Challenge
**gameId:** `speed-math`
**Category:** Math

60-second timed challenge. Random multiplication and division problems appropriate for 4th grade (up to 12×12 and their inverses). Score based on correct answers within the time limit.

- Input: Direct number keyboard input
- Feedback: Immediate correct/wrong indicator
- Scoring: +10 per correct answer

---

## Word Builder
**gameId:** `word-builder`
**Category:** English

Drag-and-drop spelling game. Letters are presented scrambled and the player arranges them to spell the target word.

---

## Sentence Scramble
**gameId:** `sentence-scramble`
**Category:** English

Unscramble word order to reconstruct a grammatically correct sentence. Timed challenge.

---

## Shiritori
**gameId:** `shiritori`
**Category:** English

Word chain game: the next word must begin with the last letter of the previous word. Classic Japanese classroom game adapted for English vocabulary practice.

---

## Twenty Questions
**gameId:** `twenty-questions`
**Category:** Logic

Deductive reasoning: the computer picks a secret object and the player must identify it by asking only yes/no questions within 20 tries.

---

## Adverb Charades
**gameId:** `adverb-charades`
**Category:** English

Animation-based learning game teaching how adverbs modify verbs. Players identify the adverb being demonstrated.

---

## Science Quiz
**gameId:** `science-quiz`
**Category:** Science

Multiple-choice quiz with 10 random questions pulled from the backend question bank (50 questions total). After each answer, a "Did you know?" educational fact is displayed.

**Topics covered:**
- Artificial Intelligence (AI concepts for kids)
- Drones & UAVs
- Robotics
- Computer Hardware (CPU, RAM, SSD)
- Binary / Coding basics
- Touchscreen technology

**Question bank:** 50 questions (V10_STABLE)
**Shuffle strategy:** DB `ORDER BY RANDOM()` + client-side Fisher-Yates + cache-busting timestamp

---

## Logic Puzzles
**gameId:** `logic-puzzles`
**Category:** Logic

Classic riddles and brain teasers with 4 multiple-choice options. Educational facts after each answer.

**Examples:**
- "What has a face but no legs?" → A clock
- Number and letter sequence puzzles
- Classic lateral thinking riddles

**Question bank:** 50 questions (V10_STABLE)

---

## Puzzle Time
**gameId:** `puzzle-time`
**Category:** Creative

Kitten-themed jigsaw puzzle game. Players select a puzzle from a horizontal carousel, then solve the jigsaw.

**Default puzzle collection (5 themes):**
1. Space Kitten (astronaut)
2. Artist Kitten (beret & palette)
3. Sleeping Kitten (crescent moon)
4. Garden Kitten (sunflowers)
5. Royal Kitten (golden crown)

**Admin features** (restricted to `kuochenfu@gmail.com`):
- Upload new puzzle images (JPG/PNG/WEBP, max 5 MB)
- Delete uploaded images via trash icon

**Technical notes:**
- Default images are served as frontend public assets (no backend required)
- Uploaded images are served from `backend/uploads/puzzle/` (ephemeral on Render free tier)
- Carousel uses `scrollIntoView` with `snap-center` for smooth alignment

---

## Geometry Quest
**gameId:** `geometry-quest`
**Category:** Math

Level-based geometry challenge with two modes:

### Adventure Mode
Three levels, 5 questions each. 180-second timer per level.

| Level | Topics |
|---|---|
| 1 | Basic angles, square perimeter/area, circle radius |
| 2 | Equilateral triangle height, semicircle perimeter, Pythagorean triple |
| 3 | Isosceles area, right triangle trigonometry, circle area |

Scoring: correct answers × 10 × level number.

### Lab Tools (Solver Mode)
Step-by-step geometry calculator. No timer. Interactive input fields with live results.

Supported shapes:
- **Right Triangle** — hypotenuse, legs, area
- **Equilateral Triangle** — height, area, perimeter
- **Square** — area, perimeter from side length
- **Circle** — area, circumference from radius
- **Isosceles Triangle** — height, area, perimeter

Input uses a virtual numeric keypad (0–9 + DEL) for touch-friendly use on tablets.
