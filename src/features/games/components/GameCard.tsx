import { Link } from 'react-router-dom'
import { Bomb, BookOpen, Gamepad2, Hash, LayoutGrid, Play, Puzzle, Trophy, Type, Waypoints, Worm } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { GameMetadata } from '../types'
import { useTranslation } from '../../../i18n'

const ICONS: Record<string, LucideIcon> = {
  worm: Worm,
  'layout-grid': LayoutGrid,
  bomb: Bomb,
  'book-open': BookOpen,
  type: Type,
  waypoints: Waypoints,
  hash: Hash,
  puzzle: Puzzle,
}

interface GameCardProps {
  game: GameMetadata
  onShowLeaderboard: (game: GameMetadata) => void
}

export default function GameCard({ game, onShowLeaderboard }: GameCardProps) {
  const { t } = useTranslation()
  const Icon = ICONS[game.icon] ?? Gamepad2
  const playable = game.status === 'available' && Boolean(game.route)

  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white transition hover:border-slate-600 hover:bg-slate-200/70 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60">
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-200 text-sky-600 transition group-hover:bg-sky-500/10 dark:bg-slate-800 dark:text-sky-400">
          <Icon size={22} />
        </div>
        <h3 className="text-base font-semibold">{t(game.titleKey)}</h3>
        <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {t(game.descriptionKey)}
        </p>
        <div className="mt-4 flex items-center gap-2">
          {playable && game.route ? (
            <Link
              to={game.route}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
            >
              <Play size={15} />
              {t('games.actions.playNow')}
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {t('games.hub.comingSoon')}
            </span>
          )}
          <button
            type="button"
            onClick={() => onShowLeaderboard(game)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-500/10 dark:text-sky-400"
          >
            <Trophy size={15} />
            {t('games.actions.viewLeaderboard')}
          </button>
        </div>
      </div>
    </div>
  )
}
