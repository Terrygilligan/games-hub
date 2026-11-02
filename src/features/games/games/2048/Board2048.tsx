import { useRef } from 'react'
import type { CSSProperties, TouchEvent } from 'react'
import type { Tile, Vec } from './Twenty48Game'

const SWIPE_MIN = 24

const BOARD_STYLE = {
  '--gap': '0.5rem',
  '--cell': 'calc((100% - 5 * var(--gap)) / 4)',
} as CSSProperties

const TILE_STYLES: Record<number, string> = {
  2: 'bg-[#eee4da] text-[#776e65]',
  4: 'bg-[#ede0c8] text-[#776e65]',
  8: 'bg-[#f2b179] text-white',
  16: 'bg-[#f59563] text-white',
  32: 'bg-[#f67c5f] text-white',
  64: 'bg-[#f65e3b] text-white',
  128: 'bg-[#edcf72] text-white',
  256: 'bg-[#edcc61] text-white',
  512: 'bg-[#edc850] text-white',
  1024: 'bg-[#edc53f] text-white',
  2048: 'bg-[#edc22e] text-white',
}
const SUPER_STYLE = 'bg-[#3c3a33] text-white'

const fontFor = (v: number) =>
  v < 128
    ? 'text-2xl sm:text-3xl'
    : v < 1024
      ? 'text-xl sm:text-2xl'
      : v < 16384
        ? 'text-lg sm:text-xl'
        : 'text-base sm:text-lg'

interface Board2048Props {
  tiles: Tile[]
  onMove: (dir: Vec) => void
}

export default function Board2048({ tiles, onMove }: Board2048Props) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  // Swipe math copied from SnakeBoard — cross-game imports are forbidden.
  const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return
    onMove(
      Math.abs(dx) > Math.abs(dy)
        ? { x: Math.sign(dx), y: 0 }
        : { x: 0, y: Math.sign(dy) },
    )
  }

  return (
    <div
      style={BOARD_STYLE}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="relative aspect-square w-full touch-none select-none rounded-2xl bg-[#bbada0]"
    >
      <style>{`@keyframes tfe-spawn{from{transform:scale(0)}to{transform:scale(1)}}@keyframes tfe-pop{0%{transform:scale(.6)}60%{transform:scale(1.15)}100%{transform:scale(1)}}`}</style>
      <div className="grid h-full grid-cols-4 grid-rows-4 gap-[var(--gap)] p-[var(--gap)]">
        {Array.from({ length: 16 }, (_, i) => (
          <div key={i} className="rounded-lg bg-[#eee4da]/35" />
        ))}
      </div>
      {tiles.map((tile) => (
        <div
          key={tile.id}
          style={{
            transform: `translate(calc(var(--gap) + ${tile.col} * (var(--cell) + var(--gap))), calc(var(--gap) + ${tile.row} * (var(--cell) + var(--gap))))`,
            zIndex: tile.merged ? 20 : tile.gone ? 5 : 10,
          }}
          className="absolute left-0 top-0 h-[var(--cell)] w-[var(--cell)] transition-transform duration-[120ms] ease-linear"
        >
          <div
            style={
              tile.merged
                ? { animation: 'tfe-pop 140ms ease-out' }
                : tile.spawned
                  ? { animation: 'tfe-spawn 140ms ease-out' }
                  : undefined
            }
            className={`flex h-full w-full items-center justify-center rounded-lg font-bold ${TILE_STYLES[tile.value] ?? SUPER_STYLE} ${fontFor(tile.value)}`}
          >
            {tile.value}
          </div>
        </div>
      ))}
    </div>
  )
}
