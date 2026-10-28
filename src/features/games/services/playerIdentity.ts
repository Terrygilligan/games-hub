import type { PlayerIdentity } from '../types'

// Zero-auth privacy model: no accounts, no sign-in. The player is identified
// by a client-generated UUID plus a free-form nickname, both kept in
// localStorage under the games-hub.* prefix and sent with score submissions.
const PLAYER_ID_KEY = 'games-hub.playerId'
const NICKNAME_KEY = 'games-hub.nickname'

export const MAX_NICKNAME_LENGTH = 24

export function getPlayerId(): string {
  try {
    const existing = localStorage.getItem(PLAYER_ID_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(PLAYER_ID_KEY, id)
    return id
  } catch {
    // storage unavailable — ephemeral id for this session
    return crypto.randomUUID()
  }
}

export function getNickname(): string | null {
  try {
    return localStorage.getItem(NICKNAME_KEY)
  } catch {
    return null
  }
}

export function setNickname(nickname: string) {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname.slice(0, MAX_NICKNAME_LENGTH))
  } catch {
    // storage unavailable — nickname won't persist
  }
}

export function getPlayerIdentity(): PlayerIdentity {
  return { playerId: getPlayerId(), nickname: getNickname() }
}
