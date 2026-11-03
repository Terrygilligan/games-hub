import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, RotateCcw, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import { dailyLabel, dailySeed, mulberry32 } from '../../services/daily'
import LeaderboardModal from '../../components/LeaderboardModal'
import GameOverModal from './GameOverModal'

const N = 4
const BEST_KEY = 'games-hub.best.fifteen'

type Phase = 'ready' | 'playing' | 'over'

const solved = () => Array.from({ length: N * N }, (_, i) => (i + 1) % (N * N))

const legalSlides = (e: number) => {
  const c = e % N
  const r = Math.floor(e / N)
  const out: number[] = []
  if (c > 0) out.push(e - 1)
  if (c < N - 1) out.push(e + 1)
  if (r > 0) out.push(e - N)
  if (r < N - 1) out.push(e + N)
  return out
}

// Shuffle by applying random legal slides from the solved state — always solvable.
const shuffled = (rng: () => number): number[] => {
  const g = solved()
  let e = N * N - 1
  let prev = -1
  for (let i = 0; i < 200; i++) {
    const opts = legalSlides(e).filter((x) => x !== prev)
    const j = opts[Math.floor(rng() * opts.length)]
    g[e] = g[j]
    g[j] = 0
    prev = e
    e = j
  }
  return g
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

export default function FifteenGame() {
  const { t } = useTranslation()

  const phaseRef = useRef<Phase>('ready')
  const dailyRef = useRef(false)
  const timerRef = useRef<number | undefined>(undefined)
  const startAtRef = useRef(0)
  const finalScoreRef = useRef(0)

  const [grid, setGrid] = useState<number[]>(solved)
  const [empty, setEmpty] = useState(N * N - 1)
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [phase, setPhase] = useState<Phase>('ready')
  const [daily, setDaily] = useState(false)
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

  const start = useCallback(() => {
    const g = shuffled(dailyRef.current ? mulberry32(dailySeed()) : Math.random)
    setGrid(g)
    setEmpty(g.indexOf(0))
    setMoves(0)
    setSeconds(0)
    setScore(0)
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    startAtRef.current = performance.now()
    setPhaseSync('playing')
    window.clearInterval(timerRef.current)
    timerRef.current = window.setInterval(
      () => setSeconds(Math.round((performance.now() - startAtRef.current) / 1000)),
      1000,
    )
  }, [setPhaseSync])

  const toggleDaily = useCallback(() => {
    const next = !dailyRef.current
    dailyRef.current = next
    setDaily(next)
    setBest(loadBest(next))
    window.clearInterval(timerRef.current)
    setPhaseSync('ready')
  }, [setPhaseSync])

  const slide = useCallback(
    (idx: number) => {
      if (phaseRef.current !== 'playing') return
      const e = grid.indexOf(0)
      if (!legalSlides(e).includes(idx)) return
      const next = [...grid]
      next[e] = next[idx]
      next[idx] = 0
      setGrid(next)
      setEmpty(idx)
      const m = moves + 1
      setMoves(m)
      if (next.every((v, i) => v === (i + 1) % (N * N))) {
        const sec = Math.round((performance.now() - startAtRef.current) / 1000)
        const final = Math.max(1, 1000 - m * 5 - sec)
        finalScoreRef.current = final
        setSeconds(sec)
        setScore(final)
        window.clearInterval(timerRef.current)
        if (final > loadBest(dailyRef.current)) {
          saveBest(dailyRef.current, final)
          setBest(final)
          setIsNewBest(true)
        }
        setPhaseSync('over')
      }
    },
    [grid, moves, setPhaseSync],
  )

  // Arrow keys slide a tile into the gap (in the pressed direction).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return
      const deltas: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -N,
        ArrowDown: N,
      }
      const d = deltas[e.key]
      if (d === undefined) return
      e.preventDefault()
      slide(empty + d)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [empty, slide])

  useEffect(() => () => window.clearInterval(timerRef.current), [])

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: `fifteen${dailyRef.current ? '-daily' : ''}`,
      playerId: getPlayerId(),
      nickname: name,
      score: finalScoreRef.current,
    })
    setSubmitting(false)
    if (ok) setSubmitted(true)
  }

  const gameId = `fifteen${daily ? '-daily' : ''}`

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
              aria-label={t('games.fifteen.highScores')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-500/10 dark:text-sky-300"
            >
              <Trophy size={15} />
              <span className="hidden sm:inline">{t('games.fifteen.highScores')}</span>
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {t('games.fifteen.moves')}: {moves}
            <span className="ml-3 text-slate-500 dark:text-slate-400">
              {t('games.fifteen.time')}: {seconds}s
            </span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.fifteen.best')}: {best}
            </span>
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw size={14} />
              {t('games.fifteen.newGame')}
            </button>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {daily
            ? `${t('games.daily.hint')} — ${dailyLabel()}`
            : t('games.fifteen.instructions')}
        </p>

        <div className="relative mx-auto w-full max-w-[480px]">
          {phase === 'ready' ? (
            <button
              type="button"
              onClick={start}
              className="flex aspect-square w-full items-center justify-center rounded-2xl bg-slate-100 transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <span className="rounded-xl bg-slate-800 px-6 py-3 text-lg font-bold text-white dark:bg-slate-200 dark:text-slate-900">
                {t('games.fifteen.tapToStart')}
              </span>
            </button>
          ) : (
            <div className="grid aspect-square w-full grid-cols-4 gap-2 rounded-2xl bg-slate-200 p-2 dark:bg-slate-900 sm:gap-3 sm:p-3">
              {grid.map((v, i) =>
                v === 0 ? (
                  <span key={i} className="rounded-xl bg-slate-300/50 dark:bg-slate-800/50" />
                ) : (
                  <button
                    key={v}
                    type="button"
                    onClick={() => slide(i)}
                    className={`rounded-xl text-xl font-bold text-white transition sm:text-2xl ${
                      legalSlides(empty).includes(i)
                        ? 'bg-sky-700 hover:bg-sky-600'
                        : 'bg-slate-600 dark:bg-slate-700'
                    }`}
                  >
                    {v}
                  </button>
                ),
              )}
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
              onPlayAgain={start}
              onShowLeaderboard={() => setShowLeaderboard(true)}
            />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('games.fifteen.hint')}
        </p>
      </main>

      {showLeaderboard && (
        <LeaderboardModal
          gameId={gameId}
          title={`${t('games.titles.fifteen.name')}${daily ? ` — ${dailyLabel()}` : ''}`}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
