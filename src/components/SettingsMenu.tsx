import { useState } from 'react'
import { Settings, X } from 'lucide-react'
import { useTranslation } from '../i18n'
import LangSelect from './LangSelect'
import ThemeToggle from './ThemeToggle'

export default function SettingsMenu() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 underline-offset-2 transition hover:text-slate-600 hover:underline dark:text-slate-500 dark:hover:text-slate-300"
      >
        <Settings size={12} />
        {t('footer.settings')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-left dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold">{t('footer.settings')}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('footer.close')}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t('footer.preferences')}
            </p>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {t('common.language')}
                </span>
                <LangSelect />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {t('footer.theme')}
                </span>
                <ThemeToggle />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg text-xs text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              {t('footer.close')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
