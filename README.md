# Swedish Driving Theory Test Simulator

A local, single-page web app that simulates the Swedish B-license driving theory exam: 65 randomly-drawn questions, a live 50-minute countdown timer, and the real pass mark of 52/65 (80%).

## Running it

This is a static site, but it loads `questions.json` via `fetch`, which browsers block on a plain `file://` page. Serve it with any local web server, for example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## How it works

- On start, 65 questions are drawn at random from the bank in `questions.json` (options are also shuffled per question).
- A 50-minute timer runs in the background and auto-submits the test when it hits zero.
- You can freely navigate between questions, change answers, and flag questions for review before submitting.
- Progress is saved to `localStorage`, so refreshing the page mid-test lets you resume instead of losing your answers.
- After submitting, you get a pass/fail result against the 52/65 threshold and a full review with explanations (and the original book photos, where applicable).

## About the question bank

The bank in `questions.json` currently has 100 questions, each tagged with its `source`:

- **`book-verified`** (38 questions) — taken directly from Körkortonline.se's official *Theory Book* (`theory-book-2026-1-compressed.pdf`), including the book's own explanations and, where relevant, the real photo/diagram from the page (see `images/`).
- **`ai-generated`** (62 questions) — written to match the book's style and difficulty, with every fact grounded in the book's text chapter-by-chapter. These have **not** been reviewed by a human or checked against the real exam, so treat them as extra practice material rather than a guaranteed match for the actual test's phrasing or difficulty.

## Content and copyright

The *Theory Book* PDF and the `book-verified` questions/photos derived from it are © Hagberg Media AB / Körkortonline.se, included here for personal study use. This project is not affiliated with or endorsed by Körkortonline.se or Trafikverket. If you're preparing for the real exam, use Körkortonline.se's own theory test service alongside this simulator, not instead of it.

## Project structure

```
index.html      # UI shell (start / exam / results screens)
style.css       # styling, light + dark mode
app.js          # exam logic: question selection, timer, scoring, review
questions.json  # the 100-question bank
images/         # extracted book photos referenced by book-verified questions
```
