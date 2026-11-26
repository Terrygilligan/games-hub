// Probe which words in a list get a definition on api.dictionaryapi.dev.
// Writes words with NO definition (real 404) to stdout — append to
// scripts/crossword-blocklist.txt to grow the generator's excluded set.
// Transient errors (5xx/timeouts) are retried and reported, never emitted.
// Usage: node scripts/probe-cluable.mjs <wordlist> [workers] > missing.txt
import fs from 'fs'

const [listFile, workerArg] = process.argv.slice(2)
const WORKERS = Number(workerArg ?? 4)
const words = fs
  .readFileSync(listFile, 'utf8')
  .split('\n')
  .map((w) => w.trim())
  .filter(Boolean)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.error(...a)

async function status(word) {
  for (let t = 0; t < 6; t++) {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`,
      )
      if (res.status === 404) return 'missing'
      if (res.ok) return 'ok'
    } catch {
      // fall through to retry
    }
    await sleep(900 * (t + 1))
  }
  return 'error'
}

const missing = []
let errors = 0
let i = 0
async function worker() {
  while (i < words.length) {
    const w = words[i++]
    const s = await status(w)
    if (s === 'missing') missing.push(w)
    else if (s === 'error') { errors++; log(`error probing ${w}`) }
    if (i % 100 === 0) log(`progress ${i}/${words.length} missing=${missing.length} errors=${errors}`)
    await sleep(350)
  }
}
await Promise.all(Array.from({ length: WORKERS }, worker))
log(`done: ${missing.length} missing, ${errors} errors of ${words.length}`)
console.log(missing.join('\n'))
