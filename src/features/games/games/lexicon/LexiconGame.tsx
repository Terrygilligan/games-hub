import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import Header from '../../../../components/Header'
import Footer from '../../../../components/Footer'
import { getDict, useTranslation } from '../../../../i18n'
import { getNickname, getPlayerId, setNickname } from '../../services/playerIdentity'
import { submitScore } from '../../services/leaderboardService'
import LeaderboardModal from '../../components/LeaderboardModal'
import QuestionCard from './QuestionCard'
import RoundHUD from './RoundHUD'
import RoundOverModal from './RoundOverModal'
import { speak, stopSpeaking, ttsSupported } from './speech'

export interface LexiconQuestion {
  word: string
  options: string[]
  correctIdx: number
}

type Phase = 'ready' | 'playing' | 'over'

const ROUND_SIZE = 10
const FEEDBACK_MS = 900
const BASE_PTS = 100
const SPEED_MAX = 50
const SPEED_SECS = 5
const STREAK_PTS = 10
const STREAK_CAP = 10
const BEST_KEY = 'games-hub.best.lexicon'
const SOUND_KEY = 'games-hub.lexicon.muted'

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

const loadSound = (): boolean => {
  try {
    return localStorage.getItem(SOUND_KEY) !== '1'
  } catch {
    return true
  }
}

const saveSound = (on: boolean) => {
  try {
    localStorage.setItem(SOUND_KEY, on ? '0' : '1')
  } catch {
    // storage unavailable
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

export default function LexiconGame() {
  const { lang, t } = useTranslation()

  const [phase, setPhase] = useState<Phase>('ready')
  const [questions, setQuestions] = useState<LexiconQuestion[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [best, setBest] = useState(loadBest)
  const [isNewBest, setIsNewBest] = useState(false)
  const [soundOn, setSoundOn] = useState(loadSound)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const shownAtRef = useRef(0)
  const scoreRef = useRef(0)
  const roundRef = useRef(0)

  const buildRound = useCallback((): LexiconQuestion[] => {
    const entries = getDict(lang).games.lexicon.entries.filter((e) => e.length >= 2)
    const defs = entries.map((e) => e[1])
    return shuffle(entries)
      .slice(0, ROUND_SIZE)
      .map(([word, def]) => {
        const distractors = shuffle(defs.filter((d) => d !== def)).slice(0, 3)
        const options = shuffle([def, ...distractors])
        return { word, options, correctIdx: options.indexOf(def) }
      })
  }, [lang])

  const start = useCallback(() => {
    roundRef.current += 1
    setQuestions(buildRound())
    setQIdx(0)
    setPicked(null)
    setScore(0)
    scoreRef.current = 0
    setStreak(0)
    setCorrect(0)
    setIsNewBest(false)
    setSubmitting(false)
    setSubmitted(false)
    shownAtRef.current = Date.now()
    setPhase('playing')
  }, [buildRound])

  const finish = useCallback((finalScore: number) => {
    if (finalScore > loadBest()) {
      saveBest(finalScore)
      setBest(finalScore)
      setIsNewBest(true)
    }
    setPhase('over')
  }, [])

  const pick = useCallback(
    (idx: number) => {
      if (phase !== 'playing' || picked !== null) return
      const q = questions[qIdx]
      if (!q) return
      const elapsedSec = (Date.now() - shownAtRef.current) / 1000
      const isCorrect = idx === q.correctIdx
      let gained = 0
      if (isCorrect) {
        const newStreak = streak + 1
        setStreak(newStreak)
        setCorrect((c) => c + 1)
        gained =
          BASE_PTS +
          Math.round(SPEED_MAX * Math.max(0, 1 - elapsedSec / SPEED_SECS)) +
          Math.min(newStreak, STREAK_CAP) * STREAK_PTS
        const newScore = scoreRef.current + gained
        scoreRef.current = newScore
        setScore(newScore)
        if (soundOn) speak(q.options[q.correctIdx], lang)
      } else {
        setStreak(0)
      }
      setPicked(idx)
      const round = roundRef.current
      const lastQ = qIdx === questions.length - 1
      window.setTimeout(() => {
        if (round !== roundRef.current) return
        if (lastQ) {
          finish(scoreRef.current)
        } else {
          setQIdx((i) => i + 1)
          setPicked(null)
          shownAtRef.current = Date.now()
        }
      }, FEEDBACK_MS)
    },
    [finish, lang, phase, picked, qIdx, questions, soundOn, streak],
  )

  // Auto-speak the word when a new question appears (sound on, TTS available).
  useEffect(() => {
    if (phase === 'playing' && picked === null && soundOn && questions[qIdx]) {
      speak(questions[qIdx].word, lang)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIdx])

  useEffect(() => () => stopSpeaking(), [])

  useEffect(() => {
    if (phase !== 'playing') return
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= 4) pick(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, pick])

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    saveSound(next)
    if (!next) stopSpeaking()
  }

  const handleSubmit = async (nickname: string) => {
    const name = nickname.trim()
    if (!name || submitting) return
    setSubmitting(true)
    setNickname(name)
    const ok = await submitScore({
      gameId: 'lexicon',
      playerId: getPlayerId(),
      nickname: name,
      score: scoreRef.current,
    })
    setSubmitting(false)
    if (ok) setSubmitted(true)
  }

  const question = questions[qIdx]

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
            {t('games.lexicon.highScores')}
          </button>
        </div>

        <RoundHUD
          current={Math.min(qIdx + 1, ROUND_SIZE)}
          total={ROUND_SIZE}
          score={score}
          streak={streak}
          best={best}
          soundOn={soundOn}
          ttsOn={ttsSupported}
          onToggleSound={toggleSound}
        />

        <div className="relative mx-auto mt-4 w-full max-w-[520px]">
          {phase === 'playing' && question && (
            <QuestionCard
              question={question}
              reveal={picked !== null}
              picked={picked}
              ttsOn={ttsSupported && soundOn}
              onPick={pick}
              onSpeakWord={() => speak(question.word, lang)}
            />
          )}

          {phase === 'ready' && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <span className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
                {t('games.lexicon.instructions')}
              </span>
              <button
                type="button"
                onClick={start}
                className="h-11 rounded-xl bg-sky-600 px-8 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                {t('games.lexicon.tapToStart')}
              </button>
            </div>
          )}

          {phase === 'over' && (
            <div className="relative">
              <RoundOverModal
                score={score}
                correct={correct}
                total={ROUND_SIZE}
                isNewBest={isNewBest}
                submitting={submitting}
                submitted={submitted}
                defaultNickname={getNickname() ?? ''}
                onSubmit={handleSubmit}
                onPlayAgain={start}
                onShowLeaderboard={() => setShowLeaderboard(true)}
              />
            </div>
          )}
        </div>
      </main>
      <Footer itemKey="lexicon" />

      {showLeaderboard && (
        <LeaderboardModal
          gameId="lexicon"
          title={t('games.titles.lexicon.name')}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
