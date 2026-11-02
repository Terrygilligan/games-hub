import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import Board2048 from './Board2048'
import GameOverModal from './GameOverModal'

const SIZE = 4
const CLEANUP_MS = 150
const BEST_KEY = 'games-hub.best.2048'

export type Vec = { x: number; y: number }
export type Tile = {
  id: number
  value: number
  row: number
  col: number
  merged?: boolean
  spawned?: boolean
  gone?: boolean
}
type Phase = 'playing' | 'won' | 'over'

const DIRS: Record<string, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const loadBest = (): number => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

const saveBest = (v: number) => {
  try {
    localStorage.setItem(BEST_KEY, String(v))
  } catch {
    // storage unavailable — best won't persist
  }
}

const emptyCells = (tiles: Tile[]): { row: number; col: number }[] => {
  const taken = new Set(tiles.filter((t) => !t.gone).map((t) => `${t.row},${t.col}`))
  const free: { row: number; col: number }[] = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!taken.has(`${r},${c}`)) free.push({ row: r, col: c })
    }
  }
  return free
}

const spawnIn = (tiles: Tile[], nextId: () => number): Tile[] => {
  const free = emptyCells(tiles)
  const cell = free[Math.floor(Math.random() * free.length)]
  if (!cell) return tiles
  return [
    ...tiles,
    {
      id: nextId(),
      value: Math.random() < 0.9 ? 2 : 4,
      row: cell.row,
      col: cell.col,
      spawned: true,
    },
  ]
}

// Slides every tile toward dir, merging equal neighbours once per move.
// Consumed tiles keep rendering at the merge cell (gone) until cleanup so the
// CSS transform transition shows both tiles sliding into place.
const computeMove = (tiles: Tile[], dir: Vec) => {
  const at = new Map<string, Tile>()
  for (const t of tiles) {
    if (!t.gone) at.set(`${t.row},${t.col}`, t)
  }
  let moved = false
  let gained = 0
  const next: Tile[] = []
  for (let line = 0; line < SIZE; line++) {
    const seq: { row: number; col: number }[] = []
    for (let i = 0; i < SIZE; i++) {
      seq.push({
        row: dir.y === 0 ? line : dir.y < 0 ? i : SIZE - 1 - i,
        col: dir.x === 0 ? line : dir.x < 0 ? i : SIZE - 1 - i,
      })
    }
    const placed: Tile[] = []
    for (const pos of seq) {
      const t = at.get(`${pos.row},${pos.col}`)
      if (!t) continue
      const last = placed[placed.length - 1]
      if (last && last.value === t.value && !last.merged) {
        last.value *= 2
        last.merged = true
        gained += last.value
        next.push({ ...t, row: last.row, col: last.col, merged: false, spawned: false, gone: true })
        moved = true
      } else {
        const target = seq[placed.length]
        const nextTile = { ...t, row: target.row, col: target.col, merged: false, spawned: false }
        if (t.row !== target.row || t.col !== target.col) moved = true
        placed.push(nextTile)
        next.push(nextTile)
      }
    }
  }
  return { tiles: next, gained, moved }
}

const canMove = (tiles: Tile[]): boolean => {
  const at = new Map<string, number>()
  for (const t of tiles) {
    if (!t.gone) at.set(`${t.row},${t.col}`, t.value)
  }
  if (at.size < SIZE * SIZE) return true
  for (const [key, value] of at) {
    const [r, c] = key.split(',').map(Number)
    if (at.get(`${r},${c + 1}`) === value || at.get(`${r + 1},${c}`) === value) return true
  }
  return false
}

export default function Twenty48Game() {
  const { t } = useTranslation()

  const nextIdRef = useRef(1)
  const nextId = useCallback(() => nextIdRef.current++, [])
  const tilesRef = useRef<Tile[]>([])
  const scoreRef = useRef(0)
  const phaseRef = useRef<Phase>('playing')
  const wonRef = useRef(false)
  const cleanupRef = useRef<number | undefined>(undefined)

  const [tiles, setTiles] = useState<Tile[]>(() => {
    const fresh = spawnIn(spawnIn([], nextId), nextId)
    tilesRef.current = fresh
    return fresh
  })
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [phase, setPhase] = useState<Phase>('playing')
  const [isNewBest, setIsNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const setBoard = useCallback((next: Tile[]) => {
    tilesRef.current = next
    setTiles(next)
  }, [])

  const scheduleCleanup = useCallback(() => {
    window.clearTimeout(cleanupRef.current)
    cleanupRef.current = window.setTimeout(() => {
      const cleaned = tilesRef.current
        .filter((tile) => !tile.gone)
        .map((tile) => ({ ...tile, merged: false, spawned: false }))
      setBoard(cleaned)
    }, CLEANUP_MS)
  }, [setBoard])

  const restart = useCallback(() => {
    window.clearTimeout(cleanupRef.current)
    wonRef.current = false
    scoreRef.current = 0
    setScore(0)
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    setBoard(spawnIn(spawnIn([], nextId), nextId))
    setPhaseSync('playing')
  }, [nextId, setBoard, setPhaseSync])

  const finish = useCallback(() => {
    const final = scoreRef.current
    if (final > loadBest()) {
      saveBest(final)
      setBest(final)
      setIsNewBest(true)
    }
    setPhaseSync('over')
  }, [setPhaseSync])

  const handleMove = useCallback(
    (dir: Vec) => {
      if (phaseRef.current !== 'playing') return
      const result = computeMove(tilesRef.current, dir)
      if (!result.moved) return
      const next = spawnIn(result.tiles, nextId)
      setBoard(next)
      scoreRef.current += result.gained
      setScore(scoreRef.current)
      if (!canMove(next)) {
        finish()
      } else if (!wonRef.current && next.some((tile) => !tile.gone && tile.value >= 2048)) {
        wonRef.current = true
        setPhaseSync('won')
      }
      scheduleCleanup()
    },
    [finish, nextId, scheduleCleanup, setBoard, setPhaseSync],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const dir =
        k === 'arrowup' || k === 'w'
          ? DIRS.up
          : k === 'arrowdown' || k === 's'
            ? DIRS.down
            : k === 'arrowleft' || k === 'a'
              ? DIRS.left
              : k === 'arrowright' || k === 'd'
                ? DIRS.right
                : null
      if (!dir) return
      e.preventDefault()
      handleMove(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleMove])

  useEffect(() => () => window.clearTimeout(cleanupRef.current), [])

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: '2048',
      playerId: getPlayerId(),
      nickname: name,
      score: scoreRef.current,
    })
    setSubmitting(false)
    if (ok) setSubmitted(true)
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-8">
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft size={16} />
            {t('games.actions.backToHub')}
          </Link>
          <button
            type="button"
            onClick={() => setShowLeaderboard(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-500/10 dark:text-sky-400"
          >
            <Trophy size={15} />
            {t('games.2048.highScores')}
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {t('games.2048.score')}: {score}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.2048.best')}: {best}
            </span>
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw size={14} />
              {t('games.2048.newGame')}
            </button>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {t('games.2048.instructions')}
        </p>

        <div className="relative mx-auto w-full max-w-[480px]">
          <Board2048 tiles={tiles} onMove={handleMove} />

          {phase === 'won' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-950/80 p-6 text-center backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-amber-400">{t('games.2048.youWin')}</h2>
              <button
                type="button"
                onClick={() => setPhaseSync('playing')}
                className="inline-flex h-11 min-w-40 items-center justify-center rounded-lg bg-slate-200 px-6 text-sm font-medium text-slate-900 transition hover:bg-white"
              >
                {t('games.2048.keepPlaying')}
              </button>
            </div>
          )}

          {phase === 'over' && (
            <GameOverModal
              score={score}
              isNewBest={isNewBest}
              submitting={submitting}
              submitted={submitted}
              defaultNickname={getNickname() ?? ''}
              onSubmit={handleSubmit}
              onPlayAgain={restart}
              onShowLeaderboard={() => setShowLeaderboard(true)}
            />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">{t('games.2048.controlsDesktop')}</span>
          <span className="sm:hidden">{t('games.2048.controlsTouch')}</span>
        </p>
      </main>

      {showLeaderboard && (
        <LeaderboardModal
          gameId="2048"
          title={t('games.titles.2048.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
