# Games Hub — Expansion Roadmap

Status legend: ✅ shipped · 🚧 planned. Locked conventions live in `.agents/rules.md`;
deploy/shared-Firestore caveats in `HANDOVER.md` + `HIT_BY_A_BUS.md`.

## Registry & types

`GameMetadata` is sufficient as-is — expansion needs entries + icon names only:

```ts
// GAME_REGISTRY order (id → icon → route)
'snake'       worm          /games/snake        ✅
'memory'      layout-grid   /games/memory       ✅
'minesweeper' bomb          /games/minesweeper  ✅
'lexicon'     book-open     /games/lexicon      🚧
'word-guess'  type          /games/word-guess   🚧
'word-ladder' waypoints     /games/word-ladder  🚧
'sudoku'      hash          /games/sudoku       🚧
'crossword'   grid-3x3      /games/crossword    🚧
'2048'        layers        /games/2048         🚧
```

- New entries start `status: 'coming-soon'` (no `route`); flip to `'available'` + `route` on ship.
- `GameCard` `ICONS` map gains: `BookOpen, Type, Waypoints, Hash, Grid3x3, Layers` (all in installed lucide-react).
- `games.titles.<id>.{name,description}` keys added to all 6 locales at registry time.
- Leaderboard `gameId` = registry id; `<Footer itemKey="<id>" />` matches.

## Shared patterns (apply to every new game)

- Page shell: `Header` → back link (`games.actions.backToHub`) + high-scores button → game HUD → board → `<Footer itemKey>` → `LeaderboardModal` (lazy route + `<Suspense>` in `App.tsx`).
- Score = points, higher-better (leaderboard is `ORDER BY score DESC`). Time-based games convert time→points via `base × min(cap, par/seconds)`.
- Personal best: `games-hub.best.<id>[.<mode>]`; new-best gates the nickname submit form.
- Timers via `startRef` + 250 ms interval gated on phase; `visibilitychange` pause where sensible.
- No start overlay when the first interaction can safely start the game (minesweeper precedent).
- Touch: `touch-manipulation` boards, ≥40 px targets where grid allows, mode toggles instead of hover-only actions.

## Per-game specs

### 4. Lexicon Blitz — `games/lexicon/` 🚧 (flashcard vocab + TTS)

- `LexiconGame.tsx`, `QuestionCard.tsx` (word + 4 definition buttons), `RoundHUD.tsx` (question n/10, streak, score, mute), `RoundOverModal.tsx`.
- **Data:** `games.lexicon.entries: [[word, definition], …]` ≥ 60 per locale. Distractors = 3 definitions sampled from other entries at runtime (no manual wrong answers). Runtime `.filter(e => e.length >= 2)`.
- **Loop:** round = 10 questions → word (+ speaker button, optional auto-speak) → pick 1 of 4 → instant color feedback → ~900 ms → next. Answer also via keys 1–4.
- **Score:** per question `100 + max(0, 50 × (1 − t/5s))` speed bonus + `streak × 25` (capped 10). Max ≈ 1750.
- **TTS:** `speak(text)` → `speechSynthesis.cancel()`, `new SpeechSynthesisUtterance(text)` with `utter.lang = lang`; pick voice `v.lang.startsWith(lang)`; `voiceschanged` listener for async voice lists; mute toggle persisted `games-hub.lexicon.muted`; speak only inside a user-gesture handler (browser policy); guard `typeof speechSynthesis !== 'undefined'` → hide speaker buttons when absent.
- **Best:** `games-hub.best.lexicon` (points).

### 5. Word Guess — `games/word-guess/` 🚧 (Wordle-style)

- `WordGuessGame.tsx`, `GuessGrid.tsx` (6×5 rows, flip-in letter reveal), `Keyboard.tsx` (locale-aware on-screen keys, color feedback).
- **Data:** `games.dictionary.fiveLetter: string[]` ≥ 150 five-letter words per locale (shared pool — see data-pack strategy), uppercase in the native alphabet (BG = Cyrillic; DE/ES/FR/NL keep native letters ä/ö/ü/ñ/é — normalization = `toUpperCase` only).
- **Loop:** random target → 6 guesses → per-letter state `correct | present | absent` → win streak tracking.
- **Score:** `(7 − rowUsed) × 100 + streak × 50`; submit only on win. Streaks in `games-hub.wordguess.{streak,max}`; best points `games-hub.best.word-guess`.
- **Input:** physical `keydown` (letters, Enter, Backspace — locale alphabets through `event.key`) + on-screen keyboard.

### 6. Word Ladder — `games/word-ladder/` 🚧 (one-letter chains)

- `WordLadderGame.tsx`, `LadderChain.tsx` (start→steps→target rows, per-word validity styling), `WordInput.tsx` (single inline input + submit), `VictoryModal.tsx`.
- **Data:** puzzle pairs `games.wordladder.puzzles: [[start, end], …]` (hand-picked solvable pairs, ≥ 12 per locale) + the shared `games.dictionary.fiveLetter` pool for validity checking.
- **Loop:** start word + target shown → player enters next rung → accept only if `len == 5`, differs from previous rung by exactly 1 letter, and `∈ dictionary` → repeat until target reached; undo button pops the last rung; invalid entries shake with inline reason (not-a-word / not-one-letter).
- **BFS shortest path:** computed once per puzzle at start — build adjacency lazily over the dictionary (~150 words → ≤ 22 k edge checks, trivial): `adj(a,b) = hamming==1`; BFS start→target gives `optimal`. Puzzles are authored to guarantee a path exists; if BFS finds none (data bug) fall back to `optimal = steps used` (no crash).
- **Score:** `round(1000 × optimal / stepsUsed + max(0, 250 × (1 − sec/par)))` — efficiency-first, light time bonus; `par = optimal × 15s`. Best `games-hub.best.word-ladder` (points); submit on completion.
- **Input:** single text input (native mobile keyboards handle locale alphabets); Enter submits; undo button for backtracking.

### 7. Sudoku — `games/sudoku/` 🚧

- `SudokuGame.tsx`, `SudokuGrid.tsx` (9×9 with 3×3 borders, given/user/wrong styles, same-digit highlight), `NumberPad.tsx` (1–9, erase, notes toggle), `VictoryModal.tsx`.
- **Data:** generated — backtracking solver produces a full grid, holes dug while preserving a **unique solution** (solver count check, bailout cap). No locale data needed — digits are universal.
- **Difficulties:** easy 40 / medium 32 / hard 27 givens.
- **Loop:** tap cell → number pad or keys 1–9; notes mode toggles pencil marks (`Set<number>` per cell); wrong entries flagged + mistake counter; auto-remove obsolete pencil marks on placement.
- **Score:** `base(e 1200/m 2400/h 4000) × min(4, par/sec) − mistakes × 100` (floor 0). Best time `games-hub.best.sudoku.<mode>`.

### 8. 2048 — `games/2048/` 🚧

- `Twenty48Game.tsx` (filename-safe), `Board2048.tsx` (absolutely positioned tiles, `transform` transitions, merge pop), `GameOverModal.tsx`.
- **Model:** `tiles: { id, value, row, col }[]` — persistent ids make CSS transitions follow slides; merge increments score by merged value; spawn 2/4 (90/10) in random empty cell; move detection for game-over; keep-playing after 2048.
- **Input:** arrows/WASD + swipe (copy SnakeBoard's touch math — cross-game imports are forbidden, copy the ~20 lines).
- **Score:** merge sum (standard 2048 score). Best `games-hub.best.2048`; submit on game-over if new best.

### 9. Crossword — `games/crossword/` 🚧

- `CrosswordGame.tsx`, `CrosswordGrid.tsx` (numbered cells, active slot highlight, black cells), `ClueList.tsx` (across/down, tap clue → focus slot), `VictoryModal.tsx`.
- **Data:** `games.crossword.puzzles: [{ size, grid: string[] (solution rows, '#' = black), clues: { across: [{ n, clue, row, col, len }], down: [...] } }]` — 2+ hand-authored mini puzzles (7×7–9×9) per locale; solution stays client-side (acceptable, consistent with all games).
- **Loop:** tap cell selects slot (tap again toggles direction) → type letters (physical keys + slim on-screen letter pad for touch) → check-word / reveal-letter helpers → complete grid wins.
- **Score:** `base 1500 × size-factor × min(4, par/sec) − reveals × 150`. Best per puzzle `games-hub.best.crossword.<puzzleIdx>`.

## Locale data-pack strategy

| Channel | Content | Mechanism |
|---|---|---|
| `t()` | all UI labels `games.<id>.*` | leaf strings, strict `Dict` parity |
| `getDict(lang)` | `games.lexicon.entries`, `games.wordladder.puzzles`, `games.crossword.puzzles`, shared `games.dictionary.fiveLetter` | structured JSON in each locale file |

- `games.dictionary.fiveLetter` (≥150 words/locale) is **shared** by Word Guess + Word Ladder — one authoring pass, both games stay module-isolated (dictionary lives in shared `games.*` i18n space, not inside a game module).
- Other volumes (per locale): lexicon ≥60 entries, word-ladder ≥12 puzzle pairs, crossword ≥2 puzzles. Sudoku/2048 need none.
- Parity rule: same keys in all 6 files; games runtime-filter malformed entries since `Dict` can't enforce array lengths.
- All data packs live in `src/i18n/locales/*.json` — no separate data files, single parity gate.

## Phased implementation (one module per phase)

| Phase | Game | Gate |
|---|---|---|
| 4 | Lexicon Blitz | module + registry flip + lazy route + `games.lexicon.*` ×6 + `tsc -b && npm run build` + preview screenshot + commit |
| 5 | Word Guess | same gate (adds `games.dictionary.fiveLetter` ×6) |
| 6 | Word Ladder | same gate (reuses phase-5 dictionary) |
| 7 | 2048 | same gate |
| 8 | Sudoku | same gate |
| 9 | Crossword | same gate |

- Order rationale: Lexicon is the explicitly requested feature; the two dictionary games cluster so one wordlist authoring pass serves both; 2048 is the cheapest mechanics game; Sudoku needs a proven generator; Crossword carries the heaviest per-locale content.
- Each phase also updates `HANDOVER.md` status and `games.titles.<id>` before the registry flip.
- Firebase: no new collections or rules needed — everything writes `games_leaderboards`.
