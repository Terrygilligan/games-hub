// Word-ladder graph helpers — hamming-1 adjacency over a word list.
export const isOneLetterDiff = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) d++
    if (d > 1) return false
  }
  return d === 1
}

export const letterDiff = (a: string, b: string): number => {
  if (a.length !== b.length) return Math.abs(a.length - b.length) + 1
  let d = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++
  return d
}

// BFS distance from start to target over dict (Infinity = unreachable).
export const shortestPath = (start: string, target: string, dict: string[]): number => {
  if (start === target) return 0
  const dist = new Map<string, number>([[start, 0]])
  const q = [start]
  while (q.length) {
    const w = q.shift() as string
    for (const n of dict) {
      if (!dist.has(n) && isOneLetterDiff(w, n)) {
        if (n === target) return dist.get(w)! + 1
        dist.set(n, dist.get(w)! + 1)
        q.push(n)
      }
    }
  }
  return Infinity
}

// BFS shortest path from start to target — returns the full word list
// including both endpoints, or null when unreachable. Used for hints.
export const findPath = (
  dict: string[],
  start: string,
  target: string,
): string[] | null => {
  if (start === target) return [start]
  const parent = new Map<string, string | null>([[start, null]])
  const q = [start]
  while (q.length) {
    const w = q.shift() as string
    for (const n of dict) {
      if (parent.has(n) || !isOneLetterDiff(w, n)) continue
      parent.set(n, w)
      if (n === target) {
        const path = [n]
        let cur: string | null | undefined = w
        while (cur) {
          path.unshift(cur)
          cur = parent.get(cur)
        }
        return path
      }
      q.push(n)
    }
  }
  return null
}

// Generate a guaranteed-solvable puzzle: BFS from a random start, pick a
// random word at distance [floor, maxD]. Tries floor=minD first, then
// falls back to 2 for sparse dictionaries (still ≥2 real moves).
export const findPuzzle = (
  dict: string[],
  minD = 3,
  maxD = 7,
  tries = 25,
): { start: string; target: string; optimal: number } | null => {
  for (const floor of [minD, 2]) {
    for (let i = 0; i < tries; i++) {
      const start = dict[Math.floor(Math.random() * dict.length)]
      const dist = new Map<string, number>([[start, 0]])
      const q = [start]
      const eligible: string[] = []
      while (q.length) {
        const w = q.shift() as string
        for (const n of dict) {
          if (!dist.has(n) && isOneLetterDiff(w, n)) {
            const d = dist.get(w)! + 1
            dist.set(n, d)
            if (d >= floor && d <= maxD) eligible.push(n)
            q.push(n)
          }
        }
      }
      if (eligible.length > 0) {
        const target = eligible[Math.floor(Math.random() * eligible.length)]
        return { start, target, optimal: dist.get(target)! }
      }
    }
  }
  return null
}
