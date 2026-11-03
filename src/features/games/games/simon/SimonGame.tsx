import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import GameOverModal from './GameOverModal'

const BEST_KEY = 'games-hub.best.simon'
const PAD_FREQS = [330, 392, 494, 587]
const PAD_COLORS = ['bg-emerald-600', 'bg-red-600', 'bg-amber-500', 'bg-sky-600']
const PAD_LIT = ['bg-emerald-400', 'bg-red-400', 'bg-amber-300', 'bg-sky-400']

type Phase = 'ready' | 'showing' | 'input' | 'over'

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

export default function SimonGame() {
  const { t } = useTranslation()

  const phaseRef = useRef<Phase>('ready')
  const seqRef = useRef<number[]>([])
  const inputIdxRef = useRef(0)
  const timeoutsRef = useRef<number[]>([])
  const audioRef = useRef<AudioContext | null>(null)
  const scoreRef = useRef(0)

  const [phase, setPhase] = useState<Phase>('ready')
  const [lit, setLit] = useState<number | null>(null)
  const [round, setRound] = useState(0)
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

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id))
    timeoutsRef.current = []
  }, [])

  const beep = useCallback((pad: number, ms: number) => {
    const ctx = audioRef.current
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = PAD_FREQS[pad]
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000)
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + ms / 1000)
    } catch {
      // audio unavailable — visual-only fallback
    }
  }, [])

  const flash = useCallback(
    (pad: number, ms: number) => {
      setLit(pad)
      beep(pad, ms)
      timeoutsRef.current.push(window.setTimeout(() => setLit(null), ms))
    },
    [beep],
  )

  const showSequence = useCallback(() => {
    setPhaseSync('showing')
    const seq = seqRef.current
    const step = Math.max(250, 600 - seq.length * 40)
    seq.forEach((pad, i) => {
      timeoutsRef.current.push(window.setTimeout(() => flash(pad, step * 0.6), i * step))
    })
    timeoutsRef.current.push(
      window.setTimeout(() => {
        inputIdxRef.current = 0
        setPhaseSync('input')
      }, seq.length * step + 200),
    )
  }, [flash, setPhaseSync])

  const nextRound = useCallback(() => {
    seqRef.current = [...seqRef.current, Math.floor(Math.random() * 4)]
    setRound(seqRef.current.length)
    showSequence()
  }, [showSequence])

  const finish = useCallback(() => {
    clearTimers()
    const final = scoreRef.current
    if (final > loadBest()) {
      saveBest(final)
      setBest(final)
      setIsNewBest(true)
    }
    setPhaseSync('over')
  }, [clearTimers, setPhaseSync])

  const start = useCallback(() => {
    if (!audioRef.current) {
      try {
        audioRef.current = new AudioContext()
      } catch {
        audioRef.current = null
      }
    }
    void audioRef.current?.resume().catch(() => undefined)
    clearTimers()
    seqRef.current = []
    scoreRef.current = 0
    setScore(0)
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    nextRound()
  }, [clearTimers, nextRound])

  const handlePad = useCallback(
    (pad: number) => {
      if (phaseRef.current === 'ready') {
        start()
        return
      }
      if (phaseRef.current !== 'input') return
      flash(pad, 250)
      if (seqRef.current[inputIdxRef.current] !== pad) {
        finish()
        return
      }
      inputIdxRef.current += 1
      if (inputIdxRef.current >= seqRef.current.length) {
        scoreRef.current += 100
        setScore(scoreRef.current)
        timeoutsRef.current.push(window.setTimeout(nextRound, 700))
      }
    },
    [finish, flash, nextRound, start],
  )

  const restart = useCallback(() => {
    clearTimers()
    seqRef.current = []
    scoreRef.current = 0
    setScore(0)
    setRound(0)
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    setPhaseSync('ready')
  }, [clearTimers, setPhaseSync])

  useEffect(() => clearTimers, [clearTimers])

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: 'simon',
      playerId: getPlayerId(),
      nickname: name,
      score: scoreRef.current,
    })
    setSubmitting(false)
    if (ok) setSubmitted(true)
  }

  const status =
    phase === 'ready'
      ? t('games.simon.tapToStart')
      : phase === 'showing'
        ? t('games.simon.watch')
        : phase === 'input'
          ? t('games.simon.yourTurn')
          : null

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
            aria-label={t('games.simon.highScores')}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-500/10 dark:text-sky-300"
          >
            <Trophy size={15} />
            <span className="hidden sm:inline">{t('games.simon.highScores')}</span>
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {t('games.simon.round')}: {round}
            <span className="ml-3 text-slate-500 dark:text-slate-400">
              {t('games.simon.score')}: {score}
            </span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.simon.best')}: {best}
            </span>
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw size={14} />
              {t('games.simon.newGame')}
            </button>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {t('games.simon.instructions')}
        </p>

        <div className="relative mx-auto w-full max-w-[480px]">
          <div className="grid aspect-square w-full grid-cols-2 gap-3 rounded-2xl bg-slate-200 p-3 dark:bg-slate-900">
            {PAD_COLORS.map((color, pad) => (
              <button
                key={pad}
                type="button"
                onClick={() => handlePad(pad)}
                disabled={phase === 'showing' || phase === 'over'}
                aria-label={`Pad ${pad + 1}`}
                className={`rounded-xl transition-all ${lit === pad ? `${PAD_LIT[pad]} scale-[1.03]` : `${color} ${phase === 'input' ? 'hover:brightness-110' : ''}`}`}
              />
            ))}
          </div>

          {phase === 'over' ? (
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
          ) : (
            status && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-xl bg-slate-950/80 px-5 py-3 text-lg font-bold text-white backdrop-blur-sm">
                  {status}
                </span>
              </div>
            )
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('games.simon.hint')}
        </p>
      </main>

      {showLeaderboard && (
        <LeaderboardModal
          gameId="simon"
          title={t('games.titles.simon.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
