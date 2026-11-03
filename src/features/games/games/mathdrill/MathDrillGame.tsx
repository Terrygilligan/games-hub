import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays, RotateCcw, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import { dailyLabel, dailySeed, mulberry32 } from '../../services/daily'
import LeaderboardModal from '../../components/LeaderboardModal'
import GameOverModal from './GameOverModal'

const DURATION_S = 60
const BEST_KEY = 'games-hub.best.math-drill'

type Mode = 'easy' | 'hard'
type Phase = 'ready' | 'playing' | 'over'

interface Question {
  a: number
  b: number
  op: '+' | '-' | '×' | '÷'
  answer: number
}

const rnd = (rng: () => number, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1))

const makeQuestion = (mode: Mode, rng: () => number = Math.random): Question => {
  if (mode === 'easy') {
    const a = rnd(rng, 2, 30)
    const b = rnd(rng, 2, 30)
    return rng() < 0.5
      ? { a, b, op: '+', answer: a + b }
      : a >= b
        ? { a, b, op: '-', answer: a - b }
        : { a: b, b: a, op: '-', answer: b - a }
  }
  if (rng() < 0.5) {
    const a = rnd(rng, 3, 12)
    const b = rnd(rng, 3, 12)
    return { a, b, op: '×', answer: a * b }
  }
  const b = rnd(rng, 2, 12)
  const answer = rnd(rng, 2, 12)
  return { a: b * answer, b, op: '÷', answer }
}

const loadBest = (mode: Mode, daily = false): number => {
  try {
    return Number(localStorage.getItem(`${BEST_KEY}.${mode}${daily ? '.daily' : ''}`)) || 0
  } catch {
    return 0
  }
}

const saveBest = (mode: Mode, daily: boolean, v: number) => {
  try {
    localStorage.setItem(`${BEST_KEY}.${mode}${daily ? '.daily' : ''}`, String(v))
  } catch {
    // storage unavailable — best won't persist
  }
}

export default function MathDrillGame() {
  const { t } = useTranslation()

  const phaseRef = useRef<Phase>('ready')
  const modeRef = useRef<Mode>('easy')
  const timerRef = useRef<number | undefined>(undefined)
  const scoreRef = useRef(0)
  const streakRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dailyRef = useRef(false)
  const rngRef = useRef<() => number>(Math.random)

  const [phase, setPhase] = useState<Phase>('ready')
  const [mode, setMode] = useState<Mode>('easy')
  const [question, setQuestion] = useState<Question>(() => makeQuestion('easy'))
  const [entry, setEntry] = useState('')
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(DURATION_S)
  const [best, setBest] = useState(() => loadBest('easy'))
  const [isNewBest, setIsNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [daily, setDaily] = useState(false)

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const finish = useCallback(() => {
    const final = scoreRef.current
    if (final > loadBest(modeRef.current, dailyRef.current)) {
      saveBest(modeRef.current, dailyRef.current, final)
      setBest(final)
      setIsNewBest(true)
    }
    setPhaseSync('over')
  }, [setPhaseSync])

  const start = useCallback(
    (m: Mode) => {
      modeRef.current = m
      rngRef.current = dailyRef.current ? mulberry32(dailySeed()) : Math.random
      setMode(m)
      scoreRef.current = 0
      streakRef.current = 0
      setScore(0)
      setCorrect(0)
      setStreak(0)
      setTimeLeft(DURATION_S)
      setQuestion(makeQuestion(m, rngRef.current))
      setEntry('')
      setIsNewBest(false)
      setSubmitting(false)
      setSubmitted(false)
      setPhaseSync('playing')
      window.clearInterval(timerRef.current)
      timerRef.current = window.setInterval(() => {
        setTimeLeft((s) => {
          if (s <= 1) {
            window.clearInterval(timerRef.current)
            finish()
            return 0
          }
          return s - 1
        })
      }, 1000)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    },
    [finish, setPhaseSync],
  )

  const back = useCallback(() => {
    window.clearInterval(timerRef.current)
    setPhaseSync('ready')
  }, [setPhaseSync])

  const toggleDaily = useCallback(() => {
    const next = !dailyRef.current
    dailyRef.current = next
    setDaily(next)
    setBest(loadBest(modeRef.current, next))
    back()
  }, [back])

  const submit = useCallback(() => {
    if (phaseRef.current !== 'playing' || entry.trim() === '') return
    if (Number(entry) === question.answer) {
      streakRef.current += 1
      scoreRef.current += 50 + streakRef.current * 10
      setStreak(streakRef.current)
      setScore(scoreRef.current)
      setCorrect((c) => c + 1)
      setQuestion(makeQuestion(modeRef.current, rngRef.current))
      setEntry('')
    } else {
      streakRef.current = 0
      setStreak(0)
      setEntry('')
    }
  }, [entry, question])

  useEffect(() => () => window.clearInterval(timerRef.current), [])

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: `math-drill${dailyRef.current ? '-daily' : ''}.${modeRef.current}`,
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
              aria-label={t('games.math-drill.highScores')}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-500/10 dark:text-sky-300"
            >
              <Trophy size={15} />
              <span className="hidden sm:inline">{t('games.math-drill.highScores')}</span>
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {phase === 'playing' && (
              <>
                {t('games.math-drill.timeLeft')}: {timeLeft}s
                <span className="ml-3 text-slate-500 dark:text-slate-400">
                  {t('games.math-drill.correct')}: {correct} · {t('games.math-drill.streak')}: {streak}
                </span>
              </>
            )}
            {phase === 'over' && `${t('games.math-drill.score')}: ${score}`}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.math-drill.best')}: {best}
            </span>
            {phase === 'playing' && (
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RotateCcw size={14} />
                {t('games.math-drill.newGame')}
              </button>
            )}
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {daily
            ? `${t('games.daily.hint')} — ${dailyLabel()}`
            : t('games.math-drill.instructions')}
        </p>

        <div className="relative mx-auto w-full max-w-[480px]">
          {phase === 'ready' && (
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 rounded-2xl bg-slate-100 p-6 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('games.math-drill.pickMode')}
              </p>
              <div className="flex w-full max-w-xs flex-col gap-3">
                <button
                  type="button"
                  onClick={() => start('easy')}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-sky-700 text-base font-semibold text-white transition hover:bg-sky-600"
                >
                  {t('games.math-drill.modeEasy')}
                </button>
                <button
                  type="button"
                  onClick={() => start('hard')}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-800 text-base font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
                >
                  {t('games.math-drill.modeHard')}
                </button>
              </div>
            </div>
          )}

          {phase === 'playing' && (
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-5 rounded-2xl bg-slate-100 p-6 dark:bg-slate-900">
              <p className="text-4xl font-bold tracking-wide sm:text-5xl">
                {question.a} {question.op} {question.b} = ?
              </p>
              <input
                ref={inputRef}
                value={entry}
                onChange={(e) => setEntry(e.target.value.replace(/[^0-9-]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                inputMode="numeric"
                aria-label={t('games.math-drill.yourAnswer')}
                placeholder={t('games.math-drill.yourAnswer')}
                className="w-40 rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-semibold outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950"
              />
              <button
                type="button"
                onClick={submit}
                className="inline-flex h-11 min-w-32 items-center justify-center rounded-xl bg-sky-700 px-6 text-sm font-semibold text-white transition hover:bg-sky-600"
              >
                {t('games.math-drill.answer')}
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
              onPlayAgain={back}
              onShowLeaderboard={() => setShowLeaderboard(true)}
            />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('games.math-drill.hint')}
        </p>
      </main>

      {showLeaderboard && (
        <LeaderboardModal
          gameId={`math-drill${daily ? '-daily' : ''}.${mode}`}
          title={`${t('games.titles.math-drill.name')}${daily ? ` — ${dailyLabel()}` : ''} — ${mode === 'easy' ? t('games.math-drill.modeEasy') : t('games.math-drill.modeHard')}`}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
