import type { LeaderboardEntry, ScorePayload } from '../types'
import { getDb } from '../../../lib/firebase'

const COLLECTION = 'games_leaderboards'
const TOP_SCORES_LIMIT = 10

// Submits a score anonymously — no Firebase Auth. The player is identified by
// the local UUID + nickname from playerIdentity.ts. Firestore rules enforce
// create-only writes and validate field shapes server-side.
export async function submitScore(payload: ScorePayload): Promise<boolean> {
  const db = await getDb()
  if (!db) return false
  try {
    const { addDoc, collection, serverTimestamp } = await import('@firebase/firestore')
    await addDoc(collection(db, COLLECTION), {
      gameId: payload.gameId,
      playerId: payload.playerId,
      nickname: payload.nickname,
      score: payload.score,
      createdAt: serverTimestamp(),
    })
    return true
  } catch {
    return false
  }
}

// Soft nickname-uniqueness check — warns when a name is already on this game's
// board under a different playerId. Returns false when the backend is absent
// (offline → just allow). Case-insensitive; names aren't reserved.
export async function isNameTaken(
  gameId: string,
  nickname: string,
  playerId: string,
): Promise<boolean> {
  const db = await getDb()
  if (!db) return false
  const name = nickname.trim().toLowerCase()
  if (!name) return false
  try {
    const { collection, getDocs, limit, query, where } = await import('@firebase/firestore')
    const snap = await getDocs(
      query(collection(db, COLLECTION), where('gameId', '==', gameId), limit(500)),
    )
    return snap.docs.some(
      (d) =>
        d.data().playerId !== playerId &&
        typeof d.data().nickname === 'string' &&
        d.data().nickname.toLowerCase() === name,
    )
  } catch {
    return false
  }
}

export async function fetchTopScores(gameId: string): Promise<LeaderboardEntry[]> {
  const db = await getDb()
  if (!db) return []
  try {
    const { collection, getDocs, limit, orderBy, query, where } = await import(
      '@firebase/firestore'
    )
    const q = query(
      collection(db, COLLECTION),
      where('gameId', '==', gameId),
      orderBy('score', 'desc'),
      orderBy('createdAt', 'asc'),
      limit(TOP_SCORES_LIMIT),
    )
    const snap = await getDocs(q)
    return snap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        gameId: data.gameId,
        playerId: data.playerId,
        nickname: data.nickname,
        score: data.score,
        createdAt: data.createdAt?.toMillis?.() ?? 0,
      }
    })
  } catch {
    return []
  }
}
