// Portable shared footer bar — config injection contract.
// This file must stay identical across projects; per-project differences live
// ONLY in ./config.ts beside it (see .agents/rules.md "Modularize by default").
import type { ComponentType } from 'react'

export type FooterT = (key: string, vars?: Record<string, string | number>) => string

export interface RatingSnapshot {
  average: number
  count: number
}

export interface FooterBarConfig {
  // Semantic footer keys ('rate', 'coffee', 'exportBackup', ...) → translated text.
  // Each project adapts this to its own i18n system in ./config.ts.
  t: FooterT

  // localStorage namespace for `rated.<itemKey>` dedupe flags.
  storagePrefix: string

  coffeeUrl: string

  // Anonymous identity used for rating docs (client UUID, never an account).
  playerId: () => string

  // Ratings service — implementations must degrade gracefully (null/false)
  // when the backend isn't configured.
  submitRating: (itemKey: string, stars: number) => Promise<boolean>
  fetchRating: (itemKey: string) => Promise<RatingSnapshot | null>

  // Optional written-review backend — if absent, the footer hides the
  // review affordance entirely.
  submitReview?: (itemKey: string, stars: number, review: string) => Promise<boolean>

  backup: {
    exportBackup: () => void
    importBackup: (file: File) => Promise<number>
    clearAllData: () => void
    lastBackupAt: () => string | null
    storageEstimate: () => Promise<{ usage: number; quota: number } | null>
    requestPersistence: () => Promise<boolean>
  }

  // Optional footer link components — each renders its own trigger + modal.
  modals: {
    BugReport?: ComponentType
    FeatureSuggest?: ComponentType
    Settings?: ComponentType
  }
}
