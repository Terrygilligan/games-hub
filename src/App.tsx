import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import GamesHubView from './features/games/GamesHubView'

const SnakeGame = lazy(() => import('./features/games/games/snake/SnakeGame'))
const MemoryGame = lazy(() => import('./features/games/games/memory/MemoryGame'))
const MinesweeperGame = lazy(() => import('./features/games/games/minesweeper/MinesweeperGame'))
const LexiconGame = lazy(() => import('./features/games/games/lexicon/LexiconGame'))
const WordGuessGame = lazy(() => import('./features/games/games/wordguess/WordGuessGame'))
const WordLadderGame = lazy(() => import('./features/games/games/wordladder/WordLadderGame'))
const SudokuGame = lazy(() => import('./features/games/games/sudoku/SudokuGame'))
const CrosswordGame = lazy(() => import('./features/games/games/crossword/CrosswordGame'))

function Loading() {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-slate-600 dark:text-slate-400">
      …
    </div>
  )
}

const lazyEl = (el: React.ReactNode) => <Suspense fallback={<Loading />}>{el}</Suspense>

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<GamesHubView />} />
          <Route path="games/snake" element={lazyEl(<SnakeGame />)} />
          <Route path="games/memory" element={lazyEl(<MemoryGame />)} />
          <Route path="games/minesweeper" element={lazyEl(<MinesweeperGame />)} />
          <Route path="games/lexicon" element={lazyEl(<LexiconGame />)} />
          <Route path="games/word-guess" element={lazyEl(<WordGuessGame />)} />
          <Route path="games/word-ladder" element={lazyEl(<WordLadderGame />)} />
          <Route path="games/sudoku" element={lazyEl(<SudokuGame />)} />
          <Route path="games/crossword" element={lazyEl(<CrosswordGame />)} />
          <Route path="games" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
