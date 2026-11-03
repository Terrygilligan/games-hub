// Validate + append generated puzzles to a pack file.
// Usage: node scripts/pack-add.mjs <new.json|new-array.json> <pack-file> [maxPuzzles]
import fs from 'fs'

const [newFile, packFile, maxArg] = process.argv.slice(2)
const MAX = Number(maxArg ?? 30)
const incoming = JSON.parse(fs.readFileSync(newFile, 'utf8'))
const pack = JSON.parse(fs.readFileSync(packFile, 'utf8'))
const items = (Array.isArray(incoming) ? incoming : [incoming]).filter(Boolean)

const isCell = (g, r, c) => r >= 0 && r < g.length && c >= 0 && c < g[r].length && g[r][c] !== '#'
function slots(grid) {
  const out = []
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid.length; c++) {
      if (!isCell(grid, r, c)) continue
      if (!isCell(grid, r, c - 1) && isCell(grid, r, c + 1)) {
        let len = 0
        while (isCell(grid, r, c + len)) len++
        out.push({ dir: 'a', row: r, col: c, len, answer: grid[r].slice(c, c + len) })
      }
      if (!isCell(grid, r - 1, c) && isCell(grid, r + 1, c)) {
        let len = 0, ans = ''
        while (isCell(grid, r + len, c)) { ans += grid[r + len][c]; len++ }
        out.push({ dir: 'd', row: r, col: c, len, answer: ans })
      }
    }
  return out
}

const sig = (p) => p.grid.join('|')
const have = new Set(pack.map(sig))
let added = 0, failed = 0
for (const p of items) {
  const S = slots(p.grid)
  const problems = []
  if (S.some((s) => s.len < 3)) problems.push('slot<3')
  const covered = new Set()
  for (const s of S)
    for (let i = 0; i < s.len; i++)
      covered.add((s.dir === 'a' ? s.row : s.row + i) * p.grid.length + (s.dir === 'a' ? s.col + i : s.col))
  const whites = p.grid.join('').split('').filter((c) => c !== '#').length
  if (covered.size !== whites) problems.push('uncovered cells')
  const missing = S.filter((s) => !p.clues?.[s.answer]).map((s) => s.answer)
  if (missing.length) problems.push(`unclued: ${missing.join(',')}`)
  if (have.has(sig(p))) problems.push('duplicate grid')
  if (problems.length) { failed++; console.error(`reject: ${problems.join('; ')}`); continue }
  pack.push(p)
  have.add(sig(p))
  added++
}
const trimmed = pack.length > MAX ? pack.slice(pack.length - MAX) : pack
fs.writeFileSync(packFile, JSON.stringify(trimmed, null, 1) + '\n')
console.log(`added=${added} rejected=${failed} pack size=${trimmed.length}`)
