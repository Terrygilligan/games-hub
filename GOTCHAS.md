# Games Hub — Gotchas

Environment quirks and traps that have bitten sessions before. Hard project rules live in `.agents/rules.md`; this file is the "things that wasted an hour" list. Add new entries as they're discovered.

## Agent shell (Windows + Git-Bash/WSL mix)

- **Bare `node` is NOT on PATH**, but `npm run build` works (npm shim resolves). For direct node use `"/mnt/c/Program Files/nodejs/node.exe"` or `cmd.exe /c`.
- **Windows `node.exe` cannot read WSL `/tmp`** — it resolves to `C:\tmp`. Stage scratch scripts/data under `scripts/_*` (gitignored) or any Windows path.
- **No shell heredocs for file writes** (also in `.agents/rules.md` — it's a repeat offender). Backticks/`${}`/`\` inside heredoc bodies get shell-processed even with quoted delimiters. Use the `write`/`edit` tools.
- **`for` loops over shell vars broke** in this shell — run files individually instead.
- **`netstat` may show nothing even when vite is up** — trust the vite banner URL, not the socket list.
- **Headless Chrome screenshots needed a `.cmd` helper** to launch; `--virtual-time-budget=15000` works. Output PNGs to a Windows path, not `/tmp`.
- **No git credentials/identity in the agent shell** — `git push`/auth'd fetch hang. User runs git in Windows PowerShell, or commit locally with per-command identity: `git -c user.name=Terrygilligan -c user.email=Terrygilligan@users.noreply.github.com commit ...` (never write to git config).

## Firebase / deploy

- **Deploy only `firebase deploy --only hosting:games-hub` from THIS folder.** The site was overwritten once by a deploy from `C:\dictionary_game` (2026-10-31).
- **Never deploy `firestore:indexes`** and never delete the farmfresh blocks in `firestore.rules` — the `(default)` DB is shared with the farmfresh app; a rules/index deploy replaces the whole ruleset. Add indexes via console/REST.
- **App Check is wired but dormant** — do not enforce in Firebase console until confirmed; it gates ALL Firestore writes.

## Crossword pipeline (`scripts/`)

- **dictionaryapi.dev rate-limits hard** (~4 burst req/IP then throttle, and huge coverage gaps — FOR/WAS/TIGHT all 404). Wiktionary REST is the primary clue source; Collins is env-gated (`COLLINS_API_KEY`) but Cloudflare-403'd server-side.
- **Wordlists are gitignored** (`en_50k.txt`, `words_alpha.txt`, `20k.txt`, `google10k.txt`) — fetched in CI by the pack workflow; download them before local gen runs.
- **`--max-slot` is validated at final-template stage only** — incremental checks break the template builder (long runs can still be split by later blacks).
- **Strict gen yield ~25-30%/attempt, ~3-5 min/fill**; `NODE_BUDGET` is a CLI flag.
- **`crossword-blocklist.txt` = words that 404'd on dictionaryapi.dev** — under Wiktionary-primary clueing some entries (short glue words like WAS/FOR) are cluable and could be unblocked. Re-probe cheaply with `probe-cluable.mjs` (distinguishes real-404 vs transient errors).

## Crossword UI input model (`CrosswordGame.tsx`) — do not regress

Two user-reported bugs (fixed 2026-11-26) share one fragile area — the interplay between the hidden `<input>`, the wrapper's `onKeyDown`, and click-to-toggle:

- **The hidden input's `onKeyDown` must `stopPropagation()`** and route non-letter keys through `onGridKey`. If its keydown bubbles to the wrapper, every letter inserts twice (keydown branch + `onChange`), Backspace erase-and-steps, arrows skip two cells. Letters are owned by `onChange` (also the mobile-IME path — never require keydown for insertion).
- **Clicking the already-active cell toggles direction ONLY when that exact cell was clicked twice consecutively** (`lastClickRef`). Auto-advance pre-selects the next cell, so an unconditional toggle-on-active-click makes every habitual "click before typing" flip direction — the "letters jumping downwards" bug.
- **`built.all` = `[...across, ...down]`, so `slots[0]` at a crossing is always the ACROSS clue.** Never pick `slots[0]` as a default for a clicked cell — it silently snaps direction to across (the "letters going horizontally in down mode" bug). `onCellClick` uses `slots.find(s => s.dir === activeClue.dir) ?? slots[0]` — direction is sticky, NYT-style.
- **`advanceToOpenClue` jumps to the next clue with ANY empty cell** (scanning `all` from the current index) — it can land mid-word or far away, and fires the moment a word's last cell fills, even if crossings pre-filled most of it.
- **`buildPuzzle`'s `slotAt` stamping must use `cl.col + i` for ACROSS and `cl.col` for DOWN** — it once had them effectively swapped: down clues stamped a diagonal that row-wrapped onto other cells, so `#` cells got `slotAt !== -1` and rendered as white buttons (the "empty space instead of a block" bug), and `isCellIdx` let arrows walk onto blocks. `hasLetter` correctness masked most of it — verify `slotAt` per cell, not just rendering.

## Docs workflow

- `HANDOVER.md` is the canonical changelog/status — read it first, append dated entries for durable changes.
- `plans/<file>.md` = multi-session work threads; `scratch/<date>-<topic>.md` = disposable per-session notes (distill durable findings into HANDOVER).
- Update `AGENTS.md` when the doc set or workflow changes — it's the index every session reads.
