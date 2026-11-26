import { useEffect } from 'react'
import { Lightbulb, X } from 'lucide-react'
import { useTranslation } from '../../../../i18n'

const tile = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 text-lg font-bold'

export default function RulesModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('games.wordguess.rulesTitle')}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('games.wordguess.rulesTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('games.actions.close')}
            title={t('games.actions.close')}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('games.wordguess.rulesGoal')}
        </p>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {t('games.wordguess.rulesSubmit')}
        </p>

        <div className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-3">
            <span className={`${tile} border-emerald-500 bg-emerald-500 text-white`}>W</span>
            <span className="text-slate-600 dark:text-slate-300">{t('games.wordguess.rulesCorrect')}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${tile} border-amber-500 bg-amber-500 text-white`}>W</span>
            <span className="text-slate-600 dark:text-slate-300">{t('games.wordguess.rulesPresent')}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${tile} border-slate-400 bg-slate-500 text-white dark:border-slate-600 dark:bg-slate-700`}>W</span>
            <span className="text-slate-600 dark:text-slate-300">{t('games.wordguess.rulesAbsent')}</span>
          </div>
        </div>

        <p className="mt-4 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Lightbulb size={16} className="mt-0.5 shrink-0" />
          <span>{t('games.wordguess.rulesHint')}</span>
        </p>
      </div>
    </div>
  )
}
