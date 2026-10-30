import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Dices, HelpCircle, Lightbulb, Trophy } from 'lucide-react'
import { getDict, useTranslation } from '../../../../i18n'
import type { Lang } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import LadderChain from './LadderChain'
import WordInput from './WordInput'
import VictoryModal from './VictoryModal'
import { findPath, findPuzzle, isOneLetterDiff, letterDiff } from './ladder'

type Phase = 'playing' | 'won'

const MODES = [4, 5, 6] as const
type Mode = (typeof MODES)[number]

const MODE_KEY = 'games-hub.wordladder.mode'
const BEST_PREFIX = 'games-hub.best.word-ladder.'
const GUIDE_KEY = 'games-hub.wordladder.guideSeen'
const HINT_COST = 150

const loadNum = (k: string): number => {
  try {
    return Number(localStorage.getItem(k)) || 0
  } catch {
    return 0
  }
}

const saveNum = (k: string, v: number) => {
  try {
    localStorage.setItem(k, String(v))
  } catch {
    // storage unavailable
  }
}

const loadMode = (): Mode => {
  const m = loadNum(MODE_KEY)
  return MODES.includes(m as Mode) ? (m as Mode) : 5
}

const DICT_KEYS: Record<Mode, 'fourLetter' | 'fiveLetter' | 'sixLetter'> = {
  4: 'fourLetter',
  5: 'fiveLetter',
  6: 'sixLetter',
}

const dictFor = (lang: Lang, mode: Mode): string[] => {
  const d = getDict(lang).games.dictionary[DICT_KEYS[mode]]
  return Array.isArray(d) ? d.filter((w) => w.length === mode) : []
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

export default function WordLadderGame() {
  const { lang, t } = useTranslation()

  const [mode, setMode] = useState<Mode>(loadMode)
  const [ladder, setLadder] = useState<string[]>([])
  const [target, setTarget] = useState('')
  const [optimal, setOptimal] = useState(0)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('playing')
  const [elapsed, setElapsed] = useState(0)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => loadNum(BEST_PREFIX + loadMode()))
  const [isNewBest, setIsNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [hints, setHints] = useState(0)
  const [guideOpen, setGuideOpen] = useState(() => {
    try {
      return !localStorage.getItem(GUIDE_KEY)
    } catch {
      return false
    }
  })

  const startRef = useRef<number | null>(null)
  const scoreRef = useRef(0)
  const roundRef = useRef(0)

  const deal = useCallback(
    (m: Mode) => {
      roundRef.current += 1
      const dict = dictFor(lang, m)
      const puzzle = dict.length >= 10 ? findPuzzle(dict) : null
      if (puzzle) {
        setLadder([puzzle.start])
        setTarget(puzzle.target)
        setOptimal(puzzle.optimal)
      } else {
        setLadder([dict[0] ?? ''])
        setTarget(dict[1] ?? dict[0] ?? '')
        setOptimal(0)
      }
      setInput('')
      setError(null)
      setPhase('playing')
      setElapsed(0)
      startRef.current = null
      setScore(0)
      scoreRef.current = 0
      setIsNewBest(false)
      setSubmitting(false)
      setSubmitted(false)
      setHints(0)
      setBest(loadNum(BEST_PREFIX + m))
    },
    [lang],
  )

  useEffect(() => {
    deal(mode)
  }, [deal, mode])

  useEffect(() => {
    if (phase !== 'playing' || startRef.current === null) return
    const id = window.setInterval(
      () => setElapsed((Date.now() - (startRef.current ?? Date.now())) / 1000),
      500,
    )
    return () => window.clearInterval(id)
  }, [phase])

  const pickMode = (m: Mode) => {
    saveNum(MODE_KEY, m)
    setMode(m)
  }

  const flashError = (msg: string) => {
    setError(msg)
    window.setTimeout(() => setError(null), 1600)
  }

  const submit = () => {
    if (phase !== 'playing') return
    const word = input.trim().toUpperCase()
    const dict = dictFor(lang, mode)
    const last = ladder[ladder.length - 1]
    if (startRef.current === null) startRef.current = Date.now()
    if (word.length !== mode) {
      flashError(t('games.wordladder.errLen').replace('{n}', String(mode)))
      return
    }
    if (!isOneLetterDiff(last, word)) {
      flashError(
        t('games.wordladder.errDiff').replace('{n}', String(letterDiff(last, word))),
      )
      return
    }
    if (ladder.includes(word)) {
      flashError(t('games.wordladder.errUsed'))
      return
    }
    if (!dict.includes(word)) {
      flashError(t('games.wordladder.errNotWord').replace('{word}', word))
      return
    }
    const next = [...ladder, word]
    setLadder(next)
    setInput('')
    setError(null)
    if (word === target) {
      const sec = Math.max(1, (Date.now() - (startRef.current ?? Date.now())) / 1000)
      const steps = next.length - 1
      const par = Math.max(15, optimal * 15)
      const eff = optimal > 0 ? 1000 * (optimal / steps) : 500
      const sc = Math.max(
        50,
        Math.round(eff + Math.max(0, 250 * (1 - sec / par))) - hints * HINT_COST,
      )
      scoreRef.current = sc
      setScore(sc)
      if (sc > loadNum(BEST_PREFIX + mode)) {
        saveNum(BEST_PREFIX + mode, sc)
        setBest(sc)
        setIsNewBest(true)
      }
      setPhase('won')
    }
  }

  const hint = () => {
    if (phase !== 'playing') return
    const dict = dictFor(lang, mode)
    const last = ladder[ladder.length - 1]
    const path = findPath(dict, last, target)
    if (path && path.length > 1) {
      setInput(path[1])
      setHints((h) => h + 1)
    }
  }

  const closeGuide = () => {
    setGuideOpen(false)
    try {
      localStorage.setItem(GUIDE_KEY, '1')
    } catch {
      // storage unavailable
    }
  }

  const undo = () => {
    if (phase !== 'playing' || ladder.length <= 1) return
    setLadder((l) => l.slice(0, -1))
    setInput('')
    setError(null)
  }

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: 'word-ladder',
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => deal(mode)}
              aria-label={t('games.wordladder.newPuzzle')}
              title={t('games.wordladder.newPuzzle')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-slate-600 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
            >
              <Dices size={16} />
            </button>
            <button
              type="button"
              onClick={hint}
              aria-label={t('games.wordladder.hint')}
              title={t('games.wordladder.hint')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 transition hover:bg-amber-500/25 dark:text-amber-400"
            >
              <Lightbulb size={16} />
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              aria-label={t('games.wordladder.guide')}
              title={t('games.wordladder.guide')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-slate-600 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
            >
              <HelpCircle size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowLeaderboard(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-500/10 dark:text-sky-400"
            >
              <Trophy size={15} />
              {t('games.wordladder.highScores')}
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-label={t('games.wordladder.letters')}>
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pickMode(m)}
                aria-pressed={mode === m}
                className={`h-10 w-11 rounded-lg text-sm font-bold transition ${
                  mode === m
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold">
              {t('games.wordladder.steps')}: {ladder.length - 1}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.wordladder.optimal')}: {optimal > 0 ? optimal : '—'}
            </span>
            <span className="tabular-nums text-slate-500 dark:text-slate-400">{fmt(elapsed)}</span>
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.wordladder.best')}: {best}
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[420px]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
            <LadderChain ladder={ladder} target={target} />
          </div>
          <div className="mt-4">
            <WordInput
              value={input}
              len={mode}
              error={error}
              canUndo={ladder.length > 1 && phase === 'playing'}
              onChange={setInput}
              onSubmit={submit}
              onUndo={undo}
            />
          </div>
          <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
            {t('games.wordladder.instructions')}
          </p>

          {phase === 'won' && (
            <VictoryModal
              score={score}
              steps={ladder.length - 1}
              optimal={optimal}
              isNewBest={isNewBest}
              submitting={submitting}
              submitted={submitted}
              defaultNickname={getNickname() ?? ''}
              onSubmit={handleSubmit}
              onPlayAgain={() => deal(mode)}
              onShowLeaderboard={() => setShowLeaderboard(true)}
            />
          )}
        </div>
      </main>

      {guideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-left dark:border-slate-700 dark:bg-slate-900">
            <p className="text-base font-semibold">{t('games.wordladder.guide')}</p>
            <ol className="mt-4 space-y-2.5">
              {(getDict(lang).games.wordladder.guideSteps as string[]).map(
                (step, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[11px] font-bold text-sky-600 dark:text-sky-400">
                      {i + 1}
                    </span>
                    <p className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {step}
                    </p>
                  </li>
                ),
              )}
            </ol>
            <button
              type="button"
              onClick={closeGuide}
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-sky-600 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              {t('games.wordladder.guideGotIt')}
            </button>
          </div>
        </div>
      )}

      {showLeaderboard && (
        <LeaderboardModal
          gameId="word-ladder"
          title={t('games.titles.word-ladder.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
