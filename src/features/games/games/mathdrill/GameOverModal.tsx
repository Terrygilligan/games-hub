import { Play, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import NicknameGate from '../../components/NicknameGate'

interface GameOverModalProps {
  score: number
  isNewBest: boolean
  submitting: boolean
  submitted: boolean
  defaultNickname: string
  onSubmit: (nickname: string) => void
  onPlayAgain: () => void
  onShowLeaderboard: () => void
}

export default function GameOverModal({
  score,
  isNewBest,
  submitting,
  submitted,
  defaultNickname,
  onSubmit,
  onPlayAgain,
  onShowLeaderboard,
}: GameOverModalProps) {
  const { t } = useTranslation()

  return (
    <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl bg-slate-950 p-6 text-center">
      <h2 className="text-2xl font-bold text-white">{t('games.math-drill.gameOver')}</h2>
      <p className="text-sm text-slate-300">
        {t('games.math-drill.finalScore')}: <span className="font-semibold text-white">{score}</span>
      </p>
      {isNewBest && (
        <p className="text-sm font-semibold text-amber-400">{t('games.math-drill.newBest')}</p>
      )}

      {isNewBest && !submitted && (
        <NicknameGate
          gameId="math-drill"
          defaultNickname={defaultNickname}
          submitting={submitting}
          submitLabel={t('games.math-drill.submitScore')}
          submittingLabel={t('games.math-drill.submitting')}
          onSubmit={onSubmit}
        />
      )}
      {submitted && (
        <p className="text-sm font-medium text-emerald-400">{t('games.scores.submitted')}</p>
      )}

      <button
        type="button"
        onClick={onPlayAgain}
        className="inline-flex h-11 w-full max-w-xs items-center justify-center gap-1.5 rounded-lg bg-slate-200 text-sm font-medium text-slate-900 transition hover:bg-white"
      >
        <Play size={15} />
        {t('games.math-drill.playAgain')}
      </button>
      <button
        type="button"
        onClick={onShowLeaderboard}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-400 transition hover:text-sky-300"
      >
        <Trophy size={14} />
        {t('games.math-drill.highScores')}
      </button>
    </div>
  )
}
