# 2026-11-26 — Word Guess UX + Lexicon Blitz expansion (session 2)

## Word Guess (`games/wordguess/`)
- **Rules modal** — `?` (HelpCircle) in header → `RulesModal.tsx`: goal, "type + Enter to submit", color-legend tiles, hint cost. Locales ×6: rulesTitle/rulesGoal/rulesSubmit/rulesCorrect/rulesPresent/rulesAbsent/rulesHint/hint/hintLoading/hintNone.
- **Hint** — `hintService.ts` runtime def fetch: `{lang}.wiktionary.org` rest_v1 page/definition → en.wiktionary → dictionaryapi.dev (en only). Same parser shape as `clue-crossword.mjs` (POS_PREF, DEF_JUNK, stripTags). Cost = 100 pts (one row's worth), applied only when a def is actually returned. Amber banner under grid.
- **Non-word guesses now cost a row** — user decision: rejecting invalid guesses was "lots more guesses". dictSet check → toast only; `evaluate()` runs on ANY 5-letter string so junk guesses still leak letter info. rulesSubmit copy updated ×6 ("every submitted guess costs a try").

## Lexicon Blitz (`games/lexicon/`)
- **Speech cutoff fix** — auto-speak of next question was `cancel()`-ing the spoken answer mid-word (`speak()` always cancels first). New `speakWhenIdle()` in `speech.ts` polls `speechSynthesis.speaking|pending` (120ms tick) and speaks once idle; returns cancel handle used as effect cleanup so deferred speaks die on unmount/qIdx change.
- **Entries expansion ×6** — en 63→171, fr 61→180, de 60→187, es 61→169, nl 59→210, bg 65→205. Hand-authored native words+defs appended to `games.lexicon.entries`; validated no dupes + valid JSON (fixed one stray combining accent + one Latin `e` inside a Cyrillic def — worth spot-checking bg output in play).
- **Generator script** — `scripts/lexicon-entries.mjs`: `--lang --words <file> [--count n] [--delay ms] [--apply]`. Same Wiktionary→dictionaryapi chain as clue-crossword; dedupes vs locale entries; `--apply` inserts formatted lines before `entries` array close. Tested: applied 6 en entries live. **Future upgrade documented in header: Kaikki.org JSONL Wiktionary dumps → bulk local generation feeding other word games.**

## State
- Committed + deployed 2026-11-26 (same release as crossword launch commit? No — crossword went live in commit 12347b1 earlier today; this is a second commit+deploy same day).
