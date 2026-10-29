import type { GameMetadata } from '../types'

// Registry of games shown on the hub grid. Individual game containers live in
// this folder (one self-contained module per game, e.g. games/snake/) and are
// wired into App.tsx routes + this registry when they ship.
export const GAME_REGISTRY: GameMetadata[] = [
  {
    id: 'snake',
    titleKey: 'games.titles.snake.name',
    descriptionKey: 'games.titles.snake.description',
    icon: 'worm',
    status: 'available',
    route: '/games/snake',
  },
  {
    id: 'memory',
    titleKey: 'games.titles.memory.name',
    descriptionKey: 'games.titles.memory.description',
    icon: 'layout-grid',
    status: 'available',
    route: '/games/memory',
  },
  {
    id: 'minesweeper',
    titleKey: 'games.titles.minesweeper.name',
    descriptionKey: 'games.titles.minesweeper.description',
    icon: 'bomb',
    status: 'available',
    route: '/games/minesweeper',
  },
  {
    id: 'lexicon',
    titleKey: 'games.titles.lexicon.name',
    descriptionKey: 'games.titles.lexicon.description',
    icon: 'book-open',
    status: 'available',
    route: '/games/lexicon',
  },
  {
    id: 'word-guess',
    titleKey: 'games.titles.word-guess.name',
    descriptionKey: 'games.titles.word-guess.description',
    icon: 'type',
    status: 'available',
    route: '/games/word-guess',
  },
]
