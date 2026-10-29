import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import SnakeBoard from './SnakeBoard'
import GameOverModal from './GameOverModal'

const GRID = 20
const BASE_MS = 160
const MIN_MS = 70
const SPEED_STEP = 5
const BEST_KEY = 'games-hub.best.snake'

export type Vec = { x: number; y: number }
type Phase = 'ready' | 'playing' | 'paused' | 'over'

const DIRS: Record<string, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const freshSnake = (): Vec[] => [
  { x: 8, y: 10 },
  { x: 7, y: 10 },
  { x: 6, y: 10 },
]

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

const randomFood = (snake: Vec[]): Vec => {
  const free: Vec[] = []
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y })
    }
  }
  return free[Math.floor(Math.random() * free.length)] ?? { x: 0, y: 0 }
}

const DPAD_BTN =
  'flex h-14 w-14 items-center justify-center rounded-xl bg-slate-200 text-slate-700 transition active:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:active:bg-slate-700'

export default function SnakeGame() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const snakeRef = useRef<Vec[]>(freshSnake())
  const dirRef = useRef<Vec>(DIRS.right)
  const queueRef = useRef<Vec[]>([])
  const foodRef = useRef<Vec>({ x: 14, y: 10 })
  const scoreRef = useRef(0)
  const speedRef = useRef(BASE_MS)
  const accRef = useRef(0)
  const lastRef = useRef(0)
  const phaseRef = useRef<Phase>('ready')

  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [isNewBest, setIsNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const start = useCallback(() => {
    snakeRef.current = freshSnake()
    dirRef.current = DIRS.right
    queueRef.current = []
    foodRef.current = randomFood(snakeRef.current)
    scoreRef.current = 0
    speedRef.current = BASE_MS
    accRef.current = 0
    lastRef.current = 0
    setScore(0)
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    setPhaseSync('playing')
  }, [setPhaseSync])

  const queueDirection = useCallback((d: Vec) => {
    const last = queueRef.current[queueRef.current.length - 1] ?? dirRef.current
    const isReverse = d.x === -last.x && d.y === -last.y
    const isSame = d.x === last.x && d.y === last.y
    if (!isReverse && !isSame && queueRef.current.length < 2) queueRef.current.push(d)
  }, [])

  const handleDirection = useCallback(
    (d: Vec) => {
      if (phaseRef.current === 'ready') start()
      else if (phaseRef.current === 'paused') setPhaseSync('playing')
      if (phaseRef.current === 'playing') queueDirection(d)
    },
    [queueDirection, setPhaseSync, start],
  )

  const handleTap = useCallback(() => {
    if (phaseRef.current === 'ready') start()
    else if (phaseRef.current === 'paused') setPhaseSync('playing')
  }, [setPhaseSync, start])

  const step = useCallback(() => {
    const dir = queueRef.current.shift() ?? dirRef.current
    dirRef.current = dir
    const snake = snakeRef.current
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }
    const willGrow = head.x === foodRef.current.x && head.y === foodRef.current.y
    const body = willGrow ? snake : snake.slice(0, -1)
    const hitWall = head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID
    const hitSelf = body.some((s) => s.x === head.x && s.y === head.y)
    if (hitWall || hitSelf) {
      const final = scoreRef.current
      if (final > loadBest()) {
        saveBest(final)
        setBest(final)
        setIsNewBest(true)
      }
      setPhaseSync('over')
      return
    }
    snake.unshift(head)
    if (willGrow) {
      scoreRef.current += 1
      setScore(scoreRef.current)
      speedRef.current = Math.max(MIN_MS, BASE_MS - scoreRef.current * SPEED_STEP)
      foodRef.current = randomFood(snake)
    } else {
      snake.pop()
    }
  }, [setPhaseSync])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const size = canvas.width
    const cell = size / GRID

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.07)'
    ctx.lineWidth = 1
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath()
      ctx.moveTo(i * cell, 0)
      ctx.lineTo(i * cell, size)
      ctx.moveTo(0, i * cell)
      ctx.lineTo(size, i * cell)
      ctx.stroke()
    }

    const food = foodRef.current
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell * 0.38, 0, Math.PI * 2)
    ctx.fill()

    snakeRef.current.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#38bdf8' : '#0284c7'
      const inset = i === 0 ? 1 : 2
      ctx.beginPath()
      ctx.roundRect(s.x * cell + inset, s.y * cell + inset, cell - inset * 2, cell - inset * 2, 5)
      ctx.fill()
    })
  }, [])

  useEffect(() => {
    if (phase !== 'playing') {
      draw()
      return
    }
    let raf = 0
    const loop = (time: number) => {
      if (!lastRef.current) lastRef.current = time
      accRef.current += time - lastRef.current
      lastRef.current = time
      while (accRef.current >= speedRef.current && phaseRef.current === 'playing') {
        accRef.current -= speedRef.current
        step()
      }
      draw()
      if (phaseRef.current === 'playing') raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase, step, draw])

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
      handleDirection(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleDirection])

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phaseRef.current === 'playing') setPhaseSync('paused')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [setPhaseSync])

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: 'snake',
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
            {t('games.snake.highScores')}
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {t('games.snake.score')}: {score}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {t('games.snake.best')}: {best}
          </span>
        </div>

        <div className="relative mx-auto w-full max-w-[480px]">
          <SnakeBoard canvasRef={canvasRef} onDirection={handleDirection} onTap={handleTap} />

          {phase === 'ready' && (
            <button
              type="button"
              onClick={handleTap}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-950/70 text-center backdrop-blur-sm"
            >
              <span className="text-lg font-semibold text-white">{t('games.snake.tapToStart')}</span>
              <span className="max-w-xs px-4 text-sm text-slate-300">
                {t('games.snake.instructions')}
              </span>
            </button>
          )}

          {phase === 'paused' && (
            <button
              type="button"
              onClick={handleTap}
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/70 backdrop-blur-sm"
            >
              <span className="text-lg font-semibold text-white">{t('games.snake.paused')}</span>
            </button>
          )}

          {phase === 'over' && (
            <GameOverModal
              score={score}
              isNewBest={isNewBest}
              submitting={submitting}
              submitted={submitted}
              defaultNickname={getNickname() ?? ''}
              onSubmit={handleSubmit}
              onPlayAgain={start}
              onShowLeaderboard={() => setShowLeaderboard(true)}
            />
          )}
        </div>

        <div className="mx-auto mt-4 grid w-fit grid-cols-3 gap-2 sm:hidden">
          <span />
          <button type="button" aria-label="Up" className={DPAD_BTN} onClick={() => handleDirection(DIRS.up)}>
            <ChevronUp size={26} />
          </button>
          <span />
          <button type="button" aria-label="Left" className={DPAD_BTN} onClick={() => handleDirection(DIRS.left)}>
            <ChevronLeft size={26} />
          </button>
          <button type="button" aria-label="Down" className={DPAD_BTN} onClick={() => handleDirection(DIRS.down)}>
            <ChevronDown size={26} />
          </button>
          <button type="button" aria-label="Right" className={DPAD_BTN} onClick={() => handleDirection(DIRS.right)}>
            <ChevronRight size={26} />
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">{t('games.snake.controlsDesktop')}</span>
          <span className="sm:hidden">{t('games.snake.controlsTouch')}</span>
        </p>
      </main>

      {showLeaderboard && (
        <LeaderboardModal
          gameId="snake"
          title={t('games.titles.snake.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
