import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { getDict, useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import GuessGrid from './GuessGrid'
import type { LetterState } from './GuessGrid'
import { MAX_GUESSES, WORD_LEN } from './GuessGrid'
import Keyboard from './Keyboard'
import VictoryModal from './VictoryModal'

type Phase = 'playing' | 'won' | 'lost'

const BEST_KEY = 'games-hub.best.word-guess'
const STREAK_KEY = 'games-hub.wordguess.streak'
const MAX_STREAK_KEY = 'games-hub.wordguess.max'

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

const evaluate = (guess: string, target: string): LetterState[] => {
  const res: LetterState[] = Array(WORD_LEN).fill('absent')
  const remaining: Record<string, number> = {}
  for (let i = 0; i < WORD_LEN; i++) {
    if (guess[i] === target[i]) res[i] = 'correct'
    else remaining[target[i]] = (remaining[target[i]] ?? 0) + 1
  }
  for (let i = 0; i < WORD_LEN; i++) {
    if (res[i] !== 'correct' && (remaining[guess[i]] ?? 0) > 0) {
      res[i] = 'present'
      remaining[guess[i]]--
    }
  }
  return res
}

const mergeStates = (
  prev: Record<string, LetterState>,
  guess: string,
  states: LetterState[],
): Record<string, LetterState> => {
  const rank = { absent: 0, present: 1, correct: 2 }
  const next = { ...prev }
  for (let i = 0; i < WORD_LEN; i++) {
    const l = guess[i]
    if (rank[states[i]] > rank[next[l] ?? 'absent' as LetterState]) next[l] = states[i]
  }
  return next
}

export default function WordGuessGame() {
  const { lang, t } = useTranslation()

  const dict = getDict(lang).games
  const dictSet = useMemo(
    () => new Set(dict.dictionary.fiveLetter.filter((w) => w.length === WORD_LEN)),
    [dict],
  )
  const keyRows = dict.wordguess.keys as string[][]
  const keySet = useMemo(() => new Set(keyRows.flat()), [keyRows])

  const [target, setTarget] = useState('')
  const [guesses, setGuesses] = useState<string[]>([])
  const [states, setStates] = useState<LetterState[][]>([])
  const [current, setCurrent] = useState('')
  const [letterStates, setLetterStates] = useState<Record<string, LetterState>>({})
  const [phase, setPhase] = useState<Phase>('playing')
  const [error, setError] = useState<string | null>(null)
  const [streak, setStreak] = useState(() => loadNum(STREAK_KEY))
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => loadNum(BEST_KEY))
  const [isNewBest, setIsNewBest] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const scoreRef = useRef(0)

  const newGame = useCallback(() => {
    const pool = getDict(lang).games.dictionary.fiveLetter.filter((w) => w.length === WORD_LEN)
    setTarget(pool[Math.floor(Math.random() * pool.length)] ?? '')
    setGuesses([])
    setStates([])
    setCurrent('')
    setLetterStates({})
    setPhase('playing')
    setError(null)
    setScore(0)
    scoreRef.current = 0
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
  }, [lang])

  useEffect(() => {
    newGame()
  }, [newGame])

  const flashError = (msg: string) => {
    setError(msg)
    window.setTimeout(() => setError(null), 1200)
  }

  const addLetter = useCallback(
    (letter: string) => {
      if (phase !== 'playing' || current.length >= WORD_LEN) return
      setCurrent((c) => c + letter.toUpperCase())
    },
    [phase, current.length],
  )

  const backspace = useCallback(() => {
    setCurrent((c) => c.slice(0, -1))
  }, [])

  const submit = useCallback(() => {
    if (phase !== 'playing') return
    const guess = current.toUpperCase()
    if (guess.length < WORD_LEN) return
    if (!dictSet.has(guess)) {
      flashError(t('games.wordguess.notInList'))
      return
    }
    const evalStates = evaluate(guess, target)
    const newGuesses = [...guesses, guess]
    setGuesses(newGuesses)
    setStates((s) => [...s, evalStates])
    setLetterStates((ls) => mergeStates(ls, guess, evalStates))
    setCurrent('')

    if (guess === target) {
      const newStreak = streak + 1
      setStreak(newStreak)
      saveNum(STREAK_KEY, newStreak)
      if (newStreak > loadNum(MAX_STREAK_KEY)) saveNum(MAX_STREAK_KEY, newStreak)
      const sc = (MAX_GUESSES + 1 - newGuesses.length) * 100 + newStreak * 50
      scoreRef.current = sc
      setScore(sc)
      if (sc > loadNum(BEST_KEY)) {
        saveNum(BEST_KEY, sc)
        setBest(sc)
        setIsNewBest(true)
      }
      setPhase('won')
    } else if (newGuesses.length >= MAX_GUESSES) {
      setStreak(0)
      saveNum(STREAK_KEY, 0)
      setPhase('lost')
    }
  }, [phase, current, dictSet, t, target, guesses, streak])

  useEffect(() => {
    if (phase !== 'playing') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') submit()
      else if (e.key === 'Backspace') backspace()
      else {
        const k = e.key.toUpperCase()
        if (k.length === 1 && keySet.has(k)) addLetter(k)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, submit, backspace, addLetter, keySet])

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: 'word-guess',
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
            {t('games.wordguess.highScores')}
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-semibold">
            {t('games.wordguess.streak')}: {streak}
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            {t('games.wordguess.best')}: {best}
          </span>
        </div>

        <div className="relative mx-auto w-full max-w-[420px]">
          <GuessGrid guesses={guesses} states={states} current={current} errorRow={error !== null} />
          {error && (
            <p className="mt-2 text-center text-sm font-medium text-red-500">{error}</p>
          )}
          <div className="mt-4">
            <Keyboard
              rows={keyRows}
              states={letterStates}
              onLetter={addLetter}
              onEnter={submit}
              onBackspace={backspace}
            />
          </div>

          {phase !== 'playing' && (
            <VictoryModal
              score={score}
              win={phase === 'won'}
              target={target}
              isNewBest={isNewBest}
              submitting={submitting}
              submitted={submitted}
              defaultNickname={getNickname() ?? ''}
              onSubmit={handleSubmit}
              onPlayAgain={newGame}
              onShowLeaderboard={() => setShowLeaderboard(true)}
            />
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('games.wordguess.instructions')}
        </p>
      </main>

      {showLeaderboard && (
        <LeaderboardModal
          gameId="word-guess"
          title={t('games.titles.word-guess.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
