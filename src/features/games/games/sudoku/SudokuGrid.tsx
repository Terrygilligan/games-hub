interface SudokuGridProps {
  puzzle: number[]
  entries: number[]
  notes: Map<number, Set<number>>
  selected: number | null
  wrong: Set<number>
  onSelect: (idx: number) => void
}

export default function SudokuGrid({
  puzzle,
  entries,
  notes,
  selected,
  wrong,
  onSelect,
}: SudokuGridProps) {
  const selVal = selected !== null ? entries[selected] : 0
  const selRow = selected !== null ? Math.floor(selected / 9) : -1
  const selCol = selected !== null ? selected % 9 : -1

  return (
    <div className="grid aspect-square w-full grid-cols-9 overflow-hidden rounded-lg border-2 border-slate-400 bg-white dark:border-slate-600 dark:bg-slate-900">
      {entries.map((v, i) => {
        const r = Math.floor(i / 9)
        const c = i % 9
        const given = puzzle[i] !== 0
        const isSel = i === selected
        const inLine =
          selected !== null && (r === selRow || c === selCol || (Math.floor(r / 3) === Math.floor(selRow / 3) && Math.floor(c / 3) === Math.floor(selCol / 3)))
        const sameNum = selVal !== 0 && v === selVal
        const isWrong = wrong.has(i)
        const noteSet = notes.get(i)

        let cls = 'text-slate-900 dark:text-slate-100'
        if (given) cls = 'font-bold text-slate-900 dark:text-slate-100'
        else if (isWrong) cls = 'text-red-500'
        else cls = 'text-sky-600 dark:text-sky-400'

        let bg = ''
        if (isSel) bg = 'bg-sky-500/30'
        else if (sameNum) bg = 'bg-sky-500/15'
        else if (inLine) bg = 'bg-slate-100 dark:bg-slate-800'

        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={`relative flex items-center justify-center border-slate-200 text-sm transition dark:border-slate-700 ${cls} ${bg} ${
              c % 3 === 2 && c !== 8 ? 'border-r-2 border-r-slate-400 dark:border-r-slate-600' : 'border-r'
            } ${r % 3 === 2 && r !== 8 ? 'border-b-2 border-b-slate-400 dark:border-b-slate-600' : 'border-b'} ${isSel ? 'z-10 ring-2 ring-sky-500' : ''}`}
          >
            {v !== 0 ? (
              v
            ) : noteSet && noteSet.size > 0 ? (
              <span className="grid grid-cols-3 text-[8px] leading-none text-slate-400">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <span key={n}>{noteSet.has(n) ? n : ''}</span>
                ))}
              </span>
            ) : (
              ''
            )}
          </button>
        )
      })}
    </div>
  )
}
