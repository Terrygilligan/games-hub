# Games Hub — Handover

## What this is

A **Games Hub PWA**: a collection of free browser games behind a shared hub grid, with anonymous Firestore leaderboards. Sister project to Utility Hub (`C:\utilities\utilities`, live at online-utilities.com) — shares its stack, i18n event convention, and design language.

- **Local path:** `C:\SaaS-projects\online_games_hub`
- **Repo:** `github.com/Terrygilligan/games-hub` (main)
- **Live:** `https://games-hub-online.web.app` — Hosting site `games-hub-online` inside the **shared** Firebase project `farmfresh-5e95e` (same project as online-utilities.com and the farmfresh app — the GCP account is at its project quota, so no dedicated project). `.env.local` holds the `VITE_FIREBASE_*` web config (gitignored).
- **Layout (2026-10-29): Utilities-mirrored chrome** — `components/Layout.tsx` route wrapper (desktop sticky sidebar `w-60` + mobile hamburger drawer) owns header/footer for all routes via `<Outlet/>`; game pages render content only. Collapsible nav groups (`games-hub.nav.collapsed`): Word Games / Puzzles / Classic, auto-expand active. **Favorites**: heart on GameCard + `games-hub.favorites` → pinned section on hub grid + sidebar Favorites group (`features/games/favorites.ts` — cached snapshot, don't return fresh arrays to useSyncExternalStore). **Review**: written reviews via `item_reviews` collection (separate from `item_ratings` aggregates), textarea in GlobalFooterBar after voting, rules block mirrors ratings. **Bug/feature links** → `github.com/Terrygilligan/games-hub` issues w/ `.github/ISSUE_TEMPLATE/*.yml`. **Utility Hub cross-link** (`online-utilities.com`) in nav + footer; privacy tagline `footer.privacyLine` ×6. `itemKey` derived from pathname in Layout.
- **Status (2026-10-29): eight games live** — Snake, Memory Match, Minesweeper, Lexicon Blitz (TTS), Word Guess, Word Ladder, plus **Sudoku** `/games/sudoku` (runtime backtracking generator w/ unique-solution digging — `sudoku/sudoku.ts`; easy 40 / medium 32 / hard 27 givens; pencil notes; mistake tracking; score `base×min(4,par/sec)−mistakes×100`) and **Crossword** `/games/crossword` (2 authored 5×5 puzzles/locale in `games.crossword.puzzles` — `{grid:[rows,'#'=black],across:[],down:[]}`, slots+numbering derived at runtime by `crossword/crossword.ts`; hidden-input typing for mobile; check/reveal helpers, hints cost 150pts). **2048 skipped** at user request — roadmap complete otherwise.

## Active milestones

### 1. Games Hub feature module (started 2026-10-28)

- `src/features/games/` — the module root:
  - `GamesHubView.tsx` — hub grid view (`/` route): `Header` + responsive `sm:2 lg:3` card grid + `Footer`
  - `components/` — `GameCard` (icon/title/desc + play/leaderboard actions), `LeaderboardModal` (fetch-on-open dialog), `ScoreBoard` (rank/nickname/score table)
  - `games/index.ts` — `GAME_REGISTRY` (`GameMetadata[]`) drives the grid; individual game containers go in `games/<id>/` and get a lazy route in `App.tsx`
  - `services/` — `playerIdentity.ts` (anon UUID + nickname in `games-hub.*` localStorage) and `leaderboardService.ts` (`submitScore`/`fetchTopScores` on `games_leaderboards`)
  - `types/` — `GameMetadata`, `LeaderboardEntry`, `ScorePayload`, `PlayerIdentity`
- Registry entries flip `status: 'coming-soon'` → `'available'` + `route` when a game ships (snake + memory done 2026-10-28). Game containers: `games/snake/` — `SnakeGame.tsx` (page + rAF/tick engine in refs), `SnakeBoard.tsx` (canvas render + swipe/tap), `GameOverModal.tsx` (score/nickname/submit overlay); `games/memory/` — `MemoryGame.tsx` (page + flip/match engine, timer, scoring), `CardGrid.tsx` (3D-flip word tiles), `ScoreBoard.tsx` (moves/time/combo/pairs HUD + `formatTime`), `VictoryModal.tsx`. Structured i18n data (word-pair arrays) is read via `getDict(lang)` — `t()` resolves leaf strings only. `games/minesweeper/` — `MinesweeperGame.tsx` (engine: lazy mine placement for first-click safety, BFS flood fill, win/lose), `MinesweeperBoard.tsx` (tile grid, click/right-click/long-press input), `ControlsHeader.tsx` (mine counter, timer, best, reveal/flag mode toggle, restart), `VictoryModal.tsx`. No start overlay — the first reveal starts the game.

### 2. i18n utility sweep (in progress, cross-project)

- The **Utility Hub** repo is mid-sweep: extracting hardcoded UI strings into `t()` calls under its English-source-key model (`src/utils/i18n.ts`), governed by the incremental-batching + build-gate rules in its `.agents/rules.md`.
- **This repo starts on the JSON-dict model instead:** `src/i18n/locales/*.json` — six locales (`en` source of truth, `bg`, `de`, `es`, `fr`, `nl`; expanded from en/bg on 2026-10-28), dot-path keys, `Dict` type enforces key parity across all languages at compile time. Reactive via `useTranslation()` + the shared `utility-hub:lang` window event (deliberately the same event/pref name so both hub apps behave identically for the user); `setLang` also syncs `<html lang>` for SEO/accessibility.
- Games Hub foundation keys: `games.hub.*`, `games.nickname.*`, `games.scores.*`, `games.actions.*`, `games.titles.<id>.*`, plus `common.*` for the shell. Any new UI text → both dictionaries, same keys.

## Key architectural decisions

- **Anonymous leaderboards, zero-auth.** No Firebase Auth by design (`firestore.rules` allows create-only writes with strict field validation). Identity = `crypto.randomUUID()` + nickname in localStorage (`services/playerIdentity.ts`). Leaderboard doc shape is locked — see `HIT_BY_A_BUS.md` for the `games_leaderboards` schema.
- **SHARED FIRESTORE — union rules, manual indexes.** `firestore.rules` is a union of the farmfresh app's auth/role collections (users, inventory, orders, euAuditLogs, system — managed elsewhere) plus our `games_leaderboards`/`item_ratings`. **Do not delete the farmfresh blocks** — `firebase deploy --only firestore:rules` replaces the whole ruleset. If the farmfresh app changes its rules, re-sync this file. `firebase.json` deliberately has **no `indexes` entry**: the shared DB carries ~13 farmfresh composite indexes and a CLI index deploy could delete them — `games_leaderboards` index was created once via REST; add future indexes via console/API, keeping `firestore.indexes.json` as the reference file only.
- **Scoped Firebase packages** (`@firebase/app` + `@firebase/firestore`), lazily imported — the gRPC/firestore bundle never reaches the initial chunk. Config comes from `VITE_FIREBASE_*` env vars; `getDb()` returns `null` when unconfigured and services degrade to `[]`/`false` (app builds and runs with no env at all).
- **No game engines.** Games are hand-rolled React/canvas — a hard rule in `.agents/rules.md`.
- **Shared shell:** `src/components/Header.tsx` (brand + `LangSelect` + `ThemeToggle`) and `Footer.tsx` — simpler than Utility Hub's sidebar layout since games are flat, not nested tools.
- Theme: `utility-hub.theme` localStorage + `.dark` class + pre-paint script in `index.html` (identical convention to Utility Hub).

## Structure

```
src/
├── components/           # shared shell: Header, Footer, LangSelect, ThemeToggle
├── features/games/
│   ├── components/       # GameCard, LeaderboardModal, ScoreBoard
│   ├── games/            # registry + one subfolder per game container
│   ├── services/         # playerIdentity (localStorage), leaderboardService (Firestore)
│   ├── types/            # GameMetadata, LeaderboardEntry, ScorePayload, PlayerIdentity
│   └── GamesHubView.tsx  # hub grid at /
├── i18n/                 # index.ts (t/useTranslation/LANG_EVENT) + locales/{en,bg}.json
├── lib/                  # firebase.ts (lazy scoped init), theme.ts
├── App.tsx / main.tsx / index.css / vite-env.d.ts
```

Config: `vite.config.ts` (react + tailwind + VitePWA, manifest "Games Hub"), `firebase.json` (hosting `dist` + SPA rewrite + firestore rules/indexes), `firestore.rules` (leaderboard validation), `firestore.indexes.json` (gameId+score composite).

## Verified

`npm run build` passes clean (tsc -b + vite build + PWA output) — see git log / last verification date. Install requires `--legacy-peer-deps` (vite-plugin-pwa peer range lags Vite 7, same as Utility Hub).

## Roadmap

1. **First games** — snake, memory match, minesweeper: `games/<id>/` container + registry flip to `available` + lazy route `/games/<id>` in `App.tsx` + `games.titles.<id>` keys.
2. **Score submission flow** — `submitScore` is wired but unused until a game ships; needs the nickname prompt UI (`games.nickname.*` keys already exist) before first submit.
3. **Firebase project** — done via shared `farmfresh-5e95e` (see "Shared Firestore" decision above); leaderboards + ratings are live.
4. **Custom domain** — optional: add e.g. `games.<domain>` to the `games-hub-online` site in console → Hosting.
