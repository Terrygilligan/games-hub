import { Flame } from 'lucide-react'
import { useTranslation } from '../../../../i18n'

export const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

interface ScoreBoardProps {
  moves: number
  elapsed: number
  combo: number
  found: number
  total: number
  best: number
}

export default function ScoreBoard({ moves, elapsed, combo, found, total, best }: ScoreBoardProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
      <span className="font-semibold">
        {t('games.memory.moves')}: {moves}
      </span>
      <span className="text-slate-600 dark:text-slate-300">
        {t('games.memory.found')}: {found}/{total}
      </span>
      <span className="text-slate-600 dark:text-slate-300">
        {t('games.memory.time')}: {formatTime(elapsed)}
      </span>
      {combo >= 2 && (
        <span className="inline-flex items-center gap-0.5 font-semibold text-amber-500">
          <Flame size={14} />
          {t('games.memory.combo')} ×{combo}
        </span>
      )}
      <span className="text-slate-500 dark:text-slate-400">
        {t('games.memory.best')}: {best}
      </span>
    </div>
  )
}
