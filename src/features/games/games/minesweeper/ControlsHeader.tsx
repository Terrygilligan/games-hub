import { Bomb, Flag, Pickaxe, RotateCcw, Timer } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import type { InputMode } from './MinesweeperBoard'

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

interface ControlsHeaderProps {
  minesLeft: number
  elapsed: number
  best: number
  inputMode: InputMode
  onToggleMode: () => void
  onRestart: () => void
}

export default function ControlsHeader({
  minesLeft,
  elapsed,
  best,
  inputMode,
  onToggleMode,
  onRestart,
}: ControlsHeaderProps) {
  const { t } = useTranslation()
  const chip =
    'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold'

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className={`${chip} bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100`}>
          <Bomb size={15} />
          {minesLeft}
        </span>
        <span className={`${chip} bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100`}>
          <Timer size={15} />
          {formatTime(elapsed)}
        </span>
        <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">
          {t('games.minesweeper.best')}: {best > 0 ? formatTime(best) : '—'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMode}
          aria-pressed={inputMode === 'flag'}
          title={t(inputMode === 'flag' ? 'games.minesweeper.flagMode' : 'games.minesweeper.revealMode')}
          aria-label={t(inputMode === 'flag' ? 'games.minesweeper.flagMode' : 'games.minesweeper.revealMode')}
          className={`${chip} w-12 transition ${
            inputMode === 'flag'
              ? 'bg-red-500 text-white'
              : 'bg-sky-600 text-white hover:bg-sky-500'
          }`}
        >
          {inputMode === 'flag' ? <Flag size={16} /> : <Pickaxe size={16} />}
        </button>
        <button
          type="button"
          onClick={onRestart}
          aria-label={t('games.minesweeper.playAgain')}
          title={t('games.minesweeper.playAgain')}
          className={`${chip} w-12 bg-slate-200 text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700`}
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  )
}
