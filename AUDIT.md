# Games Hub Audit — 2026-10-29

Full read-through of all 8 games + shared infra (Layout, services, i18n, footer, rules, PWA).
Severity: **P0** broken · **P1** correctness bug · **P2** engineering debt · **P3** polish.

## P1 — fixed this pass

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | `games/snake/SnakeGame.tsx` | Pause → resume accumulated the entire paused duration into `accRef` (stale `lastRef`), so the snake teleported/died on unpause | `accRef`/`lastRef` zeroed when the loop effect re-enters `playing` |
| 2 | `games/minesweeper/MinesweeperGame.tsx` | Flagging cells *before* the first reveal was allowed; `placeMines()` wipes the board but `flagsPlaced` wasn't reset → mine counter wrong for the whole game | `setFlagsPlaced(0)` on mine placement |
| 3 | `games/sudoku/SudokuGame.tsx` | `pickMode` stored `MODES.findIndex(...)` (0/1/2) but `loadMode` compared `key === '0'` → mode persistence never worked, always fell back to `easy` | Store the mode key string directly |

## P3 — fixed this pass

- `games/{sudoku,wordladder,crossword}`: timer effect deps included `elapsed`, recreating the interval every tick → deps reduced to `[phase]`.
- `games/wordguess`: `dictSet`/`keySet` were rebuilt every render (keydown listener re-subscribed per render) → wrapped in `useMemo`.

## P2 — engineering debt (deferred, by design)

- **Duplicated victory/submit/best-score flow** — 8 near-identical modal + nickname + `submitScore` + `loadBest/saveBest` blocks (~8×90 LOC). Recommend extracting `games/shared/` (VictoryModal, `useBestScore`, `useStopwatch`, `ScoreSubmit`) — collapses ~720 LOC to ~150. Not fixed now: mechanical but touches every game.
- **Best-score semantic inconsistency** — Minesweeper stores *seconds* (lower=better) under `games-hub.best.*`, all others store *points*. Works, but the key namespace implies uniform meaning.
- **No linting** — only `tsc` guards the codebase. An `eslint.config.js` (react-hooks + typescript, no stylistic rules) would catch dep-array and unused-var classes of the bugs found here.
- Unsafe but benign casts: `route as string` (Layout ×2), `keys as string[][]` (WordGuess), `q.shift() as string` (ladder.ts ×2). `q.shift()` is O(n) — fine at dictionary scale (~300 words).

## P3 — noted, not fixed

- `MemoryGame`/`LexiconGame`: `filter(p => p.length >= 2)` checks the pair *array* length — dead filter (always true for well-formed entries), harmless data guard.
- `LexiconGame` auto-speak effect skips `picked`/`soundOn`/`questions` deps on purpose (speak once per question) — inert `eslint-disable` (no eslint configured).
- `SudokuGame` keydown effect has no deps array (re-registers each render) — harmless since handlers close over current state.
- `CrosswordGame.isComplete` declared after `typeLetter` — legal (runtime call order), readability only.
- `SnakeGame.randomFood` returns `{0,0}` on a full board — unreachable (win at length 400 impossible).
- `MinesweeperBoard`: cells without flags have no aria-label (P3 a11y).
- `mergeStates` in WordGuess — `?? 'absent' as LetterState` precedence works, reads awkward.

## Verified clean

- i18n: **0 missing/extra keys** across all 6 locales (nested diff incl. `games.*`).
- Data packs: dictionaries (right lengths, no dupes), lexicon entries, crossword grids — all valid.
- No hardcoded UI strings in JSX.
- Services (`leaderboardService`, `playerIdentity`, `ratings`, `speech`, `firebase`) — all degrade gracefully with no backend.
- `sudoku.ts` generator: backtracking fill + uniqueness-checked digging — correct.
- `crossword.ts` slot derivation — all 12 puzzles: 3 across + 2 down, clue counts match.
- Timers/intervals: every `setInterval`/`requestAnimationFrame`/listener has cleanup (besides the dep-noise noted).
- No P0 issues found.
