import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { LeaderboardEntry } from '../types'
import { fetchTopScores } from '../services/leaderboardService'
import { useTranslation } from '../../../i18n'
import ScoreBoard from './ScoreBoard'

interface LeaderboardModalProps {
  gameId: string
  title: string
  onClose: () => void
}

export default function LeaderboardModal({ gameId, title, onClose }: LeaderboardModalProps) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchTopScores(gameId).then((scores) => {
      if (!cancelled) {
        setEntries(scores)
        setLoading(false)
      }
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelled = true
      window.removeEventListener('keydown', onKey)
    }
  }, [gameId, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('games.scores.leaderboard')}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {t('games.scores.leaderboard')} · {title}
          </h2>
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
        <ScoreBoard entries={entries} loading={loading} />
      </div>
    </div>
  )
}
