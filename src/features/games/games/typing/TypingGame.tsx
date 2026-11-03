import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react'
import { getDict, useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import GameOverModal from './GameOverModal'

const ROUNDS = 3
const BEST_KEY = 'games-hub.best.typing'

type Phase = 'ready' | 'playing' | 'over'

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

export default function TypingGame() {
  const { t, lang } = useTranslation()

  const allSentences = useMemo(() => {
    const node = (getDict(lang) as Record<string, unknown>).games as
      | Record<string, unknown>
      | undefined
    const typing = node?.typing as { sentences?: string[] } | undefined
    return typing?.sentences ?? []
  }, [lang])

  const phaseRef = useRef<Phase>('ready')
  const startAtRef = useRef(0)
  const totalTypedRef = useRef(0)
  const totalCorrectRef = useRef(0)
  const finalScoreRef = useRef(0)

  const [sentences, setSentences] = useState<string[]>([])
  const [round, setRound] = useState(0)
  const [entry, setEntry] = useState('')
  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(1)
  const [best, setBest] = useState(loadBest)
  const [isNewBest, setIsNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const setPhaseSync = useCallback((p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }, [])

  const pickSentences = useCallback(() => {
    const pool = [...allSentences]
    const picked: string[] = []
    while (picked.length < ROUNDS && pool.length > 0) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    }
    return picked
  }, [allSentences])

  const finish = useCallback(() => {
    const minutes = (performance.now() - startAtRef.current) / 60000
    const w = Math.max(0, Math.round(totalTypedRef.current / 5 / Math.max(minutes, 0.01)))
    const acc = totalTypedRef.current === 0 ? 0 : totalCorrectRef.current / totalTypedRef.current
    const final = Math.max(1, Math.round(w * 10 * acc * acc))
    finalScoreRef.current = final
    setScore(final)
    setWpm(w)
    setAccuracy(acc)
    if (final > loadBest()) {
      saveBest(final)
      setBest(final)
      setIsNewBest(true)
    }
    setPhaseSync('over')
  }, [setPhaseSync])

  const start = useCallback(() => {
    totalTypedRef.current = 0
    totalCorrectRef.current = 0
    setSentences(pickSentences())
    setRound(0)
    setEntry('')
    setWpm(0)
    setAccuracy(1)
    setScore(0)
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    startAtRef.current = performance.now()
    setPhaseSync('playing')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [pickSentences, setPhaseSync])

  const handleChange = useCallback(
    (value: string) => {
      if (phaseRef.current !== 'playing') return
      const target = sentences[round]
      if (!target) return
      // count each newly typed char once — backspaces just shorten the entry
      if (value.length > entry.length) {
        for (let i = entry.length; i < value.length; i++) {
          totalTypedRef.current += 1
          if (value[i] === target[i]) totalCorrectRef.current += 1
        }
      }
      setEntry(value)
      if (value.length >= target.length) {
        if (round + 1 >= ROUNDS) finish()
        else {
          setRound(round + 1)
          setEntry('')
        }
      }
    },
    [entry, finish, round, sentences],
  )

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: 'typing',
      playerId: getPlayerId(),
      nickname: name,
      score: finalScoreRef.current,
    })
    setSubmitting(false)
    if (ok) setSubmitted(true)
  }

  const target = sentences[round] ?? ''

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
            aria-label={t('games.typing.highScores')}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-500/10 dark:text-sky-300"
          >
            <Trophy size={15} />
            <span className="hidden sm:inline">{t('games.typing.highScores')}</span>
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {phase === 'playing' && `${t('games.typing.sentence')} ${round + 1}/${ROUNDS}`}
            {phase === 'over' && `${t('games.typing.wpm')}: ${wpm} · ${t('games.typing.accuracy')}: ${Math.round(accuracy * 100)}%`}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.typing.best')}: {best}
            </span>
            {phase === 'playing' && (
              <button
                type="button"
                onClick={start}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RotateCcw size={14} />
                {t('games.typing.newGame')}
              </button>
            )}
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {t('games.typing.instructions')}
        </p>

        <div className="relative mx-auto w-full max-w-[560px]">
          {phase === 'ready' ? (
            <button
              type="button"
              onClick={start}
              className="flex aspect-[3/2] w-full items-center justify-center rounded-2xl bg-slate-100 transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <span className="rounded-xl bg-slate-800 px-6 py-3 text-lg font-bold text-white dark:bg-slate-200 dark:text-slate-900">
                {t('games.typing.tapToStart')}
              </span>
            </button>
          ) : phase === 'playing' ? (
            <div className="rounded-2xl bg-slate-100 p-6 dark:bg-slate-900">
              <p className="mb-4 text-xl font-medium leading-relaxed tracking-wide">
                {target.split('').map((ch, i) => (
                  <span
                    key={i}
                    className={
                      i >= entry.length
                        ? 'text-slate-400'
                        : entry[i] === ch
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-500 underline decoration-red-400'
                    }
                  >
                    {ch}
                  </span>
                ))}
              </p>
              <textarea
                ref={inputRef}
                value={entry}
                onChange={(e) => handleChange(e.target.value)}
                rows={2}
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                aria-label={t('games.typing.yourTyping')}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
          ) : null}

          {phase === 'over' && (
            <GameOverModal
              score={score}
              wpm={wpm}
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

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('games.typing.hint')}
        </p>
      </main>

      {showLeaderboard && (
        <LeaderboardModal
          gameId="typing"
          title={t('games.titles.typing.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
