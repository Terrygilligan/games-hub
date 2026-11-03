import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import GameOverModal from './GameOverModal'

const W = 480
const H = 360
const PADDLE_W = 80
const PADDLE_H = 10
const BALL_R = 6
const ROWS = 5
const COLS = 8
const BRICK_H = 16
const BRICK_GAP = 4
const BRICK_TOP = 40
const BEST_KEY = 'games-hub.best.breakout'
const ROW_COLORS = ['#f65e3b', '#f59563', '#edc53f', '#4ade80', '#38bdf8']

type Phase = 'ready' | 'playing' | 'over'

interface World {
  px: number
  bx: number
  by: number
  vx: number
  vy: number
  bricks: boolean[][]
  left: boolean
  right: boolean
  lives: number
  level: number
  launched: boolean
}

const newBricks = (): boolean[][] =>
  Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => true))

const freshWorld = (): World => ({
  px: W / 2 - PADDLE_W / 2,
  bx: W / 2,
  by: H - 30,
  vx: 0,
  vy: 0,
  bricks: newBricks(),
  left: false,
  right: false,
  lives: 3,
  level: 1,
  launched: false,
})

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

const scoreOf = (w: World) => w.bricks.flat().filter((b) => !b).length * 10 + (w.level - 1) * 100

export default function BreakoutGame() {
  const { t } = useTranslation()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World>(freshWorld())
  const rafRef = useRef(0)
  const phaseRef = useRef<Phase>('ready')
  const scoreRef = useRef(0)

  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [best, setBest] = useState(loadBest)
  const [isNewBest, setIsNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const w = worldRef.current
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)
    const bw = (W - BRICK_GAP * (COLS + 1)) / COLS
    w.bricks.forEach((row, r) =>
      row.forEach((alive, c) => {
        if (!alive) return
        ctx.fillStyle = ROW_COLORS[r % ROW_COLORS.length]
        ctx.fillRect(BRICK_GAP + c * (bw + BRICK_GAP), BRICK_TOP + r * (BRICK_H + BRICK_GAP), bw, BRICK_H)
      }),
    )
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(w.px, H - 18, PADDLE_W, PADDLE_H)
    ctx.beginPath()
    ctx.arc(w.bx, w.by, BALL_R, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  const finish = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const final = scoreRef.current
    if (final > loadBest()) {
      saveBest(final)
      setBest(final)
      setIsNewBest(true)
    }
    setPhaseSync('over')
  }, [setPhaseSync])

  const loseBall = useCallback(
    (w: World) => {
      w.lives -= 1
      setLives(w.lives)
      if (w.lives <= 0) {
        finish()
        return
      }
      w.bx = W / 2
      w.by = H - 30
      w.vx = 0
      w.vy = 0
      w.launched = false
    },
    [finish],
  )

  const step = useCallback(() => {
    if (phaseRef.current !== 'playing') return
    const w = worldRef.current
    const speed = 3 + w.level * 0.6
    if (w.left) w.px = Math.max(0, w.px - 6)
    if (w.right) w.px = Math.min(W - PADDLE_W, w.px + 6)
    if (w.launched) {
      w.bx += w.vx
      w.by += w.vy
      if (w.bx < BALL_R || w.bx > W - BALL_R) {
        w.vx = -w.vx
        w.bx = Math.max(BALL_R, Math.min(W - BALL_R, w.bx))
      }
      if (w.by < BALL_R) w.vy = -w.vy
      if (
        w.by + BALL_R >= H - 18 &&
        w.by + BALL_R <= H - 18 + PADDLE_H + 2 &&
        w.bx >= w.px &&
        w.bx <= w.px + PADDLE_W &&
        w.vy > 0
      ) {
        const hit = (w.bx - (w.px + PADDLE_W / 2)) / (PADDLE_W / 2)
        w.vx = hit * speed
        w.vy = -Math.sqrt(Math.max(1, speed * speed - w.vx * w.vx))
      }
      const bw = (W - BRICK_GAP * (COLS + 1)) / COLS
      outer: for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!w.bricks[r][c]) continue
          const x0 = BRICK_GAP + c * (bw + BRICK_GAP)
          const y0 = BRICK_TOP + r * (BRICK_H + BRICK_GAP)
          if (w.bx + BALL_R > x0 && w.bx - BALL_R < x0 + bw && w.by + BALL_R > y0 && w.by - BALL_R < y0 + BRICK_H) {
            w.bricks[r][c] = false
            w.vy = -w.vy
            break outer
          }
        }
      }
      if (w.by > H + BALL_R) loseBall(w)
      if (w.bricks.every((row) => row.every((b) => !b))) {
        w.level += 1
        setLevel(w.level)
        w.bricks = newBricks()
        w.bx = W / 2
        w.by = H - 30
        w.vx = 0
        w.vy = 0
        w.launched = false
      }
      const s = scoreOf(w)
      if (s !== scoreRef.current) {
        scoreRef.current = s
        setScore(s)
      }
    }
    draw()
    rafRef.current = requestAnimationFrame(step)
  }, [draw, loseBall])

  const start = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    worldRef.current = freshWorld()
    scoreRef.current = 0
    setScore(0)
    setLives(3)
    setLevel(1)
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    setPhaseSync('playing')
    draw()
    rafRef.current = requestAnimationFrame(step)
  }, [draw, setPhaseSync, step])

  const launch = useCallback(() => {
    const w = worldRef.current
    if (phaseRef.current === 'ready') {
      start()
      return
    }
    if (phaseRef.current !== 'playing' || w.launched) return
    const speed = 3 + w.level * 0.6
    w.vx = (Math.random() - 0.5) * speed * 0.6
    w.vy = -Math.sqrt(speed * speed - w.vx * w.vx)
    w.launched = true
  }, [start])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const w = worldRef.current
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') w.left = e.type === 'keydown'
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') w.right = e.type === 'keydown'
      if ((e.key === ' ' || e.key === 'ArrowUp') && e.type === 'keydown') {
        e.preventDefault()
        launch()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [launch])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  const pointerMove = (clientX: number) => {
    const canvas = canvasRef.current
    if (!canvas || phaseRef.current !== 'playing') return
    const rect = canvas.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * W
    worldRef.current.px = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2))
    if (!worldRef.current.launched) worldRef.current.bx = worldRef.current.px + PADDLE_W / 2
  }

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: 'breakout',
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
            aria-label={t('games.breakout.highScores')}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-500/10 dark:text-sky-300"
          >
            <Trophy size={15} />
            <span className="hidden sm:inline">{t('games.breakout.highScores')}</span>
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {t('games.breakout.score')}: {score}
            <span className="ml-3 text-slate-500 dark:text-slate-400">
              {t('games.breakout.level')}: {level} · {t('games.breakout.lives')}: {lives}
            </span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.breakout.best')}: {best}
            </span>
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw size={14} />
              {t('games.breakout.newGame')}
            </button>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {t('games.breakout.instructions')}
        </p>

        <div className="relative mx-auto w-full max-w-[480px]">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onPointerMove={(e) => pointerMove(e.clientX)}
            onPointerDown={(e) => {
              pointerMove(e.clientX)
              launch()
            }}
            className="aspect-[4/3] w-full touch-none rounded-2xl bg-slate-950"
          />

          {phase === 'ready' && (
            <button
              type="button"
              onClick={start}
              className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/70 backdrop-blur-sm"
            >
              <span className="rounded-xl bg-slate-200 px-6 py-3 text-lg font-bold text-slate-900">
                {t('games.breakout.tapToStart')}
              </span>
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

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">{t('games.breakout.controlsDesktop')}</span>
          <span className="sm:hidden">{t('games.breakout.controlsTouch')}</span>
        </p>
      </main>

      {showLeaderboard && (
        <LeaderboardModal
          gameId="breakout"
          title={t('games.titles.breakout.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
