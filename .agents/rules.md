# Games Hub — Project Rules

These rules apply to every coding agent working in this repo (Devin, Jules, Cascade, Cursor). Read `HANDOVER.md` and `HIT_BY_A_BUS.md` before making architectural changes.

## Tech stack (locked)

- **Vite 7** + **React 19** + **TypeScript** (strict mode, `tsc -b` project references)
- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config.*`, theme tokens live in CSS. `src/index.css` contains only `@import "tailwindcss";` + the dark custom-variant.
- **react-router-dom v7** for client-side routing
- **vite-plugin-pwa** for the service worker + web manifest (Workbox `generateSW`, `registerType: 'autoUpdate'`)
- **lucide-react** for all icons — do not add other icon libraries or inline SVG icon sets
- **Scoped Firebase packages only** (`@firebase/app`, `@firebase/firestore`) — never the `firebase` umbrella package, which drags in the vulnerable gRPC/protobufjs chain

## Zero external game engine dependencies

- **No game engines or game frameworks.** No Phaser, PixiJS, Three.js, Kaboom, Unity/Godot exports, or canvas/render-loop libraries of any kind. Games are hand-rolled with React state, DOM, SVG, `<canvas>` 2D, and `requestAnimationFrame`.
- Each game is a **self-contained module** under `src/features/games/games/<gameId>/` — own state, own i18n keys, no imports from other games. "Write once, deploy many times."
- Games run **on-device**. No uploads of gameplay state; the only network call allowed is a score submission/read against Firestore via `src/features/games/services/`.

## i18n key namespaces (enforced)

- All game UI strings live under the **`games.*` namespace** in `src/i18n/locales/*.json` (e.g. `games.hub.title`, `games.scores.leaderboard`, `games.titles.<gameId>.name`). Shared shell strings live under `common.*`.
- **All locale files (`en`, `bg`, `de`, `es`, `fr`, `nl`) must stay key-for-key identical** — the `Dict` type is derived from `en.json` and makes missing keys a compile error; do not loosen it.
- Domain-scoped key naming: `games.scores.submit`, not `submit`. Parameterize dynamic text — `t('games.scores.points_count', { count })` → `"Points: {count}"` — never concatenate translated fragments.
- Language switching is the shared **`utility-hub:lang`** window event + `utility-hub.lang` localStorage pref (same convention as the sibling Utility Hub app). Components subscribe via `useTranslation()` from `src/i18n`.

## Zero-auth privacy (locked)

- **No accounts, no sign-in, no Firebase Auth.** A player is identified only by an anonymous UUID + free-form nickname stored in `localStorage` under the `games-hub.*` prefix (`games-hub.playerId`, `games-hub.nickname` — see `services/playerIdentity.ts`).
- Never collect emails, names, IPs, or device identifiers. Leaderboard documents contain only `gameId`, `playerId` (anon UUID), `nickname`, `score`, `createdAt` — enforced by `firestore.rules` (create-only, strictly validated fields, no update/delete).
- The nickname prompt (`games.nickname.*`) is the only identity UX. Do not add telemetry/analytics without a recorded decision in `HANDOVER.md`.

## Component separation (strict)

- `src/components/` — shared app shell only (`Header`, `Footer`, `LangSelect`, `ThemeToggle`). No game logic here.
- `src/features/games/components/` — reusable game UI (`GameCard`, `LeaderboardModal`, `ScoreBoard`). Reusable across games, not game-specific.
- `src/features/games/games/` — individual game containers, one subfolder per game.
- `src/features/games/services/` — Firestore score submission/fetching + player identity. All Firestore access goes through here; components never import `@firebase/*` directly.
- `src/features/games/types/` — shared game/leaderboard interfaces.
- `src/App.tsx` owns routing only. New games: add a `games/<id>/` container + registry entry in `games/index.ts` + lazy route in `App.tsx`.

## Mobile-first design

- Design at mobile width first, then enhance with `sm:` / `md:` / `lg:` breakpoints.
- Touch targets ≥ 40 px, generous padding, no hover-only interactions (critical for games).
- Dark slate theme is the baseline: `bg-slate-950` surface, `slate-800/900` cards, `sky-400` accents. `theme_color: #0f172a` in the manifest matches.

## TypeScript & code style

- `verbatimModuleSyntax` is on — use `import type` for type-only imports.
- `noUnusedLocals`/`noUnusedParameters` are enforced — clean up dead code.
- Compact, idiomatic React: function components, hooks, no classes.
- Don't add comments unless asked; don't add deps without checking they're needed.

## File editing constraints

- **NEVER use shell heredocs (`cat << 'EOF'`) or multi-line shell writes** for file modifications or documentation updates — they corrupt delimiters and mangle lines (backticks/`$`/`\` get shell-processed). Always use targeted single-file write operations, atomic patches, or the standard file editing tools (`edit`/`write`).
- Process files **one by one** when refactoring; run `npm run build` (or `npx tsc -b`) after each meaningful change and revert on failure before touching anything else.

## Never commit

- `.env*` (except blank `.env.example`), API keys, service-account JSON, personal emails/uids.
- `node_modules/`, `dist/`, `dev-dist/` are already gitignored.
