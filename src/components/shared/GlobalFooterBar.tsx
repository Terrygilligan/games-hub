// Portable shared footer bar — identical file in every hub project.
// All project-specific wiring is injected via ./config (FooterBarConfig):
// i18n adapter, ratings backend, backup lib, optional link modals.
import { useEffect, useRef, useState } from 'react'
import { Coffee, Download, Star, Trash2, Upload } from 'lucide-react'
import { footerConfig as cfg } from './config'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

const STAR_COUNT = 5

const formatBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

const votedKey = (itemKey: string) => `${cfg.storagePrefix}rated.${itemKey}`

const loadVote = (itemKey: string): number => {
  try {
    return Number(localStorage.getItem(votedKey(itemKey))) || 0
  } catch {
    return 0
  }
}

const saveVote = (itemKey: string, stars: number) => {
  try {
    localStorage.setItem(votedKey(itemKey), String(stars))
  } catch {
    // storage unavailable — vote won't be remembered locally
  }
}

interface GlobalFooterBarProps {
  itemKey: string
}

export default function GlobalFooterBar({ itemKey }: GlobalFooterBarProps) {
  const [myVote, setMyVote] = useState(() => loadVote(itemKey))
  const [snapshot, setSnapshot] = useState<{ average: number; count: number } | null>(null)
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null)
  const [lastBackup, setLastBackup] = useState<string | null>(() => cfg.backup.lastBackupAt())
  const [installAvailable, setInstallAvailable] = useState(deferredPrompt !== null)
  const [installHint, setInstallHint] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMyVote(loadVote(itemKey))
    void cfg.fetchRating(itemKey).then(setSnapshot)
  }, [itemKey])

  useEffect(() => {
    void cfg.backup.requestPersistence()
    void cfg.backup.storageEstimate().then(setEstimate)
  }, [])

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e as BeforeInstallPromptEvent
      setInstallAvailable(true)
    }
    const onInstalled = () => {
      deferredPrompt = null
      setInstallAvailable(false)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const vote = (stars: number) => {
    if (myVote > 0) return
    saveVote(itemKey, stars)
    setMyVote(stars)
    void cfg.submitRating(itemKey, stars).then((ok) => {
      if (ok) void cfg.fetchRating(itemKey).then(setSnapshot)
    })
  }

  const install = async () => {
    if (installAvailable && deferredPrompt) {
      await deferredPrompt.prompt()
      deferredPrompt = null
      setInstallAvailable(false)
    } else {
      setInstallHint((h) => !h)
    }
  }

  const handleExport = () => {
    try {
      cfg.backup.exportBackup()
      setLastBackup(cfg.backup.lastBackupAt())
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  const handleImport = async (file: File) => {
    if (!window.confirm(cfg.t('restoreConfirm'))) return
    try {
      await cfg.backup.importBackup(file)
      window.alert(cfg.t('restored'))
      window.location.reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  const handleClear = () => {
    if (!window.confirm(cfg.t('clearConfirm1'))) return
    if (!window.confirm(cfg.t('clearConfirm2'))) return
    cfg.backup.clearAllData()
    window.location.reload()
  }

  const chip =
    'inline-flex items-center gap-1.5 rounded-lg bg-slate-500/15 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-500/25 dark:text-slate-300'

  const { BugReport, FeatureSuggest, Settings } = cfg.modals

  return (
    <div className="text-center">
      <div className="flex flex-col items-center gap-1">
        <div
          className="flex items-center gap-0.5"
          role="radiogroup"
          aria-label={cfg.t('rate')}
        >
          {Array.from({ length: STAR_COUNT }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n <= myVote}
              aria-label={`${n}`}
              disabled={myVote > 0}
              onClick={() => vote(n)}
              className="flex h-11 w-9 items-center justify-center transition enabled:hover:scale-110 disabled:cursor-default"
            >
              <Star
                size={22}
                className={
                  n <= myVote
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300 transition enabled:hover:text-amber-300 dark:text-slate-600'
                }
              />
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          {myVote > 0 ? cfg.t('thanks') : cfg.t('rate')}
          {snapshot &&
            ` · ${cfg.t('average', { avg: snapshot.average.toFixed(1) })} · ${cfg.t('ratings', { count: snapshot.count })}`}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <a
          href={cfg.coffeeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/15 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-400/25 dark:text-amber-400"
        >
          <Coffee size={14} />
          {cfg.t('coffee')}
        </a>
        <button
          type="button"
          onClick={() => void install()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-medium text-sky-600 transition hover:bg-sky-500/25 dark:text-sky-400"
        >
          <Download size={14} />
          {cfg.t('install')}
        </button>
        <button type="button" onClick={handleExport} title={cfg.t('backupHint')} className={chip}>
          <Download size={14} />
          {cfg.t('exportBackup')}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={chip}>
          <Upload size={14} />
          {cfg.t('restoreBackup')}
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
        >
          <Trash2 size={14} />
          {cfg.t('clearData')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleImport(file)
          }}
        />
      </div>
      {installHint && (
        <p className="mx-auto mt-2 max-w-56 text-[11px] text-slate-500">{cfg.t('installHint')}</p>
      )}

      <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
        {cfg.t('lastBackup')}: {lastBackup ? new Date(lastBackup).toLocaleDateString() : cfg.t('never')}
        {estimate &&
          ` · ${cfg.t('storage')}: ${formatBytes(estimate.usage)} / ${formatBytes(estimate.quota)}`}
      </p>

      <p className="mt-3 text-xs text-slate-500">{cfg.t('tagline')}</p>

      {(BugReport || FeatureSuggest || Settings) && (
        <div className="mt-3 flex items-center justify-center gap-4">
          {BugReport && <BugReport />}
          {FeatureSuggest && <FeatureSuggest />}
          {Settings && <Settings />}
        </div>
      )}
    </div>
  )
}
