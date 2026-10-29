import type { Built, Clue } from './crossword'
import { cellsOf } from './crossword'

interface CrosswordGridProps {
  built: Built
  entries: string[]
  activeClue: Clue | null
  activeCell: number
  wrong: Set<number>
  onCellClick: (idx: number) => void
}

export default function CrosswordGrid({
  built,
  entries,
  activeClue,
  activeCell,
  wrong,
  onCellClick,
}: CrosswordGridProps) {
  const { size, numAt } = built
  const activeCells = activeClue ? new Set(cellsOf(activeClue, size)) : new Set<number>()

  return (
    <div
      className="grid aspect-square w-full overflow-hidden rounded-lg border border-slate-300 bg-slate-900 dark:border-slate-700"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0,1fr))`, gap: 1 }}
      role="grid"
    >
      {entries.map((v, i) => {
        const black = built.slotAt[i] === -1 && numAt[i] === 0 && !hasLetter(built, i)
        if (black) {
          return <div key={i} className="bg-slate-900" aria-hidden="true" />
        }
        const inSlot = activeCells.has(i)
        const isSel = i === activeCell
        const isWrong = wrong.has(i) && v !== ''
        return (
          <button
            key={i}
            type="button"
            onClick={() => onCellClick(i)}
            role="gridcell"
            aria-label={`cell ${Math.floor(i / size) + 1},${(i % size) + 1}`}
            className={`relative flex items-center justify-center text-base font-bold uppercase transition ${
              isSel
                ? 'bg-amber-400 text-slate-900'
                : inSlot
                  ? 'bg-sky-200 text-slate-900 dark:bg-sky-700/60 dark:text-white'
                  : 'bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
            } ${isWrong ? 'text-red-600 dark:text-red-400' : ''}`}
          >
            {numAt[i] > 0 && (
              <span className="absolute left-0.5 top-0 text-[8px] font-semibold leading-tight text-slate-500 dark:text-slate-400">
                {numAt[i]}
              </span>
            )}
            {v}
          </button>
        )
      })}
    </div>
  )
}

const hasLetter = (built: Built, i: number): boolean => {
  const size = built.size
  const r = Math.floor(i / size)
  const c = i % size
  return built.all.some((cl) => {
    const rr = cl.dir === 'a' ? cl.row : r
    return cl.dir === 'a' ? rr === r && c >= cl.col && c < cl.col + cl.len : cl.col === c && r >= cl.row && r < cl.row + cl.len
  })
}
