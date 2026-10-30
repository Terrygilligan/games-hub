import { useState } from 'react'
import { Bug, Check, ExternalLink, X } from 'lucide-react'
import { useTranslation } from '../i18n'
import { submitReport } from '../lib/feedback'

const ISSUES_URL =
  'https://github.com/Terrygilligan/games-hub/issues/new?template=bug_report.yml'
const COOLDOWN_KEY = 'games-hub.lastReportAt'
const COOLDOWN_MS = 120_000

export default function BugReport() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [honey, setHoney] = useState('')
  const [cooldown, setCooldown] = useState(false)

  const submit = async () => {
    if (!text.trim() || sending) return
    // Honeypot — bots fill the hidden field; fake success and drop it.
    if (honey) {
      setSent(true)
      return
    }
    if (Date.now() - Number(localStorage.getItem(COOLDOWN_KEY) ?? 0) < COOLDOWN_MS) {
      setCooldown(true)
      return
    }
    setSending(true)
    const ok = await submitReport('bug', text)
    setSending(false)
    if (ok) {
      setSent(true)
      setText('')
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
      >
        <Bug size={12} />
        {t('footer.reportBug')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-left dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold">{t('footer.bugTitle')}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('footer.close')}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {t('footer.bugCopy1')}
            </p>
            {sent ? (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <Check size={15} />
                {t('footer.reportSent')}
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder={t('footer.describeBug')}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={honey}
                  onChange={(e) => setHoney(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
                />
                <p className="text-[11px] leading-relaxed text-slate-500">
                  {t('footer.anonNote')}
                </p>
                {cooldown && (
                  <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                    {t('footer.reportCooldown')}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={!text.trim() || sending}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-500 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-40"
                >
                  {sending ? t('footer.sending') : t('footer.sendReport')}
                </button>
              </div>
            )}
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <ExternalLink size={14} />
              {t('footer.openIssues')}
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg text-xs text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              {t('footer.close')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
