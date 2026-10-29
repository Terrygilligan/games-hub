import { useState } from 'react'
import { Heart } from 'lucide-react'
import type { GameMetadata } from './types'
import { GAME_REGISTRY } from './games'
import { useTranslation } from '../../i18n'
import GameCard from './components/GameCard'
import LeaderboardModal from './components/LeaderboardModal'
import { useFavorites } from './favorites'

export default function GamesHubView() {
  const { t } = useTranslation()
  const [leaderboardGame, setLeaderboardGame] = useState<GameMetadata | null>(null)
  const favorites = useFavorites()

  const favGames = GAME_REGISTRY.filter((g) => favorites.includes(g.id))
  const restGames = GAME_REGISTRY.filter((g) => !favorites.includes(g.id))

  const grid = (games: GameMetadata[]) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <GameCard key={game.id} game={game} onShowLeaderboard={setLeaderboardGame} />
      ))}
    </div>
  )

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t('games.hub.title')}
        </h1>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
          {t('games.hub.subtitle')}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
          {t('games.hub.tagline')}
        </p>
      </div>

      {GAME_REGISTRY.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
          {t('games.hub.empty')}
        </p>
      ) : (
        <>
          {favGames.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-500">
                <Heart size={12} fill="currentColor" />
                {t('games.nav.favorites')}
              </h2>
              {grid(favGames)}
              {restGames.length > 0 && (
                <h2 className="mb-3 mt-8 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {t('games.nav.allGames')}
                </h2>
              )}
            </section>
          )}
          {grid(restGames)}
        </>
      )}

      {leaderboardGame && (
        <LeaderboardModal
          gameId={leaderboardGame.id}
          title={t(leaderboardGame.titleKey)}
          onClose={() => setLeaderboardGame(null)}
        />
      )}
    </div>
  )
}
