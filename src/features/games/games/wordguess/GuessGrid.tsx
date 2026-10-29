export type LetterState = 'correct' | 'present' | 'absent'

export const WORD_LEN = 5
export const MAX_GUESSES = 6

const cellCls = (state: LetterState | undefined): string => {
  if (state === 'correct') {
    return 'border-emerald-500 bg-emerald-500 text-white'
  }
  if (state === 'present') {
    return 'border-amber-500 bg-amber-500 text-white'
  }
  if (state === 'absent') {
    return 'border-slate-400 bg-slate-500 text-white dark:border-slate-600 dark:bg-slate-700'
  }
  return 'border-slate-300 dark:border-slate-600'
}

interface GuessGridProps {
  guesses: string[]
  states: LetterState[][]
  current: string
  errorRow: boolean
}

export default function GuessGrid({ guesses, states, current, errorRow }: GuessGridProps) {
  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => {
    const word = r < guesses.length ? guesses[r] : r === guesses.length ? current : ''
    const isError = errorRow && r === guesses.length
    return (
      <div key={r} className="flex justify-center gap-1.5">
        {Array.from({ length: WORD_LEN }, (_, c) => (
          <div
            key={c}
            className={`flex aspect-square w-12 items-center justify-center rounded-lg border-2 text-xl font-bold transition sm:w-14 ${
              isError ? 'border-red-500' : cellCls(states[r]?.[c])
            } ${word[c] && !states[r] ? 'border-slate-500 dark:border-slate-400' : ''}`}
          >
            {word[c] ?? ''}
          </div>
        ))}
      </div>
    )
  })
  return <div className="flex flex-col gap-1.5">{rows}</div>
}
