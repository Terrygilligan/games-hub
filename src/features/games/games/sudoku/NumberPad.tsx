import { Eraser, Pencil } from 'lucide-react'
import { useTranslation } from '../../../../i18n'

interface NumberPadProps {
  notesMode: boolean
  onNumber: (n: number) => void
  onErase: () => void
  onToggleNotes: () => void
}

export default function NumberPad({ notesMode, onNumber, onErase, onToggleNotes }: NumberPadProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-9 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onNumber(n)}
            className="flex h-11 items-center justify-center rounded-lg bg-slate-200 text-lg font-bold text-slate-800 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onToggleNotes}
          aria-pressed={notesMode}
          title={t('games.sudoku.notes')}
          className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition ${
            notesMode
              ? 'bg-amber-500 text-white hover:bg-amber-400'
              : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <Pencil size={15} />
          {t('games.sudoku.notes')}
        </button>
        <button
          type="button"
          onClick={onErase}
          title={t('games.sudoku.erase')}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-200 text-sm font-medium text-slate-600 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
        >
          <Eraser size={15} />
          {t('games.sudoku.erase')}
        </button>
      </div>
    </div>
  )
}
