import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import GameOverModal from './GameOverModal'
import type { Board } from './engine'
import { COLS, chooseMove, dropRow, emptyBoard, isFull, play, winner, winningCells } from './engine'

const BEST_KEY = 'games-hub.best.connect-four'

type Difficulty = 'easy' | 'normal' | 'hard'
const DEPTHS: Record<Difficulty, number> = { easy: 3, normal: 5, hard: 7 }

type Phase = 'ready' | 'playing' | 'over'
type Result = 'win' | 'lose' | 'draw' | null

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

export default function ConnectFourGame() {
  const { t } = useTranslation()

  const phaseRef = useRef<Phase>('ready')
  const depthRef = useRef(5)
  const movesRef = useRef(0)
  const timerRef = useRef<number | undefined>(undefined)
  const scoreRef = useRef(0)
  const resultRef = useRef<Result>(null)

  const [board, setBoard] = useState<Board>(emptyBoard)
  const [phase, setPhase] = useState<Phase>('ready')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [turn, setTurn] = useState<1 | 2>(1)
  const [moves, setMoves] = useState(0)
  const [result, setResult] = useState<Result>(null)
  const [winLine, setWinLine] = useState<[number, number][]>([])
  const [hoverCol, setHoverCol] = useState<number | null>(null)
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

  const endGame = useCallback(
    (b: Board, res: Result) => {
      resultRef.current = res
      setResult(res)
      setWinLine(winningCells(b))
      if (res === 'win') {
        const final = depthRef.current * 200 + Math.max(0, 21 - movesRef.current) * 20
        scoreRef.current = final
        setScore(final)
        if (final > loadBest()) {
          saveBest(final)
          setBest(final)
          setIsNewBest(true)
        }
      }
      // hold the board for a beat so the player sees the winning move
      timerRef.current = window.setTimeout(() => setPhaseSync('over'), 900)
    },
    [setPhaseSync],
  )

  const aiMove = useCallback(
    (b: Board) => {
      timerRef.current = window.setTimeout(() => {
        const col = chooseMove(b, depthRef.current, 2)
        const next = play(b, col, 2)
        setBoard(next)
        const w = winner(next)
        if (w === 2) endGame(next, 'lose')
        else if (isFull(next)) endGame(next, 'draw')
        else setTurn(1)
      }, 400 + Math.random() * 400)
    },
    [endGame],
  )

  const dropIn = useCallback(
    (col: number) => {
      if (phaseRef.current !== 'playing' || turn !== 1 || resultRef.current !== null) return
      if (dropRow(board, col) < 0) return
      const next = play(board, col, 1)
      movesRef.current += 1
      setMoves(movesRef.current)
      setBoard(next)
      const w = winner(next)
      if (w === 1) endGame(next, 'win')
      else if (isFull(next)) endGame(next, 'draw')
      else {
        setTurn(2)
        aiMove(next)
      }
    },
    [aiMove, board, endGame, turn],
  )

  const start = useCallback(
    (d: Difficulty) => {
      window.clearTimeout(timerRef.current)
      depthRef.current = DEPTHS[d]
      setDifficulty(d)
      movesRef.current = 0
      scoreRef.current = 0
      resultRef.current = null
      setBoard(emptyBoard())
      setMoves(0)
      setResult(null)
      setWinLine([])
      setScore(0)
      setTurn(1)
      setIsNewBest(false)
      setSubmitting(false)
      setSubmitted(false)
      setPhaseSync('playing')
    },
    [setPhaseSync],
  )

  const back = useCallback(() => {
    window.clearTimeout(timerRef.current)
    setPhaseSync('ready')
  }, [setPhaseSync])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: `connect-four.${difficulty}`,
      playerId: getPlayerId(),
      nickname: name,
      score: scoreRef.current,
    })
    setSubmitting(false)
    if (ok) setSubmitted(true)
  }

  const winSet = new Set(winLine.map(([c, r]) => `${c},${r}`))

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
            aria-label={t('games.connect-four.highScores')}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-500/10 dark:text-sky-300"
          >
            <Trophy size={15} />
            <span className="hidden sm:inline">{t('games.connect-four.highScores')}</span>
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {phase === 'playing' && (turn === 1 ? t('games.connect-four.yourTurn') : t('games.connect-four.aiThinking'))}
            {phase === 'over' && `${t('games.connect-four.moves')}: ${moves}`}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">
              {t('games.connect-four.best')}: {best}
            </span>
            {phase === 'playing' && (
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RotateCcw size={14} />
                {t('games.connect-four.newGame')}
              </button>
            )}
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {t('games.connect-four.instructions')}
        </p>

        <div className="relative mx-auto w-full max-w-[480px]">
          {phase === 'ready' ? (
            <div className="flex aspect-[7/6] w-full flex-col items-center justify-center gap-4 rounded-2xl bg-slate-100 p-6 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('games.connect-four.pickDifficulty')}
              </p>
              <div className="flex w-full max-w-xs flex-col gap-3">
                {(['easy', 'normal', 'hard'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => start(d)}
                    className={`inline-flex h-12 items-center justify-center rounded-xl text-base font-semibold text-white transition ${
                      d === 'easy'
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : d === 'normal'
                          ? 'bg-sky-700 hover:bg-sky-600'
                          : 'bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600'
                    }`}
                  >
                    {t(`games.connect-four.${d}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid aspect-[7/6] w-full grid-cols-7 gap-1.5 rounded-2xl bg-indigo-700 p-2 sm:gap-2 sm:p-3">
              {Array.from({ length: COLS }, (_, c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => dropIn(c)}
                  onMouseEnter={() => setHoverCol(c)}
                  onMouseLeave={() => setHoverCol(null)}
                  disabled={phase !== 'playing' || turn !== 1 || result !== null}
                  aria-label={`Column ${c + 1}`}
                  className="flex flex-col gap-1.5 sm:gap-2"
                >
                  {board[c].map((cell, r) => (
                    <span
                      key={r}
                      className={`aspect-square w-full rounded-full transition ${
                        cell === 1
                          ? winSet.has(`${c},${r}`)
                            ? 'bg-amber-300 ring-2 ring-white'
                            : 'bg-amber-400'
                          : cell === 2
                            ? winSet.has(`${c},${r}`)
                              ? 'bg-red-400 ring-2 ring-white'
                              : 'bg-red-500'
                            : `${hoverCol === c && turn === 1 && phase === 'playing' ? 'bg-indigo-300' : 'bg-slate-200'} dark:bg-slate-900`
                      }`}
                    />
                  ))}
                </button>
              ))}
            </div>
          )}

          {phase === 'over' && (
            <GameOverModal
              score={score}
              result={result}
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
          {t('games.connect-four.hint')}
        </p>
      </main>

      {showLeaderboard && (
        <LeaderboardModal
          gameId={`connect-four.${difficulty}`}
          title={`${t('games.titles.connect-four.name')} — ${t(`games.connect-four.${difficulty}`)}`}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
