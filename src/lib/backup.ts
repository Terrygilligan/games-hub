import { saveBlob } from './download'

const PREFIX = 'games-hub.'
const LAST_BACKUP_KEY = `${PREFIX}lastBackup`
const BACKUP_VERSION = 1

export interface BackupFile {
  app: 'games-hub'
  version: number
  exportedAt: string
  data: Record<string, string>
}

export function dataKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX)) keys.push(key)
  }
  return keys
}

export function snapshot(): Record<string, string> {
  const data: Record<string, string> = {}
  for (const key of dataKeys()) {
    data[key] = localStorage.getItem(key) ?? ''
  }
  return data
}

export function restore(data: Record<string, string>) {
  for (const key of dataKeys()) localStorage.removeItem(key)
  for (const [key, value] of Object.entries(data)) {
    localStorage.setItem(key, value)
  }
}

export function exportBackup() {
  const exportedAt = new Date().toISOString()
  localStorage.setItem(LAST_BACKUP_KEY, exportedAt)
  const backup: BackupFile = {
    app: 'games-hub',
    version: BACKUP_VERSION,
    exportedAt,
    data: snapshot(),
  }
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  saveBlob(blob, `games-hub-backup-${exportedAt.slice(0, 10)}.json`)
}

export async function importBackup(file: File): Promise<number> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('Could not read the file as JSON.')
  }
  const backup = parsed as BackupFile
  if (
    backup?.app !== 'games-hub' ||
    backup.version !== BACKUP_VERSION ||
    !backup.data ||
    typeof backup.data !== 'object' ||
    Object.values(backup.data).some((value) => typeof value !== 'string')
  ) {
    throw new Error('Not a valid Games Hub backup file.')
  }

  const entries = Object.entries(backup.data).filter(([key]) => key.startsWith(PREFIX))
  const previous = snapshot()
  try {
    restore(Object.fromEntries(entries))
  } catch (err) {
    try {
      restore(previous)
    } catch {
      // rollback best-effort — original error still propagates
    }
    throw err
  }
  return entries.length
}

export function clearAllData() {
  for (const key of dataKeys()) localStorage.removeItem(key)
}

export function lastBackupAt(): string | null {
  return localStorage.getItem(LAST_BACKUP_KEY)
}

export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist()) ?? false
  } catch {
    return false
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const est = await navigator.storage?.estimate()
    return est && typeof est.usage === 'number' && typeof est.quota === 'number'
      ? { usage: est.usage, quota: est.quota }
      : null
  } catch {
    return null
  }
}
