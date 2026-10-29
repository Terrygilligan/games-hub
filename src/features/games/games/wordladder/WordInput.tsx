import { CornerDownLeft, Undo2 } from 'lucide-react'
import { useTranslation } from '../../../../i18n'

interface WordInputProps {
  value: string
  len: number
  error: string | null
  canUndo: boolean
  onChange: (v: string) => void
  onSubmit: () => void
  onUndo: () => void
}

export default function WordInput({
  value,
  len,
  error,
  canUndo,
  onChange,
  onSubmit,
  onUndo,
}: WordInputProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit()
          }}
          maxLength={len}
          placeholder={t('games.wordladder.enterWord')}
          aria-label={t('games.wordladder.enterWord')}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 font-mono text-lg font-bold uppercase tracking-widest focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={value.length !== len}
          aria-label={t('games.wordladder.go')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white transition hover:bg-sky-500 disabled:opacity-40"
        >
          <CornerDownLeft size={18} />
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t('games.wordladder.undo')}
          title={t('games.wordladder.undo')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600 transition hover:bg-slate-300 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300"
        >
          <Undo2 size={18} />
        </button>
      </div>
      {error && <p className="text-center text-sm font-medium text-red-500">{error}</p>}
    </div>
  )
}
