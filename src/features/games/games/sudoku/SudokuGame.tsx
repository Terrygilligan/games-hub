import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Dices, Trophy } from 'lucide-react'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'
import { useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import SudokuGrid from './SudokuGrid'
import NumberPad from './NumberPad'
import VictoryModal from './VictoryModal'
import { generate, type Grid } from './sudoku'

type Phase = 'playing' | 'won'

const MODES = [
  { key: 'easy', givens: 40, base: 1200, par: 300 },
  { key: 'medium', givens: 32, base: 2400, par: 480 },
  { key: 'hard', givens: 27, base: 4000, par: 720 },
] as const
type ModeKey = (typeof MODES)[number]['key']

const MODE_KEY = 'games-hub.sudoku.mode'
const BEST_PREFIX = 'games-hub.best.sudoku.'

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
const loadMode = (): ModeKey => {
  const m = localStorage.getItem(MODE_KEY)
  return MODES.some((x) => x.key === m) ? (m as ModeKey) : 'easy'
}

const fmt = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

export default function SudokuGame() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ModeKey>(loadMode)
  const [puzzle, setPuzzle] = useState<Grid>([])
  const [entries, setEntries] = useState<Grid>([])
  const [solution, setSolution] = useState<Grid>([])
  const [notes, setNotes] = useState<Map<number, Set<number>>>(new Map())
  const [notesMode, setNotesMode] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const [wrong, setWrong] = useState<Set<number>>(new Set())
  const [mistakes, setMistakes] = useState(0)
  const [phase, setPhase] = useState<Phase>('playing')
  const [elapsed, setElapsed] = useState(0)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => loadNum(BEST_PREFIX + loadMode()))
  const [isNewBest, setIsNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const startRef = useRef<number | null>(null)
  const scoreRef = useRef(0)

  const cfg = MODES.find((m) => m.key === mode) as (typeof MODES)[number]

  const deal = useCallback((m: ModeKey) => {
    const c = MODES.find((x) => x.key === m) as (typeof MODES)[number]
    const { puzzle: p, solution: s } = generate(c.givens)
    setPuzzle(p)
    setSolution(s)
    setEntries(p.slice())
    setNotes(new Map())
    setNotesMode(false)
    setSelected(null)
    setWrong(new Set())
    setMistakes(0)
    setPhase('playing')
    setElapsed(0)
    startRef.current = null
    setScore(0)
    scoreRef.current = 0
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    setBest(loadNum(BEST_PREFIX + m))
  }, [])

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
  }, [phase, elapsed])

  const pickMode = (m: ModeKey) => {
    saveNum(MODE_KEY, MODES.findIndex((x) => x.key === m))
    setMode(m)
  }

  const placeNumber = (n: number) => {
    if (phase !== 'playing' || selected === null || puzzle[selected] !== 0) return
    if (startRef.current === null) startRef.current = Date.now()

    if (notesMode) {
      setNotes((prev) => {
        const next = new Map(prev)
        const set = new Set(next.get(selected) ?? [])
        if (set.has(n)) set.delete(n)
        else set.add(n)
        next.set(selected, set)
        return next
      })
      return
    }

    const next = entries.slice()
    next[selected] = n
    setEntries(next)
    setNotes((prev) => {
      const m = new Map(prev)
      m.delete(selected)
      return m
    })

    if (n !== solution[selected]) {
      setMistakes((m) => m + 1)
      setWrong((w) => new Set(w).add(selected))
    } else {
      setWrong((w) => {
        const s = new Set(w)
        s.delete(selected)
        return s
      })
    }

    if (next.every((v, i) => v === solution[i])) {
      const sec = Math.max(1, (Date.now() - (startRef.current ?? Date.now())) / 1000)
      const sc = Math.max(
        50,
        Math.round(cfg.base * Math.min(4, cfg.par / sec) - mistakes * 100),
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

  const erase = () => {
    if (phase !== 'playing' || selected === null || puzzle[selected] !== 0) return
    const next = entries.slice()
    next[selected] = 0
    setEntries(next)
    setWrong((w) => {
      const s = new Set(w)
      s.delete(selected)
      return s
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') placeNumber(Number(e.key))
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase()
      else if (e.key.startsWith('Arrow') && selected !== null) {
        const d = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key] ?? 0
        const ni = Math.max(0, Math.min(80, selected + d))
        setSelected(ni)
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: 'sudoku',
      playerId: getPlayerId(),
      nickname: name,
      score: scoreRef.current,
    })
    setSubmitting(false)
    if (ok) setSubmitted(true)
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
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
              aria-label={t('games.sudoku.newPuzzle')}
              title={t('games.sudoku.newPuzzle')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 text-slate-600 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
            >
              <Dices size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowLeaderboard(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-500/10 dark:text-sky-400"
            >
              <Trophy size={15} />
              {t('games.sudoku.highScores')}
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => pickMode(m.key)}
                aria-pressed={mode === m.key}
                className={`h-10 rounded-lg px-3 text-sm font-medium transition ${
                  mode === m.key
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {t(`games.sudoku.${m.key}`)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.sudoku.mistakes')}: {mistakes}
            </span>
            <span className="tabular-nums text-slate-500 dark:text-slate-400">{fmt(elapsed)}</span>
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.sudoku.best')}: {best}
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[440px]">
          <SudokuGrid
            puzzle={puzzle}
            entries={entries}
            notes={notes}
            selected={selected}
            wrong={wrong}
            onSelect={setSelected}
          />
          <div className="mt-4">
            <NumberPad
              notesMode={notesMode}
              onNumber={placeNumber}
              onErase={erase}
              onToggleNotes={() => setNotesMode((v) => !v)}
            />
          </div>

          {phase === 'won' && (
            <VictoryModal
              score={score}
              timeStr={fmt(elapsed)}
              mistakes={mistakes}
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
      <Footer itemKey="sudoku" />

      {showLeaderboard && (
        <LeaderboardModal
          gameId="sudoku"
          title={t('games.titles.sudoku.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
