import { Delete, CornerDownLeft } from 'lucide-react'
import type { LetterState } from './GuessGrid'

const keyCls = (state: LetterState | undefined): string => {
  if (state === 'correct') return 'bg-emerald-500 text-white'
  if (state === 'present') return 'bg-amber-500 text-white'
  if (state === 'absent') return 'bg-slate-400 text-slate-100 dark:bg-slate-700 dark:text-slate-400'
  return 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
}

interface KeyboardProps {
  rows: string[][]
  states: Record<string, LetterState>
  onLetter: (letter: string) => void
  onEnter: () => void
  onBackspace: () => void
}

export default function Keyboard({ rows, states, onLetter, onEnter, onBackspace }: KeyboardProps) {
  return (
    <div className="flex w-full flex-col items-center gap-1.5">
      {rows.map((row, r) => (
        <div key={r} className="flex w-full justify-center gap-1">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onLetter(key)}
              className={`flex h-12 min-w-0 flex-1 items-center justify-center rounded-md text-sm font-semibold transition sm:h-14 ${keyCls(states[key])}`}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
      <div className="flex w-full justify-center gap-1">
        <button
          type="button"
          onClick={onBackspace}
          aria-label="Backspace"
          className="flex h-12 flex-1 items-center justify-center rounded-md bg-slate-300 text-slate-800 transition hover:bg-slate-400 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 sm:h-14"
        >
          <Delete size={18} />
        </button>
        <button
          type="button"
          onClick={onEnter}
          aria-label="Enter"
          className="flex h-12 flex-[3] items-center justify-center rounded-md bg-sky-600 text-white transition hover:bg-sky-500 sm:h-14"
        >
          <CornerDownLeft size={18} />
        </button>
      </div>
    </div>
  )
}
