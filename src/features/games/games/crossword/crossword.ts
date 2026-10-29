// Crossword model — derive slots + standard numbering from a solution grid.
// Grid: string[] rows, '#' = black square, letters = solution.
export interface Clue {
  num: number
  dir: 'a' | 'd'
  row: number
  col: number
  len: number
  answer: string
  text: string
}

export interface Built {
  size: number
  across: Clue[]
  down: Clue[]
  numAt: number[] // per-cell clue number, 0 = none (flat r*size+c)
  slotAt: number[] // per-cell clue index into `all`, -1 = black
  all: Clue[]
}

const isCell = (grid: string[], r: number, c: number): boolean =>
  r >= 0 && r < grid.length && c >= 0 && c < grid[r].length && grid[r][c] !== '#'

export const buildPuzzle = (
  grid: string[],
  acrossTexts: string[],
  downTexts: string[],
): Built => {
  const size = grid.length
  const numAt = new Array(size * size).fill(0)
  const slotAt = new Array(size * size).fill(-1)
  const across: Clue[] = []
  const down: Clue[] = []
  let num = 0

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isCell(grid, r, c)) continue
      const startA =
        !isCell(grid, r, c - 1) && isCell(grid, r, c + 1)
      const startD =
        !isCell(grid, r - 1, c) && isCell(grid, r + 1, c)
      if (!startA && !startD) continue
      num++
      numAt[r * size + c] = num
      if (startA) {
        let len = 0
        while (isCell(grid, r, c + len)) len++
        across.push({ num, dir: 'a', row: r, col: c, len, answer: grid[r].slice(c, c + len), text: '' })
      }
      if (startD) {
        let len = 0
        while (isCell(grid, r + len, c)) len++
        let ans = ''
        for (let i = 0; i < len; i++) ans += grid[r + i][c]
        down.push({ num, dir: 'd', row: r, col: c, len, answer: ans, text: '' })
      }
    }
  }

  across.forEach((cl, i) => {
    cl.text = acrossTexts[i] ?? ''
  })
  down.forEach((cl, i) => {
    cl.text = downTexts[i] ?? ''
  })

  const all = [...across, ...down]
  all.forEach((cl, idx) => {
    for (let i = 0; i < cl.len; i++) {
      const rr = cl.dir === 'a' ? cl.row : cl.row + i
      const cc = cl.dir === 'a' ? cl.col : cl.col + i
      slotAt[rr * size + cc] = idx // last writer wins; crossing cells keep one ref
    }
  })

  return { size, across, down, all, numAt, slotAt }
}

// Cells belonging to a clue, as flat indices.
export const cellsOf = (clue: Clue, size: number): number[] =>
  Array.from({ length: clue.len }, (_, i) =>
    clue.dir === 'a' ? clue.row * size + clue.col + i : (clue.row + i) * size + clue.col,
  )
