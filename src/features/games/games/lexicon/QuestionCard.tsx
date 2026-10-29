import { Volume2 } from 'lucide-react'
import { useTranslation } from '../../../../i18n'
import type { LexiconQuestion } from './LexiconGame'

interface QuestionCardProps {
  question: LexiconQuestion
  reveal: boolean
  picked: number | null
  ttsOn: boolean
  onPick: (idx: number) => void
  onSpeakWord: () => void
}

export default function QuestionCard({
  question,
  reveal,
  picked,
  ttsOn,
  onPick,
  onSpeakWord,
}: QuestionCardProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-2xl font-bold tracking-tight">{question.word}</h2>
        {ttsOn && (
          <button
            type="button"
            onClick={onSpeakWord}
            aria-label={t('games.lexicon.speak')}
            title={t('games.lexicon.speak')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sky-600 transition hover:bg-sky-500/10 dark:text-sky-400"
          >
            <Volume2 size={18} />
          </button>
        )}
      </div>

      {question.options.map((opt, i) => {
        const isCorrect = i === question.correctIdx
        const isPicked = i === picked
        let cls =
          'border-slate-200 bg-white text-slate-800 enabled:hover:border-sky-400 enabled:hover:bg-sky-500/5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:enabled:hover:border-sky-500'
        if (reveal) {
          if (isCorrect) {
            cls = 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
          } else if (isPicked) {
            cls = 'border-red-400 bg-red-500/15 text-red-700 dark:text-red-300'
          } else {
            cls =
              'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
          }
        }
        return (
          <button
            key={i}
            type="button"
            disabled={reveal}
            onClick={() => onPick(i)}
            className={`flex min-h-11 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${cls}`}
          >
            <span className="w-5 shrink-0 text-center text-xs font-bold text-slate-400">
              {i + 1}
            </span>
            <span className="flex-1">{opt}</span>
          </button>
        )
      })}
    </div>
  )
}
