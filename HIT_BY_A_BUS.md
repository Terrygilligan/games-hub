# Games Hub — Emergency Onboarding ("hit by a bus")

Everything needed to rebuild, operate, and redeploy this project with zero prior context.

## What it is / where it lives

- **App:** "Games Hub" — a static PWA of free browser games with anonymous Firestore leaderboards. Frontend is a build artifact (`dist/`) served from Firebase Hosting; the only backend piece is Cloud Firestore.
- **Local path:** `C:\SaaS-projects\online_games_hub`
- **Repo:** `github.com/Terrygilligan/games-hub` (main)
- **Live site:** `https://games-hub-online.web.app`
- **Sister project:** Utility Hub at `C:\utilities\utilities` (`github.com/Terrygilligan/utilities`) — same stack/conventions; its `HIT_BY_A_BUS`-equivalent is `BUS_FACTOR.md`.
- **Access needed:** the owner's GitHub account (repo) and Google account (Firebase project). Credentials are **not** in this repo by design.

## Architecture at a glance

```
Browser (React SPA + PWA service worker)
  └─ lazy → Firestore REST (games_leaderboards: read top-10 / create score)
```

- **No server code, no Cloud Functions, no Auth.** Writes are validated purely by `firestore.rules` (create-only, field-shape enforced, no update/delete — spam-resistant by shape, not by identity).
- **Anonymous identity:** `games-hub.playerId` = `crypto.randomUUID()` and `games-hub.nickname`, both in localStorage only (`src/features/games/services/playerIdentity.ts`).
- **Firestore is lazily loaded** via scoped `@firebase/app` + `@firebase/firestore` — absent env config → `getDb()` → `null` → services no-op gracefully (leaderboard shows empty, submissions drop).

## Firestore schema — `games_leaderboards`

| field | type | notes |
|---|---|---|
| `gameId` | string ≤64 | registry id, e.g. `'snake'` |
| `playerId` | string ≤64 | client-generated UUID, anonymous |
| `nickname` | string ≤24 | player-chosen display name |
| `score` | number 0–1e9 | higher = better |
| `createdAt` | timestamp | `serverTimestamp()` |

- Queries: `where gameId == X, orderBy score desc, createdAt asc, limit 10` → composite index in `firestore.indexes.json` (required — deploy indexes before first leaderboard use or queries fail with a missing-index link).
- Rules: `firestore.rules` — public read, validated create, no update/delete, deny-all fallback.
- Doc IDs are auto-generated; there is no dedupe — one doc per submission (a player can hold multiple rows).

## Local setup (Windows)

Prerequisites: Node.js (`C:\Program Files\nodejs`), Git, this repo cloned.

```powershell
cd C:\SaaS-projects\online_games_hub
npm install --legacy-peer-deps   # flag REQUIRED (vite-plugin-pwa peer quirk vs Vite 7)
npm run build                    # health check — must pass
npm run dev                      # local dev on :5173
npm run preview                  # serve built dist on :4173
```

Agent-shell note (WSL): `npm`/`firebase` shims don't run under bash — invoke via `cmd.exe /c "cd /d C:\SaaS-projects\online_games_hub && npm run build"` or `"C:\Program Files\nodejs\node.exe" <js-entry>`.

## Environment variables

Firebase web config comes from `VITE_FIREBASE_*` (Vite `import.meta.env`). `.env.local` (gitignored) already exists on Terry's machine with the `farmfresh-5e95e` web config — on a fresh clone, recreate it from `.env.example` using the project's Web app config:

| var | source |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase console → Project settings → Web app |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<project>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | project id |
| `VITE_FIREBASE_STORAGE_BUCKET` | `<project>.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Project settings |
| `VITE_FIREBASE_APP_ID` | Web app id |

The web `apiKey` is a public identifier (safe to embed), but values stay out of the repo — `.env.example` remains blank. **The app builds and runs fine with none set** — leaderboards just stay empty.

## Firebase setup & deployment

Games Hub lives on the **shared** project `farmfresh-5e95e` (hosting site `games-hub-online`, `.firebaserc` committed — no dedicated project exists because the GCP account is at its project quota). `.env.local` already contains the `VITE_FIREBASE_*` web config (gitignored).

1. Deploy everything:
   ```powershell
   firebase deploy                      # hosting site + firestore rules
   firebase deploy --only hosting       # site only
   firebase deploy --only firestore:rules
   ```
   Or `npm run deploy` (build + full deploy). `firebase.json` wires `dist/` hosting to the `games-hub` target, the SPA rewrite, no-cache SW headers, and `firestore.rules`.
2. **SHARED DB — read carefully:** `firestore.rules` is a union of the farmfresh app's auth/role collections plus `games_leaderboards`/`item_ratings` — never delete the farmfresh blocks. `firebase.json` has **no `indexes` entry on purpose**: the DB holds ~13 farmfresh composite indexes and `firebase deploy --only firestore:indexes` would delete them. Add indexes via console or REST; `firestore.indexes.json` is a reference file only.
3. **Rollback:** console → Hosting → `games-hub-online` site → release history → Rollback. Firestore data is untouched by hosting rollbacks.

## How updates reach users

`registerType: 'autoUpdate'` — service worker picks up new deploys on the next visit (worst case one refresh). No app store, no user action.

## Common emergencies

- **Leaderboard empty / submissions fail:** missing `VITE_FIREBASE_*`, Firestore not enabled, or the composite index not deployed. Query errors return `[]` by design — check the browser console/network, then `firebase deploy --only firestore`.
- **Page 404 on refresh:** SPA rewrite lost from `firebase.json` — restore + redeploy.
- **"Changes not showing":** service worker cache — hard refresh / clear site data.
- **Spam/garbage scores:** rules only validate shape. Real abuse → tighten rules (e.g. App Check) — record the decision in `HANDOVER.md` first.

## Golden rules

- Never commit credentials, `.env`, service accounts, or user-identifying data.
- `npm run build` is the gate — never deploy from a tree that doesn't build.
- Locked conventions live in `.agents/rules.md` (no game engines, `games.*` i18n keys, zero-auth identity, no shell heredocs) — `HANDOVER.md` is the running decision log.
