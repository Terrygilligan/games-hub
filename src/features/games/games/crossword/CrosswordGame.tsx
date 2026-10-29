import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCheck, Dices, Lightbulb, Trophy } from 'lucide-react'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'
import { getDict, useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import CrosswordGrid from './CrosswordGrid'
import ClueList from './ClueList'
import VictoryModal from './VictoryModal'
import { buildPuzzle, cellsOf, type Built, type Clue } from './crossword'

type Phase = 'playing' | 'won'

const BEST_KEY = 'games-hub.best.crossword'
const PAR_SEC = 300
const BASE = 1500
const HINT_COST = 150

interface RawPuzzle {
  grid: string[]
  across: string[]
  down: string[]
}

const fmt = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

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
    // storage unavailable
  }
}

export default function CrosswordGame() {
  const { lang, t } = useTranslation()
  const [puzzleIdx, setPuzzleIdx] = useState(0)
  const [built, setBuilt] = useState<Built | null>(null)
  const [entries, setEntries] = useState<string[]>([])
  const [activeClue, setActiveClue] = useState<Clue | null>(null)
  const [activeCell, setActiveCell] = useState(0)
  const [wrong, setWrong] = useState<Set<number>>(new Set())
  const [hints, setHints] = useState(0)
  const [phase, setPhase] = useState<Phase>('playing')
  const [elapsed, setElapsed] = useState(0)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [isNewBest, setIsNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const startRef = useRef<number | null>(null)
  const scoreRef = useRef(0)

  const deal = useCallback(
    (idx: number) => {
      const pack = getDict(lang).games.crossword.puzzles as RawPuzzle[]
      const raw = pack[idx % pack.length]
      const b = buildPuzzle(raw.grid, raw.across, raw.down)
      setBuilt(b)
      setEntries(new Array(b.size * b.size).fill(''))
      setActiveClue(b.across[0] ?? null)
      setActiveCell(b.across.length ? b.across[0].row * b.size + b.across[0].col : 0)
      setWrong(new Set())
      setHints(0)
      setPhase('playing')
      setElapsed(0)
      startRef.current = null
      setScore(0)
      scoreRef.current = 0
      setIsNewBest(false)
      setSubmitting(false)
      setSubmitted(false)
      setBest(loadBest())
    },
    [lang],
  )

  useEffect(() => {
    deal(puzzleIdx)
  }, [deal, puzzleIdx])

  useEffect(() => {
    if (phase !== 'playing' || startRef.current === null) return
    const id = window.setInterval(
      () => setElapsed((Date.now() - (startRef.current ?? Date.now())) / 1000),
      500,
    )
    return () => window.clearInterval(id)
  }, [phase, elapsed])

  const focusInput = () => inputRef.current?.focus({ preventScroll: true })

  const pickClue = (clue: Clue) => {
    setActiveClue(clue)
    setActiveCell(clue.row * (built?.size ?? 5) + clue.col)
    focusInput()
  }

  const slotsAt = (idx: number): Clue[] => {
    if (!built) return []
    return built.all.filter((cl) => cellsOf(cl, built.size).includes(idx))
  }

  const onCellClick = (idx: number) => {
    const slots = slotsAt(idx)
    if (!slots.length) return
    let next: Clue
    if (idx === activeCell && slots.length > 1 && activeClue) {
      next = slots[slots.indexOf(activeClue) === 0 ? 1 : 0]
    } else {
      next = (activeClue && slots.includes(activeClue) ? activeClue : slots[0]) ?? slots[0]
    }
    setActiveClue(next)
    setActiveCell(idx)
    focusInput()
  }

  const advance = (cells: number[], from: number, dir: 1 | -1) => {
    const pos = cells.indexOf(from)
    const np = pos + dir
    if (np >= 0 && np < cells.length) setActiveCell(cells[np])
  }

  const typeLetter = (ch: string) => {
    if (phase !== 'playing' || !activeClue || !built) return
    if (startRef.current === null) startRef.current = Date.now()
    const cells = cellsOf(activeClue, built.size)
    const next = entries.slice()
    next[activeCell] = ch.toUpperCase()
    setEntries(next)
    setWrong((w) => {
      const s = new Set(w)
      s.delete(activeCell)
      return s
    })
    advance(cells, activeCell, 1)
    if (isComplete(next, built)) {
      const sec = Math.max(1, (Date.now() - (startRef.current ?? Date.now())) / 1000)
      const sc = Math.max(50, Math.round(BASE * Math.min(4, PAR_SEC / sec)) - hints * HINT_COST)
      scoreRef.current = sc
      setScore(sc)
      if (sc > loadBest()) {
        saveBest(sc)
        setBest(sc)
        setIsNewBest(true)
      }
      setPhase('won')
    }
  }

  const eraseLetter = () => {
    if (phase !== 'playing' || !activeClue || !built) return
    const cells = cellsOf(activeClue, built.size)
    const next = entries.slice()
    if (next[activeCell] !== '') {
      next[activeCell] = ''
      setEntries(next)
    } else {
      advance(cells, activeCell, -1)
    }
  }

  const check = () => {
    if (!built) return
    const bad = new Set<number>()
    built.all.forEach((cl) => {
      cellsOf(cl, built.size).forEach((i, p) => {
        if (entries[i] !== '' && entries[i] !== cl.answer[p]) bad.add(i)
      })
    })
    setWrong(bad)
  }

  const reveal = () => {
    if (phase !== 'playing' || !activeClue || !built) return
    const cells = cellsOf(activeClue, built.size)
    const pos = cells.indexOf(activeCell)
    const next = entries.slice()
    next[activeCell] = activeClue.answer[pos]
    setEntries(next)
    setHints((h) => h + 1)
    setWrong((w) => {
      const s = new Set(w)
      s.delete(activeCell)
      return s
    })
    if (isComplete(next, built)) {
      const sec = Math.max(1, (Date.now() - (startRef.current ?? Date.now())) / 1000)
      const sc = Math.max(50, Math.round(BASE * Math.min(4, PAR_SEC / sec)) - (hints + 1) * HINT_COST)
      scoreRef.current = sc
      setScore(sc)
      if (sc > loadBest()) {
        saveBest(sc)
        setBest(sc)
        setIsNewBest(true)
      }
      setPhase('won')
    }
  }

  const isComplete = (arr: string[], b: Built): boolean =>
    b.all.every((cl) => cellsOf(cl, b.size).every((i, p) => arr[i] === cl.answer[p]))

  const solved = new Set<string>()
  if (built) {
    built.all.forEach((cl) => {
      if (cellsOf(cl, built.size).every((i, p) => entries[i] === cl.answer[p])) {
        solved.add(`${cl.dir}${cl.num}`)
      }
    })
  }

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: 'crossword',
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
              onClick={() => setPuzzleIdx((i) => i + 1)}
              aria-label={t('games.crossword.newPuzzle')}
              title={t('games.crossword.newPuzzle')}
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
              {t('games.crossword.highScores')}
            </button>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
          <span className="tabular-nums text-slate-500 dark:text-slate-400">{fmt(elapsed)}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={check}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
            >
              <CheckCheck size={14} />
              {t('games.crossword.check')}
            </button>
            <button
              type="button"
              onClick={reveal}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-600 transition hover:bg-amber-500/25 dark:text-amber-400"
            >
              <Lightbulb size={14} />
              {t('games.crossword.reveal')}
            </button>
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.crossword.best')}: {best}
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[440px]">
          {built && (
            <CrosswordGrid
              built={built}
              entries={entries}
              activeClue={activeClue}
              activeCell={activeCell}
              wrong={wrong}
              onCellClick={onCellClick}
            />
          )}

          <input
            ref={inputRef}
            type="text"
            value=""
            onChange={(e) => {
              const ch = e.target.value.slice(-1)
              if (/[A-Za-zÀ-ÿĀ-ſЀ-ӿ]/u.test(ch)) typeLetter(ch.toUpperCase())
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') eraseLetter()
            }}
            aria-label={t('games.crossword.enterLetter')}
            className="absolute left-0 top-0 h-1 w-1 opacity-0"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
          />

          <div className="mt-4">
            {built && (
              <ClueList
                across={built.across}
                down={built.down}
                activeClue={activeClue}
                solved={solved}
                onPick={pickClue}
              />
            )}
          </div>

          {phase === 'won' && (
            <VictoryModal
              score={score}
              timeStr={fmt(elapsed)}
              hints={hints}
              isNewBest={isNewBest}
              submitting={submitting}
              submitted={submitted}
              defaultNickname={getNickname() ?? ''}
              onSubmit={handleSubmit}
              onPlayAgain={() => setPuzzleIdx((i) => i + 1)}
              onShowLeaderboard={() => setShowLeaderboard(true)}
            />
          )}
        </div>
      </main>
      <Footer itemKey="crossword" />

      {showLeaderboard && (
        <LeaderboardModal
          gameId="crossword"
          title={t('games.titles.crossword.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
