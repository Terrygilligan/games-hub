export type GameStatus = 'available' | 'coming-soon'

export interface GameMetadata {
  id: string
  titleKey: string
  descriptionKey: string
  icon: string
  status: GameStatus
  route?: string
}

export interface LeaderboardEntry {
  id: string
  gameId: string
  playerId: string
  nickname: string
  score: number
  createdAt: number
}

export interface ScorePayload {
  gameId: string
  playerId: string
  nickname: string
  score: number
}

export interface PlayerIdentity {
  playerId: string
  nickname: string | null
}
