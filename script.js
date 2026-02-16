// Memory Game Logic
// ------------------
// This file contains all game state and interactions.
// High-level flow:
// 1. On load, we fetch icon data from a small JSON "API" (icons.json).
// 2. When the user starts the game, we create a 4x4 grid using the icons.
// 3. Clicking tiles flips them; at most two can be face-up at once.
// 4. If the two flipped tiles match, they stay revealed; otherwise they flip back.
// 5. When all pairs are found, we show a win overlay with time + move count.

(() => {
  // DOM references
  const welcomeScreen = document.getElementById("welcomeScreen");
  const gameScreen = document.getElementById("gameScreen");
  const gameGrid = document.getElementById("gameGrid");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const timeDisplay = document.getElementById("timeDisplay");
  const movesDisplay = document.getElementById("movesDisplay");
  const winOverlay = document.getElementById("winOverlay");
  const finalTime = document.getElementById("finalTime");
  const finalMoves = document.getElementById("finalMoves");
  const playAgainButton = document.getElementById("playAgainButton");
  const backToWelcomeButton = document.getElementById("backToWelcomeButton");
  const themeToggle = document.getElementById("themeToggle");

  // Game configuration
  const GRID_SIZE = 4; // 4x4 grid
  const TOTAL_TILES = GRID_SIZE * GRID_SIZE; // 16 tiles
  const FLIP_BACK_DELAY = 800; // ms before mismatched tiles flip back

  // Game state
  let icons = []; // icon list fetched from JSON
  let tiles = []; // array of tile objects: { id, icon, matched }
  let flippedTiles = []; // up to 2 tile elements currently flipped (DOM refs)
  let lockBoard = false; // prevent interaction while resolving a pair
  let moves = 0;
  let matchedPairs = 0;
  let timerInterval = null;
  let elapsedSeconds = 0;
  let hasStarted = false;

  // ----- Utility helpers -----

  function shuffle(array) {
    // Fisher–Yates shuffle for fair randomization
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  function updateTimerDisplay() {
    timeDisplay.textContent = formatTime(elapsedSeconds);
  }

  function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      elapsedSeconds += 1;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function resetTimer() {
    stopTimer();
    elapsedSeconds = 0;
    updateTimerDisplay();
  }

  function resetStats() {
    moves = 0;
    matchedPairs = 0;
    movesDisplay.textContent = "0";
  }

  function setThemeFromPreference() {
    const stored = window.localStorage.getItem("memory-game-theme");
    const prefersDark = window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    const useLight = stored === "light" || (!stored && !prefersDark);

    if (useLight) {
      document.body.classList.add("light");
      themeToggle.textContent = "☀️";
    } else {
      document.body.classList.remove("light");
      themeToggle.textContent = "🌙";
    }
  }

  function toggleTheme() {
    const isLight = document.body.classList.toggle("light");
    themeToggle.textContent = isLight ? "☀️" : "🌙";
    window.localStorage.setItem("memory-game-theme", isLight ? "light" : "dark");
  }

  // ----- Game setup -----

  async function loadIcons() {
    // Fetch icons from a local JSON file.
    // This simulates calling a (simple) REST API using fetch.
    try {
      const response = await fetch("./icons.json");
      if (!response.ok) {
        throw new Error(`Failed to load icons.json: ${response.status}`);
      }
      const data = await response.json();
      if (!Array.isArray(data.icons) || data.icons.length < TOTAL_TILES / 2) {
        throw new Error("icons.json must contain at least 8 icons.");
      }
      icons = data.icons.slice(0, TOTAL_TILES / 2); // 8 distinct icons
    } catch (error) {
      console.error(error);
      icons = ["🍎", "🚀", "🎧", "🌈", "🐾", "🎲", "📚", "🌙"];
    }
  }

  function createTileElement(tile) {
    const tileEl = document.createElement("button");
    tileEl.className = "tile";
    tileEl.type = "button";
    tileEl.dataset.id = tile.id;
    tileEl.dataset.icon = tile.icon;
    tileEl.setAttribute("aria-label", "Hidden tile");

    const inner = document.createElement("div");
    inner.className = "tile-inner";

    const front = document.createElement("div");
    front.className = "tile-front";
    const frontIcon = document.createElement("span");
    frontIcon.className = "tile-front-icon";
    frontIcon.textContent = "❓";
    front.appendChild(frontIcon);

    const back = document.createElement("div");
    back.className = "tile-back";
    back.textContent = tile.icon;

    inner.appendChild(front);
    inner.appendChild(back);
    tileEl.appendChild(inner);

    tileEl.addEventListener("click", () => handleTileClick(tileEl));

    return tileEl;
  }

  function buildGrid() {
    // Build tiles state: duplicate icons so each appears exactly twice.
    const iconPairs = shuffle(
      icons
        .slice(0, TOTAL_TILES / 2)
        .flatMap((icon) => [icon, icon])
    );

    tiles = iconPairs.map((icon, index) => ({
      id: String(index),
      icon,
      matched: false,
    }));

    // Clear any old DOM content
    gameGrid.innerHTML = "";
    flippedTiles = [];

    // Create and append tile elements
    tiles.forEach((tile) => {
      const tileEl = createTileElement(tile);
      gameGrid.appendChild(tileEl);
    });
  }

  async function initializeGame() {
    lockBoard = false;
    hasStarted = false;
    resetTimer();
    resetStats();
    await loadIcons();
    buildGrid();
  }

  // ----- Interaction handlers -----

  function handleTileClick(tileEl) {
    const isAlreadyFlipped = tileEl.classList.contains("flipped");
    const isMatched = tileEl.classList.contains("matched");

    if (lockBoard || isAlreadyFlipped || isMatched) {
      return;
    }

    // Start timer on the first user action inside a game
    if (!hasStarted) {
      hasStarted = true;
      startTimer();
    }

    tileEl.classList.add("flipped");
    flippedTiles.push(tileEl);

    if (flippedTiles.length < 2) {
      return;
    }

    // From here on we have exactly two tiles to compare
    lockBoard = true;
    moves += 1;
    movesDisplay.textContent = String(moves);

    const [first, second] = flippedTiles;
    const firstIcon = first.dataset.icon;
    const secondIcon = second.dataset.icon;

    if (firstIcon === secondIcon) {
      // Match!
      markTilesAsMatched(first, second);
      checkForWin();
      return;
    }

    // Not a match
    first.classList.add("shake");
    second.classList.add("shake");

    setTimeout(() => {
      first.classList.remove("flipped", "shake");
      second.classList.remove("flipped", "shake");
      flippedTiles = [];
      lockBoard = false;
    }, FLIP_BACK_DELAY);
  }

  function markTilesAsMatched(first, second) {
    first.classList.add("matched");
    second.classList.add("matched");
    flippedTiles = [];
    lockBoard = false;
    matchedPairs += 1;
  }

  function checkForWin() {
    if (matchedPairs === TOTAL_TILES / 2) {
      // All 8 pairs found
      stopTimer();
      finalTime.textContent = formatTime(elapsedSeconds);
      finalMoves.textContent = String(moves);
      winOverlay.classList.remove("hidden");
    }
  }

  function showGameScreen() {
    welcomeScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
  }

  function showWelcomeScreen() {
    gameScreen.classList.add("hidden");
    welcomeScreen.classList.remove("hidden");
  }

  async function startNewGame() {
    winOverlay.classList.add("hidden");
    showGameScreen();
    await initializeGame();
  }

  // ----- Event wiring -----

  startButton.addEventListener("click", () => {
    startNewGame();
  });

  restartButton.addEventListener("click", () => {
    startNewGame();
  });

  playAgainButton.addEventListener("click", () => {
    startNewGame();
  });

  backToWelcomeButton.addEventListener("click", () => {
    winOverlay.classList.add("hidden");
    stopTimer();
    showWelcomeScreen();
  });

  themeToggle.addEventListener("click", () => {
    toggleTheme();
  });

  // Initialize on first load
  setThemeFromPreference();
  updateTimerDisplay();
  movesDisplay.textContent = "0";

  // Preload icons so the first game starts quickly when user presses Start
  // (We intentionally don't await this so UI becomes interactive immediately.)
  loadIcons().catch((err) => console.error(err));
})();

