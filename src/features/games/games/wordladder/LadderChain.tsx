import { useTranslation } from '../../../../i18n'

interface LadderChainProps {
  ladder: string[]
  target: string
}

// Renders start word, each entered rung (changed letter highlighted),
// and the target at the bottom.
export default function LadderChain({ ladder, target }: LadderChainProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-1.5">
      {ladder.map((word, i) => {
        const prev = i > 0 ? ladder[i - 1] : ''
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-right text-xs font-semibold text-slate-400">
              {i === 0 ? '▸' : i}
            </span>
            <div
              className={`flex gap-1 rounded-lg border px-3 py-1.5 font-mono text-lg font-bold tracking-widest ${
                i === 0
                  ? 'border-sky-400 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                  : 'border-emerald-400 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              }`}
              aria-label={i === 0 ? t('games.wordladder.startWord') : undefined}
            >
              {word.split('').map((ch, c) => (
                <span key={c} className={prev && prev[c] !== ch ? 'text-amber-500' : ''}>
                  {ch}
                </span>
              ))}
            </div>
          </div>
        )
      })}
      <div className="flex items-center gap-2">
        <span className="w-6 text-right text-xs font-semibold text-slate-400">⌂</span>
        <div
          className="flex gap-1 rounded-lg border border-dashed border-amber-400 px-3 py-1.5 font-mono text-lg font-bold tracking-widest text-amber-600 dark:text-amber-400"
          aria-label={t('games.wordladder.targetWord')}
        >
          {target.split('').map((ch, c) => (
            <span key={c}>{ch}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
