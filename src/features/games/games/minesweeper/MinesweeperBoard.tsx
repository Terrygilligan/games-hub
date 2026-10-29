import { useRef } from 'react'
import { Bomb, Flag } from 'lucide-react'

export interface MineCell {
  mine: boolean
  revealed: boolean
  flagged: boolean
  adjacent: number
  detonated: boolean
}

export type InputMode = 'reveal' | 'flag'

const NUM_COLOR = [
  '',
  'text-sky-600 dark:text-sky-400',
  'text-emerald-600 dark:text-emerald-400',
  'text-red-500',
  'text-violet-600 dark:text-violet-400',
  'text-amber-700 dark:text-amber-500',
  'text-teal-600 dark:text-teal-400',
  'text-slate-900 dark:text-slate-100',
  'text-slate-500',
]

const LONG_PRESS_MS = 400

interface MinesweeperBoardProps {
  cells: MineCell[]
  cols: number
  inputMode: InputMode
  dead: boolean
  onReveal: (i: number) => void
  onFlag: (i: number) => void
}

export default function MinesweeperBoard({
  cells,
  cols,
  inputMode,
  dead,
  onReveal,
  onFlag,
}: MinesweeperBoardProps) {
  const pressTimer = useRef<number | null>(null)
  const suppressClick = useRef(false)

  const startPress = (i: number) => {
    suppressClick.current = false
    pressTimer.current = window.setTimeout(() => {
      suppressClick.current = true
      if (!dead) onFlag(i)
    }, LONG_PRESS_MS)
  }

  const cancelPress = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  const handleClick = (i: number) => {
    if (dead) return
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    if (inputMode === 'flag') onFlag(i)
    else onReveal(i)
  }

  const iconPx = cols === 16 ? 12 : cols === 12 ? 14 : 18
  const numClass =
    cols === 16 ? 'text-[9px]' : cols === 12 ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'

  return (
    <div
      className={`grid touch-manipulation gap-0.5 ${
        cols === 16 ? 'grid-cols-16' : cols === 12 ? 'grid-cols-12' : 'grid-cols-8'
      }`}
    >
      {cells.map((cell, i) => {
        const base =
          'relative flex aspect-square select-none items-center justify-center rounded-[3px] font-bold leading-none focus:outline-none'
        if (cell.revealed) {
          if (cell.mine) {
            return (
              <div
                key={i}
                className={`${base} ${cell.detonated ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
              >
                <Bomb size={iconPx} />
              </div>
            )
          }
          return (
            <div
              key={i}
              className={`${base} bg-slate-100 dark:bg-slate-900 ${NUM_COLOR[cell.adjacent]} ${numClass}`}
            >
              {cell.adjacent > 0 ? cell.adjacent : ''}
            </div>
          )
        }
        return (
          <button
            key={i}
            type="button"
            disabled={dead}
            aria-label={cell.flagged ? 'flagged' : undefined}
            onClick={() => handleClick(i)}
            onContextMenu={(e) => {
              e.preventDefault()
              if (!dead) onFlag(i)
            }}
            onTouchStart={() => startPress(i)}
            onTouchEnd={cancelPress}
            onTouchCancel={cancelPress}
            onTouchMove={cancelPress}
            className={`${base} border border-slate-400/40 bg-slate-300 transition enabled:hover:bg-slate-200 disabled:cursor-default dark:border-slate-900/60 dark:bg-slate-700 dark:enabled:hover:bg-slate-600`}
          >
            {cell.flagged && <Flag size={iconPx} className="fill-red-500 text-red-500" />}
          </button>
        )
      })}
    </div>
  )
}
