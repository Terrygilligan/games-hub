# Scratch — 2026-11-26 — crossword launch session

## Where it stands
- All crossword work implemented, build green, screenshots verified — **uncommitted**.
- Pack: 5× generated 15×15 + 2× 5×5 minis in `src/features/games/games/crossword/packs/en.json`.
- **Double-insert bug FIXED 2026-11-26**: hidden input keydown bubbled to wrapper `onGridKey` → letters inserted via keydown AND `onChange` (Backspace/arrows double-fired too). Fix in `CrosswordGame.tsx`: `stopPropagation()` in input `onKeyDown`, non-letter keys routed through `onGridKey`, letters owned by `onChange`. Build green.
- **Direction bugs FIXED 2026-11-26** (pre-existing, two related traps): (a) click-on-active-cell toggled direction unconditionally — auto-advance pre-selects the next cell so habitual click-before-type flipped to down every keystroke → `lastClickRef` requires the same cell clicked twice consecutively to toggle. (b) `onCellClick` else-branch picked `slots[0]` which is always the ACROSS slot (`all=[across,down]`) — clicking around in down mode snapped to across → now prefers `slots.find(s => s.dir === activeClue.dir)` (sticky direction). Verified via `scripts/_sim.mjs` (state-machine sim on real pack) + build green.
- **`slotAt` diagonal-stamp bug FIXED 2026-11-26** (user-reported "empty space instead of block" — pre-existing since first crossword commit): `buildPuzzle` stamped down clues diagonally (`cl.col+i`) which also row-wrapped, so `#` cells got `slotAt!==-1` → rendered white. Fixed: across `cl.col+i`, down `cl.col`. Also fixes `isCellIdx` arrow bounds. Verified all 7 pack grids cell-by-cell via node script + build green.
- **Answer lengths added to clues** (`({len})` in ClueList + active clue bar) — user wanted to see how many letters per answer.
- **Direction UX round 3 (2026-11-26)**: `advanceToOpenClue` now prefers the SAME direction when jumping after word-complete (was silently flipping to a down clue mid-across-solve — likely the "direction still wrong" report). Clue bar is now clickable → `toggleDir` (discoverable direction switch alongside double-click same cell + Space/Enter).
- Next: user re-test → commit (user runs git or instructs) → deploy decision later (`firebase deploy --only hosting:games-hub`).

## Env quirks worth remembering (WSL shell)
- Windows node: `/mnt/c/Program Files/nodejs/node.exe` or `cmd.exe /c` for npm scripts.
- Windows node can't read WSL `/tmp` — stage scratch JSON in `scripts/_*.json` (gitignored).
- `for` loops over shell vars broke in this shell — run files individually.
- Chrome headless screenshot needed a `.cmd` helper file; netstat may show nothing even when vite is up — trust the vite banner.

## Pipeline state
- `scripts/crossword-blocklist.txt` ≈ 1,715 entries (committed-new). Probe re-run cheap: `scripts/probe-cluable.mjs`.
- dictionaryapi.dev throttles hard after burst — Wiktionary is now primary clue source; Collins env-gated (`COLLINS_API_KEY`), Cloudflare-403'd, owner emailed Collins.
- Strict gen yield ~25-30%/attempt, ~3-5 min/fill; `NODE_BUDGET` is a CLI flag.

## Loose ends at commit time
- `plans/`, `scratch/`, `AGENTS.md`, `scripts/crossword-blocklist.txt`, `scripts/probe-cluable.mjs` = new untracked files — include in commit.
- Stray `_shot.cmd` / `_shot15.png` were already cleaned; `scripts/_*` are gitignored.
