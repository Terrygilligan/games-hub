// Connect Four engine: 7×6 grid, minimax with alpha-beta pruning.
// Board is column-major: board[col][row], row 0 = top.
export const COLS = 7
export const ROWS = 6
export type Cell = 0 | 1 | 2 // 0 empty, 1 human, 2 ai
export type Board = Cell[][]

export const emptyBoard = (): Board =>
  Array.from({ length: COLS }, () => Array.from({ length: ROWS }, () => 0 as Cell))

export const dropRow = (b: Board, col: number): number => {
  for (let r = ROWS - 1; r >= 0; r--) if (b[col][r] === 0) return r
  return -1
}

export const play = (b: Board, col: number, p: 1 | 2): Board => {
  const next = b.map((c) => [...c]) as Board
  const r = dropRow(b, col)
  if (r >= 0) next[col][r] = p
  return next
}

const LINES: [number, number][][] = (() => {
  const lines: [number, number][][] = []
  const dirs = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ]
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++)
      for (const [dc, dr] of dirs) {
        const line: [number, number][] = []
        for (let i = 0; i < 4; i++) {
          const cc = c + dc * i
          const rr = r + dr * i
          if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) break
          line.push([cc, rr])
        }
        if (line.length === 4) lines.push(line)
      }
  return lines
})()

export const winner = (b: Board): Cell => {
  for (const line of LINES) {
    const v = b[line[0][0]][line[0][1]]
    if (v !== 0 && line.every(([c, r]) => b[c][r] === v)) return v
  }
  return 0
}

export const winningCells = (b: Board): [number, number][] => {
  for (const line of LINES) {
    const v = b[line[0][0]][line[0][1]]
    if (v !== 0 && line.every(([c, r]) => b[c][r] === v)) return line
  }
  return []
}

export const isFull = (b: Board) => b.every((c) => c[0] !== 0)

const scoreWindow = (w: Cell[], me: 1 | 2): number => {
  const mine = w.filter((v) => v === me).length
  const theirs = w.filter((v) => v !== 0 && v !== me).length
  if (mine === 4) return 100000
  if (mine === 3 && theirs === 0) return 50
  if (mine === 2 && theirs === 0) return 5
  if (theirs === 3 && mine === 0) return -80
  return 0
}

const evaluate = (b: Board, me: 1 | 2): number => {
  let score = 0
  for (let r = 0; r < ROWS; r++) if (b[3][r] === me) score += 4
  for (const line of LINES) score += scoreWindow(line.map(([c, r]) => b[c][r]), me)
  return score
}

const ORDER = [3, 2, 4, 1, 5, 0, 6]

const minimax = (
  b: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  me: 1 | 2,
): number => {
  const w = winner(b)
  if (w === me) return 1000000 + depth * 10
  if (w !== 0) return -1000000 - depth * 10
  if (isFull(b)) return 0
  if (depth === 0) return evaluate(b, me)
  if (maximizing) {
    let best = -Infinity
    for (const c of ORDER) {
      if (dropRow(b, c) < 0) continue
      best = Math.max(best, minimax(play(b, c, me), depth - 1, alpha, beta, false, me))
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  }
  let best = Infinity
  const foe: 1 | 2 = me === 1 ? 2 : 1
  for (const c of ORDER) {
    if (dropRow(b, c) < 0) continue
    best = Math.min(best, minimax(play(b, c, foe), depth - 1, alpha, beta, true, me))
    beta = Math.min(beta, best)
    if (beta <= alpha) break
  }
  return best
}

// Returns the AI's chosen column. Among near-equal best moves it picks
// randomly — that's the randomized opening/variability the spec wants.
export const chooseMove = (b: Board, depth: number, me: 1 | 2 = 2): number => {
  const scored: { col: number; v: number }[] = []
  for (const c of ORDER) {
    if (dropRow(b, c) < 0) continue
    scored.push({ col: c, v: minimax(play(b, c, me), depth - 1, -Infinity, Infinity, false, me) })
  }
  const best = Math.max(...scored.map((s) => s.v))
  const top = scored.filter((s) => s.v >= best - 10)
  return top[Math.floor(Math.random() * top.length)].col
}
