# Memory Game

A small, polished browser-based **Memory Game** built with vanilla HTML, CSS, and JavaScript. The goal is to flip tiles and match all pairs as quickly and efficiently as possible.

## Features

- **Welcome screen** with clear instructions and a prominent **Start Game** button.
- **4x4 grid** (16 tiles) with **8 distinct icons**, each appearing exactly twice.
- **Tile flipping logic**:
  - At most **two tiles can be flipped at once**.
  - Matching tiles stay revealed; mismatches flip back after a brief delay.
- **Winning state**:
  - Shows a **win overlay** with total time and move count.
  - Options to **play again** or **return to the welcome screen**.
- **Responsive UI**:
  - Grid is centered with a fixed max width on desktop.
  - Layout gracefully adapts to tablets and mobile devices.
- **Dark / Light mode**:
  - Toggle button in the header, with preference persisted in `localStorage`.
- **Timer and moves counter**:
  - Timer starts on the first tile flip.
  - Tracks and displays number of moves.
- **REST-style API usage (via `fetch`)**:
  - Icons are loaded from `icons.json` via `fetch`, demonstrating HTTP-based data loading.

## Project Structure

- `index.html` – Main page structure, welcome screen, game UI, and win overlay.
- `styles.css` – All layout, theming (including dark mode), and animations.
- `script.js` – Game logic and interactions.
- `icons.json` – Simple JSON "API" describing available tile icons.
- `package.json` – Minimal metadata and a `start` script for serving the app locally.

## Getting Started

You can simply open `index.html` in a modern browser, or run a small static server for a more realistic environment:

```bash
# Option 1: open directly
open index.html

# Option 2: if you have Node installed, from the project folder:
npm install serve --global     # if you don't already have `serve`
serve .
```

Then open the printed URL (e.g. `http://localhost:3000`) in your browser.

## How the Game Works (High-Level)

1. On load, `script.js` calls `fetch('./icons.json')` to retrieve an array of emoji icons.
2. When you press **Start Game**, the script:
   - Builds a tile list with each icon duplicated once (so each appears twice).
   - Shuffles the list using the **Fisher–Yates** algorithm.
   - Renders a 4x4 grid of clickable tiles.
3. Clicking a tile:
   - Flips it using a CSS-powered 3D rotation.
   - When two tiles are flipped:
     - If their hidden icons match, they are marked as **matched** and remain revealed.
     - Otherwise, both tiles are briefly shaken and then flipped back.
4. When all 8 pairs are matched, the game stops the timer and displays the **win overlay**.

## Notes & Extensibility Ideas

- Swap out `icons.json` to provide different themes (animals, shapes, etc.).
- Add difficulty levels (e.g. 4x4, 6x6) by parameterizing grid size and number of pairs.
- Enhance accessibility further with screen-reader-specific labels and keyboard navigation patterns.

