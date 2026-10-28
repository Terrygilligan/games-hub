import { useState } from 'react'
import Header from '../../components/Header'
import Footer from '../../components/Footer'
import type { GameMetadata } from './types'
import { GAME_REGISTRY } from './games'
import { useTranslation } from '../../i18n'
import GameCard from './components/GameCard'
import LeaderboardModal from './components/LeaderboardModal'

export default function GamesHubView() {
  const { t } = useTranslation()
  const [leaderboardGame, setLeaderboardGame] = useState<GameMetadata | null>(null)

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GAME_REGISTRY.map((game) => (
              <GameCard key={game.id} game={game} onShowLeaderboard={setLeaderboardGame} />
            ))}
          </div>
        )}
      </main>
      <Footer />

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
