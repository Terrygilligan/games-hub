// Fetch dictionary clues for generated crossword answers.
// Reads a pack JSON on stdin (or file arg), fills each clues[ANSWER]
// from api.dictionaryapi.dev, drops puzzles with unclueable words.
// Preferred source: Collins API when COLLINS_API_KEY is set
// (COLLINS_DICT selects the dictionary code, default 'english');
// api.dictionaryapi.dev is the free fallback.
// Usage: node scripts/clue-crossword.mjs in.json > out.json
import fs from 'fs'

const input = JSON.parse(fs.readFileSync(process.argv[2] ?? 0, 'utf8'))
const puzzles = Array.isArray(input) ? input : [input]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.error(...a)

const COLLINS_KEY = process.env.COLLINS_API_KEY || ''
const COLLINS_DICT = process.env.COLLINS_DICT || 'english'

const stripTags = (html) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Collins search/first returns entryContent HTML; definitions sit in
// <span class="def">…</span>, part of speech in <span class="pos">.
function collinsDef(html, word) {
  const defs = [...html.matchAll(/<span[^>]*class="[^"]*\bdef\b[^"]*"[^>]*>([\s\S]*?)<\/span>/g)]
    .map((m) => stripTags(m[1]))
    .filter((d) => d && d.length < 160 && !d.toLowerCase().includes(word.toLowerCase()))
  if (!defs.length) return null
  const pos = /<span[^>]*class="[^"]*\bpos\b[^"]*"[^>]*>([\s\S]*?)<\/span>/.exec(html)
  const posTxt = pos ? `(${stripTags(pos[1]).replace(/,$/, '')}) ` : ''
  return posTxt + defs[0]
}

async function collinsLookup(word) {
  const url = `https://api.collinsdictionary.com/api/v1/dictionaries/${COLLINS_DICT}/search/first?q=${encodeURIComponent(word.toLowerCase())}&format=html`
  for (let t = 0; t < 4; t++) {
    try {
      const res = await fetch(url, {
        headers: { accessKey: COLLINS_KEY, accept: 'application/json' },
      })
      if (res.status === 404) return 'missing'
      if (res.ok) {
        const json = await res.json()
        if (!json?.entryContent) return 'missing'
        return { data: collinsDef(json.entryContent, word) }
      }
    } catch {
      // fall through to retry
    }
    await sleep(900 * (t + 1))
  }
  return 'error'
}

// Wiktionary REST: broadest free coverage — entries are grouped by part of
// speech; prefer real lexical categories over Symbol/letter-code entries.
const WIKI_UA = { 'user-agent': 'GamesHubCrosswordBot/1.0 (clue generation)' }
const POS_PREF = [
  'proper noun', 'noun', 'verb', 'adjective', 'adverb', 'pronoun',
  'preposition', 'conjunction', 'interjection', 'numeral', 'determiner',
  'contraction', 'phrase', 'initialism', 'abbreviation', 'acronym',
  'symbol', 'letter', 'particle',
]

const DEF_JUNK = /indicative of this usage|parser-output|font-size|\.mw-|display\s*:|visibility/

function wiktionaryDef(json, word) {
  const sections = json.en ?? json.English ?? []
  const cands = []
  for (const s of sections)
    for (const d of s.definitions ?? []) {
      const txt = stripTags(d.definition || '')
      if (txt && txt.length < 160 && !DEF_JUNK.test(txt) && !txt.toLowerCase().includes(word.toLowerCase()))
        cands.push({ pos: (s.partOfSpeech || '').toLowerCase(), txt })
    }
  if (!cands.length) return null
  cands.sort((a, b) => {
    const i = (p) => { const n = POS_PREF.indexOf(p); return n === -1 ? 50 : n }
    return i(a.pos) - i(b.pos)
  })
  return `(${cands[0].pos}) ${cands[0].txt}`
}

async function wiktionaryLookup(word) {
  const forms = [...new Set([word.toLowerCase(), word[0] + word.slice(1).toLowerCase()])]
  let sawError = false
  for (const form of forms) {
    for (let t = 0; t < 4; t++) {
      try {
        const res = await fetch(
          `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(form)}`,
          { headers: WIKI_UA },
        )
        if (res.status === 404) break // try next case form
        if (res.ok) {
          const def = wiktionaryDef(await res.json(), word)
          if (def) return { data: def }
          break // entry exists but no usable def — try next form
        }
        sawError = true
      } catch {
        sawError = true // fall through to retry
      }
      await sleep(900 * (t + 1))
    }
  }
  return sawError ? 'error' : 'missing'
}

// Returns { data } | 'missing' (real 404) | 'error' (transient, retries exhausted)
async function freeLookup(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`
  for (let t = 0; t < 5; t++) {
    try {
      const res = await fetch(url)
      if (res.status === 404) return 'missing'
      if (res.ok) return { data: await res.json() }
    } catch {
      // fall through to retry
    }
    await sleep(900 * (t + 1)) // rate-limit / transient backoff
  }
  return 'error'
}

// Free-dictionary JSON -> clue string
function freeDef(data, word) {
  for (const e of data ?? [])
    for (const m of e.meanings ?? [])
      for (const d of m.definitions ?? [])
        if (d.definition && d.definition.length < 160 && !d.definition.toLowerCase().includes(word.toLowerCase()))
          return `${m.partOfSpeech ? `(${m.partOfSpeech}) ` : ''}${d.definition.replace(/;$/, '')}`
  return null
}

// Source chain: Collins (when keyed) -> Wiktionary -> dictionaryapi.dev.
// Each returns { data: clue-string | raw-json | null } | 'missing' | 'error'.
const SOURCES = [...(COLLINS_KEY ? [collinsLookup] : []), wiktionaryLookup, freeLookup]

const DEF_CACHE = new Map()
async function define(word) {
  if (DEF_CACHE.has(word)) return DEF_CACHE.get(word)
  let errCount = 0
  let def = null
  for (const src of SOURCES) {
    const res = await src(word)
    if (res === 'error') { errCount++; continue }
    if (res === 'missing' || res.data == null) continue
    def = typeof res.data === 'string' ? res.data : freeDef(res.data, word)
    if (def) break
  }
  if (!def && errCount === SOURCES.length) { DEF_CACHE.set(word, 'error'); return 'error' }
  DEF_CACHE.set(word, def || null)
  return def || null
}

const kept = []
const missing = []
for (const p of puzzles) {
  const answers = Object.keys(p.clues)
  const clues = {}
  const bad = []
  for (const w of answers) {
    const d = await define(w)
    if (d === 'error') { log(`lookup error on ${w} — API trouble, aborting`); process.exit(3) }
    if (!d) { bad.push(w) }
    else clues[w] = d
    await sleep(300) // be polite to the free API
  }
  if (!bad.length) kept.push({ grid: p.grid, clues })
  else missing.push(...bad)
  for (const w of bad) log(`MISSING ${w}`)
  log(`puzzle: ${bad.length ? `dropped (${bad.length} unclueable)` : 'kept'} (${answers.length} words)`)
}
if (missing.length) log(`unclueable: ${missing.join(' ')}`)
console.log(JSON.stringify(Array.isArray(input) ? kept : kept[0] ?? null, null, 1))
