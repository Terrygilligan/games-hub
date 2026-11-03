// Fetch dictionary clues for generated crossword answers.
// Reads a pack JSON on stdin (or file arg), fills each clues[ANSWER]
// from api.dictionaryapi.dev, drops puzzles with unclueable words.
// Usage: node scripts/clue-crossword.mjs in.json > out.json
import fs from 'fs'

const input = JSON.parse(fs.readFileSync(process.argv[2] ?? 0, 'utf8'))
const puzzles = Array.isArray(input) ? input : [input]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.error(...a)

const DEF_CACHE = new Map()
async function define(word) {
  if (DEF_CACHE.has(word)) return DEF_CACHE.get(word)
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`)
    if (!res.ok) { DEF_CACHE.set(word, null); return null }
    const data = await res.json()
    let def = ''
    outer: for (const e of data ?? [])
      for (const m of e.meanings ?? [])
        for (const d of m.definitions ?? [])
          if (d.definition && d.definition.length < 160 && !d.definition.toLowerCase().includes(word.toLowerCase())) {
            def = `${m.partOfSpeech ? `(${m.partOfSpeech}) ` : ''}${d.definition.replace(/;$/, '')}`
            break outer
          }
    DEF_CACHE.set(word, def || null)
    return def || null
  } catch {
    DEF_CACHE.set(word, null)
    return null
  }
}

const kept = []
for (const p of puzzles) {
  const answers = Object.keys(p.clues)
  const clues = {}
  let ok = true
  for (const w of answers) {
    const d = await define(w)
    if (!d) { log(`no def: ${w} — dropping puzzle`); ok = false; break }
    clues[w] = d
    await sleep(120) // be polite to the free API
  }
  if (ok) kept.push({ grid: p.grid, clues })
  log(`puzzle: ${ok ? 'kept' : 'dropped'} (${answers.length} words)`)
}
console.log(JSON.stringify(Array.isArray(input) ? kept : kept[0] ?? null, null, 1))
