// 15x15 crossword generator: random symmetric template + CSP fill,
// best-of-N attempts scored by word frequency, emits pack JSON.
// Usage: node scripts/gen-crossword.mjs [attempts] [count] <ranked-list> <dict-list> [extra...]
//   node scripts/gen-crossword.mjs 20 10 scripts/en_50k.txt scripts/words_alpha.txt --core-list scripts/20k.txt > out.json
// Strict by default: fills use only the "clean" core (ranked words that are
// also in the dictionary list AND the optional --core-list curated list) —
// obscure words never reach the output.
// Flags: --core N (keep top N clean words), --core-list <file> (curated common
// words), --blocklist <file> (words excluded from both tiers — proper nouns,
// unclueable entries found via clue runs), --max-slot N, --allow-rare N.
import fs from 'fs'

const SIZE = 15
const TARGET_BLACKS = 54
const CAP = 400 // max candidates tried per slot

let args = process.argv.slice(2)
const flagVal = (name, dflt) => {
  const i = args.indexOf(name)
  if (i === -1) return dflt
  const v = Number(args[i + 1])
  args.splice(i, 2)
  return Number.isFinite(v) ? v : dflt
}
const flagStr = (name) => {
  const i = args.indexOf(name)
  if (i === -1) return null
  const v = args[i + 1]
  args.splice(i, 2)
  return v
}
const CORE_LIMIT = flagVal('--core', 35000)
const NODE_BUDGET = flagVal('--nodes', 150000)
const CORE_LIST = flagStr('--core-list')
const BLOCKLIST = flagStr('--blocklist')
const MAX_SLOT = flagVal('--max-slot', 11)
const ALLOW_RARE = flagVal('--allow-rare', 0)
const ATTEMPTS = /^\d+$/.test(args[0] ?? '') ? Number(args.shift()) : 8
const COUNT = /^\d+$/.test(args[0] ?? '') ? Number(args.shift()) : 1
let seed = Date.now() % 2147483647
const rndState = () => (seed = (seed * 1103515245 + 12345) % 2147483647)
const rnd = (n) => rndState() % n
const log = (...a) => console.error(...a) // progress to stderr; JSON on stdout

const isCell = (g, r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE && g[r][c] !== '#'

function slots(g) {
  const out = []
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (!isCell(g, r, c)) continue
      if (!isCell(g, r, c - 1) && isCell(g, r, c + 1)) {
        let len = 0
        while (isCell(g, r, c + len)) len++
        out.push({ dir: 'a', row: r, col: c, len })
      }
      if (!isCell(g, r - 1, c) && isCell(g, r + 1, c)) {
        let len = 0
        while (isCell(g, r + len, c)) len++
        out.push({ dir: 'd', row: r, col: c, len })
      }
    }
  return out
}

function valid(g, S, final = false) {
  // len>MAX_SLOT only checked on the finished template — during construction a
  // long run can still be split by later blacks.
  if (S.some((s) => s.len < 3 || (final && s.len > MAX_SLOT))) return false
  const cover = new Array(SIZE * SIZE).fill(0)
  for (const s of S)
    for (let i = 0; i < s.len; i++)
      cover[(s.dir === 'a' ? s.row : s.row + i) * SIZE + (s.dir === 'a' ? s.col + i : s.col)]++
  const seen = new Set()
  const stack = [g.flat().findIndex((ch) => ch !== '#')]
  while (stack.length) {
    const i = stack.pop()
    if (seen.has(i)) continue
    seen.add(i)
    const r = Math.floor(i / SIZE), c = i % SIZE
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      if (isCell(g, r + dr, c + dc)) stack.push((r + dr) * SIZE + c + dc)
  }
  const whites = g.flat().filter((ch) => ch !== '#').length
  return seen.size === whites && cover.every((n, i) => n > 0 || g[Math.floor(i / SIZE)][i % SIZE] === '#')
}

function makeTemplate() {
  for (let restart = 0; restart < 40; restart++) {
    const g = Array.from({ length: SIZE }, () => new Array(SIZE).fill('.'))
    let blacks = 0, tries = 0
    while (blacks < TARGET_BLACKS && tries++ < 6000) {
      const r = rnd(SIZE), c = rnd(SIZE)
      const mr = SIZE - 1 - r, mc = SIZE - 1 - c
      if (g[r][c] === '#' || g[mr][mc] === '#') continue
      g[r][c] = '#'
      g[mr][mc] = '#'
      const S = slots(g)
      if (!valid(g, S)) { g[r][c] = '.'; g[mr][mc] = '.'; continue }
      blacks = g.flat().filter((ch) => ch === '#').length
    }
    if (blacks >= TARGET_BLACKS - 4 && valid(g, slots(g), true)) return g
  }
  return null
}

// --- domain ---
// File 1 = ranked frequency list; file 2 = dictionary list used to define the
// "clean" core (ranked words that are also dictionary words). Extra files add
// fallback-only words. Fills use core words only unless --allow-rare > 0.
const loadList = (f) => {
  const out = []
  for (const w of fs.readFileSync(f, 'utf8').split('\n')) {
    const u = w.trim().split(/\s+/)[0].toUpperCase()
    if (/^[A-Z]{3,15}$/.test(u)) out.push(u)
  }
  return out
}
const ranked = loadList(args[0])
const dictSet = new Set(loadList(args[1] ?? args[0]))
const coreListSet = CORE_LIST ? new Set(loadList(CORE_LIST)) : null
const blocked = BLOCKLIST ? new Set(loadList(BLOCKLIST)) : new Set()
const core = ranked
  .filter(
    (w) =>
      dictSet.has(w) &&
      (!coreListSet || coreListSet.has(w)) &&
      !blocked.has(w),
  )
  .slice(0, CORE_LIMIT)
const coreSet = new Set(core)
// Fallback = every other known word, best-ranked first.
const fallback = []
const fbSeen = new Set()
const addFb = (w) => { if (!coreSet.has(w) && !fbSeen.has(w) && !blocked.has(w)) { fbSeen.add(w); fallback.push(w) } }
for (const w of ranked) addFb(w)
for (const f of args.slice(1)) for (const w of loadList(f)) addFb(w)
const all = core.concat(fallback)
const wordRank = new Map(all.map((w, i) => [w, i]))
const coreByLen = new Map()
const extByLen = new Map()
const push = (m, w) => (m.get(w.length) ?? m.set(w.length, []).get(w.length)).push(w)
for (const w of core) push(coreByLen, w)
for (const w of fallback) push(extByLen, w)
log(`domain: ${all.length} (core ${core.length}, fallback ${fallback.length})`)

const domainFor = (byLen, len, pat) =>
  (byLen.get(len) ?? []).filter((w) => { for (let p = 0; p < len; p++) if (pat[p] !== '.' && w[p] !== pat[p]) return false; return true })

function fill(g) {
  const S = slots(g)
  const slotCells = S.map((s) => Array.from({ length: s.len }, (_, i) => (s.dir === 'a' ? s.row : s.row + i) * SIZE + (s.dir === 'a' ? s.col + i : s.col)))
  const letters = new Array(SIZE * SIZE).fill('')
  const assigned = new Set()
  let nodes = 0
  const candsFor = (si) => {
    const len = S[si].len
    const pat = slotCells[si].map((i) => letters[i] || '.')
    const dom = domainFor(coreByLen, len, pat)
    return ALLOW_RARE > 0 ? dom.concat(domainFor(extByLen, len, pat)) : dom
  }
  function dfs() {
    if (++nodes > NODE_BUDGET) return false
    if (assigned.size === S.length) return true
    let best = -1, bestDom = null
    for (let i = 0; i < S.length; i++) {
      if (assigned.has(i)) continue
      const d = candsFor(i)
      if (!d.length) return false
      if (!bestDom || d.length < bestDom.length) { best = i; bestDom = d }
    }
    assigned.add(best)
    for (const w of bestDom.length > CAP ? bestDom.slice(0, CAP) : bestDom) {
      const cells = slotCells[best]
      const old = cells.map((i) => letters[i])
      cells.forEach((i, p) => (letters[i] = w[p]))
      if (dfs()) return true
      cells.forEach((i, p) => (letters[i] = old[p]))
    }
    assigned.delete(best)
    return false
  }
  if (!dfs()) return null
  const answers = S.map((s) => {
    const cells = slotCells[S.indexOf(s)]
    return cells.map((i) => letters[i]).join('')
  })
  let score = 0, rare = 0, worst = 0
  for (const w of answers) {
    const r = wordRank.get(w) ?? 1e9
    score += Math.min(r, 400000)
    if (r > worst) worst = r
    if (!coreSet.has(w)) rare++
  }
  const grid = []
  for (let r = 0; r < SIZE; r++) grid.push(letters.slice(r * SIZE, r * SIZE + SIZE).map((ch) => ch || '#').join(''))
  return { grid, answers, score, rare, worst, nodes }
}

const found = []
const seenGrid = new Set()
for (let a = 0; a < ATTEMPTS && found.length < COUNT; a++) {
  const g = makeTemplate()
  if (!g) continue
  const f = fill(g)
  if (!f) { log(`attempt ${a}: no fill`); continue }
  const sig = f.grid.join('|')
  log(`attempt ${a}: score=${f.score} rare=${f.rare}/${f.answers.length} worst=${f.worst} nodes=${f.nodes}`)
  if (f.rare > ALLOW_RARE) { log(`attempt ${a}: rejected (rare ${f.rare} > ${ALLOW_RARE})`); continue }
  if (seenGrid.has(sig)) continue
  seenGrid.add(sig)
  found.push(f)
  found.sort((x, y) => x.score - y.score)
}
if (!found.length) { log('NO FILL'); process.exit(2) }
const kept = found.slice(0, COUNT)
const out = kept.map((f) => ({ grid: f.grid, clues: Object.fromEntries(f.answers.map((w) => [w, ''])) }))
console.log(JSON.stringify(COUNT === 1 ? out[0] : out, null, 1))
log(`KEPT ${kept.length} puzzle(s): ${kept.map((f) => `score=${f.score} rare=${f.rare} worst=${f.worst}`).join(' | ')}`)
