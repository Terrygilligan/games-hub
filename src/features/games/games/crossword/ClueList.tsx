import { useTranslation } from '../../../../i18n'
import type { Clue } from './crossword'

interface ClueListProps {
  across: Clue[]
  down: Clue[]
  activeClue: Clue | null
  solved: Set<string>
  onPick: (clue: Clue) => void
}

export default function ClueList({ across, down, activeClue, solved, onPick }: ClueListProps) {
  const { t } = useTranslation()

  const render = (title: string, clues: Clue[]) => (
    <div>
      <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h3>
      <ul className="flex flex-col gap-0.5">
        {clues.map((cl) => {
          const key = `${cl.dir}${cl.num}`
          const active = activeClue === cl
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onPick(cl)}
                className={`w-full rounded px-2 py-1 text-left text-sm transition ${
                  active
                    ? 'bg-sky-500/20 font-semibold text-sky-700 dark:text-sky-300'
                    : solved.has(key)
                      ? 'text-slate-400 line-through'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span className="mr-1 font-semibold">{cl.num}.</span>
                {cl.text}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )

  return (
    <div className="grid grid-cols-2 gap-4">
      {render(t('games.crossword.across'), across)}
      {render(t('games.crossword.down'), down)}
    </div>
  )
}
