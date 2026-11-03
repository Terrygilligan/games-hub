import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCheck, ChevronLeft, ChevronRight, Dices, Lightbulb, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import CrosswordGrid from './CrosswordGrid'
import ClueList from './ClueList'
import VictoryModal from './VictoryModal'
import { buildPuzzle, cellsOf, type Built, type Clue } from './crossword'

type Phase = 'playing' | 'won'

const BEST_KEY = 'games-hub.best.crossword'
const LETTER_RE = /[A-Za-zÀ-ÿĀ-ſЀ-ӿ]/u

interface RawPuzzle {
  grid: string[]
  clues?: Record<string, string>
  across?: string[]
  down?: string[]
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
  const [pack, setPack] = useState<RawPuzzle[] | null>(null)
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
  const gridWrapRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<number | null>(null)
  const scoreRef = useRef(0)

  // Lazy-load the locale's puzzle pack (falls back to English).
  useEffect(() => {
    let live = true
    import(`./packs/${lang}.json`)
      .catch(() => import('./packs/en.json'))
      .then((m) => {
        if (live) setPack((m.default ?? m) as RawPuzzle[])
      })
      .catch(() => {
        if (live) setPack([])
      })
    return () => {
      live = false
    }
  }, [lang])

  const size = built?.size ?? 15
  const par = built ? Math.max(60, Math.round(built.all.reduce((n, cl) => n + cl.len, 0) * 6)) : 300

  const deal = useCallback(() => {
    if (!pack?.length) return
    const raw = pack[puzzleIdx % pack.length]
    const b = raw.clues
      ? buildPuzzle(raw.grid, raw.clues)
      : buildPuzzle(raw.grid, raw.across ?? [], raw.down ?? [])
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
  }, [pack, puzzleIdx])

  useEffect(() => {
    deal()
  }, [deal])

  useEffect(() => {
    if (phase !== 'playing' || startRef.current === null) return
    const id = window.setInterval(
      () => setElapsed((Date.now() - (startRef.current ?? Date.now())) / 1000),
      500,
    )
    return () => window.clearInterval(id)
  }, [phase])

  const focusInput = () => inputRef.current?.focus({ preventScroll: true })
  const focusCell = (idx: number) =>
    gridWrapRef.current?.querySelector<HTMLElement>(`[data-cell="${idx}"]`)?.focus({ preventScroll: true })

  const isComplete = (arr: string[], b: Built): boolean =>
    b.all.every((cl) => cellsOf(cl, b.size).every((i, p) => arr[i] === cl.answer[p]))

  const finish = (hintCount: number) => {
    const sec = Math.max(1, (Date.now() - (startRef.current ?? Date.now())) / 1000)
    const sc = Math.max(50, Math.round(1500 * Math.min(4, par / sec)) - hintCount * 150)
    scoreRef.current = sc
    setScore(sc)
    if (sc > loadBest()) {
      saveBest(sc)
      setBest(sc)
      setIsNewBest(true)
    }
    setPhase('won')
  }

  const slotsAt = (idx: number): Clue[] => {
    if (!built) return []
    return built.all.filter((cl) => cellsOf(cl, built.size).includes(idx))
  }

  const select = (clue: Clue, cell?: number) => {
    setActiveClue(clue)
    setActiveCell(cell ?? clue.row * size + clue.col)
  }

  const pickClue = (clue: Clue) => {
    select(clue)
    focusInput()
  }

  const toggleDir = () => {
    if (!built || !activeClue) return
    const slots = slotsAt(activeCell)
    if (slots.length > 1) select(slots.find((s) => s !== activeClue) ?? activeClue, activeCell)
  }

  const moveSel = (dr: number, dc: number) => {
    if (!built || !activeClue) return
    const r = Math.floor(activeCell / built.size) + dr
    const c = (activeCell % built.size) + dc
    if (!isCellIdx(built, r, c)) return
    const nidx = r * built.size + c
    const slots = slotsAt(nidx)
    if (!slots.length) return
    const wantsCross = (dr !== 0) !== (activeClue.dir === 'd')
    const next = wantsCross
      ? (slots.find((s) => s.dir !== activeClue.dir) ?? slots[0])
      : (slots.find((s) => s.dir === activeClue.dir) ?? slots[0])
    select(next, nidx)
  }

  const cycleClue = (step: 1 | -1) => {
    if (!built || !activeClue) return
    const list = built.all
    const next = list[(list.indexOf(activeClue) + step + list.length) % list.length]
    select(next)
    focusCell(next.row * built.size + next.col)
  }

  const advance = (cells: number[], from: number, dir: 1 | -1) => {
    const pos = cells.indexOf(from)
    const np = pos + dir
    if (np >= 0 && np < cells.length) setActiveCell(cells[np])
  }

  // When a word fills, jump to the next clue with an empty cell.
  const advanceToOpenClue = (arr: string[]) => {
    if (!built || !activeClue) return
    const i = built.all.indexOf(activeClue)
    for (let k = 1; k <= built.all.length; k++) {
      const cl = built.all[(i + k) % built.all.length]
      const cells = cellsOf(cl, built.size)
      const empty = cells.find((c) => arr[c] === '')
      if (empty !== undefined) {
        select(cl, empty)
        return
      }
    }
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
    if (isComplete(next, built)) {
      finish(hints)
      return
    }
    if (cells.every((i) => next[i] !== '')) advanceToOpenClue(next)
    else advance(cells, activeCell, 1)
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

  const onCellClick = (idx: number) => {
    const slots = slotsAt(idx)
    if (!slots.length) return
    let next: Clue
    if (idx === activeCell && slots.length > 1 && activeClue) {
      next = slots[slots.indexOf(activeClue) === 0 ? 1 : 0]
    } else {
      next = (activeClue && slots.includes(activeClue) ? activeClue : slots[0]) ?? slots[0]
    }
    select(next, idx)
    focusInput()
  }

  const onGridKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (phase !== 'playing') return
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault()
        moveSel(0, 1)
        return
      case 'ArrowLeft':
        e.preventDefault()
        moveSel(0, -1)
        return
      case 'ArrowDown':
        e.preventDefault()
        moveSel(1, 0)
        return
      case 'ArrowUp':
        e.preventDefault()
        moveSel(-1, 0)
        return
      case 'Tab':
        e.preventDefault()
        cycleClue(e.shiftKey ? -1 : 1)
        return
      case 'Backspace':
        e.preventDefault()
        eraseLetter()
        return
      case 'Enter':
      case ' ':
        e.preventDefault()
        toggleDir()
        return
    }
    if (e.key.length === 1 && LETTER_RE.test(e.key)) typeLetter(e.key)
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
    if (isComplete(next, built)) finish(hints + 1)
  }

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

  const dirLabel = activeClue
    ? t(activeClue.dir === 'a' ? 'games.crossword.across' : 'games.crossword.down')
    : ''

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
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-500/10 dark:text-sky-300"
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

        {activeClue && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-sky-500/10 px-3 py-2 text-sm">
            <button
              type="button"
              onClick={() => cycleClue(-1)}
              aria-label="previous clue"
              className="rounded p-1 text-sky-700 transition hover:bg-sky-500/15 dark:text-sky-300"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="min-w-0 flex-1 truncate">
              <span className="mr-1 font-bold">{activeClue.num} {dirLabel}:</span>
              {activeClue.text}
            </span>
            <button
              type="button"
              onClick={() => cycleClue(1)}
              aria-label="next clue"
              className="rounded p-1 text-sky-700 transition hover:bg-sky-500/15 dark:text-sky-300"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}

        <div ref={gridWrapRef} onKeyDown={onGridKey} className="relative mx-auto w-full max-w-[520px]">
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
              if (LETTER_RE.test(ch)) typeLetter(ch.toUpperCase())
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace') eraseLetter()
              if (e.key === 'ArrowRight') moveSel(0, 1)
              if (e.key === 'ArrowLeft') moveSel(0, -1)
              if (e.key === 'ArrowDown') moveSel(1, 0)
              if (e.key === 'ArrowUp') moveSel(-1, 0)
            }}
            aria-label={t('games.crossword.enterLetter')}
            className="absolute left-0 top-0 h-1 w-1 opacity-0"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            tabIndex={-1}
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

function isCellIdx(built: Built, r: number, c: number): boolean {
  return r >= 0 && r < built.size && c >= 0 && c < built.size && built.slotAt[r * built.size + c] !== -1
}
