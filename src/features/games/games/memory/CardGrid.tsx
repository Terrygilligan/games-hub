export interface MemoryCard {
  id: number
  pairId: number
  word: string
  up: boolean
  matched: boolean
}

interface CardGridProps {
  cards: MemoryCard[]
  cols: number
  onFlip: (id: number) => void
}

export default function CardGrid({ cards, cols, onFlip }: CardGridProps) {
  return (
    <div className={`grid gap-2 ${cols === 6 ? 'grid-cols-6' : 'grid-cols-4'}`}>
      {cards.map((card) => {
        const faceUp = card.up || card.matched
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onFlip(card.id)}
            aria-label={faceUp ? card.word : undefined}
            className="relative aspect-square cursor-pointer [perspective:600px] focus:outline-none"
          >
            <div
              className={`absolute inset-0 transition-transform duration-300 [transform-style:preserve-3d] ${
                faceUp ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              <div className="absolute inset-0 rounded-xl border border-sky-400/40 bg-gradient-to-br from-sky-500 to-sky-700 shadow-sm transition enabled:hover:from-sky-400 enabled:hover:to-sky-600 [backface-visibility:hidden] dark:border-sky-500/30" />
              <div
                className={`absolute inset-0 flex items-center justify-center rounded-xl border px-0.5 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                  card.matched
                    ? 'border-emerald-400 bg-emerald-500/15 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'
                }`}
              >
                <span
                  className={`text-center font-semibold leading-tight ${
                    cols === 6 ? 'text-[9px] sm:text-xs' : 'text-xs sm:text-sm'
                  }`}
                >
                  {card.word}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
