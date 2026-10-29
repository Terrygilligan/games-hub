import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import GamesHubView from './features/games/GamesHubView'

const SnakeGame = lazy(() => import('./features/games/games/snake/SnakeGame'))
const MemoryGame = lazy(() => import('./features/games/games/memory/MemoryGame'))
const MinesweeperGame = lazy(() => import('./features/games/games/minesweeper/MinesweeperGame'))
const LexiconGame = lazy(() => import('./features/games/games/lexicon/LexiconGame'))
const WordGuessGame = lazy(() => import('./features/games/games/wordguess/WordGuessGame'))

function Loading() {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-slate-600 dark:text-slate-400">
      …
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<GamesHubView />} />
        <Route
          path="games/snake"
          element={
            <Suspense fallback={<Loading />}>
              <SnakeGame />
            </Suspense>
          }
        />
        <Route
          path="games/memory"
          element={
            <Suspense fallback={<Loading />}>
              <MemoryGame />
            </Suspense>
          }
        />
        <Route
          path="games/minesweeper"
          element={
            <Suspense fallback={<Loading />}>
              <MinesweeperGame />
            </Suspense>
          }
        />
        <Route
          path="games/lexicon"
          element={
            <Suspense fallback={<Loading />}>
              <LexiconGame />
            </Suspense>
          }
        />
        <Route
          path="games/word-guess"
          element={
            <Suspense fallback={<Loading />}>
              <WordGuessGame />
            </Suspense>
          }
        />
        <Route path="games" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
