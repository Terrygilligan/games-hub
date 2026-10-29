// Sudoku generator — backtracking fill + unique-solution digging.
// Grid = number[81], 0 = empty.
export type Grid = number[]

const shuffle = <T>(arr: T[]): T[] => {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const canPlace = (g: Grid, pos: number, v: number): boolean => {
  const r = Math.floor(pos / 9)
  const c = pos % 9
  for (let i = 0; i < 9; i++) {
    if (g[r * 9 + i] === v || g[i * 9 + c] === v) return false
  }
  const br = Math.floor(r / 3) * 3
  const bc = Math.floor(c / 3) * 3
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (g[(br + i) * 9 + bc + j] === v) return false
    }
  }
  return true
}

const fill = (g: Grid): boolean => {
  const pos = g.indexOf(0)
  if (pos === -1) return true
  for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (canPlace(g, pos, v)) {
      g[pos] = v
      if (fill(g)) return true
      g[pos] = 0
    }
  }
  return false
}

// Count solutions up to `limit` (early exit — for uniqueness checks).
const countSolutions = (g: Grid, limit: number): number => {
  const pos = g.indexOf(0)
  if (pos === -1) return 1
  let count = 0
  for (let v = 1; v <= 9; v++) {
    if (canPlace(g, pos, v)) {
      g[pos] = v
      count += countSolutions(g, limit)
      g[pos] = 0
      if (count >= limit) return count
    }
  }
  return count
}

// Generate a puzzle with ~givens clues and a unique solution.
export const generate = (givens: number): { puzzle: Grid; solution: Grid } => {
  const solution: Grid = new Array(81).fill(0)
  fill(solution)
  const puzzle = solution.slice()
  let left = 81
  for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k))) {
    if (left <= givens) break
    const backup = puzzle[i]
    puzzle[i] = 0
    if (countSolutions(puzzle.slice(), 2) === 1) left--
    else puzzle[i] = backup
  }
  return { puzzle, solution }
}
