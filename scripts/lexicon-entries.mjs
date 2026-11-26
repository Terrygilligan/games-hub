// Generate new Lexicon Blitz entries: takes a candidate wordlist, fetches a
// short definition per word from the SAME source chain as clue-crossword.mjs
// ({lang}.wiktionary.org -> en: dictionaryapi.dev), dedupes against the words
// already in src/i18n/locales/<lang>.json, and emits ready-to-paste
// ["word","def"] JSON lines — or appends them in place with --apply.
//
// Usage:
//   node scripts/lexicon-entries.mjs --lang en --words candidates.txt
//   node scripts/lexicon-entries.mjs --lang fr --words fr.txt --count 80 --apply
// Options:
//   --lang <code>   locale to generate for (default en; also bg de es fr nl)
//   --words <file>  candidate words, one per line (required)
//   --count <n>     stop after n new entries (default: all that resolve)
//   --delay <ms>    pause between words (default 350 — be polite)
//   --apply         append lines into src/i18n/locales/<lang>.json entries[]
//
// FUTURE UPGRADE (bigger rethink): Kaikki.org publishes machine-readable
// Wiktionary dumps per language (JSONL: word, pos, senses[].glosses,
// ipa, forms). A bulk pipeline over a dump would generate hundreds of
// quality entries per locale in one pass — no per-word HTTP — and the same
// structured word data could feed other games (word-guess targets,
// word-ladder dictionaries, spelling bees). Keep this script as the
// interactive/fallback path; a dump importer can emit the identical
// ["word","def"] format into the same entries[] arrays.
import fs from 'fs'
import path from 'path'

const args = process.argv.slice(2)
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? dflt : args[i + 1]
}
const has = (name) => args.includes(`--${name}`)

const LANG = opt('lang', 'en')
const WORDS_FILE = opt('words')
const COUNT = Number(opt('count', 0)) || Infinity
const DELAY = Number(opt('delay', 350))
const APPLY = has('apply')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.error(...a)

if (!WORDS_FILE) {
  log('usage: node scripts/lexicon-entries.mjs --lang <locale> --words <file> [--count n] [--apply]')
  process.exit(1)
}

const localePath = path.resolve(`src/i18n/locales/${LANG}.json`)
if (!fs.existsSync(localePath)) {
  log(`no locale file: ${localePath}`)
  process.exit(1)
}
const localeText = fs.readFileSync(localePath, 'utf8')
const existing = new Set(
  (JSON.parse(localeText).games?.lexicon?.entries ?? []).map((e) => String(e[0]).toLowerCase()),
)

const candidates = [
  ...new Set(
    fs
      .readFileSync(WORDS_FILE, 'utf8')
      .split(/\r?\n/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w && !/\s/.test(w) && !existing.has(w)),
  ),
]
log(`${candidates.length} fresh candidates (${existing.size} existing entries)`)

// ---- definition source chain (mirrors clue-crossword.mjs) ----

const POS_PREF = [
  'adjective', 'verb', 'noun', 'adverb', 'proper noun', 'pronoun',
  'preposition', 'conjunction', 'interjection', 'numeral', 'determiner',
  'contraction', 'phrase', 'initialism', 'abbreviation', 'acronym',
]
const DEF_JUNK = /indicative of this usage|parser-output|font-size|\.mw-|display\s*:|visibility/
const stripTags = (html) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function wikiDef(json, lang, word) {
  const native = json[lang] ?? []
  const rest = Object.entries(json)
    .filter(([k]) => k !== lang)
    .flatMap(([, v]) => v ?? [])
  const cands = []
  for (const s of [...native, ...rest])
    for (const d of s.definitions ?? []) {
      const txt = stripTags(d.definition || '')
      if (txt && txt.length < 160 && !DEF_JUNK.test(txt) && !txt.toLowerCase().includes(word.toLowerCase()))
        cands.push({ pos: (s.partOfSpeech || '').toLowerCase(), txt })
    }
  if (!cands.length) return null
  cands.sort((a, b) => POS_PREF.indexOf(a.pos) - POS_PREF.indexOf(b.pos))
  return cands[0].pos ? `(${cands[0].pos}) ${cands[0].txt}` : cands[0].txt
}

async function wiktionaryLookup(word) {
  const forms = [...new Set([word, word[0].toUpperCase() + word.slice(1)])]
  let sawError = false
  for (const form of forms) {
    for (let t = 0; t < 3; t++) {
      try {
        const res = await fetch(
          `https://${LANG}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(form)}`,
          { headers: { 'user-agent': 'GamesHubLexiconBot/1.0 (entry generation)' } },
        )
        if (res.status === 404) break
        if (res.ok) {
          const def = wikiDef(await res.json(), LANG, word)
          if (def) return def
          break
        }
        sawError = true
      } catch {
        sawError = true
      }
      await sleep(700 * (t + 1))
    }
  }
  return sawError ? 'error' : null
}

async function freeDictLookup(word) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
    if (!res.ok) return null
    const data = await res.json()
    for (const e of data ?? [])
      for (const m of e.meanings ?? [])
        for (const d of m.definitions ?? [])
          if (d.definition && d.definition.length < 160 && !d.definition.toLowerCase().includes(word))
            return `${m.partOfSpeech ? `(${m.partOfSpeech}) ` : ''}${d.definition.replace(/;$/, '')}`
  } catch {
    // fall through
  }
  return null
}

async function fetchDef(word) {
  const w = await wiktionaryLookup(word)
  if (w && w !== 'error') return w
  if (LANG === 'en') {
    const f = await freeDictLookup(word)
    if (f) return f
  }
  return null
}

// ---- main loop ----

const lines = []
let done = 0
for (const word of candidates) {
  if (done >= COUNT) break
  const def = await fetchDef(word)
  if (def) {
    lines.push(`        [${JSON.stringify(word)}, ${JSON.stringify(def)}]`)
    done++
    log(`ok ${done}: ${word}`)
  } else {
    log(`-- ${word}`)
  }
  await sleep(DELAY)
}

if (!lines.length) {
  log('no entries generated')
  process.exit(1)
}

if (APPLY) {
  const start = localeText.indexOf('"entries": [')
  const end = localeText.indexOf('\n      ]', start)
  if (start === -1 || end === -1) {
    log('could not locate games.lexicon.entries array — apply aborted')
    process.exit(1)
  }
  const before = localeText.slice(0, end).trimEnd()
  const after = localeText.slice(end)
  const body = lines.map((l, i) => l + (i < lines.length - 1 ? ',' : '')).join('\n')
  fs.writeFileSync(localePath, `${before},\n${body}\n${after}`)
  log(`applied ${lines.length} entries to ${localePath}`)
} else {
  console.log(lines.map((l, i) => l + (i < lines.length - 1 ? ',' : '')).join('\n'))
  log(`${lines.length} entries written to stdout`)
}
