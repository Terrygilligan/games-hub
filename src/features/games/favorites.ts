// Per-user game favorites — localStorage-backed, reactive via event broadcast.
// NOTE: the snapshot must be a stable reference or useSyncExternalStore
// re-renders forever — cache it and only replace on toggle.
import { useSyncExternalStore } from 'react'

const KEY = 'games-hub.favorites'
const EVENT = 'games-hub:favorites'

const read = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

let cache: string[] = read()

export const getFavorites = (): string[] => cache
export const isFavorite = (id: string): boolean => cache.includes(id)

export const toggleFavorite = (id: string): string[] => {
  cache = cache.includes(id) ? cache.filter((f) => f !== id) : [...cache, id]
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // storage unavailable
  }
  window.dispatchEvent(new Event(EVENT))
  return cache
}

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb)
  return () => window.removeEventListener(EVENT, cb)
}

export const useFavorites = (): string[] =>
  useSyncExternalStore(subscribe, () => cache)
