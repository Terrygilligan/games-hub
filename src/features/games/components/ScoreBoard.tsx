import type { LeaderboardEntry } from '../types'
import { useTranslation } from '../../../i18n'

interface ScoreBoardProps {
  entries: LeaderboardEntry[]
  loading?: boolean
}

export default function ScoreBoard({ entries, loading = false }: ScoreBoardProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('common.loading')}
      </p>
    )
  }

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('games.scores.empty')}
      </p>
    )
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <th className="py-2 pr-3 font-medium">{t('games.scores.rank')}</th>
          <th className="py-2 pr-3 font-medium">{t('games.scores.player')}</th>
          <th className="py-2 text-right font-medium">{t('games.scores.points')}</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, i) => (
          <tr key={entry.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
            <td className="py-2.5 pr-3 font-semibold text-slate-400">#{i + 1}</td>
            <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-slate-200">
              {entry.nickname}
            </td>
            <td className="py-2.5 text-right font-semibold text-sky-600 dark:text-sky-400">
              {entry.score.toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
