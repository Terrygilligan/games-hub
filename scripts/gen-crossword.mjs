// 15x15 crossword generator: random symmetric template + CSP fill,
// best-of-N attempts scored by word frequency, emits pack JSON.
// Usage: node scripts/gen-crossword.mjs [attempts] <ranked-list> <fallback-list>
//   node scripts/gen-crossword.mjs 12 scripts/en_50k.txt scripts/words_alpha.txt > out.json
import fs from 'fs'

const SIZE = 15
const TARGET_BLACKS = 54
const NODE_BUDGET = 150000
const CAP = 400 // max candidates tried per slot

let args = process.argv.slice(2)
const ATTEMPTS = /^\d+$/.test(args[0] ?? '') ? Number(args.shift()) : 8
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

function valid(g, S) {
  if (S.some((s) => s.len < 3)) return false
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
    if (blacks >= TARGET_BLACKS - 4) return g
  }
  return null
}

// --- domain ---
const all = []
const seenW = new Set()
for (const f of args)
  for (const w of fs.readFileSync(f, 'utf8').split('\n')) {
    const u = w.trim().split(/\s+/)[0].toUpperCase()
    if (/^[A-Z]{3,15}$/.test(u) && !seenW.has(u)) { seenW.add(u); all.push(u) }
  }
const wordRank = new Map(all.map((w, i) => [w, i]))
const byLen = new Map()
for (const w of all) (byLen.get(w.length) ?? byLen.set(w.length, []).get(w.length)).push(w)
log('domain:', all.length)

function fill(g) {
  const S = slots(g)
  const slotCells = S.map((s) => Array.from({ length: s.len }, (_, i) => (s.dir === 'a' ? s.row : s.row + i) * SIZE + (s.dir === 'a' ? s.col + i : s.col)))
  const letters = new Array(SIZE * SIZE).fill('')
  const assigned = new Set()
  let nodes = 0
  const domainFor = (si) => {
    const len = S[si].len
    const ws = byLen.get(len)
    if (!ws) return []
    const pat = slotCells[si].map((i) => letters[i] || '.')
    return ws.filter((w) => { for (let p = 0; p < len; p++) if (pat[p] !== '.' && w[p] !== pat[p]) return false; return true })
  }
  function dfs() {
    if (++nodes > NODE_BUDGET) return false
    if (assigned.size === S.length) return true
    let best = -1, bestDom = null
    for (let i = 0; i < S.length; i++) {
      if (assigned.has(i)) continue
      const d = domainFor(i)
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
  let score = 0, rare = 0
  for (const w of answers) {
    const r = wordRank.get(w) ?? 1e9
    score += Math.min(r, 400000)
    if (r > 50000) rare++
  }
  const grid = []
  for (let r = 0; r < SIZE; r++) grid.push(letters.slice(r * SIZE, r * SIZE + SIZE).map((ch) => ch || '#').join(''))
  return { grid, answers, score, rare, nodes }
}

let best = null
for (let a = 0; a < ATTEMPTS; a++) {
  const g = makeTemplate()
  if (!g) continue
  const f = fill(g)
  if (!f) { log(`attempt ${a}: no fill`); continue }
  log(`attempt ${a}: score=${f.score} rare=${f.rare}/${f.answers.length} nodes=${f.nodes}`)
  if (!best || f.score < best.score) best = f
}
if (!best) { log('NO FILL'); process.exit(2) }
const out = { grid: best.grid, clues: Object.fromEntries(best.answers.map((w) => [w, ''])) }
console.log(JSON.stringify(out, null, 1))
log(`BEST: score=${best.score} rare=${best.rare}`)
