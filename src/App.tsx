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
const Twenty48Game = lazy(() => import('./features/games/games/2048/Twenty48Game'))
const ReactionGame = lazy(() => import('./features/games/games/reaction/ReactionGame'))
const MathDrillGame = lazy(() => import('./features/games/games/mathdrill/MathDrillGame'))
const SimonGame = lazy(() => import('./features/games/games/simon/SimonGame'))
const BreakoutGame = lazy(() => import('./features/games/games/breakout/BreakoutGame'))
const TypingGame = lazy(() => import('./features/games/games/typing/TypingGame'))
const ConnectFourGame = lazy(() => import('./features/games/games/connectfour/ConnectFourGame'))
const FifteenGame = lazy(() => import('./features/games/games/fifteen/FifteenGame'))
const AimTrainerGame = lazy(() => import('./features/games/games/aim/AimTrainerGame'))

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
          <Route path="games/2048" element={lazyEl(<Twenty48Game />)} />
          <Route path="games/reaction" element={lazyEl(<ReactionGame />)} />
          <Route path="games/math-drill" element={lazyEl(<MathDrillGame />)} />
          <Route path="games/simon" element={lazyEl(<SimonGame />)} />
          <Route path="games/breakout" element={lazyEl(<BreakoutGame />)} />
          <Route path="games/typing" element={lazyEl(<TypingGame />)} />
          <Route path="games/connect-four" element={lazyEl(<ConnectFourGame />)} />
          <Route path="games/fifteen" element={lazyEl(<FifteenGame />)} />
          <Route path="games/aim" element={lazyEl(<AimTrainerGame />)} />
          <Route path="games" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
