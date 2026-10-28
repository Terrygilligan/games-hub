import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'
import { getDict, useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import CardGrid from './CardGrid'
import type { MemoryCard } from './CardGrid'
import ScoreBoard from './ScoreBoard'
import VictoryModal from './VictoryModal'

const MODES = {
  classic: { cols: 4, pairs: 8 },
  expert: { cols: 6, pairs: 18 },
} as const
type Mode = keyof typeof MODES
type Phase = 'ready' | 'playing' | 'won'

const MATCH_MS = 350
const MISS_MS = 900
const WIN_DELAY_MS = 600

const bestKey = (mode: Mode) => `games-hub.best.memory.${mode}`

const loadBest = (mode: Mode): number => {
  try {
    return Number(localStorage.getItem(bestKey(mode))) || 0
  } catch {
    return 0
  }
}

const saveBest = (mode: Mode, v: number) => {
  try {
    localStorage.setItem(bestKey(mode), String(v))
  } catch {
    // storage unavailable — best won't persist
  }
}

const shuffle = <T,>(arr: T[]): T[] => {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Efficiency-weighted score: fewer moves + faster time + longer match streaks.
const calcScore = (pairs: number, moves: number, seconds: number, maxCombo: number): number => {
  const moveEff = pairs / moves
  const timeFactor = Math.min(2, Math.max(0.25, (pairs * 4) / Math.max(1, seconds)))
  return Math.round(pairs * 150 * moveEff * timeFactor) + maxCombo * 50
}

export default function MemoryGame() {
  const { lang, t } = useTranslation()

  const [mode, setMode] = useState<Mode>('classic')
  const [phase, setPhase] = useState<Phase>('ready')
  const [cards, setCards] = useState<MemoryCard[]>([])
  const [moves, setMoves] = useState(0)
  const [found, setFound] = useState(0)
  const [combo, setCombo] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => loadBest('classic'))
  const [isNewBest, setIsNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const lockRef = useRef(false)
  const startRef = useRef(0)
  const maxComboRef = useRef(0)
  const roundRef = useRef(0)
  const scoreRef = useRef(0)

  const pairCount = MODES[mode].pairs
  const cols = MODES[mode].cols

  const dealCards = useCallback(
    (m: Mode): MemoryCard[] => {
      const words = getDict(lang).games.memory.words.filter((p) => p.length >= 2)
      const picked = shuffle(words).slice(0, MODES[m].pairs)
      return shuffle(
        picked.flatMap((pair, pairId) => [
          { id: pairId * 2, pairId, word: pair[0], up: false, matched: false },
          { id: pairId * 2 + 1, pairId, word: pair[1], up: false, matched: false },
        ]),
      )
    },
    [lang],
  )

  useEffect(() => {
    if (phase === 'ready') setCards(dealCards(mode))
  }, [phase, mode, dealCards])

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

  const start = useCallback(() => {
    roundRef.current += 1
    lockRef.current = false
    startRef.current = Date.now()
    maxComboRef.current = 0
    scoreRef.current = 0
    setMoves(0)
    setFound(0)
    setCombo(0)
    setElapsed(0)
    setScore(0)
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    setPhase('playing')
  }, [])

  const playAgain = useCallback(() => {
    setCards(dealCards(mode))
    start()
  }, [dealCards, mode, start])

  const finish = useCallback(
    (finalMoves: number, currentMode: Mode) => {
      const pairs = MODES[currentMode].pairs
      const sec = Math.max(1, Math.round((Date.now() - startRef.current) / 1000))
      setElapsed(sec)
      const sc = calcScore(pairs, finalMoves, sec, maxComboRef.current)
      scoreRef.current = sc
      setScore(sc)
      if (sc > loadBest(currentMode)) {
        saveBest(currentMode, sc)
        setBest(sc)
        setIsNewBest(true)
      }
      setPhase('won')
    },
    [],
  )

  const flip = (id: number) => {
    if (phase !== 'playing' || lockRef.current) return
    const target = cards.find((c) => c.id === id)
    if (!target || target.up || target.matched) return
    const next = cards.map((c) => (c.id === id ? { ...c, up: true } : c))
    setCards(next)
    const open = next.filter((c) => c.up && !c.matched)
    if (open.length < 2) return

    const newMoves = moves + 1
    setMoves(newMoves)
    const [a, b] = open
    const round = roundRef.current

    if (a.pairId === b.pairId) {
      const newCombo = combo + 1
      setCombo(newCombo)
      maxComboRef.current = Math.max(maxComboRef.current, newCombo)
      const newFound = found + 1
      setFound(newFound)
      lockRef.current = true
      window.setTimeout(() => {
        if (round !== roundRef.current) return
        setCards((cs) =>
          cs.map((c) => (c.id === a.id || c.id === b.id ? { ...c, matched: true } : c)),
        )
        lockRef.current = false
      }, MATCH_MS)
      if (newFound === pairCount) {
        window.setTimeout(() => {
          if (round === roundRef.current) finish(newMoves, mode)
        }, WIN_DELAY_MS)
      }
    } else {
      setCombo(0)
      lockRef.current = true
      window.setTimeout(() => {
        if (round !== roundRef.current) return
        setCards((cs) =>
          cs.map((c) => (c.id === a.id || c.id === b.id ? { ...c, up: false } : c)),
        )
        lockRef.current = false
      }, MISS_MS)
    }
  }

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: 'memory',
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
          <button
            type="button"
            onClick={() => setShowLeaderboard(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-500/10 dark:text-sky-400"
          >
            <Trophy size={15} />
            {t('games.memory.highScores')}
          </button>
        </div>

        <ScoreBoard
          moves={moves}
          elapsed={elapsed}
          combo={combo}
          found={found}
          total={pairCount}
          best={best}
        />

        <div className="relative mx-auto mt-4 w-full max-w-[480px]">
          <CardGrid cards={cards} cols={cols} onFlip={flip} />

          {phase === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-950/70 p-4 text-center backdrop-blur-sm">
              <span className="max-w-xs px-2 text-sm text-slate-300">
                {t('games.memory.instructions')}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(Object.keys(MODES) as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={m === mode}
                    onClick={() => setMode(m)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                      m === mode
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {t(`games.memory.${m}`)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={start}
                className="mt-1 h-11 rounded-xl bg-sky-600 px-8 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                {t('games.memory.tapToStart')}
              </button>
            </div>
          )}

          {phase === 'won' && (
            <VictoryModal
              score={score}
              moves={moves}
              elapsed={elapsed}
              isNewBest={isNewBest}
              submitting={submitting}
              submitted={submitted}
              defaultNickname={getNickname() ?? ''}
              onSubmit={handleSubmit}
              onPlayAgain={playAgain}
              onShowLeaderboard={() => setShowLeaderboard(true)}
            />
          )}
        </div>
      </main>
      <Footer itemKey="memory" />

      {showLeaderboard && (
        <LeaderboardModal
          gameId="memory"
          title={t('games.titles.memory.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
