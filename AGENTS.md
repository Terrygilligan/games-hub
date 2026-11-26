# Games Hub — Doc Index

Start here every session. Read `HANDOVER.md` first — it is the canonical changelog/status doc and lists active WIP.

| File | What it holds |
|---|---|
| `HANDOVER.md` | Canonical status + dated changelog. Check the latest entries for uncommitted WIP before touching anything. |
| `plans/` | Multi-session plans, one file per work thread. `plan-7e90134fc313b865.md` = current (15×15 crossword launch). |
| `scratch/` | Per-session working notes (`<date>-<topic>.md`) — disposable; distill durable findings into HANDOVER.md. |
| `.agents/rules.md` | Hard constraints: no game engines, shared-Firestore deploy warnings, deploy command. |
| `GOTCHAS.md` | Environment traps (WSL/Windows shell quirks) + fragile-input invariants — read before scripting or touching crossword input. |
| `HIT_BY_A_BUS.md` | Locked schemas (e.g. `games_leaderboards` doc shape). |
| `AUDIT.md` | 2026-10-29 code audit — fixed P1s, open P2 debt list. |
| `GAMES_HUB_ROADMAP.md` | Original game roadmap (mostly complete). |
| `scripts/` | Crossword pipeline: `gen-crossword.mjs`, `clue-crossword.mjs`, `probe-cluable.mjs`, `pack-add.mjs`, `crossword-blocklist.txt`. Lexicon entry generator: `lexicon-entries.mjs` (`--lang`, `--words`, `--count`, `--apply`; Kaikki.org bulk-dump importer is the documented future upgrade). |

## Quick facts

- Live: `https://games-hub-online.web.app` — deploy `firebase deploy --only hosting:games-hub` from THIS folder only.
- Build gate: `npm run build` (tsc + vite). Install: `npm install --legacy-peer-deps`.
- Shared Firestore: never delete farmfresh blocks in `firestore.rules`; never deploy `firestore:indexes` (see `.agents/rules.md`).
- i18n: 6 locales in `src/i18n/locales/*.json`, `Dict` type enforces key parity — new UI text goes in all 6.
