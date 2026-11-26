# 2026-11-26 — Word Guess UX + Lexicon Blitz expansion (session 2)

## Word Guess (`games/wordguess/`)
- **Rules modal** — `?` (HelpCircle) in header → `RulesModal.tsx`: goal, "type + Enter to submit", color-legend tiles, hint cost. Locales ×6: rulesTitle/rulesGoal/rulesSubmit/rulesCorrect/rulesPresent/rulesAbsent/rulesHint/hint/hintLoading/hintNone.
- **Hint** — `hintService.ts` runtime def fetch: `{lang}.wiktionary.org` rest_v1 page/definition → en.wiktionary → dictionaryapi.dev (en only). Same parser shape as `clue-crossword.mjs` (POS_PREF, DEF_JUNK, stripTags). Cost = 100 pts (one row's worth), applied only when a def is actually returned. Amber banner under grid.
- **Non-word guesses now cost a row** — user decision: rejecting invalid guesses was "lots more guesses". dictSet check → toast only; `evaluate()` runs on ANY 5-letter string so junk guesses still leak letter info. rulesSubmit copy updated ×6 ("every submitted guess costs a try").

## Lexicon Blitz (`games/lexicon/`)
- **Speech cutoff fix** — auto-speak of next question was `cancel()`-ing the spoken answer mid-word (`speak()` always cancels first). New `speakWhenIdle()` in `speech.ts` polls `speechSynthesis.speaking|pending` (120ms tick) and speaks once idle; returns cancel handle used as effect cleanup so deferred speaks die on unmount/qIdx change.
- **Entries expansion ×6** — en 63→171, fr 61→180, de 60→187, es 61→169, nl 59→210, bg 65→205. Hand-authored native words+defs appended to `games.lexicon.entries`; validated no dupes + valid JSON (fixed one stray combining accent + one Latin `e` inside a Cyrillic def — worth spot-checking bg output in play).
- **Generator script** — `scripts/lexicon-entries.mjs`: `--lang --words <file> [--count n] [--delay ms] [--apply]`. Same Wiktionary→dictionaryapi chain as clue-crossword; dedupes vs locale entries; `--apply` inserts formatted lines before `entries` array close. Tested: applied 6 en entries live. **Future upgrade documented in header: Kaikki.org JSONL Wiktionary dumps → bulk local generation feeding other word games.**

## lexicon-entries.mjs — wikitext rewrite (later same day)
- **Discovery**: Wiktionary REST `page/definition` endpoint exists ONLY on en.wiktionary.org — fr/de/es/nl/bg all return 501. First non-en version silently produced 0 entries.
- **Fix**: non-en locales now parse `action=parse&prop=wikitext` per edition:
  - fr: `== {{langue|fr}} ==` section, `#` def lines (`#*` = examples, excluded)
  - de: `== X ({{Sprache|Deutsch}}) ==` section, `{{Bedeutungen}}` block, `:[N] def` lines
  - es: `== {{lengua|es}} ==`, `;N: def` lines
  - nl: `{{=nld=}}` section, `#` def lines
  - bg: `| ЗНАЧЕНИЕ =` template fields, `#` def lines
- bg stub filter: defs matching "не е въведено" (meaning not yet entered) are skipped — added to DEF_JUNK.
- cleanWiki() unwraps [[a|b]]→b, drops templates + refs + bold markup.
- Verified live: fr 6/6, de 4/6 (2 absent from de.wiktionary), nl 4/5, bg stub-skip correct, es parser built from real probe output (same shape, untested live).

## State
- Crossword/snake/sudoku: commit 12347b1, deployed.
- WordGuess + lexicon games: commit ea69fce, deployed (games-hub-online.web.app live).
- lexicon-entries.mjs wikitext rewrite committed separately (tooling-only, no deploy needed).
- Both commits local — `git push` pending on owner PowerShell.
