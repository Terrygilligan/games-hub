import { Flame, Volume2, VolumeX } from 'lucide-react'
import { useTranslation } from '../../../../i18n'

interface RoundHUDProps {
  current: number
  total: number
  score: number
  streak: number
  best: number
  soundOn: boolean
  ttsOn: boolean
  onToggleSound: () => void
}

export default function RoundHUD({
  current,
  total,
  score,
  streak,
  best,
  soundOn,
  ttsOn,
  onToggleSound,
}: RoundHUDProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
      <div className="flex items-center gap-4">
        <span className="font-semibold">
          {t('games.lexicon.question')} {current}/{total}
        </span>
        <span className="text-slate-600 dark:text-slate-300">
          {t('games.lexicon.score')}: {score}
        </span>
        {streak >= 2 && (
          <span className="inline-flex items-center gap-0.5 font-semibold text-amber-500">
            <Flame size={14} />
            {t('games.lexicon.streak')} ×{streak}
          </span>
        )}
        <span className="text-slate-500 dark:text-slate-400">
          {t('games.lexicon.best')}: {best}
        </span>
      </div>
      {ttsOn && (
        <button
          type="button"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          aria-label={t(soundOn ? 'games.lexicon.soundOn' : 'games.lexicon.soundOff')}
          title={t(soundOn ? 'games.lexicon.soundOn' : 'games.lexicon.soundOff')}
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
            soundOn
              ? 'bg-sky-600 text-white hover:bg-sky-500'
              : 'bg-slate-200 text-slate-500 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      )}
    </div>
  )
}
