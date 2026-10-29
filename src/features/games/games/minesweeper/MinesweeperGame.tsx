import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import MinesweeperBoard from './MinesweeperBoard'
import type { InputMode, MineCell } from './MinesweeperBoard'
import ControlsHeader from './ControlsHeader'
import VictoryModal from './VictoryModal'

const DIFFICULTY = {
  easy: { rows: 8, cols: 8, mines: 10, base: 600, par: 45 },
  medium: { rows: 12, cols: 12, mines: 20, base: 1400, par: 120 },
  hard: { rows: 16, cols: 16, mines: 40, base: 3000, par: 300 },
} as const
type Mode = keyof typeof DIFFICULTY
type Phase = 'ready' | 'playing' | 'won' | 'lost'

const bestKey = (mode: Mode) => `games-hub.best.minesweeper.${mode}`

const loadBest = (mode: Mode): number => {
  try {
    return Number(localStorage.getItem(bestKey(mode))) || 0
  } catch {
    return 0
  }
}

const saveBest = (mode: Mode, seconds: number) => {
  try {
    localStorage.setItem(bestKey(mode), String(seconds))
  } catch {
    // storage unavailable — best won't persist
  }
}

const freshCells = (total: number): MineCell[] =>
  Array.from({ length: total }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
    detonated: false,
  }))

const neighborsOf = (i: number, cols: number, rows: number): number[] => {
  const r = Math.floor(i / cols)
  const c = i % cols
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc)
    }
  }
  return out
}

// Mines are placed lazily on the first reveal so the clicked tile and its
// neighbors are guaranteed mine-free (first-click safety).
const placeMines = (firstIdx: number, cfg: (typeof DIFFICULTY)[Mode]): MineCell[] => {
  const cells = freshCells(cfg.rows * cfg.cols)
  const safe = new Set([firstIdx, ...neighborsOf(firstIdx, cfg.cols, cfg.rows)])
  const candidates: number[] = []
  for (let i = 0; i < cells.length; i++) if (!safe.has(i)) candidates.push(i)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  for (const idx of candidates.slice(0, cfg.mines)) cells[idx].mine = true
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].mine) continue
    cells[i].adjacent = neighborsOf(i, cfg.cols, cfg.rows).filter((n) => cells[n].mine).length
  }
  return cells
}

const calcScore = (base: number, par: number, seconds: number): number =>
  Math.round(base * Math.min(4, par / Math.max(1, seconds)))

export default function MinesweeperGame() {
  const { t } = useTranslation()

  const [mode, setMode] = useState<Mode>('easy')
  const [phase, setPhase] = useState<Phase>('ready')
  const [cells, setCells] = useState<MineCell[]>(() => freshCells(DIFFICULTY.easy.rows * DIFFICULTY.easy.cols))
  const [flagsPlaced, setFlagsPlaced] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => loadBest('easy'))
  const [isNewBest, setIsNewBest] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('reveal')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const startRef = useRef(0)
  const scoreRef = useRef(0)

  const cfg = DIFFICULTY[mode]
  const minesLeft = cfg.mines - flagsPlaced
  const dead = phase === 'won' || phase === 'lost'

  const reset = useCallback((m: Mode) => {
    const c = DIFFICULTY[m]
    setCells(freshCells(c.rows * c.cols))
    setFlagsPlaced(0)
    setElapsed(0)
    setScore(0)
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    setPhase('ready')
  }, [])

  useEffect(() => {
    setBest(loadBest(mode))
  }, [mode])

  useEffect(() => {
    if (phase !== 'playing') return
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 250)
    return () => window.clearInterval(id)
  }, [phase])

  const pickMode = (m: Mode) => {
    if (m === mode) return
    setMode(m)
    reset(m)
  }

  const finish = useCallback(
    (sec: number, currentMode: Mode) => {
      const c = DIFFICULTY[currentMode]
      const sc = calcScore(c.base, c.par, sec)
      scoreRef.current = sc
      setScore(sc)
      const prev = loadBest(currentMode)
      if (prev === 0 || sec < prev) {
        saveBest(currentMode, sec)
        setBest(sec)
        setIsNewBest(true)
      }
      setPhase('won')
    },
    [],
  )

  const reveal = (idx: number) => {
    if (dead) return
    const target = cells[idx]
    if (target.flagged || target.revealed) return
    let board = cells
    if (phase === 'ready') {
      board = placeMines(idx, cfg)
      startRef.current = Date.now()
      setPhase('playing')
    }

    if (target.mine) {
      const next = board.map((c) => (c.mine ? { ...c, revealed: true } : c))
      next[idx] = { ...next[idx], detonated: true }
      setCells(next)
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
      setPhase('lost')
      return
    }

    const next = board.map((c) => ({ ...c }))
    const stack = [idx]
    while (stack.length > 0) {
      const i = stack.pop()!
      const cell = next[i]
      if (cell.revealed || cell.flagged) continue
      cell.revealed = true
      if (cell.adjacent === 0) {
        for (const n of neighborsOf(i, cfg.cols, cfg.rows)) {
          if (!next[n].revealed && !next[n].flagged) stack.push(n)
        }
      }
    }
    setCells(next)
    if (next.filter((c) => c.revealed && !c.mine).length === next.length - cfg.mines) {
      const sec = Math.max(1, Math.round((Date.now() - startRef.current) / 1000))
      setElapsed(sec)
      finish(sec, mode)
    }
  }

  const flag = (idx: number) => {
    if (dead) return
    const cell = cells[idx]
    if (cell.revealed) return
    if (!cell.flagged && flagsPlaced >= cfg.mines) return
    setCells(cells.map((c, i) => (i === idx ? { ...c, flagged: !c.flagged } : c)))
    setFlagsPlaced((f) => (cell.flagged ? f - 1 : f + 1))
  }

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: 'minesweeper',
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
          <button
            type="button"
            onClick={() => setShowLeaderboard(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-500/10 dark:text-sky-400"
          >
            <Trophy size={15} />
            {t('games.minesweeper.highScores')}
          </button>
        </div>

        <ControlsHeader
          minesLeft={minesLeft}
          elapsed={elapsed}
          best={best}
          inputMode={inputMode}
          onToggleMode={() => setInputMode((m) => (m === 'reveal' ? 'flag' : 'reveal'))}
          onRestart={() => reset(mode)}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(Object.keys(DIFFICULTY) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={m === mode}
              onClick={() => pickMode(m)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                m === mode
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {t(`games.minesweeper.${m}`)}
            </button>
          ))}
        </div>

        <div className="relative mx-auto mt-4 w-full max-w-[480px]">
          <MinesweeperBoard
            cells={cells}
            cols={cfg.cols}
            inputMode={inputMode}
            dead={dead}
            onReveal={reveal}
            onFlag={flag}
          />

          {phase === 'lost' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-950/70 p-4 text-center backdrop-blur-sm">
              <span className="text-lg font-semibold text-white">{t('games.minesweeper.lose')}</span>
              <button
                type="button"
                onClick={() => reset(mode)}
                className="h-11 rounded-xl bg-sky-600 px-8 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                {t('games.minesweeper.playAgain')}
              </button>
            </div>
          )}

          {phase === 'won' && (
            <VictoryModal
              score={score}
              elapsed={elapsed}
              isNewBest={isNewBest}
              submitting={submitting}
              submitted={submitted}
              defaultNickname={getNickname() ?? ''}
              onSubmit={handleSubmit}
              onPlayAgain={() => reset(mode)}
              onShowLeaderboard={() => setShowLeaderboard(true)}
            />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('games.minesweeper.instructions')}
        </p>
      </main>

      {showLeaderboard && (
        <LeaderboardModal
          gameId="minesweeper"
          title={t('games.titles.minesweeper.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
