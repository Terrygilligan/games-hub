# Games Hub

A hub of free browser games with anonymous leaderboards. No accounts, no downloads — just an anonymous nickname. PWA, installable, works offline between plays.

## Stack

Vite 7 · React 19 · TypeScript (strict) · Tailwind CSS v4 · react-router-dom v7 · vite-plugin-pwa · scoped `@firebase/*` (Firestore leaderboards only, lazily loaded)

## Develop

```powershell
npm install --legacy-peer-deps
npm run dev        # :5173
npm run build      # tsc -b && vite build
npm run preview    # serve dist on :4173
```

Firebase config (optional for local dev — leaderboards stay empty without it): copy `.env.example` → `.env.local` and fill in the `VITE_FIREBASE_*` values.

## Docs

- `HANDOVER.md` — current status, decisions, roadmap
- `HIT_BY_A_BUS.md` — full architecture, Firestore schema, env vars, deploy/recovery runbook
- `.agents/rules.md` — locked conventions for coding agents
