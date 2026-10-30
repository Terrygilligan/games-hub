import { Play, Trophy } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import NicknameGate from '../../components/NicknameGate'

interface VictoryModalProps {
  score: number
  timeStr: string
  hints: number
  isNewBest: boolean
  submitting: boolean
  submitted: boolean
  defaultNickname: string
  onSubmit: (nickname: string) => void
  onPlayAgain: () => void
  onShowLeaderboard: () => void
}

export default function VictoryModal({
  score,
  timeStr,
  hints,
  isNewBest,
  submitting,
  submitted,
  defaultNickname,
  onSubmit,
  onPlayAgain,
  onShowLeaderboard,
}: VictoryModalProps) {
  const { t } = useTranslation()

  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-950/80 p-6 backdrop-blur-sm">
      <div className="flex w-full max-w-xs flex-col items-center gap-3 text-center">
        <h2 className="text-2xl font-bold text-white">{t('games.crossword.win')}</h2>
        <p className="text-sm text-slate-300">
          {t('games.crossword.time')}: <span className="font-semibold text-white">{timeStr}</span>
          {' · '}
          {t('games.crossword.hints')}: <span className="font-semibold text-white">{hints}</span>
        </p>
        <p className="text-sm text-slate-300">
          {t('games.crossword.score')}: <span className="font-semibold text-white">{score}</span>
        </p>
        {isNewBest && (
          <p className="text-sm font-semibold text-amber-400">{t('games.crossword.newBest')}</p>
        )}

        {isNewBest && !submitted && (
          <>
            <NicknameGate
              gameId="crossword"
              defaultNickname={defaultNickname}
              submitting={submitting}
              submitLabel={t('games.crossword.submitScore')}
              submittingLabel={t('games.crossword.submitting')}
              onSubmit={onSubmit}
            />
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
          {t('games.crossword.playAgain')}
        </button>
        <button
          type="button"
          onClick={onShowLeaderboard}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-400 transition hover:text-sky-300"
        >
          <Trophy size={14} />
          {t('games.crossword.highScores')}
        </button>
      </div>
    </div>
  )
}
