import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import GameOverModal from './GameOverModal'

const ROUNDS = 5
const BEST_KEY = 'games-hub.best.reaction'

type Phase = 'ready' | 'waiting' | 'go' | 'foul' | 'over'

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

export default function ReactionGame() {
  const { t } = useTranslation()

  const phaseRef = useRef<Phase>('ready')
  const timerRef = useRef<number | undefined>(undefined)
  const goAtRef = useRef(0)
  const timesRef = useRef<number[]>([])
  const finalScoreRef = useRef(0)

  const [phase, setPhase] = useState<Phase>('ready')
  const [times, setTimes] = useState<number[]>([])
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

  const armRound = useCallback(() => {
    setPhaseSync('waiting')
    timerRef.current = window.setTimeout(
      () => {
        goAtRef.current = performance.now()
        setPhaseSync('go')
      },
      1000 + Math.random() * 3000,
    )
  }, [setPhaseSync])

  const finish = useCallback(
    (allTimes: number[]) => {
      const avg = allTimes.reduce((a, b) => a + b, 0) / allTimes.length
      const final = Math.max(1, Math.round(5000 / avg))
      finalScoreRef.current = final
      setScore(final)
      if (final > loadBest()) {
        saveBest(final)
        setBest(final)
        setIsNewBest(true)
      }
      setPhaseSync('over')
    },
    [setPhaseSync],
  )

  const handleTap = useCallback(() => {
    if (phaseRef.current === 'waiting') {
      window.clearTimeout(timerRef.current)
      setPhaseSync('foul')
      timerRef.current = window.setTimeout(armRound, 900)
      return
    }
    if (phaseRef.current === 'go') {
      const ms = Math.round(performance.now() - goAtRef.current)
      const next = [...timesRef.current, ms]
      timesRef.current = next
      setTimes(next)
      if (next.length >= ROUNDS) finish(next)
      else armRound()
      return
    }
    if (phaseRef.current === 'ready') {
      timesRef.current = []
      setTimes([])
      setIsNewBest(false)
      setSubmitting(false)
      setSubmitted(false)
      armRound()
    }
  }, [armRound, finish, setPhaseSync])

  const restart = useCallback(() => {
    window.clearTimeout(timerRef.current)
    timesRef.current = []
    setTimes([])
    setScore(0)
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    setPhaseSync('ready')
  }, [setPhaseSync])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: 'reaction',
      playerId: getPlayerId(),
      nickname: name,
      score: finalScoreRef.current,
    })
    setSubmitting(false)
    if (ok) setSubmitted(true)
  }

  const last = times[times.length - 1]
  const padLabel =
    phase === 'ready'
      ? t('games.reaction.tapToStart')
      : phase === 'waiting'
        ? t('games.reaction.waitForGreen')
        : phase === 'go'
          ? t('games.reaction.tapNow')
          : phase === 'foul'
            ? t('games.reaction.tooSoon')
            : null

  const padCls =
    phase === 'waiting'
      ? 'bg-red-700 text-white'
      : phase === 'go'
        ? 'bg-emerald-500 text-slate-950'
        : phase === 'foul'
          ? 'bg-amber-500 text-slate-950'
          : 'bg-slate-800 text-white'

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
            aria-label={t('games.reaction.highScores')}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-500/10 dark:text-sky-300"
          >
            <Trophy size={15} />
            <span className="hidden sm:inline">{t('games.reaction.highScores')}</span>
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {t('games.reaction.round')}: {Math.min(times.length + (phase === 'waiting' || phase === 'go' || phase === 'foul' ? 1 : 0), ROUNDS)}/{ROUNDS}
            {last !== undefined && phase !== 'over' && (
              <span className="ml-2 text-slate-500 dark:text-slate-400">{last} ms</span>
            )}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.reaction.best')}: {best}
            </span>
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw size={14} />
              {t('games.reaction.newGame')}
            </button>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {t('games.reaction.instructions')}
        </p>

        <div className="relative mx-auto w-full max-w-[480px]">
          <button
            type="button"
            onClick={handleTap}
            disabled={phase === 'over'}
            className={`flex aspect-square w-full items-center justify-center rounded-2xl text-center text-2xl font-bold transition-colors select-none ${padCls}`}
          >
            {padLabel}
          </button>

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
          {t('games.reaction.hint')}
        </p>
      </main>

      {showLeaderboard && (
        <LeaderboardModal
          gameId="reaction"
          title={t('games.titles.reaction.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
