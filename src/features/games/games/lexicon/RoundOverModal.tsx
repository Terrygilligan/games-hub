import { useState } from 'react'
import { Play, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import { MAX_NICKNAME_LENGTH } from '../../services/playerIdentity'

interface RoundOverModalProps {
  score: number
  correct: number
  total: number
  isNewBest: boolean
  submitting: boolean
  submitted: boolean
  defaultNickname: string
  onSubmit: (nickname: string) => void
  onPlayAgain: () => void
  onShowLeaderboard: () => void
}

export default function RoundOverModal({
  score,
  correct,
  total,
  isNewBest,
  submitting,
  submitted,
  defaultNickname,
  onSubmit,
  onPlayAgain,
  onShowLeaderboard,
}: RoundOverModalProps) {
  const { t } = useTranslation()
  const [nickname, setNicknameInput] = useState(defaultNickname)
  const canSubmit = isNewBest && !submitted && nickname.trim().length > 0

  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/80 p-6 backdrop-blur-sm">
      <div className="flex w-full max-w-xs flex-col items-center gap-3 text-center">
        <h2 className="text-2xl font-bold text-white">{t('games.lexicon.roundOver')}</h2>
        <p className="text-sm text-slate-300">
          {t('games.lexicon.finalScore')}: <span className="font-semibold text-white">{score}</span>
        </p>
        <p className="text-xs text-slate-400">
          {t('games.lexicon.correctAnswers')}: {correct}/{total}
        </p>
        {isNewBest && (
          <p className="text-sm font-semibold text-amber-400">{t('games.lexicon.newBest')}</p>
        )}

        {isNewBest && !submitted && (
          <>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNicknameInput(e.target.value)}
              maxLength={MAX_NICKNAME_LENGTH}
              placeholder={t('games.nickname.placeholder')}
              aria-label={t('games.nickname.label')}
              className="h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-center text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={() => onSubmit(nickname)}
              className="h-11 w-full rounded-lg bg-sky-600 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-40"
            >
              {submitting ? t('games.lexicon.submitting') : t('games.lexicon.submitScore')}
            </button>
          </>
        )}
        {submitted && (
          <p className="text-sm font-medium text-emerald-400">{t('games.scores.submitted')}</p>
        )}

        <button
          type="button"
          onClick={onPlayAgain}
          className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-slate-200 text-sm font-medium text-slate-900 transition hover:bg-white"
        >
          <Play size={15} />
          {t('games.lexicon.playAgain')}
        </button>
        <button
          type="button"
          onClick={onShowLeaderboard}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-400 transition hover:text-sky-300"
        >
          <Trophy size={14} />
          {t('games.lexicon.highScores')}
        </button>
      </div>
    </div>
  )
}
