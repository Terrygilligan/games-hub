import { getDb } from './firebase'
import { getPlayerId } from '../features/games/services/playerIdentity'

// Anonymous per-item ratings in the `item_ratings` collection — one doc per
// vote: { itemId, playerId, stars(1-5), app, createdAt }. Aggregates are
// computed client-side; duplicate voting is prevented client-side via
// `games-hub.rated.<itemId>` (see components/shared/GlobalFooterBar).
const COLLECTION = 'item_ratings'
const FETCH_LIMIT = 500

export interface RatingSnapshot {
  average: number
  count: number
}

export async function submitRating(itemId: string, stars: number): Promise<boolean> {
  const db = await getDb()
  if (!db) return false
  try {
    const { addDoc, collection, serverTimestamp } = await import('@firebase/firestore')
    await addDoc(collection(db, COLLECTION), {
      itemId,
      playerId: getPlayerId(),
      stars,
      app: 'games-hub',
      createdAt: serverTimestamp(),
    })
    return true
  } catch {
    return false
  }
}

// Anonymous written reviews in `item_reviews` — separate collection so review
// docs never pollute the star aggregates: { itemId, playerId, stars, review,
// app, createdAt }.
const REVIEWS_COLLECTION = 'item_reviews'

export async function submitReview(
  itemId: string,
  stars: number,
  review: string,
): Promise<boolean> {
  const db = await getDb()
  const text = review.trim().slice(0, 500)
  if (!db || !text) return false
  try {
    const { addDoc, collection, serverTimestamp } = await import('@firebase/firestore')
    await addDoc(collection(db, REVIEWS_COLLECTION), {
      itemId,
      playerId: getPlayerId(),
      stars,
      review: text,
      app: 'games-hub',
      createdAt: serverTimestamp(),
    })
    return true
  } catch {
    return false
  }
}

export async function fetchRating(itemId: string): Promise<RatingSnapshot | null> {
  const db = await getDb()
  if (!db) return null
  try {
    const { collection, getDocs, limit, query, where } = await import('@firebase/firestore')
    const snap = await getDocs(
      query(collection(db, COLLECTION), where('itemId', '==', itemId), limit(FETCH_LIMIT)),
    )
    let sum = 0
    let count = 0
    snap.forEach((doc) => {
      const stars = doc.data().stars
      if (typeof stars === 'number') {
        sum += stars
        count += 1
      }
    })
    return count > 0 ? { average: sum / count, count } : null
  } catch {
    return null
  }
}
