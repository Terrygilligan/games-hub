// Migrate locale-embedded crossword puzzles -> packs/<lang>.json (answer-keyed clues).
import fs from 'fs'
import path from 'path'

const LOCALES = 'src/i18n/locales'
const OUT = 'src/features/games/games/crossword/packs'
fs.mkdirSync(OUT, { recursive: true })

const isCell = (g, r, c) => r >= 0 && r < g.length && c >= 0 && c < g[r].length && g[r][c] !== '#'
function answers(grid) {
  const size = grid.length
  const across = [], down = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (!isCell(grid, r, c)) continue
      if (!isCell(grid, r, c - 1) && isCell(grid, r, c + 1)) {
        let len = 0
        while (isCell(grid, r, c + len)) len++
        across.push(grid[r].slice(c, c + len))
      }
      if (!isCell(grid, r - 1, c) && isCell(grid, r + 1, c)) {
        let len = 0
        while (isCell(grid, r + len, c)) len++
        let ans = ''
        for (let i = 0; i < len; i++) ans += grid[r + i][c]
        down.push(ans)
      }
    }
  return { across, down }
}

for (const lang of ['en', 'bg', 'de', 'es', 'fr', 'nl']) {
  const file = path.join(LOCALES, `${lang}.json`)
  const d = JSON.parse(fs.readFileSync(file, 'utf8'))
  const puzzles = d.games?.crossword?.puzzles ?? []
  if (!puzzles.length && fs.existsSync(path.join(OUT, `${lang}.json`))) continue
  const pack = puzzles.map((p) => {
    const { across, down } = answers(p.grid)
    const clues = {}
    across.forEach((w, i) => (clues[w] = (p.across ?? [])[i] ?? p.clues?.[w] ?? ''))
    down.forEach((w, i) => (clues[w] = (p.down ?? [])[i] ?? p.clues?.[w] ?? ''))
    return { grid: p.grid, clues }
  })
  fs.writeFileSync(path.join(OUT, `${lang}.json`), JSON.stringify(pack, null, 1) + '\n')
  if (d.games?.crossword) delete d.games.crossword.puzzles
  fs.writeFileSync(file, JSON.stringify(d, null, 2) + '\n')
  console.log(`${lang}: migrated ${pack.length} puzzles, stripped locale`)
}
