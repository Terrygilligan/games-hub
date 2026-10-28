import { useRef } from 'react'
import type { RefObject, TouchEvent } from 'react'
import type { Vec } from './SnakeGame'

const CELL_PX = 24
const SWIPE_MIN = 24

interface SnakeBoardProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  onDirection: (dir: Vec) => void
  onTap: () => void
}

export default function SnakeBoard({ canvasRef, onDirection, onTap }: SnakeBoardProps) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = (e: TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  const onTouchEnd = (e: TouchEvent<HTMLCanvasElement>) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) {
      onTap()
      return
    }
    onDirection(
      Math.abs(dx) > Math.abs(dy)
        ? { x: Math.sign(dx), y: 0 }
        : { x: 0, y: Math.sign(dy) },
    )
  }

  return (
    <canvas
      ref={canvasRef}
      width={CELL_PX * 20}
      height={CELL_PX * 20}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={onTap}
      className="block aspect-square w-full touch-none rounded-2xl border border-slate-200 dark:border-slate-800"
    />
  )
}
