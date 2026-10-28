# Games Hub — Handover

## What this is

A **Games Hub PWA**: a collection of free browser games behind a shared hub grid, with anonymous Firestore leaderboards. Sister project to Utility Hub (`C:\utilities\utilities`, live at online-utilities.com) — shares its stack, i18n event convention, and design language.

- **Local path:** `C:\SaaS-projects\online_games_hub`
- **Repo:** not yet created on GitHub
- **Live:** not yet deployed (Firebase project not yet provisioned — see `HIT_BY_A_BUS.md`)
- **Status (2026-10-28): two games live** — **Snake** playable at `/games/snake` (canvas 20×20, arrow/WASD + swipe + mobile D-pad, wall/self collision, speed scales with score, personal best in `games-hub.best.snake`, nickname submit on new best → `submitScore`); **Memory Match** playable at `/games/memory` (word-pair tiles: synonyms/associations from `games.memory.words` per locale, Classic 4×4 / Expert 6×6, CSS 3D flip, moves+elapsed+combo HUD, efficiency×time score, per-mode best in `games-hub.best.memory.*`); minesweeper remains `coming-soon`. i18n in six locales (en/bg/de/es/fr/nl), anonymous-identity + leaderboard services, governance docs.

## Active milestones

### 1. Games Hub feature module (started 2026-10-28)

- `src/features/games/` — the module root:
  - `GamesHubView.tsx` — hub grid view (`/` route): `Header` + responsive `sm:2 lg:3` card grid + `Footer`
  - `components/` — `GameCard` (icon/title/desc + play/leaderboard actions), `LeaderboardModal` (fetch-on-open dialog), `ScoreBoard` (rank/nickname/score table)
  - `games/index.ts` — `GAME_REGISTRY` (`GameMetadata[]`) drives the grid; individual game containers go in `games/<id>/` and get a lazy route in `App.tsx`
  - `services/` — `playerIdentity.ts` (anon UUID + nickname in `games-hub.*` localStorage) and `leaderboardService.ts` (`submitScore`/`fetchTopScores` on `games_leaderboards`)
  - `types/` — `GameMetadata`, `LeaderboardEntry`, `ScorePayload`, `PlayerIdentity`
- Registry entries flip `status: 'coming-soon'` → `'available'` + `route` when a game ships (snake + memory done 2026-10-28). Game containers: `games/snake/` — `SnakeGame.tsx` (page + rAF/tick engine in refs), `SnakeBoard.tsx` (canvas render + swipe/tap), `GameOverModal.tsx` (score/nickname/submit overlay); `games/memory/` — `MemoryGame.tsx` (page + flip/match engine, timer, scoring), `CardGrid.tsx` (3D-flip word tiles), `ScoreBoard.tsx` (moves/time/combo/pairs HUD + `formatTime`), `VictoryModal.tsx`. Structured i18n data (word-pair arrays) is read via `getDict(lang)` — `t()` resolves leaf strings only.

### 2. i18n utility sweep (in progress, cross-project)

- The **Utility Hub** repo is mid-sweep: extracting hardcoded UI strings into `t()` calls under its English-source-key model (`src/utils/i18n.ts`), governed by the incremental-batching + build-gate rules in its `.agents/rules.md`.
- **This repo starts on the JSON-dict model instead:** `src/i18n/locales/*.json` — six locales (`en` source of truth, `bg`, `de`, `es`, `fr`, `nl`; expanded from en/bg on 2026-10-28), dot-path keys, `Dict` type enforces key parity across all languages at compile time. Reactive via `useTranslation()` + the shared `utility-hub:lang` window event (deliberately the same event/pref name so both hub apps behave identically for the user); `setLang` also syncs `<html lang>` for SEO/accessibility.
- Games Hub foundation keys: `games.hub.*`, `games.nickname.*`, `games.scores.*`, `games.actions.*`, `games.titles.<id>.*`, plus `common.*` for the shell. Any new UI text → both dictionaries, same keys.

## Key architectural decisions

- **Anonymous leaderboards, zero-auth.** No Firebase Auth by design (`firestore.rules` allows create-only writes with strict field validation). Identity = `crypto.randomUUID()` + nickname in localStorage (`services/playerIdentity.ts`). Leaderboard doc shape is locked — see `HIT_BY_A_BUS.md` for the `games_leaderboards` schema.
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
3. **Firebase project** — provision a project, add `.firebaserc`, fill `.env.local`, deploy rules + indexes + hosting (`firebase deploy`). Until then leaderboards return empty.
4. **Deploy + domain** — first hosting deploy, then decide on a custom domain.
