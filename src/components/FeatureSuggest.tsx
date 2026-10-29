import { useState } from 'react'
import { Check, Copy, ExternalLink, Lightbulb, X } from 'lucide-react'
import { useTranslation } from '../i18n'

const ISSUES_URL: string | null =
  'https://github.com/Terrygilligan/games-hub/issues/new?template=feature_request.yml'

export default function FeatureSuggest() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [idea, setIdea] = useState('')
  const [copied, setCopied] = useState(false)

  const copyIdea = async () => {
    const text = [
      `Feature idea: ${idea || '(empty)'}`,
      '---',
      'app: games-hub',
      `timestamp: ${new Date().toISOString()}`,
      `url: ${window.location.href}`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
      >
        <Lightbulb size={12} />
        {t('footer.suggestFeature')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-left dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold">{t('footer.suggestTitle')}</p>
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
              {t('footer.suggestCopy1')}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {t('footer.suggestCopy2')}
            </p>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={3}
              placeholder={t('footer.ideaPlaceholder')}
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950/60"
            />
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => void copyIdea()}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sky-500 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? t('footer.copied') : t('footer.copyIdea')}
              </button>
              <p className="text-[11px] leading-relaxed text-slate-500">
                {t('footer.copyIdeaHint')}
              </p>
              {ISSUES_URL && (
                <a
                  href={ISSUES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ExternalLink size={14} />
                  {t('footer.openIssues')}
                </a>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg text-xs text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                {t('footer.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
