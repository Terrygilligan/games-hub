import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, RotateCcw, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import { dailyLabel, dailySeed, mulberry32 } from '../../services/daily'
import LeaderboardModal from '../../components/LeaderboardModal'
import GameOverModal from './GameOverModal'

const DURATION_S = 30
const BEST_KEY = 'games-hub.best.aim'

type Phase = 'ready' | 'playing' | 'over'

interface Target {
  x: number // percent
  y: number
  r: number // percent of width
}

const loadBest = (daily: boolean): number => {
  try {
    return Number(localStorage.getItem(`${BEST_KEY}${daily ? '.daily' : ''}`)) || 0
  } catch {
    return 0
  }
}

const saveBest = (daily: boolean, v: number) => {
  try {
    localStorage.setItem(`${BEST_KEY}${daily ? '.daily' : ''}`, String(v))
  } catch {
    // storage unavailable — best won't persist
  }
}

export default function AimTrainerGame() {
  const { t } = useTranslation()

  const phaseRef = useRef<Phase>('ready')
  const dailyRef = useRef(false)
  const rngRef = useRef<() => number>(Math.random)
  const timerRef = useRef<number | undefined>(undefined)
  const hitsRef = useRef(0)
  const shotsRef = useRef(0)

  const [target, setTarget] = useState<Target>({ x: 50, y: 50, r: 10 })
  const [phase, setPhase] = useState<Phase>('ready')
  const [daily, setDaily] = useState(false)
  const [hits, setHits] = useState(0)
  const [shots, setShots] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION_S)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => loadBest(false))
  const [isNewBest, setIsNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const spawn = useCallback(() => {
    const r = 5 + rngRef.current() * 6 // 5-11% of width
    setTarget({
      x: r + rngRef.current() * (100 - r * 2),
      y: r + rngRef.current() * (100 - r * 2),
      r,
    })
  }, [])

  const finish = useCallback(() => {
    window.clearInterval(timerRef.current)
    const final = hitsRef.current * 10
    setScore(final)
    if (final > loadBest(dailyRef.current)) {
      saveBest(dailyRef.current, final)
      setBest(final)
      setIsNewBest(true)
    }
    setPhaseSync('over')
  }, [setPhaseSync])

  const start = useCallback(() => {
    rngRef.current = dailyRef.current ? mulberry32(dailySeed()) : Math.random
    hitsRef.current = 0
    shotsRef.current = 0
    setHits(0)
    setShots(0)
    setScore(0)
    setTimeLeft(DURATION_S)
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    setPhaseSync('playing')
    spawn()
    window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          finish()
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [finish, setPhaseSync, spawn])

  const toggleDaily = useCallback(() => {
    const next = !dailyRef.current
    dailyRef.current = next
    setDaily(next)
    setBest(loadBest(next))
    window.clearInterval(timerRef.current)
    setPhaseSync('ready')
  }, [setPhaseSync])

  const arenaClick = useCallback(
    (hit: boolean) => {
      if (phaseRef.current !== 'playing') return
      shotsRef.current += 1
      setShots(shotsRef.current)
      if (hit) {
        hitsRef.current += 1
        setHits(hitsRef.current)
        setScore(hitsRef.current * 10)
        spawn()
      }
    },
    [spawn],
  )

  useEffect(() => () => window.clearInterval(timerRef.current), [])

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: `aim${dailyRef.current ? '-daily' : ''}`,
      playerId: getPlayerId(),
      nickname: name,
      score: hitsRef.current * 10,
    })
    setSubmitting(false)
    if (ok) setSubmitted(true)
  }

  const accuracy = shots === 0 ? 100 : Math.round((hits / shots) * 100)

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
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleDaily}
              aria-label={t('games.daily.daily')}
              title={t('games.daily.hint')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                daily
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 hover:bg-slate-500/10 dark:text-slate-400'
              }`}
            >
              <CalendarDays size={15} />
              <span className="hidden sm:inline">{t('games.daily.daily')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLeaderboard(true)}
              aria-label={t('games.aim.highScores')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-500/10 dark:text-sky-400"
            >
              <Trophy size={15} />
              <span className="hidden sm:inline">{t('games.aim.highScores')}</span>
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {t('games.aim.time')}: {timeLeft}s
            <span className="ml-3 text-slate-500 dark:text-slate-400">
              {t('games.aim.hits')}: {hits} · {t('games.aim.accuracy')}: {accuracy}%
            </span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.aim.best')}: {best}
            </span>
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw size={14} />
              {t('games.aim.newGame')}
            </button>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {daily
            ? `${t('games.daily.hint')} — ${dailyLabel()}`
            : t('games.aim.instructions')}
        </p>

        <div className="relative mx-auto w-full max-w-[560px]">
          {phase === 'ready' ? (
            <button
              type="button"
              onClick={start}
              className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-slate-100 transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <span className="rounded-xl bg-slate-800 px-6 py-3 text-lg font-bold text-white dark:bg-slate-200 dark:text-slate-900">
                {t('games.aim.tapToStart')}
              </span>
            </button>
          ) : (
            <div
              role="presentation"
              onPointerDown={() => arenaClick(false)}
              className="relative aspect-[4/3] w-full cursor-crosshair touch-none select-none rounded-2xl bg-slate-100 dark:bg-slate-900"
            >
              {phase === 'playing' && (
                <button
                  type="button"
                  aria-label="target"
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    arenaClick(true)
                  }}
                  style={{
                    left: `${target.x}%`,
                    top: `${target.y}%`,
                    width: `${target.r}%`,
                    aspectRatio: '1',
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute rounded-full bg-red-500 ring-4 ring-red-300 transition-colors hover:bg-red-400 dark:ring-red-800"
                />
              )}
              {phase === 'over' && (
                <GameOverModal
                  score={score}
                  hits={hits}
                  accuracy={accuracy}
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
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('games.aim.hint')}
        </p>
      </main>

      {showLeaderboard && (
        <LeaderboardModal
          gameId={`aim${daily ? '-daily' : ''}`}
          title={`${t('games.titles.aim.name')}${daily ? ` — ${dailyLabel()}` : ''}`}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
