---
agent: devin-local
created: 2026-11-03
---
# Crossword Quality Plan — "a marathon, not a sprint"

Ship a real 15×15 newspaper-style crossword on Games Hub, built on a pipeline that gets better every week. Quality is the only gate — no deadline, no half-baked fills going live.

## Where we are (baseline, shipped 2026-11-03)

- **Pipeline exists and works**: `scripts/gen-crossword.mjs` (random symmetric 15×15 template + MRV CSP fill, en_50k frequency-ranked preferred + words_alpha fallback, best-of-N by word rank) → `clue-crossword.mjs` (api.dictionaryapi.dev defs, drops unclueable) → `pack-add.mjs` (structure/coverage/clue validation, merge, cap 30).
- **Weekly cron**: `.github/workflows/crossword-pack.yml` — Mondays 06:00 UTC, also `workflow_dispatch` for manual runs. Generates → clues → validates → opens PR. Human reviews, merges or closes.
- **Shipped UI/format**: lazy `packs/<lang>.json`, clues keyed by answer word, full keyboard playability, card = inert red "Coming soon" (no links anywhere, `/games/crossword` still reachable for dev).
- **Known gap**: fills land ~10–20% obscure words (proper nouns, archaic terms, dictionary junk). Not ship quality.
- **Unpushed**: last commits need `git push origin main` before cron PRs branch correctly.

## Phase 0 — Hygiene (do first, one-off)

- [ ] `git push origin main` from `C:\SaaS-projects\online_games_hub`
- [ ] Verify `workflow_dispatch` works: `gh workflow run crossword-pack.yml` → confirm a PR opens (or read the run log for failures — first run on a new pipeline often exposes path/perm issues)

## Phase 1 — Fill quality gates (the real work)

Goal metric: **0 words outside a clueable/common set in any merged puzzle.**

Generator tuning, in order of expected impact:

- [ ] **Slot-length cap** — reject templates with slots >9 letters during template growth (long slots are where obscure words get forced)
- [ ] **More attempts in CI** — 16 → 50; batch cost is minutes, each attempt is a fresh template+fill
- [ ] **Pre-clue rare gate** — drop fills with >8 unranked words *before* spending dictionary-API calls
- [ ] **Template sanity**: also reject ultra-short-slot-heavy grids (too many 3s = boring crosswordese)

If fills still muddy after that:

- [ ] **Curated wordlist** — build `scripts/en_cross.txt`: en_50k ∩ words_alpha, minus proper nouns/archaic markers (start: drop words absent from dictionaryapi.dev entirely — precompute once, commit the pruned list)
- [ ] **Score-aware fill** — maximize Σ rank globally (current DFS takes first valid fill; consider depth-limited alternatives picking highest-ranked candidates)

Clue-side improvements (later phase, not blocking):

- [ ] Prefer shortest clean definition; skip defs containing the answer or circular refs
- [ ] Fallback clue source for proper nouns the dict API misses (Wiktionary) — or just reject those fills

## Phase 2 — First live puzzles

- [ ] Merge first accepted pack PR → pack has ≥1 real 15×15
- [ ] Eyeball-test on `/games/crossword` (route still live): grid renders, clue bar, arrows, victory flow, leaderboard submit
- [ ] When pack has ≥3 quality puzzles: `status: 'available'` in `games/index.ts`, rebuild, deploy, commit
- [ ] Update HANDOVER.md (status flip + pack size)

## Phase 3 — Accumulation (the marathon part)

- Weekly cron keeps topping the pack to 30. Each run = one review decision.
- Quality ratchet: every tuning improvement lands in the generator, so later puzzles are better than earlier ones; `pack-add` keeps newest 30 so weak early puzzles age out.
- Other locales stay on their 2×5×5 packs until English is proven — add languages only after the en pipeline is boringly reliable.

## Phase 4 — Localization (future, when en is proven)

- Same pipeline per locale: needs a ranked wordlist + clue source per language (bigger lift — Wiktionary dumps or locale dictionaries)
- Revisit only after Phase 3 is stable for a few cycles

## Guardrails

- **Never merge a PR without eyeballing the word list** — the PR body shows rare words; bad fills get closed, not merged.
- **Deploy only `hosting`** from `C:\SaaS-projects\online_games_hub` (`firebase deploy --only hosting`) — shared Firebase project, never push firestore.rules.
- **HANDOVER.md updated on every status change** — parallel agents depend on it.
- Card stays coming-soon until ≥3 real puzzles — no partial launches.
